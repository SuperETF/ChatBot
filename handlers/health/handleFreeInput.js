import { openai } from "../../services/openai.js";

export default async function handleFreeInput(utterance) {
  const prompt = `
다음 문장에서 항목별로 필요한 정보를 JSON으로 추출해줘.

✅ 추출 항목:
- name: 회원 이름 (필수)
- body: { weight, fat, muscle } (선택)
- pain: [{ location, score }] (선택)
- notes: 특이사항 또는 설명 (선택)

예시 문장:
"김복두 회원님 체중 80이고 체지방 20이고 근육 20이야. 오른쪽 무릎이 통증 7점. 특이사항은 앞쪽 통증."

예시 출력:
{
  "name": "김복두",
  "body": { "weight": 80, "fat": 20, "muscle": 20 },
  "pain": [{ "location": "오른쪽 무릎", "score": 7 }],
  "notes": "앞쪽 통증"
}

문장: "${utterance}"
→ JSON:
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    });

    const content = response.choices[0].message.content.trim();
    const result = JSON.parse(content);

    if (!result.name) {
      throw new Error("회원 이름(name)이 누락되었습니다.");
    }

    return result;
  } catch (err) {
    console.error("❌ handleFreeInput 오류:", err);
    return {
      error: true,
      message: "입력된 문장을 분석하는 데 실패했습니다. 형식을 다시 확인해주세요.",
      detail: err.message
    };
  }
}
