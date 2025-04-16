import { openai } from "../services/openai.js";
import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";

export default async function registerAvailability(kakaoId, utterance, res) {
  // 트레이너 ID 조회
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .single();

  if (!trainer) {
    return res.json(replyText("트레이너 인증 정보가 없습니다."));
  }

  // 🧠 GPT 파싱 프롬프트
  const prompt = `
다음 문장에서 요일과 시간 범위를 JSON 형식으로 추출해줘.
형식 예시:
[
  { "weekday": "월", "start_time": "18:00", "end_time": "19:00" },
  { "weekday": "화", "start_time": "15:00", "end_time": "20:00" }
]

문장: "${utterance}"
`;

  const result = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3
  });

  let slots;
  try {
    slots = JSON.parse(result.choices[0].message.content.trim());
  } catch (e) {
    console.error("❌ GPT 파싱 실패:", e);
    return res.json(replyText("입력 형식을 이해하지 못했어요. 다시 입력해주세요."));
  }

  // Supabase 저장
  const inserts = slots.map(slot => ({
    trainer_id: trainer.id,
    weekday: slot.weekday,
    start_time: slot.start_time,
    end_time: slot.end_time
  }));

  const { error } = await supabase.from("trainer_availability").insert(inserts);

  if (error) {
    console.error("❌ 저장 실패:", error);
    return res.json(replyText("가용 시간 저장 중 오류가 발생했습니다."));
  }

  return res.json(replyText(`✅ 다음 시간들이 저장되었습니다:\n${slots.map(s => `${s.weekday} ${s.start_time}~${s.end_time}`).join("\n")}`));
}
