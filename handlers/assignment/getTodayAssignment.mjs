// handlers/assignment/getTodayAssignment.js
import { supabase } from "../../services/supabase.js";
import { replyText } from "../../utils/reply.js";

export default async function getTodayAssignment(kakaoId, utterance, res) {
  // 1. 회원 인증
  const { data: member } = await supabase
    .from("members")
    .select("id, name")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) return res.json(replyText("회원 인증 정보가 없습니다."));

  const today = new Date().toISOString().slice(0, 10);

  // 2. member_id로 본인 assignment id 리스트 조회
  const { data: assignments } = await supabase
    .from("personal_assignments")
    .select("id, title, status")
    .eq("member_id", member.id);

  const assignmentIds = assignments?.map(a => a.id);
  if (!assignmentIds || assignmentIds.length === 0) {
    return res.json(replyText("아직 등록된 과제가 없습니다."));
  }

  // 3. 오늘 날짜에 해당하는 스케줄 중 assignment_id 매칭되는 것만 필터링
  const { data: schedules } = await supabase
    .from("assignment_schedules")
    .select("assignment_id, target_date")
    .eq("target_date", today)
    .in("assignment_id", assignmentIds);

  if (!schedules || schedules.length === 0) {
    return res.json(replyText("오늘 예정된 과제가 없습니다."));
  }

  // 4. title/status 병합 후 메시지 구성
  const assignmentMap = new Map();
  assignments.forEach(a => assignmentMap.set(a.id, a));

  const message = schedules.map(s => {
    const a = assignmentMap.get(s.assignment_id);
    return `• ${a?.title || "제목 없음"} (${a?.status || "-"})`;
  }).join("\n");

  return res.json(replyText(`📌 오늘의 과제 (${member.name}님):\n${message}`));
}
