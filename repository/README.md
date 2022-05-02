# lambda-producer

Restful API로 받은 파라미터를 event에서 분리해냅니다. 

```java
    const body = Buffer.from(event["body-json"], "base64");

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
```    

PinPoint 선언 및 파라미터는 아래 코드를 참고합니다. 

```java
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
```

PinPoint로 Campaign 발송을 의뢰합니다. Lambda의 event loop이 완료되면 발송이되기 전에 Lambda가 종료될 수 있으므로, wait을 주어서 결과가 도착할때까지 대기하도록 코드를 구현하였습니다.

```java
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
```    
