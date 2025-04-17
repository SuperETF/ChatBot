import { exportFailuresToJSONL } from './exportFailuresToJSONL.mjs';
import { requestFineTune } from './fineTuneModel.mjs';
import { followFineTuneJob } from './followFineTune.mjs';
import { updateEnvFile } from './updateEnv.mjs';
import { recordTrainingResult } from './recordTrainingResult.mjs';

const intent = process.argv[2]?.split('=')[1] || '과제 등록';

// ① JSONL 생성
const jsonlPath = await exportFailuresToJSONL(intent);

// ② 학습 요청
const { fileId, jobId } = await requestFineTune(jsonlPath);

// ③ 학습 완료 추적
const modelId = await followFineTuneJob(jobId);

// ④ .env 파일 업데이트
await updateEnvFile(intent, modelId);

// ⑤ 결과 Supabase 저장
await recordTrainingResult({ intent, fileId, jobId, modelId });

console.log(`🎉 ${intent} 파인튜닝 완료 → 모델 ID: ${modelId}`);
