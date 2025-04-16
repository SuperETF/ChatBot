// handlers/booking/showTrainerSlots.js
import { supabase } from "../../services/supabase.mjs";
import { replyButton, replyText } from "../../utils/reply.mjs";

export default async function showTrainerSlots(kakaoId, utterance, res) {
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!trainer) return res.json(replyText("트레이너 인증 정보가 없습니다."));

  const { data: slots } = await supabase
    .from("trainer_availability")
    .select("weekday, start_time, end_time, date")
    .eq("trainer_id", trainer.id);

  if (!slots || slots.length === 0) {
    return res.json(replyText("예약 가능한 레슨 시간이 없습니다."));
  }

  const slotButtons = slots.map(slot =>
    `${slot.date} (${slot.weekday}) ${slot.start_time.slice(0, 5)} ~ ${slot.end_time.slice(0, 5)}`
  );

  return res.json(replyButton("다음 중 가능한 레슨 시간을 선택해주세요:", slotButtons));
}