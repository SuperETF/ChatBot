// ✅ handlers/recordBodyComposition.js

import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";

export default async function recordBodyComposition(kakaoId, utterance, res) {
  const nameMatch = utterance.match(/[가-힣]{2,4}/);
  const weightMatch = utterance.match(/체중\s?(\d{2,3})/);
  const fatMatch = utterance.match(/체지방\s?(\d{1,2})/);
  const muscleMatch = utterance.match(/근육\s?(\d{2,3})/);

  if (!nameMatch || !weightMatch || !fatMatch || !muscleMatch) {
    return res.json(replyText(
      "입력 형식을 확인해주세요. 예: 김복두 체중 75 체지방 23 근육 30"
    ));
  }

  const name = nameMatch[0];
  const weight = Number(weightMatch[1]);
  const body_fat = Number(fatMatch[1]);
  const muscle_mass = Number(muscleMatch[1]);

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("name", name)
    .single();

  if (!member) {
    return res.json(replyText(`${name}님을 회원 목록에서 찾을 수 없습니다.`));
  }

  const { error } = await supabase
    .from("body_compositions")
    .insert({
      member_id: member.id,
      weight,
      body_fat,
      muscle_mass
    });

  if (error) {
    console.log("❌ 체성분 저장 실패:", error);
    return res.json(replyText("체성분 정보를 저장하는 데 실패했습니다."));
  }

  return res.json(replyText(`✅ ${name}님의 체성분 정보가 저장되었습니다.`));
}