export default async function adminHandler(kakaoId, utterance, res) {
    if (["메뉴", "메인 메뉴", "홈"].includes(utterance)) {
      return res.json({
        version: "2.0",
        template: {
          outputs: [{ simpleText: { text: "🧑‍🏫 트레이너 메뉴입니다. 원하시는 기능을 선택해 주세요." } }],
          quickReplies: [
            { label: "나의 회원 등록", action: "message", messageText: "나의 회원 등록" },
            { label: "과제 생성", action: "message", messageText: "과제 생성" },
            { label: "과제 현황", action: "message", messageText: "과제 현황" }
          ]
        }
      });
    }
  
    if (utterance.includes("과제")) {
      const handler = (await import("./assignment/index.mjs")).default;
      return handler(kakaoId, utterance, res);
    }
  
    if (utterance.includes("회원") || utterance.includes("전문가")) {
      const handler = (await import("./auth/index.mjs")).default;
      return handler(kakaoId, utterance, res);
    }
  
    return res.json({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: "❓ 관리자 요청을 이해하지 못했어요. '메뉴'를 입력해 주세요." } }]
      }
    });
  }
  