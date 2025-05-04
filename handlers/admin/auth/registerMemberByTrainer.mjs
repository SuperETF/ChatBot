import { supabase } from "../../../services/supabase.mjs";
import { replyText } from "../../../utils/reply.mjs";

export default async function registerMemberByTrainer(kakaoId, utterance, res) {
  const lines = utterance.split("\n").map(line => line.trim()).filter(Boolean);
  const results = [];

  // ✅ 트레이너 인증 확인
  const { data: trainer, error: trainerError } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (trainerError || !trainer) {
    console.error("❌ 트레이너 인증 실패:", trainerError?.message);
    return res.json(replyText("❌ 트레이너 인증이 필요합니다. 전문가 등록을 먼저 해주세요."));
  }

  for (const line of lines) {
    const match = line.match(/^회원\s+([가-힣]{2,10})\s+(01[016789][-]?\d{3,4}[-]?\d{4})\s+(\d{4})$/);

    if (!match) {
      results.push(`❌ 잘못된 형식: ${line}`);
      continue;
    }

    const name = match[1];
    const phone = match[2].replace(/-/g, "");
    const code = match[3];

    // ✅ 중복 확인
    const { data: existing, error: existingError } = await supabase
      .from("members")
      .select("id, trainer_id")
      .eq("name", name)
      .eq("phone", phone)
      .maybeSingle();

    if (existingError) {
      console.error("❌ 회원 중복 조회 실패:", existingError.message);
      results.push(`❌ 조회 실패: ${name}`);
      continue;
    }

    if (existing) {
      if (existing.trainer_id === trainer.id) {
        results.push(`⚠️ 이미 등록된 회원: ${name}`);
      } else {
        results.push(`❌ 다른 트레이너 소속의 회원: ${name}`);
      }
      continue;
    }

    // ✅ 회원 insert
    const { error: insertError } = await supabase
      .from("members")
      .insert({ name, phone, code, trainer_id: trainer.id });

    if (insertError) {
      console.error("❌ 회원 등록 실패:", insertError.message);
      results.push(`❌ 등록 실패: ${name}`);
    } else {
      results.push(`✅ 등록 완료: ${name}`);
    }
  }

  return res.json(replyText(results.join("\n")));
}
