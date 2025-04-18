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

  // 오늘 or 내일
  if (/오늘\s*(\d{1,2})시/.test(utterance)) {
    const hour = parseInt(utterance.match(/오늘\s*(\d{1,2})시/)[1], 10);
    return now.hour(hour).minute(0).second(0);
  }

  if (/내일\s*(\d{1,2})시/.test(utterance)) {
    const hour = parseInt(utterance.match(/내일\s*(\d{1,2})시/)[1], 10);
    return now.add(1, "day").hour(hour).minute(0).second(0);
  }

  // 요일 기반
  const match = utterance.match(/(월|화|수|목|금|토|일)(요일)?\s*(\d{1,2})시/);
  if (match) {
    const weekdayName = match[1];
    const hour = parseInt(match[3], 10);
    const targetWeekday = WEEKDAYS[weekdayName];
    let targetDate = now.startOf("day");

    // 현재 날짜 이후의 가장 가까운 해당 요일
    while (targetDate.day() !== targetWeekday || targetDate.isBefore(now, 'day')) {
      targetDate = targetDate.add(1, 'day');
    }

    return targetDate.hour(hour).minute(0).second(0);
  }

  // fallback
  return null;
}
