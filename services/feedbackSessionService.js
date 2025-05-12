// services/feedbackSessionService.js
import { supabase } from '../lib/supabaseClient.js';

/**
 * 세션 생성 (NRS 수치 입력 후)
 */
export const createFeedbackSession = async (kakaoId, nrsScore) => {
  const { data, error } = await supabase
    .from('feedback_sessions')
    .insert([{ kakao_id: kakaoId, nrs_score: nrsScore }])
    .select();

  return { data, error };
};

/**
 * 세션 조회 (텍스트 입력 대기 중인 사용자 찾기)
 */
export const getActiveFeedbackSession = async (kakaoId) => {
  const { data, error } = await supabase
    .from('feedback_sessions')
    .select('*')
    .eq('kakao_id', kakaoId)
    .eq('stage', 'waiting_txt')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return { data, error };
};

/**
 * 세션 완료 처리 (stage 변경 or 삭제)
 */
export const completeFeedbackSession = async (sessionId) => {
  const { data, error } = await supabase
    .from('feedback_sessions')
    .update({ stage: 'completed' })
    .eq('id', sessionId);

  return { data, error };
};
