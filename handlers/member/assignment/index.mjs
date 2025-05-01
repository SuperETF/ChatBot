// ✅ handlers/member/assignment/index.mjs
import getTodayAssignment from "./getTodayAssignment.mjs";
import getUpcomingAssignments from "./getUpcomingAssignments.mjs";
import completeTodayAssignments from "./completeTodayAssignments.mjs";
import { assignmentSession } from "../../../utils/sessionContext.mjs";
import { replyText } from "../../../utils/reply.mjs";

export default async function assignment(kakaoId, utterance, res, action) {
  switch (action) {
    case "getTodayAssignment":
      return getTodayAssignment(kakaoId, utterance, res);

    case "getUpcomingAssignments":
      return getUpcomingAssignments(kakaoId, res);

    case "completeTodayAssignments":
      return completeTodayAssignments(kakaoId, utterance, res);

    default:
      return res.json(replyText("❓ 인식할 수 없는 과제 요청입니다. 다시 시도해주세요."));
  }
}