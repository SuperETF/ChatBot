// handlers/assignment/assignWorkout.mjs
import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";
import { parseDateWithFallback } from "../../utils/parseDateWithFallback.mjs";
import OpenAI from "openai";

const openai = new OpenAI();
const ACTION_MODEL_ID = process.env.GPT_MODEL_ID_ASSIGN_WORKOUT;

export default async function assignWorkout(kakaoId, utterance, res) {
  // ✅ GPT 파싱: 이름, 과제, 날짜 추출 시도
  let gptName = null, gptTitle = null, gptDates = [];
  try {
    const gptRes = await openai.chat.completions.create({
      model: ACTION_MODEL_ID,
      messages: [
        { role: "system", content: "트레이너가 회원에게 과제를 부여합니다. 사용자의 입력에서 이름, 과제명, 날짜(문자열)를 추출해주세요. 결과는 JSON 형식으로 name, title, dates 키로 반환해주세요." },
        { role: "user", content: utterance }
      ]
    });
    const parsed = JSON.parse(gptRes.choices[0].message.content.trim());
    gptName = parsed.name;
    gptTitle = parsed.title;
    gptDates = parsed.dates;
  } catch (e) {
    console.error("❌ GPT 파싱 실패:", e);
  }

  // ✅ 트레이너 인증
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!trainer) {
    return res.json(replyText("트레이너 인증 정보가 없습니다. 먼저 전문가 등록을 진행해주세요."));
  }

  const name = gptName || utterance.match(/[가-힣]{2,4}(님|씨|선생님)?/)?.[0]?.replace(/(님|씨|선생님)/g, "");
  const title = gptTitle || utterance.replace(name, "").trim();

  if (!name || title.length < 3) {
    return res.json(replyText("회원 이름과 과제 내용을 모두 포함해주세요. 예: 김철수님 스쿼트 50개"));
  }

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("name", name)
    .eq("trainer_id", trainer.id)
    .maybeSingle();

  if (!member) {
    return res.json(replyText(`${name}님은 당신의 회원이 아니거나 존재하지 않습니다.`));
  }

  const parsedDates = gptDates?.length > 0
    ? await Promise.all(gptDates.map(parseDateWithFallback))
    : await parseDateWithFallback(utterance);

  const flatDates = parsedDates.flat().filter(Boolean);

  if (!flatDates || flatDates.length === 0) {
    await supabase.from("date_parsing_failures").insert({
      kakao_id: kakaoId,
      utterance,
      note: "날짜 파싱 실패 (assignWorkout)"
    });
    return res.json(replyText("날짜를 인식하지 못했습니다. 예: '내일 런지 30개'처럼 입력해주세요."));
  }

  const today = new Date().toISOString().slice(0, 10);
  const hasPast = flatDates.some(d => d.date < today);
  if (hasPast) {
    return res.json(replyText("과거 날짜에는 과제를 등록할 수 없습니다. 미래 날짜를 입력해주세요."));
  }

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