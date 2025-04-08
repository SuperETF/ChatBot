import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import webhookRoute from './routes/webhook.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 📌 Webhook 연결
app.use('/kakao/webhook', webhookRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
