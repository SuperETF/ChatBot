import { supabase } from "../../../services/supabase.mjs";
import { replyText } from "../../../utils/reply.mjs";

export default async function registerMember(kakaoId, utterance, res) {
  // 여러 줄 입력 지원 (각 줄마다 하나의 회원 등록 정보)
  const lines = utterance.split("\n").map(line => line.trim()).filter(Boolean);
  const results = [];

  // 트레이너 인증 확인 (현재 kakaoId에 해당하는 트레이너가 존재하는지)
  const { data: trainer, error: trainerError } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (trainerError) {
    console.error("❌ 트레이너 인증 조회 실패:", trainerError.message);
    return res.json(replyText("트레이너 인증에 문제가 발생했습니다. 나중에 다시 시도해주세요."));
  }

  if (!trainer) {
    return res.json(replyText("트레이너 인증 정보가 없습니다. 먼저 전문가 등록을 진행해주세요."));
  }

  for (const line of lines) {
    // 입력 형식: "회원 홍길동 01012345678 1234"
    const match = line.match(/^회원\s+([가-힣]{2,10})\s+(01[016789]\d{7,8})\s+(\d{4})$/);
    if (!match) {
      results.push(`❌ 잘못된 형식: ${line}`);
      continue;
    }

    const name = match[1];
    const phone = match[2];
    const code = match[3];

    // 중복 확인: 같은 이름, 전화번호로 등록된 회원 조회
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

    // 회원 등록: members 테이블에 insert
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
