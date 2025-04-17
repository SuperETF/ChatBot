// ✅ exportFailuresToJsonl.mjs
// Supabase에서 fallback_logs 기반으로 fine-tuning용 .jsonl 생성

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import "dotenv/config";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const { data, error } = await supabase
  .from("fallback_logs")
  .select("utterance, expected_intent, expected_handler, expected_action")
  .eq("is_handled", true)
  .order("created_at", { ascending: true });

if (error) {
  console.error("❌ Supabase 쿼리 실패:", error.message);
  process.exit(1);
}

const jsonl = data.map(entry => {
  return JSON.stringify({
    messages: [
      { role: "user", content: entry.utterance },
      {
        role: "assistant",
        content:
          `intent: ${entry.expected_intent}\n` +
          `handler: ${entry.expected_handler}\n` +
          `action: ${entry.expected_action}`
      }
    ]
  });
}).join("\n");

const filename = "fallback_registration.jsonl";
fs.writeFileSync(filename, jsonl);
console.log(`✅ .jsonl 생성 완료 → ${filename}`);