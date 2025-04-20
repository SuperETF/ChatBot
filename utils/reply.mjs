/**
 * ✅ 간단 텍스트 응답
 * - 문자열만 전달
 * - 최대 1000자까지
 */
export function replyText(text) {
  const safeText =
    typeof text === "string" && text.trim()
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

/**
 * ✅ 기본 카드 응답 (제목 + 본문)
 * - 최대 글자 수를 제한
 * - 이미지 없이 텍스트만 표시
 */
export function replyCard(title, description) {
  const safeTitle =
    typeof title === "string" && title.trim()
      ? title.trim().slice(0, 40)
      : "알림";
  const safeDescription =
    typeof description === "string" && description.trim()
      ? description.trim().slice(0, 500)
      : "내용이 없습니다.";

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

/**
 * ✅ 버튼(QuickReplies) 응답
 * - simpleText로 안내 문구
 * - quickReplies 배열로 최대 5개 버튼 표시
 * - 버튼 label과 messageText 동일
 */
export function replyButton(text, buttons) {
  const safeText =
    typeof text === "string" && text.trim()
      ? text.trim().slice(0, 900)
      : "무엇을 도와드릴까요?";

  // 최대 5개까지만
  const limitedButtons = Array.isArray(buttons)
    ? buttons.slice(0, 5)
    : [];

  return {
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: {
            text: safeText
          }
        }
      ],
      quickReplies: limitedButtons.map(label => ({
        label,
        action: "message",
        messageText: label
      }))
    }
  };
}
