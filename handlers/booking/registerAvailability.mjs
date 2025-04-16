// handlers/booking/registerAvailability.mjs
import { openai } from "../../services/openai.mjs";
import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";

export default async function registerAvailability(kakaoId, utterance, res) {
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!trainer) {
    return res.json(replyText("트레이너 인증 정보가 없습니다."));
  }

  const prompt = `다음 문장에서 요일 또는 날짜와 시간 범위를 JSON 배열로 추출해줘.
시간은 24시간제로. date 필드는 'YYYY-MM-DD' 형식.

예시:
[
  { "weekday": "월", "start_time": "18:00", "end_time": "19:00" },
  { "date": "2025-04-22", "start_time": "15:00", "end_time": "17:00" }
]

문장: "${utterance}"`;

  let parsed;
  try {
    const result = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2
    });
    parsed = JSON.parse(result.choices[0].message.content.trim());
  } catch (e) {
    return res.json(replyText("❌ 입력 형식을 이해하지 못했어요. 예: '월 18:00~19:00 / 4월 25일 17:00~18:00'처럼 입력해주세요."));
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return res.json(replyText("❌ 시간으로 인식된 항목이 없습니다. 예시: '수 10:00~12:00 / 2025-04-25 14:00~16:00'"));
  }

  const inserts = parsed.map(slot => ({
    trainer_id: trainer.id,
    weekday: slot.weekday || null,
    date: slot.date || null,
    start_time: slot.start_time,
    end_time: slot.end_time,
    type: slot.date ? "특정" : "반복"
  }));

  const { error } = await supabase.from("trainer_availability").insert(inserts);

  if (error) {
    console.error("❌ Supabase insert 실패 in registerAvailability:");
    console.error("📦 데이터:", JSON.stringify(inserts, null, 2));
    console.error("🧨 에러:", error);
    return res.json(replyText("❌ 시간 저장 중 문제가 발생했습니다. 다시 시도해주세요."));
  }

  const summary = inserts.map(i => `📅 ${i.date || i.weekday} ${i.start_time}~${i.end_time}`).join("\n");
  return res.json(replyText(`✅ 다음 시간들이 저장되었습니다:\n${summary}`));
}