// ✅ utils/reply.mjs
/**
 * 단순 텍스트 응답
 */
export function replyText(text) {
  return {
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: {
            text
          }
        }
      ]
    }
  };
}

/**
 * QuickReplies 응답
 * - simpleText + 여러 버튼
 * - 버튼(label/action/messageText 동일)
 */
export function replyQuickReplies(text, quickReplies = []) {
  return {
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: {
            text
          }
        }
      ],
      quickReplies: quickReplies.map(label => ({
        label,
        action: "message",
        messageText: label
      }))
    }
  };
}

/**
 * BasicCard 응답
 * - { title, description, buttons[] }
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
 * 버튼(QuickReplies) 별칭 함수
 * - fallback 등에서 "replyButton" 이름을 쓰고 싶을 때
 */
export function replyButton(text, buttons = []) {
  return replyQuickReplies(text, buttons);
}
