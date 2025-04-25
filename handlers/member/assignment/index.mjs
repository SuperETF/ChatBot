// ✅ handlers/assignment/index.mjs

import assignWorkout from "./assignWorkout.mjs";
import getTodayAssignment from "./getTodayAssignment.mjs";
import getUpcomingAssignments from "./getUpcomingAssignments.mjs";
import startAssignment from "./startAssignment.mjs";
import finishAssignment from "./finishAssignment.mjs";

import { assignmentSession } from "../../../utils/sessionContext.mjs";
import { replyText, replyQuickReplies } from "../../../utils/reply.mjs";
import { supabase } from "../../../services/supabase.mjs";

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

    /**
     * (1) 루틴 미리보기(추천) → 세션에 저장
     */
    case "generateRoutinePreview": {
      // 사용자의 발화(utterance)에 따라 루틴 자동 생성
      const routine = generateRoutine(utterance);

      // 트레이너 인증 여부 확인
      const { data: trainer } = await supabase
        .from("trainers")
        .select("id")
        .eq("kakao_id", kakaoId)
        .maybeSingle();
      if (!trainer) {
        return res.json(replyText("트레이너 인증이 필요합니다."));
      }

      // 해당 트레이너의 회원 목록
      const { data: members } = await supabase
        .from("members")
        .select("name")
        .eq("trainer_id", trainer.id);

      // QuickReplies 배열
      const quickReplies =
        members?.map(m => ({
          label: `${m.name}에게 배정`,
          action: "message",
          messageText: `${m.name} 루틴 배정`
        })) || [];

      // 세션에 루틴 정보 저장 (다음 단계: "pending-routine-member")
      assignmentSession[kakaoId] = {
        type: "pending-routine-member",
        trainerId: trainer.id,
        routineList: routine
      };

      // QuickReplies로 누구에게 루틴을 배정할지 유도
      return res.json(
        replyQuickReplies(
          `🤖 AI 루틴 추천:\n- ${routine.join("\n- ")}\n\n👥 누구에게 배정할까요?`,
          quickReplies
        )
      );
    }

    /**
     * (2) 특정 회원에게 루틴 배정 → 다음 단계(날짜 입력)
     */
    case "assignRoutineToMember": {
      const session = assignmentSession[kakaoId];
      if (!session?.routineList) {
        return res.json(replyText("루틴 추천이 먼저 필요합니다."));
      }

      // 발화에서 회원 이름 추출 (간단히 2~10자 한글)
      const nameMatch = utterance.match(/([가-힣]{2,10})/);
      const name = nameMatch?.[1];

      if (!name) {
        return res.json(replyText("배정할 회원 이름을 정확히 입력해주세요."));
      }

      // DB에서 해당 트레이너의 회원 중 name이 일치하는지 확인
      const { data: member } = await supabase
        .from("members")
        .select("id")
        .eq("name", name)
        .eq("trainer_id", session.trainerId)
        .maybeSingle();

      if (!member) {
        return res.json(replyText(`${name}님은 등록된 회원이 아닙니다.`));
      }

      // 날짜 입력 단계로 전환
      assignmentSession[kakaoId] = {
        type: "pending-routine-dates",
        trainerId: session.trainerId,
        memberId: member.id,
        routineList: session.routineList
      };

      return res.json(
        replyText(
          "🗓 언제부터 며칠 동안 배정할까요?\n예: 내일부터 3일 / 이번 주 월수금"
        )
      );
    }

    default:
      return res.json(replyText("❓ 인식할 수 없는 과제 요청입니다. 다시 시도해주세요."));
  }
}

/**
 * 루틴 템플릿 생성 함수
 * 사용자의 발화에 맞춰 간단히 운동 목록을 만든다.
 * @param {string} goal - 예: "상체", "하체", "유산소", "초보자"...
 * @returns {string[]} 운동 리스트
 */
function generateRoutine(goal = "") {
  if (/상체/.test(goal)) {
    return ["푸시업 20개", "딥스 15개", "플랭크 1분"];
  }
  if (/하체/.test(goal)) {
    return ["스쿼트 30개", "런지 20개", "점프스쿼트 15개"];
  }
  if (/유산소|다이어트/.test(goal)) {
    return ["버피 20개", "점핑잭 30초", "마운틴클라이머 30초"];
  }
  if (/초보자/.test(goal)) {
    return ["스쿼트 20개", "푸시업 10개", "플랭크 30초"];
  }
  // 기본 루틴 (특정 키워드 없을 시)
  return ["플랭크 1분", "마운틴클라이머 30초", "버피 10개"];
}
