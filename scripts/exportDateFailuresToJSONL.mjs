import fs from "fs";
import { supabase } from "../services/supabase.mjs";

async function run() {
  const { data, error } = await supabase
    .from("date_parsing_failures")
    .select("utterance, expected_date, expected_time, expected_intent")
    .eq("handled", true);

  if (error) {
    console.error("❌ Supabase fetch 실패:", error.message);
    return;
  }

  const lines = data.map(row => {
    const prompt = `문장: ${row.utterance}\n\nGPT가 날짜 파싱에 실패했습니다. 아래는 수동 보정된 정답입니다.\n###\n`;
    const completion = ` 날짜: ${row.expected_date} | 시간: ${row.expected_time || "없음"} | intent: ${row.expected_intent}\n`;

    return JSON.stringify({ prompt, completion });
  });

  fs.writeFileSync("date_parsing_finetune.jsonl", lines.join("\n"), "utf8");
  console.log(`✅ ${lines.length}개의 학습셋을 date_parsing_finetune.jsonl로 저장했습니다.`);
}

run();
