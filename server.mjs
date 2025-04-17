// ✅ .env 파일 자동 로딩
import "dotenv/config";
console.log("🧪 .env 모델 체크:", process.env.GPT_MODEL_ID_INTENT);

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
