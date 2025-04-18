import dayjs from "dayjs";
import weekday from "dayjs/plugin/weekday.js";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
dayjs.extend(weekday);
dayjs.extend(isSameOrAfter);

const WEEKDAY_KR = {
  "일": 0, "월": 1, "화": 2, "수": 3,
  "목": 4, "금": 5, "토": 6
};

export async function parseDateWithFallback(text) {
  const today = dayjs();

  const result = [];

  // ✅ 매일 → 내일부터 7일간
  if (/매일/.test(text)) {
    for (let i = 1; i <= 7; i++) {
      result.push({ date: today.add(i, "day").format("YYYY-MM-DD"), time: null });
    }
  }

  // ✅ 내일, 모레, 글피, 그글피
  if (/내일/.test(text)) result.push({ date: today.add(1, "day").format("YYYY-MM-DD"), time: null });
  if (/모레/.test(text)) result.push({ date: today.add(2, "day").format("YYYY-MM-DD"), time: null });
  if (/글피/.test(text)) result.push({ date: today.add(3, "day").format("YYYY-MM-DD"), time: null });
  if (/그글피/.test(text)) result.push({ date: today.add(4, "day").format("YYYY-MM-DD"), time: null });

  // ✅ 요일 (월화수목금토일 or ~요일)
  const weekdayMatches = text.match(/(월|화|수|목|금|토|일)(요일)?/g);
  if (weekdayMatches) {
    const uniqueWeekdays = [...new Set(weekdayMatches.map(d => d[0]))]; // 중복 제거
    uniqueWeekdays.forEach(dayKr => {
      const targetWeekday = WEEKDAY_KR[dayKr];
      let date = today.startOf("day");
      while (date.day() !== targetWeekday || !date.isSameOrAfter(today)) {
        date = date.add(1, "day");
      }
      result.push({ date: date.format("YYYY-MM-DD"), time: null });
    });
  }

  return result;
}
