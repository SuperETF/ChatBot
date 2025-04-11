import { openai } from "../services/openai.js";
import { replyButton } from "../utils/reply.js";

export default async function fallback(kakaoId, utterance, res) {
  const prompt = `
사용자가 다음 문장을 말했습니다:
"${utterance}"

아래 기능 중에서 가장 가까운 것을 하나만 선택해서 문장으로 추천해줘.

가능한 기능:
운동 예약
루틴 추천
식단 추천
심박수 입력
내 정보 조회
회원 등록
트레이너 등록
체성분 입력
통증 입력

📌 출력 규칙:
- 기능 중 하나만 골라서 문장으로 표현 (예: 식단 추천 기능을 원하시는 건가요?)
- 너무 길지 않고 친절한 1줄 질문 형태
- 기능 이름은 정확히 위 목록 중 하나와 일치하게 사용
  `;

  const result = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5
  });

  const suggestionText = result.choices[0].message.content.trim();

  // ✅ 기능 이름 추출 (기능 텍스트에서 찾기)
  const functions = [
    "운동 예약", "루틴 추천", "식단 추천",
    "심박수 입력", "내 정보 조회", "회원 등록",
    "트레이너 등록", "체성분 입력", "통증 입력"
  ];

  const matched = functions.find(f => suggestionText.includes(f)) || "도움말";

  // ✅ GPT가 추천한 문장 + 버튼 1개만
  return res.json(replyButton(suggestionText, [
    matched,
    "도움말", "메인으로"
  ]));
}
