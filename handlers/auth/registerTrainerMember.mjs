// handlers/auth/registerTrainerMember.mjs (최종 안정화 버전)
import { openai } from "../../services/openai.mjs";
import { supabase } from "../../services/supabase.mjs";
import { replyText, replyButton } from "../../utils/reply.mjs";
import { logMultiTurnStep } from "../../utils/log.mjs";

const ACTION_MODEL_ID = process.env.GPT_MODEL_ID_REGISTER_TRAINER_MEMBER;

export default async function registerTrainerMember(kakaoId, utterance, res, sessionContext) {
  const ctx = sessionContext[kakaoId] ?? {
    intent: "회원 등록",
    step: "idle",
    data: {},
    timestamp: Date.now()
  };

  // 🔁 되돌리기 처리
  if (["이전", "뒤로", "다시"].includes(utterance.trim())) {
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

  // ❌ 취소 처리
  if (["아니요", "취소할래", "등록 안 할래", "취소"].includes(utterance.trim())) {
    delete sessionContext[kakaoId];
    return res.json(replyButton("✅ 진행을 취소했어요. 다시 시작하시겠어요?", ["회원 등록", "트레이너 등록", "홈으로"]));
  }

  // ✅ GPT 응답 파싱 시도
  let name = null, phone = null;
  try {
    const gptRes = await openai.chat.completions.create({
      model: ACTION_MODEL_ID,
      messages: [
        {
          role: "system",
          content: "트레이너가 회원을 등록합니다. 사용자의 입력에서 name과 phone을 추출해주세요. 반드시 JSON 형식으로만 응답하세요. 예시: {\"name\": \"홍길동\", \"phone\": \"01012345678\"}"
        },
        { role: "user", content: utterance }
      ]
    });
    const parsed = JSON.parse(gptRes.choices[0].message.content.trim().replace(/```json|```/g, ""));
    name = parsed.name;
    phone = parsed.phone;
  } catch (e) {
    console.error("❌ GPT 응답 파싱 실패:", e);
  }

  // ✅ GPT로부터 추출 성공한 경우 → 바로 confirm 단계로 이동
  if (name && phone) {
    ctx.data.name = name;
    ctx.data.phone = phone;
    ctx.step = "confirm";
    sessionContext[kakaoId] = ctx;

    await logMultiTurnStep({ kakaoId, intent: ctx.intent, step: "confirm", utterance });
    return res.json(replyButton(`${name}님 (${phone})을 회원으로 등록할까요?`, ["등록", "취소"]));
  }

  // 📥 멀티턴 수동 입력 처리
  if (ctx.step === "askName") {
    ctx.data.name = utterance;
    ctx.step = "askPhone";
    sessionContext[kakaoId] = ctx;
    await logMultiTurnStep({ kakaoId, intent: ctx.intent, step: "askName", utterance });
    return res.json(replyText("전화번호를 입력해주세요."));
  }

  if (ctx.step === "askPhone") {
    const phoneMatch = utterance.match(/01[016789][0-9]{7,8}/);
    if (!phoneMatch) {
      return res.json(replyText("전화번호 형식이 올바르지 않습니다. 예: 01012345678"));
    }
    ctx.data.phone = phoneMatch[0];
    ctx.step = "confirm";
    sessionContext[kakaoId] = ctx;
    await logMultiTurnStep({ kakaoId, intent: ctx.intent, step: "askPhone", utterance });
    return res.json(replyButton(`${ctx.data.name}님 (${ctx.data.phone})을 회원으로 등록할까요?`, ["등록", "취소"]));
  }

  // ✅ 등록 확정 처리
  if (["등록", "등록할게", "확인", "네", "진행해"].includes(utterance.trim())) {
    const { name, phone } = ctx.data;

    if (!name || !phone) {
      return res.json(replyText("이름과 전화번호가 부족합니다. 다시 입력해주세요."));
    }

    const { data: trainer, error: trainerError } = await supabase
      .from("trainers")
      .select("id")
      .eq("kakao_id", kakaoId)
      .maybeSingle();

    if (trainerError || !trainer) {
      return res.json(replyText("트레이너 인증 정보가 없습니다. 먼저 '전문가 등록'을 완료해주세요."));
    }

    const { data: existing } = await supabase
      .from("members")
      .select("id, trainer_id")
      .eq("name", name)
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      delete sessionContext[kakaoId];
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
      console.error("❌ 회원 등록 실패:", insertError);
      return res.json(replyText("회원 등록 중 문제가 발생했습니다. 다시 시도해주세요."));
    }

    delete sessionContext[kakaoId];
    return res.json(replyText(`✅ ${name}님을 회원으로 등록했습니다.`));
  }

  if (ctx.step === "idle") {
    ctx.step = "askName";
    sessionContext[kakaoId] = ctx;
    return res.json(replyText("등록할 회원의 이름을 입력해주세요."));
  }

  return res.json(replyText("입력하신 내용을 이해하지 못했어요. 다시 시도해주세요."));
}