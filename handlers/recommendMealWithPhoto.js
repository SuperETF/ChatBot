// ✅ handlers/recommendMealWithPhoto.js

import { supabase } from "../services/supabase.js";
import { openai } from "../services/openai.js";
import { replyButton } from "../utils/reply.js";

export default async function recommendMealWithPhoto(kakaoId, utterance, res) {
  const { data: member } = await supabase
    .from("members")
    .select("id, name")
    .eq("kakao_id", kakaoId)
    .single();

  if (!member) {
    return res.json(replyButton(
      "회원 정보가 없습니다. 등록 후 이용해주세요.",
      ["회원 등록"]
    ));
  }

  const { data: body } = await supabase
    .from("body_compositions")
    .select("weight, body_fat")
    .eq("member_id", member.id)
    .order("measured_at", { ascending: false })
    .limit(1)
    .single();

  const prompt = `
[회원 식단 추천]
- 이름: ${member.name}
- 체중: ${body?.weight || "미입력"}kg
- 체지방률: ${body?.body_fat || "미입력"}%
- 목표: 식단 습관화

위 정보를 바탕으로 아침, 점심, 저녁에 추천할 간단한 식단을 각각 한 줄로 정리해주세요.\n우리가 추구하는 식단은 적당한 단백질 중심 + 균형 잡힌 식단입니다.
  `;

  const result = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.6
  });

  const text = result.choices[0].message.content.trim();

  await supabase.from("meal_recommendations").insert({
    member_id: member.id,
    diet_goal: "습관화",
    recommended_meals: { content: text }
  });

  return res.json(replyButton(
    `🍱 오늘의 식단 추천입니다:\n\n${text}\n\n인증샷을 보내시겠어요?`,
    ["식단 인증 사진 업로드"]
  ));
}
