import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";

export default async function registerTrainerMember(kakaoId, utterance, res) {
  const clean = utterance.replace(/^회원 등록\s*/, "").trim();
  const match = clean.match(/([가-힣]{2,10})\s+(01[016789][0-9]{7,8})/);

  if (!match) {
    return res.json(replyText("회원님의 성함과 전화번호를 정확히 입력해주세요.\n예: 회원 등록 김복두 01012345678"));
  }

  const name = match[1];
  const phone = match[2];

  // 트레이너 인증
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!trainer) {
    return res.json(replyText("트레이너 인증 정보가 없습니다. 먼저 '전문가 등록'을 완료해주세요."));
  }

  // 회원 중복 검사 (동일 트레이너 내)
  const { data: existing } = await supabase
    .from("members")
    .select("id, trainer_id")
    .eq("name", name)
    .eq("phone", phone)
    .maybeSingle();

  if (existing) {
    if (existing.trainer_id === trainer.id) {
      return res.json(replyText(`${name}님은 이미 등록된 회원입니다.`));
    } else {
      return res.json(replyText(`${name}님은 다른 트레이너에게 이미 등록되어 있습니다.`));
    }
  }

  const { error } = await supabase
    .from("members")
    .insert({ name, phone, trainer_id: trainer.id });

  if (error) {
    console.error("❌ 회원 등록 실패:", error);
    return res.json(replyText("회원 등록 중 문제가 발생했습니다. 다시 시도해주세요."));
  }

  return res.json(replyText(`✅ ${name}님을 회원으로 등록했습니다.`));
}
