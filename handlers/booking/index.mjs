// ✅ handlers/booking/index.mjs
import showTrainerSlots from "./showTrainerSlots.mjs";
import reservePersonal from "./reservePersonal.mjs";
import cancelPersonal from "./cancelPersonal.mjs";
import confirmReservation from "./confirmReservation.mjs";
import showMyReservations from "./showMyReservations.mjs";
import showPersonalSlots from "./showPersonalSlots.mjs";
import registerAvailability from "./registerAvailability.mjs";
import { replyText } from "../../utils/reply.mjs";

export default async function booking(kakaoId, utterance, res, action) {
  switch (action) {
    case "showTrainerSlots":
      return showTrainerSlots(kakaoId, utterance, res);
    case "reservePersonal":
      return reservePersonal(kakaoId, utterance, res);
    case "cancelPersonal":
      return cancelPersonal(kakaoId, utterance, res);
    case "confirmReservation":
      return confirmReservation(kakaoId, utterance, res);
    case "showMyReservations":
      return showMyReservations(kakaoId, utterance, res);
    case "showPersonalSlots":
      return showPersonalSlots(kakaoId, utterance, res);
    case "registerAvailability":
      return registerAvailability(kakaoId, utterance, res);
    default:
      return res.json(replyText("예약 관련 기능을 찾지 못했습니다."));
  }
}
