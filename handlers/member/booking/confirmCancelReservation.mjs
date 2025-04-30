import { supabase } from "../../../services/supabase.mjs";
import { replyText } from "../../../utils/reply.mjs";
import { cancelContext } from "./showCancelableReservations.mjs";

export default async function confirmCancelReservation(kakaoId, utterance, res) {
  const ctx = cancelContext[kakaoId];
  if (!ctx || ctx.flow !== "cancel-waiting") {
    return res.json(replyText("먼저 '예약 취소'를 입력해 일정을 선택해주세요."));
  }

  const reservationId = utterance.trim();
  const label = ctx.options[reservationId];

  if (!label) {
    return res.json(replyText("❗ 선택한 예약을 찾을 수 없습니다."));
  }

  const { error } = await supabase
    .from("reservations")
    .update({ status: "canceled" })
    .eq("id", reservationId);

  delete cancelContext[kakaoId];

  if (error) {
    return res.json(replyText("❌ 예약 취소 중 문제가 발생했습니다."));
  }

  return res.json(replyText(`✅ ${label} 예약이 취소되었습니다.`));
}
