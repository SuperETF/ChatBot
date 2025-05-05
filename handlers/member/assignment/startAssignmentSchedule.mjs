// 📁 handlers/member/assignment/startAssignmentSchedule.mjs
import { supabase } from "../../../services/supabase.mjs";
import { replyQuickReplies } from "../../../utils/reply.mjs";

export default async function startAssignmentSchedule(kakaoId, utterance, res) {
  const scheduleId = extractScheduleId(utterance); // 예: "과제시작_42" → 42
  if (!scheduleId) {
    return res.json(replyQuickReplies("❗ 어떤 과제를 시작할지 인식하지 못했어요.", ["오늘 과제"]));
  }

  const { data: existing } = await supabase
    .from("assignment_schedules")
    .select("id, is_completed, started_at")
    .eq("id", scheduleId)
    .maybeSingle();

  if (!existing) {
    return res.json(replyQuickReplies("❌ 존재하지 않는 과제입니다.", ["오늘 과제"]));
  }

  if (existing.is_completed) {
    return res.json(replyQuickReplies("✅ 이미 완료된 과제입니다.", ["오늘 과제 현황"]));
  }

  if (existing.started_at) {
    return res.json(replyQuickReplies("⏱ 이미 시작된 과제입니다. 완료 후 다시 눌러주세요.", [
      { label: "완료", messageText: `과제완료_${scheduleId}` }
    ]));
  }

  const { error } = await supabase
    .from("assignment_schedules")
    .update({ started_at: new Date().toISOString() })
    .eq("id", scheduleId);

  if (error) {
    return res.json(replyQuickReplies("❌ 과제 시작 처리 중 오류가 발생했습니다.", ["오늘 과제"]));
  }

  return res.json(replyQuickReplies("🏁 과제를 시작했습니다! 완료되면 아래 버튼을 눌러주세요.", [
    { label: "과제 완료", messageText: `과제완료_${scheduleId}` }
  ]));
}

function extractScheduleId(text) {
  const match = text.match(/과제시작_(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}
