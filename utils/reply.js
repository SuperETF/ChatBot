// ✅ 텍스트 응답
export function replyText(text) {
  const safeText = typeof text === "string" && text.trim()
    ? text.trim().slice(0, 1000)
    : "답변을 생성하지 못했습니다.";

  return {
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: {
            text: safeText
          }
        }
      ]
    }
  };
}

// ✅ 카드 응답
export function replyCard(title, description) {
  const safeTitle = title?.slice(0, 40) || "알림";
  const safeDescription = description?.slice(0, 500) || "내용이 없습니다.";

  return {
    version: "2.0",
    template: {
      outputs: [
        {
          basicCard: {
            title: safeTitle,
            description: safeDescription
          }
        }
      ]
    }
  };
}

// ✅ 버튼 응답 (quickReplies)
export function replyButton(text, buttons) {
  const safeText = typeof text === "string" && text.trim()
    ? text.trim().slice(0, 900)
    : "무엇을 도와드릴까요?";

  const limitedButtons = Array.isArray(buttons)
    ? buttons.slice(0, 5)
    : [];

  return {
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: { text: safeText }
        }
      ],
      quickReplies: limitedButtons.map((label) => ({
        label,
        action: "message",
        messageText: label
      }))
    }
  };
}
