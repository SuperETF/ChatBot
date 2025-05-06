import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";

export default async function registerTrainer(kakaoId, utterance, res) {
  try {
    // ✅ 정규식: 하이픈 유무 허용, 010으로 시작하는 번호, 3~4자리 중간번호, 인증번호 4자리
    const match = utterance.match(
      /^전문가\s+([가-힣]{2,10}(?:\s+[가-힣]{2,10})?)\s+(01[016789][-]?\d{3,4}[-]?\d{4})\s+(\d{4})$/
    );

    if (!match) {
      return res.json(replyText(
        "❗ 입력 형식이 올바르지 않습니다.\n\n예: 전문가 홍길동 01012345678 0412"
      ));
    }

    const name = match[1];
    const rawPhone = match[2];
    const inputCode = match[3];
    const phone = rawPhone.replace(/-/g, "");

    // ✅ Supabase에서 트레이너 정보 조회
    const { data: trainer, error: fetchError } = await supabase
      .from("trainers")
      .select("id, kakao_id, code")
      .eq("name", name)
      .eq("phone", phone)
      .maybeSingle();

    if (fetchError) {
      console.error("❌ Supabase 조회 실패:", fetchError.message);
      return res.json(replyText("❗ 서버 오류로 인증을 진행할 수 없습니다."));
    }

    if (!trainer) {
      return res.json(replyText("❌ 등록된 트레이너 정보가 없습니다. 관리자에게 문의해 주세요."));
    }

    if (trainer.kakao_id && trainer.kakao_id === kakaoId) {
      return res.json(replyText(`👨‍🏫 ${name} 트레이너님, 이미 인증이 완료된 계정입니다.`));
    }

    if (trainer.kakao_id && trainer.kakao_id !== kakaoId) {
      return res.json(replyText("⚠️ 다른 계정으로 이미 등록된 트레이너입니다."));
    }

    if (trainer.code !== inputCode) {
      return res.json(replyText("❗ 인증번호가 일치하지 않습니다."));
    }

    // ✅ 등록 처리
    const { error: updateError } = await supabase
      .from("trainers")
      .update({ kakao_id: kakaoId })
      .eq("id", trainer.id);

    if (updateError) {
      console.error("❌ 트레이너 등록 실패:", updateError.message);
      return res.json(replyText("❗ 인증 처리 중 오류가 발생했습니다. 다시 시도해 주세요."));
    }

    return res.json(replyText(
      `✅ ${name} 트레이너님, 인증이 완료되었습니다.\n'메뉴'라고 입력해서 시작해 보세요.`
    ));
  } catch (err) {
    console.error("💥 [registerTrainer] 예외 발생:", err.message);
    return res.json(replyText("⚠️ 알 수 없는 오류가 발생했습니다. 다시 시도해 주세요."));
  }
}
