// 📁 utils/assignmentHelper.mjs
import { supabase } from "../services/supabase.mjs";

export async function findTodayAssignment(kakaoId) {
  const today = new Date().toISOString().slice(0, 10);

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) return null;

  const { data: schedules } = await supabase
    .from("assignment_schedules")
    .select("assignment_id")
    .eq("target_date", today);

  if (!schedules || schedules.length === 0) return null;

  const assignmentId = schedules[0].assignment_id;

  const { data: assignment } = await supabase
    .from("personal_assignments")
    .select("id, title, member_id")
    .eq("id", assignmentId)
    .maybeSingle();

  return assignment;
}
