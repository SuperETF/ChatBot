import { openai } from "../../services/openai.mjs";
import { replyButton } from "../../utils/reply.mjs";
import { fetchRecentHistory } from "../../utils/fetchHistoryForRAG.mjs";
import { logFallbackSuggestion } from "../../utils/logFallbackSuggestion.mjs"; // ✅ 로그 저장 유틸

export default async function fallback(kakaoId, utterance, res) {
  const recentHistory = await fetchRecentHistory(kakaoId);

  const prompt = `
사용자가 다음과 같이 말했습니다:
"${utterance}"

아래 기능 중 가장 가까운 것을 하나만 선택해서 추천 문장을 만들어주세요.

기능 목록:
- 운동 예약
- 루틴 추천
- 식단 추천
- 심박수 입력
- 내 정보 조회
- 회원 등록
- 트레이너 등록
- 체성분 입력
- 통증 입력

조건:
- 반드시 위 목록 중 하나만 선택해서 유도 문장으로 작성할 것
- 너무 길지 않고 자연스러운 한 문장으로 답변할 것

이전 대화 흐름:
${recentHistory.join("\n")}

추천:
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5
  });

  const suggestion = response.choices[0].message.content.trim();

  // ✅ fallback 로그 저장
  await logFallbackSuggestion({ kakaoId, utterance, suggestion });

  return res.json(replyButton(suggestion, [
    "운동 예약", "루틴 추천", "식단 추천",
    "심박수 입력", "내 정보 조회", "회원 등록",
    "트레이너 등록", "체성분 입력", "통증 입력"
  ]));
}
