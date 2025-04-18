import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";

/**
 * 특정 회원에게 루틴을 과제로 등록
 * @param {string} trainerId 트레이너 ID
 * @param {string} memberId 회원 ID
 * @param {string[]} routineList ["푸시업 20개", "플랭크 1분"]
 * @param {string[]} dateList ["2025-04-21", "2025-04-22"]
 */
export async function assignRoutineToMember(trainerId, memberId, routineList, dateList, res) {
  const assigned = [];

  for (const title of routineList) {
    const { data: assignment, error } = await supabase
      .from("personal_assignments")
      .insert({
        member_id: memberId,
        trainer_id: trainerId,
        title,
        status: "대기"
      })
      .select()
      .single();

    if (assignment) {
      for (const date of dateList) {
        await supabase.from("assignment_schedules").insert({
          assignment_id: assignment.id,
          target_date: date
        });
      }
      assigned.push(title);
    }
  }

  return res.json(replyText(
    `✅ 회원에게 과제가 등록되었습니다!\n📝 루틴:\n- ${assigned.join("\n- ")}`
  ));
}
