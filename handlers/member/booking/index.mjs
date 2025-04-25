// ✅ handlers/booking/index.mjs
import { reservePersonal, handleMultiTurnReserve, confirmReservation } from "./reservePersonal.mjs";
import cancelPersonal from "./cancelPersonal.mjs";
import confirmPendingTime from "./confirmPendingTime.mjs";
import showMyReservations from "./showMyReservations.mjs";
import { replyText } from "../../../utils/reply.mjs";

export default async function booking(kakaoId, utterance, res, action) {
  switch (action) {
    case "reservePersonal":
      return reservePersonal(kakaoId, utterance, res);

    case "handleReserveMulti":
      return handleMultiTurnReserve(kakaoId, utterance, res);

    case "confirmReservation":
      // ex) confirmReservation 호출할 수도 있음
      // confirmReservation(...) 
      return res.json(replyText("직접 confirmReservation을 부르는 액션은 현재 없음."));
    
    case "cancelPersonal":
      return cancelPersonal(kakaoId, utterance, res);

    case "confirmPendingTime":
      return confirmPendingTime(kakaoId, utterance, res);

    case "showMyReservations":
      return showMyReservations(kakaoId, utterance, res);

    default:
      return res.json(replyText(`예약 관련 기능(${action})을 찾지 못했습니다.`));
  }
}
