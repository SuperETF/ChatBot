// ✅ handlers/reservePersonalWorkout.js

import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";

export default async function reservePersonalWorkout(kakaoId, utterance, res) {
  const hourMatch = utterance.match(/(\d{1,2})시/);
  if (!hourMatch) {
    return res.json(replyText("예약할 시간을 인식하지 못했어요. 예: 18시 예약"));
  }

  const hour = `${hourMatch[1]}시`;
  const today = new Date();
  const date = today.toISOString().slice(0, 10);

  // 회원 식별
  const { data: member } = await supabase
    .from("members")
    .select("id, name")
    .eq("kakao_id", kakaoId)
    .single();

  if (!member) {
    return res.json(replyText("회원 정보를 찾을 수 없습니다."));
  }

  // 예약 현황 확인
  const { count } = await supabase
    .from("personal_workout_reservations")
    .select("*", { count: "exact", head: true })
    .eq("date", date)
    .eq("hour", hour);

  // 예약 저장
  const { error } = await supabase
    .from("personal_workout_reservations")
    .insert({
      member_id: member.id,
      date,
      hour
    });

  if (error) {
    console.error("❌ 예약 저장 실패:", error);
    return res.json(replyText("예약 중 문제가 발생했습니다."));
  }

  return res.json(replyText(
    `✅ ${member.name}님, 오늘 ${hour}에 개인 운동 예약이 완료되었습니다.\n현재까지 예약: ${count + 1}명`
  ));
}