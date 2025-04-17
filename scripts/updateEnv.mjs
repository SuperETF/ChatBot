import fs from "fs";

export async function updateEnvFile(intent, modelId) {
  const filePath = ".env";

  const env = fs.readFileSync(filePath, "utf-8").split("\n");

  // intent → 환경변수용 키 (띄어쓰기, 특수문자 제거)
  const envKey = `GPT_MODEL_ID_${intent.replace(/\s+/g, "_")}`;

  const updated = [];
  let found = false;

  for (const line of env) {
    if (line.startsWith(envKey)) {
      updated.push(`${envKey}=${modelId}`);
      found = true;
    } else {
      updated.push(line);
    }
  }

  if (!found) {
    updated.push(`${envKey}=${modelId}`);
  }

  fs.writeFileSync(filePath, updated.join("\n"), "utf-8");

  console.log(`✅ .env 파일에 ${envKey} 업데이트 완료`);
}
