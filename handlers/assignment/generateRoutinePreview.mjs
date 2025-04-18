export default function generateRoutine(goal = "") {
    if (/하체/.test(goal)) return ["스쿼트 30개", "런지 20개"];
    if (/상체/.test(goal)) return ["푸시업 20개", "딥스 15개"];
    return ["플랭크 1분", "버피 10개"];
  }