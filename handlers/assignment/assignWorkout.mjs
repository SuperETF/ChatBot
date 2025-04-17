import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";
import { parseDateWithFallback } from "../../utils/parseDateWithFallback.mjs"; // GPT 포함 하이브리드 파서

export default async function assignWorkout(kakaoId, utterance, res) {
  // 1. 트레이너 인증
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!trainer) {
    return res.json(replyText("트레이너 인증 정보가 없습니다."));
  }

  // 2. 이름 및 과제 내용 추출 (존칭 제거)
  const nameMatch = utterance.match(/[가-힣]{2,4}(님|씨|선생님)?/);
  if (!nameMatch) {
    return res.json(replyText("과제를 줄 회원의 이름을 포함해주세요. 예: 김복두님, 스쿼트 50개"));
  }

  const rawName = nameMatch[0];
  const name = rawName.replace(/(님|씨|선생님)$/, ""); // ✅ 이름만 추출
  const title = utterance.replace(rawName, "").trim();

  if (title.length < 3) {
    return res.json(replyText("과제 내용을 함께 입력해주세요. 예: 김복두님 하루 스쿼트 50개"));
  }

  // 3. 회원 정보 확인
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("name", name)
    .eq("trainer_id", trainer.id)
    .maybeSingle();

  if (!member) {
    return res.json(replyText(`${name}님은 당신의 회원이 아니거나 존재하지 않습니다.`));
  }

  // 4. 날짜 파싱 (룰 + GPT fallback 통합)
  const scheduleDates = await parseDateWithFallback(utterance);

  if (!scheduleDates || scheduleDates.length === 0) {
    await supabase.from("date_parsing_failures").insert({
      kakao_id: kakaoId,
      utterance,
      note: "날짜 파싱 실패 (룰 + GPT fallback)"
    });

    return res.json(replyText("⛔ 날짜를 인식하지 못했습니다. 예: '내일 런지 30개', '4월 20일 스쿼트 100개'처럼 입력해주세요."));
  }

  // 5. 과거 날짜 차단
  const today = new Date().toISOString().slice(0, 10);
  const hasPastDate = scheduleDates.some(d => d.date < today);
  if (hasPastDate) {
    return res.json(replyText("❌ 과거 날짜에는 과제를 등록할 수 없습니다. 미래 날짜를 입력해주세요."));
  }

  // 6. 과제 본문 저장
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

  if (error || !assignment?.id) {
    console.error("❌ assignWorkout insert 실패", error);
    return res.json(replyText("과제 저장 중 문제가 발생했습니다."));
  }

  console.log("✅ 과제 등록 성공:", assignment);

  // 7. 일정 저장
  const insertedDates = [];

  for (const { date, time } of scheduleDates) {
    const { error: scheduleError } = await supabase
      .from("assignment_schedules")
      .insert({
        assignment_id: assignment.id,
        target_date: date,
        target_time: time || null
      });

    if (!scheduleError) insertedDates.push({ date, time });
    else console.error("❌ 일정 등록 실패:", scheduleError);
  }

  if (insertedDates.length === 0) {
    return res.json(replyText("❌ 과제는 저장되었지만 날짜가 저장되지 않았습니다. 다시 시도해주세요."));
  }

  return res.json(replyText(
    `✅ ${name}님에게 과제가 성공적으로 등록되었습니다.\n[${title}]\n📅 지정일: ${insertedDates.map(d => d.date + (d.time ? ` ${d.time}` : '')).join(", ")}`
  ));
}
