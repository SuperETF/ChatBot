// ✅ utils/parseNaturalDateTime.mjs
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import weekday from "dayjs/plugin/weekday.js";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
import ko from "dayjs/locale/ko.js";

dayjs.extend(customParseFormat);
dayjs.extend(weekday);
dayjs.extend(isSameOrAfter);
dayjs.locale(ko);

/**
 * "4월 29일 3시", "5월 1일 오후 2시" 등 복합 날짜-시간 인식용 파서
 */
export function parseNaturalDateTime(utterance) {
  const now = dayjs().second(0);
  const results = [];

  // 1. 날짜 + 시간 조합 (4월 29일 3시 / 오후 4시 등)
  const fullMatch = utterance.match(/(\d{1,2})월\s*(\d{1,2})일\s*(오전|오후)?\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/);
  if (fullMatch) {
    const [, month, day, ampm, hourRaw, minuteRaw] = fullMatch;
    let hour = parseInt(hourRaw, 10);
    const minute = parseInt(minuteRaw || "0", 10);
    if (ampm === "오후" && hour < 12) hour += 12;
    if (ampm === "오전" && hour === 12) hour = 0;

    const target = now.set("month", parseInt(month, 10) - 1)
                      .set("date", parseInt(day, 10))
                      .hour(hour).minute(minute).second(0);

    if (target.isValid()) results.push(target.toISOString());
  }

  // 2. 오늘/내일/모레 + 시간
  const relativeRegex = new RegExp(
    `(오늘|내일|모레)?\\s*` +        // 1) dayKeyword
    `(오전|오후)?\\s*` +            // 2) ampm
    `(?:(\\d{1,2})시\\s*(\\d{1,2})?\\s*분?|` + // 3,4
    `(\\d{1,2}):(\\d{1,2})|` +      // 5,6
    `(\\d{1,2})시)`,                // 7
    "gi"
  );

  const matches = [...utterance.matchAll(relativeRegex)];
  for (const match of matches) {
    const dayKeyword = match[1];
    const ampm = match[2];
    let hour, minute = 0;

    if (match[3]) {
      hour = parseInt(match[3], 10);
      if (match[4]) minute = parseInt(match[4], 10);
    } else if (match[5]) {
      hour = parseInt(match[5], 10);
      minute = parseInt(match[6], 10);
    } else if (match[7]) {
      hour = parseInt(match[7], 10);
    }

    if (ampm === "오후" && hour < 12) hour += 12;
    if (ampm === "오전" && hour === 12) hour = 0;

    let base = now.clone();
    if (dayKeyword === "내일") base = base.add(1, "day");
    if (dayKeyword === "모레") base = base.add(2, "day");

    const final = base.hour(hour).minute(minute).second(0);
    results.push(final.toISOString());
  }

  return results.length > 0 ? results.sort() : null;
}
