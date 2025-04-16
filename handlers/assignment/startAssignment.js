import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";
import { findTodayAssignment } from "../../utils/assignmentHelper.mjs"; // 📌 모듈화된 유틸

export default async function startAssignment(kakaoId, res) {
  const assignment = await findTodayAssignment(kakaoId);

  if (!assignment) {
    return res.json(replyText("오늘 할당된 과제가 없습니다."));
  }

  // ⏱️ 과제 시작 상태 등록
  const { error } = await supabase
    .from("assignment_progress")
    .upsert({
      assignment_id: assignment.id,
      member_id: assignment.member_id,
      started_at: new Date(),
      status: "진행중",
    });

  if (error) {
    console.error("❌ 과제 시작 실패:", error);
    return res.json(replyText("과제 시작 중 문제가 발생했습니다."));
  }

  return res.json({
    text: `⏱️ 과제 [${assignment.title}] 시작되었습니다.\n완료 후 [종료하기]를 눌러주세요.`,
    quickReplies: [
      {
        label: "종료하기",
        action: "message",
        messageText: "과제 종료"
      }
    ]
  });
}
