// handlers/handleStartWorkout.js
import { supabase } from '../lib/supabaseClient.js';
import { getUserByKakaoId } from '../services/userService.js';

const workoutVideos = {
  목: {
    title: '목 통증 완화 운동',
    url: 'https://yourvideo.com/neck-stretch'
  },
  어깨: {
    title: '어깨 유연성 회복 루틴',
    url: 'https://yourvideo.com/shoulder-mobility'
  },
  허리: {
    title: '허리 통증 스트레칭',
    url: 'https://yourvideo.com/lower-back-relief'
  },
  무릎: {
    title: '무릎 안정성 강화 운동',
    url: 'https://yourvideo.com/knee-strength'
  },
  기타: {
    title: '전신 스트레칭 루틴',
    url: 'https://yourvideo.com/full-body'
  }
};

export default async function handleStartWorkout(kakaoId, res) {
  const { data: user } = await getUserByKakaoId(kakaoId);

  const { data: intake } = await supabase
    .from('intake_forms')
    .select('symptom_area')
    .eq('user_id', user.id)
    .single();

  const area = intake?.symptom_area || '기타';
  const video = workoutVideos[area];

  const message = `📽️ [${video.title}]\n${video.url}`;

  return res.status(200).json({
    version: '2.0',
    template: {
      outputs: [
        {
          simpleText: {
            text: `운동을 시작해볼까요?\n\n${message}`
          }
        }
      ],
      quickReplies: [
        {
          label: '운동 완료했어요',
          action: 'message',
          messageText: '운동 완료'
        },
        {
          label: '다시 보기',
          action: 'message',
          messageText: '운동 시작'
        }
      ]
    }
  });
}
