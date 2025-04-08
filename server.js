import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import webhookRoute from "./routes/webhook.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json()); // 👈 이거 꼭 있어야 카카오 요청 바디가 들어옴
app.use(express.urlencoded({ extended: true })); // 👈 보조적으로 사용

app.use("/kakao/webhook", webhookRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
