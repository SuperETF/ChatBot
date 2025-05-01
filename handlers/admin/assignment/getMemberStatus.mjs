// ✅ handlers/admin/assignment/getMemberStatus.mjs
import { supabase } from "../../../services/supabase.mjs";
import { replyText, replyQuickReplies } from "../../../utils/reply.mjs";

export default async function getMemberStatus(kakaoId, utterance, res) {
  // 1. 트레이너 인증
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!trainer) {
    return res.json(replyText("전문가 인증 정보가 없습니다. 먼저 등록해주세요."));
  }

  // 2. 회원 이름 입력 여부 확인
  const nameMatch = utterance.match(/([가-힣]{2,10})/);
  if (!nameMatch) {
    // 회원 목록 버튼 제공
    const { data: members } = await supabase
      .from("members")
      .select("name")
      .eq("trainer_id", trainer.id);

    if (!members || members.length === 0) {
      return res.json(replyText("등록된 회원이 없습니다."));
    }

    const quickReplies = members.map(m => ({
      label: m.name,
      action: "message",
      messageText: m.name
    }));

    return res.json(replyQuickReplies("📋 어느 회원의 과제 현황을 확인할까요?", quickReplies));
  }

  // 3. 해당 회원의 과제 목록 조회
  const name = nameMatch[1];
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("name", name)
    .eq("trainer_id", trainer.id)
    .maybeSingle();

  if (!member) {
    return res.json(replyText(`'${name}' 회원 정보를 찾을 수 없습니다.`));
  }

  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, content")
    .eq("member_id", member.id);

  if (!assignments || assignments.length === 0) {
    return res.json(replyText(`${name}님에게 등록된 과제가 없습니다.`));
  }

  const assignmentMap = new Map(assignments.map(a => [a.id, a.content]));
  const assignmentIds = Array.from(assignmentMap.keys());

  const { data: schedules } = await supabase
    .from("assignment_schedules")
    .select("assignment_id, target_date, is_completed")
    .in("assignment_id", assignmentIds);

  if (!schedules || schedules.length === 0) {
    return res.json(replyText(`${name}님에게 예정된 과제가 없습니다.`));
  }

  const completed = schedules.filter(s => s.is_completed).length;
  const total = schedules.length;
  const percent = Math.round((completed / total) * 100);

  const message = schedules.map(s => {
    const content = assignmentMap.get(s.assignment_id) || "-";
    const status = s.is_completed ? "✅" : "❌";
    return `• ${s.target_date} - ${content} (${status})`;
  }).join("\n");

  return res.json(replyText(`📊 ${name}님의 과제 현황:\n\n${message}\n\n총 ${total}개 중 ${completed}개 완료 (📈 ${percent}%)`));
}
