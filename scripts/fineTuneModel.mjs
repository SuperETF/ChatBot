// ✅ fineTuneModel.mjs (Node SDK 기반 / CLI 불필요)
// fallback_registration.jsonl → 업로드 → 파인튜닝 시작 → 모델 ID 출력

import "dotenv/config";
import { OpenAI } from "openai";
import fs from "fs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const filePath = "listMembers_intent.jsonl";

try {
  console.log("📤 OpenAI 파일 업로드 중...");

  const file = await openai.files.create({
    file: fs.createReadStream(filePath),
    purpose: "fine-tune"
  });

  console.log("✅ 파일 업로드 완료:", file.id);

  const fineTune = await openai.fineTuning.jobs.create({
    training_file: file.id,
    model: "gpt-3.5-turbo-0125"
  });

  console.log("🚀 파인튜닝 시작됨!");
  console.log("🆔 Job ID:", fineTune.id);
  console.log("🔁 모델 ID 추적 (follow CLI):");
  console.log(`   openai fine_tunes.follow -i ${fineTune.id}`);

} catch (e) {
  console.error("❌ 파인튜닝 중 에러 발생:", e.message);
}