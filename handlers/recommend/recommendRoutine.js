// ✅ handlers/recommendRoutine.js – GPT 기반 맞춤 루틴 추천

import { supabase } from "../services/supabase.js";
import { openai } from "../services/openai.js";
import { replyText } from "../utils/reply.js";

export default async function recommendRoutine(kakaoId, utterance, res) {
  const { data: member } = await supabase
    .from("members")
    .select("id, name")
    .eq("kakao_id", kakaoId)
    .single();

  if (!member) {
    return res.json(replyText("회원 정보를 찾을 수 없습니다. 먼저 등록을 진행해주세요."));
  }

  const memberId = member.id;

  const [{ data: body }, { data: strength }, { data: cardio }, { data: note }] = await Promise.all([
    supabase.from("body_compositions").select("weight, fat_percent").eq("member_id", memberId).order("created_at", { ascending: false }).limit(1),
    supabase.from("strength_records").select("bench, squat, deadlift").eq("member_id", memberId).order("created_at", { ascending: false }).limit(1),
    supabase.from("cardio_profiles").select("max_hr, rest_hr").eq("member_id", memberId).order("created_at", { ascending: false }).limit(1),
    supabase.from("personal_conditions").select("note").eq("member_id", memberId).order("created_at", { ascending: false }).limit(1),
  ]);

  const prompt = `
[회원 정보]
- 이름: ${member.name}
- 체중: ${body?.[0]?.weight || "미입력"}kg
- 체지방률: ${body?.[0]?.fat_percent || "미입력"}%
- 심박수: 최대 ${cardio?.[0]?.max_hr || "-"} / 안정시 ${cardio?.[0]?.rest_hr || "-"}
- 근력: 벤치 ${strength?.[0]?.bench || "-"}, 스쿼트 ${strength?.[0]?.squat || "-"}, 데드 ${strength?.[0]?.deadlift || "-"}
- 특이사항: ${note?.[0]?.note || "없음"}

위 정보를 바탕으로 주 3일 요일별 맞춤 루틴을 추천해줘. 간단하고 친절하게 요약해서 제안할 것.`;

  const result = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7
  });

  const content = result.choices[0].message.content.trim();

  await supabase.from("routines").insert({
    member_id: member.id,
    routine_json: { content }
  });

  return res.json(replyText(`💪 추천 루틴\n\n${content}`));
}