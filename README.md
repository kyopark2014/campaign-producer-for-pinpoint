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

