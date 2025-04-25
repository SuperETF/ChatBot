import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";

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
    return res.json(replyText("회원 인증 정보를 찾을 수 없습니다. 전문가에게 문의해주세요."));
  }

  const targetDate = parseTargetDate(utterance);

  // 1. 전체 과제 목록
  const { data: assignments } = await supabase
    .from("personal_assignments")
    .select("id, title, status")
    .eq("member_id", member.id);

  if (!assignments || assignments.length === 0) {
    return res.json(replyText("아직 등록된 과제가 없습니다."));
  }

  // 2. 오늘 날짜에 포함된 과제 조회
  const { data: schedules } = await supabase
    .from("assignment_schedules")
    .select("assignment_id, target_date")
    .eq("target_date", targetDate)
    .in("assignment_id", assignments.map(a => a.id));

  if (!schedules || schedules.length === 0) {
    return res.json(replyText(`${targetDate} 예정된 과제가 없습니다.`));
  }

  const assignmentMap = new Map(assignments.map(a => [a.id, a]));

  const message = schedules.map(s => {
    const a = assignmentMap.get(s.assignment_id);
    return `• ${a?.title || "제목 없음"} (${a?.status || "-"})`;
  }).join("\n");

  // 3. 버튼 포함 여부 결정
  const active = schedules.find(s => {
    const a = assignmentMap.get(s.assignment_id);
    return a?.status === "대기" || a?.status === "진행중";
  });

  const quickReplies = active
    ? [{
        label: active && assignmentMap.get(active.assignment_id)?.status === "대기" ? "시작하기" : "종료하기",
        action: "message",
        messageText: active && assignmentMap.get(active.assignment_id)?.status === "대기" ? "과제 시작" : "과제 종료"
      }]
    : [];

  return res.json({
    text: `📌 ${member.name}님의 ${targetDate} 과제:\n\n${message}`,
    ...(quickReplies.length > 0 && { quickReplies })
  });
}
