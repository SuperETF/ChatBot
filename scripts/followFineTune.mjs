// scripts/followFineTune.mjs
import OpenAI from "openai";
import "dotenv/config";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function followFineTuneJob(jobId) {
  let modelId = null;

  while (true) {
    const job = await openai.fineTuning.jobs.retrieve(jobId);

    if (job.status === "succeeded") {
      modelId = job.fine_tuned_model;
      console.log(`✅ 학습 완료! 모델 ID: ${modelId}`);
      break;
    }

    if (job.status === "failed") {
      console.error("❌ 학습 실패");
      break;
    }

    console.log(`⏳ 현재 상태: ${job.status}...`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  return modelId;
}
