// scripts/fineTuneModel.mjs
import "dotenv/config";
import OpenAI from "openai";
import fs from "fs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function requestFineTune(jsonlPath) {
  try {
    const file = await openai.files.create({
      file: fs.createReadStream(jsonlPath),
      purpose: "fine-tune"
    });

    console.log(`📁 파일 업로드 완료: ${file.id}`);

    const job = await openai.fineTuning.jobs.create({
      training_file: file.id,
      model: "gpt-3.5-turbo"
    });

    console.log(`🚀 파인튜닝 시작됨 → job ID: ${job.id}`);
    return { fileId: file.id, jobId: job.id };
  } catch (err) {
    console.error("❌ 파인튜닝 요청 실패:", err.message || err);
    process.exit(1);
  }
}
