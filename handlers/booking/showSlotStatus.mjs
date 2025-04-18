import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";
import { parseNaturalDateTime } from "../../utils/parseTime.mjs";

export default async function showSlotStatus(kakaoId, utterance, res) {
  const time = parseNaturalDateTime(utterance);
  if (!time) {
    return res.json(replyText("조회할 시간 정보를 이해하지 못했어요. 예: '오늘 3시 몇 명 있어?'"));
  }

  const reservationTime = time.toISOString();

  const { count } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("type", "personal")
    .eq("reservation_time", reservationTime)
    .eq("status", "reserved");

  const remain = 4 - count;
  const statusText = count === 0
    ? "아직 아무도 예약하지 않았어요."
    : `${count}명 예약됨 (남은 자리 ${remain}명)`;

  return res.json(replyText(`📌 ${time.format("M월 D일 HH시")} 예약 현황:\n${statusText}`));
}
