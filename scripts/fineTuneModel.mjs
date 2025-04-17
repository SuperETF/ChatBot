// scripts/fineTuneModel.mjs
import { openai } from '../services/openai.mjs'; // 너가 사용하는 openai.mjs 기준
import fs from 'fs';

const filePath = './date_parsing_finetune_messages.jsonl';

const fileUpload = await openai.files.create({
  file: fs.createReadStream(filePath),
  purpose: 'fine-tune',
});

console.log('📁 파일 업로드 완료:', fileUpload.id);

const fineTune = await openai.fineTuning.jobs.create({
  training_file: fileUpload.id,
  model: 'gpt-3.5-turbo',
});

console.log('🚀 Fine-tune 시작됨:', fineTune.id);
