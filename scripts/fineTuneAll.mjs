// ✅ fineTuneAll.mjs (OpenAI CLI v4 기준 버전)
// intent별 .jsonl 학습 파일을 순차적으로 fine-tune 실행하고 모델 ID 출력

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// ✅ CLI 경로 (which openai 로 확인된 경로로 수정 가능)
const openaiCmd = "openai"; // 전역 CLI 설치되어 있다면 이대로 OK

const jobs = [
  {
    name: "회원 등록",
    file: "fallback_registration.jsonl",
    envKey: "GPT_MODEL_ID_REGISTRATION_MEMBER"
  },
  {
    name: "전문가 등록",
    file: "fallback_trainer.jsonl",
    envKey: "GPT_MODEL_ID_REGISTRATION_TRAINER"
  }
];

for (const job of jobs) {
  if (!fs.existsSync(job.file)) {
    console.warn(`⚠️ ${job.name} 학습용 파일 없음 → ${job.file}`);
    continue;
  }

  console.log(`🚀 [${job.name}] 파인튜닝 시작...`);
  try {
    const output = execSync(`${openaiCmd} fine_tunes.create -m gpt-3.5-turbo-0125 -t ${job.file}`).toString();
    const parsed = JSON.parse(output);
    const modelId = parsed.fine_tuned_model;

    console.log(`✅ [${job.name}] 완료 모델 ID: ${modelId}`);
    console.log(`👉 .env에 추가: ${job.envKey}=${modelId}\n`);
  } catch (e) {
    console.error(`❌ [${job.name}] 파인튜닝 실패:`);
    console.error(e.message || e);
  }
}