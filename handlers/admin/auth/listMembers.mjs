// handlers/admin/auth/listMembers.mjs
import { supabase } from "../../../services/supabase.mjs";
import { replyQuickReplies } from "../../../utils/reply.mjs";

export default async function listMembers(kakaoId, utterance, res) {
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!trainer) {
    return res.json(replyText("❗️ 전문가 인증이 필요합니다."));
  }

  const { data: members } = await supabase
    .from("members")
    .select("name")
    .eq("trainer_id", trainer.id);

  if (!members || members.length === 0) {
    return res.json(replyText("아직 등록된 회원이 없습니다."));
  }

  return res.json(replyQuickReplies("📋 등록된 회원 목록입니다:", members.map(m => ({
    label: `${m.name} 과제 배정`,
    action: "message",
    messageText: `${m.name} 루틴 배정`
  }))));
}
