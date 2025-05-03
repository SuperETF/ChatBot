import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";

export default async function registerMember(kakaoId, utterance, res) {
  try {
    const match = utterance.match(/^회원\s+([가-힣]{2,10})\s+(01[016789]\d{7,8})\s+(\d{4})$/);
    if (!match) {
      return res.json(replyText(
        "❗ 입력 형식이 올바르지 않습니다.\n\n예: 회원 김철수 01012345678 1234"
      ));
    }

    const [_, name, phone, inputCode] = match;

    // 🔍 DB에서 회원 조회
    const { data: member, error: fetchError } = await supabase
      .from("members")
      .select("id, kakao_id, code")
      .eq("name", name)
      .eq("phone", phone)
      .maybeSingle();

    if (fetchError) {
      console.error("❌ Supabase 조회 실패:", fetchError.message);
      return res.json(replyText("❗ 서버 오류로 등록을 진행할 수 없습니다."));
    }

    if (!member) {
      return res.json(replyText("❌ 등록되지 않은 회원입니다. 관리자에게 문의해 주세요."));
    }

    if (member.kakao_id && member.kakao_id === kakaoId) {
      return res.json(replyText(`🙋‍♂️ ${name} 회원님, 이미 등록된 계정입니다.`));
    }

    if (member.kakao_id && member.kakao_id !== kakaoId) {
      return res.json(replyText("⚠️ 다른 계정으로 이미 등록된 회원입니다."));
    }

    if (member.code !== inputCode) {
      return res.json(replyText("❗ 인증번호가 일치하지 않습니다."));
    }

    // ✅ 등록 처리
    const { error: updateError } = await supabase
      .from("members")
      .update({ kakao_id: kakaoId })
      .eq("id", member.id);

    if (updateError) {
      console.error("❌ 회원 등록 실패:", updateError.message);
      return res.json(replyText("❗ 등록 중 오류가 발생했습니다. 다시 시도해 주세요."));
    }

    return res.json(replyText(`✅ ${name} 회원님, 등록이 완료되었습니다.\n'메뉴'라고 입력해서 시작해 보세요.`));
  } catch (err) {
    console.error("💥 [registerMember] 예외 발생:", err.message);
    return res.json(replyText("⚠️ 알 수 없는 오류가 발생했습니다. 다시 시도해 주세요."));
  }
}
