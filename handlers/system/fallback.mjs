// handlers/system/fallback.mjs
import { replyText } from "../../utils/reply.mjs";
import { supabase } from "../../services/supabase.mjs";

export default async function fallback(utterance, kakaoId, res) {
  console.warn("🔁 fallback triggered:", utterance);

  // fallback 로그 저장
  await supabase.from("fallback_logs").insert({
    kakao_id: kakaoId,
    utterance,
    timestamp: new Date(),
    handled: false,
    note: "fallback.mjs triggered"
  });

  return res.json(replyText(
    "🤔 말씀하신 내용을 잘 이해하지 못했어요.\n\n" +
    "• 회원 김복두 01012345678\n" +
    "• 개인 운동\n" +
    "• 수업 예약\n" +
    "원하시는 기능을 다시 입력해 주세요!"
  ));
}
