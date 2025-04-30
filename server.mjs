// ✅ 환경변수 로딩
import "dotenv/config";

// ✅ 파일 경로 유틸
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

import adminWebhookHandler from "./routes/adminWebhook.mjs";
import memberWebhookHandler from "./routes/memberWebhook.mjs";
import { supabase } from "./services/supabase.mjs";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ /kakao/webhook 단일 엔드포인트에서 관리자/회원 자동 분기
app.post("/kakao/webhook", async (req, res) => {
  const utterance = (req.body.userRequest?.utterance || "").trim();
  const kakaoId = req.body.userRequest?.user?.id;

  console.log("🎯 [웹훅 진입]:", utterance);

  try {
    const adminTriggers = ["전문가", "나의 회원", "과제", "트레이너"];

    const isAdminKeyword = adminTriggers.some(keyword => utterance.includes(keyword));

    const { data: trainer } = await supabase
      .from("trainers")
      .select("id")
      .eq("kakao_id", kakaoId)
      .maybeSingle();

    if (trainer || isAdminKeyword) {
      console.log("🔐 관리자 흐름으로 분기됨");
      return adminWebhookHandler(req, res);
    } else {
      console.log("🙋‍♂️ 회원 흐름으로 분기됨");
      return memberWebhookHandler(req, res);
    }
  } catch (err) {
    console.error("❌ 웹훅 분기 중 오류:", err);
    return res.json({ version: "2.0", template: { outputs: [{ simpleText: { text: "오류가 발생했습니다." } }] } });
  }
});

// ✅ 기본 404 응답
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// ✅ 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
