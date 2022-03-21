# Campaign Producer using PinPoint

AWS PinPoint를 이용하여 이메일이나 SMS 알림을 보낼수 있습니다. 현재 국내에서는 SMS 알림을 제공하지 않으므로 PinPoint를 이용하여 이메일 알림을 보내는것을 Amazon PinPoint를 이용해 구현하고자 합니다. 

전체 Architecture는 아래와 같습니다. 

<img width="586" alt="image" src="https://user-images.githubusercontent.com/52392004/159288376-d42cc6c2-5dc4-4662-b205-f08b5ace8782.png">

## 사용 시나리오

1. 상담원이 전송하려는 텍스트를 입력합니다. 

2. API Gateway를 통해 전달된 메시지는 Lambda를 통해 처리 됩니다. 여기서, Cognito를 이용한 사용자 인증이 가능한데, API를 설명하기 위한 예제이므로 여기서는 제외합니다. 

3. Lambda는 메시지를 PinPoint에 전달합니다. 

4. PinPoint는 텍스트 메시지를 이메일로 전달합니다. 


## API 정보

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

pin point에 전달할 parameter에 restful api로 얻어온 값들을 입력합니다. 

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

pin point로 메시지를 전송합니다. 

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


### 테스트 방법

Postman으로 API Gateway 주소에 api를 선택합니다. 입력되는 메시지 포멧은 아래를 참조 바랍니다. 

![image](https://user-images.githubusercontent.com/52392004/159300961-08a8ca6b-d515-491c-9b71-95baa8a094fd.png)

### 테스트 결과

정상적으로 발신시 아래와 같이 메시지가 이메일로 전송 됩니다. 

![image](https://user-images.githubusercontent.com/52392004/159301382-4d8c0896-90c3-4321-b66b-a40cfb5f5fb2.png)
