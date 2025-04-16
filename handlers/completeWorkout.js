// ✅ handlers/completeWorkout.js (3단계: 과제 완료 처리)
import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";

export async function completeWorkout(kakaoId, res) {
  // 1. 회원 확인
  const { data: member } = await supabase
    .from("members")
    .select("id, name")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replyText("회원 정보를 찾을 수 없습니다."));
  }

  // 2. 진행 중인 과제 조회
  const { data: assignment } = await supabase
    .from("personal_assignments")
    .select("id, title, start_time, trainer_id")
    .eq("member_id", member.id)
    .eq("status", "진행 중")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!assignment) {
    return res.json(replyText("진행 중인 운동이 없습니다."));
  }

  const endTime = new Date();
  const startTime = new Date(assignment.start_time);
  const durationMin = Math.floor((endTime - startTime) / 60000);

  // 3. 상태 완료로 업데이트 + end_time 저장
  await supabase
    .from("personal_assignments")
    .update({ status: "완료", end_time: endTime.toISOString() })
    .eq("id", assignment.id);

  // 4. 트레이너 정보 가져오기
  const { data: trainer } = await supabase
    .from("trainers")
    .select("name, kakao_id")
    .eq("id", assignment.trainer_id)
    .maybeSingle();

  if (trainer?.kakao_id) {
    console.log(`📢 ${trainer.kakao_id}에게 알림: ${member.name}님이 개인 운동 완료! (${assignment.title}) ⏱ ${durationMin}분 소요`);
    // 향후 실제 알림 시스템 연동 가능
  }

  return res.json(replyText(
    `✅ 운동 완료가 기록되었습니다! ⏱ 소요 시간: ${durationMin}분\n운동 중 특이사항이 있었나요?`
  ));
}