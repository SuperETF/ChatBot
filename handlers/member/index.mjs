export default async function memberHandler(kakaoId, utterance, res) {
    if (["메뉴", "메인 메뉴", "홈"].includes(utterance)) {
      return res.json({
        version: "2.0",
        template: {
          outputs: [{ simpleText: { text: "🙋‍♀️ 회원 메뉴입니다. 원하시는 기능을 선택해 주세요." } }],
          quickReplies: [
            { label: "오늘 과제", action: "message", messageText: "오늘 과제" },
            { label: "예약하기", action: "message", messageText: "개인 운동 예약" },
            { label: "예약 확인", action: "message", messageText: "예약 확인" },
            { label: "회원 등록", action: "message", messageText: "회원 등록" }
          ]
        }
      });
    }
  
    if (utterance.includes("과제")) {
      const handler = (await import("./assignment/index.mjs")).default;
      return handler(kakaoId, utterance, res);
    }
  
    if (utterance.includes("예약")) {
      const handler = (await import("./booking/index.mjs")).default;
      return handler(kakaoId, utterance, res);
    }
  
    if (utterance.includes("회원")) {
      const handler = (await import("./auth/index.mjs")).default;
      return handler(kakaoId, utterance, res);
    }
  
    return res.json({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: "❓ 요청을 이해하지 못했어요. '메뉴'라고 입력해 주세요." } }]
      }
    });
  }
  