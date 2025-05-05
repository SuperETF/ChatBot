// 🧠 멀티턴 상태 관리용 세션 저장소
// 사용 예: assignmentSession[kakaoId] = { ... }

// utils/sessionContext.mjs

export const assignmentSession = {};     // 루틴 과제용
export const reserveSession = {};        // 운동 예약용
export const cancelSession = {};         // 예약 취소용
export const statusSession = {};         // 현황 확인용
export const authSession = {};           // 회원/전문가 등록 시 멀티턴 보조용 (예정)
export const adminSession = {};