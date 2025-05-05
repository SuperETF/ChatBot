// 📁 utils/parseAssignmentDates.mjs
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import "dayjs/locale/ko.js";

dayjs.extend(customParseFormat);
dayjs.locale("ko");

/**
 * 자연어 입력을 파싱해서 과제 시작일/종료일 반환
 * @param {string} input
 * @returns { startDate: string, endDate: string, duration: number }
 */
export function parseNaturalDatePeriod(input) {
  const today = dayjs();
  const lower = input.toLowerCase();

  // 예: "내일부터 3일간"
  if (/내일.*(\d+)일/.test(lower)) {
    const days = parseInt(lower.match(/(\d+)일/)[1]);
    const startDate = today.add(1, "day");
    return {
      startDate: startDate.format("YYYY-MM-DD"),
      endDate: startDate.add(days - 1, "day").format("YYYY-MM-DD"),
      duration: days
    };
  }

  // 예: "오늘부터 5일"
  if (/오늘.*(\d+)일/.test(lower)) {
    const days = parseInt(lower.match(/(\d+)일/)[1]);
    return {
      startDate: today.format("YYYY-MM-DD"),
      endDate: today.add(days - 1, "day").format("YYYY-MM-DD"),
      duration: days
    };
  }

  // 예: "5월 10일부터 5일"
  if (/(\d{1,2})월\s*(\d{1,2})일.*부터.*(\d+)일/.test(lower)) {
    const [, mm, dd, days] = lower.match(/(\d{1,2})월\s*(\d{1,2})일.*부터.*(\d+)일/).map(Number);
    const startDate = dayjs(`${dayjs().year()}-${mm}-${dd}`);
    return {
      startDate: startDate.format("YYYY-MM-DD"),
      endDate: startDate.add(days - 1, "day").format("YYYY-MM-DD"),
      duration: days
    };
  }

  // 예: "5월 10일부터 5월 14일까지"
  if (/(\d{1,2})월\s*(\d{1,2})일.*부터.*(\d{1,2})월\s*(\d{1,2})일.*까지/.test(lower)) {
    const [, mm1, dd1, mm2, dd2] = lower.match(/(\d{1,2})월\s*(\d{1,2})일.*부터.*(\d{1,2})월\s*(\d{1,2})일/).map(Number);
    const startDate = dayjs(`${dayjs().year()}-${mm1}-${dd1}`);
    const endDate = dayjs(`${dayjs().year()}-${mm2}-${dd2}`);
    return {
      startDate: startDate.format("YYYY-MM-DD"),
      endDate: endDate.format("YYYY-MM-DD"),
      duration: endDate.diff(startDate, "day") + 1
    };
  }

  return null; // 파싱 실패
}