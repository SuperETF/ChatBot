// ✅ 통합된 auth.js (모든 등록/조회 기능 포함)
import { supabase } from "../services/supabase.js";
import { replyText, replyButton } from "../utils/reply.js";

export default async function auth(kakaoId, utterance, res, action) {
  switch (action) {
    case "registerTrainer": {
      const cleaned = utterance.replace("전문가", "").trim();
      const nameMatch = cleaned.match(/[가-힣]{2,4}/);
      const phoneMatch = cleaned.match(/(01[016789]\d{7,8})/);

      if (!nameMatch || !phoneMatch) {
        return res.json(replyText("전문가 인증을 위해 성함과 전화번호를 입력해주세요.\n예: 전문가 홍길동 01012345678"));
      }

      const name = nameMatch[0];
      const phone = phoneMatch[0];

      const { data: trainer } = await supabase
        .from("trainers")
        .select("id, kakao_id")
        .eq("name", name)
        .eq("phone", phone)
        .maybeSingle();

      if (!trainer) {
        return res.json(replyButton("전문가로 등록된 정보가 없습니다. 등록을 원하시나요?", ["전문가 등록", "다른 기능"]));
      }

      if (trainer.kakao_id && trainer.kakao_id !== kakaoId) {
        return res.json(replyText("이미 다른 계정으로 등록된 트레이너입니다."));
      }

      const { error } = await supabase
        .from("trainers")
        .update({ kakao_id: kakaoId })
        .eq("id", trainer.id);

      if (error) {
        return res.json(replyText("트레이너 인증 중 문제가 발생했습니다. 다시 시도해주세요."));
      }

      return res.json(replyText(`✅ ${name} 트레이너님, 인증이 완료되었습니다!\n원하시는 작업을 입력해주세요.`));
    }

    case "registerMember": {
      const clean = utterance.replace(/^회원\s*/, "").trim();
      const namePhoneMatch = clean.match(/([가-힣]{2,4})\s+(01[016789][0-9]{7,8})/);

      if (!namePhoneMatch) {
        return res.json(replyText("이름과 전화번호를 정확히 입력해주세요. 예: 김복두 01012345678"));
      }

      const name = namePhoneMatch[1];
      const phone = namePhoneMatch[2];

      const { data: member, error } = await supabase
        .from("members")
        .select("id, kakao_id")
        .eq("name", name)
        .eq("phone", phone)
        .maybeSingle();

      if (!member) {
        return res.json(replyText(`${name}님은 아직 등록되지 않은 회원입니다. 트레이너에게 먼저 등록을 요청해주세요.`));
      }

      if (member.kakao_id) {
        return res.json(replyText(`${name}님은 이미 등록된 회원입니다.`));
      }

      const { error: updateError } = await supabase
        .from("members")
        .update({ kakao_id: kakaoId })
        .eq("id", member.id);

      if (updateError) {
        return res.json(replyText("회원 등록 중 오류가 발생했어요. 다시 시도해주세요."));
      }

      return res.json(replyText(`${name}님, 등록이 완료되었습니다! 환영합니다.`));
    }

    case "registerTrainerMember": {
      const clean = utterance.replace(/^회원 등록\s*/, "").trim();
      const namePhoneMatch = clean.match(/([가-힣]{2,4})\s+(01[016789][0-9]{7,8})/);

      if (!namePhoneMatch) {
        return res.json(replyText("회원님의 성함과 전화번호를 정확히 입력해주세요. 예: 김복두 01012345678"));
      }

      const name = namePhoneMatch[1];
      const phone = namePhoneMatch[2];

      const { data: trainer } = await supabase
        .from("trainers")
        .select("id")
        .eq("kakao_id", kakaoId)
        .maybeSingle();

      if (!trainer) {
        return res.json(replyText("이 기능은 전문가 전용입니다. 전문가 등록 후 사용해주세요."));
      }

      const { data: existing } = await supabase
        .from("members")
        .select("id")
        .eq("name", name)
        .eq("phone", phone)
        .maybeSingle();

      if (existing) {
        return res.json(replyText(`${name}님은 이미 등록되어 있습니다.`));
      }

      const { error: insertError } = await supabase
        .from("members")
        .insert({ name, phone, trainer_id: trainer.id, kakao_id: null });

      if (insertError) {
        return res.json(replyText("회원 등록 중 문제가 발생했어요. 다시 시도해주세요."));
      }

      return res.json(replyText(`${name}님을 회원으로 성공적으로 등록했어요.`));
    }

    case "listMembers": {
      const { data: trainer } = await supabase
        .from("trainers")
        .select("id")
        .eq("kakao_id", kakaoId)
        .maybeSingle();

      if (!trainer) {
        return res.json(replyText("전문가 인증 정보가 없습니다. 먼저 '전문가 등록'을 진행해주세요."));
      }

      const { data: members, error } = await supabase
        .from("members")
        .select("name, phone")
        .eq("trainer_id", trainer.id);

      if (error || !members || members.length === 0) {
        return res.json(replyText("아직 등록된 회원이 없습니다."));
      }

      const list = members.map(m => `• ${m.name} (${m.phone})`).join("\n");
      return res.json(replyText(`📋 등록된 회원 목록:\n${list}`));
    }

    default:
      return res.json(replyText("등록 처리할 항목을 찾지 못했어요."));
  }
}

