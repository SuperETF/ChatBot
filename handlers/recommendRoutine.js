import { supabase } from "../services/supabase.js";
import { openai } from "../services/openai.js";
import { replyText } from "../utils/reply.js";

export default async function recommendRoutine(kakaoId, utterance, res) {
  const { data: member } = await supabase
    .from("members")
    .select("*")
    .eq("kakao_id", kakaoId)
    .single();

  if (!member) return res.json(replyText("회원 정보가 없어요."));

  const prompt = `
[회원 정보]
- 이름: ${member.name}
- 목표: ${member.goal || "체지방 감량"}
- 요청: ${utterance}

주 3일 루틴으로 추천해줘. 간단하게 설명.
`;

  const result = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7
  });

  return res.json(replyText(result.choices[0].message.content.trim()));
}
