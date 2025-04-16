// handlers/workout/reportWorkoutCondition.js
import { supabase } from "../../services/supabase.js";
import { replyText } from "../../utils/reply.js";

export default async function reportWorkoutCondition(kakaoId, utterance, res) {
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) return res.json(replyText("회원 인증 정보가 없습니다."));

  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase
    .from("personal_assignments")
    .update({ notes: utterance })
    .eq("member_id", member.id)
    .eq("assigned_date", today);

  if (error) return res.json(replyText("특이사항 저장 중 오류가 발생했습니다."));
  return res.json(replyText("✍️ 특이사항을 기록했어요. 트레이너에게 전달할게요."));
}