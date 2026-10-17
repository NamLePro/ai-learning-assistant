require('dotenv').config();

const model = process.env.GEMINI_MODEL;
console.log('Model đọc từ .env: [' + model + ']');

fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-goog-api-key': process.env.GEMINI_API_KEY,
  },
  body: JSON.stringify({ contents: [{ parts: [{ text: 'Xin chào' }] }] }),
})
  .then((r) => r.json())
  .then((d) => console.log(JSON.stringify(d, null, 2)));