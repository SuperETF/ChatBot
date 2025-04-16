import { supabase } from "../../services/supabase.js";
import { openai } from "../../services/openai.js";
import { replyText, replyButton } from "../../utils/reply.js";

export default async function recommendMeal(kakaoId, utterance, res) {
  const { data: member } = await supabase
    .from("members")
    .select("*")
    .eq("kakao_id", kakaoId)
    .single();

  if (!member) {
    return res.json(replyButton("회원 정보를 찾을 수 없습니다. 등록하시겠어요?", [
      "회원 등록", "상담 연결"
    ]));
  }

  const prompt = `
[회원 정보]
- 이름: ${member.name}
- 목표: ${member.goal || "체지방 감량"}
- 요청: ${utterance}

위 회원에게 아침, 점심, 저녁 식단을 간단히 추천해주세요.
`;

  const result = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7
  });

  return res.json(replyText(result.choices[0].message.content.trim()));
}
