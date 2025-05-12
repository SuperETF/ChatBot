// handlers/handleProgramChoice.js
export default async function handleProgramChoice(kakaoId, choice, res) {
    return res.status(200).json({
      version: '2.0',
      template: {
        outputs: [
          {
            simpleText: {
              text: `📌 선택하신 프로그램은 "${choice}" 입니다.\n이제 병력청취를 시작해볼까요?`
            }
          }
        ],
        quickReplies: [
          {
            label: '병력청취 시작',
            action: 'message',
            messageText: '병력청취 시작'
          }
        ]
      }
    });
  }
  