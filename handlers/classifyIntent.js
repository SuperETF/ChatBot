import { openai } from "../services/openai.js";

export default async function classifyIntent(utterance) {
  const prompt = `
다음 사용자 발화를 아래 기능 중 하나로 정확하게 분류해주세요:

- 운동 예약
- 루틴 추천
- 식단 추천
- 심박수 입력
- 내 정보 조회
- 회원 등록
- 기타

📌 규칙:
- 전화번호(010으로 시작)가 포함되면 무조건 "회원 등록"
- 이름 + 전화번호 조합이면 "회원 등록"
- "내 정보" 관련 발화는 "내 정보 조회"
- 위 외에는 의미에 따라 판단

문장: "${utterance}"
답변:
`;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0
  });

  return response.choices[0].message.content.trim();
}
