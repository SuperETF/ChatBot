import { openai } from "../services/openai.js";
import { replyButton } from "../utils/reply.js";

export default async function fallback(kakaoId, utterance, res) {
  const prompt = `
사용자가 "${utterance}"라고 말했을 때
가장 가까운 기능을 아래 중 하나로 추천해줘:

- 운동 예약
- 루틴 추천
- 식단 추천
- 심박수 입력
- 내 정보 조회
- 회원 등록

예시 답변:
혹시 ○○ 기능을 원하시는 건가요?
`;

  const result = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.6
  });

  const suggestion = result.choices[0].message.content.trim();

  return res.json(replyButton(suggestion, [
    "운동 예약", "루틴 추천", "식단 추천", "심박수 입력", "내 정보", "회원 등록"
  ]));
}
