import { supabase } from "../services/supabase.js";
import { openai } from "../services/openai.js";
import { replyText } from "../utils/reply.js";

export default async function recommendMeal(kakaoId, utterance, res) {
  const { data: member } = await supabase
    .from("members")
    .select("*")
    .eq("kakao_id", kakaoId)
    .single();

  const prompt = `
[회원 정보]
- 이름: ${member?.name || "알 수 없음"}
- 목표: ${member?.goal || "체지방 감량"}

"${utterance}"라고 요청했습니다.  
아침/점심/저녁으로 식단 추천해주세요. 간단하고 친근하게 작성.
`;

  const result = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.8
  });

  return res.json(replyText(result.choices[0].message.content.trim()));
}
