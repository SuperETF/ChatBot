import { openai } from "../services/openai.js";
import { replyButton } from "../utils/reply.js";

export default async function fallback(kakaoId, utterance, res) {
  const prompt = `
사용자 발화: "${utterance}"

이 발화가 어떤 기능 요청에 가까운지 아래 중 하나로 제안해줘:
- 운동 예약
- 루틴 추천
- 식단 추천
- 심박수 입력
- 내 정보 조회
- 회원 등록

혹시 ○○ 기능을 원하신 건가요?
`;

  const result = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.6
  });

  const suggestion = result.choices[0].message.content.trim();

  return res.json(replyButton(suggestion, [
    "회원 등록", "상담 연결", "운동 예약"
  ]));
}
