// handlers/auth/listMembers.js 
import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";

export default async function listMembers(kakaoId, utterance, res) {
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!trainer) {
    return res.json(replyText("트레이너 인증 정보가 없습니다."));
  }

  const { data: members } = await supabase
    .from("members")
    .select("name, phone")
    .eq("trainer_id", trainer.id);

  if (!members || members.length === 0) {
    return res.json(replyText("아직 등록된 회원이 없습니다."));
  }

  const formatted = members.map(m => `• ${m.name} (${m.phone})`).join("\n");
  return res.json(replyText(`📋 등록된 회원 목록:\n${formatted}`));
}
