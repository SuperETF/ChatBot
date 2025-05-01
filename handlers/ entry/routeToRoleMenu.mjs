// routeToRoleMenu.mjs
import { supabase } from "../../services/supabase.mjs";
import adminWebhook from "../admin/index.mjs";
import memberWebhook from "../member/index.mjs";

export default async function routeToRoleMenu(kakaoId, res) {
  const { data: trainer } = await supabase.from("trainers").select("id").eq("kakao_id", kakaoId).maybeSingle();
  if (trainer) return adminWebhook(kakaoId, "메뉴", res);

  const { data: member } = await supabase.from("members").select("id").eq("kakao_id", kakaoId).maybeSingle();
  if (member) return memberWebhook(kakaoId, "메뉴", res);

  return res.json({
    version: "2.0",
    template: {
      outputs: [{
        simpleText: { text: "먼저 회원 또는 전문가 등록을 완료해 주세요." }
      }]
    }
  });
}
