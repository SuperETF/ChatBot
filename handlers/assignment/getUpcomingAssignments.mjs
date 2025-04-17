import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";

export default async function getUpcomingAssignments(kakaoId, res) {
  const { data: member } = await supabase
    .from("members")
    .select("id, name")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) return res.json(replyText("회원 인증 정보를 찾을 수 없습니다."));

  const today = new Date().toISOString().slice(0, 10);

  const { data: schedules } = await supabase
    .from("assignment_schedules")
    .select("target_date, target_time, assignment_id")
    .gte("target_date", today)
    .order("target_date", { ascending: true })
    .order("target_time", { ascending: true });

  if (!schedules || schedules.length === 0) {
    return res.json(replyText("📭 예정된 과제가 없습니다."));
  }

  const assignmentIds = schedules.map(s => s.assignment_id);
  const { data: assignments } = await supabase
    .from("personal_assignments")
    .select("id, title")
    .in("id", assignmentIds);

  const map = new Map(assignments.map(a => [a.id, a.title]));

  const message = schedules.map(s => {
    const title = map.get(s.assignment_id) || "과제 없음";
    const time = s.target_time ? ` ${s.target_time}` : "";
    return `• ${s.target_date}${time} - ${title}`;
  }).join("\n");

  return res.json(replyText(`📌 ${member.name}님의 예정된 과제:\n\n${message}`));
}
