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

위 회원을 위한 주 3일 운동 루틴을 추천해줘.
각 요일마다 부위와 운동 예시 포함, 간단하게 설명해줘.
`;

    const result = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    });

    const routine = result.choices[0].message.content.trim();

    return res.json(replyText(routine));
  } catch (error) {
    console.error("❌ 루틴 추천 에러:", error);
    return res.json(replyText("루틴 추천 중 문제가 발생했습니다. 나중에 다시 시도해주세요."));
  }
}
