import OpenAI from "openai";
import "dotenv/config";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function run() {
  try {
    const jobs = await openai.fineTuning.jobs.list({ limit: 1 });
    const latest = jobs.data?.[0];

    if (!latest) {
      console.log("❌ 최근 fine-tune job이 없습니다.");
      return;
    }

    console.log("✅ 최신 Fine-tune Job ID:", latest.id);
    console.log("📦 모델 ID (완료되면):", latest.fine_tuned_model || "아직 생성되지 않음");
  } catch (err) {
    console.error("❌ 오류 발생:", err.message || err);
  }
}

run();