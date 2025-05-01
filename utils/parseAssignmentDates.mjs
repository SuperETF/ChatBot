import dayjs from "dayjs";

export function parseNaturalDatePeriod(input) {
  const now = dayjs();

  if (/내일.*(\d)일간/.test(input)) {
    const days = parseInt(RegExp.$1, 10);
    const start = now.add(1, "day");
    const end = start.add(days - 1, "day");
    return { start, end };
  }

  if (/(\d{1,2})월\s*(\d{1,2})일부터\s*(\d)일/.test(input)) {
    const [, m, d, days] = input.match(/(\d{1,2})월\s*(\d{1,2})일부터\s*(\d)일/);
    const start = dayjs(`${dayjs().year()}-${m}-${d}`, "YYYY-M-D");
    const end = start.add(parseInt(days) - 1, "day");
    return { start, end };
  }

  return null;
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
