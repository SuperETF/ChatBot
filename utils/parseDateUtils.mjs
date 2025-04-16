import chrono from "chrono-node";

export function parseDateTimeFromText(text) {
  const parsed = chrono.ko.parse(text);
  const results = [];

  for (const result of parsed) {
    const date = result.start.date();
    results.push({
      date: date.toISOString().slice(0, 10),
      time: date.toTimeString().slice(0, 5),
    });
  }

  return results;
}

export function parseDateRangeFromText(text) {
  const rangeMatch = text.match(/(\d+)일\s?뒤부터\s?(\d+)일간/);
  const dates = [];

  if (rangeMatch) {
    const startOffset = parseInt(rangeMatch[1]);
    const days = parseInt(rangeMatch[2]);

    const today = new Date();
    today.setDate(today.getDate() + startOffset);

    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push({
        date: d.toISOString().slice(0, 10),
        time: null
      });
    }
  }

  return dates;
}

export function parseWeeklyRepeatDays(text) {
  const dayMap = { "일": 0, "월": 1, "화": 2, "수": 3, "목": 4, "금": 5, "토": 6 };
  const days = [];

  const matched = text.match(/매주\s*([월화수목금토일]+)/);
  if (matched) {
    for (const char of matched[1]) {
      if (dayMap[char] !== undefined) {
        days.push(dayMap[char]);
      }
    }
  }

  return days; // ex: [1, 3, 5]
}
