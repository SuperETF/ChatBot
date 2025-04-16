import { supabase } from "../services/supabase.mjs";
import fs from "fs";
import path from "path";

export async function generateFallbackTrainingSet() {
  const { data, error } = await supabase
    .from("fallback_logs")
    .select("utterance, suggestion, user_response")
    .not("user_response", "is", null);

  if (error) {
    console.error("❌ 학습셋 추출 실패:", error);
    return;
  }

  const trainingExamples = data
    .filter(entry => !entry.suggestion.includes(entry.user_response)) // GPT가 틀린 추천만 추출
    .map(entry => {
      return {
        messages: [
          { role: "user", content: entry.utterance },
          { role: "assistant", content: `추천 intent: ${entry.user_response}` }
        ]
      };
    });

  const jsonl = trainingExamples.map(example => JSON.stringify(example)).join("\n");
  const filePath = path.resolve("fallback-training-data.jsonl");
  fs.writeFileSync(filePath, jsonl);

  console.log(`✅ 학습셋 ${trainingExamples.length}개 생성됨 → ${filePath}`);
}
