// 텍스트 응답
export function replyText(text) {
  return {
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: { text }
        }
      ]
    }
  };
}

// 카드 응답
export function replyCard(title, description) {
  return {
    version: "2.0",
    template: {
      outputs: [
        {
          basicCard: {
            title,
            description
          }
        }
      ]
    }
  };
}

// 버튼 응답
export function replyButton(text, buttons) {
  return {
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: { text }
        }
      ],
      quickReplies: buttons.map((label) => ({
        label,
        action: "message",
        messageText: label
      }))
    }
  };
}
