// ✅ handlers/startWorkout.js (2단계: 회원이 과제 시작)
import { supabase } from "../services/supabase.js";
import { replyText, replyButton } from "../utils/reply.js";

export async function startWorkout(kakaoId, res) {
  // 1. 회원 확인
  const { data: member } = await supabase
    .from("members")
    .select("id, name")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replyText("회원 정보를 찾을 수 없습니다. 등록을 먼저 진행해주세요."));
  }

  // 2. 가장 최근 대기 중인 과제 찾기
  const { data: assignment } = await supabase
    .from("personal_assignments")
    .select("id, title")
    .eq("member_id", member.id)
    .eq("status", "대기")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!assignment) {
    return res.json(replyText("진행할 과제가 없습니다."));
  }

  // 3. 과제 상태 변경 + 시작 시간 기록
  const { error } = await supabase
    .from("personal_assignments")
    .update({ status: "진행 중", start_time: new Date().toISOString() })
    .eq("id", assignment.id);

  if (error) {
    console.error("운동 시작 업데이트 실패:", error);
    return res.json(replyText("운동 시작 중 오류가 발생했습니다."));
  }

  return res.json(replyButton(
    `📢 과제 시작: ${assignment.title}\n운동이 시작되었습니다. 완료 후 아래 버튼을 눌러주세요.`,
    ["운동 완료"]
  ));
}