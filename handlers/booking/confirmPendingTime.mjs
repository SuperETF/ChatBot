// ✅ handlers/booking/confirmPendingTime.mjs
import dayjs from "dayjs";
import { replyText, replyQuickReplies } from "../../utils/reply.mjs";
import { sessionContext } from "./reservePersonal.mjs";
import { confirmReservation } from "./reservePersonal.mjs";

/**
 * 오전/오후 확정 로직
 */
export default async function confirmPendingTime(kakaoId, utterance, res) {
  const session = sessionContext[kakaoId];

  if (!session || session.type !== "pending-am-or-pm") {
    return res.json(
      replyText("⛔ 확정할 시간이 없습니다. 먼저 예약할 시간을 입력해주세요.")
    );
  }

  const isAm = utterance.includes("오전");
  const isPm = utterance.includes("오후");

  if (!isAm && !isPm) {
    return res.json(
      replyQuickReplies("오전 또는 오후라고 입력해주세요.", ["오전", "오후"])
    );
  }

  let time = dayjs(session.base_time);
  if (isPm && time.hour() < 12) time = time.add(12, "hour");
  if (isAm && time.hour() >= 12) time = time.subtract(12, "hour");

  delete sessionContext[kakaoId];
  return confirmReservation(session.member_id, time, res);
}
