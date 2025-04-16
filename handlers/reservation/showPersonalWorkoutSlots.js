import { supabase } from "../services/supabase.js";
import { replyButton } from "../utils/reply.js";

export default async function showPersonalWorkoutSlots(kakaoId, res) {
  // 1. 회원 정보 확인
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replyButton("회원 정보를 찾을 수 없습니다. 등록하시겠어요?", ["회원 등록"]));
  }

  // 2. 오늘 날짜 기준
  const today = new Date();
  const date = today.toISOString().slice(0, 10);
  const hours = ["18시", "19시", "20시", "21시"];

  // 3. 각 시간대 예약 인원 확인
  const buttons = [];
  for (const hour of hours) {
    const { count } = await supabase
      .from("personal_workout_reservations")
      .select("*", { count: "exact", head: true })
      .eq("date", date)
      .eq("hour", hour);

    buttons.push(`${hour} (예약: ${count}명)`);
  }

  return res.json(replyButton("오늘 예약 가능한 시간대입니다:", buttons));
}
