import { openai } from "../services/openai.js";
import { replyButton } from "../utils/reply.js";

// ✅ 기능 이름 유사 매칭 함수
function fuzzyMatch(text, options) {
  const scores = options.map(opt => {
    const clean = opt.replace(/\s/g, '');
    const keyword = clean.replace(/추천|입력|등록|조회|기능/g, '');

    let score = 0;
    if (text.includes(opt)) score += 10;
    else if (text.includes(clean)) score += 9;
    else if (text.includes(keyword)) score += 7;

    return { option: opt, score };
  });

  const best = scores.sort((a, b) => b.score - a.score)[0];
  return best.score > 0 ? best.option : null;
}

// ✅ 메인 핸들러
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

📌 출력 규칙:
- 기능 중 하나만 골라서 문장으로 표현 (예: "식단 추천 기능을 원하시는 건가요?")
- 너무 길지 않고 친절한 1줄 질문 형태
- 기능 이름은 위 목록 중 하나와 일치하거나 유사하게 포함되도록
`;

  const result = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5
  });

  const suggestionText = result.choices[0].message.content.trim();

  const functions = [
    "운동 예약", "루틴 추천", "식단 추천",
    "심박수 입력", "내 정보 조회", "회원 등록",
    "트레이너 등록", "체성분 입력", "통증 입력"
  ];

  // ✅ GPT 응답에서 가장 가까운 기능 찾기
  const matched = fuzzyMatch(suggestionText, functions) || "도움말";

  // ✅ 추천 문장 + 추천 버튼 + 보조 버튼 출력
  return res.json(replyButton(suggestionText, [
    matched,
    "도움말", "메인으로"
  ]));
}
