// services/feedbackService.js
import { supabase } from '../lib/supabaseClient.js';
import { getUserByKakaoId } from './userService.js';

/**
 * 피드백 저장
 * @param {string} kakaoId - 카카오 사용자 ID
 * @param {'중간'|'최종'} type - 피드백 유형
 * @param {string} content - 작성 내용
 * @returns {Promise<{ data: any, error: any }>}
 */
export const insertFeedback = async (kakaoId, type, content) => {
  const { data: user, error: userError } = await getUserByKakaoId(kakaoId);

  if (userError || !user) {
    return { error: '사용자를 찾을 수 없습니다.', data: null };
  }

  const { data, error } = await supabase
    .from('feedbacks')
    .insert([
      {
        user_id: user.id,
        type,
        content
      }
    ])
    .select();

  return { data, error };
};
