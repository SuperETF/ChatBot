import { openai } from "../services/openai.js";

export default async function classifyIntent(utterance) {
  const prompt = `
다음 발화를 보고 사용자가 원하는 기능을 분류해줘. 반드시 아래 중 하나만 응답해줘:
- 운동 예약
- 루틴 추천
- 심박수 입력
- 내 정보 조회
- 기타

발화: "${utterance}"
답변:
`;

  const res = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0
  });

  return res.data.choices[0].message.content.trim();
}
