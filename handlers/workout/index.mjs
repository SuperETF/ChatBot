// handlers/workout/index.js
import startWorkout from "./startWorkout.mjs";
import completeWorkout from "./completeWorkout.mjs";
import reportWorkoutCondition from "./reportWorkoutCondition.mjs";
import { replyText } from "../../utils/reply.mjs";

export default async function workout(kakaoId, utterance, res, action) {
  switch (action) {
    case "startWorkout":
      return startWorkout(kakaoId, utterance, res);
    case "completeWorkout":
      return completeWorkout(kakaoId, utterance, res);
    case "reportWorkoutCondition":
      return reportWorkoutCondition(kakaoId, utterance, res);
    default:
      return res.json(replyText("운동 관련 기능을 찾지 못했습니다."));
  }
}