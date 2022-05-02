const aws = require('aws-sdk');

const attrArn = process.env.attrArn;
    
const appId = attrArn.slice(-32);

exports.handler = async (event) => {
    // console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env))
    // console.log('## EVENT: ' + JSON.stringify(event))
    
    const body = Buffer.from(event["body-json"], "base64");

    console.log('attrArn = '+attrArn); 
    console.log('appId = '+appId); // product Id

    console.log('body: '+body);
    const eventInfo = JSON.parse(body);
    console.log(eventInfo[0].senderAddress);
    console.log(eventInfo[0].receiverAddress); 
    console.log(eventInfo[0].subject);
    console.log(eventInfo[0].body_text);
    console.log(eventInfo[0].body_html);

    var senderAddress = eventInfo[0].senderAddress;
    var toAddress = eventInfo[0].receiverAddress;
    var subject = eventInfo[0].subject;
    var body_text = eventInfo[0].body_text;
    var body_html = eventInfo[0].body_html;

    var charset = "UTF-8";
    var pinpoint = new aws.Pinpoint();

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

    var msgID, statusCode;
    var isCompleted = false;

    try {
        const result = await pinpoint.sendMessages(pinPointParams).promise();
    
        statusCode = result['MessageResponse']['Result'][toAddress]['StatusCode'];
        msgID = result['MessageResponse']['Result'][toAddress]['MessageId'];

        if(statusCode == 200) {
            console.log("Success! Message ID: "+msgID);
        }
        else {
            console.log("Failure! "+statusCode+', StatusMessage:'+result['MessageResponse']['Result'][toAddress]['StatusMessage']);
        }
    } catch(error) {
        console.log(error);        
    }
    isCompleted = true;

    function wait(){
        return new Promise((resolve, reject) => {
            if(!isCompleted) {
                setTimeout(() => resolve("wait..."), 1000)
            }
            else {
                setTimeout(() => resolve("wait..."), 0)
            }
        });
    }
    console.log(await wait());
    console.log(await wait());
    console.log(await wait());
    console.log(await wait());

    const response = {
        StatusCode: statusCode,
        Body: msgID
    };
    return response;
};
