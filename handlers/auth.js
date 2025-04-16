// ✅ 통합된 auth.js (자연스러운 안내 포함)
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
        return res.json(replyText(
          `입력하신 정보로 등록된 트레이너를 찾을 수 없습니다.\n혹시 등록을 원하시나요?\n(등록은 관리자 승인 후 가능합니다)`
        ));
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

      return res.json(replyText(`✅ ${name} 트레이너님, 인증이 완료되었습니다!\n이제 회원을 등록하거나 일정을 설정해보세요.`));
    }

    case "registerMember": {
      const clean = utterance.replace(/^회원\s*/, "").trim();
      const namePhoneMatch = clean.match(/([가-힣]{2,4})\s+(01[016789][0-9]{7,8})/);

      if (!namePhoneMatch) {
        return res.json(replyText("회원 등록을 위해 성함과 전화번호를 정확히 입력해주세요.\n예: 회원 김복두 01012345678"));
      }

      const name = namePhoneMatch[1];
      const phone = namePhoneMatch[2];

      const { data: member } = await supabase
        .from("members")
        .select("id, kakao_id")
        .eq("name", name)
        .eq("phone", phone)
        .maybeSingle();

      if (!member) {
        return res.json(replyText(`${name}님은 아직 등록되지 않았어요.\n담당 트레이너에게 등록을 요청해주세요.`));
      }

      if (member.kakao_id) {
        return res.json(replyText(`${name}님은 이미 등록된 회원입니다.`));
      }

      const { error: updateError } = await supabase
        .from("members")
        .update({ kakao_id: kakaoId })
        .eq("id", member.id);

      if (updateError) {
        return res.json(replyText("회원 등록 중 문제가 발생했어요. 다시 시도해주세요."));
      }

      return res.json(replyText(`${name}님, 등록이 완료되었습니다!\n이제 "레슨", "개인 운동", "운동 시작하기" 등 다양한 기능을 사용해보세요.`));
    }

    case "registerTrainerMember": {
      const clean = utterance.replace(/^회원 등록\s*/, "").trim();
      const namePhoneMatch = clean.match(/([가-힣]{2,4})\s+(01[016789][0-9]{7,8})/);

      if (!namePhoneMatch) {
        return res.json(replyText("회원님의 성함과 전화번호를 정확히 입력해주세요.\n예: 회원 등록 김복두 01012345678"));
      }

      const name = namePhoneMatch[1];
      const phone = namePhoneMatch[2];

      const { data: trainer } = await supabase
        .from("trainers")
        .select("id")
        .eq("kakao_id", kakaoId)
        .maybeSingle();

      if (!trainer) {
        return res.json(replyText("트레이너 인증 정보가 없습니다.\n먼저 '전문가 등록'을 완료해주세요."));
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

      return res.json(replyText(`${name}님을 회원으로 성공적으로 등록했어요!\n이제 챗봇에서 직접 로그인 후 이용할 수 있습니다.`));
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
      return res.json(replyText("등록 처리할 항목을 찾지 못했어요. 다시 시도해주세요."));
  }
}

