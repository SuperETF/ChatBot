import {
  parseDateRangeFromText,
  parseDateTimeFromText,
  parseManualDateFromText,
  parseRelativeDay
} from "./parseDateUtils.mjs";
import { openai } from "../services/openai.mjs";

export async function parseDateWithFallback(utterance) {
  let scheduleDates = [];

  const rules = [
    parseDateRangeFromText,
    parseDateTimeFromText,
    parseManualDateFromText,
    parseRelativeDay // ✅ 여기 추가됨
  ];

  for (const parser of rules) {
    const result = parser(utterance);
    if (result?.length > 0) {
      scheduleDates = result;
      break;
    }
  }

  // ✅ fallback
  if (scheduleDates.length === 0) {
    try {
      const messages = [
        {
          role: "system",
          content: `너는 운동 날짜 추출기야. 문장에서 날짜를 다음 형식으로 추출해:\n\n[{ "date": "2025-04-20", "time": "15:00" }]`
        },
        {
          role: "user",
          content: utterance
        }
      ];

      const response = await openai.chat.completions.create({
        model: process.env.GPT_MODEL_ID_ASSIGNMENT,
        messages,
        temperature: 0
      });

      const parsed = JSON.parse(response.choices[0].message.content.trim());

      if (Array.isArray(parsed)) {
        scheduleDates = parsed.map(d => ({
          date: d.date,
          time: d.time || null
        }));
      }
    } catch (e) {
      console.warn("⚠️ GPT fallback 실패:", e.message);
    }
  }

  return scheduleDates;
}
