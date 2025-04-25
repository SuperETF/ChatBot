// ✅ utils/parseNaturalDateTime.mjs (최종 버전: 오늘/내일/모레 완전 대응)
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

  // ✅ (1) 절대 날짜 우선 처리
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

  // ✅ (2) 상대 날짜: 오늘/내일/모레
  const relativeRegex = /\b(오늘|내일|모레)\s*(오전|오후)?\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/gi;
  const matches = [...utterance.matchAll(relativeRegex)];

  for (const match of matches) {
    const [, keyword, ampm, hourRaw, minuteRaw] = match;
    let hour = parseInt(hourRaw, 10);
    const minute = parseInt(minuteRaw || "0", 10);

    if (ampm === "오후" && hour < 12) hour += 12;
    if (ampm === "오전" && hour === 12) hour = 0;

    let base = now.clone();
    if (keyword === "내일") base = base.add(1, "day");
    if (keyword === "모레") base = base.add(2, "day");

    const parsed = base.hour(hour).minute(minute).second(0);
    if (parsed.isValid()) results.push(parsed.toISOString());
  }

  // ✅ (3) 오늘 키워드 생략된 시간 단독 표현도 허용
  const timeOnlyRegex = /\b(오전|오후)?\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/gi;
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

  return results
    .filter(iso => dayjs(iso).isSameOrAfter(now))
    .sort((a, b) => dayjs(a).diff(dayjs(b)));
}
