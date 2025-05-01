// ✅ handlers/member/assignment/getTodayAssignment.mjs
import { supabase } from "../../../services/supabase.mjs";
import { replyQuickReplies } from "../../../utils/reply.mjs";

function parseTargetDate(text) {
  const today = new Date();
  if (/내일/.test(text)) today.setDate(today.getDate() + 1);
  else if (/모레/.test(text)) today.setDate(today.getDate() + 2);
  else if (/어제/.test(text)) today.setDate(today.getDate() - 1);
  return today.toISOString().slice(0, 10);
}

export default async function getTodayAssignment(kakaoId, utterance, res) {
  const { data: member } = await supabase
    .from("members")
    .select("id, name")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replyQuickReplies("회원 인증 정보를 찾을 수 없습니다.", ["메인 메뉴"]));
  }

  const targetDate = parseTargetDate(utterance);

  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, content")
    .eq("member_id", member.id);

  if (!assignments || assignments.length === 0) {
    return res.json(replyQuickReplies("📭 등록된 과제가 없습니다.", ["메인 메뉴"]));
  }

  const assignmentMap = new Map(assignments.map(a => [a.id, a.content]));
  const assignmentIds = Array.from(assignmentMap.keys());

  const { data: schedules } = await supabase
    .from("assignment_schedules")
    .select("assignment_id, target_date, is_completed")
    .eq("target_date", targetDate)
    .in("assignment_id", assignmentIds);

  if (!schedules || schedules.length === 0) {
    return res.json(replyQuickReplies(`${targetDate} 예정된 과제가 없습니다.`, ["메인 메뉴"]));
  }

  const lines = schedules.map(s => {
    const content = assignmentMap.get(s.assignment_id) || "제목 없음";
    const icon = s.is_completed ? "✅" : "❌";
    return `• ${content} (${icon})`;
  }).join("\n");

  const buttons = schedules
    .filter(s => !s.is_completed)
    .map(s => {
      const content = assignmentMap.get(s.assignment_id);
      return {
        label: content,
        action: "message",
        messageText: content
      };
    });

  return res.json(replyQuickReplies(`📌 ${member.name}님의 오늘 과제:\n\n${lines}`, [
    ...buttons,
    "메인 메뉴"
  ]));
}