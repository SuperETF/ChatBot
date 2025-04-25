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

  // ✅ (1) "4월 29일 3시", "5월 1일 오후 2시"
  const fullDateRegex = /(\d{1,2})월\s*(\d{1,2})일\s*(오전|오후)?\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/g;
  const fullMatches = [...utterance.matchAll(fullDateRegex)];

  for (const match of fullMatches) {
    const [, month, day, ampm, hourRaw, minuteRaw] = match;
    let hour = parseInt(hourRaw, 10);
    const minute = parseInt(minuteRaw || "0", 10);

    if (ampm === "오후" && hour < 12) hour += 12;
    if (ampm === "오전" && hour === 12) hour = 0;

    const parsed = dayjs()
      .set("month", parseInt(month, 10) - 1)
      .set("date", parseInt(day, 10))
      .hour(hour)
      .minute(minute)
      .second(0);

    if (parsed.isValid()) results.push(parsed.toISOString());
  }

  // ✅ (2) "오늘/내일/모레 오후 3시" 형태 기존 대응
  const relativeRegex = new RegExp(
    `(오늘|내일|모레)?\\s*` +
    `(오전|오후)?\\s*` +
    `(?:(\\d{1,2})시\\s*(\\d{1,2})?\\s*분?|` +
    `(\\d{1,2}):(\\d{1,2})|` +
    `(\\d{1,2})시)`, "gi"
  );

  const relMatches = [...utterance.matchAll(relativeRegex)];

  for (const match of relMatches) {
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
