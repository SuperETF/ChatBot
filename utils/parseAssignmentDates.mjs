// ✅ utils/parseAssignmentDates.mjs
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";
dayjs.extend(isSameOrBefore);

export function parseNaturalDatePeriod(input) {
  const now = dayjs();

  // ✅ 내일부터 N일간
  if (/내일부터\s*(\d+)일간?/.test(input)) {
    const days = parseInt(RegExp.$1, 10);
    const start = now.add(1, "day");
    const end = start.add(days - 1, "day");
    return { start, end, repeat_type: "매일" };
  }

  // ✅ 다음 주 N일간
  if (/다음 주\s*(\d+)일간?/.test(input)) {
    const days = parseInt(RegExp.$1, 10);
    const start = now.startOf("week").add(1, "week").add(1, "day");
    const end = start.add(days - 1, "day");
    return { start, end, repeat_type: "매일" };
  }

  // ✅ 이번 주 월~금 매일
  if (/이번 주.*월[~/-]?금.*매일/.test(input)) {
    const start = now.startOf("week").add(1, "day");
    const end = start.add(4, "day");
    return { start, end, repeat_type: "매일" };
  }

  // ✅ 이번 주 요일 리스트 (월/수/금 등)
  if (/이번 주\s*([월화수목금토일]+(\/?[월화수목금토일]+)*)/.test(input)) {
    const matched = input.match(/이번 주\s*([월화수목금토일\/]+)/);
    const weekdaysText = matched[1];
    const start = now.startOf("week").add(1, "day");
    const end = start.add(6, "day");
    return { start, end, repeat_type: weekdaysText };
  }

  // ✅ 단일 날짜 하루 (ex: 수요일 하루만)
  if (/([월화수목금토일])요일.*하루/.test(input)) {
    const map = { "일": 0, "월": 1, "화": 2, "수": 3, "목": 4, "금": 5, "토": 6 };
    const day = map[RegExp.$1];
    const date = findNextWeekday(now, day);
    return { start: date, end: date, repeat_type: RegExp.$1 };
  }

  return null;
}

function findNextWeekday(base, targetDay) {
  let date = base.clone();
  while (date.day() !== targetDay) {
    date = date.add(1, "day");
  }
  return date;
}

export function parseWeekdays(text) {
  const map = { "일": 0, "월": 1, "화": 2, "수": 3, "목": 4, "금": 5, "토": 6 };
  const matched = text.match(/[월화수목금토일]/g);
  return matched ? [...new Set(matched)].map(d => map[d]) : [];
}

export function getRepeatDates(start, end, typeOrWeekdays) {
  const result = [];
  let current = start.clone();

  while (current.isSameOrBefore(end, "day")) {
    if (typeOrWeekdays === "매일") {
      result.push(current.format("YYYY-MM-DD"));
    } else if (typeOrWeekdays === "격일") {
      result.push(current.format("YYYY-MM-DD"));
      current = current.add(1, "day");
    } else if (Array.isArray(typeOrWeekdays)) {
      if (typeOrWeekdays.includes(current.day())) {
        result.push(current.format("YYYY-MM-DD"));
      }
    }
    current = current.add(1, "day");
  }

  return result;
}