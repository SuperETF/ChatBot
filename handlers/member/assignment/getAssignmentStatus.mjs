// 📁 handlers/member/assignment/getAssignmentStatus.mjs
import dayjs from "dayjs";
import { supabase } from "../../../services/supabase.mjs";
import { replyText } from "../../../utils/reply.mjs";

export default async function getAssignmentStatus(kakaoId, utterance, res) {
  const today = dayjs().format("YYYY-MM-DD");

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replyText("❗ 회원 인증이 필요합니다. 먼저 등록을 완료해 주세요."));
  }

  // 전체 과제 일정 조회
  const { data: schedules } = await supabase
    .from("assignment_schedules")
    .select("id, assignment_id, target_date, is_completed")
    .in(
      "assignment_id",
      supabase.from("assignments")
        .select("id")
        .eq("member_id", member.id)
    );

  if (!schedules || schedules.length === 0) {
    return res.json(replyText("📋 등록된 과제 일정이 없습니다."));
  }

  const completed = schedules.filter(s => s.is_completed);
  const upcoming = schedules.filter(s => !s.is_completed && s.target_date > today);

  const allAssignmentIds = [...new Set(schedules.map(s => s.assignment_id))];
  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, content")
    .in("id", allAssignmentIds);

  const getContent = (id) => assignments.find(a => a.id === id)?.content || "(내용 없음)";

  const formatList = (list) =>
    list.map((s, i) => `${i + 1}. ${getContent(s.assignment_id)} (${s.target_date})`).join("\n");

  const result = `📊 과제 현황\n\n✅ 완료된 과제 (${completed.length}건)\n` +
    (completed.length > 0 ? formatList(completed) : "- 없음") +
    "\n\n📌 예정 과제 (" + upcoming.length + "건)\n" +
    (upcoming.length > 0 ? formatList(upcoming) : "- 없음");

  return res.json(replyText(result));
}
