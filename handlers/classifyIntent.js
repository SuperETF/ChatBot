// ✅ classifyIntent.js – 회원/트레이너 등록 구분 포함 최종 버전

import { openai } from "../services/openai.js";

export default async function classifyIntent(utterance) {
  // ✅ 직접 분기 처리: 우선순위 높은 고정 패턴은 여기서 처리
  if (utterance.startsWith("전문가")) return "전문가 등록";
  if (utterance.startsWith("회원 등록")) return "전문가 회원 등록";
  if (utterance.startsWith("회원")) return "회원 등록";

  // ✅ GPT 보조 분기 처리
  const prompt = `
다음 사용자 발화를 아래 기능 중 하나로 정확하게 분류해주세요:

- 운동 예약
- 루틴 추천
- 식단 추천
- 심박수 입력
- 내 정보 조회
- 회원 등록
- 전문가 등록
- 전문가 회원 등록
- 회원 목록 조회
- 체성분 입력
- 통증 입력
- 가용 시간 등록
- 개인 운동 예약
- 개인 운동 예약 취소
- 개인 운동 시간 조회
- 기타

📌 규칙:
- "회원 등록"으로 시작하면 반드시 "트레이너 회원 등록"
- "회원"으로 시작하고 전화번호가 포함되면 → "회원 등록"
- "전문가"로 시작하면 → 반드시 "트레이너 등록"
- "회원 목록", "명단" 포함 시 → "회원 목록 조회"
- "체성분" 단어 포함되면 → "체성분 입력"
- "통증" + 숫자 포함되면 → "통증 입력"
- "시간 등록", "가능 시간" 포함 → "가용 시간 등록"
- "개인 운동 예약" → "개인 운동 예약"
- "개인 운동 시간" → "개인 운동 시간 조회"
- "취소" + 시간 → "개인 운동 예약 취소"
- "내 정보" 포함 → "내 정보 조회"
- 그 외에는 의미를 분석해 가장 유사한 항목으로 분류

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

