import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";
import { findTodayAssignment } from "../../utils/assignmentHelper.mjs";

export default async function finishAssignment(kakaoId, res) {
  const assignment = await findTodayAssignment(kakaoId);

  if (!assignment) {
    return res.json(replyText("진행 중인 과제가 없습니다. 먼저 과제를 시작해주세요."));
  }

  const { data: progress } = await supabase
    .from("assignment_progress")
    .select("started_at, finished_at, status")
    .eq("assignment_id", assignment.id)
    .eq("member_id", assignment.member_id)
    .maybeSingle();

  if (!progress) {
    return res.json(replyText("과제가 시작되지 않았습니다. 먼저 '시작하기'를 눌러주세요."));
  }

  if (progress.status === "완료") {
    return res.json(replyText("이미 완료된 과제입니다. 수고하셨습니다 💪"));
  }

  const now = new Date();

  const { error } = await supabase
    .from("assignment_progress")
    .update({
      finished_at: now,
      status: "완료"
    })
    .eq("assignment_id", assignment.id)
    .eq("member_id", assignment.member_id);

  if (error) {
    console.error("❌ 과제 종료 실패:", error);
    return res.json(replyText("과제 종료 중 문제가 발생했습니다. 다시 시도해주세요."));
  }

  const startedAt = new Date(progress.started_at);
  const durationMs = now - startedAt;
  const minutes = Math.floor(durationMs / 1000 / 60);
  const seconds = Math.floor((durationMs / 1000) % 60);

  return res.json(replyText(
    `✅ 과제 [${assignment.title}] 완료되었습니다!\n⏱️ 소요 시간: ${minutes}분 ${seconds}초\n고생 많으셨습니다 💪`
  ));
}
