// 📁 utils/parseAssignmentRecurrence.mjs
import dayjs from "dayjs";

const weekdayMap = {
  "월": 1,
  "화": 2,
  "수": 3,
  "목": 4,
  "금": 5,
  "토": 6,
  "일": 0
};

/**
 * 반복 주기 텍스트를 기준으로 반복 날짜 리스트 생성
 * @param {string} startDate - YYYY-MM-DD
 * @param {number} duration - 총 기간 일수
 * @param {string} recurrence - 매일, 격일, 월수금 등
 * @returns {string[]} - ['2025-05-06', '2025-05-08', ...]
 */
export function getRepeatDates(startDate, duration, recurrence) {
  const dates = [];
  const base = dayjs(startDate);

  // 1. 매일
  if (/매일/.test(recurrence)) {
    for (let i = 0; i < duration; i++) {
      dates.push(base.add(i, "day").format("YYYY-MM-DD"));
    }
    return dates;
  }

  // 2. 격일
  if (/격일/.test(recurrence)) {
    for (let i = 0; i < duration; i += 2) {
      dates.push(base.add(i, "day").format("YYYY-MM-DD"));
    }
    return dates;
  }

  // 3. 특정 요일 (ex: 월수금)
  const matchedDays = [...recurrence].filter((char) => weekdayMap[char] !== undefined);
  if (matchedDays.length > 0) {
    for (let i = 0; i < duration + 7; i++) {
      const date = base.add(i, "day");
      if (matchedDays.includes(getKoreanWeekday(date.day()))) {
        dates.push(date.format("YYYY-MM-DD"));
      }
      if (dates.length >= duration) break;
    }
    return dates;
  }

  // fallback: 매일로 처리
  for (let i = 0; i < duration; i++) {
    dates.push(base.add(i, "day").format("YYYY-MM-DD"));
  }
  return dates;
}

function getKoreanWeekday(jsDay) {
  return Object.keys(weekdayMap).find(key => weekdayMap[key] === jsDay);
}
