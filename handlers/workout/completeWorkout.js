// handlers/workout/completeWorkout.js
import { supabase } from "../../services/supabase.js";
import { replyText } from "../../utils/reply.js";

export default async function completeWorkout(kakaoId, utterance, res) {
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
    .update({ status: "완료", end_time: now })
    .eq("member_id", member.id)
    .eq("status", "진행")
    .eq("assigned_date", today);

  if (error) return res.json(replyText("운동 완료 처리 중 오류가 발생했습니다."));
  return res.json(replyText("✅ 운동을 완료했습니다! 수고하셨습니다."));
}// debug rebuild trigger
