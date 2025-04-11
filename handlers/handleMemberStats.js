export default async function handleMemberStats(res) {
    const { data, error } = await supabase
      .from("members")
      .select("id, kakao_id, created_at");
  
    if (error) {
      console.log("❌ 회원 통계 조회 오류:", error);
      return res.json(replyText("회원 통계를 불러오는 중 문제가 발생했습니다."));
    }
  
    const total = data.length;
    const connected = data.filter(m => m.kakao_id).length;
    const recent = data.slice(-3); // 최근 가입자
  
    const summary = `
  총 회원 수는 ${total}명이며, 이 중 ${connected}명이 카카오 계정과 연결되어 있습니다.
  최근 등록된 회원은 ${recent.map(m => `#${m.id}`).join(", ")}입니다.
    `.trim();
  
    return res.json(replyText(summary));
  }
  