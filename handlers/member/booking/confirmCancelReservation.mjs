import { supabase } from "../../../services/supabase.mjs";
import { replyText } from "../../../utils/reply.mjs";
import { cancelContext } from "./showCancelableReservations.mjs";

/**
 * 버튼 클릭 → 해당 예약 취소
 */
export default async function confirmCancelReservation(kakaoId, utterance, res) {
  const ctx = cancelContext[kakaoId];
  if (!ctx || ctx.flow !== "cancel-waiting") {
    return res.json(replyText("취소할 예약을 먼저 선택해주세요. '예약 취소'를 입력하세요."));
  }

  const id = cancelContext[kakaoId]?.options?.[utterance];
if (!id) {
  return res.json(replyText("❗ 선택한 시간의 예약을 찾을 수 없습니다. 다시 시도해주세요."));
}

  const { error } = await supabase
    .from("reservations")
    .update({ status: "canceled" })
    .eq("id", id);

  delete cancelContext[kakaoId];

  if (error) {
    return res.json(replyText("예약 취소 중 오류가 발생했습니다."));
  }

  return res.json(replyText(`✅ ${utterance} 예약이 취소되었습니다.`));
}
