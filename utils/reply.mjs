/**
 * 단순 텍스트 응답
 */
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

/**
 * QuickReplies 응답
 * - simpleText + 여러 버튼
 * - 문자열 또는 객체 형태 모두 지원
 */
export function replyQuickReplies(text, quickReplies = []) {
  return {
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: { text }
        }
      ],
      quickReplies: quickReplies.map(item => {
        if (typeof item === "string") {
          return {
            label: item,
            action: "message",
            messageText: item
          };
        } else {
          return {
            label: item.label,
            action: item.action || "message",
            messageText: item.messageText || item.label
          };
        }
      })
    }
  };
}

/**
 * BasicCard 응답
 */
export function replyBasicCard({ title, description, buttons = [] }) {
  return {
    version: "2.0",
    template: {
      outputs: [
        {
          basicCard: {
            title,
            description,
            buttons: buttons.map(btn => ({
              label: btn.label,
              action: "message",
              messageText: btn.messageText || btn.label
            }))
          }
        }
      ]
    }
  };
}

/**
 * 버튼 응답 별칭
 */
export function replyButton(text, buttons = []) {
  return replyQuickReplies(text, buttons);
}
