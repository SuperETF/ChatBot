import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import weekday from "dayjs/plugin/weekday.js";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
import ko from "dayjs/locale/ko.js";

dayjs.extend(customParseFormat);
dayjs.extend(weekday);
dayjs.extend(isSameOrAfter);
dayjs.locale(ko);

export function parseNaturalDateTime(utterance) {
  const now = dayjs().second(0);
  const results = [];

  // ✅ 전처리: 공백 유도 + 불필요 단어 제거
  utterance = utterance
    .replace(/(오늘|내일|모레|내일모레)(\s*)(오전|오후)?(\s*)(\d{1,2})시/g, "$1 $3 $5시") // 붙은 표현 분리
    .replace(/(\d{1,2})시\s*(운동|레슨|예약)?/g, "$1시") // 뒤 단어 제거
    .replace(/\s+/g, " ")
    .trim();

  // ✅ (1) 절대 날짜 인식
  const fullDateRegex = /(?:([0-9]{4})년\s*)?(\d{1,2})월\s*(\d{1,2})일\s*(오전|오후)?\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/g;
  const fullMatches = [...utterance.matchAll(fullDateRegex)];

  for (const match of fullMatches) {
    const [, yearRaw, month, day, ampm, hourRaw, minuteRaw] = match;
    let hour = parseInt(hourRaw, 10);
    const minute = parseInt(minuteRaw || "0", 10);

    if (ampm === "오후" && hour < 12) hour += 12;
    if (ampm === "오전" && hour === 12) hour = 0;

    let baseYear = yearRaw ? parseInt(yearRaw) : now.year();
    let date = dayjs().set("year", baseYear).set("month", parseInt(month) - 1).set("date", parseInt(day));
    if (!yearRaw && date.isBefore(now, "day")) date = date.add(1, "year");

    const parsed = date.hour(hour).minute(minute).second(0);
    if (parsed.isValid()) results.push(parsed.toISOString());
  }

  // ✅ (2) 상대 날짜 + 시간 인식 (오늘 3시 / 내일 오후 2시)
  const relativeRegex = /(오늘|내일|모레|내일모레)\s*(오전|오후)?\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/gi;
  const matches = [...utterance.matchAll(relativeRegex)];

  for (const match of matches) {
    const [, keyword, ampm, hourRaw, minuteRaw] = match;
    let hour = parseInt(hourRaw, 10);
    const minute = parseInt(minuteRaw || "0", 10);

    if (ampm === "오후" && hour < 12) hour += 12;
    if (ampm === "오전" && hour === 12) hour = 0;

    let base = now.clone();
    if (keyword === "내일") base = base.add(1, "day");
    else if (keyword === "모레") base = base.add(2, "day");
    else if (keyword === "내일모레") base = base.add(3, "day");

    const parsed = base.hour(hour).minute(minute).second(0);
    if (parsed.isValid()) results.push(parsed.toISOString());
  }

  // ✅ (3) 날짜만 입력된 경우 기본 12시로 파싱 (멀티턴 유도용)
  const dayOnlyRegex = /\b(오늘|내일|모레|내일모레)\b/gi;
  const dayOnlyMatches = [...utterance.matchAll(dayOnlyRegex)];

  for (const match of dayOnlyMatches) {
    const [keyword] = match;
    let base = now.clone();
    if (keyword === "내일") base = base.add(1, "day");
    else if (keyword === "모레") base = base.add(2, "day");
    else if (keyword === "내일모레") base = base.add(3, "day");

    const parsed = base.hour(12).minute(0).second(0);
    if (parsed.isValid()) results.push(parsed.toISOString());
  }

  // ✅ (4) 시간만 입력된 경우 → 오늘 기준
  const timeOnlyRegex = /(오전|오후)?\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/gi;
  const timeOnlyMatches = [...utterance.matchAll(timeOnlyRegex)];

  for (const match of timeOnlyMatches) {
    const [, ampm, hourRaw, minuteRaw] = match;
    let hour = parseInt(hourRaw, 10);
    const minute = parseInt(minuteRaw || "0", 10);

    if (ampm === "오후" && hour < 12) hour += 12;
    if (ampm === "오전" && hour === 12) hour = 0;

    const parsed = now.clone().hour(hour).minute(minute).second(0);
    if (parsed.isValid()) results.push(parsed.toISOString());
  }

  // ✅ 중복 제거 및 미래 시간만 필터링
  return [...new Set(
    results
      .filter(iso => dayjs(iso).isSameOrAfter(now))
      .sort((a, b) => dayjs(a).diff(dayjs(b)))
  )];
}
