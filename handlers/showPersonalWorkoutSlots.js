// ✅ handlers/showPersonalWorkoutSlots.js

import { supabase } from "../services/supabase.js";
import { replyButton } from "../utils/reply.js";

export default async function showPersonalWorkoutSlots(kakaoId, utterance, res) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10); // 'YYYY-MM-DD'

  const hours = Array.from({ length: 17 }, (_, i) => `${6 + i}시`); // 06시 ~ 22시

  // 시간별 예약 인원 수 확인
  const reservations = await supabase
    .from("personal_workout_reservations")
    .select("hour, count:hour", { count: "exact" })
    .eq("date", todayStr)
    .group("hour");

  const countMap = (reservations.data || []).reduce((acc, cur) => {
    acc[cur.hour] = cur.count;
    return acc;
  }, {});

  const buttons = hours.map(hour => {
    const count = countMap[hour] || 0;
    return `${hour} (${count}명)`;
  }).slice(0, 10); // 최대 10개까지 출력

  return res.json(replyButton(
    `오늘 개인 운동 가능한 시간대입니다.\n\n원하시는 시간대를 선택해주세요.`,
    buttons
  ));
}
