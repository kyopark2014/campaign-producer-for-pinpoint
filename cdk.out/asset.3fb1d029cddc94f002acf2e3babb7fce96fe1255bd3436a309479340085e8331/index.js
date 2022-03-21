const aws = require('aws-sdk');

const appId = process.env.appId;

exports.handler = async (event) => {
    // console.log('## ENVIRONMENT VARIABLES: ' + JSON.stringify(process.env))
    // console.log('## EVENT: ' + JSON.stringify(event))
    
    const body = Buffer.from(event["body-json"], "base64");

    console.log('body: '+body);
    const eventInfo = JSON.parse(body);

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

    var msgID, response;
    var isCompleted = false;
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

            isCompleted = true;
        }
    });

    function wait(){
        if(!isCompleted) {
            return new Promise((resolve, reject) => {
                setTimeout(() => resolve("wait..."), 1000)
            });
        }
    }
    
    console.log(await wait());
    console.log(await wait());
    
    return response;
};