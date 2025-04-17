import fs from "fs";

const inputPath = "./date_parsing_finetune.jsonl";
const outputPath = "./date_parsing_finetune_messages.jsonl";

const lines = fs.readFileSync(inputPath, "utf-8").trim().split("\n");

const converted = lines.map((line) => {
  const { prompt, completion } = JSON.parse(line);
  return JSON.stringify({
    messages: [
      { role: "user", content: prompt },
      { role: "assistant", content: completion.trim() }
    ]
  });
});

fs.writeFileSync(outputPath, converted.join("\n"));
console.log("✅ 변환 완료 →", outputPath);
