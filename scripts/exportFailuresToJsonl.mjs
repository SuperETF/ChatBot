import "dotenv/config";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

// ✅ named export로 함수 선언
export async function exportFailuresToJsonl(intent) {
  // 1. Supabase 연결
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // 2. 데이터 쿼리
  const { data, error } = await supabase
    .from("fallback_logs")
    .select("utterance, expected_intent, expected_handler, expected_action")
    .eq("expected_intent", intent)
    .eq("is_handled", true);

  if (error) {
    console.error("❌ Supabase 쿼리 오류:", error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.warn(`⚠️ '${intent}'에 대해 학습 가능한 로그가 없습니다.`);
    process.exit(0);
  }

  // 3. JSONL 포맷 구성
  const messages = data.map(row => ({
    messages: [
      { role: "user", content: row.utterance },
      {
        role: "assistant",
        content: `intent: ${row.expected_intent}\nhandler: ${row.expected_handler}\naction: ${row.expected_action}`
      }
    ]
  }));

  // 4. 파일 저장
  const filename = `./${intent}_finetune_${new Date().toISOString().slice(0, 10)}.jsonl`;
  fs.writeFileSync(filename, messages.map(m => JSON.stringify(m)).join("\n"));

  console.log(`✅ ${data.length}개 학습셋 → ${filename} 저장 완료`);

  return filename; // 🔥 fineTuneAll에서 경로로 받아서 쓸 수 있게 반환
}
