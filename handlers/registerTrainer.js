// ✅ handlers/registerTrainer.js (리팩토링 + 정규식 안정화 + 로그 개선)

import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";

export default async function registerTrainer(kakaoId, utterance, res) {
  // "트레이너 등록" 문구 제거 후 이름/번호 추출 시도
  const cleaned = utterance.replace("트레이너 등록", "").trim();
  const nameMatch = cleaned.match(/[가-힣]{2,4}/);
  const phoneMatch = cleaned.match(/(01[016789]\d{7,8})/);

  console.log("🧩 추출된 이름:", nameMatch);
  console.log("📞 추출된 전화번호:", phoneMatch);
  console.log("🧑‍💼 사용자 kakao_id:", kakaoId);

  if (!nameMatch || !phoneMatch) {
    return res.json(replyText(
      `트레이너 인증을 위해 성함과 전화번호를 함께 입력해주세요.\n예: 김태현 01012345678`
    ));
  }

  const name = nameMatch[0];
  const phone = phoneMatch[0];

  const { data: trainer } = await supabase
    .from("trainers")
    .select("id, kakao_id")
    .eq("name", name)
    .eq("phone", phone)
    .maybeSingle();

  console.log("🔍 Supabase에서 찾은 트레이너:", trainer);

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

  if (error) {
    console.error("❌ 트레이너 인증 실패:", error);
    return res.json(replyText("트레이너 인증 중 문제가 발생했습니다. 다시 시도해주세요."));
  }

  return res.json(replyText(
    `✅ ${name} 트레이너님, 인증이 완료되었습니다!\n원하시는 작업을 입력해주세요.`
  ));
}

