import { supabase } from "../../../services/supabase.mjs";
import { replyText } from "../../../utils/reply.mjs";

export default async function listMembers(kakaoId, utterance, res) {
  // 트레이너 인증 확인
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!trainer) {
    return res.json(replyText("❗️ 전문가 인증이 필요합니다."));
  }

  // 해당 트레이너 소속 회원 목록 조회
  const { data: members, error } = await supabase
    .from("members")
    .select("name")
    .eq("trainer_id", trainer.id)
    .order("name", { ascending: true }); // 이름순 정렬 (선택)

  if (error) {
    console.error("❌ 회원 목록 조회 실패:", error.message);
    return res.json(replyText("❌ 회원 목록 조회에 실패했습니다. 다시 시도해주세요."));
  }

  if (!members || members.length === 0) {
    return res.json(replyText("📭 아직 등록된 회원이 없습니다."));
  }

  // 회원 이름 나열
  const memberList = members.map((m, i) => `- ${m.name}`).join("\n");
  const message = `📋 등록된 회원 목록입니다:\n\n${memberList}`;

  return res.json(replyText(message));
}
