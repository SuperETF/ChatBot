export default async function finishAssignment(kakaoId, res) {
    const assignment = await findTodayAssignment(kakaoId);
    if (!assignment) return res.json(replyText("진행 중인 과제가 없습니다."));
  
    await supabase
      .from("assignment_progress")
      .update({
        finished_at: new Date(),
        status: "완료"
      })
      .eq("assignment_id", assignment.id)
      .eq("member_id", assignment.member_id);
  
    return res.json(replyText(`✅ 과제 [${assignment.title}] 완료! 고생했어요 🎉`));
  }
  