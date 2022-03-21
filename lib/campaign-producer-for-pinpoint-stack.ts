import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';

const lambda = require('aws-cdk-lib/aws-lambda');
const apiGateway = require('aws-cdk-lib/aws-apigateway');
const s3 = require('aws-cdk-lib/aws-s3');
const iam = require('aws-cdk-lib/aws-iam');
const cloudFront = require('aws-cdk-lib/aws-cloudfront');
const origins = require('aws-cdk-lib/aws-cloudfront-origins');
const logs = require('aws-cdk-lib/aws-logs');
const pinpoint = require('aws-cdk-lib/aws-pinpoint');

const stage = "dev";

export class CampaignProducerUsingPinpointStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // S3
    const s3Bucket = new s3.Bucket(this, "s3-campaign",{
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
      versioned: false,
    });

    new cdk.CfnOutput(this, 'bucketName', {
      value: s3Bucket.bucketName,
      description: 'The nmae of bucket',
    });

    // CloudFront
    const distribution = new cloudFront.Distribution(this, 'Campaign', {
      defaultBehavior: {
        origin: new origins.S3Origin(s3Bucket),
        allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
        priceClass: cloudFront.PriceClass.PriceClass200,  
        viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        discription: 'cdk cloudFront'
      },
    });

    new cdk.CfnOutput(this, 'distributionDomainName', {
      value: distribution.domainName,
      description: 'The domain name of the Distribution',
    }); 

    // Lambda - Producer
    const lambdaProducer = new lambda.Function(this, "LambdaUpload", {
      runtime: lambda.Runtime.NODEJS_14_X, 
      code: lambda.Code.fromAsset("repository/lambda-producer"), 
      handler: "index.handler", 
      timeout: cdk.Duration.seconds(30),
      environment: {
        bucket: s3Bucket.bucketName,
        CDN: 'https://'+distribution.domainName+'/',
        appId: '2da32e1e303b413da8d58d923f4b24c2'  // Project ID
      }
    });  
    s3Bucket.grantReadWrite(lambdaProducer);

    // create a pinpoint statement
    const pinpointPolicy = new iam.PolicyStatement({
      actions: ['mobileanalytics:*'],
      resources: ['*'],
    });
    // add the policy to the Function's role
    lambdaProducer.role?.attachInlinePolicy(
      new iam.Policy(this, 'pinpoint-policy', {
        statements: [pinpointPolicy],
      }),
    );

    const pinpointProject = new pinpoint.CfnApp(this, "PinPointCampaign", {
      name: "pinpoint-project"
    });

    new cdk.CfnOutput(this, 'pinpoint-projectID', {
      value: pinpointProject.attrArn,
      description: 'The Project ID of the pinpoint',
    }); 

    new cdk.CfnOutput(this, 'pinpoint-logical ID', {
      value: pinpointProject.logicalId,
      description: 'The logical ID of the pinpoint',
    }); 

    new cdk.CfnOutput(this, 'pinpoint-cfnOptions', {
      value: JSON.stringify(pinpointProject.cfnOptions),
      description: 'The cfnOptions of the pinpoint',
    }); 

    new cdk.CfnOutput(this, 'pinpoint-cfnProperties', {
      value: JSON.stringify(pinpointProject.cfnProperties),
      description: 'The cfnProperties of the pinpoint',
    }); 

    // api Gateway
    const logGroup = new logs.LogGroup(this, 'AccessLogs', {
      retention: 90, // Keep logs for 90 days
    });
    logGroup.grantWrite(new iam.ServicePrincipal('apigateway.amazonaws.com')); 

    const api = new apiGateway.RestApi(this, 'api-pinpoint', {
      description: 'API Gateway',
      endpointTypes: [apiGateway.EndpointType.REGIONAL],
      binaryMediaTypes: ['*/*'],
      proxy: false,
      deployOptions: {
        stageName: stage,
        accessLogDestination: new apiGateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apiGateway.AccessLogFormat.jsonWithStandardFields({
          caller: false,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true
        }),
      },
      policy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              principals: [new iam.AnyPrincipal()],
              actions: ["execute-api:Invoke"],
              resources: [cdk.Fn.join('', ['execute-api:/', '*'])]
          }),
        ]
      })
    });   

    lambdaProducer.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'));

    const templateString: string = `##  See http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-mapping-template-reference.html
    ##  This template will pass through all parameters including path, querystring, header, stage variables, and context through to the integration endpoint via the body/payload
    #set($allParams = $input.params())
    {
    "body-json" : $input.json('$'),
    "params" : {
    #foreach($type in $allParams.keySet())
        #set($params = $allParams.get($type))
    "$type" : {
        #foreach($paramName in $params.keySet())
        "$paramName" : "$util.escapeJavaScript($params.get($paramName))"
            #if($foreach.hasNext),#end
        #end
    }
        #if($foreach.hasNext),#end
    #end
    },
    "stage-variables" : {
    #foreach($key in $stageVariables.keySet())
    "$key" : "$util.escapeJavaScript($stageVariables.get($key))"
        #if($foreach.hasNext),#end
    #end
    },
    "context" : {
        "account-id" : "$context.identity.accountId",
        "api-id" : "$context.apiId",
        "api-key" : "$context.identity.apiKey",
        "authorizer-principal-id" : "$context.authorizer.principalId",
        "caller" : "$context.identity.caller",
        "cognito-authentication-provider" : "$context.identity.cognitoAuthenticationProvider",
        "cognito-authentication-type" : "$context.identity.cognitoAuthenticationType",
        "cognito-identity-id" : "$context.identity.cognitoIdentityId",
        "cognito-identity-pool-id" : "$context.identity.cognitoIdentityPoolId",
        "http-method" : "$context.httpMethod",
        "stage" : "$context.stage",
        "source-ip" : "$context.identity.sourceIp",
        "user" : "$context.identity.user",
        "user-agent" : "$context.identity.userAgent",
        "user-arn" : "$context.identity.userArn",
        "request-id" : "$context.requestId",
        "resource-id" : "$context.resourceId",
        "resource-path" : "$context.resourcePath"
        }
    }`    
    const requestTemplates = { // path through
      "image/jpeg": templateString,
      "image/jpg": templateString,
      "application/octet-stream": templateString,
      "image/png" : templateString,
      "application/json" : templateString
    }
    
    const putCampaign = api.root.addResource('putCampaign');
    putCampaign.addMethod('POST', new apiGateway.LambdaIntegration(lambdaProducer, {
      PassthroughBehavior: apiGateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
      requestTemplates: requestTemplates,
      integrationResponses: [{
        statusCode: '200',
      }], 
      proxy:false, 
    }), {
      methodResponses: [   // API Gateway sends to the client that called a method.
        {
          statusCode: '200',
          responseModels: {
            'application/json': apiGateway.Model.EMPTY_MODEL,
          }, 
        }
      ]
    }); 




  }
}
