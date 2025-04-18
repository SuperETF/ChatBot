// ✅ default export 방식으로 export (import 오류 방지)
export default function generateRoutine(goal = "") {
    if (/하체/.test(goal)) {
      return ["스쿼트 30개", "런지 20개", "점프스쿼트 10개"];
    }
  
    if (/상체/.test(goal)) {
      return ["푸시업 20개", "딥스 15개", "플랭크 1분"];
    }
  
    if (/코어|전신/.test(goal)) {
      return ["플랭크 1분", "마운틴클라이머 30초", "버피 10개"];
    }
  
    if (/유산소|다이어트/.test(goal)) {
      return ["점핑잭 50개", "마운틴클라이머 30초", "버피 10개"];
    }
  
    if (/초보자/.test(goal)) {
      return ["스쿼트 20개", "푸시업 10개", "플랭크 30초"];
    }
  
    // ✅ 매칭되는 키워드가 없을 경우 → 기본 루틴
    return ["플랭크 1분", "마운틴클라이머 30초", "버피 10개"];
  }
  