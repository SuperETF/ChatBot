import { openai } from "../services/openai.js";

export default async function classifyIntent(utterance) {
  const prompt = `
다음 문장을 보고 사용자가 원하는 기능을 아래 중 하나로 분류해줘.
- 운동 예약
- 루틴 추천
- 식단 추천
- 심박수 입력
- 내 정보 조회
- 문장이 "홍길동 01012345678"처럼 보이면 → "회원 등록" intent 반환
- 기타

반드시 위 항목 중 하나만 출력해.  
문장: "${utterance}"
`;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0
  });

  const intent = response.choices[0].message.content.trim();
  return intent;
}
