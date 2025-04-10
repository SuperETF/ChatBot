// ✅ handlers/listMembers.js

import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";

export default async function listMembers(kakaoId, utterance, res) {
  const { data: members, error } = await supabase
    .from("members")
    .select("name, phone")
    .order("name", { ascending: true });

  if (error || !members || members.length === 0) {
    return res.json(replyText("등록된 회원이 없습니다."));
  }

  const list = members.map((m, idx) => `${idx + 1}. ${m.name} (${m.phone})`).join("\n");

  return res.json(replyText(`✅ 등록된 회원 목록입니다:\n\n${list}`));
}
