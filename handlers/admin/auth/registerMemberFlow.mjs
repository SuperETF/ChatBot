// 📁 handlers/admin/assignment/registerMemberFlow.mjs
import { supabase } from "../../../services/supabase.mjs";
import { replyText } from "../../../utils/reply.mjs";
import { adminSession } from "../../../utils/sessionContext.mjs";

export default async function registerMemberFlow(kakaoId, utterance, res) {
  const ctx = adminSession[kakaoId] || {};

  // 🟢 0. 흐름 시작 (세션 없을 때)
  if (!ctx.step) {
    ctx.step = 1;
    adminSession[kakaoId] = ctx;
    return res.json(replyText("📝 등록할 회원의 이름을 입력해주세요."));
  }

  // 🔵 1단계: 이름 입력
  if (ctx.step === 1) {
    ctx.name = utterance.trim();
    ctx.step = 2;
    return res.json(replyText("📞 회원 전화번호를 숫자만 입력해주세요."));
  }

  // 🔵 2단계: 전화번호 입력
  if (ctx.step === 2) {
    ctx.phone = utterance.replace(/\D/g, "");
    ctx.step = 3;
    return res.json(replyText("🔐 인증번호 4자리를 입력해주세요."));
  }

  // 🔵 3단계: 인증번호 입력 및 등록 처리
  if (ctx.step === 3) {
    ctx.code = utterance.trim();

    // 🟡 트레이너 인증 확인
    const { data: trainer } = await supabase
      .from("trainers")
      .select("id")
      .eq("kakao_id", kakaoId)
      .maybeSingle();

    if (!trainer) {
      delete adminSession[kakaoId];
      return res.json(replyText("❌ 전문가 인증이 필요합니다."));
    }

    // 🟡 기존 회원 여부 확인
    const { data: existing } = await supabase
      .from("members")
      .select("id, trainer_id")
      .eq("name", ctx.name)
      .eq("phone", ctx.phone)
      .maybeSingle();

    if (existing) {
      delete adminSession[kakaoId];
      if (existing.trainer_id === trainer.id) {
        return res.json(replyText(`⚠️ 이미 등록된 회원입니다: ${ctx.name}`));
      } else {
        return res.json(replyText(`❌ 다른 트레이너 소속 회원입니다: ${ctx.name}`));
      }
    }

    // 🟡 회원 등록
    const { error } = await supabase
      .from("members")
      .insert({
        name: ctx.name,
        phone: ctx.phone,
        code: ctx.code,
        trainer_id: trainer.id,
      });

    delete adminSession[kakaoId];

    // 🟢 결과 안내
    return res.json(
      replyText(error
        ? `❌ 등록 실패: ${ctx.name}`
        : `✅ 등록 완료: ${ctx.name}`)
    );
  }
}
