// ✅ handlers/registerTrainer.js

import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";

export default async function registerTrainer(kakaoId, utterance, res) {
  const nameMatch = utterance.match(/[가-힣]{2,4}/);
  const phoneMatch = utterance.match(/(01[016789][0-9]{7,8})/);

  if (!nameMatch || !phoneMatch) {
    return res.json(replyText(
      `트레이너 인증을 위해 성함과 전화번호를 함께 입력해주세요.\n예: 김태현 01012345678`
    ));
  }

  const name = nameMatch[0];
  const phone = phoneMatch[0];

  const { data: trainer } = await supabase
    .from("trainers")
    .select("*")
    .eq("name", name)
    .eq("phone", phone)
    .maybeSingle();

  if (!trainer) {
    return res.json(replyText("등록된 트레이너 정보를 찾을 수 없습니다. 관리자에게 문의해주세요."));
  }

  if (trainer.kakao_id && trainer.kakao_id !== kakaoId) {
    return res.json(replyText("이미 다른 계정으로 등록된 트레이너입니다."));
  }

  const { error } = await supabase
    .from("trainers")
    .update({ kakao_id: kakaoId })
    .eq("id", trainer.id);

    console.log("🧩 추출된 이름:", name);
console.log("📞 추출된 전화번호:", phone);
console.log("🧑‍💼 사용자 kakao_id:", kakaoId);


  if (error) {
    return res.json(replyText("트레이너 인증 중 문제가 발생했습니다. 다시 시도해주세요."));
  }

  return res.json(replyText(
    `✅ ${name} 트레이너님, 인증이 완료되었습니다!\n원하시는 작업을 입력해주세요.`
  ));
}
