import React, { useEffect, useMemo, useState } from "react";
import {
  GeometrySpec,
  MistakeRecord,
  QuestionItem,
  QuestionLevel,
  QuestionType,
  ShapeType,
  SubjectId,
  TextbookMaterial,
} from "../types";
import { SUBJECT_META } from "../data/seedData";
import { GeometryVisual } from "./GeometryVisual";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  Cpu,
  Edit3,
  FileText,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";

interface TeacherPortalProps {
  activeChildId: string;
  activeChildName: string;
  grade: number;
  textbooks: TextbookMaterial[];
  questions: QuestionItem[];
  mistakes: MistakeRecord[];
  onAddTextbook: (tb: TextbookMaterial) => void;
  onDeleteTextbook: (id: string) => void;
  onAddQuestions: (items: QuestionItem[]) => void;
  onApproveQuestion: (id: string, updated?: QuestionItem) => void;
  onApproveAllPending: () => void;
  onDeleteQuestion: (id: string) => void;
  onRestoreCompletedQuestion: (questionId: string) => void;
  onRestoreAllCompletedQuestions: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
}

export const AI_MODEL_OPTIONS = [
  {
    id: "gemini-3.8-flash",
    label: "Gemini 3.8 Flash (Mặc định — Khuyên dùng: Chuẩn tiếng Việt & Nhanh)",
    badge: "Mặc định khuyên dùng",
    desc: "Mô hình chính thức khuyên dùng cho Tiếng Việt, câu từ tự nhiên, chuẩn mực sư phạm và tốc độ rất nhanh.",
  },
  {
    id: "gemini-4-argon",
    label: "Gemini 4 Argon / Pro (Mô hình Cao Cấp — Chuyên sâu tư duy & Toán lời văn phức tạp)",
    badge: "Mạnh nhất (Pro)",
    desc: "Lý tưởng cho đề thi nâng cao, phân tích ngữ nghĩa tiếng Việt sâu sắc và toán tư duy 2 bước.",
  },
  {
    id: "gemini-4-carbon",
    label: "Gemini 4 Carbon (Siêu Tư Duy — Thẩm định logic bài toán khắt khe nhất)",
    badge: "Deep Reasoning",
    desc: "Mô hình tư duy sâu với khả năng suy luận logic và kiểm tra dữ kiện chặt chẽ nhất.",
  },
  {
    id: "gemini-flash-latest",
    label: "Gemini Flash Latest (Bản Flash mới nhất — Ổn định cao)",
    badge: "Ổn định",
    desc: "Bản Flash ổn định, tương thích rộng rãi.",
  },
  {
    id: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash Lite (Bản Nhẹ — Tiết kiệm hạn mức Key nhất)",
    badge: "Tiết kiệm",
    desc: "Phù hợp khi cần quét nhanh hoặc tài khoản API Key có hạn mức thấp.",
  },
];

export const TeacherPortal: React.FC<TeacherPortalProps> = ({
  activeChildId,
  activeChildName,
  grade,
  textbooks,
  questions,
  mistakes,
  onAddTextbook,
  onDeleteTextbook,
  onAddQuestions,
  onApproveQuestion,
  onApproveAllPending,
  onDeleteQuestion,
  onRestoreCompletedQuestion,
  onRestoreAllCompletedQuestions,
  onExportBackup,
  onImportBackup,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    | "review_queue"
    | "ai_generator"
    | "textbooks"
    | "manual_create"
    | "approved_bank"
    | "completed_bank"
  >("review_queue");

  // Shared Selected AI Model + Diagnostic Check State
  const [selectedModel, setSelectedModel] = useState<string>("gemini-3.8-flash");
  const [checkingKey, setCheckingKey] = useState<boolean>(false);
  const [keyStatusResult, setKeyStatusResult] = useState<{
    ok: boolean;
    message: string;
    hint?: string;
  } | null>(null);

  // 1. Textbook Scanner State + Progress Bar
  const [tbTitle, setTbTitle] = useState<string>("");
  const [tbSubject, setTbSubject] = useState<SubjectId>("math");
  const [tbGrade, setTbGrade] = useState<number>(grade);
  const [tbRawText, setTbRawText] = useState<string>("");
  const [tbImageBase64, setTbImageBase64] = useState<string>("");
  const [tbMimeType, setTbMimeType] = useState<string>("");
  const [tbFileName, setTbFileName] = useState<string>("");
  const [tbFileSizeKb, setTbFileSizeKb] = useState<number>(0);
  const [fileReadProgress, setFileReadProgress] = useState<number>(0);

  const [scanningTb, setScanningTb] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanStageText, setScanStageText] = useState<string>("");
  const [scanElapsedSec, setScanElapsedSec] = useState<number>(0);
  const [scanError, setScanError] = useState<{ error: string; hint?: string } | null>(null);
  const [scanSuccessMsg, setScanSuccessMsg] = useState<string | null>(null);
  const [selectedTbView, setSelectedTbView] = useState<TextbookMaterial | null>(
    textbooks[0] || null
  );

  // 2. AI Exam Generator State + Dynamic Categories from Scanned Textbook OCR
  const [genTextbookId, setGenTextbookId] = useState<string>(textbooks[0]?.id || "");
  const [genLevel, setGenLevel] = useState<QuestionLevel>("basic");
  const [genCount, setGenCount] = useState<number>(10);
  const [genCategories, setGenCategories] = useState<string[]>([]);
  const [customCategoryInput, setCustomCategoryInput] = useState<string>("");
  const [useWeakTopics, setUseWeakTopics] = useState<boolean>(false);
  const [generatingExam, setGeneratingExam] = useState<boolean>(false);
  const [genProgress, setGenProgress] = useState<number>(0);
  const [genStageText, setGenStageText] = useState<string>("");
  const [genElapsedSec, setGenElapsedSec] = useState<number>(0);
  const [genError, setGenError] = useState<{ error: string; hint?: string } | null>(null);
  const [genSuccessMessage, setGenSuccessMessage] = useState<string | null>(null);

  // Selected textbook for AI Exam Generator
  const currentSelectedTextbook = useMemo(
    () => textbooks.find((t) => t.id === genTextbookId) || textbooks[0] || null,
    [textbooks, genTextbookId]
  );

  // Dynamically build the available categories/rules/concepts directly from the scanned textbook JSON!
  const dynamicTextbookCategories = useMemo(() => {
    if (!currentSelectedTextbook) return [];
    const items = new Set<string>();

    // 1. Pull all Formulas / Rules extracted by OCR from this textbook
    currentSelectedTextbook.formulasOrRules?.forEach((rule) => {
      if (rule && rule.trim()) items.add(rule.trim());
    });

    // 2. Pull Key Concepts extracted by OCR from this textbook
    currentSelectedTextbook.keyConcepts?.forEach((concept) => {
      if (concept && concept.trim()) items.add(concept.trim());
    });

    // 3. Pull Sample Exercise Topic Tags extracted by OCR
    currentSelectedTextbook.sampleExercises?.forEach((ex) => {
      if (ex.topicTag && ex.topicTag.trim()) items.add(ex.topicTag.trim());
    });

    // 4. Add subject-appropriate question formats
    items.add("Dạng: Trắc nghiệm 4 đáp án");
    items.add("Dạng: Điền từ / Điền kết quả vào chỗ trống");
    if (
      currentSelectedTextbook.subject === "vietnamese" ||
      currentSelectedTextbook.subject === "english"
    ) {
      items.add("Dạng: Sắp xếp các từ thành câu hoàn chỉnh");
    }
    if (currentSelectedTextbook.subject === "english") {
      items.add("Dạng: Nghe phát âm Tiếng Anh và chọn/điền đáp án");
    }
    if (currentSelectedTextbook.subject === "math") {
      items.add("Dạng: Toán có hình vẽ minh họa trực quan (SVG)");
    }

    return Array.from(items);
  }, [currentSelectedTextbook]);

  // Whenever the teacher switches to a different textbook, automatically select its scanned rules & concepts!
  useEffect(() => {
    if (dynamicTextbookCategories.length > 0) {
      setGenCategories(dynamicTextbookCategories);
    }
  }, [dynamicTextbookCategories]);

  // 3. Review Queue Inline Edit State
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<QuestionItem | null>(null);

  // 4. Manual Question Creation State
  const [mSubject, setMSubject] = useState<SubjectId>("math");
  const [mGrade, setMGrade] = useState<number>(grade);
  const [mTopic, setMTopic] = useState<string>("Tính chu vi và diện tích");
  const [mLevel, setMLevel] = useState<QuestionLevel>("basic");
  const [mType, setMType] = useState<QuestionType>("geometry_visual");
  const [mQuestionText, setMQuestionText] = useState<string>("");
  const [mAudioText, setMAudioText] = useState<string>("");
  const [mOptions, setMOptions] = useState<string[]>(["", "", "", ""]);
  const [mCorrectAnswer, setMCorrectAnswer] = useState<string>("");
  const [mExplanation, setMExplanation] = useState<string>("");
  const [mHasGeometry, setMHasGeometry] = useState<boolean>(true);
  const [mShapeType, setMShapeType] = useState<ShapeType>("rectangle");
  const [mWidth, setMWidth] = useState<number>(8);
  const [mHeight, setMHeight] = useState<number>(5);
  const [mUnit, setMUnit] = useState<string>("cm");

  // 5. Bank Filter
  const [bankSubjectFilter, setBankSubjectFilter] = useState<SubjectId | "all">("all");

  const pendingQuestions = questions.filter((q) => q.status === "pending_review");
  const uncompletedApprovedQuestions = questions.filter(
    (q) => q.status === "approved" && !q.completedByChildIds?.includes(activeChildId)
  );
  const completedApprovedQuestions = questions.filter(
    (q) => q.status === "approved" && q.completedByChildIds?.includes(activeChildId)
  );

  const weakTopicSummary = Array.from(
    new Set(mistakes.filter((m) => !m.resolved).map((m) => m.topic))
  );

  // Timer & simulated stage progression during OCR Textbook Scan
  useEffect(() => {
    if (!scanningTb) return;
    setScanElapsedSec(0);
    setScanProgress(12);
    setScanStageText("Bước 1/4: Đang chuẩn bị dữ liệu trang sách & mã hóa hình ảnh...");

    const interval = setInterval(() => {
      setScanElapsedSec((prev) => {
        const next = prev + 1;
        if (next === 2) {
          setScanProgress(38);
          setScanStageText(
            `Bước 2/4: Model ${selectedModel} đang quét nhận diện chữ viết & ký hiệu (OCR)...`
          );
        } else if (next === 5) {
          setScanProgress(68);
          setScanStageText(
            "Bước 3/4: Đang bóc tách công thức, quy tắc và bài tập mẫu sang cấu trúc JSON..."
          );
        } else if (next >= 8) {
          setScanProgress((p) => Math.min(92, p + 3));
          setScanStageText(
            "Bước 4/4: Đang kiểm tra tính toàn vẹn dữ liệu JSON trước khi lưu vào kho..."
          );
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [scanningTb, selectedModel]);

  // Elapsed timer during AI Exam Generation
  useEffect(() => {
    if (!generatingExam) return;
    setGenElapsedSec(0);
    const interval = setInterval(() => {
      setGenElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [generatingExam]);

  const handleCheckModelStatus = async (modelToTest = selectedModel) => {
    setCheckingKey(true);
    setKeyStatusResult(null);
    try {
      const res = await fetch("/api/ai/check-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelToTest }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setKeyStatusResult({
          ok: false,
          message: data.error || "Không thể kết nối tới model AI.",
          hint: data.hint,
        });
      } else {
        setKeyStatusResult({
          ok: true,
          message: `Kết nối thành công tới '${data.modelUsed}' (Phản hồi trong ${data.latencyMs}ms). API Key hoạt động tốt!`,
        });
      }
    } catch (err: unknown) {
      setKeyStatusResult({
        ok: false,
        message: err instanceof Error ? err.message : "Lỗi mạng khi kiểm tra kết nối AI.",
      });
    } finally {
      setCheckingKey(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTbFileName(file.name);
    setTbFileSizeKb(Math.max(1, Math.round(file.size / 1024)));
    setFileReadProgress(10);
    setScanError(null);
    setScanSuccessMsg(null);

    const reader = new FileReader();
    reader.onprogress = (ev) => {
      if (ev.lengthComputable) {
        setFileReadProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };

    if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      reader.onload = () => {
        setTbRawText(String(reader.result || ""));
        setFileReadProgress(100);
      };
      reader.readAsText(file);
    } else {
      reader.onload = () => {
        const resultStr = String(reader.result || "");
        const base64Part = resultStr.split(",")[1] || "";
        setTbImageBase64(base64Part);
        setTbMimeType(file.type || "image/png");
        setFileReadProgress(100);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScanTextbook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tbTitle.trim() && !tbFileName && !tbRawText.trim()) {
      setScanError({
        error: "Vui lòng nhập tên bài học, dán văn bản hoặc tải lên ảnh/PDF trang sách giáo khoa.",
      });
      return;
    }
    setScanningTb(true);
    setScanError(null);
    setScanSuccessMsg(null);

    try {
      const res = await fetch("/api/ai/scan-textbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          title: tbTitle.trim() || tbFileName,
          subject: tbSubject,
          grade: tbGrade,
          rawText: tbRawText,
          imageBase64: tbImageBase64 || undefined,
          mimeType: tbMimeType || undefined,
        }),
      });

      let data: Record<string, unknown> = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(
          `Máy chủ trả về phản hồi không phải JSON (Mã HTTP ${res.status}). Hãy thử chọn model nhẹ hơn như gemini-3.1-flash-lite.`
        );
      }

      if (!res.ok) {
        setScanError({
          error: String(data.error || "Lỗi khi quét sách giáo khoa."),
          hint: data.hint ? String(data.hint) : undefined,
        });
        return;
      }

      setScanProgress(100);
      setScanStageText("Hoàn tất 100%! Đã bóc tách thành công sang định dạng Text & JSON.");

      const newTb: TextbookMaterial = {
        id: `tb-${Date.now()}`,
        title: tbTitle.trim() || tbFileName || "Bài học sách giáo khoa",
        subject: tbSubject,
        grade: tbGrade,
        extractedText: String(data.extractedText || tbRawText),
        summary: String(data.summary || ""),
        keyConcepts: Array.isArray(data.keyConcepts) ? (data.keyConcepts as string[]) : [],
        formulasOrRules: Array.isArray(data.formulasOrRules)
          ? (data.formulasOrRules as string[])
          : [],
        sampleExercises: Array.isArray(data.sampleExercises)
          ? (data.sampleExercises as TextbookMaterial["sampleExercises"])
          : [],
        createdAt: new Date().toISOString(),
      };

      onAddTextbook(newTb);
      setSelectedTbView(newTb);
      setGenTextbookId(newTb.id);
      setScanSuccessMsg(
        `Đã quét OCR và lưu thành công bài "${newTb.title}" bằng model ${selectedModel}! Các công thức/quy tắc đã tự động nạp sang phần Tạo đề.`
      );
      setTbTitle("");
      setTbRawText("");
      setTbImageBase64("");
      setTbFileName("");
      setFileReadProgress(0);
    } catch (err: unknown) {
      setScanError({
        error: err instanceof Error ? err.message : "Không thể quét tài liệu.",
        hint: "Hãy thử đổi sang model 'gemini-3.8-flash' hoặc bấm nút 'Kiểm tra Model & Key' ở phía trên.",
      });
    } finally {
      setScanningTb(false);
    }
  };

  const handleGenerateAiExam = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetTb = currentSelectedTextbook;
    const totalRequested = Math.max(1, Math.min(100, genCount));
    const batchSize = 8;
    const totalBatches = Math.ceil(totalRequested / batchSize);

    setGeneratingExam(true);
    setGenError(null);
    setGenSuccessMessage(null);
    setGenProgress(10);

    let totalGeneratedCount = 0;

    try {
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const currentBatchCount = Math.min(
          batchSize,
          totalRequested - batchIndex * batchSize
        );

        setGenStageText(
          totalBatches > 1
            ? `Đang tạo đợt ${batchIndex + 1}/${totalBatches} (${currentBatchCount} câu) — Đã xong ${totalGeneratedCount}/${totalRequested} câu...`
            : `Model ${selectedModel} đang thiết kế ${currentBatchCount} câu hỏi sát theo dữ liệu SGK...`
        );

        const res = await fetch("/api/ai/generate-exam", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: selectedModel,
            subject: targetTb ? SUBJECT_META[targetTb.subject].label : "Toán",
            subjectId: targetTb?.subject || "math",
            grade: targetTb?.grade || grade,
            level: genLevel,
            count: currentBatchCount,
            textbookContent: targetTb
              ? {
                  title: targetTb.title,
                  extractedText: targetTb.extractedText,
                  keyConcepts: targetTb.keyConcepts,
                  formulasOrRules: targetTb.formulasOrRules,
                  sampleExercises: targetTb.sampleExercises,
                }
              : {},
            preferredCategories: genCategories,
            weakTopics: useWeakTopics ? weakTopicSummary : [],
            existingQuestions: questions.map((q) => ({
              questionText: q.questionText,
              correctAnswer: q.correctAnswer,
            })),
            rotationIndex: batchIndex,
          }),
        });

        let data: Record<string, unknown> = {};
        try {
          data = await res.json();
        } catch {
          throw new Error(
            `Máy chủ không phản hồi đúng định dạng JSON ở đợt ${batchIndex + 1} (HTTP ${res.status}).`
          );
        }

        if (!res.ok) {
          setGenError({
            error: String(data.error || "Không thể tạo đề bằng AI."),
            hint: data.hint ? String(data.hint) : undefined,
          });
          return;
        }

        const rawList = Array.isArray(data.questions) ? data.questions : [];
        if (rawList.length > 0) {
          const createdItems: QuestionItem[] = rawList.map(
            (item: Partial<QuestionItem> & { geometrySpec?: GeometrySpec; warning?: string; acceptedAnswers?: string[] }, idx: number) => ({
              id: `q-ai-${Date.now()}-${batchIndex}-${idx}`,
              subject: targetTb?.subject || "math",
              grade: targetTb?.grade || grade,
              topic: item.topic || "Kiến thức trọng tâm",
              level: genLevel,
              type: (item.type as QuestionType) || "multiple_choice",
              status: "pending_review",
              questionText: item.questionText || "",
              audioText: item.audioText || undefined,
              options: Array.isArray(item.options) ? item.options : [],
              correctAnswer: String(item.correctAnswer || ""),
              acceptedAnswers: Array.isArray(item.acceptedAnswers) ? item.acceptedAnswers : undefined,
              explanation: item.explanation || "",
              warning: item.warning || undefined,
              geometrySpec:
                item.geometrySpec &&
                (item.geometrySpec.hasGeometry || item.type === "geometry_visual")
                  ? {
                      hasGeometry: true,
                      shapeType: (item.geometrySpec.shapeType as ShapeType) || "rectangle",
                      width: item.geometrySpec.width || 8,
                      height: item.geometrySpec.height || 5,
                      topWidth: item.geometrySpec.topWidth || 4,
                      sideA: item.geometrySpec.sideA || 6,
                      sideB: item.geometrySpec.sideB || 8,
                      sideC: item.geometrySpec.sideC || 10,
                      unit: item.geometrySpec.unit || "cm",
                      showGrid: item.geometrySpec.showGrid ?? true,
                      taskFocus: item.geometrySpec.taskFocus || "perimeter",
                      customLabel: item.geometrySpec.customLabel || item.topic,
                    }
                  : undefined,
              sourceTextbookId: targetTb?.id,
              completedByChildIds: [],
              createdAt: new Date().toISOString(),
            })
          );

          onAddQuestions(createdItems);
          totalGeneratedCount += createdItems.length;
        }

        const progressPct = Math.min(
          98,
          Math.round(((batchIndex + 1) / totalBatches) * 100)
        );
        setGenProgress(progressPct);
      }

      if (totalGeneratedCount === 0) {
        setGenError({
          error: `Model '${selectedModel}' không sinh được câu hỏi nào (0 câu).`,
          hint: "Bạn hãy thử đổi sang model 'gemini-3.8-flash' hoặc 'gemini-flash-latest' rồi bấm tạo lại nhé.",
        });
        return;
      }

      setGenProgress(100);
      setGenStageText(`Hoàn tất 100%! Đã tạo xong ${totalGeneratedCount} câu hỏi.`);
      setGenSuccessMessage(
        `Thành công! Model '${selectedModel}' đã sinh ${totalGeneratedCount} câu hỏi mới và đưa vào Hàng Đợi Duyệt Tay. Bạn hãy kiểm tra và bấm Duyệt nhé!`
      );
      setActiveSubTab("review_queue");
    } catch (err: unknown) {
      setGenError({
        error: err instanceof Error ? err.message : "Lỗi không xác định khi gọi AI ra đề.",
        hint:
          totalGeneratedCount > 0
            ? `Đã lưu được ${totalGeneratedCount} câu hỏi của các đợt trước vào Hàng Đợi Duyệt Tay.`
            : "Hãy bấm nút 'Kiểm tra Model & Key' hoặc đổi sang model 'gemini-3.8-flash' rồi thử lại.",
      });
    } finally {
      setGeneratingExam(false);
    }
  };

  const handleToggleCategory = (cat: string) => {
    setGenCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleAddCustomCategory = () => {
    const val = customCategoryInput.trim();
    if (!val) return;
    if (!genCategories.includes(val)) {
      setGenCategories((prev) => [...prev, val]);
    }
    setCustomCategoryInput("");
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mQuestionText.trim() || !mCorrectAnswer.trim()) return;

    const cleanOptions =
      mType === "fill_blank"
        ? []
        : mType === "true_false"
        ? ["Đúng", "Sai"]
        : mOptions.map((o) => o.trim()).filter(Boolean);

    const newQ: QuestionItem = {
      id: `q-manual-${Date.now()}`,
      subject: mSubject,
      grade: mGrade,
      topic: mTopic.trim() || "Bài tập tự tạo",
      level: mLevel,
      type: mType,
      status: "approved",
      questionText: mQuestionText.trim(),
      audioText: mAudioText.trim() || undefined,
      options: cleanOptions,
      correctAnswer: mCorrectAnswer.trim(),
      explanation: mExplanation.trim() || `Đáp án đúng là: ${mCorrectAnswer.trim()}`,
      geometrySpec: mHasGeometry
        ? {
            hasGeometry: true,
            shapeType: mShapeType,
            width: mWidth,
            height: mHeight,
            sideA: mWidth,
            sideB: mHeight,
            unit: mUnit,
            showGrid: true,
            customLabel: mTopic,
          }
        : undefined,
      completedByChildIds: [],
      createdAt: new Date().toISOString(),
    };

    onAddQuestions([newQ]);
    setMQuestionText("");
    setMCorrectAnswer("");
    setMExplanation("");
    setActiveSubTab("approved_bank");
  };

  return (
    <div className="space-y-6">
      {/* Header, AI Model Selector & Backup Controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-slate-900">
              Phòng Giáo Viên &amp; Phụ Huynh — Quản Lý SGK &amp; Duyệt Đề AI
            </h1>
            <p className="text-xs text-slate-500">
              Tải sách giáo khoa sang dạng Text/JSON, tạo số lượng câu hỏi tùy ý chờ sẵn và quản lý kho đề Chưa làm / Đã làm của {activeChildName}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExportBackup}
              className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              Xuất file Sao lưu (.json)
            </button>
            <label className="px-3.5 py-2 rounded-lg border border-sky-200 bg-sky-50 text-xs font-semibold text-sky-700 hover:bg-sky-100 cursor-pointer transition-colors whitespace-nowrap shrink-0">
              <span>Nhập file Sao lưu</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImportBackup(file);
                }}
              />
            </label>
          </div>
        </div>

        {/* Global AI Model Selector & API Key Health Checker */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 whitespace-nowrap">
                <Cpu className="w-4 h-4 text-sky-600" />
                <span>Chọn Model AI (Quét SGK &amp; Ra đề):</span>
              </div>
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  setKeyStatusResult(null);
                }}
                className="flex-1 min-w-[240px] max-w-md px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {AI_MODEL_OPTIONS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={checkingKey}
                onClick={() => handleCheckModelStatus(selectedModel)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                {checkingKey ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang kiểm tra Key &amp; Model...</span>
                  </>
                ) : (
                  <>
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Kiểm tra Model &amp; API Key</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <strong className="text-slate-800">Gợi ý chọn Model: </strong>
              <span>
                Mặc định sử dụng <strong>gemini-3.8-flash</strong> (chuẩn tiếng Việt, ngữ pháp tự nhiên, ra đề rất nhanh). Để ra đề Tiếng Việt và Toán nâng cao có lập luận sâu nhất, hãy chọn <strong>gemini-4-argon</strong> hoặc <strong>gemini-4-carbon</strong>.
              </span>
            </div>
          </div>

          {keyStatusResult && (
            <div
              className={`w-full p-3 rounded-lg border text-xs flex flex-col gap-1 ${
                keyStatusResult.ok
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border-rose-300 text-rose-900"
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                {keyStatusResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{keyStatusResult.message}</span>
              </div>
              {keyStatusResult.hint && (
                <div className="text-rose-700 pl-5">{keyStatusResult.hint}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sub-navigation Segmented Bar */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-200/70 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveSubTab("review_queue")}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeSubTab === "review_queue"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          1. Duyệt Đề AI ({pendingQuestions.length} chờ duyệt)
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("ai_generator")}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeSubTab === "ai_generator"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          2. Yêu Cầu AI Ra Đề (Số câu tùy ý)
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("textbooks")}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeSubTab === "textbooks"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          3. Kho Sách Giáo Khoa ({textbooks.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("manual_create")}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeSubTab === "manual_create"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          4. Tự Tạo Câu Hỏi
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("approved_bank")}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeSubTab === "approved_bank"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          5. Đã Duyệt Chờ Bé Làm ({uncompletedApprovedQuestions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("completed_bank")}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeSubTab === "completed_bank"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          6. Mục Bé Đã Làm Xong ({completedApprovedQuestions.length})
        </button>
      </div>

      {genSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-950 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {genSuccessMessage}
          </span>
          <button
            type="button"
            onClick={() => setGenSuccessMessage(null)}
            className="text-emerald-700 underline ml-4"
          >
            Đóng
          </button>
        </div>
      )}

      {/* TAB 1: MANUAL REVIEW QUEUE */}
      {activeSubTab === "review_queue" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Hàng Đợi Duyệt Tay Câu Hỏi Do AI Sinh ({pendingQuestions.length} câu)
              </h2>
              <p className="text-xs text-slate-500">
                Kiểm tra kỹ đề bài, hình vẽ minh họa, đáp án và lời giải. Chỉ những câu đã bấm Duyệt mới xuất hiện trong phần làm bài của con.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveSubTab("ai_generator")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100 whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>Tạo thêm câu hỏi bằng AI</span>
              </button>

              {(() => {
                const validPending = pendingQuestions.filter((q) => !q.warning);
                const warnedPending = pendingQuestions.filter((q) => Boolean(q.warning));

                return (
                  <div className="flex flex-wrap items-center gap-2">
                    {warnedPending.length > 0 && (
                      <span className="px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold">
                        ⚠️ {warnedPending.length} câu có cảnh báo (phải duyệt riêng)
                      </span>
                    )}

                    <button
                      type="button"
                      disabled={validPending.length === 0}
                      onClick={onApproveAllPending}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        Duyệt các câu đạt chuẩn ({validPending.length}/{pendingQuestions.length} câu)
                      </span>
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>

          {pendingQuestions.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <div className="text-sm font-bold text-slate-800">
                Tất cả câu hỏi đều đã được duyệt xong!
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Bạn có thể sang mục "Yêu Cầu AI Ra Đề" để tạo sẵn 20–50 câu hỏi mới từ sách giáo khoa cho bé làm dần mỗi ngày.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingQuestions.map((q, index) => {
                const isEditing = editingQuestionId === q.id && editDraft;
                const item = isEditing ? editDraft : q;
                return (
                  <div
                    key={q.id}
                    className="rounded-xl border border-amber-200 bg-white p-6 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-700">
                          Câu chờ duyệt #{index + 1}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{SUBJECT_META[item.subject].shortLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span>Lớp {item.grade}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          Mức:{" "}
                          <strong className="text-slate-800">
                            {item.level === "advanced" ? "Nâng cao (Tư duy)" : "Cơ bản (Biến đổi số)"}
                          </strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Chuyên đề: {item.topic}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isEditing ? (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingQuestionId(q.id);
                              setEditDraft({ ...q });
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Chỉnh sửa câu</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingQuestionId(null);
                              setEditDraft(null);
                            }}
                            className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                          >
                            Hủy sửa
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteQuestion(q.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-medium"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Loại bỏ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onApproveQuestion(q.id, isEditing ? editDraft : undefined);
                            setEditingQuestionId(null);
                            setEditDraft(null);
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold"
                        >
                          <Check className="w-4 h-4" />
                          <span>{isEditing ? "Lưu & Duyệt vào Ngân hàng" : "Duyệt câu này"}</span>
                        </button>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Nội dung câu hỏi:
                          </label>
                          <textarea
                            rows={2}
                            value={editDraft.questionText}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, questionText: e.target.value })
                            }
                            className="w-full p-2.5 rounded-lg border border-slate-200"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">
                              Đáp án đúng chính xác:
                            </label>
                            <input
                              type="text"
                              value={editDraft.correctAnswer}
                              onChange={(e) =>
                                setEditDraft({ ...editDraft, correctAnswer: e.target.value })
                              }
                              className="w-full p-2 rounded-lg border border-slate-200 font-semibold text-emerald-800"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">
                              Chuyên đề (Tag đánh giá điểm yếu):
                            </label>
                            <input
                              type="text"
                              value={editDraft.topic}
                              onChange={(e) =>
                                setEditDraft({ ...editDraft, topic: e.target.value })
                              }
                              className="w-full p-2 rounded-lg border border-slate-200"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Giải thích chi tiết cho bé:
                          </label>
                          <textarea
                            rows={2}
                            value={editDraft.explanation}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, explanation: e.target.value })
                            }
                            className="w-full p-2.5 rounded-lg border border-slate-200"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        <div
                          className={
                            item.geometrySpec?.hasGeometry
                              ? "lg:col-span-7 space-y-3"
                              : "lg:col-span-12 space-y-3"
                          }
                        >
                          {item.warning && (
                            <div className="p-3 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs font-bold flex items-start gap-2.5">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <span className="font-extrabold uppercase text-[10px] text-amber-800 tracking-wide block">
                                  ⚠️ Cảnh báo chất lượng từ hệ thống kiểm tra &amp; AI:
                                </span>
                                <span className="font-semibold text-amber-900 leading-relaxed">
                                  {item.warning}
                                </span>
                                <p className="text-[11px] text-amber-700 font-normal">
                                  (Câu này bị loại khỏi "Duyệt tất cả". Bố mẹ hãy bấm "Chỉnh sửa câu" hoặc kiểm tra kỹ trước khi bấm "Duyệt câu này")
                                </p>
                              </div>
                            </div>
                          )}

                          <p className="text-base font-bold text-slate-900">{item.questionText}</p>

                          {item.audioText && (
                            <div className="text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                              🔊 Nội dung phát âm (sẽ ẩn chữ khi bé làm bài):{" "}
                              <strong>“{item.audioText}”</strong>
                            </div>
                          )}

                          {Array.isArray(item.acceptedAnswers) && item.acceptedAnswers.length > 0 && (
                            <div className="text-xs text-sky-800 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-200">
                              ✓ Các đáp án đồng nghĩa được chấp nhận:{" "}
                              <strong>{item.acceptedAnswers.join(", ")}</strong>
                            </div>
                          )}
                          {item.options.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {item.options.map((opt, i) => (
                                <div
                                  key={i}
                                  className={`p-2.5 rounded-lg border text-xs font-medium ${
                                    opt === item.correctAnswer
                                      ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                                      : "bg-slate-50 border-slate-200 text-slate-700"
                                  }`}
                                >
                                  {["A", "B", "C", "D"][i] || i + 1}. {opt}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                            <div>
                              <span className="font-bold text-emerald-700">Đáp án đúng: </span>
                              <span className="font-mono-tabular font-bold">
                                {item.correctAnswer}
                              </span>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-700">Lời giải: </span>
                              <span>{item.explanation}</span>
                            </div>
                          </div>
                        </div>

                        {item.geometrySpec?.hasGeometry && (
                          <div className="lg:col-span-5">
                            <GeometryVisual spec={item.geometrySpec} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AI EXAM GENERATOR FROM SCANNED TEXTBOOK */}
      {activeSubTab === "ai_generator" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handleGenerateAiExam}
            className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 space-y-5"
          >
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Trình Tạo Đề AI Từ Dữ Liệu Sách Giáo Khoa Đã Lưu
              </h2>
              <p className="text-xs text-slate-500">
                Các công thức, quy tắc và dạng bài ở Mục 5 bên dưới được tự động lấy trực tiếp từ dữ liệu OCR của bài sách giáo khoa bạn chọn
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  1. Chọn tài liệu Sách Giáo Khoa nguồn:
                </label>
                <select
                  value={genTextbookId}
                  onChange={(e) => setGenTextbookId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-200 bg-white font-semibold"
                >
                  {textbooks.map((tb) => (
                    <option key={tb.id} value={tb.id}>
                      [{SUBJECT_META[tb.subject].shortLabel} - Lớp {tb.grade}] {tb.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  2. Model AI dùng để thiết kế đề:
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-sky-300 bg-sky-50/50 font-semibold text-sky-950"
                >
                  {AI_MODEL_OPTIONS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  3. Chọn mức độ ra đề:
                </label>
                <div className="space-y-2">
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer ${
                      genLevel === "basic"
                        ? "border-sky-500 bg-sky-50/70"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="genLevel"
                      checked={genLevel === "basic"}
                      onChange={() => setGenLevel("basic")}
                      className="mt-1"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-900">Mức Cơ Bản (Biến đổi số liệu)</div>
                      <div className="text-slate-500">
                        Giữ nguyên dạng bài trong SGK, chỉ thay đổi số liệu, từ vựng, ngữ cảnh
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer ${
                      genLevel === "advanced"
                        ? "border-amber-500 bg-amber-50/70"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="genLevel"
                      checked={genLevel === "advanced"}
                      onChange={() => setGenLevel("advanced")}
                      className="mt-1"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-900">Mức Nâng Cao (Mở rộng tư duy)</div>
                      <div className="text-slate-500">
                        Bài tập vận dụng sâu, suy luận 2 bước trong phạm vi kiến thức đã học
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    4. Số lượng câu hỏi muốn tạo (Chọn nhanh hoặc nhập tùy ý):
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {[5, 10, 15, 20, 30, 50].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setGenCount(num)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono-tabular border ${
                          genCount === num
                            ? "bg-sky-600 text-white border-sky-600"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">Nhập số câu tùy ý:</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={genCount}
                      onChange={(e) =>
                        setGenCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))
                      }
                      className="w-24 px-3 py-1.5 text-xs font-bold font-mono-tabular rounded-lg border border-slate-300 bg-white"
                    />
                    <span className="text-xs text-slate-500">câu (Tối đa 100 câu/lần)</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200 space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-bold text-rose-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useWeakTopics}
                      onChange={(e) => setUseWeakTopics(e.target.checked)}
                    />
                    <span>Ưu tiên tạo đề từ phần con đang yếu/hay làm sai</span>
                  </label>
                  <p className="text-[11px] text-rose-700">
                    {weakTopicSummary.length > 0
                      ? `Chuyên đề con từng sai: ${weakTopicSummary.join(", ")}`
                      : "Hiện tại con chưa có câu sai nào tồn đọng."}
                  </p>
                </div>
              </div>
            </div>

            {/* Step 5: Dynamic Categories Extracted Directly from Selected Textbook's OCR Data */}
            <div className="space-y-2.5 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-800">
                  5. Công thức, Quy tắc &amp; Dạng bài trích từ bài học “{currentSelectedTextbook?.title}”:
                </label>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setGenCategories(dynamicTextbookCategories)}
                    className="text-sky-700 font-semibold hover:underline"
                  >
                    Chọn tất cả
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => setGenCategories([])}
                    className="text-slate-500 hover:underline"
                  >
                    Bỏ chọn hết
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {Array.from(new Set([...dynamicTextbookCategories, ...genCategories])).map(
                  (cat) => {
                    const active = genCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleToggleCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border text-left transition-colors ${
                          active
                            ? "bg-sky-600 border-sky-600 text-white font-semibold"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {active ? "✓ " : "+ "}
                        {cat}
                      </button>
                    );
                  }
                )}
              </div>

              {/* Allow adding any custom requirement */}
              <div className="pt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={customCategoryInput}
                  onChange={(e) => setCustomCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomCategory();
                    }
                  }}
                  placeholder="Thêm yêu cầu dạng bài riêng (VD: Tìm từ láy, Đặt câu hỏi When/Where...)"
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddCustomCategory}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 whitespace-nowrap shrink-0"
                >
                  + Thêm dạng này
                </button>
              </div>
            </div>

            {/* Visual Step-by-Step Progress Bar during Exam Generation */}
            {generatingExam && (
              <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-sky-900">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-sky-600 shrink-0" />
                    <span>{genStageText}</span>
                  </span>
                  <span className="font-mono-tabular shrink-0 ml-2">
                    {genProgress}% · {genElapsedSec}s
                  </span>
                </div>
                <div className="w-full h-2.5 bg-sky-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-600 transition-all duration-500"
                    style={{ width: `${genProgress}%` }}
                  />
                </div>
                <div className="text-[11px] text-sky-700">
                  Khi tạo số lượng câu lớn (trên 8 câu), hệ thống tự động chia thành các đợt 8 câu để không bao giờ bị tràn bộ nhớ JSON.
                </div>
              </div>
            )}

            {/* Prominent Diagnostic Error Alert if AI Generation Fails */}
            {genError && (
              <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 space-y-2.5 text-xs">
                <div className="flex items-start gap-2 font-bold text-rose-900">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{genError.error}</span>
                </div>
                {genError.hint && (
                  <p className="text-rose-800 pl-6 leading-relaxed">{genError.hint}</p>
                )}
                <div className="pl-6 pt-1 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedModel("gemini-3.8-flash");
                      setGenError(null);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-800 font-semibold hover:bg-rose-100"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Đổi sang Gemini 3.8 Flash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedModel("gemini-flash-latest");
                      setGenError(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-800 font-semibold hover:bg-rose-100"
                  >
                    Đổi sang Gemini Flash Latest
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={generatingExam}
              className="w-full py-3 px-5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {generatingExam ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang tạo {genCount} câu bằng {selectedModel}...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>
                    Bắt Đầu Tạo {genCount} Câu Hỏi ({selectedModel}) &amp; Đưa Vào Duyệt Tay
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Right Preview of Selected Textbook JSON */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-600" />
              <span>Dữ liệu SGK gốc đang chọn cho AI</span>
            </h3>
            {currentSelectedTextbook && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900">{currentSelectedTextbook.title}</div>
                  <p className="text-slate-600">{currentSelectedTextbook.summary}</p>
                </div>
                <div>
                  <div className="font-bold text-slate-700 mb-1">
                    Công thức &amp; Quy tắc OCR đã trích xuất:
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-700">
                    {currentSelectedTextbook.formulasOrRules.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-bold text-slate-700 mb-1">
                    Kiến thức trọng tâm trong bài:
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-700">
                    {currentSelectedTextbook.keyConcepts.map((k, i) => (
                      <li key={i}>{k}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-bold text-slate-700 mb-1">
                    Văn bản đã quét (Text lưu trữ):
                  </div>
                  <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {currentSelectedTextbook.extractedText}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TEXTBOOK SCANNER & JSON REPOSITORY */}
      {activeSubTab === "textbooks" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handleScanTextbook}
            className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6 space-y-4"
          >
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Tải Sách Giáo Khoa Lên &amp; Quét OCR Sang Text / JSON
              </h2>
              <p className="text-xs text-slate-500">
                Hỗ trợ ảnh chụp trang sách (.jpg, .png), tài liệu PDF hoặc dán trực tiếp nội dung bài học
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Model AI dùng để quét OCR &amp; bóc tách JSON:
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-sky-300 bg-sky-50/50 text-sky-950"
              >
                {AI_MODEL_OPTIONS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên bài học / Chương sách giáo khoa:
              </label>
              <input
                type="text"
                value={tbTitle}
                onChange={(e) => setTbTitle(e.target.value)}
                placeholder="VD: Tiếng Anh 3 - Unit 5: My Hobbies"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Môn học:</label>
                <select
                  value={tbSubject}
                  onChange={(e) => setTbSubject(e.target.value as SubjectId)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                >
                  <option value="math">Toán &amp; Hình Học</option>
                  <option value="vietnamese">Tiếng Việt</option>
                  <option value="english">Tiếng Anh</option>
                  <option value="science">TN &amp; XH / Khoa học</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Khối lớp:</label>
                <select
                  value={tbGrade}
                  onChange={(e) => setTbGrade(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                >
                  {[1, 2, 3, 4, 5].map((g) => (
                    <option key={g} value={g}>
                      Lớp {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Tải lên ảnh trang sách / PDF / File Text:
              </label>
              <label className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl border-2 border-dashed border-sky-200 bg-sky-50/40 hover:bg-sky-50 cursor-pointer text-xs text-sky-800">
                <Upload className="w-5 h-5 text-sky-600" />
                <span className="font-semibold">
                  {tbFileName
                    ? `Đã nạp file: ${tbFileName} (${tbFileSizeKb} KB)`
                    : "Bấm để chọn ảnh trang SGK (.png, .jpg) hoặc file PDF"}
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf,.txt,.md"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>

              {tbFileName && fileReadProgress > 0 && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-[11px]">
                  <div className="flex items-center justify-between font-semibold text-slate-700">
                    <span>Tiến trình đọc file vào bộ nhớ:</span>
                    <span className="font-mono-tabular text-emerald-700">{fileReadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 transition-all duration-300"
                      style={{ width: `${fileReadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hoặc dán/nhập văn bản bài học SGK:
              </label>
              <textarea
                rows={4}
                value={tbRawText}
                onChange={(e) => setTbRawText(e.target.value)}
                placeholder="Dán nội dung bài học, công thức, quy tắc ngữ pháp, từ vựng..."
                className="w-full p-3 text-xs rounded-lg border border-slate-200"
              />
            </div>

            {scanningTb && (
              <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-sky-900">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-sky-600 shrink-0" />
                    <span>{scanStageText}</span>
                  </span>
                  <span className="font-mono-tabular shrink-0 ml-2">
                    {scanProgress}% · {scanElapsedSec}s
                  </span>
                </div>
                <div className="w-full h-2.5 bg-sky-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-600 transition-all duration-500"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            )}

            {scanSuccessMsg && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{scanSuccessMsg}</span>
              </div>
            )}

            {scanError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-300 text-xs space-y-2">
                <div className="font-bold text-rose-900 flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{scanError.error}</span>
                </div>
                {scanError.hint && <p className="text-rose-800 pl-5">{scanError.hint}</p>}
              </div>
            )}

            <button
              type="submit"
              disabled={scanningTb}
              className="w-full py-2.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2"
            >
              {scanningTb ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang quét OCR ({scanProgress}%)...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Quét OCR ({selectedModel}) &amp; Lưu Vào Kho SGK</span>
                </>
              )}
            </button>
          </form>

          {/* Stored Textbooks List & JSON Inspector */}
          <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Kho Sách Giáo Khoa Đã Lưu Trữ ({textbooks.length} bài học)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {textbooks.map((tb) => (
                <div
                  key={tb.id}
                  onClick={() => setSelectedTbView(tb)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-colors flex flex-col justify-between gap-2 ${
                    selectedTbView?.id === tb.id
                      ? "border-sky-500 bg-sky-50/60"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <div className="text-[11px] text-slate-500">
                      {SUBJECT_META[tb.subject].shortLabel} · Lớp {tb.grade}
                    </div>
                    <div className="text-xs font-bold text-slate-900 line-clamp-2 mt-0.5">
                      {tb.title}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                    <span className="text-sky-700 font-medium">
                      {tb.formulasOrRules.length} quy tắc · {tb.sampleExercises.length} bài mẫu
                    </span>
                    {textbooks.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTextbook(tb.id);
                        }}
                        className="text-rose-600 hover:underline"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {selectedTbView && (
              <div className="pt-4 border-t border-slate-200 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">{selectedTbView.title}</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setGenTextbookId(selectedTbView.id);
                      setActiveSubTab("ai_generator");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 whitespace-nowrap shrink-0"
                  >
                    Dùng bài này để AI ra đề →
                  </button>
                </div>
                <p className="text-slate-600">{selectedTbView.summary}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-800 mb-1">Kiến thức &amp; Quy tắc:</div>
                    <ul className="list-disc pl-4 space-y-1 text-slate-700">
                      {selectedTbView.formulasOrRules.map((rule, i) => (
                        <li key={i}>{rule}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-800 mb-1">Dữ liệu JSON đã bóc tách:</div>
                    <pre className="text-[11px] font-mono text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {JSON.stringify(
                        {
                          keyConcepts: selectedTbView.keyConcepts,
                          sampleExercises: selectedTbView.sampleExercises,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: MANUAL QUESTION & GEOMETRY BUILDER */}
      {activeSubTab === "manual_create" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handleManualSubmit}
            className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 space-y-4 text-xs"
          >
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Tự Tạo Câu Hỏi Vào Ngân Hàng Đề
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Môn học:</label>
                <select
                  value={mSubject}
                  onChange={(e) => setMSubject(e.target.value as SubjectId)}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="math">Toán &amp; Hình Học</option>
                  <option value="vietnamese">Tiếng Việt</option>
                  <option value="english">Tiếng Anh</option>
                  <option value="science">TN &amp; XH / Khoa học</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dạng bài:</label>
                <select
                  value={mType}
                  onChange={(e) => setMType(e.target.value as QuestionType)}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="geometry_visual">Hình học trực quan (Có hình vẽ)</option>
                  <option value="multiple_choice">Trắc nghiệm 4 đáp án</option>
                  <option value="fill_blank">Điền số / Điền từ</option>
                  <option value="true_false">Đúng / Sai</option>
                  <option value="ordering">Sắp xếp thứ tự từ/câu</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mức độ:</label>
                <select
                  value={mLevel}
                  onChange={(e) => setMLevel(e.target.value as QuestionLevel)}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="basic">Cơ bản</option>
                  <option value="advanced">Nâng cao</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Chuyên đề (Dùng để theo dõi lỗ hổng kiến thức):
              </label>
              <input
                type="text"
                value={mTopic}
                onChange={(e) => setMTopic(e.target.value)}
                placeholder="VD: Tính chu vi hình chữ nhật, Từ vựng chủ đề Động vật..."
                className="w-full p-2 rounded-lg border border-slate-200"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nội dung câu hỏi:</label>
              <textarea
                rows={2}
                required
                value={mQuestionText}
                onChange={(e) => setMQuestionText(e.target.value)}
                placeholder="Nhập đề bài..."
                className="w-full p-2.5 rounded-lg border border-slate-200"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-200 space-y-3">
              <label className="flex items-center gap-2 font-bold text-sky-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mHasGeometry}
                  onChange={(e) => setMHasGeometry(e.target.checked)}
                />
                <span>Đính kèm Hình Vẽ Trực Quan (Nhận biết hình, đếm cạnh, chu vi, diện tích)</span>
              </label>

              {mHasGeometry && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-slate-600 mb-1">Loại hình:</label>
                    <select
                      value={mShapeType}
                      onChange={(e) => setMShapeType(e.target.value as ShapeType)}
                      className="w-full p-1.5 rounded border border-slate-200 bg-white"
                    >
                      <option value="rectangle">Hình chữ nhật</option>
                      <option value="square">Hình vuông</option>
                      <option value="right_triangle">Tam giác vuông</option>
                      <option value="triangle">Tam giác thường</option>
                      <option value="pentagon">Hình ngũ giác (5 cạnh)</option>
                      <option value="hexagon">Hình lục giác (6 cạnh)</option>
                      <option value="trapezoid">Hình thang</option>
                      <option value="composite_l">Hình chữ L (Ghép hình)</option>
                      <option value="circle">Hình tròn</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Chiều dài / Cạnh a:</label>
                    <input
                      type="number"
                      value={mWidth}
                      onChange={(e) => setMWidth(Number(e.target.value))}
                      className="w-full p-1.5 rounded border border-slate-200 bg-white font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Chiều rộng / Cạnh b:</label>
                    <input
                      type="number"
                      value={mHeight}
                      onChange={(e) => setMHeight(Number(e.target.value))}
                      className="w-full p-1.5 rounded border border-slate-200 bg-white font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Đơn vị đo:</label>
                    <input
                      type="text"
                      value={mUnit}
                      onChange={(e) => setMUnit(e.target.value)}
                      className="w-full p-1.5 rounded border border-slate-200 bg-white font-mono-tabular"
                    />
                  </div>
                </div>
              )}
            </div>

            {mType !== "fill_blank" && mType !== "true_false" && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  4 Phương án lựa chọn (hoặc các cụm từ cần sắp xếp):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {mOptions.map((opt, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const copy = [...mOptions];
                        copy[idx] = e.target.value;
                        setMOptions(copy);
                      }}
                      placeholder={`Phương án ${idx + 1}`}
                      className="p-2 rounded-lg border border-slate-200"
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Đáp án đúng chính xác:
                </label>
                <input
                  type="text"
                  required
                  value={mCorrectAnswer}
                  onChange={(e) => setMCorrectAnswer(e.target.value)}
                  placeholder="Phải khớp với 1 phương án hoặc số cần điền"
                  className="w-full p-2 rounded-lg border border-slate-200 font-bold text-emerald-700"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Câu đọc phát âm Tiếng Anh (sẽ ẩn chữ khi bé làm bài):
                </label>
                <input
                  type="text"
                  value={mAudioText}
                  onChange={(e) => setMAudioText(e.target.value)}
                  placeholder="VD: It has four equal sides."
                  className="w-full p-2 rounded-lg border border-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Hướng dẫn giải chi tiết:
              </label>
              <textarea
                rows={2}
                value={mExplanation}
                onChange={(e) => setMExplanation(e.target.value)}
                placeholder="Lời giải giúp con hiểu bài khi làm xong..."
                className="w-full p-2 rounded-lg border border-slate-200"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Lưu Thẳng Vào Ngân Hàng Câu Hỏi Chính Thức</span>
            </button>
          </form>

          {/* Live Geometry Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <div className="text-sm font-bold text-slate-900">
                Xem trước Hình học trực quan
              </div>
              {mHasGeometry ? (
                <GeometryVisual
                  spec={{
                    hasGeometry: true,
                    shapeType: mShapeType,
                    width: mWidth,
                    height: mHeight,
                    sideA: mWidth,
                    sideB: mHeight,
                    unit: mUnit,
                    showGrid: true,
                    customLabel: mTopic,
                  }}
                />
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  Câu hỏi này không bật hình minh họa.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: APPROVED UNCOMPLETED QUESTION BANK */}
      {activeSubTab === "approved_bank" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Ngân Hàng Đề Đã Duyệt Chờ {activeChildName} Làm ({uncompletedApprovedQuestions.length} câu)
              </h2>
              <p className="text-xs text-slate-500">
                Những câu này hiện đang sẵn sàng cho bé làm. Khi bé làm xong câu nào, câu đó sẽ tự động trừ khỏi đây và chuyển sang mục "Bé Đã Làm Xong".
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              {(["all", "math", "vietnamese", "english", "science"] as const).map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setBankSubjectFilter(sub)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    bankSubjectFilter === sub
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {sub === "all" ? "Tất cả môn" : SUBJECT_META[sub].shortLabel}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {uncompletedApprovedQuestions
              .filter((q) => bankSubjectFilter === "all" || q.subject === bankSubjectFilter)
              .map((q) => (
                <div
                  key={q.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {SUBJECT_META[q.subject].shortLabel} · Lớp {q.grade} ·{" "}
                        {q.level === "advanced" ? "Nâng cao" : "Cơ bản"} · {q.topic}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteQuestion(q.id)}
                        className="text-rose-600 hover:underline"
                      >
                        Xóa
                      </button>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{q.questionText}</p>
                    <div className="text-xs text-emerald-700 font-semibold">
                      Đáp án: {q.correctAnswer}
                    </div>
                  </div>
                  {q.geometrySpec?.hasGeometry && (
                    <div className="pt-2">
                      <GeometryVisual spec={q.geometrySpec} />
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 6: COMPLETED QUESTIONS ARCHIVE */}
      {activeSubTab === "completed_bank" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Mục Câu Hỏi {activeChildName} Đã Làm Xong ({completedApprovedQuestions.length} câu)
              </h2>
              <p className="text-xs text-slate-500">
                Các câu hỏi này đã bị trừ khỏi Ngân hàng đề chờ làm để bé không thể làm đi làm lại lấy thưởng YouTube. Nếu muốn cho bé làm lại, bạn có thể bấm Khôi phục.
              </p>
            </div>

            {completedApprovedQuestions.length > 0 && (
              <button
                type="button"
                onClick={onRestoreAllCompletedQuestions}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Khôi phục tất cả ({completedApprovedQuestions.length} câu) về Ngân hàng Chờ làm</span>
              </button>
            )}
          </div>

          {completedApprovedQuestions.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
              Hiện chưa có câu hỏi nào trong mục Đã làm xong của {activeChildName}. Khi bé hoàn thành bài tập ở Góc Học Tập, các câu đã làm sẽ chuyển về đây.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedApprovedQuestions.map((q) => (
                <div
                  key={q.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {SUBJECT_META[q.subject].shortLabel} · {q.topic}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRestoreCompletedQuestion(q.id)}
                        className="inline-flex items-center gap-1 text-sky-700 font-semibold hover:underline"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Chuyển lại vào Ngân hàng Chờ làm</span>
                      </button>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{q.questionText}</p>
                    <div className="text-xs text-emerald-700 font-semibold">
                      Đáp án: {q.correctAnswer}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
