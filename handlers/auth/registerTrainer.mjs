import { openai } from "../../services/openai.mjs";
import { supabase } from "../../services/supabase.mjs";
import { replyText, replyButton } from "../../utils/reply.mjs";
import { logMultiTurnStep } from "../../utils/log.mjs";

const ACTION_MODEL_ID = process.env.GPT_MODEL_ID_REGISTER_TRAINER;
const REWIND_KEYWORDS = ["이전", "뒤로", "다시"];
const CONFIRM_KEYWORDS = ["등록", "등록할게", "확인", "네", "진행해"];
const CANCEL_CONFIRM_KEYWORDS = ["아니요", "취소할래", "등록 안 할래"];

export default async function registerTrainer(kakaoId, utterance, res, sessionContext) {
  const ctx = sessionContext[kakaoId] ?? {
    intent: "회원 등록", // GPT와 통일된 intent 이름
    step: "idle",
    data: {},
    timestamp: Date.now()
  };

  // 🔁 뒤로 처리
  if (REWIND_KEYWORDS.includes(utterance.trim())) {
    if (ctx.step === "askPhone") {
      ctx.step = "askName";
      delete ctx.data.phone;
      return res.json(replyText("이름을 다시 입력해주세요."));
    }
    if (ctx.step === "confirm") {
      ctx.step = "askPhone";
      return res.json(replyText("전화번호를 다시 입력해주세요."));
    }
  }

  // ❌ 취소 키워드 처리
  if (CANCEL_CONFIRM_KEYWORDS.includes(utterance.trim())) {
    delete sessionContext[kakaoId];
    return res.json(replyText("트레이너 인증이 취소되었습니다. 처음부터 다시 시작해주세요."));
  }

  // ✅ GPT 파인튜닝 응답 분석 (한 줄 입력)
  const gptRes = await openai.chat.completions.create({
    model: ACTION_MODEL_ID,
    messages: [
      { role: "system", content: "트레이너 인증을 도와주는 AI입니다. 이름/전화번호가 오면 추출해주세요." },
      { role: "user", content: utterance }
    ]
  });

  const gptOut = gptRes.choices[0].message.content.trim();
  const match = gptOut.match(/([가-힣]{2,10})\s+(01[016789][0-9]{7,8})/);

  if (match) {
    ctx.data.name = match[1];
    ctx.data.phone = match[2];
    ctx.step = "confirm";
    sessionContext[kakaoId] = ctx;

    await logMultiTurnStep({ kakaoId, intent: ctx.intent, step: "confirm", utterance });

    return res.json(replyButton(
      `${ctx.data.name} 트레이너님 (${ctx.data.phone}) 정보가 맞나요?`,
      ["등록", "취소"]
    ));
  }

  // 📥 멀티턴 - 이름 입력
  if (ctx.step === "askName") {
    ctx.data.name = utterance;
    ctx.step = "askPhone";
    sessionContext[kakaoId] = ctx;
    await logMultiTurnStep({ kakaoId, intent: ctx.intent, step: "askName", utterance });
    return res.json(replyText("전화번호를 입력해주세요."));
  }

  // 📥 멀티턴 - 전화번호 입력
  if (ctx.step === "askPhone") {
    const phoneMatch = utterance.match(/01[016789][0-9]{7,8}/);
    if (!phoneMatch) {
      return res.json(replyText("전화번호 형식이 올바르지 않습니다. 예: 01012345678"));
    }
    ctx.data.phone = phoneMatch[0];
    ctx.step = "confirm";
    sessionContext[kakaoId] = ctx;
    await logMultiTurnStep({ kakaoId, intent: ctx.intent, step: "askPhone", utterance });

    return res.json(replyButton(
      `${ctx.data.name} 트레이너님 (${ctx.data.phone}) 정보가 맞나요?`,
      ["등록", "취소"]
    ));
  }

  // ✅ 최종 인증 확정
  if (CONFIRM_KEYWORDS.includes(utterance.trim())) {
    const { name, phone } = ctx.data;

    const { data: trainer } = await supabase
      .from("trainers")
      .select("id, kakao_id")
      .eq("name", name)
      .eq("phone", phone)
      .maybeSingle();

    if (!trainer) {
      await supabase.from("fallback_logs").insert({
        kakao_id: kakaoId,
        handler: "auth",
        action: "registerTrainer",
        utterance,
        error_message: "등록되지 않은 트레이너",
        note: "not found"
      });
      return res.json(replyText("등록된 트레이너가 아닙니다. 관리자에게 등록 요청 후 다시 시도해주세요."));
    }

    if (trainer.kakao_id && trainer.kakao_id !== kakaoId) {
      await supabase.from("fallback_logs").insert({
        kakao_id: kakaoId,
        handler: "auth",
        action: "registerTrainer",
        utterance,
        error_message: "이미 다른 계정으로 등록됨",
        note: "kakao_id conflict"
      });
      return res.json(replyText("이미 다른 계정으로 등록된 트레이너입니다."));
    }

    const { error } = await supabase
      .from("trainers")
      .update({ kakao_id: kakaoId })
      .eq("id", trainer.id);

    if (error) {
      await supabase.from("fallback_logs").insert({
        kakao_id: kakaoId,
        handler: "auth",
        action: "registerTrainer",
        utterance,
        error_message: error.message,
        note: "supabase update error"
      });
      return res.json(replyText("트레이너 인증 중 오류가 발생했습니다. 다시 시도해주세요."));
    }

    delete sessionContext[kakaoId];
    return res.json(replyText(`✅ ${name} 트레이너님, 인증이 완료되었습니다.`));
  }

  // 🕓 진입
  if (ctx.step === "idle") {
    ctx.step = "askName";
    sessionContext[kakaoId] = ctx;
    return res.json(replyText("트레이너님의 성함을 입력해주세요."));
  }

  return res.json(replyText("입력하신 내용을 이해하지 못했어요. 다시 시도해주세요."));
}
