import { reservePersonal, handleMultiTurnFlow, sessionContext } from "./reservePersonal.mjs";
import showCancelableReservations, { cancelContext } from "./showCancelableReservations.mjs";
import confirmCancelReservation from "./confirmCancelReservation.mjs";
import showMyReservations from "./showMyReservations.mjs";
import { replyText } from "../../../utils/reply.mjs";

export default async function booking(kakaoId, utterance, res, action) {
  switch (action) {
    case "startPersonalReservation":
      return reservePersonal(kakaoId, utterance, res);
    case "handleReservationFlow":
      return handleMultiTurnFlow(kakaoId, utterance, res);
    case "startCancelReservation":
      return showCancelableReservations(kakaoId, utterance, res);
    case "handleCancelFlow":
      return confirmCancelReservation(kakaoId, utterance, res);
    case "showMyReservations":
      return showMyReservations(kakaoId, utterance, res);
    default:
      return res.json(replyText("❓ 알 수 없는 예약 요청입니다."));
  }
}

export { sessionContext, cancelContext };
