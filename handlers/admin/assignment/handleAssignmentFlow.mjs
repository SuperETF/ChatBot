// ✅ handlers/admin/assignment/handleAssignmentFlow.mjs
import { supabase } from "../../../services/supabase.mjs";
import { replyText } from "../../../utils/reply.mjs";
import { assignmentSession } from "../../../utils/sessionContext.mjs";
import { parseNaturalDatePeriod, parseWeekdays, getRepeatDates } from "../../../utils/parseAssignmentDates.mjs";
import dayjs from "dayjs";

export default async function handleAssignmentFlow(kakaoId, utterance, res) {
  const ctx = assignmentSession[kakaoId];
  if (!ctx) return res.json(replyText("❌ 과제 생성 흐름이 초기화되었습니다. 다시 '과제 생성'을 눌러주세요."));

  const step = ctx.step;
  const data = ctx.assignment;

  // 1. 회원 이름 입력
  if (step === "awaiting_member") {
    const { data: member } = await supabase
      .from("members")
      .select("id")
      .eq("name", utterance)
      .maybeSingle();

    if (!member) return res.json(replyText("❌ 해당 회원을 찾을 수 없습니다. 다시 입력해주세요."));

    data.member_id = member.id;
    ctx.step = "awaiting_period";
    return res.json(replyText("📅 과제를 언제부터 언제까지 부여할까요?\n예: 5월 10일부터 5일, 내일부터 3일간"));
  }

  // 2. 기간 입력
  if (step === "awaiting_period") {
    const parsed = parseNaturalDatePeriod(utterance);
    if (!parsed) return res.json(replyText("❗ 날짜를 인식하지 못했어요. 다시 입력해주세요."));

    data.start_date = parsed.start;
    data.end_date = parsed.end;
    ctx.step = "awaiting_frequency";
    return res.json(replyText("🔁 반복 주기를 알려주세요.\n예: 매일, 격일, 월수금"));
  }

  // 3. 반복 주기 입력
  if (step === "awaiting_frequency") {
    data.repeat_type = utterance;
    ctx.step = "awaiting_content";
    return res.json(replyText("📌 어떤 과제를 부여할까요?\n예: 스쿼트 100개, 런지 20개"));
  }

  // 4. 과제 내용 입력 및 저장
  if (step === "awaiting_content") {
    data.content = utterance;

    const { data: assignment } = await supabase
      .from("assignments")
      .insert({ member_id: data.member_id, content: data.content })
      .select()
      .single();

    const weekdays = parseWeekdays(data.repeat_type);
    const repeatDates = getRepeatDates(
      dayjs(data.start_date),
      dayjs(data.end_date),
      weekdays.length > 0 ? weekdays : data.repeat_type
    );

    const scheduleRows = repeatDates.map(date => ({
      assignment_id: assignment.id,
      target_date: date
    }));

    await supabase.from("assignment_schedules").insert(scheduleRows);

    delete assignmentSession[kakaoId];
    return res.json(replyText(
      `✅ 과제가 등록되었습니다!\n🗓️ 기간: ${dayjs(data.start_date).format("M월 D일")} ~ ${dayjs(data.end_date).format("M월 D일")}\n📌 내용: ${data.content}`
    ));
  }
}