// ✅ handlers/fallback.js – GPT 유도 + 버튼 추천 최종 버전

import { openai } from "../services/openai.js";
import { replyButton } from "../utils/reply.js";

export default async function fallback(kakaoId, utterance, res) {
  const prompt = `
사용자가 다음 문장을 말했습니다:
"${utterance}"

아래 기능 중에서 가장 가까운 것을 하나만 선택해서 문장으로 추천해줘.

가능한 기능:
- 운동 예약
- 루틴 추천
- 식단 추천
- 심박수 입력
- 내 정보 조회
- 회원 등록
- 트레이너 등록
- 체성분 입력
- 통증 입력

📌 규칙:
- "○○ 기능을 원하시는 건가요?" 같은 친절한 질문 형태로 출력
- 항목 중 하나만 제안
- 문장은 1줄로 간결하게
  `;

  const result = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5
  });

  const suggestion = result.choices[0].message.content.trim();

  return res.json(replyButton(suggestion, [
    "운동 예약", "루틴 추천", "식단 추천",
    "심박수 입력", "내 정보", "회원 등록",
    "전문가 등록", "체성분 입력", "통증 입력"
  ]));
}

