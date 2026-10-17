const MAX_CHARS = 100000; // giới hạn độ dài nội dung gửi lên AI

const LEVEL_GUIDE = {
  short: 'Ngắn gọn: tối đa 4-5 ý chính, mỗi ý 1 câu. Tổng cộng khoảng 100-150 từ.',
  medium: 'Vừa phải: khoảng 6-10 ý, mỗi ý 1-2 câu. Tổng cộng khoảng 250-400 từ.',
  detailed:
    'Chi tiết: bao quát đầy đủ các ý quan trọng, có thể kèm định nghĩa, ví dụ, số liệu. Tổng cộng khoảng 600-900 từ.',
};

const MODE_GUIDE = {
  overall: 'Tóm tắt tổng quan toàn bộ tài liệu, nhóm các ý theo chủ đề (khoảng 2-4 nhóm).',
  sections:
    'Tự nhận diện các chương/phần của tài liệu và tóm tắt riêng từng chương/phần, mỗi phần là một mục với tiêu đề lấy từ tài liệu.',
};

const RETRYABLE_STATUS = [500, 502, 503, 504];
const MAX_ATTEMPTS = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function createError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function callGemini(model, apiKey, body) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body,
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function summarizeText({ text, level, mode }) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw createError(500, 'Server chưa cấu hình GEMINI_API_KEY trong file .env!');
  }

  // Model chính + các model dự phòng (thử lần lượt nếu model trước lỗi)
  const primary = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const fallbacks = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-2.5-flash-lite,gemini-2.5-flash')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const models = [...new Set([primary, ...fallbacks])];

  const safeLevel = LEVEL_GUIDE[level] ? level : 'medium';
  const safeMode = MODE_GUIDE[mode] ? mode : 'overall';
  const truncated = text.length > MAX_CHARS;
  const content = truncated ? text.slice(0, MAX_CHARS) : text;

  const prompt = `Bạn là trợ lý học tập cho sinh viên. Hãy tóm tắt tài liệu dưới đây bằng tiếng Việt.

YÊU CẦU:
- Mức độ: ${LEVEL_GUIDE[safeLevel]}
- Cách tóm tắt: ${MODE_GUIDE[safeMode]}
- Chỉ dùng thông tin có trong tài liệu, không tự bịa thêm.
- Trả về DUY NHẤT một JSON đúng cấu trúc sau, không thêm chữ nào khác:
{"title": "tiêu đề ngắn của bản tóm tắt", "overview": "1-2 câu giới thiệu nội dung chính", "sections": [{"heading": "tên mục", "points": ["ý 1", "ý 2"]}]}

TÀI LIỆU:
"""
${content}
"""`;

  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
  });

  let response = null;
  let data = {};
  let usedModel = models[0];

  outer: for (const m of models) {
    usedModel = m;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        ({ response, data } = await callGemini(m, apiKey, body));
      } catch (e) {
        response = null;
        console.error(`❌ Không gọi được Gemini (${m}):`, e.message);
      }

      if (response && response.ok) break outer; // thành công

      const status = response ? response.status : 0; // 0 = lỗi mạng
      if (response) {
        const apiMsg = (data && data.error && data.error.message) || '';
        console.error(`❌ Gemini lỗi (${m}, lần ${attempt}):`, status, apiMsg);
      }

      // Model không tồn tại hoặc hết lượt: đổi ngay sang model dự phòng
      if (status === 404 || status === 429) break;

      // Quá tải hoặc lỗi mạng: chờ rồi thử lại cùng model
      if (status === 0 || RETRYABLE_STATUS.includes(status)) {
        if (attempt < MAX_ATTEMPTS) await sleep(attempt * 2000);
        continue;
      }

      // Lỗi khác (400, 403...): thử lại cũng vô ích
      break outer;
    }
  }

  if (!response) {
    throw createError(502, 'Không kết nối được tới Gemini. Kiểm tra mạng của máy chạy backend!');
  }

  if (!response.ok) {
    const apiMsg = (data && data.error && data.error.message) || '';

    if (response.status === 429) {
      throw createError(429, 'AI đang hết lượt gọi miễn phí tạm thời, thử lại sau ít phút!');
    }
    if (response.status === 404) {
      throw createError(
        502,
        `Model "${usedModel}" không dùng được. Chạy "node listModels.js" trong thư mục backend để xem model nào gọi được, rồi đổi GEMINI_MODEL trong .env!`
      );
    }
    if (response.status === 400 && /api key/i.test(apiMsg)) {
      throw createError(502, 'GEMINI_API_KEY không hợp lệ!');
    }
    if (response.status === 403) {
      throw createError(502, 'GEMINI_API_KEY bị từ chối (sai key hoặc chưa được cấp quyền)!');
    }
    if (RETRYABLE_STATUS.includes(response.status)) {
      throw createError(503, 'AI đang quá tải, đã thử lại nhiều lần nhưng chưa được. Vui lòng thử lại sau ít phút!');
    }
    throw createError(502, `Gemini báo lỗi: ${apiMsg || response.status}`);
  }

  if (usedModel !== models[0]) {
    console.log(`ℹ️ Model chính lỗi, đã dùng model dự phòng: ${usedModel}`);
  }

  const parts =
    (data && data.candidates && data.candidates[0] && data.candidates[0].content &&
      data.candidates[0].content.parts) || [];
  const raw = parts.map((p) => p.text || '').join('');

  if (!raw.trim()) {
    throw createError(502, 'AI không trả về nội dung (có thể bị bộ lọc an toàn chặn). Thử lại hoặc đổi tài liệu!');
  }

  let parsed;
  try {
    parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch (e) {
    console.error('❌ Không đọc được JSON từ AI:', raw.slice(0, 300));
    throw createError(502, 'AI trả về sai định dạng, vui lòng thử lại!');
  }

  const sections = Array.isArray(parsed.sections)
    ? parsed.sections.map((s) => ({
        heading: String((s && s.heading) || ''),
        points: Array.isArray(s && s.points) ? s.points.map(String) : [],
      }))
    : [];

  return {
    title: String(parsed.title || 'Bản tóm tắt'),
    overview: String(parsed.overview || ''),
    sections,
    level: safeLevel,
    mode: safeMode,
    truncated,
  };
}
// Gọi Gemini có thử lại + model dự phòng, dùng cho chat
async function generateWithFallback(payload) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw createError(500, 'Server chưa cấu hình GEMINI_API_KEY trong file .env!');

  const primary = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const fallbacks = (process.env.GEMINI_FALLBACK_MODELS || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const models = [...new Set([primary, ...fallbacks])];
  const body = JSON.stringify(payload);

  let lastStatus = 0;
  let lastMsg = '';

  for (const m of models) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let response = null;
      let data = {};
      try {
        ({ response, data } = await callGemini(m, apiKey, body));
      } catch (e) {
        console.error(`❌ Không gọi được Gemini (${m}):`, e.message);
      }

      if (response && response.ok) return data;

      lastStatus = response ? response.status : 0;
      lastMsg = (data && data.error && data.error.message) || '';
      if (response) console.error(`❌ Gemini lỗi (${m}, lần ${attempt}):`, lastStatus, lastMsg);

      if (lastStatus === 404 || lastStatus === 429) break; // đổi model
      if (lastStatus === 0 || RETRYABLE_STATUS.includes(lastStatus)) {
        if (attempt < MAX_ATTEMPTS) await sleep(attempt * 2000);
        continue;
      }
      // 400, 403...: dừng luôn
      if (lastStatus === 403) throw createError(502, 'GEMINI_API_KEY bị từ chối!');
      throw createError(502, `Gemini báo lỗi: ${lastMsg || lastStatus}`);
    }
  }

  if (lastStatus === 0) throw createError(502, 'Không kết nối được tới Gemini. Kiểm tra mạng!');
  if (lastStatus === 429) throw createError(429, 'AI đang hết lượt gọi tạm thời, thử lại sau ít phút!');
  throw createError(503, 'AI đang quá tải, vui lòng thử lại sau ít phút!');
}

// Hỏi đáp dựa trên nội dung tài liệu (FR-24, FR-25, FR-27, FR-28)
async function chatWithDocument({ text, history, message }) {
  const content = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text;

  const systemText = `Bạn là trợ lý học tập cho sinh viên. Trả lời bằng tiếng Việt, rõ ràng, ngắn gọn.
QUY TẮC:
- CHỈ dựa vào nội dung TÀI LIỆU bên dưới để trả lời.
- Nếu tài liệu không có thông tin để trả lời, nói rõ "Tài liệu không đề cập đến nội dung này" rồi gợi ý sinh viên hỏi theo hướng khác. Không tự bịa.
- Có thể dùng các câu hỏi và trả lời trước đó trong cuộc hội thoại để hiểu câu hỏi tiếp theo.

TÀI LIỆU:
"""
${content}
"""`;

  const contents = [
    ...history.map((m) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: String(m.text) }],
    })),
    { role: 'user', parts: [{ text: message }] },
  ];

  const data = await generateWithFallback({
    systemInstruction: { parts: [{ text: systemText }] },
    contents,
    generationConfig: { temperature: 0.3 },
  });

  const parts =
    (data && data.candidates && data.candidates[0] && data.candidates[0].content &&
      data.candidates[0].content.parts) || [];
  const reply = parts.map((p) => p.text || '').join('').trim();

  if (!reply) {
    throw createError(502, 'AI không trả về nội dung (có thể bị bộ lọc an toàn chặn). Thử hỏi lại!');
  }
  return reply;
}
// Nhận dạng chữ trong ảnh đề bài bằng Gemini multimodal (FR-33, FR-34)
async function ocrImage({ base64, mimeType }) {
  const prompt = `Hãy chép lại CHÍNH XÁC toàn bộ chữ có trong ảnh đề bài này.
- Giữ nguyên ngôn ngữ gốc, số thứ tự câu, các ý a), b), c).
- Công thức toán viết dạng văn bản thường (ví dụ: x^2 + 3x - 5 = 0, sqrt(x), a/b).
- KHÔNG giải bài, KHÔNG thêm lời bình, chỉ trả về nội dung đề bài.
- Nếu trong ảnh không có chữ, trả về đúng một chuỗi rỗng.`;

  const data = await generateWithFallback({
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }, { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64 } }],
      },
    ],
    generationConfig: { temperature: 0 },
  });

  const parts =
    (data && data.candidates && data.candidates[0] && data.candidates[0].content &&
      data.candidates[0].content.parts) || [];
  return parts.map((p) => p.text || '').join('').trim();
}

// Phân tích sơ bộ đề bài: loại bài, chủ đề (FR-37, mục 6 sẽ mở rộng)
async function analyzeProblem({ text }) {
  const prompt = `Bạn là trợ lý học tập. Phân tích đề bài sau bằng tiếng Việt, KHÔNG giải bài.
Trả về DUY NHẤT một JSON đúng cấu trúc:
{"subject": "môn học", "topic": "chủ đề cụ thể", "problemType": "loại bài toán/dạng bài", "summary": "đề bài yêu cầu gì, 1-2 câu", "keyConcepts": ["khái niệm cần biết 1", "khái niệm 2"]}

ĐỀ BÀI:
"""
${text.slice(0, 10000)}
"""`;

  const data = await generateWithFallback({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
  });

  const parts =
    (data && data.candidates && data.candidates[0] && data.candidates[0].content &&
      data.candidates[0].content.parts) || [];
  const raw = parts.map((p) => p.text || '').join('');
  if (!raw.trim()) throw createError(502, 'AI không trả về nội dung. Thử lại!');

  let parsed;
  try {
    parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch (e) {
    throw createError(502, 'AI trả về sai định dạng, vui lòng thử lại!');
  }
  return {
    subject: String(parsed.subject || ''),
    topic: String(parsed.topic || ''),
    problemType: String(parsed.problemType || ''),
    summary: String(parsed.summary || ''),
    keyConcepts: Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts.map(String) : [],
  };
}

module.exports = { summarizeText, chatWithDocument, ocrImage, analyzeProblem };