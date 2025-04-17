import OpenAI from "openai";
import "dotenv/config";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ 여기엔 반드시 ft- 로 시작하는 ID가 들어가야 함
const fineTuneId = "ftjob-yH9pbk8Uhqmv4wgTocUfCZTm"; // ← 이걸 교체해줘

async function run() {
  try {
    const events = await openai.fineTuning.jobs.listEvents({ id: fineTuneId });

    console.log("📡 Fine-tune 상태 추적:");
    for (const event of events.data.reverse()) {
      const time = new Date(event.created_at * 1000).toLocaleString();
      console.log(`[${time}] ${event.message}`);
    }
  } catch (err) {
    console.error("❌ 추적 실패:", err.status, err.message || err);
  }
}

run();
