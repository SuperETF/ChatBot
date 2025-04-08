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

// 이미지 응답
export function replyImage(imageUrl, altText = "이미지") {
  return {
    version: "2.0",
    template: {
      outputs: [
        {
          simpleImage: {
            imageUrl,
            altText
          }
        }
      ]
    }
  };
}
// ✅ 텍스트 응답
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

// ✅ 카드 응답
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

// ✅ 이미지 응답
export function replyImage(imageUrl, altText = "이미지") {
  return {
    version: "2.0",
    template: {
      outputs: [
        {
          simpleImage: {
            imageUrl,
            altText
          }
        }
      ]
    }
  };
}

// ✅ 버튼 포함 응답
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

// ✅ 리스트 응답 (목록형 UI)
export function replyList(items = []) {
  return {
    version: "2.0",
    template: {
      outputs: [
        {
          listCard: {
            header: {
              title: "루틴 목록"
            },
            items: items.slice(0, 4), // 최대 4개만
            buttons: [
              {
                label: "전체 보기",
                action: "message",
                messageText: "전체 루틴 보여줘"
              }
            ]
          }
        }
      ]
    }
  };
}
