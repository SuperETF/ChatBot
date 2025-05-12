// handlers/handleTextFeedback.js
import { getActiveFeedbackSession, completeFeedbackSession } from '../services/feedbackSessionService.js';
import { insertFeedback } from '../services/feedbackService.js';

/**
 * 텍스트 피드백 저장 핸들러
 * - 세션 확인 → 피드백 저장 → 세션 완료 처리
 */
export default async function handleTextFeedback(kakaoId, text, res) {
  // 세션 조회
  const { data: session, error: sessionError } = await getActiveFeedbackSession(kakaoId);

  if (!session || sessionError) {
    return res.status(200).json({
      version: '2.0',
      template: {
        outputs: [
          {
            simpleText: {
              text: '❌ 먼저 통증 점수를 입력해주세요! (0~10 버튼으로 선택)'
            }
          }
        ]
      }
    });
  }

  // 피드백 저장 (type: 중간 or 최종은 일단 '중간'으로 고정)
  await insertFeedback(kakaoId, '중간', text);

  // 세션 종료 처리
  await completeFeedbackSession(session.id);

  return res.status(200).json({
    version: '2.0',
    template: {
      outputs: [
        {
          simpleText: {
            text: '✅ 피드백이 정상적으로 기록되었습니다. 감사합니다!'
          }
        }
      ]
    }
  });
}
