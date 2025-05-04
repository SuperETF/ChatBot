import { supabase } from "../../../services/supabase.mjs";
import { replyText } from "../../../utils/reply.mjs";

export default async function registerMemberByTrainer(kakaoId, utterance, res) {
  const lines = utterance.split("\n").map(line => line.trim()).filter(Boolean);
  const results = [];

  const { data: trainer, error: trainerError } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (trainerError || !trainer) {
    return res.json(replyText("❌ 전문가 인증이 필요합니다. 먼저 등록을 완료해 주세요."));
  }

  for (const line of lines) {
    const match = line.match(/^나의?\s*회원\s+([가-힣]{2,10})\s+(01[016789][-]?\d{3,4}[-]?\d{4})\s+(\d{4})$/);

    if (!match) {
      results.push(`❌ 잘못된 형식: ${line}`);
      continue;
    }

    const name = match[1];
    const phone = match[2].replace(/-/g, "");
    const code = match[3];

    const { data: existing } = await supabase
      .from("members")
      .select("id, trainer_id")
      .eq("name", name)
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      if (existing.trainer_id === trainer.id) {
        results.push(`⚠️ 이미 등록된 회원: ${name}`);
      } else {
        results.push(`❌ 다른 트레이너 소속 회원: ${name}`);
      }
      continue;
    }

    const { error: insertError } = await supabase
      .from("members")
      .insert({ name, phone, code, trainer_id: trainer.id });

    if (insertError) {
      results.push(`❌ 등록 실패: ${name}`);
    } else {
      results.push(`✅ 등록 완료: ${name}`);
    }
  }

  return res.json(replyText(results.join("\n")));
}
