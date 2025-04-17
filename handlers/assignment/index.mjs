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
      return res.json(replyText("과제 관련 기능을 찾지 못했습니다."));
  }
}
