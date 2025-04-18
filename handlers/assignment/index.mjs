// handlers/assignment/index.mjs
import assignWorkout from "./assignWorkout.mjs";
import getTodayAssignment from "./getTodayAssignment.mjs";
import startAssignment from "./startAssignment.mjs";
import finishAssignment from "./finishAssignment.mjs";
import getUpcomingAssignments from "./getUpcomingAssignments.mjs";
import { replyText } from "../../utils/reply.mjs";

export default async function assignment(kakaoId, utterance, res, action) {
  switch (action) {
    case "assignWorkout":
      return assignWorkout(kakaoId, utterance, res);
    case "getTodayAssignment":
      return getTodayAssignment(kakaoId, utterance, res);
    case "startAssignment":
      return startAssignment(kakaoId, res);
    case "finishAssignment":
      return finishAssignment(kakaoId, res);
    case "getUpcomingAssignments":
      return getUpcomingAssignments(kakaoId, res);
    default:
      return res.json(replyText("❓ 인식할 수 없는 과제 관련 요청입니다. 다시 시도해주세요."));
  }
}