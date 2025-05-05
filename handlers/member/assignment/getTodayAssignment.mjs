// 📁 handlers/member/assignment/getTodayAssignment.mjs
import dayjs from "dayjs";
import { supabase } from "../../../services/supabase.mjs";
import { replyText } from "../../../utils/reply.mjs";

export default async function getTodayAssignment(kakaoId, utterance, res) {
  const today = dayjs().format("YYYY-MM-DD");

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replyText("❗ 회원 인증이 필요합니다. 먼저 등록을 완료해 주세요."));
  }

  const { data: schedules, error } = await supabase
    .from("assignment_schedules")
    .select("id, assignment_id")
    .eq("target_date", today)
    .eq("is_completed", false)
    .in("assignment_id",
      supabase.from("assignments")
        .select("id")
        .eq("member_id", member.id)
    );

  if (error || !schedules || schedules.length === 0) {
    return res.json(replyText("✅ 오늘 예정된 과제는 없습니다!"));
  }

  const assignmentIds = schedules.map(s => s.assignment_id);

  const { data: assignments } = await supabase
    .from("assignments")
    .select("content")
    .in("id", assignmentIds);

  const lines = assignments.map((a, i) => `${i + 1}. ${a.content}`).join("\n");

  return res.json(replyText(`📌 오늘의 과제 목록입니다:\n\n${lines}`));
}
