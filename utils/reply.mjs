// ✅ utils/reply.mjs

export function replySimpleText(text) {
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
 * QuickReplies (단일 simpleText + 여러 버튼)
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
      quickReplies: quickReplies.map(label => ({
        label,
        action: "message",
        messageText: label
      }))
    }
  };
}

/**
 * BasicCard (타이틀/내용/버튼)
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
 * replyButton
 *  - fallback에서 사용하기 위한 alias 함수
 *  - 내부적으로 replyQuickReplies를 호출
 */
export function replyButton(text, buttons = []) {
  return replyQuickReplies(text, buttons);
}
