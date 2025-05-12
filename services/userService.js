// services/userService.js
import { supabase } from '../lib/supabaseClient.js';

/**
 * 사용자 등록 or 업데이트
 * @param {string} kakaoId - 카카오 유저 고유 ID
 * @returns {Promise<{ data: any, error: any }>}
 */
export const upsertUser = async (kakaoId) => {
  const { data, error } = await supabase
    .from('users')
    .upsert(
      [{ kakao_id: kakaoId, start_date: new Date().toISOString().split('T')[0] }],
      { onConflict: 'kakao_id' }
    )
    .select();

  return { data, error };
};

/**
 * 사용자 조회 (필요 시 사용)
 */
export const getUserByKakaoId = async (kakaoId) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('kakao_id', kakaoId)
    .single();

  return { data, error };
};
