import { openai } from "../services/openai.js";
import { replyButton } from "../utils/reply.js";

export default async function fallback(kakaoId, utterance, res) {
  const prompt = `
사용자가 이렇게 말했습니다: "${utterance}"

이 문장을 아래 기능 중 가장 가까운 것으로 제안해주세요:
- 운동 예약
- 루틴 추천
- 식단 추천
- 심박수 입력
- 내 정보 조회

형식: "혹시 ○○ 기능을 원하신 건가요?"
`;

  const result = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.6
  });

  return res.json(replyButton(result.choices[0].message.content.trim(), [
    "운동 예약", "루틴 추천", "식단 추천", "심박수 입력", "내 정보"
  ]));
}
