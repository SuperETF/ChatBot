import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";

export default async function registerMemberBySelf(kakaoId, utterance, res) {
  try {
    const match = utterance.match(
      /^회원\s+([가-힣]{2,10})\s+01[016789][-]?\d{3,4}[-]?\d{4}\s+(\d{4})$/
    );

    if (!match) {
      return res.json(replyText("❗ 형식이 올바르지 않습니다.\n예: 회원 김철수 01012345678 1234"));
    }

    const name = match[1];
    const phone = match[2].replace(/-/g, "");
    const code = match[3];

    const { data: member, error } = await supabase
      .from("members")
      .select("id, kakao_id, code")
      .eq("name", name)
      .eq("phone", phone)
      .maybeSingle();

    if (error) {
      console.error("❌ 회원 조회 실패:", error.message);
      return res.json(replyText("서버 오류로 등록할 수 없습니다."));
    }

    if (!member) {
      return res.json(replyText("❌ 등록된 회원 정보가 없습니다. 관리자에게 문의해주세요."));
    }

    if (member.kakao_id && member.kakao_id !== kakaoId) {
      return res.json(replyText("❗ 이미 다른 계정으로 등록된 회원입니다."));
    }

    if (member.code !== code) {
      return res.json(replyText("❗ 인증번호가 일치하지 않습니다."));
    }

    const { error: updateError } = await supabase
      .from("members")
      .update({ kakao_id: kakaoId })
      .eq("id", member.id);

    if (updateError) {
      console.error("❌ 등록 실패:", updateError.message);
      return res.json(replyText("❗ 등록 처리 중 오류가 발생했습니다."));
    }

    return res.json(replyText(`✅ ${name} 회원님, 등록이 완료되었습니다.\n'메뉴'라고 입력해 보세요.`));
  } catch (err) {
    console.error("💥 [registerMemberBySelf] 예외:", err.message);
    return res.json(replyText("⚠️ 등록 중 문제가 발생했습니다. 다시 시도해 주세요."));
  }
}
