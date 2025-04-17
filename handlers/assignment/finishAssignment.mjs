import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";
import { findTodayAssignment } from "../../utils/assignmentHelper.mjs";

export default async function finishAssignment(kakaoId, res) {
  const assignment = await findTodayAssignment(kakaoId);

  if (!assignment) {
    return res.json(replyText("진행 중인 과제가 없습니다."));
  }

  // 📌 과제 진행 상태 조회
  const { data: progress } = await supabase
    .from("assignment_progress")
    .select("started_at, finished_at, status")
    .eq("assignment_id", assignment.id)
    .eq("member_id", assignment.member_id)
    .maybeSingle();

  if (!progress) {
    return res.json(replyText("해당 과제가 시작되지 않았습니다. 먼저 '시작하기' 버튼을 눌러주세요."));
  }

  if (progress.status === "완료") {
    return res.json(replyText("이미 완료된 과제입니다. 아주 잘하셨어요 💪"));
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
    return res.json(replyText("과제 종료 중 문제가 발생했습니다."));
  }

  // ⏱️ 소요 시간 계산
  const startedAt = new Date(progress.started_at);
  const durationMs = now - startedAt;
  const minutes = Math.floor(durationMs / 1000 / 60);
  const seconds = Math.floor((durationMs / 1000) % 60);

  return res.json(replyText(
    `✅ 과제 [${assignment.title}] 완료!\n` +
    `⏱️ 총 소요 시간: ${minutes}분 ${seconds}초\n` +
    `고생하셨어요! 다음에도 화이팅 💪`
  ));
}
