// ✅ handlers/admin/assignment/handleAssignmentFlow.mjs
import { supabase } from "../../../services/supabase.mjs";
import { replyText, replyQuickReplies } from "../../../utils/reply.mjs";
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
    ctx.step = "awaiting_period_and_frequency";

    return res.json(replyQuickReplies("📅 과제 기간과 반복 주기를 선택해주세요:", [
      { label: "이번 주 월~금 (매일)", messageText: "이번 주 월~금 매일" },
      { label: "이번 주 월/수/금", messageText: "이번 주 월/수/금" },
      { label: "내일부터 3일간", messageText: "내일부터 3일간" },
      { label: "다음 주 5일간", messageText: "다음 주 5일간" },
      { label: "수요일 하루만", messageText: "수요일 하루만" }
    ]));
  }

  // 2. 날짜 + 반복 주기 통합 입력
  if (step === "awaiting_period_and_frequency") {
    const parsed = parseNaturalDatePeriod(utterance);
    if (!parsed) return res.json(replyText("❗ 날짜와 주기를 인식하지 못했어요. 다시 선택하거나 입력해주세요."));

    data.start_date = parsed.start;
    data.end_date = parsed.end;
    data.repeat_type = parsed.repeat_type || "매일";

    ctx.step = "awaiting_content";
    return res.json(replyText("📌 어떤 과제를 부여할까요?\n예: 스쿼트 100개, 런지 20개"));
  }

  // 3. 과제 내용 입력 및 저장
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

    console.log("🗓 생성된 날짜 목록:", repeatDates);

    if (!repeatDates.length) {
      console.warn("❌ 반복 날짜 생성 실패 → repeatDates is empty");
      return res.json(replyText("❗ 과제 날짜 생성에 실패했습니다. 입력을 다시 확인해주세요."));
    }

    const scheduleRows = repeatDates.map(date => ({
      assignment_id: assignment.id,
      target_date: date
    }));

    const { error: insertError } = await supabase
      .from("assignment_schedules")
      .insert(scheduleRows);

    if (insertError) {
      console.error("❌ 과제 스케줄 저장 실패:", insertError.message);
      return res.json(replyText("❗ 과제 스케줄 저장 중 오류가 발생했습니다."));
    }

    delete assignmentSession[kakaoId];
    return res.json(replyQuickReplies(
      `✅ 과제가 등록되었습니다!\n🗓️ ${dayjs(data.start_date).format("M월 D일")} ~ ${dayjs(data.end_date).format("M월 D일")}\n📌 ${data.content}`,
      ["과제 다시 생성", "메인 메뉴"]
    ));
  }
}