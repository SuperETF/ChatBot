import { replyButton } from "../utils/reply.js";

export default function fallback(kakaoId, utterance, res) {
  return res.json(
    replyButton(
      "제가 아직 이해하지 못했어요. 어떤 걸 도와드릴까요?",
      ["운동 예약", "루틴 추천", "내 정보", "심박수 입력"]
    )
  );
}
