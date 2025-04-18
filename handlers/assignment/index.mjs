import assignWorkout from "./assignWorkout.mjs";
import getTodayAssignment from "./getTodayAssignment.mjs";
import startAssignment from "./startAssignment.mjs";
import finishAssignment from "./finishAssignment.mjs";
import getUpcomingAssignments from "./getUpcomingAssignments.mjs";
import { replyText } from "../../utils/reply.mjs";

const actions = {
  assignWorkout,
  getTodayAssignment,
  startAssignment,
  finishAssignment,
  getUpcomingAssignments
};

export default async function assignment(kakaoId, utterance, res, action) {
  const handler = actions[action];

  if (!handler) {
    return res.json(replyText("❓ 인식할 수 없는 과제 관련 요청입니다. 다시 시도해주세요."));
  }

  // ✅ 과제 부여만 utterance 필요
  if (action === "assignWorkout") {
    return handler(kakaoId, utterance, res);
  }

  // ✅ 나머지는 utterance 필요 여부에 따라 유연하게 대응 가능
  return handler(kakaoId, res);
}
