// server.mjs
import "dotenv/config";  
import express from "express";
import cors from "cors";
import webhookRouter from "./routes/webhook.mjs"; // 반드시 .mjs 확장자 포함

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/kakao/webhook", webhookRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
