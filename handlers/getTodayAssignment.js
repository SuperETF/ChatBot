// ✅ handlers/getTodayAssignment.js
import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";

export async function getTodayAssignment(kakaoId, res) {
  // 1. 회원 조회
  const { data: member } = await supabase
    .from("members")
    .select("id, name")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replyText("회원 정보를 찾을 수 없습니다. 먼저 등록을 완료해주세요."));
  }

  // 2. 오늘 날짜 구하기
  const today = new Date().toISOString().slice(0, 10);

  // 3. 오늘 일정 연결된 assignment_id들 조회
  const { data: schedules } = await supabase
    .from("assignment_schedules")
    .select("assignment_id")
    .eq("target_date", today);

  const ids = schedules?.map(s => s.assignment_id);
  if (!ids || ids.length === 0) {
    return res.json(replyText("오늘 해야 할 운동 과제가 없습니다."));
  }

  // 4. 해당 과제 정보 가져오기 (상태: 대기 or 진행 중)
  const { data: assignments } = await supabase
    .from("personal_assignments")
    .select("title, status")
    .in("id", ids)
    .eq("member_id", member.id)
    .in("status", ["대기", "진행 중"]);

  if (!assignments || assignments.length === 0) {
    return res.json(replyText("오늘 해야 할 운동 과제가 없습니다."));
  }

  const list = assignments.map((a, i) => `${i + 1}. ${a.title} (${a.status})`).join("\n");
  return res.json(replyText(`📋 ${member.name}님 오늘의 과제:
${list}`));
}