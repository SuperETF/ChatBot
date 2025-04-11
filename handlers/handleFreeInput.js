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

const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: prompt }],
  temperature: 0
});

const result = JSON.parse(response.choices[0].message.content);
