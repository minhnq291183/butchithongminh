import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));

function getAiClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// 1. Scan Textbook Page / Text into Structured JSON
app.post("/api/ai/scan-textbook", async (req, res) => {
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

    const promptText = `Bạn là chuyên gia chương trình Giáo dục Tiểu học Việt Nam (Lớp ${grade || 3}, môn ${subject || "Toán"}).
Hãy đọc kỹ nội dung sách giáo khoa / tài liệu dưới đây (tiêu đề: "${title || "Bài học sách giáo khoa"}") và trích xuất toàn bộ kiến thức sang định dạng JSON chuẩn để lưu trữ làm dữ liệu gốc cho AI ra đề.
${rawText ? `\nNội dung văn bản bổ sung:\n${rawText}` : ""}

Yêu cầu:
1. Quét chính xác văn bản (extractedText), giữ nguyên các con số, bài toán mẫu, câu văn, từ vựng.
2. Tóm tắt kiến thức trọng tâm (summary).
3. Liệt kê các khái niệm/kiến thức cốt lõi (keyConcepts).
4. Liệt kê các công thức, quy tắc tính chu vi, diện tích, quy tắc đếm cạnh/hình, hoặc quy tắc ngữ pháp (formulasOrRules).
5. Trích xuất các bài tập mẫu có trong tài liệu (sampleExercises).`;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            extractedText: {
              type: Type.STRING,
              description: "Toàn bộ nội dung văn bản quét được từ sách giáo khoa.",
            },
            summary: {
              type: Type.STRING,
              description: "Tóm tắt ngắn gọn nội dung bài học.",
            },
            keyConcepts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Danh sách các kiến thức trọng tâm trong bài.",
            },
            formulasOrRules: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Các công thức toán học (chu vi, diện tích, số cạnh...) hoặc quy tắc ngôn ngữ.",
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
              description: "Các dạng bài tập mẫu có trong trang sách.",
            },
          },
          required: ["extractedText", "summary", "keyConcepts", "formulasOrRules", "sampleExercises"],
        },
      },
    });

    const jsonText = (response.text ?? "{}").trim();
    const parsed = JSON.parse(jsonText);
    res.json(parsed);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi khi quét tài liệu sách giáo khoa.";
    console.error("Error in /api/ai/scan-textbook:", error);
    res.status(500).json({ error: message });
  }
});

// 2. Generate Exam Questions from Scanned Textbook Data or Weak Topics
app.post("/api/ai/generate-exam", async (req, res) => {
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
        ? `\nCác dạng bài yêu cầu có trong đề: ${preferredCategories.join(", ")}.`
        : "";

    const prompt = `Bạn là giáo viên tiểu học giỏi tại Việt Nam đang ra đề cho học sinh Lớp ${grade}, môn ${subject}.
Hãy dựa vào dữ liệu sách giáo khoa đã lưu dưới đây để tạo ${count} câu hỏi chất lượng cao.

${levelInstruction}
${weakTopicContext}
${categoryContext}

Dữ liệu sách giáo khoa gốc:
${JSON.stringify(textbookContent || {}, null, 2)}

Quy tắc quan trọng:
1. Nếu câu hỏi thuộc dạng HÌNH HỌC ("Nhận biết hình", "Đếm cạnh/đỉnh/góc", "Tính chu vi", "Tính diện tích"), hãy đặt type = "geometry_visual" (hoặc "multiple_choice" / "fill_blank" kèm geometrySpec) và cung cấp đầy đủ thông số trong "geometrySpec" để phần mềm tự động vẽ hình SVG chính xác cho bé quan sát:
   - shapeType: chọn 1 trong ["rectangle", "square", "triangle", "right_triangle", "trapezoid", "parallelogram", "pentagon", "hexagon", "circle", "composite_l"]
   - width: chiều dài / đáy (số nguyên hoặc thập phân, ví dụ 8)
   - height: chiều rộng / chiều cao (ví dụ 5)
   - topWidth: đáy nhỏ (nếu là hình thang, ví dụ 4)
   - sideA, sideB, sideC: độ dài các cạnh (nếu cần hiển thị)
   - unit: đơn vị đo (ví dụ "cm", "dm", "m")
   - showGrid: true nếu muốn hiển thị lưới ô vuông để bé đếm ô tính diện tích/chu vi hoặc nhận biết hình
   - taskFocus: chọn 1 trong ["identify_shape", "count_sides", "perimeter", "area"]
   - customLabel: nhãn hiển thị thêm trên hình (ví dụ "Hình ABCD")
2. Nếu là dạng trắc nghiệm ("multiple_choice" hoặc "geometry_visual" có 4 lựa chọn), mảng "options" phải có đúng 4 phương án rõ ràng, và "correctAnswer" phải khớp chính xác 100% với 1 trong 4 phương án đó.
3. Nếu là dạng điền kết quả ("fill_blank"), "options" để mảng rỗng [], "correctAnswer" chỉ ghi con số hoặc từ cần điền (ví dụ "24" hoặc "hình chữ nhật").
4. Nếu là môn Tiếng Anh, hãy điền thêm trường "audioText" chứa câu hoặc từ tiếng Anh cần phát âm để bé bấm nút Nghe.
5. Giải thích ("explanation") phải viết thật dễ hiểu, từng bước một dành cho học sinh Lớp ${grade}.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
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
                description: "Chuyên đề cụ thể, ví dụ: 'Tính chu vi hình chữ nhật', 'Nhận biết hình và đếm cạnh', 'Tính diện tích hình vuông'...",
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
                description: "Các phương án lựa chọn (4 đáp án cho trắc nghiệm, 2 cho Đúng/Sai, các mảnh từ cho ordering, hoặc rỗng cho fill_blank).",
              },
              correctAnswer: {
                type: Type.STRING,
                description: "Đáp án đúng chính xác.",
              },
              explanation: {
                type: Type.STRING,
                description: "Lời giải chi tiết từng bước dễ hiểu cho bé.",
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

    const jsonText = (response.text ?? "[]").trim();
    const questions = JSON.parse(jsonText);
    res.json({ questions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi khi tạo đề bằng AI.";
    console.error("Error in /api/ai/generate-exam:", error);
    res.status(500).json({ error: message });
  }
});

// 3. Kid-friendly Vietnamese Dictionary Lookup
app.post("/api/ai/dictionary", async (req, res) => {
  try {
    const { word, grade = 3 } = req.body;
    const ai = getAiClient();

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `Hãy giải nghĩa từ hoặc cụm từ tiếng Việt "${word}" cho học sinh tiểu học Lớp ${grade}.
Giải thích thật trong sáng, ngắn gọn, dễ tưởng tượng, kèm câu ví dụ gần gũi và từ đồng nghĩa/trái nghĩa nếu có.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            wordType: { type: Type.STRING, description: "Từ chỉ sự vật (danh từ), hoạt động (động từ), đặc điểm (tính từ)..." },
            simpleMeaning: { type: Type.STRING, description: "Giải nghĩa ngắn gọn, dễ hiểu cho trẻ tiểu học." },
            exampleSentence: { type: Type.STRING, description: "Câu văn ví dụ mẫu có chứa từ này." },
            relatedWords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Từ gần nghĩa hoặc cùng chủ đề.",
            },
            memoryTip: { type: Type.STRING, description: "Mẹo nhỏ hoặc hình ảnh liên tưởng giúp bé nhớ lâu." },
          },
          required: ["word", "wordType", "simpleMeaning", "exampleSentence", "relatedWords", "memoryTip"],
        },
      },
    });

    const jsonText = (response.text ?? "{}").trim();
    res.json(JSON.parse(jsonText));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Không thể tra từ điển lúc này.";
    console.error("Error in /api/ai/dictionary:", error);
    res.status(500).json({ error: message });
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
    const message = error instanceof Error ? error.message : "Lỗi đọc phát âm AI.";
    console.error("Error in /api/ai/tts:", error);
    res.status(500).json({ error: message });
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
