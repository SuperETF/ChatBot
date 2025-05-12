// handlers/handleNRSFeedback.js
import { createFeedbackSession } from '../services/feedbackSessionService.js';

/**
 * NRS 점수 입력 처리 핸들러
 * - 통증 점수를 feedback_sessions 테이블에 저장
 * - 텍스트 피드백 입력을 유도
 */
export default async function handleNRSFeedback(kakaoId, nrs, res) {
  const { error } = await createFeedbackSession(kakaoId, nrs);

  const message = error
    ? '⚠️ 점수 저장 중 오류가 발생했습니다. 다시 시도해 주세요.'
    : `📌 오늘의 통증 점수 ${nrs}점으로 기록했어요.\n이제 운동 중 느낀 점이나 변화가 있으면 자유롭게 적어주세요 :)`;

  return res.status(200).json({
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text: message } }]
    }
  });
}
