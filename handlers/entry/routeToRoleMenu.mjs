import { supabase } from "../../services/supabase.mjs";
import adminWebhook from "../admin/index.mjs";
import memberWebhook from "../member/index.mjs";

export default async function routeToRoleMenu(kakaoId, res) {
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (trainer && trainer.id) {
    return adminWebhook(kakaoId, "메뉴", res);
  }

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (member && member.id) {
    return memberWebhook(kakaoId, "메뉴", res);
  }

  // ✅ 등록되지 않은 사용자 처리
  return res.json({
    version: "2.0",
    template: {
      outputs: [{
        simpleText: {
          text: "⚠️ 아직 등록되지 않은 사용자입니다.\n회원 또는 전문가 등록을 먼저 완료해주세요."
        }
      }]
    }
  });
}
