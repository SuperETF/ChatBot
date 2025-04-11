import { supabase } from "../services/supabase.js";
import { replyText, replyButton } from "../utils/reply.js";

export default async function registerMember(kakaoId, utteranceOrName, res) {
  let name, phone;

  // ✅ 자유입력 대응: 이름만 있을 경우
  if (typeof utteranceOrName === "string" && !utteranceOrName.includes("010")) {
    name = utteranceOrName.trim();
  } else {
    // ✅ 정형 입력 처리 (예: 김복두 01012345678)
    const blacklist = ['회원', '전문가', '등록'];
    const nameCandidates = utteranceOrName.match(/[가-힣]{2,4}/g);
    name = nameCandidates?.find(n => !blacklist.includes(n));

    const phoneMatch = utteranceOrName.match(/(01[016789][0-9]{7,8})/);
    phone = phoneMatch?.[0];

    if (!name || !phone) {
      return res.json(replyText("성함과 전화번호를 함께 입력해주세요. 예: 김복두 01012345678"));
    }

    console.log("🧩 이름:", name);
    console.log("📞 전화번호:", phone);
    console.log("🧑‍💼 kakao_id:", kakaoId);
  }

  // ✅ 이름 기반 회원 검색 (자유입력 또는 이름만 있을 경우)
  const { data: members, error: selectError } = await supabase
    .from("members")
    .select("id, kakao_id")
    .eq("name", name);

  if (selectError) {
    console.log("❌ 회원 조회 오류:", selectError);
    return res.json(replyText("회원 조회 중 오류가 발생했습니다."));
  }

  if (!members || members.length === 0) {
    return res.json(replyButton(
      `${name}님은 등록된 회원이 아닙니다. 등록을 진행하시겠어요?`,
      ["회원 등록", "도움말"]
    ));
  }

  if (members.length > 1) {
    console.log("⚠️ 중복된 회원이 여러 명 존재함:", members);
    return res.json(replyText("동일한 이름의 회원이 여러 명 존재합니다. 전화번호로 등록해 주세요."));
  }

  const member = members[0];

  if (member.kakao_id && member.kakao_id !== kakaoId) {
    console.log("⚠️ 이미 등록된 kakao_id:", member.kakao_id);
    return res.json(replyText("이미 다른 카카오 계정으로 등록된 회원입니다."));
  }

  const { error: updateError } = await supabase
    .from("members")
    .update({ kakao_id: kakaoId })
    .eq("id", member.id);

  if (updateError) {
    console.log("❌ kakao_id 업데이트 실패:", updateError);
    return res.json(replyText("등록 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."));
  }

  console.log("✅ kakao_id 등록 성공 → 회원 ID:", member.id);
  return res.json(replyText(`${name}님, 등록이 완료되었습니다.`));
}
