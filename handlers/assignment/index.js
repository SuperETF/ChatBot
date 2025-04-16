// handlers/assignment/index.js
import assignWorkout from "./assignWorkout.js";
import getTodayAssignment from "./getTodayAssignment.js";
import { replyText } from "../../utils/reply.js";

export default async function assignment(kakaoId, utterance, res, action) {
  switch (action) {
    case "assignWorkout":
      return assignWorkout(kakaoId, utterance, res);
    case "getTodayAssignment":
      return getTodayAssignment(kakaoId, utterance, res);
    default:
      return res.json(replyText("과제 관련 기능을 찾지 못했습니다."));
  }
}