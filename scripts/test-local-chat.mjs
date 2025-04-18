// scripts/test-local-chat.mjs //node scripts/test-local-chat.mjs
import fetch from "node-fetch";

const KAKAO_ID = "test-user-id-001";
const URL = "http://localhost:3000/kakao/webhook";

const simulateChat = async (utterances = []) => {
  for (const utterance of utterances) {
    console.log(`🟡 사용자: ${utterance}`);
    const res = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userRequest: {
          user: { id: KAKAO_ID },
          utterance
        }
      })
    });
    const json = await res.json();

    console.log("🟢 응답:\n", JSON.stringify(json, null, 2), "\n");
    await new Promise(r => setTimeout(r, 500)); // 간격
  }
};
//node scripts/test-local-chat.mjs
await simulateChat([
  "전문가 김복두 01012345678 0412"
]);
