// 📁 handlers/admin/assignment/handleAssignmentFlow.mjs
import { supabase } from "../../../services/supabase.mjs";
import { replyText, replyQuickReplies } from "../../../utils/reply.mjs";
import { assignmentSession } from "../../../utils/sessionContext.mjs";
import { parseNaturalDatePeriod } from "../../../utils/parseAssignmentDates.mjs";
import { getRepeatDates } from "../../../utils/parseAssignmentRecurrence.mjs";

export default async function handleAssignmentFlow(kakaoId, utterance, res) {
  const ctx = assignmentSession[kakaoId] || { flow: "assignment", step: 1 };

  // 1단계: 대상 회원 이름 입력
  if (ctx.step === 1) {
    ctx.memberName = utterance.trim();
    ctx.step = 2;
    assignmentSession[kakaoId] = ctx;
    return res.json(replyText("📅 과제 시작일과 기간을 입력해주세요.\n예: 내일부터 3일간, 5월 10일부터 5일"));
  }

  // 2단계: 기간 입력 + 날짜 파싱 적용
  if (ctx.step === 2) {
    const parsed = parseNaturalDatePeriod(utterance);
    if (!parsed) {
      return res.json(replyText("❗ 날짜 형식을 이해하지 못했어요. 다시 입력해주세요.\n예: 내일부터 3일간, 5월 10일부터 5일"));
    }

    ctx.startDate = parsed.startDate;
    ctx.endDate = parsed.endDate;
    ctx.duration = parsed.duration;
    ctx.step = 3;
    assignmentSession[kakaoId] = ctx;
    return res.json(replyText("🔁 반복 주기를 선택해주세요.\n예: 매일, 격일, 월수금"));
  }

  // 3단계: 반복 주기 입력
  if (ctx.step === 3) {
    ctx.recurrence = utterance.trim();
    ctx.step = 4;
    assignmentSession[kakaoId] = ctx;
    return res.json(replyText("📋 과제 내용을 입력해주세요."));
  }

  // 4단계: 내용 입력 및 저장
  if (ctx.step === 4) {
    ctx.content = utterance.trim();

    const { data: trainer } = await supabase
      .from("trainers")
      .select("id")
      .eq("kakao_id", kakaoId)
      .maybeSingle();

    if (!trainer) {
      delete assignmentSession[kakaoId];
      return res.json(replyText("❌ 트레이너 인증이 필요합니다."));
    }

    // 회원 찾기
    const { data: member } = await supabase
      .from("members")
      .select("id")
      .eq("name", ctx.memberName)
      .eq("trainer_id", trainer.id)
      .maybeSingle();

    if (!member) {
      delete assignmentSession[kakaoId];
      return res.json(replyText("❌ 해당 이름의 회원을 찾을 수 없습니다."));
    }

    // 과제 저장 (assignments)
    const { data: assignment, error: insertError } = await supabase
      .from("assignments")
      .insert({
        member_id: member.id,
        content: ctx.content,
        start_date: ctx.startDate,
        end_date: ctx.endDate
      })
      .select()
      .maybeSingle();

    if (insertError || !assignment) {
      delete assignmentSession[kakaoId];
      return res.json(replyText("❌ 과제 등록 중 오류가 발생했습니다."));
    }

    // 반복 일정 생성 → assignment_schedules
    const scheduleDates = getRepeatDates(ctx.startDate, ctx.duration, ctx.recurrence);
    const schedules = scheduleDates.map((date) => ({
      assignment_id: assignment.id,
      target_date: date,
      is_completed: false
    }));

    const { error: scheduleError } = await supabase
      .from("assignment_schedules")
      .insert(schedules);

    delete assignmentSession[kakaoId];

    if (scheduleError) {
      return res.json(replyText("⚠️ 과제는 저장되었지만 반복 일정 저장 중 오류가 발생했습니다."));
    }

    return res.json(replyQuickReplies(
      `✅ 과제가 등록되었습니다.\n회원: ${ctx.memberName}\n기간: ${ctx.startDate} ~ ${ctx.endDate}\n내용: ${ctx.content}`,
      ["과제 생성", "과제 현황", "메인 메뉴"]
    ));
  }
}