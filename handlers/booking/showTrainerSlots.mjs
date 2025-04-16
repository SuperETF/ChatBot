// handlers/booking/showTrainerSlots.mjs
import { supabase } from "../../services/supabase.mjs";
import { replyButton, replyText } from "../../utils/reply.mjs";

function getKoreanWeekday(dateStr) {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const day = new Date(dateStr).getDay();
  return days[day];
}

export default async function showTrainerSlots(kakaoId, utterance, res) {
  const { data: trainers } = await supabase.from("trainers").select("id, name");
  const trainer = trainers?.[0];

  if (!trainer) return res.json(replyText("등록된 트레이너가 없습니다."));

  const today = new Date().toISOString().slice(0, 10);
  const { data: slots } = await supabase
    .from("trainer_availability")
    .select("date, start_time, end_time")
    .eq("trainer_id", trainer.id)
    .eq("type", "특정")
    .gte("date", today);

  if (!slots || slots.length === 0) {
    return res.json(replyText("예약 가능한 레슨 시간이 없습니다."));
  }

  const buttons = slots.map(slot => {
    const weekday = getKoreanWeekday(slot.date);
    const label = `${weekday} (${slot.date}) ${slot.start_time.slice(0, 5)} ~ ${slot.end_time.slice(0, 5)}`;
    return {
      label,
      value: label
    };
  });

  return res.json(replyButton("다음 중 가능한 레슨 시간을 선택해주세요:", buttons));
}