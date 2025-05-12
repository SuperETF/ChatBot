import {
    getSession,
    saveAnswer,
    updateSessionStep,
    deleteSession
  } from '../services/intakeService.js';
  
  const intakeSteps = ['symptom_area', 'duration', 'diagnosis', 'exercise_habit'];
  
  const stepPrompts = {
    symptom_area: {
      question: '어느 부위가 가장 불편하신가요?',
      options: ['목', '어깨', '허리', '무릎', '기타']
    },
    duration: {
      question: '언제부터 통증이 있었나요?',
      options: ['1일', '1주', '1개월 이상', '기억 안남']
    },
    diagnosis: {
      question: '병원에서 진단받은 적이 있나요?',
      options: ['예', '아니오', '기억 안남']
    },
    exercise_habit: {
      question: '평소에 운동을 하시나요?',
      options: ['네', '아니요', '가끔']
    }
  };
  
  export default async function handleIntakeStep(kakaoId, utterance, res) {
    const { data: session, error } = await getSession(kakaoId);
    if (!session || error) {
      return res.status(200).json({
        version: '2.0',
        template: {
          outputs: [{ simpleText: { text: '❌ 먼저 "병력청취 시작"을 눌러주세요!' } }]
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
  