import assignWorkout from "./assignWorkout.mjs";
import getTodayAssignment from "./getTodayAssignment.mjs";
import getUpcomingAssignments from "./getUpcomingAssignments.mjs";
import startAssignment from "./startAssignment.mjs";
import finishAssignment from "./finishAssignment.mjs";
import generateRoutine from "./generateRoutinePreview.mjs";
import assignRoutineToMember from "./assignRoutineToMember.mjs";
import { replyText } from "../../utils/reply.mjs";
import { supabase } from "../../services/supabase.mjs";

/**
 * 과제 관련 액션 dispatcher
 * @param {string} kakaoId - 카카오 사용자 ID
 * @param {string} utterance - 유저 발화 (필요한 경우만)
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
        const routine = await generateRoutine(kakaoId, utterance, res); // ✅ await 필수
      
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

      const quickReplies = members?.map(m => ({
        label: `${m.name}에게 배정`,
        action: "message",
        messageText: `${m.name} 루틴 배정`
      })) || [];

      console.log("✅ 루틴 조건 진입:", utterance);
      console.log("📦 루틴 내용:", routine);
      console.log("👤 추천 대상 회원:", members?.map(m => m.name));

      return res.json(replyText(
        `🤖 AI 루틴 추천:\n- ${routine.join("\n- ")}\n\n👥 누구에게 배정할까요?`,
        quickReplies
      ));
    }

    case "assignRoutineToMember": {
      const routine = generateRoutine("상체"); // 최근 루틴 기반 or 하드코딩

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
        .eq("name", "홍길동")
        .eq("trainer_id", trainer.id)
        .maybeSingle();

      if (!member) {
        return res.json(replyText("홍길동님은 등록된 회원이 아닙니다."));
      }

      const now = new Date();
      const dates = Array.from({ length: 3 }, (_, i) =>
        new Date(now.getTime() + (i + 1) * 86400000).toISOString().slice(0, 10)
      );

      return assignRoutineToMember(trainer.id, member.id, routine, dates, res);
    }

    default:
      return res.json(replyText("❓ 인식할 수 없는 과제 요청입니다. 다시 시도해주세요."));
  }
}