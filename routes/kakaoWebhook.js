// routes/kakaoWebhook.js
import express from 'express';

import handleRegister from '../handlers/handleRegister.js';
import handleConsent from '../handlers/handleConsent.js';
import handleNRSFeedback from '../handlers/handleNRSFeedback.js';
import handleTextFeedback from '../handlers/handleTextFeedback.js';
import handleStartWorkout from '../handlers/handleStartWorkout.js';
import handleAROMEvaluation from '../handlers/handleAROMEvaluation.js';
import handleProgramChoice from '../handlers/handleProgramChoice.js';
import handleIntakeStep from '../handlers/handleIntakeStep.js';
import { getSession } from '../services/intakeService.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const kakaoId = req.body.userRequest.user.id;
  const utterance = req.body.userRequest.utterance.trim();

  // ✅ 1. 프로그램 선택 (메인 화면)
  if (["만성 통증", "체형 교정", "통증과 교정"].includes(utterance)) {
    return handleProgramChoice(kakaoId, utterance, res);
  }

  // ✅ 2. 신청 전 개인정보 동의서 출력
  if (utterance === '신청하기') {
    return handleConsent(kakaoId, res);
  }

  // ✅ 3. 개인정보 동의 후 사용자 등록
  if (utterance === '개인정보 동의') {
    return handleRegister(kakaoId, res);
  }

  // ✅ 4. 동의 거절 시 종료 안내
  if (utterance === '동의 거절') {
    return res.status(200).json({
      version: '2.0',
      template: {
        outputs: [
          {
            simpleText: {
              text: '❌ 동의하지 않으셨습니다. 챗봇 이용이 제한됩니다.'
            }
          }
        ]
      }
    });
  }

  // ✅ 5. 운동 시작 → 영상 제공
  if (utterance === '운동 시작') {
    return handleStartWorkout(kakaoId, res);
  }

  // ✅ 6. 평가 시작 → AROM 흐름 시작
  if (utterance === '평가 시작') {
    return handleAROMEvaluation(kakaoId, res);
  }

  // ✅ 7. 병력청취 진행 중이면 intake 멀티턴 처리
  const { data: intakeSession } = await getSession(kakaoId);
  if (intakeSession) {
    return handleIntakeStep(kakaoId, utterance, res);
  }

  // ✅ 8. 통증 수치 (NRS)
  const nrs = parseInt(utterance, 10);
  if (!isNaN(nrs) && nrs >= 0 && nrs <= 10) {
    return handleNRSFeedback(kakaoId, nrs, res);
  }

  // ✅ 9. 그 외 텍스트 → 일반 피드백 처리
  return handleTextFeedback(kakaoId, utterance, res);
});

export default router;