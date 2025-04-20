// ✅ utils/reply.mjs

/**
 * 간단 텍스트 응답
 * - 단순 문구만 전달할 때 사용
 * - 필요하면 최대 글자 수 제한을 추가 가능
 */
export function replySimpleText(text) {
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
 * QuickReplies 버튼 응답
 * - simpleText + quickReplies
 * - quickReplies는 문자열 배열을 넘기면,
 *   각각 버튼 label/action/messageText 동일하게 처리
 */
export function replyQuickReplies(text, quickReplies = []) {
  // 필요 시 최대 5개까지 제한:
  // const limited = quickReplies.slice(0, 5);
  
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
 * - 단일 카드(타이틀, 본문, 버튼들)
 * - 이미지나 썸네일 등이 필요하면 thumbnail 필드 추가 가능
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
