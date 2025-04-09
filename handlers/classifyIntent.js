import { openai } from "../services/openai.js";

export default async function classifyIntent(utterance) {
  const prompt = `
다음 발화를 보고 사용자의 의도를 아래 중 하나로 정확히 분류해줘:
- 운동 예약
- 루틴 추천
- 심박수 입력
- 내 정보 조회
- 기타

출력은 반드시 하나의 태그로만 해줘.
발화: "${utterance}"
답변:
`;

  const res = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0
  });

  return res.choices[0].message.content.trim();
}
