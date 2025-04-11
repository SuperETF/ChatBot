import { supabase } from "../services/supabase.js";
import { replyText, replyButton } from "../utils/reply.js";

export default async function registerMember(kakaoId, utterance, res) {
  // ✅ 이름 필터 (회원, 등록 등 제외)
  const blacklist = ['회원', '전문가', '등록'];
  const nameCandidates = utterance.match(/[가-힣]{2,4}/g);
  const name = nameCandidates?.find(n => !blacklist.includes(n));

  // ✅ 전화번호 추출
  const phoneMatch = utterance.match(/(01[016789][0-9]{7,8})/);
  const phone = phoneMatch?.[0];

  // ✅ 필수 정보 누락 시 안내
  if (!name || !phone) {
    return res.json(replyText("성함과 전화번호를 함께 입력해주세요. 예: 김복두 01012345678"));
  }

  console.log("🧩 이름:", name);
  console.log("📞 전화번호:", phone);
  console.log("🧑‍💼 kakao_id:", kakaoId);

  // ✅ Supabase에서 회원 검색
  const { data: members, error: selectError } = await supabase
    .from("members")
    .select("id, kakao_id")
    .eq("name", name)
    .eq("phone", phone);

  if (selectError) {
    console.log("❌ 회원 조회 오류:", selectError);
    return res.json(replyText("회원 조회 중 오류가 발생했습니다."));
  }

  // ✅ 등록된 회원이 없을 경우
  if (!members || members.length === 0) {
    return res.json(replyButton(
      "등록된 회원 정보를 찾을 수 없습니다. 처음 이용자시라면 등록을 진행해주세요.",
      ["회원 등록", "도움말 보기"]
    ));
  }

  // ✅ 동일 이름+번호가 여러 명인 경우 (데이터 오류 가능성)
  if (members.length > 1) {
    console.log("⚠️ 중복된 회원이 여러 명 존재함:", members);
    return res.json(replyText("동일한 정보의 회원이 여러 명 존재합니다. 관리자에게 문의해주세요."));
  }

  const member = members[0];

  // ✅ 이미 다른 카카오 계정과 연결된 경우
  if (member.kakao_id && member.kakao_id !== kakaoId) {
    console.log("⚠️ 이미 등록된 kakao_id:", member.kakao_id);
    return res.json(replyText("이미 다른 카카오 계정으로 등록된 회원입니다."));
  }

  // ✅ kakao_id 연결 (최초 등록)
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
