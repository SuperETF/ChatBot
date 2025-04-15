import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";

export default async function trainerRegisterMember(kakaoId, utterance, res) {
  // ✅ 트레이너 인증 확인
  const { data: trainer, error } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!trainer) {
    console.log("❌ 트레이너 인증 실패");
    return res.json(replyText("이 기능은 전문가 전용입니다. 전문가 등록 후 사용해주세요."));
  }

  // ✅ 이름과 전화번호 추출
  const nameMatch = utterance.match(/[가-힣]{2,4}/);
  const phoneMatch = utterance.match(/(01[016789][0-9]{7,8})/);

  if (!nameMatch || !phoneMatch) {
    return res.json(replyText("회원 성함과 전화번호를 함께 입력해주세요. 예: 김복두 01012345678"));
  }

  const name = nameMatch[0];
  const phone = phoneMatch[0];

  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("name", name)
    .eq("phone", phone)
    .maybeSingle();

  if (existing) {
    return res.json(replyText(`${name}님은 이미 등록되어 있습니다.`));
  }

  const { error: insertError } = await supabase
    .from("members")
    .insert({ name, phone, trainer_id: trainer.id, kakao_id: null });

  if (insertError) {
    console.error("❌ 등록 실패:", insertError);
    return res.json(replyText("회원 등록 중 문제가 발생했어요. 다시 시도해주세요."));
  }

  return res.json(replyText(`${name}님을 성공적으로 등록했어요.`));
}
