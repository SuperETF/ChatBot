// handlers/auth/listMembers.mjs
import { supabase } from "../../services/supabase.mjs";
import { replyText, replyButton } from "../../utils/reply.mjs";

export default async function listMembers(kakaoId, utterance, res) {
  if (utterance.trim() !== "회원 목록") {
    return res.json(replyText("❗ 회원 목록을 조회하려면 '회원 목록'이라고 입력해주세요."));
  }

  // ✅ 트레이너 인증 여부 확인
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!trainer) {
    return res.json(replyButton(
      "트레이너 인증 정보가 없습니다. 먼저 전문가 등록을 진행해주세요.",
      ["전문가 홍길동 01012345678 0412"]
    ));
  }

  // ✅ 등록된 회원 목록 조회
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
