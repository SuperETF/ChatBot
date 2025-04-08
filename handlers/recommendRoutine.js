import { openai } from "../services/openai.js";
import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/replyText.js";

export default async function recommendRoutine(kakaoId, utterance, res) {
  const { data: member } = await supabase
    .from("members")
    .select("*")
    .eq("kakao_id", kakaoId)
    .single();

  if (!member) {
    return res.json(replyText("회원 정보가 없어요."));
  }

  const prompt = `
[회원 정보]
- 이름: ${member.name}
- 목표: ${member.goal || "체지방 감량"}
- 유산소 능력: 중간
- 요청 내용: ${utterance}

위 정보를 기반으로 3일짜리 운동 루틴을 추천해줘.
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7
  });

  const routine = completion.choices[0].message.content.trim();
  return res.json(replyText(`추천 루틴입니다:\n\n${routine}`));
}
