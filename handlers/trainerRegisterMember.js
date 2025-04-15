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

  // ✅ '회원 등록' prefix 제거 후 이름/전화번호 추출
  const clean = utterance.replace(/^회원 등록\s*/, "").trim();
  const namePhoneMatch = clean.match(/([가-힣]{2,4})\s+(01[016789][0-9]{7,8})/);

  if (!namePhoneMatch) {
    return res.json(replyText("회원님의 성함과 전화번호를 정확히 입력해주세요. 예: 김복두 01012345678"));
  }

  const name = namePhoneMatch[1];
  const phone = namePhoneMatch[2];

  console.log("✅ 이름:", name);
  console.log("📞 전화번호:", phone);
  console.log("🧑‍🏫 kakao_id:", kakaoId);

  // ✅ 중복 등록 방지
  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("name", name)
    .eq("phone", phone)
    .maybeSingle();

  if (existing) {
    return res.json(replyText(`${name}님은 이미 등록되어 있습니다.`));
  }

  // ✅ Supabase에 insert (trainer_id 포함, kakao_id는 null)
  const { error: insertError } = await supabase
    .from("members")
    .insert({
      name,
      phone,
      trainer_id: trainer.id,
      kakao_id: null
    });

  if (insertError) {
    console.error("❌ 등록 실패:", insertError);
    return res.json(replyText("회원 등록 중 문제가 발생했어요. 다시 시도해주세요."));
  }

  return res.json(replyText(`${name}님을 성공적으로 등록했어요.`));
}
