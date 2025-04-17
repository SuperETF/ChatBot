// ✅ .env 파일 자동 로딩
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

// 📄 .env 파일 존재 확인 로그
const envPath = path.resolve(process.cwd(), ".env");
console.log("🗂️ .env 위치 확인:", envPath);
console.log("📄 .env 파일 존재 여부:", fs.existsSync(envPath));

import express from "express";
import cors from "cors";
import webhookRouter from "./routes/webhook.mjs"; // ✅ .mjs 확장자 유지

const app = express();
app.use(cors());
app.use(express.json());

// ✅ 카카오 챗봇용 webhook 경로
app.use("/kakao/webhook", webhookRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
