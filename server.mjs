// ✅ 환경변수 먼저 로딩
import "dotenv/config";

// ✅ 파일 경로 유틸
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";

// ✅ 디버깅: .env 존재 여부 로그
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, "../.env");

if (!fs.existsSync(envPath)) {
  console.warn("⚠️ .env 파일이 존재하지 않습니다. 환경변수 설정을 확인하세요.");
} else {
  console.log("📄 .env 파일 로딩됨:", envPath);
}

// ✅ 서버 실행
import express from "express";
import cors from "cors";
import webhookRouter from "./routes/webhook.mjs";

const app = express();

// ✅ 미들웨어
app.use(cors());
app.use(express.json());

// ✅ 라우터
app.use("/kakao/webhook", webhookRouter);

// ✅ 기본 404 응답
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// ✅ 서버 포트 및 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
