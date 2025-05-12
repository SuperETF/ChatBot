// handlers/handleRegister.js
import { upsertUser } from '../services/userService.js';

/**
 * 사용자 등록 처리 핸들러
 * - 카카오 ID를 Supabase users 테이블에 저장 or 업데이트
 */
export default async function handleRegister(kakaoId, res) {
  const { error } = await upsertUser(kakaoId);

  const message = error
    ? '❌ 등록 중 문제가 발생했습니다. 다시 시도해주세요.'
    : '✅ 신청이 완료되었습니다!\n3일 뒤 중간 피드백 알림을 드릴게요.';

  return res.status(200).json({
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text: message } }]
    }
  });
}
