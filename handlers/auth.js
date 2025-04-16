import { supabase } from "../services/supabase.js";
import { replyText, replyButton } from "../utils/reply.js";

export default async function auth(kakaoId, utterance, res, action) {
  switch (action) {
    case "registerTrainer": {
      const cleaned = utterance.replace(/전문가\s*/, "").trim();
      const nameMatch = cleaned.match(/[가-힣]{2,10}/);
      const phoneMatch = cleaned.match(/(01[016789]\d{7,8})/);

      if (!nameMatch || !phoneMatch) {
        return res.json(
          replyText("전문가 등록을 위해 성함과 전화번호를 입력해주세요.\n예: 전문가 홍길동 01012345678")
        );
      }

      const name = nameMatch[0];
      const phone = phoneMatch[0];

      const { data: trainer, error: selectError } = await supabase
        .from("trainers")
        .select("id, kakao_id")
        .eq("name", name)
        .eq("phone", phone)
        .maybeSingle();

      if (selectError) {
        return res.json(replyText("트레이너 정보를 조회하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."));
      }

      if (!trainer) {
        return res.json(
          replyText(`등록된 트레이너가 아닙니다.\n담당 관리자에게 등록 요청 후 다시 시도해주세요.`)
        );
      }

      if (trainer.kakao_id && trainer.kakao_id !== kakaoId) {
        return res.json(replyText("⚠️ 이미 다른 계정으로 등록된 트레이너입니다."));
      }

      const { error: updateError } = await supabase
        .from("trainers")
        .update({ kakao_id: kakaoId })
        .eq("id", trainer.id);

      if (updateError) {
        return res.json(replyText("트레이너 인증 중 오류가 발생했습니다. 다시 시도해주세요."));
      }

      return res.json(replyText(`✅ ${name} 트레이너님, 인증이 완료되었습니다!\n회원 등록 또는 시간 등록을 진행해보세요.`));
    }

    case "registerMember": {
      const clean = utterance.replace(/^회원\s*/, "").trim();
      const namePhoneMatch = clean.match(/([가-힣]{2,10})\s+(01[016789][0-9]{7,8})/);

      if (!namePhoneMatch) {
        return res.json(
          replyText("회원 등록을 위해 성함과 전화번호를 입력해주세요.\n예: 회원 김복두 01012345678")
        );
      }

      const name = namePhoneMatch[1];
      const phone = namePhoneMatch[2];

      const { data: member, error: selectError } = await supabase
        .from("members")
        .select("id, kakao_id")
        .eq("name", name)
        .eq("phone", phone)
        .maybeSingle();

      if (selectError) {
        return res.json(replyText("회원 정보 확인 중 문제가 발생했습니다. 다시 시도해주세요."));
      }

      if (!member) {
        return res.json(replyText(`${name}님은 아직 등록되지 않았습니다.\n담당 트레이너에게 등록을 요청해주세요.`));
      }

      if (member.kakao_id) {
        return res.json(replyText(`${name}님은 이미 등록된 회원입니다.`));
      }

      const { error: updateError } = await supabase
        .from("members")
        .update({ kakao_id: kakaoId })
        .eq("id", member.id);

      if (updateError) {
        return res.json(replyText("회원 등록 처리 중 문제가 발생했습니다."));
      }

      return res.json(replyText(`✅ ${name}님, 등록이 완료되었습니다!\n이제 챗봇에서 다양한 기능을 이용하실 수 있어요.`));
    }

    case "registerTrainerMember": {
      const clean = utterance.replace(/^회원 등록\s*/, "").trim();
      const namePhoneMatch = clean.match(/([가-힣]{2,10})\s+(01[016789][0-9]{7,8})/);

      if (!namePhoneMatch) {
        return res.json(
          replyText("회원님의 성함과 전화번호를 입력해주세요.\n예: 회원 등록 김복두 01012345678")
        );
      }

      const name = namePhoneMatch[1];
      const phone = namePhoneMatch[2];

      const { data: trainer, error: trainerError } = await supabase
        .from("trainers")
        .select("id")
        .eq("kakao_id", kakaoId)
        .maybeSingle();

      if (trainerError || !trainer) {
        return res.json(replyText("⚠️ 전문가 인증 정보가 없습니다.\n먼저 '전문가 등록'을 완료해주세요."));
      }

      const { data: existing, error: checkError } = await supabase
        .from("members")
        .select("id")
        .eq("name", name)
        .eq("phone", phone)
        .maybeSingle();

      if (checkError) {
        return res.json(replyText("회원 조회 중 문제가 발생했습니다."));
      }

      if (existing) {
        return res.json(replyText(`${name}님은 이미 등록되어 있습니다.`));
      }

      const { error: insertError } = await supabase
        .from("members")
        .insert({ name, phone, trainer_id: trainer.id, kakao_id: null });

      if (insertError) {
        return res.json(replyText("회원 등록 처리 중 문제가 발생했습니다."));
      }

      return res.json(replyText(`✅ ${name}님이 성공적으로 등록되었습니다!\n이제 해당 회원이 직접 챗봇에 로그인할 수 있습니다.`));
    }

    case "listMembers": {
      const { data: trainer, error: trainerError } = await supabase
        .from("trainers")
        .select("id")
        .eq("kakao_id", kakaoId)
        .maybeSingle();

      if (trainerError || !trainer) {
        return res.json(replyText("⚠️ 전문가 인증 정보가 없습니다.\n'전문가 등록'을 먼저 진행해주세요."));
      }

      const { data: members, error: memberError } = await supabase
        .from("members")
        .select("name, phone")
        .eq("trainer_id", trainer.id);

      if (memberError || !members || members.length === 0) {
        return res.json(replyText("아직 등록된 회원이 없습니다."));
      }

      const list = members.map(m => `• ${m.name} (${m.phone})`).join("\n");
      return res.json(replyText(`📋 등록된 회원 목록:\n${list}`));
    }

    default:
      return res.json(replyText("등록할 항목을 찾지 못했습니다. 다시 시도해주세요."));
  }
}
