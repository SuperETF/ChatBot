// 📁 handlers/admin/auth/listMembers.mjs
import { supabase } from "../../../services/supabase.mjs";
import { replyText } from "../../../utils/reply.mjs";

export default async function listMembers(kakaoId, utterance, res) {
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!trainer) {
    return res.json(replyText("❌ 트레이너 인증이 필요합니다."));
  }

  const { data: members, error } = await supabase
    .from("members")
    .select("name, phone")
    .eq("trainer_id", trainer.id)
    .order("id", { ascending: false })
    .limit(5);

  if (error) {
    return res.json(replyText("⚠️ 회원 목록 조회 중 오류가 발생했습니다."));
  }

  if (!members || members.length === 0) {
    return res.json(replyText("👥 아직 등록된 회원이 없습니다."));
  }

  const lines = members.map((m, i) => `${i + 1}. ${m.name} (${m.phone})`).join("\n");

  return res.json(replyText(`📋 최근 등록된 회원 목록입니다:\n\n${lines}`));
}