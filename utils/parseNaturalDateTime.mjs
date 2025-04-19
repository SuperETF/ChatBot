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

/**
 * 자연어 시간 파싱 (오늘/내일/요일/오전오후/단순 시각)
 * @param {string} utterance - 사용자 발화
 * @returns { time: dayjs, amOrPmRequired: boolean } | null
 */
export function parseNaturalDateTime(utterance) {
  const now = dayjs().second(0);
  const baseDate = now.startOf("day");

  // ✅ 오전/오후 + 시
  const ampmMatch = utterance.match(/(오전|오후)\s*(\d{1,2})시/);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[2], 10);
    if (ampmMatch[1] === "오후" && hour < 12) hour += 12;
    if (ampmMatch[1] === "오전" && hour === 12) hour = 0;
    return { time: baseDate.hour(hour), amOrPmRequired: false };
  }

  // ✅ 오늘 n시
  const todayMatch = utterance.match(/오늘\s*(\d{1,2})시/);
  if (todayMatch) {
    const hour = parseInt(todayMatch[1], 10);
    const target = baseDate.hour(hour);
    return {
      time: target.isSameOrAfter(now) ? target : target.add(1, "day"),
      amOrPmRequired: true,
    };
  }

  // ✅ 내일 n시
  const tomorrowMatch = utterance.match(/내일\s*(\d{1,2})시/);
  if (tomorrowMatch) {
    const hour = parseInt(tomorrowMatch[1], 10);
    return { time: baseDate.add(1, "day").hour(hour), amOrPmRequired: true };
  }

  // ✅ 요일 기반 (월/화/...요일 n시)
  const weekdayMatch = utterance.match(/(월|화|수|목|금|토|일)(요일)?\s*(\d{1,2})시/);
  if (weekdayMatch) {
    const weekdayName = weekdayMatch[1];
    const hour = parseInt(weekdayMatch[3], 10);
    const targetWeekday = WEEKDAYS[weekdayName];

    let target = baseDate;
    while (target.day() !== targetWeekday || target.isBefore(now, "day")) {
      target = target.add(1, "day");
    }

    return { time: target.hour(hour), amOrPmRequired: true };
  }

  // ✅ 단순 n시 (예: "3시"만 있음)
  const simpleMatch = utterance.match(/(^|\s)(\d{1,2})시/);
  if (simpleMatch) {
    const hour = parseInt(simpleMatch[2], 10);
    const target = baseDate.hour(hour);
    return {
      time: target.isSameOrAfter(now) ? target : target.add(1, "day"),
      amOrPmRequired: true,
    };
  }

  // ❌ 파싱 실패
  return null;
}
