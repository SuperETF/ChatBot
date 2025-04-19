// handlers/assignment/generateRoutinePreview.mjs

import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";

// ✅ 루틴 생성 유틸
export default async function generateRoutinePreview(kakaoId, utterance, res) {
  if (!res || typeof res.json !== "function") {
    console.error("❌ res 상태 확인:", res);
    console.trace("🔍 res 전달 시점 추적");
    throw new Error("❌ res 객체가 전달되지 않았습니다.");
  }
  const routine = await generateRoutine(utterance);

  // ✅ 트레이너 인증
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!trainer) {
    return res.json(replyText("트레이너 인증이 필요합니다. 먼저 전문가 등록을 진행해주세요."));
  }

  // ✅ 트레이너가 등록한 회원 목록 조회
  const { data: members } = await supabase
    .from("members")
    .select("name")
    .eq("trainer_id", trainer.id);

  // ✅ QuickReply 버튼 생성
  const quickReplies = members?.map(m => ({
    label: `${m.name}에게 배정`,
    action: "message",
    messageText: `${m.name} 루틴 배정`
  })) || [];

  console.log("✅ 루틴 조건 진입:", utterance);
  console.log("📦 루틴 내용:", routine);
  console.log("👤 추천 대상 회원:", members?.map(m => m.name));

  return res.json(replyText(
    `기본 루틴 추천:\n- ${routine.join("\n- ")}\n\n👥 누구에게 배정할까요?`,
    quickReplies
  ));
}

// ✅ 루틴 키워드 기반 생성 함수 (내부 포함 or import)
function generateRoutine(goal = "") {
  if (/하체/.test(goal)) return ["스쿼트 30개", "런지 20개", "점프스쿼트 10개"];
  if (/상체/.test(goal)) return ["푸시업 20개", "딥스 15개", "플랭크 1분"];
  if (/코어|전신/.test(goal)) return ["플랭크 1분", "마운틴클라이머 30초", "버피 10개"];
  if (/유산소|다이어트/.test(goal)) return ["점핑잭 50개", "마운틴클라이머 30초", "버피 10개"];
  if (/초보자/.test(goal)) return ["스쿼트 20개", "푸시업 10개", "플랭크 30초"];
  return ["플랭크 1분", "마운틴클라이머 30초", "버피 10개"];
}