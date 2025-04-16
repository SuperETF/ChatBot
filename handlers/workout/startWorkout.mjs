// handlers/workout/startWorkout.mjs
import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";

export default async function startWorkout(kakaoId, utterance, res) {
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) return res.json(replyText("회원 인증 정보가 없습니다."));

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("personal_assignments")
    .update({ status: "진행", start_time: now })
    .eq("member_id", member.id)
    .eq("assigned_date", today)
    .eq("status", "대기");

  if (error) return res.json(replyText("운동 시작 처리 중 오류가 발생했습니다."));
  return res.json(replyText("🏋️ 운동을 시작합니다! 화이팅입니다!"));
}