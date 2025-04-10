// ✅ handlers/uploadMealPhoto.js

import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";

export default async function uploadMealPhoto(kakaoId, utterance, res) {
  const urlMatch = utterance.match(/https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=]+/);
  const feedbackMatch = utterance.match(/메모[:：]?(.*)/);

  if (!urlMatch) {
    return res.json(replyText("사진 URL을 포함해주세요. 예: https://..."));
  }

  const image_url = urlMatch[0];
  const feedback = feedbackMatch ? feedbackMatch[1].trim() : null;

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .single();

  if (!member) {
    return res.json(replyText("회원 정보를 찾을 수 없습니다."));
  }

  const { error } = await supabase
    .from("meal_photos")
    .insert({
      member_id: member.id,
      image_url,
      feedback
    });

  if (error) {
    console.log("❌ 사진 저장 실패:", error);
    return res.json(replyText("사진 저장에 실패했습니다."));
  }

  return res.json(replyText("✅ 인증 사진이 저장되었습니다. 감사합니다!"));
}
