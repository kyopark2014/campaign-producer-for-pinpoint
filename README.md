# Campaign Producer using PinPoint

AWS PinPoint를 이용하여 이메일이나 SMS 알림을 보낼수 있습니다.
여기서는 고객에게 알림 전송시 파일도 전송할 수 있도록 S3에 올린 파일을 CloudFront를 통해 사용자가 다운로드 가능하게 전송하고자 합니다. 

전체 Architecture는 아래와 같습니다. 

<img width="496" alt="image" src="https://user-images.githubusercontent.com/52392004/159211845-9e58a72f-f5fd-4564-a61a-835c1acebb68.png">

## 사용 시나리오

1. 상담원이 전송하려는 텍스트를 입력하고 전송해야 할 파일을 선택하여 첨부합니다. 

2. API Gateway를 통해 전달된 메시지는 Lambda를 통해 처리 됩니다. 여기서, Cognito를 이용한 사용자 인증이 가능한데, API를 설명하기 위한 예제이므로 여기서는 제외합니다. 

3. Lambda는 메시지에 파일이 첨부된 경우에 S3에 저장하고 다운로드 URL을 생성합니다. 

4. PinPoint로 텍스트 메시지와 URL로 변환된 파일정보를 전달합니다. 

5. PinPioint는 고객에게 메일로 메시지를 전달합니다. 

6. 메일을 수신한 사람은 URL을 선택하여 메시지를 확인합니다. 

여기서는 메일에서 파일을 포함하지 않고, 텍스트로만 전송합니다. 한국리전에서 현재 SMS 전송을 미지원하므로 SMS 전송이 아닌 Email로 사용시나리오를 작성하였습니다. 한국 사용자의 경우에 메일보다는 SMS가 1차적인 커뮤니케이션 방법이므로 Email보다는 SMS 사용시나리오에 맞추어 작성된 시나리오 입니다. 


