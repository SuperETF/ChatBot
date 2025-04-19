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
 * 자연어 시간/날짜 파서
 * @param {string} utterance - 사용자 발화
 * @returns {Array<string>} ISO 날짜 배열 or null
 */
export function parseNaturalDateTime(utterance) {
  const now = dayjs().second(0);
  const baseDate = now.startOf("day");

  // ✅ "이번 주 월수금" 같은 반복 요일 인식
  if (/이번\s*주.*[월화수목금토일]/.test(utterance)) {
    const days = utterance.match(/[월화수목금토일]/g);
    if (days) {
      const baseWeek = now.startOf("week").add(1, "day"); // 월요일 기준
      const dates = days.map(day => {
        const weekdayNum = WEEKDAYS[day];
        return baseWeek.day(weekdayNum).format("YYYY-MM-DD");
      });
      return dates;
    }
  }

  // ✅ "내일부터 N일간"
  const match = utterance.match(/내일.*?(\d+)\s*일/);
  if (match) {
    const count = parseInt(match[1], 10);
    return Array.from({ length: count }, (_, i) =>
      baseDate.add(i + 1, "day").format("YYYY-MM-DD")
    );
  }

  // ✅ 단일 날짜 형태들 (한 날짜만 리턴)
  const ampmMatch = utterance.match(/(오전|오후)\s*(\d{1,2})시/);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[2], 10);
    if (ampmMatch[1] === "오후" && hour < 12) hour += 12;
    if (ampmMatch[1] === "오전" && hour === 12) hour = 0;
    return [baseDate.hour(hour).format("YYYY-MM-DD")];
  }

  const todayMatch = utterance.match(/오늘\s*(\d{1,2})시/);
  if (todayMatch) {
    const hour = parseInt(todayMatch[1], 10);
    const target = baseDate.hour(hour);
    return [target.isSameOrAfter(now) ? target : target.add(1, "day")].map(d => d.format("YYYY-MM-DD"));
  }

  const tomorrowMatch = utterance.match(/내일\s*(\d{1,2})시/);
  if (tomorrowMatch) {
    const hour = parseInt(tomorrowMatch[1], 10);
    return [baseDate.add(1, "day").hour(hour).format("YYYY-MM-DD")];
  }

  const weekdayMatch = utterance.match(/(월|화|수|목|금|토|일)(요일)?\s*(\d{1,2})시/);
  if (weekdayMatch) {
    const weekdayName = weekdayMatch[1];
    const hour = parseInt(weekdayMatch[3], 10);
    const targetWeekday = WEEKDAYS[weekdayName];
    let target = baseDate;
    while (target.day() !== targetWeekday || target.isBefore(now, "day")) {
      target = target.add(1, "day");
    }
    return [target.hour(hour).format("YYYY-MM-DD")];
  }

  const simpleMatch = utterance.match(/(^|\s)(\d{1,2})시/);
  if (simpleMatch) {
    const hour = parseInt(simpleMatch[2], 10);
    const target = baseDate.hour(hour);
    return [target.isSameOrAfter(now) ? target : target.add(1, "day")].map(d => d.format("YYYY-MM-DD"));
  }

  return null;
}
