// ✅ 환경변수 먼저 로딩
import "dotenv/config";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";

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

// ✅ 웹훅 라우터 import
import memberWebhook from "./routes/memberWebhook.mjs";
import adminWebhook from "./routes/adminWebhook.mjs";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ 라우터 연결
app.use("/kakao/webhook", memberWebhook);  // 회원용
app.use("/kakao/admin", adminWebhook);     // 전문가용

// ✅ (선택) GET 요청에 대한 안내 처리 추가
app.get("/kakao/admin", (req, res) => {
  res.send("✅ 관리자 웹훅은 POST 방식으로 호출해야 합니다.");
});
app.get("/kakao/webhook", (req, res) => {
  res.send("✅ 회원 웹훅은 POST 방식으로 호출해야 합니다.");
});

// ✅ 404 처리
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// ✅ 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
