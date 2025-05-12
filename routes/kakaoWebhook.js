import express from 'express';
import handleRegister from '../handlers/handleRegister.js';
import handleNRSFeedback from '../handlers/handleNRSFeedback.js';
import handleTextFeedback from '../handlers/handleTextFeedback.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const kakaoId = req.body.userRequest.user.id;
  const utterance = req.body.userRequest.utterance.trim();

  // 1. "신청하기" → 사용자 등록
  if (utterance === '신청하기') {
    return handleRegister(kakaoId, res);
  }

  if (utterance === '운동 시작') {
    return handleStartWorkout(kakaoId, res);
  }
  
  if (utterance === '평가 시작') {
    return handleAROMEvaluation(kakaoId, res);
  }
  

  // 2. 숫자 (NRS)
  const nrs = parseInt(utterance, 10);
  if (!isNaN(nrs) && nrs >= 0 && nrs <= 10) {
    return handleNRSFeedback(kakaoId, nrs, res);
  }

  // 3. 그 외 텍스트 → 텍스트 피드백
  return handleTextFeedback(kakaoId, utterance, res);
});

export default router;
