// ✅ .env를 먼저 로딩
import "dotenv/config";

// ✅ .env 실제 존재 여부 확인용 디버깅 코드
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, "../.env");  // ⬅️ 루트 기준으로 올려다봄

console.log("📄 .env 파일 경로:", envPath);
console.log("📄 .env 파일 존재 여부:", fs.existsSync(envPath));

// ↓ 여긴 서버 실행 로직
import express from "express";
import cors from "cors";
import webhookRouter from "./routes/webhook.mjs";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/kakao/webhook", webhookRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
