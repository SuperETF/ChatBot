// ✅ registerMember.js (회원 본인 등록 최종 안정화)

import { supabase } from "../services/supabase.js";
import { replyText, replyButton } from "../utils/reply.js";

export default async function registerMember(kakaoId, utterance, res) {
  const nameMatch = utterance.match(/[가-힣]{2,4}/);
  const phoneMatch = utterance.match(/(01[016789][0-9]{7,8})/);

  if (!nameMatch || !phoneMatch) {
    return res.json(replyText(`성함과 전화번호를 함께 입력해주세요.\n예: 회원 홍길동 01012345678`));
  }

  const name = nameMatch[0];
  const phone = phoneMatch[0];

  console.log("🧩 이름:", name);
  console.log("📞 전화번호:", phone);
  console.log("🧑‍💼 kakao_id:", kakaoId);

  const { data: member } = await supabase
    .from("members")
    .select("id, kakao_id")
    .eq("name", name)
    .eq("phone", phone)
    .maybeSingle();

  console.log("🔍 Supabase에서 찾은 회원:", member);

  if (!member) {
    return res.json(replyButton(
      "등록된 회원 정보를 찾을 수 없습니다. 처음 이용자시라면 등록을 진행해주세요.",
      ["회원 등록", "도움말 보기"]
    ));
  }

  console.log("✅ 회원 찾음:", member.id);

  const { error: updateError } = await supabase
    .from("members")
    .update({ kakao_id: kakaoId })
    .eq("id", member.id);

  if (updateError) {
    console.log("❌ kakao_id 업데이트 실패:", updateError);
    return res.json(replyText("등록 중 문제가 발생했습니다."));
  }

  console.log("✅ kakao_id 등록 성공");

  return res.json(replyText(`${name}님, 등록이 완료되었습니다.`));
}

