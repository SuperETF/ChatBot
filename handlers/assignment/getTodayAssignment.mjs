import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";

function parseTargetDate(text) {
  const today = new Date();
  if (/내일/.test(text)) {
    today.setDate(today.getDate() + 1);
  } else if (/모레/.test(text)) {
    today.setDate(today.getDate() + 2);
  } else if (/어제/.test(text)) {
    today.setDate(today.getDate() - 1);
  }
  return today.toISOString().slice(0, 10);
}

export default async function getTodayAssignment(kakaoId, utterance, res) {
  const { data: member } = await supabase
    .from("members")
    .select("id, name")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) return res.json(replyText("회원 인증 정보가 없습니다."));

  const targetDate = parseTargetDate(utterance); // ✅ 유연한 날짜 인식

  const { data: assignmentIds } = await supabase
    .from("personal_assignments")
    .select("id, title, status")
    .eq("member_id", member.id);

  if (!assignmentIds || assignmentIds.length === 0) {
    return res.json(replyText("아직 등록된 과제가 없습니다."));
  }

  const { data: schedules } = await supabase
    .from("assignment_schedules")
    .select("assignment_id, target_date")
    .eq("target_date", targetDate)
    .in("assignment_id", assignmentIds.map(a => a.id));

  if (!schedules || schedules.length === 0) {
    return res.json(replyText(`${targetDate} 예정된 과제가 없습니다.`));
  }

  const assignmentMap = new Map();
  assignmentIds.forEach(a => assignmentMap.set(a.id, a));

  const message = schedules.map(s => {
    const a = assignmentMap.get(s.assignment_id);
    return `• ${a?.title || "제목 없음"} (${a?.status || "-"})`;
  }).join("\n");

  return res.json(replyText(`📌 ${targetDate}의 과제 (${member.name}님):\n${message}`));
}
