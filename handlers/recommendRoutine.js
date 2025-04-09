import { supabase } from "../services/supabase.js";
import { openai } from "../services/openai.js";
import { replyText, replyButton } from "../utils/reply.js";

export default async function recommendRoutine(kakaoId, utterance, res) {
  try {
    const { data: member } = await supabase
      .from("members")
      .select("*")
      .eq("kakao_id", kakaoId)
      .single();

    if (!member) {
      return res.json(
        replyButton(
          "회원 정보를 찾을 수 없어요. 등록하시겠어요?",
          ["회원 등록", "상담 연결"]
        )
      );
    }

    const prompt = `
[회원 정보]
- 이름: ${member.name}
- 목표: ${member.goal || "체지방 감량"}
- 요청: ${utterance}

이 정보를 바탕으로 주 3일 루틴을 추천해줘.
요일별로 부위 + 간단한 운동 예시 형태로 작성.
`;

    const result = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    });

    return res.json(replyText(result.choices[0].message.content.trim()));
  } catch (err) {
    console.error("❌ 루틴 추천 오류:", err);
    return res.json(replyText("루틴 추천 중 문제가 발생했어요. 다시 시도해주세요."));
  }
}
