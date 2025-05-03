export default async function memberHandler(kakaoId, utterance, res) {
    // 1. 메인 메뉴
    if (utterance === "메뉴") {
      return res.json({
        version: "2.0",
        template: {
          outputs: [{
            simpleText: { text: "🙋‍♀️ 회원 메인 메뉴입니다.\n원하는 기능을 선택해 주세요." }
          }],
          quickReplies: [
            { label: "오늘 과제", action: "message", messageText: "오늘 과제" },
            { label: "예약하기", action: "message", messageText: "예약하기" },
            { label: "회원 등록", action: "message", messageText: "회원 김철수 01012345678 1234" }
          ]
        }
      });
    }
  
    // 2. 과제 관련 발화
    if (utterance.includes("과제")) {
      const assignmentHandler = (await import("./assignment/index.mjs")).default;
      return assignmentHandler(kakaoId, utterance, res);
    }
  
    // 3. 예약 관련 발화
    if (utterance.includes("예약")) {
      const bookingHandler = (await import("./booking/index.mjs")).default;
      return bookingHandler(kakaoId, utterance, res);
    }
  
    // 4. 회원 관련 발화
    if (utterance.includes("회원")) {
      const authHandler = (await import("./auth/index.mjs")).default;
      return authHandler(kakaoId, utterance, res);
    }
  
    // 5. fallback
    return res.json({
      version: "2.0",
      template: {
        outputs: [{
          simpleText: { text: "❓ 요청을 이해하지 못했어요. 다시 '메뉴'를 눌러보세요." }
        }]
      }
    });
  }
  