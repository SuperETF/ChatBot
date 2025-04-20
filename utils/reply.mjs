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

export function replyQuickReplies(text, quickReplies = []) {
  // quickReplies: 단순 문자열 배열 → label, action, messageText 동일
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

export function replyBasicCard({ title, description, buttons = [] }) {
  // BasicCard 한 장만 쓰는 예시
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
