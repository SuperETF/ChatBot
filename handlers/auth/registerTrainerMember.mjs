import { openai } from "../../services/openai.mjs";
import { supabase } from "../../services/supabase.mjs";
import { replyText, replyButton } from "../../utils/reply.mjs";
import { logMultiTurnStep } from "../../utils/log.mjs";

const ACTION_MODEL_ID = process.env.GPT_MODEL_ID_REGISTER_TRAINER_MEMBER;
const REWIND_KEYWORDS = ["이전", "뒤로", "다시"];
const CONFIRM_KEYWORDS = ["등록", "등록할게", "확인", "네", "진행해"];
const CANCEL_CONFIRM_KEYWORDS = ["아니요", "취소할래", "등록 안 할래"];

export default async function registerTrainerMember(kakaoId, utterance, res, sessionContext) {
  const ctx = sessionContext[kakaoId] ?? {
    intent: "회원 등록",
    step: "idle",
    data: {},
    timestamp: Date.now()
  };

  // 🔁 되돌리기
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

  // ❌ 취소 키워드
  if (CANCEL_CONFIRM_KEYWORDS.includes(utterance.trim())) {
    delete sessionContext[kakaoId];
    return res.json(replyText("등록을 취소했습니다. 처음부터 다시 시작해주세요."));
  }

  // ✅ GPT 파싱 (이름+번호 한 줄 입력)
  const gptRes = await openai.chat.completions.create({
    model: ACTION_MODEL_ID,
    messages: [
      { role: "system", content: "트레이너가 회원을 등록합니다. 이름과 전화번호를 추출해주세요." },
      { role: "user", content: utterance }
    ]
  });

  const gptOutput = gptRes.choices[0].message.content.trim();
  const match = gptOutput.match(/([가-힣]{2,10})\s+(01[016789][0-9]{7,8})/);

  if (match) {
    ctx.data.name = match[1];
    ctx.data.phone = match[2];
    ctx.step = "confirm";
    sessionContext[kakaoId] = ctx;

    await logMultiTurnStep({ kakaoId, intent: ctx.intent, step: "confirm", utterance });

    return res.json(replyButton(
      `${ctx.data.name}님 (${ctx.data.phone})을 회원으로 등록할까요?`,
      ["등록", "취소"]
    ));
  }

  // 📥 멀티턴 - 이름
  if (ctx.step === "askName") {
    ctx.data.name = utterance;
    ctx.step = "askPhone";
    sessionContext[kakaoId] = ctx;
    await logMultiTurnStep({ kakaoId, intent: ctx.intent, step: "askName", utterance });
    return res.json(replyText("전화번호를 입력해주세요."));
  }

  // 📥 멀티턴 - 전화번호
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
      `${ctx.data.name}님 (${ctx.data.phone})을 등록할까요?`,
      ["등록", "취소"]
    ));
  }

  // ✅ 확정 등록
  if (CONFIRM_KEYWORDS.includes(utterance.trim())) {
    const { name, phone } = ctx.data;

    const { data: trainer, error: trainerError } = await supabase
      .from("trainers")
      .select("id")
      .eq("kakao_id", kakaoId)
      .maybeSingle();

    if (trainerError || !trainer) {
      await supabase.from("fallback_logs").insert({
        kakao_id: kakaoId,
        handler: "auth",
        action: "registerTrainerMember",
        utterance,
        error_message: "트레이너 인증 실패",
        note: "trainer null"
      });
      return res.json(replyText("트레이너 인증 정보가 없습니다. 먼저 '전문가 등록'을 완료해주세요."));
    }

    const { data: existing } = await supabase
      .from("members")
      .select("id, trainer_id")
      .eq("name", name)
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      await supabase.from("fallback_logs").insert({
        kakao_id: kakaoId,
        handler: "auth",
        action: "registerTrainerMember",
        utterance,
        error_message: "회원 이미 존재",
        note: "duplicate check"
      });

      if (existing.trainer_id === trainer.id) {
        return res.json(replyText(`${name}님은 이미 등록된 회원입니다.`));
      } else {
        return res.json(replyText(`${name}님은 다른 트레이너에게 이미 등록되어 있습니다.`));
      }
    }

    const { error: insertError } = await supabase
      .from("members")
      .insert({ name, phone, trainer_id: trainer.id });

    if (insertError) {
      await supabase.from("fallback_logs").insert({
        kakao_id: kakaoId,
        handler: "auth",
        action: "registerTrainerMember",
        utterance,
        error_message: insertError.message,
        note: "supabase insert error"
      });
      return res.json(replyText("회원 등록 중 문제가 발생했습니다. 다시 시도해주세요."));
    }

    delete sessionContext[kakaoId];
    return res.json(replyText(`✅ ${name}님을 회원으로 등록했습니다.`));
  }

  // ⏱ 진입 시점
  if (ctx.step === "idle") {
    ctx.step = "askName";
    sessionContext[kakaoId] = ctx;
    return res.json(replyText("등록할 회원의 이름을 입력해주세요."));
  }

  return res.json(replyText("입력하신 내용을 이해하지 못했어요. 다시 시도해주세요."));
}
