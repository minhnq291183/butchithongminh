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

function normalizeForComparison(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’“”[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTextbookLessons(extractedText: string): string[] {
  if (!extractedText || !extractedText.trim()) return [""];
  // Split by common lesson headers: Bài 1, Chương 2, Unit 3, Tiết 4, Lesson 5, or ---
  const splitRegex = /(?=(?:Bài|Chương|Tiết|Unit|Lesson)\s+\d+)|(?:\n\s*---\s*\n)/i;
  const rawParts = extractedText.split(splitRegex).map((p) => p.trim()).filter(Boolean);
  if (rawParts.length >= 2) {
    return rawParts;
  }
  // Otherwise split into ~2500-character coherent paragraph sections
  const paragraphs = extractedText.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = "";
  for (const p of paragraphs) {
    if ((currentChunk + "\n\n" + p).length > 2500 && currentChunk.length > 500) {
      chunks.push(currentChunk.trim());
      currentChunk = p;
    } else {
      currentChunk = currentChunk ? `${currentChunk}\n\n${p}` : p;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks.length > 0 ? chunks : [extractedText.slice(0, 4000)];
}

interface QuestionCandidate {
  subject?: string;
  topic: string;
  type: string;
  questionText: string;
  audioText?: string;
  options: string[];
  correctAnswer: string;
  acceptedAnswers?: string[];
  explanation: string;
  geometrySpec?: any;
  warning?: string;
}

function extractNumberSignature(text: string): string {
  if (!text) return "";
  const nums = (text.match(/\d+(?:[.,]\d+)?/g) || [])
    .map((n) => parseFloat(n.replace(",", ".")))
    .filter((n) => !isNaN(n))
    .sort((a, b) => a - b);
  return nums.join("_");
}

function extractStructureSkeleton(text: string): string {
  if (!text) return "";
  return normalizeForComparison(text)
    .replace(/\d+(?:[.,]\d+)?/g, "#NUM#")
    .replace(
      /\b(?:lit|lít|l|kg|kilogam|g|gam|cm|dm|m|km|can|thung|thùng|be|bể|tui|túi|bao|goi|gói|chai|dau|dầu|xang|xăng|sua|sữa|nuoc|nước|mat|mật|gao|gạo|duong|đường|muoi|muối|cam|tao|táo|but|bút|vo|vở|thuoc|thước|hoc sinh|học sinh|ban|bạn|bong hoa|bông hoa|vien bi|viên bi|nam|hoa|lan|minh|hung|hùng|an|binh|bình|chi|ha|hà|linh)\b/g,
      "#ENTITY#"
    )
    .replace(/\s+/g, " ")
    .trim();
}

function isCloneQuestion(q1Text: string, q2Text: string): boolean {
  if (!q1Text || !q2Text) return false;
  const sig1 = extractNumberSignature(q1Text);
  const sig2 = extractNumberSignature(q2Text);
  // Both questions have matching number sets (at least 2 numbers, e.g. 45 and 15)
  if (sig1 && sig2 && sig1 === sig2 && sig1.includes("_")) {
    const skel1 = extractStructureSkeleton(q1Text);
    const skel2 = extractStructureSkeleton(q2Text);
    if (skel1 === skel2) return true;
    const w1 = new Set(skel1.split(" "));
    const w2 = new Set(skel2.split(" "));
    let common = 0;
    for (const w of w1) {
      if (w2.has(w)) common++;
    }
    const overlap = common / Math.max(w1.size, w2.size);
    if (overlap >= 0.7) return true;
  }
  return false;
}

function sanitizeAndValidateGeometry(q: QuestionCandidate, subjectId: string): void {
  // Geometry is only relevant for math
  if (subjectId !== "math" && subjectId !== "all") {
    if (q.geometrySpec) q.geometrySpec = { hasGeometry: false };
    if (q.type === "geometry_visual") q.type = "multiple_choice";
    return;
  }

  const text = q.questionText || "";
  const lowerText = text.toLowerCase();

  // Rule: polylines ("đường gấp khúc"), generic quadrilaterals ("tứ giác"), and word problems
  // calculating perimeter or finding a missing side do NOT need figures.
  const isMissingSideOrPerimeterProblem =
    /(?:tìm|tính)\s+(?:độ dài\s+)?cạnh\s+(?:còn lại|thứ|đáy)|tính chu vi.*biết.*độ dài các cạnh/i.test(lowerText);
  const isPolyline = /đường gấp khúc|poly-?line/i.test(lowerText);
  const isGenericQuadrilateral =
    /(?:hình\s+)?tứ giác/i.test(lowerText) &&
    !/(?:chữ nhật|vuông|thang|bình hành)/i.test(lowerText);

  if (isMissingSideOrPerimeterProblem || isPolyline || isGenericQuadrilateral) {
    if (q.geometrySpec) q.geometrySpec = { hasGeometry: false };
    if (q.type === "geometry_visual") q.type = "multiple_choice";
    return;
  }

  if (!q.geometrySpec || !q.geometrySpec.hasGeometry) {
    if (q.type === "geometry_visual") q.type = "multiple_choice";
    return;
  }

  const validShapes = [
    "rectangle",
    "square",
    "triangle",
    "right_triangle",
    "trapezoid",
    "parallelogram",
    "circle",
    "composite_l",
  ];
  const shape = String(q.geometrySpec.shapeType || "").toLowerCase();

  if (!validShapes.includes(shape)) {
    q.geometrySpec = { hasGeometry: false };
    if (q.type === "geometry_visual") q.type = "multiple_choice";
    return;
  }

  // Prevent absurd hallucinations (e.g. circle for polyline or quadrilateral)
  if (shape === "circle" && !/(?:hình tròn|bán kính|đường kính|tâm\s+o)/i.test(lowerText)) {
    q.geometrySpec = { hasGeometry: false };
    if (q.type === "geometry_visual") q.type = "multiple_choice";
    return;
  }
  if (shape === "rectangle" && !/(?:hình chữ nhật|chiều dài|chiều rộng)/i.test(lowerText)) {
    q.geometrySpec = { hasGeometry: false };
    if (q.type === "geometry_visual") q.type = "multiple_choice";
    return;
  }
  if (shape === "square" && !/(?:hình vuông|cạnh hình vuông)/i.test(lowerText)) {
    q.geometrySpec = { hasGeometry: false };
    if (q.type === "geometry_visual") q.type = "multiple_choice";
    return;
  }
  if ((shape === "triangle" || shape === "right_triangle") && !/(?:tam giác|3 cạnh)/i.test(lowerText)) {
    q.geometrySpec = { hasGeometry: false };
    if (q.type === "geometry_visual") q.type = "multiple_choice";
    return;
  }
  if (shape === "trapezoid" && !/(?:hình thang|đáy lớn|đáy bé)/i.test(lowerText)) {
    q.geometrySpec = { hasGeometry: false };
    if (q.type === "geometry_visual") q.type = "multiple_choice";
    return;
  }
  if (shape === "parallelogram" && !/(?:hình bình hành)/i.test(lowerText)) {
    q.geometrySpec = { hasGeometry: false };
    if (q.type === "geometry_visual") q.type = "multiple_choice";
    return;
  }
  if (shape === "composite_l" && !/(?:chữ l|hình ghép|ghép bởi)/i.test(lowerText)) {
    q.geometrySpec = { hasGeometry: false };
    if (q.type === "geometry_visual") q.type = "multiple_choice";
    return;
  }

  // Verify dimensions on figure match numbers mentioned in the question text
  const numbersInText = (text.match(/\d+(?:[.,]\d+)?/g) || []).map((n) =>
    parseFloat(n.replace(",", "."))
  );

  const specNums = [
    q.geometrySpec.width,
    q.geometrySpec.height,
    q.geometrySpec.sideA,
    q.geometrySpec.sideB,
    q.geometrySpec.sideC,
    q.geometrySpec.topWidth,
  ].filter((v): v is number => typeof v === "number" && v > 0);

  // If any dimension on the figure does not appear in the question text (e.g. 50cm vs 5cm), disable figure
  for (const num of specNums) {
    const matches = numbersInText.some((tn) => Math.abs(tn - num) < 0.001);
    if (!matches) {
      q.geometrySpec = { hasGeometry: false };
      if (q.type === "geometry_visual") q.type = "multiple_choice";
      return;
    }
  }
}

function validateQuestionCode(
  q: QuestionCandidate,
  subjectId: string,
  existingNormalizedSet: Set<string>,
  batchNormalizedSet: Set<string>,
  existingRawQuestions: Array<{ questionText: string }>,
  batchRawQuestions: QuestionCandidate[]
): { valid: boolean; fatalError?: string; warning?: string } {
  if (!q.questionText || typeof q.questionText !== "string" || q.questionText.trim().length < 8) {
    return { valid: false, fatalError: "Nội dung câu hỏi quá ngắn hoặc rỗng." };
  }

  // 1. Strict Subject Isolation
  const lowerText = q.questionText.toLowerCase();
  const lowerTopic = (q.topic || "").toLowerCase();

  if (subjectId === "math") {
    // Check if contaminated by Vietnamese language or English
    const isVietnameseTopic =
      /(?:tiếng việt|tập đọc|chính tả|từ chỉ sự vật|từ chỉ hoạt động|từ chỉ đặc điểm|danh từ|động từ|tính từ|dấu chấm|dấu phẩy|vần\s+\w+|âm\s+\w+|điền âm|ghép chữ|đoạn văn)/i.test(
        lowerTopic + " " + lowerText
      );
    const isEnglishTopic =
      /(?:tiếng anh|english|vocabulary|grammar|look at the picture|choose the correct|fill in the blank with|what is this|how many|spell the word)/i.test(
        lowerTopic + " " + lowerText
      );
    if (isVietnameseTopic) {
      return { valid: false, fatalError: "Câu hỏi thuộc môn Tiếng Việt nhưng đang tạo môn Toán." };
    }
    if (isEnglishTopic) {
      return { valid: false, fatalError: "Câu hỏi thuộc môn Tiếng Anh nhưng đang tạo môn Toán." };
    }
    // Clean topic prefix if Gemini added one
    q.topic = q.topic.replace(/^(?:Toán|Tiếng Việt|Tiếng Anh)\s*[-:]\s*/i, "").trim();
  } else if (subjectId === "vietnamese") {
    const isMathTopic =
      /(?:toán|phép tính|chu vi|diện tích|hình chữ nhật|hình vuông|hình tam giác|\d+\s*[+\-×÷=]\s*\d+)/i.test(
        lowerTopic + " " + lowerText
      );
    if (isMathTopic) {
      return { valid: false, fatalError: "Câu hỏi thuộc môn Toán nhưng đang tạo môn Tiếng Việt." };
    }
    q.topic = q.topic.replace(/^(?:Toán|Tiếng Việt|Tiếng Anh)\s*[-:]\s*/i, "").trim();
  } else if (subjectId === "english") {
    const isMathOrVn =
      /(?:toán|chu vi|diện tích|tiếng việt|chính tả|từ chỉ sự vật)/i.test(
        lowerTopic + " " + lowerText
      );
    if (isMathOrVn) {
      return { valid: false, fatalError: "Câu hỏi bị lẫn môn ngoài Tiếng Anh." };
    }
    q.topic = q.topic.replace(/^(?:Toán|Tiếng Việt|Tiếng Anh)\s*[-:]\s*/i, "").trim();
  }

  // 2. Strict Anti-duplication & Anti-clone Check
  const normQ = normalizeForComparison(q.questionText);
  if (existingNormalizedSet.has(normQ) || batchNormalizedSet.has(normQ)) {
    return { valid: false, fatalError: "Câu hỏi bị trùng lặp nguyên văn với câu đã có." };
  }

  for (const ex of existingRawQuestions) {
    if (ex && ex.questionText && isCloneQuestion(q.questionText, ex.questionText)) {
      return { valid: false, fatalError: "Câu hỏi trùng bộ số liệu và cấu trúc với câu trong kho." };
    }
  }

  for (const bq of batchRawQuestions) {
    if (bq && bq.questionText && isCloneQuestion(q.questionText, bq.questionText)) {
      return { valid: false, fatalError: "Câu hỏi trùng bộ số liệu và cấu trúc với câu khác trong cùng đợt." };
    }
  }

  // 3. Sanitize and validate geometry
  sanitizeAndValidateGeometry(q, subjectId);

  const warnings: string[] = [];

  // 4. Multiple choice validation (do NOT require options for fill_blank or numeric questions)
  if (
    q.type === "multiple_choice" ||
    (Array.isArray(q.options) && q.options.length > 0)
  ) {
    if (!Array.isArray(q.options) || q.options.length < 3) {
      return { valid: false, fatalError: "Câu trắc nghiệm phải có đủ 4 phương án lựa chọn." };
    }

    const normAns = normalizeForComparison(q.correctAnswer || "");
    const normOptions = q.options.map((opt) => normalizeForComparison(String(opt || "")));

    const ansIndex = normOptions.indexOf(normAns);
    if (ansIndex === -1) {
      const rawIndex = q.options.findIndex(
        (opt) => String(opt).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()
      );
      if (rawIndex === -1) {
        return {
          valid: false,
          fatalError: `Đáp án đúng '${q.correctAnswer}' không nằm trong 4 lựa chọn (${q.options.join(", ")}).`,
        };
      }
    }

    // Check duplicate options
    const uniqueOptions = new Set(normOptions);
    if (uniqueOptions.size < q.options.length) {
      return { valid: false, fatalError: "Các phương án lựa chọn bị trùng lặp với nhau." };
    }
  }

  // 5. Visual cue check: "nhìn hình", "xem hình", "look at the picture", "bảng" without visual
  const visualRegex =
    /(?:nhìn|quan sát|xem)\s+(?:hình|tranh|bức tranh|ảnh|bảng|thời khóa biểu)|look at the (?:picture|image|table)/i;
  const hasGeo = Boolean(q.geometrySpec?.hasGeometry);
  if (visualRegex.test(q.questionText) && !hasGeo) {
    warnings.push("Đề bài nhắc 'xem hình/bảng' nhưng câu hỏi không đính kèm hình vẽ trực quan.");
  }

  // 6. Audio Text Checks
  if (q.audioText && typeof q.audioText === "string") {
    // Check & auto-clean "chấm chấm chấm" or "..."
    if (/\.{3,}|…|chấm\s+chấm/i.test(q.audioText)) {
      q.audioText = q.audioText
        .replace(/\.{3,}|…/g, " gạch ngang ")
        .replace(/chấm\s+chấm(?:\s+chấm)?/gi, "gạch ngang")
        .replace(/\s+/g, " ")
        .trim();
      warnings.push("audio đọc chỗ trống thành 'chấm chấm chấm' (đã tự động chuẩn hóa sang 'gạch ngang').");
    }

    const normAudio = normalizeForComparison(q.audioText);
    const normAns = normalizeForComparison(q.correctAnswer || "");
    const normText = normalizeForComparison(q.questionText || "");

    // ONLY warn if audio reveals answer that is NOT displayed on the question text (e.g. listening test where answer is supposed to be hidden)
    // If the sentence is already visible in questionText, reading it aloud is helpful audio assistance, NOT a leak!
    const isListeningDictation = /nghe|listen/i.test(q.questionText);
    if (
      isListeningDictation &&
      normAns.length >= 3 &&
      normAudio.includes(normAns) &&
      !normText.includes(normAns)
    ) {
      warnings.push(`audioText (${q.audioText}) có thể làm lộ từ cần điền (${q.correctAnswer}).`);
    }
  }

  // 7. Text checks: "chọn từ / khoanh vào" without options
  const requiresOptionsRegex =
    /(?:khoanh\s+vào|chọn\s+(?:đáp\s+án|từ|câu|phương\s+án)|chọn\s+đúng|chọn\s+sai)/i;
  if (
    requiresOptionsRegex.test(q.questionText) &&
    (!Array.isArray(q.options) || q.options.length < 2)
  ) {
    warnings.push("Đề bài ghi 'chọn từ/chọn câu/khoanh vào' nhưng không có các phương án lựa chọn (options).");
  }

  // 8. Text mentions "các từ cho trước" without words
  const givenWordsRegex = /(?:các\s+từ|những\s+từ|từ\s+ngữ)\s+(?:cho\s+trước|dưới\s+đây|sau\s+đây)/i;
  if (givenWordsRegex.test(q.questionText)) {
    const hasBracketsOrList =
      /\[.+\]|\(.+\)|“[^”]+”|"[^"]+"/.test(q.questionText) ||
      (Array.isArray(q.options) && q.options.length >= 2);
    if (!hasBracketsOrList) {
      warnings.push("Đề bài nhắc 'các từ cho trước' nhưng không liệt kê danh sách từ.");
    }
  }

  // 9. Open fill-in with only 1 acceptedAnswer when multiple words are plausible
  if (q.type === "fill_blank" && (!q.options || q.options.length === 0)) {
    const isOpenFill =
      /(?:đang\s+\.{2,}|rất\s+\.{2,}|thật\s+\.{2,}|quá\s+\.{2,})/i.test(q.questionText);
    const acceptedCount = (q.acceptedAnswers || []).length;
    if (isOpenFill && acceptedCount <= 1) {
      warnings.push(
        "Câu điền từ mở có thể có nhiều đáp án hợp lý nhưng danh sách acceptedAnswers chỉ có 1 phương án."
      );
    }
  }

  return {
    valid: true,
    warning: warnings.length > 0 ? warnings.join(" | ") : undefined,
  };
}

// 2. Generate Exam Questions from Scanned Textbook Data or Weak Topics
app.post("/api/ai/generate-exam", async (req, res) => {
  const model = resolveModel(req.body?.model);
  try {
    const {
      subject,
      subjectId = "math",
      grade,
      level,
      count = 5,
      textbookContent,
      preferredCategories,
      weakTopics,
      existingQuestions = [],
      rotationIndex = 0,
    } = req.body;

    const ai = getAiClient();

    // 1. Divide full textbook into lessons/sections & rotate so all chapters get covered
    const fullText = String(textbookContent?.extractedText || "");
    const lessons = extractTextbookLessons(fullText);
    const activeLessonIndex =
      typeof rotationIndex === "number" ? Math.abs(rotationIndex) % lessons.length : 0;
    const activeLessonText = lessons[activeLessonIndex] || lessons[0] || fullText.slice(0, 4000);

    const compactTextbook = textbookContent
      ? {
          title: `${textbookContent.title || "Bài học"} (Phần ${activeLessonIndex + 1}/${lessons.length})`,
          lessonSection: activeLessonText,
          formulasOrRules: Array.isArray(textbookContent.formulasOrRules)
            ? textbookContent.formulasOrRules.slice(0, 12)
            : [],
          sampleExercises: Array.isArray(textbookContent.sampleExercises)
            ? textbookContent.sampleExercises.slice(0, 8)
            : [],
        }
      : {};

    // 2. Anti-duplication: build normalized set of existing questions
    const existingNormalizedSet = new Set<string>();
    const existingSummaryList: string[] = [];

    if (Array.isArray(existingQuestions)) {
      existingQuestions.forEach((q: any) => {
        if (q && q.questionText) {
          const norm = normalizeForComparison(String(q.questionText));
          existingNormalizedSet.add(norm);
          const ansSnippet = q.correctAnswer ? ` -> Đáp án: "${q.correctAnswer}"` : "";
          existingSummaryList.push(`- ${q.questionText.slice(0, 90)}${ansSnippet}`);
        }
      });
    }

    const levelInstruction =
      level === "advanced"
        ? `MỨC NÂNG CAO (advanced - Đòi hỏi tư duy phân tích, tổng hợp sâu hơn hẳn mức cơ bản):
* Môn Tiếng Việt: Phân loại từ (từ chỉ sự vật, hoạt động, đặc điểm), tìm và sửa lỗi sai chính tả/ngữ pháp trong câu, điền từ thích hợp vào đoạn văn ngắn 2-3 câu, tìm cặp từ đồng nghĩa/trái nghĩa.
* Môn Tiếng Anh: Đọc hiểu đoạn văn ngắn 2-3 câu rồi trả lời, tìm lỗi sai ngữ pháp trong câu, chọn cặp từ trái nghĩa.
* Môn Toán: Bài toán giải bằng 2 bước tính, suy luận hình học ngược (biết chu vi tìm cạnh, diện tích phần ghép/khuyết).
TUYỆT ĐỐI KHÔNG dùng kiến thức lớp 1 tầm thường (như đếm 1-5 hay nhận biết 1 chữ cái đơn giản).`
        : `MỨC CƠ BẢN (Biến đổi số liệu & vận dụng chuẩn mực): Tạo câu hỏi bám sát 100% cấu trúc bài tập trong sách giáo khoa đã lưu, chỉ thay đổi con số, kích thước cạnh, tên đồ vật/nhân vật để bé rèn kỹ năng chuẩn xác.`;

    const weakTopicContext =
      Array.isArray(weakTopics) && weakTopics.length > 0
        ? `\nĐẶC BIỆT ƯU TIÊN tạo câu hỏi xoáy sâu vào các phần kiến thức bé đang làm sai/yếu sau đây: ${weakTopics.join(", ")}.`
        : "";

    const categoryContext =
      Array.isArray(preferredCategories) && preferredCategories.length > 0
        ? `\nCÁC CÔNG THỨC, QUY TẮC & DẠNG BÀI TRỌNG TÂM CẦN RA ĐỀ (trích từ OCR bài học): ${preferredCategories.join(" | ")}.`
        : "";

    const existingContext =
      existingSummaryList.length > 0
        ? `\nDANH SÁCH CÂU ĐÃ CÓ TRONG KHO (TUYỆT ĐỐI KHÔNG TẠO TRÙNG HOẶC CÙNG DẠNG/CÙNG TỪ ĐÁP ÁN VỚI CÁC CÂU NÀY):\n${existingSummaryList.slice(0, 45).join("\n")}`
        : "";

    const questionSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          subject: {
            type: Type.STRING,
            description: "Môn học: 'math', 'vietnamese', 'english', hoặc 'science'",
          },
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
            description: "Nội dung câu hỏi rõ ràng, tự đủ dữ kiện 100%.",
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
          acceptedAnswers: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Danh sách các từ đồng nghĩa được chấp nhận cho câu điền từ mở.",
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
    };

    const subjectSpecificInstruction =
      subjectId === "all"
        ? "ĐANG TẠO ĐỀ TỔNG HỢP (TRỘN TẤT CẢ CÁC MÔN: Toán, Tiếng Việt, Tiếng Anh, Khoa học). BẮT BUỘC mỗi câu phải gắn đúng mã trường 'subject' ('math', 'vietnamese', 'english', 'science')."
        : `BẮT BUỘC: ĐỀ THI NÀY CHỈ DÀNH RIÊNG CHO MÔN ${String(subject || "Toán").toUpperCase()} (mã môn: ${subjectId}).
CẤM TUYỆT ĐỐI tạo câu hỏi thuộc môn khác (chọn Toán thì CẤM ra câu Tiếng Việt, Tiếng Anh hay Khoa học).
Trường 'topic' phải là tên chuyên đề thuần túy của môn ${subject || "Toán"}, CẤM gắn tiền tố môn khác như 'Tiếng Việt - ...' hay 'Tiếng Anh - ...'.`;

    const grade2EnglishConstraint =
      subjectId === "english" || subject === "Tiếng Anh"
        ? `\nĐẶC BIỆT MÔN TIẾNG ANH TIỂU HỌC:
- CHỈ sử dụng từ vựng và cấu trúc câu đơn giản có trong SGK lớp ${grade} đã lưu (chào hỏi, gia đình, đồ dùng học tập, màu sắc, số đếm 1-20, con vật, thức ăn).
- TUYỆT ĐỐI TRÁNH các cấu trúc ngữ pháp chưa học của lớp lớn hơn như thì hiện tại đơn ngôi thứ ba số ít thêm s/es ('doesn't like', 'likes', 'plays', 'watches'), thì quá khứ, hay câu bị động.`
        : "";

    // Helper to generate a batch of questions
    const generateBatch = async (requestCount: number, forbiddenList: string[] = []) => {
      const prompt = `Bạn là giáo viên tiểu học giỏi tại Việt Nam đang ra đề cho học sinh Lớp ${grade}, môn ${subject}.
Hãy dựa vào dữ liệu sách giáo khoa dưới đây để tạo đúng ${requestCount} câu hỏi chất lượng cao.

${subjectSpecificInstruction}
${grade2EnglishConstraint}
${levelInstruction}
${weakTopicContext}
${categoryContext}
${existingContext}
${forbiddenList.length > 0 ? `\nCÁC CÂU VỪA TẠO TRONG ĐỢT NÀY (KHÔNG ĐƯỢC LẶP LẠI TỪ VỰNG, ĐÁP ÁN HOẶC BỘ SỐ LIỆU):\n${forbiddenList.join("\n")}` : ""}

Dữ liệu sách giáo khoa (Đang xoay vòng Bài/Phần ${activeLessonIndex + 1}/${lessons.length}):
${JSON.stringify(compactTextbook, null, 2)}

LUẬT RA ĐỀ BẮT BUỘC (TUÂN THỦ 100%):
1. PHÂN BỔ DẠNG BÀI & CHỐNG TRÙNG:
   (a) MỖI DẠNG BÀI / CẤU TRÚC PHÉP TÍNH TỐI ĐA 2 CÂU trong mỗi lần tạo. Tuyệt đối không tạo nhiều câu cùng dạng bài hay cùng một công thức tính (ví dụ: không sinh 4-5 bài đều là 'rót thêm can dầu/xăng' hay đều là 'tìm x').
   (b) BẮT BUỘC phân bổ đều theo các chủ đề chuẩn SGK của môn:
       - Môn Toán: (1) Phép cộng trừ có nhớ trong phạm vi 100/1000; (2) Bảng nhân chia; (3) Đơn vị đo đại lượng (dm, m, km, kg, lít, đồng); (4) Xem đồng hồ, ngày tháng, lịch; (5) Tìm thành phần chưa biết (tìm x, số hạng, thừa số, số bị trừ, số bị chia); (6) So sánh số và thứ tự số; (7) Hình học nhận biết (đoạn thẳng, đường gấp khúc, 3 điểm thẳng hàng, góc vuông, đếm hình); (8) Toán giải bằng 1-2 bước tính.
       - Môn Tiếng Việt: (1) Từ chỉ sự vật, hoạt động, đặc điểm; (2) Các kiểu câu Ai là gì / Ai làm gì / Ai thế nào; (3) Dấu câu; (4) Điền âm vần chính tả; (5) Đọc hiểu đoạn văn ngắn.
2. TỰ ĐỦ DỮ KIỆN: Mỗi câu hỏi PHẢI TỰ ĐỦ 100% DỮ KIỆN để học sinh giải được. CẤM TUYỆT ĐỐI các câu 'Look at the picture', 'Xem hình', 'Dựa vào bảng/thời khóa biểu' nếu không có hình vẽ thật trong geometrySpec hoặc đoạn văn trong đề. Toán có lời văn phải đủ số liệu tính toán.
3. HÌNH VẼ MINH HỌA (geometrySpec):
   - Chỉ bật hasGeometry=true khi hình vẽ khớp 100% với đề (chỉ hỗ trợ: rectangle, square, triangle, right_triangle, trapezoid, parallelogram, circle, composite_l) VÀ mọi số đo trên hình PHẢI XUẤT HIỆN trong đề bài.
   - Các bài về 'đường gấp khúc', 'hình tứ giác' tùy ý, hoặc bài toán lời văn tính chu vi / tìm cạnh còn lại thì TUYỆT ĐỐI KHÔNG DÙNG HÌNH (hasGeometry: false).
4. ĐÚNG DUY NHẤT 1 ĐÁP ÁN: Trắc nghiệm phải có ĐÚNG MỘT đáp án đúng. Phải xét kỹ viết tắt ('She is' vs 'She\\'s'), mạo từ ('a'/'an'/'the'), chữ hoa/thường ('Bạn nam' vs 'Bạn Nam'). Ba đáp án nhiễu phải sai thật sự và không trùng nhau.
5. ĐIỀN TỪ MỞ: Nếu câu hỏi có nhiều từ cùng có thể đúng ('đang ... sách', 'rất ...'), hãy chuyển sang trắc nghiệm 4 đáp án HOẶC cung cấp mảng "acceptedAnswers" chứa các từ đồng nghĩa (ví dụ: ["đọc", "xem"]).
6. KHÔNG HỎI DỮ KIỆN TÙY Ý: Không hỏi tuổi, tên người tùy ý mà bài đọc không nêu.
7. SẮP XẾP TỪ THÀNH CÂU: Mảng "options" PHẢI LÀ 4 CÂU HOÀN CHỈNH (1 câu đúng ngữ pháp, 3 câu sai trật tự từ để học sinh chọn), KHÔNG ĐỂ options là từng từ rời.
8. ĐIỀN ÂM/VẦN (Tiếng Việt): Dấu chấm lửng '...' phải thay thế đúng âm/vần. Khi ghép đáp án vào PHẢI TẠO THÀNH TỪ CÓ NGHĨA chuẩn chính tả tiếng Việt quen thuộc với học sinh lớp ${grade}.
9. XẾP CHỮ CÁI THÀNH TỪ (Tiếng Anh): Kiểm tra đủ và đúng từng chữ cái 1-1, không thừa thiếu chữ.
10. MÔN TIẾNG ANH: TUYỆT ĐỐI KHÔNG ra câu hỏi hình học (chu vi, diện tích).
11. AUDIO TEXT: Với câu ngữ pháp/chính tả CHỈ ĐỌC ĐỀ BÀI, KHÔNG CHỨA ĐÁP ÁN. Chỉ riêng câu nghe điền từ mới đọc từ cần điền (và khi đó questionText không được viết lộ từ đó ra). Tuyệt đối không đọc dấu chấm lửng thành 'chấm chấm chấm'.`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: questionSchema,
        },
      });

      return repairAndParseJson<QuestionCandidate[]>(response.text ?? "[]", "array");
    };

    // 3. First-pass generation
    let rawQuestions = await generateBatch(count);
    if (!Array.isArray(rawQuestions)) rawQuestions = [];

    const batchNormalizedSet = new Set<string>();
    const batchAnswerSet = new Set<string>();
    const topicFormatCountMap = new Map<string, number>();
    const verifiedQuestions: QuestionCandidate[] = [];

    // 4. Code-based validation, anti-clone & topic balance check
    for (const q of rawQuestions) {
      if (!q) continue;
      const codeCheck = validateQuestionCode(
        q,
        String(subjectId),
        existingNormalizedSet,
        batchNormalizedSet,
        existingQuestions,
        verifiedQuestions
      );
      if (!codeCheck.valid) {
        continue; // Discard invalid, duplicate, or clone question
      }

      // Cap each topic/format template at max 2 questions per batch to avoid repetitive formats
      const normTopicKey = normalizeForComparison(q.topic || "chung");
      const currentTopicCount = topicFormatCountMap.get(normTopicKey) || 0;
      if (currentTopicCount >= 2 && verifiedQuestions.length + 1 < count) {
        continue; // Skip excess questions of same format, leave room for other topics
      }

      // Check unique answer key in this batch
      const normAns = normalizeForComparison(q.correctAnswer || "");
      if (normAns.length > 1 && batchAnswerSet.has(normAns) && q.type !== "true_false") {
        continue; // Skip duplicate vocabulary/answer in same batch
      }

      batchNormalizedSet.add(normalizeForComparison(q.questionText));
      if (normAns.length > 1) batchAnswerSet.add(normAns);
      topicFormatCountMap.set(normTopicKey, currentTopicCount + 1);

      if (codeCheck.warning) {
        q.warning = codeCheck.warning;
      }
      verifiedQuestions.push(q);
    }

    // 5. Compensation refill loop (if any duplicates or invalid items were discarded)
    if (verifiedQuestions.length < count) {
      const missingCount = count - verifiedQuestions.length;
      try {
        const forbiddenSnippets = verifiedQuestions.map(
          (q) => `- ${q.questionText.slice(0, 80)} (Đáp án: ${q.correctAnswer})`
        );
        const refillRaw = await generateBatch(missingCount, forbiddenSnippets);

        if (Array.isArray(refillRaw)) {
          for (const q of refillRaw) {
            if (verifiedQuestions.length >= count) break;
            const codeCheck = validateQuestionCode(
              q,
              String(subjectId),
              existingNormalizedSet,
              batchNormalizedSet,
              existingQuestions,
              verifiedQuestions
            );
            if (!codeCheck.valid) continue;

            const normTopicKey = normalizeForComparison(q.topic || "chung");
            const currentTopicCount = topicFormatCountMap.get(normTopicKey) || 0;
            if (currentTopicCount >= 3) continue;

            const normAns = normalizeForComparison(q.correctAnswer || "");
            if (normAns.length > 1 && batchAnswerSet.has(normAns) && q.type !== "true_false") continue;

            batchNormalizedSet.add(normalizeForComparison(q.questionText));
            if (normAns.length > 1) batchAnswerSet.add(normAns);
            topicFormatCountMap.set(normTopicKey, currentTopicCount + 1);

            if (codeCheck.warning) q.warning = codeCheck.warning;
            verifiedQuestions.push(q);
          }
        }
      } catch (refillErr) {
        console.warn("Compensation refill warning:", refillErr);
      }
    }

    // 6. Second-pass AI Auditor (Thẩm định chất lượng từng câu)
    if (verifiedQuestions.length > 0) {
      try {
        const auditItems = verifiedQuestions.map((q, idx) => ({
          index: idx,
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          audioText: q.audioText || "",
        }));

        const auditPrompt = `Bạn là Chuyên gia Khảo thí và Kiểm định Đề thi Tiểu học Việt Nam.
Hãy thẩm định danh sách ${auditItems.length} câu hỏi sau theo các tiêu chí nghiêm ngặt:
1. ĐÁP ÁN: Đáp án đúng có chuẩn xác 100% không?
2. TÍNH DUY NHẤT: Trắc nghiệm có ĐÚNG DUY NHẤT 1 đáp án không? (Xét cả viết tắt, mạo từ, chữ hoa/thường).
3. ĐỦ DỮ KIỆN: Đề bài có tự đủ 100% dữ kiện không? (Có bị thiếu số liệu hoặc nhắc 'nhìn hình/bảng' mà không có không?).
4. LỘ ĐÁP ÁN: Chỉ cảnh báo lộ đáp án khi bài nghe (dictation) giấu từ cần điền nhưng audioText lại đọc lộ ra. Nếu câu/đoạn văn đã in sẵn đầy đủ trên đề bài thì audio đọc là hoàn toàn bình thường để hỗ trợ bé, KHÔNG ĐƯỢC BÁO LỖI.
5. LƯU Ý VỀ OPTIONS & AUDIO:
   - Câu điền từ/điền số (fill_blank) thì options rỗng là bình thường, KHÔNG ĐƯỢC BÁO LỖI THIẾU OPTIONS.
   - audioText rỗng hoặc không có audio KHÔNG PHẢI LÀ LỖI.

Danh sách câu hỏi cần thẩm định:
${JSON.stringify(auditItems, null, 2)}

Trả về mảng JSON đánh giá từng câu:
- index (số nguyên từ 0)
- passed (boolean: true nếu câu hợp lệ; false nếu sai kiến thức, 2 đáp án cùng đúng, hoặc thiếu dữ kiện nghiêm trọng)
- warning (chuỗi cảnh báo ngắn gọn nếu có điểm cần phụ huynh lưu ý, hoặc để trống "")`;

        const auditResponse = await ai.models.generateContent({
          model,
          contents: auditPrompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  index: { type: Type.INTEGER },
                  passed: { type: Type.BOOLEAN },
                  warning: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: ["index", "passed"],
              },
            },
          },
        });

        const auditList = repairAndParseJson<Array<{ index: number; passed: boolean; warning?: string }>>(
          auditResponse.text ?? "[]",
          "array"
        );

        if (Array.isArray(auditList)) {
          auditList.forEach((aud) => {
            const targetQ = verifiedQuestions[aud.index];
            if (targetQ) {
              if (aud.passed === false) {
                targetQ.warning =
                  targetQ.warning || aud.warning || "Câu hỏi bị AI thẩm định đánh giá chưa đạt chuẩn kiến thức.";
              } else if (aud.warning && aud.warning.trim()) {
                targetQ.warning = aud.warning.trim();
              }
            }
          });
        }
      } catch (auditErr) {
        console.warn("AI Auditor pass skipped due to timeout or parse error:", auditErr);
      }
    }

    if (verifiedQuestions.length === 0) {
      res.status(500).json({
        error: `Model '${model}' không sinh được câu hỏi nào đạt chuẩn (0 câu).`,
        hint: "Hãy thử đổi sang model 'gemini-3.8-flash' hoặc 'gemini-4-argon' và bấm tạo lại.",
        modelUsed: model,
      });
      return;
    }

    res.json({ questions: verifiedQuestions, modelUsed: model });
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
