import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";

export default async function getUpcomingAssignments(kakaoId, res) {
  // ✅ 1. 회원 인증
  const { data: member } = await supabase
    .from("members")
    .select("id, name")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replyText("회원 인증 정보를 찾을 수 없습니다. 등록된 회원인지 확인해주세요."));
  }

  const today = new Date().toISOString().slice(0, 10);

  // ✅ 2. 해당 회원의 모든 과제 ID 확인
  const { data: assignments } = await supabase
    .from("personal_assignments")
    .select("id, title")
    .eq("member_id", member.id);

  if (!assignments || assignments.length === 0) {
    return res.json(replyText("📭 아직 등록된 과제가 없습니다."));
  }

  const assignmentMap = new Map(assignments.map(a => [a.id, a.title]));
  const assignmentIds = Array.from(assignmentMap.keys());

  // ✅ 3. 그 중에서 오늘 이후의 스케줄만 조회
  const { data: schedules } = await supabase
    .from("assignment_schedules")
    .select("assignment_id, target_date, target_time")
    .in("assignment_id", assignmentIds)
    .gte("target_date", today)
    .order("target_date", { ascending: true })
    .order("target_time", { ascending: true });

  if (!schedules || schedules.length === 0) {
    return res.json(replyText("📭 예정된 과제가 없습니다."));
  }

  // ✅ 4. 출력
  const message = schedules.map(s => {
    const title = assignmentMap.get(s.assignment_id) || "제목 없음";
    const time = s.target_time ? ` ${s.target_time}` : "";
    return `• ${s.target_date}${time} - ${title}`;
  }).join("\n");

  return res.json(replyText(`📌 ${member.name}님의 예정된 과제:\n\n${message}`));
}
