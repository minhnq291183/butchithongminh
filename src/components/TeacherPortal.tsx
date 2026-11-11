import React, { useState } from "react";
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
  BookOpen,
  Check,
  CheckCircle2,
  Edit3,
  FileText,
  Filter,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  AlertTriangle,
} from "lucide-react";

interface TeacherPortalProps {
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
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
}

const GEOMETRY_CATEGORIES = [
  "Nhận biết hình và đếm cạnh/đỉnh",
  "Tính chu vi hình chữ nhật, hình vuông, tam giác",
  "Tính diện tích hình chữ nhật, hình vuông, hình ghép",
  "Trắc nghiệm 4 đáp án",
  "Điền số / Điền từ vào chỗ trống",
  "Sắp xếp từ thành câu / Sắp xếp thứ tự",
];

export const TeacherPortal: React.FC<TeacherPortalProps> = ({
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
  onExportBackup,
  onImportBackup,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    "review_queue" | "ai_generator" | "textbooks" | "manual_create" | "approved_bank"
  >("review_queue");

  // 1. Textbook Scanner State
  const [tbTitle, setTbTitle] = useState<string>("");
  const [tbSubject, setTbSubject] = useState<SubjectId>("math");
  const [tbGrade, setTbGrade] = useState<number>(grade);
  const [tbRawText, setTbRawText] = useState<string>("");
  const [tbImageBase64, setTbImageBase64] = useState<string>("");
  const [tbMimeType, setTbMimeType] = useState<string>("");
  const [tbFileName, setTbFileName] = useState<string>("");
  const [scanningTb, setScanningTb] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [selectedTbView, setSelectedTbView] = useState<TextbookMaterial | null>(
    textbooks[0] || null
  );

  // 2. AI Exam Generator State
  const [genTextbookId, setGenTextbookId] = useState<string>(textbooks[0]?.id || "");
  const [genLevel, setGenLevel] = useState<QuestionLevel>("basic");
  const [genCount, setGenCount] = useState<number>(5);
  const [genCategories, setGenCategories] = useState<string[]>([
    "Nhận biết hình và đếm cạnh/đỉnh",
    "Tính chu vi hình chữ nhật, hình vuông, tam giác",
    "Tính diện tích hình chữ nhật, hình vuông, hình ghép",
  ]);
  const [useWeakTopics, setUseWeakTopics] = useState<boolean>(false);
  const [generatingExam, setGeneratingExam] = useState<boolean>(false);
  const [genMessage, setGenMessage] = useState<string | null>(null);

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
  const approvedQuestions = questions.filter((q) => q.status === "approved");

  const weakTopicSummary = Array.from(
    new Set(mistakes.filter((m) => !m.resolved).map((m) => m.topic))
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTbFileName(file.name);

    if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      const reader = new FileReader();
      reader.onload = () => {
        setTbRawText(String(reader.result || ""));
      };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const resultStr = String(reader.result || "");
        const base64Part = resultStr.split(",")[1] || "";
        setTbImageBase64(base64Part);
        setTbMimeType(file.type || "image/png");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScanTextbook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tbTitle.trim() && !tbFileName) {
      setScanError("Vui lòng nhập tên bài học hoặc tải lên trang sách giáo khoa.");
      return;
    }
    setScanningTb(true);
    setScanError(null);

    try {
      const res = await fetch("/api/ai/scan-textbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: tbTitle.trim() || tbFileName,
          subject: tbSubject,
          grade: tbGrade,
          rawText: tbRawText,
          imageBase64: tbImageBase64 || undefined,
          mimeType: tbMimeType || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Lỗi khi quét sách giáo khoa.");
      }

      const newTb: TextbookMaterial = {
        id: `tb-${Date.now()}`,
        title: tbTitle.trim() || tbFileName || "Bài học sách giáo khoa",
        subject: tbSubject,
        grade: tbGrade,
        extractedText: data.extractedText || tbRawText,
        summary: data.summary || "",
        keyConcepts: data.keyConcepts || [],
        formulasOrRules: data.formulasOrRules || [],
        sampleExercises: data.sampleExercises || [],
        createdAt: new Date().toISOString(),
      };

      onAddTextbook(newTb);
      setSelectedTbView(newTb);
      setGenTextbookId(newTb.id);
      setTbTitle("");
      setTbRawText("");
      setTbImageBase64("");
      setTbFileName("");
    } catch (err: unknown) {
      setScanError(err instanceof Error ? err.message : "Không thể quét tài liệu.");
    } finally {
      setScanningTb(false);
    }
  };

  const handleGenerateAiExam = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetTb = textbooks.find((t) => t.id === genTextbookId) || textbooks[0];
    setGeneratingExam(true);
    setGenMessage(null);

    try {
      const res = await fetch("/api/ai/generate-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: targetTb ? SUBJECT_META[targetTb.subject].label : "Toán",
          grade: targetTb?.grade || grade,
          level: genLevel,
          count: genCount,
          textbookContent: targetTb
            ? {
                title: targetTb.title,
                extractedText: targetTb.extractedText,
                formulasOrRules: targetTb.formulasOrRules,
                sampleExercises: targetTb.sampleExercises,
              }
            : {},
          preferredCategories: genCategories,
          weakTopics: useWeakTopics ? weakTopicSummary : [],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể tạo đề bằng AI.");
      }

      const rawList = Array.isArray(data.questions) ? data.questions : [];
      const createdItems: QuestionItem[] = rawList.map(
        (item: Partial<QuestionItem> & { geometrySpec?: GeometrySpec }, idx: number) => ({
          id: `q-ai-${Date.now()}-${idx}`,
          subject: targetTb?.subject || "math",
          grade: targetTb?.grade || grade,
          topic: item.topic || "Kiến thức trọng tâm",
          level: genLevel,
          type: (item.type as QuestionType) || "multiple_choice",
          status: "pending_review", // Always requires manual approval first!
          questionText: item.questionText || "",
          audioText: item.audioText || undefined,
          options: Array.isArray(item.options) ? item.options : [],
          correctAnswer: String(item.correctAnswer || ""),
          explanation: item.explanation || "",
          geometrySpec:
            item.geometrySpec && (item.geometrySpec.hasGeometry || item.type === "geometry_visual")
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
          createdAt: new Date().toISOString(),
        })
      );

      onAddQuestions(createdItems);
      setGenMessage(
        `AI đã sinh ${createdItems.length} câu hỏi mới và đưa vào Hàng Đợi Duyệt Tay. Bạn hãy kiểm tra trước khi cho bé làm nhé!`
      );
      setActiveSubTab("review_queue");
    } catch (err: unknown) {
      setGenMessage(err instanceof Error ? err.message : "Lỗi khi gọi AI ra đề.");
    } finally {
      setGeneratingExam(false);
    }
  };

  const handleToggleCategory = (cat: string) => {
    setGenCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
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
      {/* Header & Backup Controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900">
            Phòng Giáo Viên &amp; Phụ Huynh — Quản Lý SGK &amp; Duyệt Đề AI
          </h1>
          <p className="text-xs text-slate-500">
            Tải sách giáo khoa sang dạng Text/JSON, yêu cầu AI ra đề 2 mức Cơ bản / Nâng cao và duyệt tay trước khi đưa vào ngân hàng câu hỏi của bé
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

      {/* Sub-navigation Segmented Bar */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-200/70 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveSubTab("review_queue")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeSubTab === "review_queue"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          1. Duyệt Đề AI ({pendingQuestions.length} câu chờ duyệt)
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("ai_generator")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeSubTab === "ai_generator"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          2. Yêu Cầu AI Ra Đề (Cơ bản &amp; Nâng cao)
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("textbooks")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeSubTab === "textbooks"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          3. Kho Sách Giáo Khoa ({textbooks.length} tài liệu JSON)
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("manual_create")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeSubTab === "manual_create"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          4. Tự Tạo Câu Hỏi &amp; Hình Học
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("approved_bank")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeSubTab === "approved_bank"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          5. Ngân Hàng Đề Đã Duyệt ({approvedQuestions.length})
        </button>
      </div>

      {genMessage && (
        <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-xs font-medium text-sky-900 flex items-center justify-between">
          <span>{genMessage}</span>
          <button
            type="button"
            onClick={() => setGenMessage(null)}
            className="text-sky-700 underline ml-4"
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveSubTab("ai_generator")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100 whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>Tạo thêm câu hỏi bằng AI</span>
              </button>
              {pendingQuestions.length > 0 && (
                <button
                  type="button"
                  onClick={onApproveAllPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 whitespace-nowrap shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Duyệt tất cả ({pendingQuestions.length} câu)</span>
                </button>
              )}
            </div>
          </div>

          {pendingQuestions.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <div className="text-sm font-bold text-slate-800">
                Tất cả câu hỏi đều đã được duyệt xong!
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Bạn có thể sang mục "Yêu Cầu AI Ra Đề" để tạo thêm bài tập từ sách giáo khoa hoặc từ các chủ đề con đang làm sai.
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
                            item.geometrySpec?.hasGeometry ? "lg:col-span-7 space-y-3" : "lg:col-span-12 space-y-3"
                          }
                        >
                          <p className="text-base font-bold text-slate-900">{item.questionText}</p>
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
                              <span className="font-mono-tabular font-bold">{item.correctAnswer}</span>
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
                AI sẽ lấy trực tiếp kiến thức, công thức và bài mẫu từ sách giáo khoa JSON để sinh đề rồi chuyển sang Hàng Đợi Duyệt Tay
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                1. Chọn tài liệu Sách Giáo Khoa nguồn:
              </label>
              <select
                value={genTextbookId}
                onChange={(e) => setGenTextbookId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 bg-white font-medium"
              >
                {textbooks.map((tb) => (
                  <option key={tb.id} value={tb.id}>
                    [{SUBJECT_META[tb.subject].shortLabel} - Lớp {tb.grade}] {tb.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  2. Chọn mức độ ra đề:
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
                        Giữ nguyên dạng bài trong SGK, chỉ thay đổi số đo cạnh, con số, tên gọi
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
                        Bài toán nhiều bước, ghép hình, tìm cạnh ngược từ chu vi/diện tích trong phạm vi đã học
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    3. Số lượng câu hỏi muốn tạo:
                  </label>
                  <div className="flex items-center gap-2">
                    {[3, 5, 8, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setGenCount(num)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-bold font-mono-tabular border ${
                          genCount === num
                            ? "bg-sky-600 text-white border-sky-600"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {num} câu
                      </button>
                    ))}
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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                4. Các dạng bài ưu tiên đưa vào đề (Bấm để chọn/bỏ chọn):
              </label>
              <div className="flex flex-wrap gap-2">
                {GEOMETRY_CATEGORIES.map((cat) => {
                  const active = genCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleToggleCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        active
                          ? "bg-sky-50 border-sky-300 text-sky-900 font-semibold"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {active ? "✓ " : "+ "}
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={generatingExam}
              className="w-full py-3 px-5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {generatingExam ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>AI đang đọc dữ liệu SGK và thiết kế câu hỏi + hình vẽ...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Bắt Đầu Tạo Đề &amp; Đưa Vào Hàng Đợi Duyệt Tay</span>
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
            {(() => {
              const currentTb = textbooks.find((t) => t.id === genTextbookId) || textbooks[0];
              if (!currentTb) return null;
              return (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-900">{currentTb.title}</div>
                    <p className="text-slate-600">{currentTb.summary}</p>
                  </div>
                  <div>
                    <div className="font-bold text-slate-700 mb-1">
                      Công thức &amp; Quy tắc trong bài:
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-slate-700">
                      {currentTb.formulasOrRules.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-bold text-slate-700 mb-1">
                      Văn bản đã quét (Text lưu trữ):
                    </div>
                    <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {currentTb.extractedText}
                    </pre>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 3: TEXTBOOK SCANNER & JSON REPOSITORY */}
      {activeSubTab === "textbooks" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Upload & Scan Form */}
          <form
            onSubmit={handleScanTextbook}
            className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6 space-y-4"
          >
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Tải Sách Giáo Khoa Lên &amp; Quét Sang Text / JSON
              </h2>
              <p className="text-xs text-slate-500">
                Hỗ trợ ảnh chụp trang sách (.jpg, .png), tài liệu PDF hoặc dán trực tiếp nội dung bài học
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên bài học / Chương sách giáo khoa:
              </label>
              <input
                type="text"
                value={tbTitle}
                onChange={(e) => setTbTitle(e.target.value)}
                placeholder="VD: Toán 3 - Bài 52: Diện tích hình chữ nhật, hình vuông"
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tải lên ảnh trang sách / PDF / File Text:
              </label>
              <label className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl border-2 border-dashed border-sky-200 bg-sky-50/40 hover:bg-sky-50 cursor-pointer text-xs text-sky-800">
                <Upload className="w-5 h-5 text-sky-600" />
                <span className="font-semibold">
                  {tbFileName ? `Đã chọn: ${tbFileName}` : "Bấm để chọn ảnh trang SGK hoặc PDF"}
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf,.txt,.md"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hoặc dán/nhập văn bản bài học SGK:
              </label>
              <textarea
                rows={4}
                value={tbRawText}
                onChange={(e) => setTbRawText(e.target.value)}
                placeholder="Dán nội dung bài học, công thức tính chu vi, diện tích, bài tập mẫu..."
                className="w-full p-3 text-xs rounded-lg border border-slate-200"
              />
            </div>

            {scanError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {scanError}
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
                  <span>AI đang quét OCR sang Text &amp; JSON...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Quét &amp; Lưu Vào Kho Dữ Liệu SGK</span>
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
                      {tb.formulasOrRules.length} công thức · {tb.sampleExercises.length} bài mẫu
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
                    <div className="font-bold text-slate-800 mb-1">Kiến thức &amp; Công thức:</div>
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
                placeholder="VD: Tính chu vi hình chữ nhật, Nhận biết hình và đếm cạnh..."
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

            {/* Geometry Configuration */}
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
                  Câu đọc phát âm Tiếng Anh (nếu có):
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

      {/* TAB 5: APPROVED QUESTION BANK */}
      {activeSubTab === "approved_bank" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700">Lọc theo môn:</span>
              {(["all", "math", "vietnamese", "english", "science"] as const).map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setBankSubjectFilter(sub)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    bankSubjectFilter === sub
                      ? "bg-slate-900 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {sub === "all" ? "Tất cả môn" : SUBJECT_META[sub].shortLabel}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvedQuestions
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
    </div>
  );
};
