import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";

export default async function recordPainReport(kakaoIdOrName, dataOrUtterance, res) {
  let name, painList = [];

  // 자유입력: kakaoIdOrName === 이름, dataOrUtterance === [{ location, score }]
  if (Array.isArray(dataOrUtterance)) {
    name = kakaoIdOrName;
    painList = dataOrUtterance.map(p => ({ area: p.location, severity: p.score }));
  } else {
    const utterance = dataOrUtterance;
    const nameMatch = utterance.match(/[가-힣]{2,4}/);
    const areaMatch = utterance.match(/통증\s?(\S+)/);
    const severityMatch = utterance.match(/강도\s?(\d{1,2})/);

    if (!nameMatch || !areaMatch || !severityMatch) {
      return res.json(replyText("형식이 올바르지 않습니다.\n예: 김복두 통증 어깨 강도 7"));
    }

    name = nameMatch[0];
    painList.push({ area: areaMatch[1], severity: parseInt(severityMatch[1]) });
  }

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("name", name)
    .single();

  if (!member) {
    return res.json(replyText(`${name}님을 찾을 수 없습니다.`));
  }

  const inserts = painList.map(p => ({
    member_id: member.id,
    area: p.area,
    severity: p.severity
  }));

  const { error } = await supabase
    .from("pain_reports")
    .insert(inserts);

  if (error) {
    console.log("❌ 통증 정보 저장 실패:", error);
    return res.json(replyText("통증 정보를 저장하는 데 실패했습니다."));
  }

  const areas = painList.map(p => `${p.area}(${p.severity})`).join(", ");
  return res.json(replyText(`✅ ${name}님의 통증 정보가 저장되었습니다. (${areas})`));
}
