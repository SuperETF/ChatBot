export default async function adminHandler(kakaoId, utterance, res) {
    // 1. 관리자 메인 메뉴
    if (utterance === "메뉴") {
      return res.json({
        version: "2.0",
        template: {
          outputs: [{
            simpleText: { text: "🧑‍🏫 트레이너 메인 메뉴입니다.\n원하는 기능을 선택해 주세요." }
          }],
          quickReplies: [
            { label: "나의 회원 등록", messageText: "나의 회원 등록", action: "message" },
            { label: "과제 생성", messageText: "과제 생성", action: "message" },
            { label: "과제 현황", messageText: "과제 현황", action: "message" }
          ]
        }
      });
    }
  
    // 2. 과제 기능
    if (utterance.includes("과제")) {
      const assignmentHandler = (await import("./assignment/index.mjs")).default;
      return assignmentHandler(kakaoId, utterance, res);
    }
  
    // 3. 회원/인증 관련 기능
    if (utterance.includes("회원") || utterance.includes("전문가")) {
      const authHandler = (await import("./auth/index.mjs")).default;
      return authHandler(kakaoId, utterance, res);
    }
  
    // 4. fallback
    return res.json({
      version: "2.0",
      template: {
        outputs: [{
          simpleText: { text: "❓ 관리자 요청을 이해하지 못했어요. '메뉴'를 입력해 주세요." }
        }]
      }
    });
  }
  