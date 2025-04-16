// handlers/booking/showPersonalSlots.js
import { supabase } from "../../services/supabase.mjs";
import { replyButton } from "../../utils/reply.mjs";

export default async function showPersonalSlots(kakaoId, utterance, res) {
  const today = new Date();
  const date = today.toISOString().slice(0, 10);
  const hours = ["18시", "19시", "20시", "21시"];

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
