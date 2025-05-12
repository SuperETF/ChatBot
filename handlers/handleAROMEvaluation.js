// handlers/handleAROMEvaluation.js
export default async function handleAROMEvaluation(kakaoId, res) {
    return res.status(200).json({
      version: '2.0',
      template: {
        outputs: [
          {
            simpleText: {
              text: '📝 평가 기능은 현재 준비 중입니다. 곧 제공될 예정이에요!'
            }
          }
        ]
      }
    });
  }
  