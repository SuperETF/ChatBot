// handlers/handleConsent.js
export default async function handleConsent(kakaoId, res) {
    return res.status(200).json({
      version: '2.0',
      template: {
        outputs: [
          {
            simpleText: {
              text: "📄 [개인정보 수집 및 이용 동의서]\n\n- 이 챗봇은 통증 및 교정 분석을 위해 사용자 정보를 수집합니다.\n- 수집 항목: 카카오 ID, 문진 응답, 피드백 내용 등\n- 보관 기간: 탈퇴 요청 시 즉시 삭제\n\n동의하신다면 아래 버튼을 눌러주세요."
            }
          }
        ],
        quickReplies: [
          {
            label: "동의합니다",
            action: "message",
            messageText: "개인정보 동의"
          },
          {
            label: "동의하지 않아요",
            action: "message",
            messageText: "동의 거절"
          }
        ]
      }
    });
  }
  