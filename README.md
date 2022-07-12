# Campaign Producer using PinPoint

AWS PinPoint를 이용하여 이메일이나 SMS 알림을 보낼수 있습니다. 여기에서는 AWS PinPoint를 이용하여 이메일 알림을 보내는것을 구현하고자 합니다. 전체 Architecture는 아래와 같습니다. 

<img width="586" alt="image" src="https://user-images.githubusercontent.com/52392004/159288376-d42cc6c2-5dc4-4662-b205-f08b5ace8782.png">

## 사용 시나리오

1. 상담원이 전송하려는 텍스트를 입력합니다. 

2. API Gateway를 통해 전달된 메시지 이벤트는 Lambda를 Invoke 합니다. 

3. Lambda는 메시지를 Parsing하여 PinPoint에 전달합니다. 

4. PinPoint는 텍스트 메시지를 이메일로 전달합니다. 


### CDK 개발 환경 

인프라 설치 및 삭제를 위하여 CDK 개발 환경을 구성하였습니다. 인프라 설치시 아래의 명령어를 사용합니다. 

[실행] 

```c
$ cdk deploy
```

테스트후 인프라 삭제시는 아래 명령어를 사용합니다. 

[삭제]
```c
$ cdk destroy
```

API Gateway에서 500에러 발생시 [Troubleshoot](https://github.com/kyopark2014/serverless-storytime/blob/main/docs/cdk.md)를 참조하여 API Gateway에서 Lambda Permission을 재설정합니다.

### API 정보

관련 코드는 [Lambda-Producer](https://github.com/kyopark2014/campaign-producer-for-pinpoint/blob/main/repository/lambda-producer/index.js)를 참고하시기 바랍니다.

Lamda에 PinPoint Permission을 포함합니다. 

```java
	{
            "Effect": "Allow",
            "Action": [
                "mobiletargeting:*"
            ],
            "Resource": "*"
        }
```


PinPoint를 정의합니다.

```java
const aws = require('aws-sdk');

var pinpoint = new aws.Pinpoint();
```

PinPoint에 전달할 parameter에 restful api로 얻어온 값들을 입력합니다. 

```java
var pinPointParams = {
        ApplicationId: appId,
        MessageRequest: {
            Addresses: {
                [toAddress]:{
                    ChannelType: 'EMAIL'
                }
            },
            MessageConfiguration: {
                EmailMessage: {
                    FromAddress: senderAddress,
                    SimpleEmail: {
                        Subject: {
                            Charset: charset,
                            Data: subject
                        },
                        HtmlPart: {
                            Charset: charset,
                            Data: body_html
                        },
                        TextPart: {
                            Charset: charset,
                            Data: body_text
                        }
                    }
                }
            }
        }
    };
```

PinPoint로 메시지를 전송합니다. 

```java
    var msgID, response;
    pinpoint.sendMessages(pinPointParams, function(err, data) {
        if(err) {
          console.log(err);
        } else {
            var statusCode = data['MessageResponse']['Result'][toAddress]['StatusCode'];
            msgID = data['MessageResponse']['Result'][toAddress]['MessageId'];

            if(statusCode == 200) {
                console.log("Success! Message ID: "+msgID);
            }
            else {
                console.log("Failure! Message ID: "+msgID);
            }

            // for return info
            const resInfo = {
                msgID: msgID,
                StatusMessage: data['MessageResponse']['Result'][toAddress]['StatusMessage'],
            }; 
            response = {
                StatusCode: 200,
                body: JSON.stringify(resInfo)
            };

            return response;
        }
    });
```

### Prerequisite

사전에 테스트할 이메일 주소를 PinPoint에서 등록하여 아래와 같이 confirm 하여야 합니다.

<img width="952" alt="image" src="https://user-images.githubusercontent.com/52392004/159303803-ef2c064e-f86d-4fb9-a57a-ebab3365f7fa.png">



### 테스트 방법

Postman으로 API Gateway 주소에 api를 선택합니다. 입력되는 메시지 포멧은 아래를 참조 바랍니다. 

![image](https://user-images.githubusercontent.com/52392004/159300961-08a8ca6b-d515-491c-9b71-95baa8a094fd.png)

### 테스트 결과 

정상적으로 발신시 아래와 같이 메시지가 이메일로 전송 됩니다. 

![image](https://user-images.githubusercontent.com/52392004/159301382-4d8c0896-90c3-4321-b66b-a40cfb5f5fb2.png)


### Troubleshooting

CDK에서 Email Channel을 아래와 같이 생성 가능합니다. 그런데 여기서 applicationId를 pinpointProject.attrArn의 뒤쪽 32자를 잘라서 사용하여야 하는데, 이 값은 [Token](https://docs.aws.amazon.com/cdk/v2/guide/tokens.html)이라서 pinpoint에서 생성되기 전에는 알 수가 없습니다. 따라서, CDK에서 Email Channel을 아래처처럼 생성하려면 닭이냐 달걀이 먼저냐 하는 식의 문제가 되어 버립니다. 따라서 아래와 같이 CfnEmailChannel로 Email channel을 생성할 수 없습니다.

```java
    const pinpointProject = new pinpoint.CfnApp(this, "PinPointCampaign", {
      name: "pinpoint-project"
    });

    const attrArn = pinpointProject.attrArn;
    new cdk.CfnOutput(this, 'pinpoint-attrArn', {
      value: pinpointProject.attrArn,
      description: 'The attrArn of the pinpoint',
    });    
    
    const cfnEmailChannel = new pinpoint.CfnEmailChannel(this, 'MyCfnEmailChannel', {
      applicationId: '7a283e241e2a4ea8a8eaf353169fb87c',
      fromAddress: 'storytimebot21@gmail.com',
      identity: 'arn:aws:ses:ap-northeast-1:xxxx:identity/storytimebot21@gmail.com',    
      enabled: true,
    });
```    

따라서, CDK로 pinpoint 생성후에 아래처럼 console에서 수동으로 생성합니다. 

1) Pinpoint Console에서 CDK가 생성한 프로젝트로 진입합니다. 여기서는 CDK에서 project명을 "pinpoint-poject"로 입력하였으므로 아래와 같이 "pinpoint-project"가 생성되어 있습니다.

<img width="1380" alt="image" src="https://user-images.githubusercontent.com/52392004/159626575-6ced00ca-059a-4b28-883b-c98b4d5f512f.png">

2) 아래와 같이 [Settings] - [Email]을 선택합니다. 

![noname](https://user-images.githubusercontent.com/52392004/159626848-a38ab9e4-819e-4324-9743-afc5b604e4b7.png)

3) 아래와 같이 [Edit]를 선택합니다. 

![noname](https://user-images.githubusercontent.com/52392004/159626969-d03f9ae9-8f6e-408b-9857-f22840c0d950.png)

4) Identity type을 [Email address]로 선택을 하고 [Default sender address]를 기존에 인증을 완료한 메일 주소를 선택합니다.  이후 아래로 스크롤하여 [Save]를 선택합니다. 

![noname](https://user-images.githubusercontent.com/52392004/159627132-95eeb053-11e7-4a28-a1a4-ca1ac26fbb06.png)



