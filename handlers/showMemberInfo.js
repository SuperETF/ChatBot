// ✅ handlers/showMemberInfo.js – 전문가 전용 회원 정보 종합 조회

import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";

export default async function showMemberInfo(kakaoId, utterance, res) {
  const nameMatch = utterance.match(/[가-힣]{2,4}/);
  if (!nameMatch) {
    return res.json(replyText("회원 이름을 입력해주세요.\n예: 회원 정보 김복두"));
  }

  const name = nameMatch[0];

  // 전문가 인증
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!trainer) {
    return res.json(replyText("전문가 인증이 필요합니다. 먼저 '전문가 등록'을 진행해주세요."));
  }

  // 회원 조회
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("trainer_id", trainer.id)
    .eq("name", name)
    .maybeSingle();

  if (!member) {
    return res.json(replyText("해당 회원을 찾을 수 없습니다."));
  }

  const memberId = member.id;

  // 개별 정보 조회
  const [{ data: body }, { data: cardio }, { data: strength }, { data: note }] = await Promise.all([
    supabase.from("body_compositions").select("weight, fat_percent").eq("member_id", memberId).order("created_at", { ascending: false }).limit(1),
    supabase.from("cardio_profiles").select("max_hr, rest_hr").eq("member_id", memberId).order("created_at", { ascending: false }).limit(1),
    supabase.from("strength_records").select("bench, squat, deadlift").eq("member_id", memberId).order("created_at", { ascending: false }).limit(1),
    supabase.from("personal_conditions").select("note").eq("member_id", memberId).order("created_at", { ascending: false }).limit(1)
  ]);

  const lines = [];
  if (body && body.length > 0) lines.push(`• 체중: ${body[0].weight}kg / 체지방률: ${body[0].fat_percent}%`);
  if (cardio && cardio.length > 0) lines.push(`• 심박수: 최대 ${cardio[0].max_hr}, 안정시 ${cardio[0].rest_hr}`);
  if (strength && strength.length > 0) lines.push(`• 근력: 벤치 ${strength[0].bench}kg, 스쿼트 ${strength[0].squat}kg, 데드 ${strength[0].deadlift}kg`);
  if (note && note.length > 0) lines.push(`• 특이사항: ${note[0].note}`);

  if (lines.length === 0) {
    return res.json(replyText(`${name} 회원의 저장된 정보가 없습니다.`));
  }

  return res.json(replyText(`📋 ${name} 회원 정보\n${lines.join("\n")}`));
}