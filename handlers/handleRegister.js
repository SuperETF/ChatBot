// handlers/handleRegister.js
import { upsertUser } from '../services/userService.js';

/**
 * 사용자 등록 핸들러
 * 개인정보 동의 이후에 호출됨
 */
export default async function handleRegister(kakaoId, res) {
  const { data, error } = await upsertUser(kakaoId);

  const message = error
    ? '❌ 등록 중 문제가 발생했습니다. 나중에 다시 시도해주세요.'
    : '✅ 등록이 완료되었습니다!\n이제 병력청취를 시작해볼까요?';

  const next = error ? [] : [
    {
      label: '병력청취 시작',
      action: 'message',
      messageText: '병력청취 시작'
    }
  ];

  return res.status(200).json({
    version: '2.0',
    template: {
      outputs: [
        {
          simpleText: { text: message }
        }
      ],
      quickReplies: next
    }
  });
}
