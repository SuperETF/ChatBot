// ✅ handlers/member/assignment/completeTodayAssignments.mjs
import { supabase } from "../../../services/supabase.mjs";
import { replyText } from "../../../utils/reply.mjs";
import dayjs from "dayjs";

export default async function completeTodayAssignments(kakaoId, utterance, res) {
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replyText("회원 인증 정보가 없습니다. 먼저 등록해주세요."));
  }

  const today = dayjs().format("YYYY-MM-DD");

  const { data: assignments } = await supabase
    .from("assignments")
    .select("id")
    .eq("member_id", member.id);

  if (!assignments || assignments.length === 0) {
    return res.json(replyText("오늘 완료할 과제가 없습니다."));
  }

  const assignmentIds = assignments.map(a => a.id);

  const { error } = await supabase
    .from("assignment_schedules")
    .update({ is_completed: true, completed_at: new Date() })
    .in("assignment_id", assignmentIds)
    .eq("target_date", today);

  if (error) {
    console.error("❌ 과제 완료 처리 실패:", error.message);
    return res.json(replyText("❗ 과제 완료 처리 중 오류가 발생했습니다."));
  }

  return res.json(replyText("✅ 오늘 과제를 모두 완료 처리했습니다! 수고하셨어요 👏"));
}