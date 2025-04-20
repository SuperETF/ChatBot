// ✅ utils/parseDateAndTime.mjs
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
  "일": 0, "월": 1, "화": 2, "수": 3,
  "목": 4, "금": 5, "토": 6
};

/**
 * @param {string} utterance 사용자 발화
 * @returns {{ time: dayjs, amOrPmRequired: boolean } | null}
 */
export function parseDateAndTime(utterance) {
  const now = dayjs().second(0);
  const base = now.startOf("day");

  // ✅ 오전/오후 + 시간 또는 시간 + 오전/오후
  const ampmMatch = utterance.match(/(오전|오후)\s*(\d{1,2})시|(\d{1,2})시\s*(오전|오후)/);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[2] || ampmMatch[3], 10);
    const period = ampmMatch[1] || ampmMatch[4];
    if (period === "오후" && hour < 12) hour += 12;
    if (period === "오전" && hour === 12) hour = 0;
    return { time: base.hour(hour), amOrPmRequired: false };
  }

  // ✅ 오늘 + 시간
  const todayMatch = utterance.match(/오늘\s*(\d{1,2})시/);
  if (todayMatch) {
    const hour = parseInt(todayMatch[1], 10);
    return { time: base.hour(hour), amOrPmRequired: true };
  }

  // ✅ 내일 + 시간
  const tomorrowMatch = utterance.match(/내일\s*(\d{1,2})시/);
  if (tomorrowMatch) {
    const hour = parseInt(tomorrowMatch[1], 10);
    return { time: base.add(1, "day").hour(hour), amOrPmRequired: true };
  }

  // ✅ 요일 + 시간 (ex. 수요일 3시)
  const weekdayMatch = utterance.match(/(월|화|수|목|금|토|일)(요일)?\s*(\d{1,2})시/);
  if (weekdayMatch) {
    const weekday = WEEKDAYS[weekdayMatch[1]];
    const hour = parseInt(weekdayMatch[3], 10);
    let target = base;
    while (target.day() !== weekday || target.isBefore(now, "day")) {
      target = target.add(1, "day");
    }
    return { time: target.hour(hour), amOrPmRequired: true };
  }

  // ✅ 단순 "3시", "5시에 운동"
  const simpleMatch = utterance.match(/(\d{1,2})\s*시/);
  if (simpleMatch) {
    const hour = parseInt(simpleMatch[1], 10);
    return { time: base.hour(hour), amOrPmRequired: true };
  }

  return null;
}
