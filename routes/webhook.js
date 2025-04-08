import express from "express";
const router = express.Router();

router.post("/", async (req, res) => {
  console.log("📩 카카오 Webhook 요청 수신됨");

  return res.json({
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: {
            text: "✅ Webhook 연결 성공! (기본 응답)"
          }
        }
      ]
    }
  });
});

export default router;
