// handlers/booking/index.js
import reservePersonal from "./reservePersonal.js";
import cancelPersonal from "./cancelPersonal.js";
import showPersonalSlots from "./showPersonalSlots.js";
import registerAvailability from "./registerAvailability.js";
import showTrainerSlots from "./showTrainerSlots.js";
import confirmReservation from "./confirmReservation.js";
import { replyText } from "../../utils/reply.js";

export default async function booking(kakaoId, utterance, res, action) {
  switch (action) {
    case "reservePersonal":
      return reservePersonal(kakaoId, utterance, res);
    case "cancelPersonal":
      return cancelPersonal(kakaoId, utterance, res);
    case "showPersonalSlots":
      return showPersonalSlots(kakaoId, utterance, res);
    case "registerAvailability":
      return registerAvailability(kakaoId, utterance, res);
    case "showTrainerSlots":
      return showTrainerSlots(kakaoId, utterance, res);
    case "confirmReservation":
      return confirmReservation(kakaoId, utterance, res);
    default:
      return res.json(replyText("예약 기능을 찾지 못했습니다."));
  }
}