// handlers/assignment/assignRoutineToMember.mjs

import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";

export default async function assignRoutineToMember(trainerId, memberId, routineList, dateList, res) {
  const assigned = [];
  const failed = [];

  for (const title of routineList) {
    const { data: assignment, error: assignmentError } = await supabase
      .from("personal_assignments")
      .insert({
        member_id: memberId,
        trainer_id: trainerId,
        title,
        status: "대기"
      })
      .select()
      .single();

    if (!assignment || assignmentError) {
      console.error(`❌ 과제 등록 실패: ${title}`, assignmentError);
      failed.push(title);
      continue;
    }

    const scheduleInserts = dateList.map(date => ({
      assignment_id: assignment.id,
      target_date: date
    }));

    const { error: scheduleError } = await supabase
      .from("assignment_schedules")
      .insert(scheduleInserts);

    if (scheduleError) {
      console.error(`❌ 스케줄 등록 실패: ${title}`, scheduleError);
      failed.push(title);
      continue;
    }

    assigned.push(title);
  }

  console.log("📌 루틴 배정 완료:", assigned);

  if (assigned.length === 0) {
    return res.json(replyText("❌ 루틴 등록에 실패했습니다. 다시 시도해주세요."));
  }

  let responseMessage = `✅ 회원에게 과제가 등록되었습니다!\n📝 루틴:\n- ${assigned.join("\n- ")}`;

  if (failed.length > 0) {
    responseMessage += `\n\n⚠️ 등록 실패 항목:\n- ${failed.join("\n- ")}`;
  }

  return res.json(replyText(responseMessage));
}