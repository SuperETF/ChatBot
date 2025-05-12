// services/intakeService.js
import { supabase } from '../lib/supabaseClient.js';
import { getUserByKakaoId } from './userService.js';

/** 병력청취 세션 시작 */
export const createSession = async (kakaoId) => {
  // 초기 세션 시작 단계는 symptom_area
  const { error } = await supabase
    .from('intake_sessions')
    .upsert([{ kakao_id: kakaoId, current_step: 'symptom_area' }], {
      onConflict: 'kakao_id'
    });

  return { error };
};

/** 병력청취 세션 조회 */
export const getSession = async (kakaoId) => {
  const { data, error } = await supabase
    .from('intake_sessions')
    .select('*')
    .eq('kakao_id', kakaoId)
    .single();

  return { data, error };
};

/** 다음 단계로 이동 */
export const updateSessionStep = async (kakaoId, nextStep) => {
  const { error } = await supabase
    .from('intake_sessions')
    .update({ current_step: nextStep })
    .eq('kakao_id', kakaoId);

  return { error };
};

/** 세션 종료 */
export const deleteSession = async (kakaoId) => {
  const { error } = await supabase
    .from('intake_sessions')
    .delete()
    .eq('kakao_id', kakaoId);

  return { error };
};

/** 사용자 응답 저장 */
export const saveAnswer = async (kakaoId, step, answer) => {
  const { data: user, error: userError } = await getUserByKakaoId(kakaoId);
  if (userError || !user) return { error: '사용자 없음' };

  // 사용자의 intake_forms 존재 여부 확인
  const { data: existing } = await supabase
    .from('intake_forms')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (existing) {
    // 업데이트
    const { error } = await supabase
      .from('intake_forms')
      .update({ [step]: answer })
      .eq('user_id', user.id);
    return { error };
  } else {
    // 신규 생성
    const { error } = await supabase
      .from('intake_forms')
      .insert([{ user_id: user.id, [step]: answer }]);
    return { error };
  }
};
