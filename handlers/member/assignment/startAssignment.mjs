// ✅ handlers/member/assignment/startAssignment.mjs
import { supabase } from "../../../services/supabase.mjs";
import { replyQuickReplies } from "../../../utils/reply.mjs";
import { assignmentSession } from "../../../utils/sessionContext.mjs";

export default async function startAssignment(kakaoId, utterance, res) {
  const today = new Date().toISOString().slice(0, 10);
  const session = assignmentSession[kakaoId];

  // 1️⃣ 과제 버튼 클릭 시: 해당 과제를 세션에 저장
  if (!session) {
    const { data: member } = await supabase
      .from("members")
      .select("id")
      .eq("kakao_id", kakaoId)
      .maybeSingle();

    if (!member) {
      return res.json(replyQuickReplies("회원 인증 정보가 없습니다.", ["메인 메뉴"]));
    }

    const { data: assignments } = await supabase
      .from("assignments")
      .select("id, content")
      .eq("member_id", member.id);

    const { data: schedules } = await supabase
      .from("assignment_schedules")
      .select("id, assignment_id, is_completed")
      .eq("target_date", today)
      .in("assignment_id", assignments.map(a => a.id));

    const matched = schedules.find(s => {
      const a = assignments.find(a => a.id === s.assignment_id);
      return a?.content === utterance;
    });

    if (!matched) {
      return res.json(replyQuickReplies("❗ 해당 과제를 찾을 수 없습니다.", ["오늘 과제"]));
    }

    assignmentSession[kakaoId] = {
      step: "awaiting_start_confirm",
      schedule_id: matched.id,
      content: utterance
    };

    return res.json(replyQuickReplies(`📝 '${utterance}' 과제를 시작할까요?`, ["네", "아니오"]));
  }

  // 2️⃣ 멀티턴: "네" 또는 "아니오" 응답 처리
  if (session.step === "awaiting_start_confirm") {
    if (utterance === "네") {
      await supabase
        .from("assignment_schedules")
        .update({ started_at: new Date() })
        .eq("id", session.schedule_id);

      session.step = "awaiting_finish";
      return res.json(replyQuickReplies(`⏱ '${session.content}' 과제를 시작했습니다. 끝났다면 '종료'를 눌러주세요.`, ["종료"]));
    } else {
      delete assignmentSession[kakaoId];
      return res.json(replyQuickReplies("❌ 과제 시작을 취소했습니다. 다른 과제를 선택해주세요.", ["오늘 과제"]));
    }
  }

  // 3️⃣ 멀티턴: "종료" 응답
  if (session.step === "awaiting_finish" && utterance === "종료") {
    await supabase
      .from("assignment_schedules")
      .update({ is_completed: true, completed_at: new Date() })
      .eq("id", session.schedule_id);

    delete assignmentSession[kakaoId];
    return res.json(replyQuickReplies(`✅ '${session.content}' 과제를 완료했습니다!`, ["오늘 과제", "메인 메뉴"]));
  }

  // 4️⃣ 기타 fallback
  return res.json(replyQuickReplies("❓ 아직 진행 중인 과제가 없습니다. 먼저 과제를 선택해주세요.", ["오늘 과제"]));
}
