import { supabase } from "../../../services/supabase.mjs";
import { replyText } from "../../../utils/reply.mjs";

export default async function registerTrainerMember(kakaoId, utterance, res) {
  // 여러 줄 입력 지원
  const lines = utterance.split("\n").map(l => l.trim()).filter(Boolean);
  const results = [];

  // 트레이너 인증 확인
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!trainer) {
    return res.json(replyText("트레이너 인증 정보가 없습니다. 먼저 전문가 등록을 진행해주세요."));
  }

  for (const line of lines) {
    const match = line.match(/^회원\s+([가-힣]{2,10})\s+(01[016789][0-9]{7,8})\s+(\d{4})$/);
    if (!match) {
      results.push(`❌ 잘못된 형식: ${line}`);
      continue;
    }

    const name = match[1];
    const phone = match[2];
    const code = match[3];

    // 중복 확인
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
        results.push(`❌ 다른 트레이너 소속: ${name}`);
      }
      continue;
    }

    const { error } = await supabase
      .from("members")
      .insert({ name, phone, code, trainer_id: trainer.id });

    if (error) {
      results.push(`❌ 등록 실패: ${name}`);
    } else {
      results.push(`✅ 등록 완료: ${name}`);
    }
  }

  return res.json(replyText(results.join("\n")));
}
