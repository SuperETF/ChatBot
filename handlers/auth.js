// ✅ handlers/auth.js
import { supabase } from "../services/supabase.js";
import { replyText, replyButton } from "../utils/reply.js";

export default async function auth(kakaoId, utterance, res, action) {
  switch (action) {
    case "registerTrainer": {
      const nameMatch = utterance.match(/[가-힣]{2,4}/);
      const phoneMatch = utterance.match(/(01[016789][0-9]{7,8})/);

      if (!nameMatch || !phoneMatch) {
        return res.json(replyText("이름과 전화번호를 함께 입력해주세요. 예: 전문가 김트레이너 01012345678"));
      }

      const name = nameMatch[0];
      const phone = phoneMatch[1];

      const { data: existing } = await supabase
        .from("trainers")
        .select("id")
        .eq("kakao_id", kakaoId)
        .maybeSingle();

      if (existing) {
        return res.json(replyText("이미 등록된 트레이너입니다."));
      }

      await supabase.from("trainers").insert({ kakao_id: kakaoId, name, phone });

      return res.json(replyText(`${name} 트레이너님, 등록이 완료되었습니다.`));
    }

    case "registerMember": {
      const nameMatch = utterance.match(/[가-힣]{2,4}/);
      const phoneMatch = utterance.match(/(01[016789][0-9]{7,8})/);

      if (!nameMatch || !phoneMatch) {
        return res.json(replyText("이름과 전화번호를 함께 입력해주세요. 예: 회원 김복두 01012345678"));
      }

      const name = nameMatch[0];
      const phone = phoneMatch[1];

      const { data: member } = await supabase
        .from("members")
        .select("id, kakao_id")
        .eq("name", name)
        .eq("phone", phone)
        .maybeSingle();

      if (!member) {
        return res.json(replyText(`${name}님은 아직 트레이너에 의해 등록되지 않았습니다.`));
      }

      if (member.kakao_id) {
        return res.json(replyText(`${name}님은 이미 등록된 회원입니다.`));
      }

      await supabase
        .from("members")
        .update({ kakao_id: kakaoId })
        .eq("id", member.id);

      return res.json(replyText(`${name}님, 등록이 완료되었습니다! 환영합니다.`));
    }

    case "registerTrainerMember": {
      const clean = utterance.replace(/^회원 등록\s*/, "").trim();
      const nameMatch = clean.match(/[가-힣]{2,4}/);
      const phoneMatch = clean.match(/(01[016789][0-9]{7,8})/);

      if (!nameMatch || !phoneMatch) {
        return res.json(replyText("회원 성함과 전화번호를 정확히 입력해주세요. 예: 회원 등록 김복두 01012345678"));
      }

      const name = nameMatch[0];
      const phone = phoneMatch[1];

      const { data: trainer } = await supabase
        .from("trainers")
        .select("id")
        .eq("kakao_id", kakaoId)
        .maybeSingle();

      if (!trainer) {
        return res.json(replyText("전문가 인증 정보가 없습니다."));
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

      await supabase.from("members").insert({
        name,
        phone,
        trainer_id: trainer.id,
        kakao_id: null
      });

      return res.json(replyText(`${name}님을 회원으로 성공적으로 등록했어요.`));
    }

    default:
      return res.json(replyText("등록 처리할 항목을 찾지 못했어요."));
  }
}