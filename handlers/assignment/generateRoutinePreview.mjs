export function generateRoutine(goal = "") {
    if (/하체/.test(goal)) return ["스쿼트 30개", "런지 20개", "점프스쿼트 10개"];
    if (/상체/.test(goal)) return ["푸시업 20개", "딥스 15개", "플랭크 1분"];
    return ["플랭크 1분", "마운틴클라이머 30초", "버피 10개"];
  }
  