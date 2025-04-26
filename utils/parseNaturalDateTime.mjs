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
  console.log("🔍 parseNaturalDateTime called with utterance:", utterance);

  const now = dayjs().second(0);
  const todayStart = now.startOf("day");
  const results = [];

  // ✅ 전처리: 붙은 표현 분리 + 잡단어 제거
  utterance = utterance
    // "오늘오후3시" → "오늘 오후 3시"
    .replace(/(오늘|내일)(오전|오후)?(\d{1,2})시/g, (_, d, t, h) => {
      return [d, t || "", h + "시"].join(" ").trim();
    })
    // "3시운동" → "3시"
    .replace(/(\d{1,2})시\s*(운동|레슨|예약)?/g, "$1시")
    // 다중 공백 제거
    .replace(/\s+/g, " ")
    .trim();

  console.log("▶︎ after preprocessing:", utterance);

  // ✅ (1) 절대 날짜 (4월 29일 오후 3시)
  const fullDateRegex =
    /(?:([0-9]{4})년\s*)?(\d{1,2})월\s*(\d{1,2})일\s*(오전|오후)?\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/g;

  const fullDateMatches = [...utterance.matchAll(fullDateRegex)];
  if (fullDateMatches.length > 0) {
    for (const match of fullDateMatches) {
      const [, yearRaw, month, day, ampm, hourRaw, minuteRaw] = match;
      let hour = parseInt(hourRaw, 10);
      const minute = parseInt(minuteRaw || "0", 10);
      if (ampm === "오후" && hour < 12) hour += 12;
      if (ampm === "오전" && hour === 12) hour = 0;

      const baseYear = yearRaw ? parseInt(yearRaw) : now.year();
      const parsedDate = dayjs(`${baseYear}-${month}-${day}`, "YYYY-M-D");
      const parsed = parsedDate.hour(hour).minute(minute).second(0);
      if (parsed.isValid()) results.push(parsed.toISOString());
    }
  } else {
    // ✅ (2) 상대 날짜 + 시간 (오늘, 내일)
    const relativeRegex =
      /(오늘|내일)\s*(오전|오후)?\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/gi;
    for (const match of utterance.matchAll(relativeRegex)) {
      const [, keyword, ampm, hourRaw, minuteRaw] = match;
      let hour = parseInt(hourRaw, 10);
      const minute = parseInt(minuteRaw || "0", 10);
      if (ampm === "오후" && hour < 12) hour += 12;
      if (ampm === "오전" && hour === 12) hour = 0;

      let base = now.clone();
      if (keyword === "내일") base = base.add(1, "day");

      const parsed = base.hour(hour).minute(minute).second(0);
      if (parsed.isValid()) results.push(parsed.toISOString());
    }

    // ✅ (3) 날짜만 (오늘/내일)
    const dayOnlyRegex = /\b(오늘|내일)\b/gi;
    for (const match of utterance.matchAll(dayOnlyRegex)) {
      const [keyword] = match;
      let base = now.clone();
      if (keyword === "내일") base = base.add(1, "day");

      const parsed = base.hour(12).minute(0).second(0);
      if (parsed.isValid()) results.push(parsed.toISOString());
    }

    // ✅ (4) 시간만 (오늘 기준)
    const timeOnlyRegex = /(오전|오후)?\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/gi;
    for (const match of utterance.matchAll(timeOnlyRegex)) {
      const [, ampm, hourRaw, minuteRaw] = match;
      let hour = parseInt(hourRaw, 10);
      const minute = parseInt(minuteRaw || "0", 10);
      if (ampm === "오후" && hour < 12) hour += 12;
      if (ampm === "오전" && hour === 12) hour = 0;

      const parsed = now.clone().hour(hour).minute(minute).second(0);
      if (parsed.isValid()) results.push(parsed.toISOString());
    }
  }

  // ✅ 최종 정리: 중복 제거 + 오늘 이후 + 정렬
  const final = [...new Set(results)].filter(iso => dayjs(iso).isSameOrAfter(todayStart));
  console.log("▶︎ final parsed results:", final);
  return final.sort((a, b) => dayjs(a).diff(dayjs(b)));
}
