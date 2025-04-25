import { supabase } from "../../../services/supabase.mjs";
import { replyText } from "../../../utils/reply.mjs";
import { parseDateWithFallback } from "../../../utils/parseDateWithFallback.mjs";

export default async function assignWorkout(kakaoId, utterance, res) {
  // ✅ 트레이너 인증
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!trainer) {
    return res.json(replyText("트레이너 인증 정보가 없습니다. 먼저 전문가 등록을 진행해주세요."));
  }

  // ✅ 이름 추출
  const nameMatch = utterance.match(/[가-힣]{2,10}(님|씨|선생님)?/);
  const name = nameMatch?.[0]?.replace(/(님|씨|선생님)/g, "");

  if (!name) {
    return res.json(replyText("회원 이름을 포함해서 입력해주세요. 예: 김복두 런지 30개"));
  }

  // ✅ 과제명 추출
  const title = utterance.replace(nameMatch[0], "").trim();
  if (title.length < 2) {
    return res.json(replyText("과제명을 포함해주세요. 예: 런지 30개"));
  }

  // ✅ 회원 존재 확인
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("name", name)
    .eq("trainer_id", trainer.id)
    .maybeSingle();

  if (!member) {
    return res.json(replyText(`${name}님은 당신의 회원이 아니거나 존재하지 않습니다.`));
  }

  // ✅ 날짜 추출
  const parsedDates = await parseDateWithFallback(utterance);
  const flatDates = parsedDates.flat().filter(Boolean);

  if (!flatDates || flatDates.length === 0) {
    await supabase.from("date_parsing_failures").insert({
      kakao_id: kakaoId,
      utterance,
      note: "날짜 파싱 실패 (assignWorkout)"
    });
    return res.json(replyText("날짜를 인식하지 못했습니다."));
  }

  const today = new Date().toISOString().slice(0, 10);
  const hasPast = flatDates.some(d => d.date < today);
  if (hasPast) {
    return res.json(replyText("과거 날짜에는 과제를 등록할 수 없습니다. 미래 날짜를 입력해주세요."));
  }

  // ✅ 과제 등록
  const { data: assignment, error } = await supabase
    .from("personal_assignments")
    .insert({
      member_id: member.id,
      trainer_id: trainer.id,
      title,
      status: "대기"
    })
    .select()
    .single();

  if (error || !assignment) {
    console.error("과제 저장 실패:", error);
    return res.json(replyText("과제 저장 중 문제가 발생했습니다. 다시 시도해주세요."));
  }

  // ✅ 스케줄 등록
  const insertedDates = [];
  for (const { date, time } of flatDates) {
    const { error: scheduleError } = await supabase
      .from("assignment_schedules")
      .insert({
        assignment_id: assignment.id,
        target_date: date,
        target_time: time || null
      });
    if (!scheduleError) insertedDates.push({ date, time });
  }

  if (insertedDates.length === 0) {
    return res.json(replyText("과제는 저장되었지만 날짜 저장에 실패했습니다. 다시 시도해주세요."));
  }

  const dateSummary = insertedDates.map(d => `${d.date}${d.time ? ` ${d.time}` : ""}`).join(", ");
  return res.json(replyText(
    `✅ ${name}님에게 과제가 등록되었습니다.\n📌 [${title}]\n📅 일정: ${dateSummary}`
  ));
}
