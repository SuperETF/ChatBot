// handlers/auth/registerTrainer.js
import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";

export default async function registerTrainer(kakaoId, utterance, res) {
  const cleaned = utterance.replace("전문가", "전문가 등록", "").trim();
  const nameMatch = cleaned.match(/[가-힣]{2,10}/);
  const phoneMatch = cleaned.match(/(01[016789]\d{7,8})/);

  if (!nameMatch || !phoneMatch) {
    return res.json(replyText("예: 전문가 홍길동 01012345678 형식으로 입력해주세요."));
  }

  const name = nameMatch[0];
  const phone = phoneMatch[0];

  const { data: trainer } = await supabase
    .from("trainers")
    .select("id, kakao_id")
    .eq("name", name)
    .eq("phone", phone)
    .maybeSingle();

  if (!trainer) {
    return res.json(replyText("등록된 트레이너가 아닙니다. 담당 관리자에게 등록 요청 후 다시 시도해주세요."));
  }

  if (trainer.kakao_id && trainer.kakao_id !== kakaoId) {
    return res.json(replyText("이미 다른 계정으로 등록된 트레이너입니다."));
  }

  const { error } = await supabase
    .from("trainers")
    .update({ kakao_id: kakaoId })
    .eq("id", trainer.id);

  if (error) {
    return res.json(replyText("트레이너 인증 중 오류가 발생했습니다. 다시 시도해주세요."));
  }

  return res.json(replyText(`✅ ${name} 트레이너님, 인증이 완료되었습니다.`));
}