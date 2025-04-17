import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

export async function recordTrainingResult({ intent, fileId, jobId, modelId }) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { error } = await supabase
    .from("ai_training.fine_tune_jobs") // ✅ 기존 테이블에 저장
    .insert({
      intent,
      training_file_id: fileId,
      job_id: jobId,
      model_id: modelId,
      created_at: new Date().toISOString()
    });

  if (error) {
    console.error("❌ fine_tune_jobs 저장 실패:", error);
    return false;
  }

  console.log(`🧠 fine_tune_jobs 저장 완료 (intent=${intent})`);
  return true;
}
