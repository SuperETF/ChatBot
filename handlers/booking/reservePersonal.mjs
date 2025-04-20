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
  "일": 0, "월": 1, "화": 2, "수": 3, "목": 4, "금": 5, "토": 6
};

export function parseNaturalDateTime(utterance) {
  const now = dayjs().second(0);
  const baseDate = now.startOf("day");

  // 🗓️ 반복 요일 → fullDates용
  if (/이번\s*주.*[월화수목금토일]/.test(utterance)) {
    const matchedDays = utterance.match(/[월화수목금토일]/g);
    const baseWeek = baseDate.startOf("week").add(1, "day"); // 월요일
    const dates = matchedDays.map(day => {
      const offset = WEEKDAYS[day] - baseWeek.day();
      return baseWeek.add(offset >= 0 ? offset : offset + 7, "day").format("YYYY-MM-DD");
    });
    return {
      fullDates: [...new Set(dates)].sort(),
    };
  }

  // 📆 내일부터 N일간
  const rangeMatch = utterance.match(/내일.*?(\d+)\s*일/);
  if (rangeMatch) {
    const count = parseInt(rangeMatch[1], 10);
    const fullDates = Array.from({ length: count }, (_, i) =>
      baseDate.add(i + 1, "day").format("YYYY-MM-DD")
    );
    return { fullDates };
  }

  // 🕒 오전/오후 + 시간 (또는 반대)
  const ampmMatch = utterance.match(/(오전|오후)\s*(\d{1,2})시|(\d{1,2})시\s*(오전|오후)/);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[2] || ampmMatch[3], 10);
    const period = ampmMatch[1] || ampmMatch[4];
    if (period === "오후" && hour < 12) hour += 12;
    if (period === "오전" && hour === 12) hour = 0;

    const time = baseDate.hour(hour);
    return { time, amOrPmRequired: false, fullDates: [time.format("YYYY-MM-DD")] };
  }

  // 🗓️ 오늘 3시
  const todayMatch = utterance.match(/오늘\s*(\d{1,2})시/);
  if (todayMatch) {
    const hour = parseInt(todayMatch[1], 10);
    const time = baseDate.hour(hour);
    return {
      time,
      amOrPmRequired: true,
      fullDates: [time.format("YYYY-MM-DD")]
    };
  }

  // 🗓️ 내일 3시
  const tomorrowMatch = utterance.match(/내일\s*(\d{1,2})시/);
  if (tomorrowMatch) {
    const hour = parseInt(tomorrowMatch[1], 10);
    const time = baseDate.add(1, "day").hour(hour);
    return {
      time,
      amOrPmRequired: true,
      fullDates: [time.format("YYYY-MM-DD")]
    };
  }

  // 📆 요일 + 시간
  const weekdayMatch = utterance.match(/(월|화|수|목|금|토|일)(요일)?\s*(\d{1,2})시/);
  if (weekdayMatch) {
    const dayStr = weekdayMatch[1];
    const hour = parseInt(weekdayMatch[3], 10);
    const weekdayTarget = WEEKDAYS[dayStr];

    let target = baseDate;
    while (target.day() !== weekdayTarget || target.isBefore(now, "day")) {
      target = target.add(1, "day");
    }

    const time = target.hour(hour);
    return {
      time,
      amOrPmRequired: true,
      fullDates: [time.format("YYYY-MM-DD")]
    };
  }

  // 🕒 단순 "3시", "5시에 운동"
  const simpleMatch = utterance.match(/(\d{1,2})\s*시/);
  if (simpleMatch) {
    const hour = parseInt(simpleMatch[1], 10);
    const time = baseDate.hour(hour);
    return {
      time,
      amOrPmRequired: true,
      fullDates: [time.format("YYYY-MM-DD")]
    };
  }

  return null;
}
