import { assignmentSession } from "../../../utils/sessionContext.mjs";
import { replyText, replyQuickReplies } from "../../../utils/reply.mjs";
import { supabase } from "../../../services/supabase.mjs";

/**
 * 관리자용 루틴 추천 및 배정
 */
export default async function assignment(kakaoId, utterance, res, action) {
  switch (action) {
    case "generateRoutinePreview": {
      const routine = generateRoutine(utterance);

      const { data: trainer } = await supabase
        .from("trainers")
        .select("id")
        .eq("kakao_id", kakaoId)
        .maybeSingle();
      if (!trainer) return res.json(replyText("트레이너 인증이 필요합니다."));

      const { data: members } = await supabase
        .from("members")
        .select("name")
        .eq("trainer_id", trainer.id);

      const quickReplies = (members || []).map(m => ({
        label: `${m.name}에게 배정`,
        action: "message",
        messageText: `${m.name} 루틴 배정`
      }));

      assignmentSession[kakaoId] = {
        type: "pending-routine-member",
        trainerId: trainer.id,
        routineList: routine
      };

      return res.json(
        replyQuickReplies(
          `🤖 AI 루틴 추천:\n- ${routine.join("\n- ")}\n\n👥 누구에게 배정할까요?`,
          quickReplies
        )
      );
    }

    case "assignRoutineToMember": {
      const session = assignmentSession[kakaoId];
      if (!session?.routineList) return res.json(replyText("루틴 추천이 먼저 필요합니다."));

      const nameMatch = utterance.match(/([가-힣]{2,10})/);
      const name = nameMatch?.[1];
      if (!name) return res.json(replyText("배정할 회원 이름을 정확히 입력해주세요."));

      const { data: member } = await supabase
        .from("members")
        .select("id")
        .eq("name", name)
        .eq("trainer_id", session.trainerId)
        .maybeSingle();

      if (!member) return res.json(replyText(`${name}님은 등록된 회원이 아닙니다.`));

      assignmentSession[kakaoId] = {
        type: "pending-routine-dates",
        trainerId: session.trainerId,
        memberId: member.id,
        routineList: session.routineList
      };

      return res.json(
        replyText("🗓 언제부터 며칠 동안 배정할까요?\n예: 내일부터 3일 / 이번 주 월수금")
      );
    }

    default:
      return res.json(replyText("❓ 인식할 수 없는 관리자 과제 요청입니다."));
  }
}

function generateRoutine(goal = "") {
  if (/상체/.test(goal)) return ["푸시업 20개", "딥스 15개", "플랭크 1분"];
  if (/하체/.test(goal)) return ["스쿼트 30개", "런지 20개", "점프스쿼트 15개"];
  if (/유산소|다이어트/.test(goal)) return ["버피 20개", "점핑잭 30초", "마운틴클라이머 30초"];
  if (/초보자/.test(goal)) return ["스쿼트 20개", "푸시업 10개", "플랭크 30초"];
  return ["플랭크 1분", "마운틴클라이머 30초", "버피 10개"];
}
