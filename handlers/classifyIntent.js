import { openai } from "../services/openai.js";

export default async function classifyIntent(utterance) {
  const prompt = `
다음 사용자 발화가 어떤 기능 요청인지 아래 중 하나로 정확히 분류해주세요:

- 운동 예약  
- 루틴 추천  
- 식단 추천  
- 심박수 입력  
- 내 정보 조회  
- 회원 등록  
- 기타

📌 분류 규칙 (중요):
- 이름 + 전화번호가 들어간 문장은 반드시 "회원 등록"으로 분류
- "회원 등록"이라는 단어가 포함되어 있어도 "회원 등록"
- "내 정보" 또는 "PT 횟수"가 포함되면 "내 정보 조회"
- 위와 무관하거나 애매하면 "기타"

사용자 발화: "${utterance}"

👉 아래 중 하나만 답변해줘 (예: 회원 등록)
`;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0
  });

  return response.choices[0].message.content.trim();
}
