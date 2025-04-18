import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import weekday from "dayjs/plugin/weekday.js";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
import ko from "dayjs/locale/ko.js";

dayjs.extend(customParseFormat);
dayjs.extend(weekday);
dayjs.extend(isSameOrAfter);
dayjs.locale(ko);

const WEEKDAYS = {
  "일요일": 0, "월요일": 1, "화요일": 2, "수요일": 3,
  "목요일": 4, "금요일": 5, "토요일": 6,
  "일": 0, "월": 1, "화": 2, "수": 3, "목": 4, "금": 5, "토": 6,
};

export function parseNaturalDateTime(utterance) {
  const now = dayjs();

  // ✅ 오전/오후 명확한 경우
  const ampmMatch = utterance.match(/(오전|오후)\s*(\d{1,2})시/);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[2], 10);
    if (ampmMatch[1] === "오후" && hour < 12) hour += 12;
    if (ampmMatch[1] === "오전" && hour === 12) hour = 0;
    return { time: now.hour(hour).minute(0).second(0), amOrPmRequired: false };
  }

  // ✅ 오늘 or 내일
  if (/오늘\s*(\d{1,2})시/.test(utterance)) {
    const hour = parseInt(utterance.match(/오늘\s*(\d{1,2})시/)[1], 10);
    return { time: now.hour(hour).minute(0).second(0), amOrPmRequired: true };
  }

  if (/내일\s*(\d{1,2})시/.test(utterance)) {
    const hour = parseInt(utterance.match(/내일\s*(\d{1,2})시/)[1], 10);
    return { time: now.add(1, "day").hour(hour).minute(0).second(0), amOrPmRequired: true };
  }

  // ✅ 요일 기반
  const match = utterance.match(/(월|화|수|목|금|토|일)(요일)?\s*(\d{1,2})시/);
  if (match) {
    const weekdayName = match[1];
    const hour = parseInt(match[3], 10);
    const targetWeekday = WEEKDAYS[weekdayName];
    let targetDate = now.startOf("day");

    while (targetDate.day() !== targetWeekday || targetDate.isBefore(now, "day")) {
      targetDate = targetDate.add(1, "day");
    }

    return { time: targetDate.hour(hour).minute(0).second(0), amOrPmRequired: true };
  }

  // ✅ 그냥 '3시', '6시'만 있을 경우
  const simpleMatch = utterance.match(/(^|\s)(\d{1,2})시/);
  if (simpleMatch) {
    const hour = parseInt(simpleMatch[2], 10);
    return { time: now.hour(hour).minute(0).second(0), amOrPmRequired: true };
  }

  // ❌ 파싱 실패
  return null;
}
