// 📁 handlers/member/assignment/completeTodayAssignments.mjs
import dayjs from "dayjs";
import { supabase } from "../../../services/supabase.mjs";
import { replyText } from "../../../utils/reply.mjs";

export default async function completeTodayAssignments(kakaoId, utterance, res) {
  const today = dayjs().format("YYYY-MM-DD");

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replyText("❗ 회원 인증이 필요합니다. 먼저 등록을 완료해 주세요."));
  }

  // 오늘 과제 일정 중 완료되지 않은 것들 조회
  const { data: schedules, error } = await supabase
    .from("assignment_schedules")
    .select("id")
    .eq("target_date", today)
    .eq("is_completed", false)
    .in("assignment_id",
      supabase.from("assignments")
        .select("id")
        .eq("member_id", member.id)
    );

  if (error || !schedules || schedules.length === 0) {
    return res.json(replyText("✅ 오늘 완료할 과제가 없습니다."));
  }

  const ids = schedules.map(s => s.id);

  const { error: updateError } = await supabase
    .from("assignment_schedules")
    .update({ is_completed: true, completed_at: new Date().toISOString() })
    .in("id", ids);

  if (updateError) {
    return res.json(replyText("❌ 과제 완료 처리 중 오류가 발생했습니다."));
  }

  return res.json(replyText(`🎉 오늘 ${ids.length}개의 과제를 완료 처리했습니다! 수고하셨어요.`));
}