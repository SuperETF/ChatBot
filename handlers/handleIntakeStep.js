export default async function handleIntakeStep(kakaoId, utterance, res) {
    const { data: session, error } = await getSession(kakaoId);
  
    // ✅ session 없을 때는 병력청취 시작 유도
    if (!session || error) {
      return res.status(200).json({
        version: '2.0',
        template: {
          outputs: [
            {
              simpleText: {
                text: '❌ 먼저 "병력청취 시작"을 눌러주세요!'
              }
            }
          ]
        }
      });
    }
  
    const currentStep = session.current_step;
    const currentIndex = intakeSteps.indexOf(currentStep);
    const nextStep = intakeSteps[currentIndex + 1];
  
    // 응답 저장
    await saveAnswer(kakaoId, currentStep, utterance);
  
    // 종료 여부 판단
    if (!nextStep) {
      await deleteSession(kakaoId);
      return res.status(200).json({
        version: '2.0',
        template: {
          outputs: [{ simpleText: { text: '✅ 병력청취가 완료되었습니다! 감사합니다.' } }]
        }
      });
    }
  
    // 다음 단계 진행
    await updateSessionStep(kakaoId, nextStep);
  
    const prompt = stepPrompts[nextStep];
    return res.status(200).json({
      version: '2.0',
      template: {
        outputs: [
          { simpleText: { text: prompt.question } }
        ],
        quickReplies: prompt.options.map(option => ({
          label: option,
          action: 'message',
          messageText: option
        }))
      }
    });
  }
  