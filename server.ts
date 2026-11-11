import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE_PATH = path.join(DATA_DIR, "database.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

const ALLOWED_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-4-argon",
  "gemini-4-carbon",
];

function resolveModel(requestedModel?: string): string {
  if (requestedModel && ALLOWED_MODELS.includes(requestedModel)) {
    return requestedModel;
  }
  return "gemini-3.8-flash";
}

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    throw new Error(
      "MISSING_API_KEY: Chưa tìm thấy GEMINI_API_KEY hợp lệ. Hãy kiểm tra mục Settings > Secrets trên AI Studio hoặc file .env."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function formatGeminiError(error: unknown, modelUsed: string) {
  const rawMessage = error instanceof Error ? error.message : String(error);
  let friendlyHint =
    "Bạn hãy thử giảm độ dài tài liệu (tải từng bài/chương) hoặc đổi sang model 'gemini-3.8-flash' / 'gemini-flash-latest' rồi thử lại.";

  if (
    rawMessage.includes("Expected") ||
    rawMessage.includes("JSON") ||
    rawMessage.includes("Unterminated string")
  ) {
    friendlyHint =
      "Dữ liệu văn bản AI sinh ra quá dài (vượt giới hạn token đầu ra của 1 lần quét). Hệ thống khuyến nghị tải lên từng bài học (1–5 trang) hoặc chọn model 'gemini-3.8-flash'.";
  } else if (
    /\b429\b/.test(rawMessage) ||
    rawMessage.includes("RESOURCE_EXHAUSTED") ||
    rawMessage.toLowerCase().includes("quota")
  ) {
    friendlyHint = `Model '${modelUsed}' đang chạm giới hạn tốc độ (Quota 429). Hãy đợi 15 giây hoặc chuyển sang model khác trong danh sách.`;
  } else if (
    /\b403\b/.test(rawMessage) ||
    rawMessage.includes("PERMISSION_DENIED") ||
    rawMessage.includes("API_KEY_INVALID") ||
    rawMessage.includes("MISSING_API_KEY")
  ) {
    friendlyHint =
      "API Key không hợp lệ hoặc bị từ chối quyền. Vui lòng kiểm tra lại GEMINI_API_KEY trong mục Settings > Secrets.";
  } else if (/\b404\b/.test(rawMessage) || rawMessage.includes("NOT_FOUND")) {
    friendlyHint = `Model '${modelUsed}' hiện không khả dụng. Hãy chọn model 'gemini-3.8-flash' hoặc 'gemini-3.1-flash-lite'.`;
  }

  return {
    error: `Lỗi xử lý AI (${modelUsed}): ${rawMessage}`,
    hint: friendlyHint,
    modelUsed,
  };
}

function cleanJsonString(str: string): string {
  const trimmed = str.trim();
  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }
  return trimmed;
}

/**
 * Repairs truncated or slightly malformed JSON when a large textbook scan or exam generation
 * reaches the model's max output token limit (~65KB).
 */
function repairAndParseJson<T>(rawText: string, fallbackType: "object" | "array"): T {
  const cleaned = cleanJsonString(rawText);
  if (!cleaned) {
    return (fallbackType === "array" ? [] : {}) as T;
  }

  // 1. Direct parse attempt
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Continue to repair logic
  }

  // 2. If expecting an array of question objects, salvage all complete top-level `{ ... }` items
  if (fallbackType === "array") {
    const salvagedItems: unknown[] = [];
    let depth = 0;
    let objStart = -1;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      if (ch === "{") {
        if (depth === 0) objStart = i;
        depth++;
      } else if (ch === "}") {
        depth--;
        if (depth === 0 && objStart !== -1) {
          const candidate = cleaned.slice(objStart, i + 1);
          try {
            salvagedItems.push(JSON.parse(candidate));
          } catch {
            // Ignore incomplete/corrupted trailing object
          }
          objStart = -1;
        }
      }
    }

    if (salvagedItems.length > 0) {
      return salvagedItems as T;
    }
  }

  // 3. Generic stack-based truncation closer for objects/arrays
  let working = cleaned;
  // Cut back to the last safe comma or complete value if truncated mid-key/mid-value
  const stack: string[] = [];
  let inStr = false;
  let esc = false;

  for (let i = 0; i < working.length; i++) {
    const ch = working[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (ch === "\\") {
      esc = true;
      continue;
    }
    if (ch === '"') {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") {
      if (stack.length > 0 && stack[stack.length - 1] === ch) {
        stack.pop();
      }
    }
  }

  if (inStr) {
    working += '"';
  }

  // Remove any dangling colon or trailing comma before closing brackets
  working = working.replace(/[,:\s]+$/, "");

  while (stack.length > 0) {
    working += stack.pop();
  }

  try {
    return JSON.parse(working) as T;
  } catch {
    // 4. Last resort regex extraction for textbook scan fields
    if (fallbackType === "object") {
      const summaryMatch = cleaned.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      const extractedMatch = cleaned.match(/"extractedText"\s*:\s*"((?:[^"\\]|\\.)*)/);
      return {
        extractedText: extractedMatch
          ? extractedMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').slice(0, 6000)
          : cleaned.slice(0, 4000),
        summary: summaryMatch
          ? summaryMatch[1]
          : "Đã trích xuất nội dung trọng tâm từ tài liệu sách giáo khoa.",
        keyConcepts: ["Kiến thức trọng tâm trích từ sách giáo khoa"],
        formulasOrRules: ["Áp dụng công thức và quy tắc trong bài học"],
        sampleExercises: [],
      } as unknown as T;
    }
    throw new Error("Không thể phân tích cú pháp JSON từ phản hồi của AI.");
  }
}

// 0A. Server-side Shared Database Endpoints (Persists across all devices on LAN / Ubuntu Server)
app.get("/api/state", (_req, res) => {
  try {
    ensureDataDir();
    if (!fs.existsSync(DB_FILE_PATH)) {
      res.json({ exists: false, state: null });
      return;
    }
    const raw = fs.readFileSync(DB_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    res.json({ exists: true, state: parsed });
  } catch (error) {
    console.error("Error reading server state:", error);
    res.status(500).json({ exists: false, error: "Không thể đọc dữ liệu từ máy chủ." });
  }
});

app.post("/api/state", (req, res) => {
  try {
    ensureDataDir();
    const statePayload = req.body;
    if (!statePayload || typeof statePayload !== "object") {
      res.status(400).json({ ok: false, error: "Dữ liệu không hợp lệ." });
      return;
    }
    const payloadWithMeta = {
      ...statePayload,
      updatedAt: new Date().toISOString(),
    };
    const tempFilePath = `${DB_FILE_PATH}.tmp`;
    fs.writeFileSync(tempFilePath, JSON.stringify(payloadWithMeta, null, 2), "utf-8");
    fs.renameSync(tempFilePath, DB_FILE_PATH);
    res.json({ ok: true, updatedAt: payloadWithMeta.updatedAt });
  } catch (error) {
    console.error("Error writing server state:", error);
    res.status(500).json({ ok: false, error: "Không thể lưu dữ liệu xuống máy chủ." });
  }
});

// 0. Health / Diagnostic Endpoint to verify API Key & Selected Model
app.post("/api/ai/check-status", async (req, res) => {
  const model = resolveModel(req.body?.model);
  try {
    const ai = getAiClient();
    const startTime = Date.now();
    const response = await ai.models.generateContent({
      model,
      contents: "Trả lời ngắn gọn 1 câu bằng tiếng Việt: Kết nối AI thành công.",
    });
    const latencyMs = Date.now() - startTime;
    res.json({
      ok: true,
      modelUsed: model,
      latencyMs,
      reply: (response.text ?? "OK").trim(),
    });
  } catch (error: unknown) {
    console.error("Error in /api/ai/check-status:", error);
    const formatted = formatGeminiError(error, model);
    res.status(500).json({ ok: false, ...formatted });
  }
});

// 1. Scan Textbook Page / Text into Structured JSON
app.post("/api/ai/scan-textbook", async (req, res) => {
  const model = resolveModel(req.body?.model);
  try {
    const { title, subject, grade, rawText, imageBase64, mimeType } = req.body;
    const ai = getAiClient();

    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    if (imageBase64 && mimeType) {
      parts.push({
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      });
    }

    const trimmedRawText = rawText ? String(rawText).slice(0, 15000) : "";

    const promptText = `Bạn là chuyên gia chương trình Giáo dục Tiểu học Việt Nam (Lớp ${grade || 3}, môn ${subject || "Toán"}).
Hãy đọc nội dung sách giáo khoa / tài liệu dưới đây (tiêu đề: "${title || "Bài học sách giáo khoa"}") và trích xuất kiến thức sang định dạng JSON chuẩn để làm dữ liệu gốc cho AI ra đề.
${trimmedRawText ? `\nNội dung văn bản bổ sung:\n${trimmedRawText}` : ""}

QUY TẮC QUAN TRỌNG ĐỂ KHÔNG BỊ TRÀN BỘ NHỚ JSON:
1. Trường "extractedText": Tóm lược súc tích nội dung văn bản bài học, các định nghĩa, công thức và đề bài tập (TỐI ĐA 2500 ký tự, tuyệt đối không lặp lại ký tự thừa hoặc chép toàn bộ mục lục dài).
2. Trường "summary": Tóm tắt ngắn gọn 2–3 câu về nội dung bài học.
3. Trường "keyConcepts": Liệt kê 4 đến 8 kiến thức trọng tâm ngắn gọn.
4. Trường "formulasOrRules": Liệt kê 3 đến 8 công thức toán học (chu vi, diện tích, số cạnh...) hoặc quy tắc ngôn ngữ.
5. Trường "sampleExercises": Trích xuất tối đa 5 đến 8 bài tập mẫu tiêu biểu nhất trong tài liệu.`;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            extractedText: {
              type: Type.STRING,
              description: "Nội dung văn bản bài học đã quét (tối đa 2500 ký tự).",
            },
            summary: {
              type: Type.STRING,
              description: "Tóm tắt ngắn gọn nội dung bài học.",
            },
            keyConcepts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Danh sách 4-8 kiến thức trọng tâm trong bài.",
            },
            formulasOrRules: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Các công thức toán học hoặc quy tắc ngôn ngữ.",
            },
            sampleExercises: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  solutionHint: { type: Type.STRING },
                  topicTag: { type: Type.STRING },
                },
              },
              description: "Tối đa 5-8 bài tập mẫu tiêu biểu.",
            },
          },
          required: ["extractedText", "summary", "keyConcepts", "formulasOrRules", "sampleExercises"],
        },
      },
    });

    const parsed = repairAndParseJson<{
      extractedText?: string;
      summary?: string;
      keyConcepts?: string[];
      formulasOrRules?: string[];
      sampleExercises?: Array<{ question: string; solutionHint: string; topicTag: string }>;
    }>(response.text ?? "{}", "object");

    res.json({
      extractedText: parsed.extractedText || trimmedRawText || "Đã quét nội dung sách giáo khoa.",
      summary: parsed.summary || "Tóm tắt kiến thức trọng tâm từ tài liệu đã tải lên.",
      keyConcepts: Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts : [],
      formulasOrRules: Array.isArray(parsed.formulasOrRules) ? parsed.formulasOrRules : [],
      sampleExercises: Array.isArray(parsed.sampleExercises) ? parsed.sampleExercises : [],
      modelUsed: model,
    });
  } catch (error: unknown) {
    console.error("Error in /api/ai/scan-textbook:", error);
    const formatted = formatGeminiError(error, model);
    res.status(500).json(formatted);
  }
});

// 2. Generate Exam Questions from Scanned Textbook Data or Weak Topics
app.post("/api/ai/generate-exam", async (req, res) => {
  const model = resolveModel(req.body?.model);
  try {
    const {
      subject,
      grade,
      level,
      count = 5,
      textbookContent,
      preferredCategories,
      weakTopics,
    } = req.body;

    const ai = getAiClient();

    // Keep textbook context concise so the model focuses on generating clean JSON questions
    const compactTextbook = textbookContent
      ? {
          title: textbookContent.title,
          extractedText: String(textbookContent.extractedText || "").slice(0, 3500),
          formulasOrRules: Array.isArray(textbookContent.formulasOrRules)
            ? textbookContent.formulasOrRules.slice(0, 10)
            : [],
          sampleExercises: Array.isArray(textbookContent.sampleExercises)
            ? textbookContent.sampleExercises.slice(0, 8)
            : [],
        }
      : {};

    const levelInstruction =
      level === "advanced"
        ? `MỨC NÂNG CAO (Tư duy mở rộng): Tạo câu hỏi phát triển tư duy logic, bài toán có lời văn 2 bước tính, bài toán ghép hình hoặc tìm cạnh chưa biết từ chu vi/diện tích, hoặc câu hỏi vận dụng sâu nhưng TUYỆT ĐỐI nằm trong phạm vi kiến thức Lớp ${grade} đã học trong tài liệu.`
        : `MỨC CƠ BẢN (Biến đổi số liệu): Tạo câu hỏi bám sát 100% cấu trúc bài tập mẫu trong sách giáo khoa đã lưu, chỉ thay đổi con số, kích thước cạnh, tên đồ vật/nhân vật để bé rèn kỹ năng chuẩn xác.`;

    const weakTopicContext =
      Array.isArray(weakTopics) && weakTopics.length > 0
        ? `\nĐẶC BIỆT ƯU TIÊN tạo câu hỏi xoáy sâu vào các phần kiến thức bé đang làm sai/yếu sau đây: ${weakTopics.join(", ")}.`
        : "";

    const categoryContext =
      Array.isArray(preferredCategories) && preferredCategories.length > 0
        ? `\nCÁC CÔNG THỨC, QUY TẮC & DẠNG BÀI TRỌNG TÂM CẦN RA ĐỀ (trích từ OCR bài học): ${preferredCategories.join(" | ")}.`
        : "";

    const prompt = `Bạn là giáo viên tiểu học giỏi tại Việt Nam đang ra đề cho học sinh Lớp ${grade}, môn ${subject}.
Hãy dựa vào dữ liệu sách giáo khoa đã lưu dưới đây để tạo đúng ${count} câu hỏi chất lượng cao, bám sát đúng đặc thù môn học và các công thức/quy tắc đã chọn.

${levelInstruction}
${weakTopicContext}
${categoryContext}

Dữ liệu sách giáo khoa gốc:
${JSON.stringify(compactTextbook, null, 2)}

Quy tắc quan trọng (Giữ văn bản ngắn gọn, tuyệt đối không lặp từ để đảm bảo JSON hợp lệ):
1. CHỈ KHI môn học là Toán ("math") VÀ câu hỏi thuộc dạng HÌNH HỌC (nhận biết hình, đếm cạnh/đỉnh/góc, tính chu vi, diện tích), mới đặt type = "geometry_visual" và cung cấp "geometrySpec":
   - hasGeometry: true
   - shapeType: chọn 1 trong ["rectangle", "square", "triangle", "right_triangle", "trapezoid", "parallelogram", "pentagon", "hexagon", "circle", "composite_l"]
   - width: chiều dài / đáy (số nguyên, ví dụ 8)
   - height: chiều rộng / chiều cao (ví dụ 5)
   - topWidth: đáy nhỏ (nếu là hình thang, ví dụ 4)
   - sideA, sideB, sideC: độ dài các cạnh (nếu là tam giác hoặc đa giác)
   - unit: đơn vị đo (ví dụ "cm", "dm", "m")
   - showGrid: true
   - taskFocus: chọn 1 trong ["identify_shape", "count_sides", "perimeter", "area"]
   - customLabel: nhãn ngắn gọn hiển thị trên hình (tối đa 30 ký tự, ví dụ "Hình chữ nhật ABCD")
   Với các môn Tiếng Việt, Tiếng Anh, Khoa học hoặc Toán số học thông thường, hãy đặt hasGeometry: false và dùng type = "multiple_choice" hoặc "fill_blank".
2. Nếu là dạng trắc nghiệm ("multiple_choice" hoặc "geometry_visual"), mảng "options" phải có đúng 4 phương án rõ ràng, và "correctAnswer" phải khớp chính xác 100% với 1 trong 4 phương án đó.
3. Nếu là dạng điền kết quả ("fill_blank"), "options" để mảng rỗng [], "correctAnswer" chỉ ghi con số hoặc từ cần điền.
4. Nếu là môn Tiếng Anh hoặc câu hỏi Luyện nghe phát âm (có trường "audioText"):
   - Trường "audioText" chứa từ hoặc câu cần phát âm (ví dụ: "zebra").
   - TUYỆT ĐỐI KHÔNG viết lộ đáp án ("correctAnswer") vào trong "questionText" nếu đó là bài nghe điền từ! Hãy viết câu dẫn gợi mở hoặc dịch nghĩa tiếng Việt để bé tự nghe loa và suy nghĩ (ví dụ: "Bấm nút Nghe phát âm và viết lại từ tiếng Anh chỉ 'con ngựa vằn' mà em nghe được:").
5. Giải thích ("explanation") viết ngắn gọn 1–2 câu (tối đa 200 ký tự), dễ hiểu cho học sinh Lớp ${grade}.`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              topic: {
                type: Type.STRING,
                description: "Chuyên đề ngắn gọn, ví dụ: 'Tính chu vi hình chữ nhật'",
              },
              type: {
                type: Type.STRING,
                description: "Loại câu hỏi: 'geometry_visual', 'multiple_choice', 'fill_blank', 'true_false', hoặc 'ordering'",
              },
              questionText: {
                type: Type.STRING,
                description: "Nội dung câu hỏi rõ ràng cho học sinh tiểu học.",
              },
              audioText: {
                type: Type.STRING,
                description: "Từ hoặc câu tiếng Anh/tiếng Việt để đọc thành tiếng khi bé bấm loa.",
              },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Các phương án lựa chọn (4 đáp án cho trắc nghiệm, hoặc rỗng cho fill_blank).",
              },
              correctAnswer: {
                type: Type.STRING,
                description: "Đáp án đúng chính xác.",
              },
              explanation: {
                type: Type.STRING,
                description: "Lời giải ngắn gọn 1-2 câu dễ hiểu cho bé.",
              },
              geometrySpec: {
                type: Type.OBJECT,
                properties: {
                  hasGeometry: { type: Type.BOOLEAN },
                  shapeType: { type: Type.STRING },
                  width: { type: Type.NUMBER },
                  height: { type: Type.NUMBER },
                  topWidth: { type: Type.NUMBER },
                  sideA: { type: Type.NUMBER },
                  sideB: { type: Type.NUMBER },
                  sideC: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  showGrid: { type: Type.BOOLEAN },
                  taskFocus: { type: Type.STRING },
                  customLabel: { type: Type.STRING },
                },
              },
            },
            required: ["topic", "type", "questionText", "options", "correctAnswer", "explanation"],
          },
        },
      },
    });

    const questions = repairAndParseJson<unknown[]>(response.text ?? "[]", "array");

    if (!Array.isArray(questions) || questions.length === 0) {
      res.status(500).json({
        error: `Model '${model}' trả về danh sách câu hỏi rỗng (0 câu).`,
        hint: "Hãy thử đổi sang model 'gemini-3.8-flash' hoặc 'gemini-flash-latest' và chọn 3–5 câu rồi bấm tạo lại.",
        modelUsed: model,
      });
      return;
    }

    res.json({ questions, modelUsed: model });
  } catch (error: unknown) {
    console.error("Error in /api/ai/generate-exam:", error);
    const formatted = formatGeminiError(error, model);
    res.status(500).json(formatted);
  }
});

// 3. Kid-friendly Vietnamese Dictionary Lookup
app.post("/api/ai/dictionary", async (req, res) => {
  const model = resolveModel(req.body?.model);
  try {
    const { word, grade = 3 } = req.body;
    const ai = getAiClient();

    const response = await ai.models.generateContent({
      model,
      contents: `Hãy giải nghĩa từ hoặc cụm từ tiếng Việt "${word}" cho học sinh tiểu học Lớp ${grade}.
Giải thích thật trong sáng, ngắn gọn, dễ tưởng tượng, kèm câu ví dụ gần gũi và từ đồng nghĩa/trái nghĩa nếu có.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            wordType: { type: Type.STRING },
            simpleMeaning: { type: Type.STRING },
            exampleSentence: { type: Type.STRING },
            relatedWords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            memoryTip: { type: Type.STRING },
          },
          required: ["word", "wordType", "simpleMeaning", "exampleSentence", "relatedWords", "memoryTip"],
        },
      },
    });

    const parsed = repairAndParseJson(response.text ?? "{}", "object");
    res.json(parsed);
  } catch (error: unknown) {
    console.error("Error in /api/ai/dictionary:", error);
    const formatted = formatGeminiError(error, model);
    res.status(500).json(formatted);
  }
});

// 4. Text-to-Speech (Read Aloud for English & Vietnamese)
app.post("/api/ai/tts", async (req, res) => {
  try {
    const { text, slow = false } = req.body;
    const ai = getAiClient();

    const styleInstruction = slow
      ? "Speak slowly, clearly, and distinctly for a primary school student learning pronunciation"
      : "Friendly, clear, encouraging primary school teacher voice";

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash-lite-tts",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: String(text || ""),
              speechMetadata: {
                style: styleInstruction,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      res.status(500).json({ error: "Không nhận được dữ liệu âm thanh từ AI." });
      return;
    }

    res.json({
      audioBase64: base64Audio,
      mimeType: "audio/wav",
    });
  } catch (error: unknown) {
    console.error("Error in /api/ai/tts:", error);
    const formatted = formatGeminiError(error, "gemini-3.8-flash-lite-tts");
    res.status(500).json(formatted);
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
