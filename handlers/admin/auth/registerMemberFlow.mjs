// 📁 handlers/admin/auth/registerMemberFlow.mjs
import { supabase } from "../../../services/supabase.mjs";
import { replyText, replyQuickReplies } from "../../../utils/reply.mjs";
import { adminSession } from "../../../utils/sessionContext.mjs";

export default async function registerMemberFlow(kakaoId, utterance, res) {
  const ctx = adminSession[kakaoId] || { flow: "register-member", step: 1 };

  // 1단계: 이름 입력
  if (ctx.step === 1) {
    ctx.name = utterance.trim();
    ctx.step = 2;
    adminSession[kakaoId] = ctx;
    return res.json(replyText("📞 회원 전화번호를 숫자만 입력해주세요."));
  }

  // 2단계: 전화번호 입력
  if (ctx.step === 2) {
    ctx.phone = utterance.replace(/\D/g, "");
    ctx.step = 3;
    adminSession[kakaoId] = ctx;
    return res.json(replyText("🔐 인증번호 4자리를 입력해주세요."));
  }

  // 3단계: 인증번호 입력 및 저장
  if (ctx.step === 3) {
    ctx.code = utterance.trim();

    const { data: trainer } = await supabase
      .from("trainers")
      .select("id")
      .eq("kakao_id", kakaoId)
      .maybeSingle();

    if (!trainer) {
      delete adminSession[kakaoId];
      return res.json(replyText("❌ 트레이너 인증이 필요합니다. 다시 시도해주세요."));
    }

    // 중복 확인
    const { data: existing } = await supabase
      .from("members")
      .select("id, trainer_id")
      .eq("phone", ctx.phone)
      .maybeSingle();

    if (existing) {
      delete adminSession[kakaoId];
      return res.json(replyText(`⚠️ 이미 등록된 회원입니다.`));
    }

    const { error } = await supabase.from("members").insert({
      name: ctx.name,
      phone: ctx.phone,
      code: ctx.code,
      trainer_id: trainer.id
    });

    delete adminSession[kakaoId];

    if (error) {
      return res.json(replyText("❌ 등록에 실패했습니다. 다시 시도해주세요."));
    }

    return res.json(replyQuickReplies(`✅ ${ctx.name} 회원 등록이 완료되었습니다!`, [
      "나의 회원 등록",
      "나의 회원 목록",
      "메인 메뉴"
    ]));
  }
}