import assignWorkout from "./assignWorkout.mjs";
import getTodayAssignment from "./getTodayAssignment.mjs";
import getUpcomingAssignments from "./getUpcomingAssignments.mjs";
import startAssignment from "./startAssignment.mjs";
import finishAssignment from "./finishAssignment.mjs";
import assignRoutineToMember from "./assignRoutineToMember.mjs";
import { assignmentSession } from "./sessionContext.mjs";
import { replyText } from "../../utils/reply.mjs";
import { supabase } from "../../services/supabase.mjs";

/**
 * 과제 관련 액션 dispatcher
 * @param {string} kakaoId - 카카오 사용자 ID
 * @param {string} utterance - 유저 발화
 * @param {object} res - Express response 객체
 * @param {string} action - 수행할 액션
 */
export default async function assignment(kakaoId, utterance, res, action) {
  switch (action) {
    case "assignWorkout":
      return assignWorkout(kakaoId, utterance, res);

    case "getTodayAssignment":
      return getTodayAssignment(kakaoId, utterance, res);

    case "getUpcomingAssignments":
      return getUpcomingAssignments(kakaoId, res);

    case "startAssignment":
      return startAssignment(kakaoId, res);

    case "finishAssignment":
      return finishAssignment(kakaoId, res);

    case "generateRoutinePreview": {
      const routine = generateRoutine(utterance);

      const { data: trainer } = await supabase
        .from("trainers")
        .select("id")
        .eq("kakao_id", kakaoId)
        .maybeSingle();

      if (!trainer) {
        return res.json(replyText("트레이너 인증이 필요합니다. 먼저 전문가 등록을 진행해주세요."));
      }

      const { data: members } = await supabase
        .from("members")
        .select("name")
        .eq("trainer_id", trainer.id);

      if (!members || members.length === 0) {
        return res.json(replyText("등록된 회원이 없습니다. 먼저 회원을 등록해주세요."));
      }

      const quickReplies = members.map(m => ({
        label: `${m.name}에게 배정`,
        action: "message",
        messageText: `${m.name} 루틴 배정`
      }));

      return res.json(replyText(
        `🤖 AI 루틴 추천:\n- ${routine.join("\n- ")}\n\n👥 누구에게 배정할까요?`,
        quickReplies
      ));
    }

    case "assignRoutineToMember": {
      const nameMatch = utterance.match(/([가-힣]{2,10})/);
      const name = nameMatch?.[1];

      if (!name) {
        return res.json(replyText("배정할 회원 이름을 정확히 입력해주세요."));
      }

      const routine = generateRoutine(utterance);

      const { data: trainer } = await supabase
        .from("trainers")
        .select("id")
        .eq("kakao_id", kakaoId)
        .maybeSingle();

      if (!trainer) {
        return res.json(replyText("트레이너 인증이 필요합니다."));
      }

      const { data: member } = await supabase
        .from("members")
        .select("id")
        .eq("name", name)
        .eq("trainer_id", trainer.id)
        .maybeSingle();

      if (!member) {
        return res.json(replyText(`${name}님은 등록된 회원이 아닙니다.`));
      }

      // ✅ 멀티턴: 날짜 입력 유도
      assignmentSession[kakaoId] = {
        type: "pending-routine-dates",
        trainerId: trainer.id,
        memberId: member.id,
        routineList: routine
      };

      return res.json(replyText(
        "🗓 언제부터 며칠 동안 배정할까요?\n예: 내일부터 3일 / 이번 주 월수금"
      ));
    }

    default:
      return res.json(replyText("❓ 인식할 수 없는 과제 요청입니다. 다시 시도해주세요."));
  }
}

// ✅ 루틴 템플릿 생성 함수
function generateRoutine(goal = "") {
  if (/상체/.test(goal)) return ["푸시업 20개", "딥스 15개", "플랭크 1분"];
  if (/하체/.test(goal)) return ["스쿼트 30개", "런지 20개", "점프스쿼트 15개"];
  if (/유산소|다이어트/.test(goal)) return ["버피 20개", "점핑잭 30초", "마운틴클라이머 30초"];
  if (/초보자/.test(goal)) return ["스쿼트 20개", "푸시업 10개", "플랭크 30초"];
  return ["플랭크 1분", "마운틴클라이머 30초", "버피 10개"];
}
