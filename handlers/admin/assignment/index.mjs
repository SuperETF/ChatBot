import generateRoutinePreview from "./generateRoutinePreview.mjs";
import handleAssignmentFlow from "./handleAssignmentFlow.mjs";
import { replyText } from "../../../utils/reply.mjs";

export default async function assignment(kakaoId, utterance, res, action) {
  console.log("📂 assignment handler →", action);

  switch (action) {
    case "generateRoutinePreview":
      return generateRoutinePreview(kakaoId, utterance, res);

    case "handleAssignmentFlow":
      return handleAssignmentFlow(kakaoId, utterance, res);

    default:
      return res.json(replyText("❓ 인식할 수 없는 과제 처리 요청입니다."));
  }
}
