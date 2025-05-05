// 📁 handlers/member/assignment/completeAssignmentSchedule.mjs
import { supabase } from "../../../services/supabase.mjs";
import { replyQuickReplies } from "../../../utils/reply.mjs";

export default async function completeAssignmentSchedule(kakaoId, utterance, res) {
  const scheduleId = extractScheduleId(utterance); // 예: "과제완료_42"
  if (!scheduleId) {
    return res.json(replyQuickReplies("❗ 과제를 인식하지 못했습니다.", ["오늘 과제"]));
  }

  const { error } = await supabase
    .from("assignment_schedules")
    .update({ is_completed: true, completed_at: new Date().toISOString() })
    .eq("id", scheduleId);

  if (error) {
    return res.json(replyQuickReplies("❌ 과제 완료 처리 중 오류가 발생했습니다.", ["오늘 과제"]));
  }

  return res.json(replyQuickReplies("🎉 과제를 완료했습니다! 수고하셨어요.", ["오늘 과제", "과제 현황"]));
}

function extractScheduleId(text) {
  const match = text.match(/과제완료_(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}