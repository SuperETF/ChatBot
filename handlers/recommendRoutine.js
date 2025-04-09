import { supabase } from "../services/supabase.js";
import { openai } from "../services/openai.js";
import { replyButton } from "../utils/reply.js";

export default async function recommendRoutine(kakaoId, utterance, res) {
  try {
    // ✅ 1. 회원 기본 정보 조회
    const { data: member } = await supabase
      .from("members")
      .select("id, name, goal")
      .eq("kakao_id", kakaoId)
      .single();

    if (!member) {
      return res.json(replyButton(
        "회원 정보를 찾을 수 없습니다. 등록하시겠어요?",
        ["회원 등록", "상담 연결"]
      ));
    }

    // ✅ 2. 체성분 정보
    const { data: body } = await supabase
      .from("body_compositions")
      .select("*")
      .eq("member_id", member.id)
      .order("measured_at", { ascending: false })
      .limit(1)
      .single();

    // ✅ 3. 최근 통증 기록
    const { data: pain } = await supabase
      .from("pain_reports")
      .select("area")
      .eq("member_id", member.id)
      .order("reported_at", { ascending: false })
      .limit(1)
      .single();

    // ✅ 4. GPT에게 루틴 요청
    const prompt = `
[회원 정보]
- 이름: ${member.name}
- 목표: ${member.goal || "체지방 감량"}
- 체중: ${body?.weight || "미입력"}
- 체지방률: ${body?.body_fat || "미입력"}
- 최근 통증 부위: ${pain?.area || "없음"}

이 정보를 바탕으로 주 3일 요일별 운동 루틴을 추천해줘.
친근하고 짧게 요약해줘. (예: 월: 하체 / 화: 유산소...)
`;

    const result = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    });

    const text = result.choices[0].message.content.trim();

    // ✅ 5. Supabase에 루틴 저장
    await supabase.from("routines").insert({
      member_id: member.id,
      routine_json: { content: text }
    });

    // ✅ 6. 버튼으로 응답 전송
    return res.json(replyButton(
      text,
      ["다시 추천받기", "오늘 루틴 저장", "운동 영상 보기"]
    ));

  } catch (error) {
    console.error("❌ 루틴 추천 실패:", error);
    return res.json(replyButton(
      "루틴 추천 중 오류가 발생했습니다. 다시 시도해볼까요?",
      ["다시 추천받기", "상담 연결"]
    ));
  }
}
