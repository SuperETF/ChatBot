// index.js
import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import kakaoWebhook from './routes/kakaoWebhook.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// JSON 파싱 미들웨어
app.use(bodyParser.json());

// 라우팅 등록
app.use('/kakao/webhook', kakaoWebhook);

// 서버 실행
app.listen(PORT, () => {
  console.log(`✅ Server started on port ${PORT}`);
});
