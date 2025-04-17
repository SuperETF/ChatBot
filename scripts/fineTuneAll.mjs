import { exportFailuresToJsonl } from './exportFailuresToJsonl.mjs';
import { requestFineTune } from './fineTuneModel.mjs';
import { followFineTuneJob } from './followFineTune.mjs';
import { updateEnvFile } from './updateEnv.mjs';
import { recordTrainingResult } from './recordTrainingResult.mjs';
import fs from 'fs';

// ✅ 1. 인텐트 파라미터 파싱
const intent = process.argv.find(arg => arg.startsWith('--intent='))?.split('=')[1];

if (!intent) {
  console.error("❗ --intent=회원 등록 이런 식으로 intent를 입력해주세요.");
  process.exit(1);
}

console.log(`📦 [1/5] '${intent}' 학습셋을 추출합니다...`);

// ✅ 2. .jsonl 학습셋 생성
const jsonlPath = await exportFailuresToJsonl(intent);

if (!fs.existsSync(jsonlPath)) {
  console.error(`❌ 학습셋 파일이 존재하지 않습니다: ${jsonlPath}`);
  process.exit(1);
}

console.log(`🚀 [2/5] OpenAI 파인튜닝 요청을 시작합니다...`);

// ✅ 3. 파인튜닝 요청
const { fileId, jobId } = await requestFineTune(jsonlPath);
if (!jobId) {
  console.error("❌ fine-tune 요청 실패: jobId 없음");
  process.exit(1);
}

console.log(`⏳ [3/5] 학습 완료를 추적 중입니다...`);

const modelId = await followFineTuneJob(jobId);
if (!modelId) {
  console.error("❌ fine-tune 완료 실패: modelId 없음");
  process.exit(1);
}

console.log(`🧪 [4/5] .env 파일 업데이트 중...`);

await updateEnvFile(intent, modelId);

console.log(`🧠 [5/5] Supabase fine_tune_jobs 테이블에 결과 저장...`);

await recordTrainingResult({ intent, fileId, jobId, modelId });

console.log(`🎉 '${intent}' intent 파인튜닝 완료 → 모델 ID: ${modelId}`);
