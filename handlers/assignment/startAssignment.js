export default async function startAssignment(kakaoId, res) {
    const assignment = await findTodayAssignment(kakaoId);
    if (!assignment) return res.json(replyText("오늘 할당된 과제가 없습니다."));
  
    await supabase
      .from("assignment_progress")
      .upsert({
        assignment_id: assignment.id,
        member_id: assignment.member_id,
        started_at: new Date(),
        status: "진행중"
      });
  
    return res.json({
      text: `⏱️ 과제 [${assignment.title}] 시작되었습니다.`,
      quickReplies: [{ label: "종료하기", action: "message", messageText: "과제 종료" }]
    });
  }
  