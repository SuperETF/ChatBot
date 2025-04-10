// ✅ handlers/recordPainReport.js

import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";

export default async function recordPainReport(kakaoId, utterance, res) {
  const nameMatch = utterance.match(/[가-힣]{2,4}/);
  const areaMatch = utterance.match(/통증\s?(\S+)/);
  const severityMatch = utterance.match(/강도\s?(\d{1,2})/);

  if (!nameMatch || !areaMatch || !severityMatch) {
    return res.json(replyText("형식이 올바르지 않습니다.\n예: 김복두 통증 어깨 강도 7"));
  }

  const name = nameMatch[0];
  const area = areaMatch[1];
  const severity = parseInt(severityMatch[1]);

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("name", name)
    .single();

  if (!member) {
    return res.json(replyText(`${name}님을 찾을 수 없습니다.`));
  }

  const { error } = await supabase
    .from("pain_reports")
    .insert({
      member_id: member.id,
      area,
      severity
    });

  if (error) {
    console.log("❌ 통증 정보 저장 실패:", error);
    return res.json(replyText("통증 정보를 저장하는 데 실패했습니다."));
  }

  return res.json(replyText(`✅ ${name}님의 통증 정보가 저장되었습니다. (${area}, 강도 ${severity})`));
}
