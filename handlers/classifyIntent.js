import { openai } from "../services/openai.js";

export default async function classifyIntent(utterance) {
  const cleanUtterance = utterance.normalize("NFKC").trim().toLowerCase();

  // ✅ 우선순위 높은 고정 분기
  if (cleanUtterance.startsWith("전문가")) return "전문가 등록";
  if (cleanUtterance.startsWith("회원 등록")) return "전문가 회원 등록";
  if (cleanUtterance.startsWith("회원 목록") || cleanUtterance.includes("명단")) return "회원 목록 조회";

  // ✅ 이름 + 전화번호만 있어도 '회원 등록'으로 간주
  const hasName = utterance.match(/[가-힣]{2,4}/g);  // 여러 이름 후보
  const hasPhone = utterance.match(/01[016789][0-9]{7,8}/);
  const blacklist = ['회원', '등록', '전문가'];
  const name = hasName?.find(n => !blacklist.includes(n));

  if (name && hasPhone) return "회원 등록";

  // ✅ 기능 키워드 분기
  if (utterance.match(/체중|체지방|근육/)) return "체성분 입력";
  if (utterance.match(/최대심박|안정시|심박수/)) return "심박수 입력";
  if (utterance.match(/아파|통증|불편/)) return "통증 입력";
  if (utterance.match(/스쿼트|벤치|데드리프트/)) return "근력 기록 입력";
  if (utterance.match(/이력|주의사항|특이사항/)) return "특이사항 입력";
  if (utterance.match(/시간 등록|가능 시간/)) return "가용 시간 등록";
  if (utterance.match(/개인 운동 시간/)) return "개인 운동 시간 조회";
  if (utterance.match(/개인 운동 예약/)) return "개인 운동 예약";
  if (utterance.match(/취소.*\d{1,2}시/)) return "개인 운동 예약 취소";
  if (utterance.match(/내 정보/)) return "내 정보 조회";
  if (utterance.match(/회원.*통계|회원 수|등록 현황|요약/)) return "회원 통계 조회";
  if (utterance.match(/체중|체지방|근육|통증|강도|점|특이사항|무릎|어깨/)) {
    return "자유 입력";
  }
  

  // ✅ GPT 보조 분류
  const prompt = `
다음 사용자 발화를 아래 기능 중 하나로 정확하게 분류해주세요:

- 운동 예약
- 루틴 추천
- 식단 추천
- 심박수 입력
- 내 정보 조회
- 회원 등록
- 전문가 등록
- 회원
- 회원 목록 조회
- 체성분 입력
- 통증 입력
- 가용 시간 등록
- 개인 운동 예약
- 개인 운동 예약 취소
- 개인 운동 시간 조회
- 기타

📌 규칙:
- "회원 등록"으로 시작하면 반드시 "전문가 회원 등록"
- "회원 목록", "명단" 포함 시 → "회원 목록 조회"
- 전화번호와 이름만 입력한 경우 → "회원 등록"
- "전문가"로 시작하면 → 반드시 "전문가 등록"
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
  model: "gpt-4",
  messages: [{ role: "user", content: prompt }],
  temperature: 0,

  // ✅ 여기에 function 등록
  functions: [
    {
      name: "queryMemberStats",
      description: "회원 관련 통계를 조회합니다.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Supabase SQL 형식의 쿼리"
          }
        },
        required: ["query"]
      }
    }
  ],
  function_call: "auto"
});

  return response.choices[0].message.content.trim();
}
