import { openai } from "../../services/openai.mjs";
import { supabase } from "../../services/supabase.mjs";
import { replyText, replyButton } from "../../utils/reply.mjs";

const ACTION_MODEL_ID = process.env.GPT_MODEL_ID_LIST_MEMBERS; // 너가 저장한 모델 ID

export default async function listMembers(kakaoId, utterance, res) {
  // ✅ GPT를 통한 액션 추론
  const gptRes = await openai.chat.completions.create({
    model: ACTION_MODEL_ID,
    messages: [
      {
        role: "system",
        content: "트레이너가 등록한 회원 목록을 조회하려고 합니다. 사용자의 발화로부터 action을 추출해서 JSON 형식으로 응답하세요."
      },
      {
        role: "user",
        content: utterance
      }
    ]
  });

  const gptOut = gptRes.choices[0].message.content.trim();
  let action = null;

  try {
    const parsed = JSON.parse(gptOut);
    action = parsed.action;
  } catch {
    return res.json(replyText("요청을 이해하지 못했어요. 다시 입력해주세요."));
  }

  if (action !== "listMembers") {
    return res.json(replyText("회원 목록을 조회하려면 다시 정확히 말씀해주세요."));
  }

  // ✅ 인증 여부 확인
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!trainer) {
    return res.json(replyButton(
      "트레이너 인증 정보가 없습니다. 먼저 인증을 진행해주세요.",
      ["전문가 등록"]
    ));
  }

  // ✅ 회원 조회
  const { data: members } = await supabase
    .from("members")
    .select("name, phone")
    .eq("trainer_id", trainer.id);

  if (!members || members.length === 0) {
    return res.json(replyText("아직 등록된 회원이 없습니다."));
  }

  const formatted = members.map(m => `• ${m.name} (${m.phone})`).join("\n");
  return res.json(replyText(`📋 등록된 회원 목록:\n${formatted}`));
}
