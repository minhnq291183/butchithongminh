import React, { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import {
  ChildProfile,
  MistakeRecord,
  QuestionItem,
  StudySessionRecord,
  SubjectId,
} from "../types";
import { SUBJECT_META } from "../data/seedData";
import { GeometryVisual } from "./GeometryVisual";
import { ScratchpadCanvas } from "./ScratchpadCanvas";
import { DictionaryTool } from "./DictionaryTool";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Loader2,
  Pencil,
  Play,
  RotateCcw,
  Star,
  Tv,
  Volume2,
  XCircle,
} from "lucide-react";

interface StudentWorkspaceProps {
  profile: ChildProfile;
  approvedQuestions: QuestionItem[];
  mistakes: MistakeRecord[];
  initialReviewConfig?: { subject?: SubjectId; topic?: string } | null;
  onClearInitialReview: () => void;
  onCompleteSession: (
    session: StudySessionRecord,
    newMistakes: MistakeRecord[],
    resolvedQuestionIds: string[]
  ) => void;
}

export const StudentWorkspace: React.FC<StudentWorkspaceProps> = ({
  profile,
  approvedQuestions,
  mistakes,
  initialReviewConfig,
  onClearInitialReview,
  onCompleteSession,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<SubjectId>("math");
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [quizMode, setQuizMode] = useState<"bank" | "weakness_review">("bank");

  // Active Quiz State
  const [activeQuiz, setActiveQuiz] = useState<QuestionItem[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [orderingSelections, setOrderingSelections] = useState<Record<string, string[]>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [supportTab, setSupportTab] = useState<"scratchpad" | "dictionary">("scratchpad");
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // Audio TTS state
  const [playingAudio, setPlayingAudio] = useState<boolean>(false);

  // Triggered when parent clicks "Luyện lại phần con còn yếu" from Dashboard
  useEffect(() => {
    if (!initialReviewConfig) return;
    const unresolved = mistakes.filter((m) => m.childId === profile.id && !m.resolved);
    const filteredMistakes = unresolved.filter(
      (m) =>
        (!initialReviewConfig.subject || m.subject === initialReviewConfig.subject) &&
        (!initialReviewConfig.topic || m.topic === initialReviewConfig.topic)
    );

    const matchedQuestions: QuestionItem[] = filteredMistakes.map((m) => {
      const existing = approvedQuestions.find((q) => q.id === m.questionId);
      if (existing) return existing;
      return {
        id: m.questionId,
        subject: m.subject,
        grade: profile.grade,
        topic: m.topic,
        level: "basic",
        type: m.geometrySpec?.hasGeometry ? "geometry_visual" : "fill_blank",
        status: "approved",
        questionText: m.questionText,
        options: [],
        correctAnswer: m.correctAnswer,
        explanation: m.explanation,
        geometrySpec: m.geometrySpec,
        createdAt: m.timestamp,
      };
    });

    if (matchedQuestions.length > 0) {
      setActiveQuiz(matchedQuestions);
      setCurrentIndex(0);
      setUserAnswers({});
      setOrderingSelections({});
      setElapsedSeconds(0);
      setIsSubmitted(false);
    }
    onClearInitialReview();
  }, [initialReviewConfig, mistakes, approvedQuestions, profile.id, profile.grade, onClearInitialReview]);

  // Quiz Timer
  useEffect(() => {
    if (!activeQuiz || isSubmitted) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeQuiz, isSubmitted]);

  const subjectQuestions = approvedQuestions.filter((q) => q.subject === selectedSubject);
  const availableTopics = Array.from(new Set(subjectQuestions.map((q) => q.topic)));
  const childMistakes = mistakes.filter((m) => m.childId === profile.id && !m.resolved);

  const handleStartQuiz = () => {
    let pool: QuestionItem[] = [];

    if (quizMode === "weakness_review") {
      const mistakeIds = new Set(childMistakes.map((m) => m.questionId));
      const weakTopics = new Set(childMistakes.map((m) => m.topic));
      pool = approvedQuestions.filter(
        (q) => mistakeIds.has(q.id) || weakTopics.has(q.topic)
      );
      if (pool.length === 0) {
        pool = subjectQuestions;
      }
    } else {
      pool = subjectQuestions.filter(
        (q) => selectedTopic === "all" || q.topic === selectedTopic
      );
    }

    const picked = pool.slice(0, questionCount);
    if (picked.length === 0) return;

    setActiveQuiz(picked);
    setCurrentIndex(0);
    setUserAnswers({});
    setOrderingSelections({});
    setElapsedSeconds(0);
    setIsSubmitted(false);
  };

  const handleSpeakText = async (textToSpeak: string, slow = false) => {
    if (!textToSpeak || playingAudio) return;
    setPlayingAudio(true);

    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSpeak, slow }),
      });
      const data = await res.json();
      if (res.ok && data.audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
        audio.onended = () => setPlayingAudio(false);
        audio.onerror = () => setPlayingAudio(false);
        await audio.play();
        return;
      }
    } catch {
      // Fallback to browser Web Speech API if offline or API busy
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(textToSpeak);
      utter.rate = slow ? 0.75 : 1.0;
      utter.lang = /[a-zA-Z]/.test(textToSpeak) && selectedSubject === "english" ? "en-US" : "vi-VN";
      utter.onend = () => setPlayingAudio(false);
      utter.onerror = () => setPlayingAudio(false);
      window.speechSynthesis.speak(utter);
    } else {
      setPlayingAudio(false);
    }
  };

  const normalizeAnswer = (val: string) =>
    val.trim().toLowerCase().replace(/\s+/g, " ");

  const isQuestionCorrect = (q: QuestionItem) => {
    const ans = userAnswers[q.id] || "";
    return normalizeAnswer(ans) === normalizeAnswer(q.correctAnswer);
  };

  const handleSubmitQuiz = () => {
    if (!activeQuiz || isSubmitted) return;
    setIsSubmitted(true);

    let correctCount = 0;
    const newMistakes: MistakeRecord[] = [];
    const resolvedIds: string[] = [];
    const wrongIds: string[] = [];

    activeQuiz.forEach((q) => {
      if (isQuestionCorrect(q)) {
        correctCount += 1;
        resolvedIds.push(q.id);
      } else {
        wrongIds.push(q.id);
        newMistakes.push({
          id: `mistake-${Date.now()}-${q.id}`,
          childId: profile.id,
          questionId: q.id,
          subject: q.subject,
          topic: q.topic,
          questionText: q.questionText,
          userAnswer: userAnswers[q.id] || "",
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          geometrySpec: q.geometrySpec,
          timestamp: new Date().toISOString(),
          resolved: false,
        });
      }
    });

    const total = activeQuiz.length;
    const accuracyPercent = Math.round((correctCount / total) * 100);

    // Core Reward Rule:
    // 1 correct answer = 0.5 min YouTube ONLY IF accuracy >= 70%
    const earnedYoutubeMinutes = accuracyPercent >= 70 ? correctCount * 0.5 : 0;

    // Stars Rule:
    // >= 90%: 3 stars; 80-89%: 2 stars; 70-79%: 1 star; < 70%: 0 stars
    const earnedStars =
      accuracyPercent >= 90
        ? 3
        : accuracyPercent >= 80
        ? 2
        : accuracyPercent >= 70
        ? 1
        : 0;

    if (accuracyPercent >= 70) {
      confetti({
        particleCount: 70,
        spread: 65,
        origin: { y: 0.6 },
      });
    }

    const sessionRecord: StudySessionRecord = {
      id: `session-${Date.now()}`,
      childId: profile.id,
      subject: activeQuiz[0]?.subject || selectedSubject,
      dateStr: new Date().toISOString().slice(0, 10),
      timestamp: new Date().toISOString(),
      durationSeconds: Math.max(10, elapsedSeconds),
      totalQuestions: total,
      correctCount,
      accuracyPercent,
      earnedYoutubeMinutes,
      earnedStars,
      topicsCovered: Array.from(new Set(activeQuiz.map((q) => q.topic))),
      wrongQuestionIds: wrongIds,
    };

    onCompleteSession(sessionRecord, newMistakes, resolvedIds);
  };

  // Setup View (Before starting quiz)
  if (!activeQuiz) {
    return (
      <div className="space-y-8">
        {/* Welcome Banner & Reward Rules Reminder */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-extrabold text-slate-900">
              Chào {profile.name} ({profile.nickname} — Lớp {profile.grade})! Hôm nay con muốn học môn gì?
            </h1>
            <p className="text-sm text-slate-600">
              Nhớ nhé: Đạt đúng từ <strong>70% trở lên</strong>, mỗi câu đúng con được thưởng{" "}
              <strong className="text-rose-600">+0.5 phút xem YouTube</strong> và tích thêm{" "}
              <strong className="text-amber-600">tới 3 Sao</strong> để đổi quà lớn!
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold font-mono-tabular flex items-center gap-2">
              <Tv className="w-4 h-4 text-rose-600" />
              <span>Ví YouTube: {profile.youtubeMinutes.toFixed(1)} phút</span>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold font-mono-tabular flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Hũ Sao: {profile.stars}/100</span>
            </div>
          </div>
        </div>

        {/* Step 1: Subject Cards */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">1. Chọn môn học con muốn thử sức:</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(["math", "vietnamese", "english", "science"] as SubjectId[]).map((sub) => {
              const meta = SUBJECT_META[sub];
              const count = approvedQuestions.filter((q) => q.subject === sub).length;
              const isSelected = selectedSubject === sub && quizMode === "bank";
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => {
                    setSelectedSubject(sub);
                    setSelectedTopic("all");
                    setQuizMode("bank");
                  }}
                  className={`text-left p-5 rounded-xl border transition-all flex flex-col justify-between gap-4 ${
                    isSelected
                      ? "bg-white border-2 border-sky-600 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-slate-500">
                      Có sẵn {count} câu hỏi đã duyệt
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900">{meta.label}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{meta.description}</p>
                  </div>
                  <div className="text-xs font-bold text-sky-700">
                    {isSelected ? "✓ Đang chọn môn này" : "Bấm để chọn →"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Topic & Question Count Configuration */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                2. Chế độ luyện tập:
              </label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setQuizMode("bank")}
                  className={`w-full text-left p-3 rounded-lg border text-xs font-semibold ${
                    quizMode === "bank"
                      ? "bg-sky-50 border-sky-400 text-sky-950"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Làm bài từ Ngân hàng đề ({SUBJECT_META[selectedSubject].shortLabel})
                </button>
                <button
                  type="button"
                  onClick={() => setQuizMode("weakness_review")}
                  className={`w-full text-left p-3 rounded-lg border text-xs font-semibold ${
                    quizMode === "weakness_review"
                      ? "bg-amber-50 border-amber-400 text-amber-950"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Ôn tập từ những phần con còn yếu ({childMistakes.length} câu cần sửa)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                3. Chọn chuyên đề cụ thể:
              </label>
              <select
                value={selectedTopic}
                disabled={quizMode === "weakness_review"}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-200 bg-white text-xs font-medium disabled:opacity-50"
              >
                <option value="all">Tất cả chuyên đề ({subjectQuestions.length} câu)</option>
                {availableTopics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                4. Số câu con muốn làm:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[3, 5, 10, 15].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setQuestionCount(cnt)}
                    className={`py-2.5 rounded-lg border text-xs font-bold font-mono-tabular ${
                      questionCount === cnt
                        ? "bg-sky-600 text-white border-sky-600"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {cnt} câu
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Nếu đúng hết {Math.min(questionCount, subjectQuestions.length)} câu sẽ nhận được{" "}
                <strong className="text-rose-600 font-mono-tabular">
                  +{(Math.min(questionCount, subjectQuestions.length) * 0.5).toFixed(1)} phút
                </strong>{" "}
                YouTube + <strong className="text-amber-600">3 Sao</strong>!
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Công cụ hỗ trợ sẵn sàng khi làm bài: <strong>Bảng vẽ nháp ô ly</strong> ·{" "}
              <strong>Từ điển Tiếng Việt</strong> · <strong>Đọc phát âm Tiếng Anh</strong>
            </div>
            <button
              type="button"
              onClick={handleStartQuiz}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold transition-colors whitespace-nowrap shrink-0"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Bắt Đầu Làm Bài Ngay</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Completed Summary View
  if (isSubmitted) {
    const total = activeQuiz.length;
    const correctCount = activeQuiz.filter((q) => isQuestionCorrect(q)).length;
    const accuracy = Math.round((correctCount / total) * 100);
    const qualifiedForYt = accuracy >= 70;
    const earnedYt = qualifiedForYt ? correctCount * 0.5 : 0;
    const earnedStars =
      accuracy >= 90 ? 3 : accuracy >= 80 ? 2 : accuracy >= 70 ? 1 : 0;

    return (
      <div className="space-y-8">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-4">
          <div className="flex justify-center gap-2">
            {[1, 2, 3].map((starIdx) => (
              <Star
                key={starIdx}
                className={`w-10 h-10 ${
                  starIdx <= earnedStars
                    ? "text-amber-500 fill-amber-400"
                    : "text-slate-200 fill-slate-100"
                }`}
              />
            ))}
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900">
            {qualifiedForYt
              ? `Giỏi lắm ${profile.name}! Con đạt ${accuracy}% (${correctCount}/${total} câu đúng)`
              : `Con đạt ${accuracy}% (${correctCount}/${total} câu đúng) — Cố gắng thêm chút nữa nhé!`}
          </h2>

          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <div className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 font-bold font-mono-tabular">
              {qualifiedForYt
                ? `Thưởng YouTube: +${earnedYt.toFixed(1)} phút (Đạt chuẩn >= 70%)`
                : "Thưởng YouTube: +0 phút (Cần đạt tối thiểu 70% mới được tính phút)"}
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold font-mono-tabular">
              Thưởng Sao: +{earnedStars} Sao
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 font-mono-tabular">
              Thời gian làm bài: {Math.floor(elapsedSeconds / 60)} phút {elapsedSeconds % 60} giây
            </div>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setActiveQuiz(null)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Chọn môn / Đề khác
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentIndex(0);
                setUserAnswers({});
                setOrderingSelections({});
                setElapsedSeconds(0);
                setIsSubmitted(false);
              }}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-700"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Làm lại đề này để lấy 3 Sao</span>
            </button>
          </div>
        </div>

        {/* Detailed Review of Each Question */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900">
            Xem lại đáp án &amp; lời giải chi tiết:
          </h3>
          {activeQuiz.map((q, idx) => {
            const correct = isQuestionCorrect(q);
            return (
              <div
                key={q.id}
                className={`rounded-xl border p-5 space-y-3 bg-white ${
                  correct ? "border-emerald-200" : "border-rose-300"
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">
                    Câu {idx + 1} · {q.topic}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 font-bold ${
                      correct ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {correct ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Đúng (+0.5 phút YouTube)</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        <span>Chưa đúng (Đã lưu vào sổ tay câu sai)</span>
                      </>
                    )}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900">{q.questionText}</p>
                {q.geometrySpec?.hasGeometry && <GeometryVisual spec={q.geometrySpec} />}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="font-semibold text-slate-600">Câu trả lời của con: </span>
                    <span className="font-bold font-mono-tabular text-slate-900">
                      {userAnswers[q.id] || "(Chưa trả lời)"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <span className="font-semibold text-emerald-800">Đáp án đúng: </span>
                    <span className="font-bold font-mono-tabular text-emerald-950">
                      {q.correctAnswer}
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-sky-50/70 border border-sky-100 text-xs text-slate-700">
                  <strong className="text-sky-900">Lời giải: </strong>
                  {q.explanation}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Active Two-Zone Quiz Workspace
  const currentQ = activeQuiz[currentIndex];
  const currentAnswer = userAnswers[currentQ.id] || "";

  const handleSelectOrderingPart = (part: string) => {
    const currentList = orderingSelections[currentQ.id] || [];
    const nextList = currentList.includes(part)
      ? currentList.filter((item) => item !== part)
      : [...currentList, part];
    setOrderingSelections({ ...orderingSelections, [currentQ.id]: nextList });
    setUserAnswers({ ...userAnswers, [currentQ.id]: nextList.join(" ") });
  };

  return (
    <div className="space-y-5">
      {/* Quiz Progress Bar Header */}
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveQuiz(null)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Thoát đề</span>
          </button>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span className="text-xs font-bold text-slate-900">
            {SUBJECT_META[currentQ.subject].label}
          </span>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span className="text-xs text-slate-500">Chuyên đề: {currentQ.topic}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs font-mono-tabular font-bold text-slate-700">
            <Clock className="w-4 h-4 text-sky-600" />
            <span>
              {String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:
              {String(elapsedSeconds % 60).padStart(2, "0")}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {activeQuiz.map((q, i) => {
              const answered = Boolean(userAnswers[q.id]?.trim());
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold font-mono-tabular transition-colors ${
                    i === currentIndex
                      ? "bg-sky-600 text-white"
                      : answered
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two-Zone Educational Sandbox Layout (60% Question Stage / 40% Support Deck) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Zone (7 cols): Interactive Question & Geometry Stage */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            {/* Question Kicker & Read Aloud TTS Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="text-xs font-bold text-sky-700">
                Câu hỏi {currentIndex + 1} / {activeQuiz.length} ·{" "}
                {currentQ.level === "advanced" ? "Mức Nâng cao" : "Mức Cơ bản"}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={playingAudio}
                  onClick={() =>
                    handleSpeakText(currentQ.audioText || currentQ.questionText, false)
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  {playingAudio ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  <span>Đọc thành tiếng</span>
                </button>
                <button
                  type="button"
                  disabled={playingAudio}
                  onClick={() =>
                    handleSpeakText(currentQ.audioText || currentQ.questionText, true)
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  Đọc chậm 0.75x
                </button>
              </div>
            </div>

            {/* Question Text */}
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-relaxed">
              {currentQ.questionText}
            </h2>

            {currentQ.audioText && (
              <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-sm font-semibold text-amber-950 flex items-center justify-between">
                <span>🔊 “{currentQ.audioText}”</span>
              </div>
            )}

            {/* Parametric SVG Geometry Visual if present */}
            {currentQ.geometrySpec?.hasGeometry && (
              <GeometryVisual spec={currentQ.geometrySpec} />
            )}

            {/* Answer Input by Question Type */}
            <div className="pt-2 space-y-3">
              {currentQ.type === "fill_blank" || currentQ.options.length === 0 ? (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Nhập đáp án của con vào ô bên dưới:
                  </label>
                  <input
                    type="text"
                    value={currentAnswer}
                    onChange={(e) =>
                      setUserAnswers({ ...userAnswers, [currentQ.id]: e.target.value })
                    }
                    placeholder="Gõ số hoặc từ trả lời tại đây..."
                    className="w-full px-4 py-3 text-base font-bold rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none font-mono-tabular"
                  />
                </div>
              ) : currentQ.type === "ordering" ? (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-700">
                    Bấm chọn từng cụm từ theo đúng thứ tự:
                  </div>
                  <div className="p-3.5 min-h-[52px] rounded-xl bg-sky-50 border border-sky-200 text-sm font-bold text-sky-950">
                    {currentAnswer || "Con hãy bấm các từ bên dưới để ghép thành câu..."}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentQ.options.map((part, idx) => {
                      const chosen = (orderingSelections[currentQ.id] || []).includes(part);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectOrderingPart(part)}
                          className={`px-3.5 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                            chosen
                              ? "bg-sky-600 text-white border-sky-600"
                              : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {part}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQ.options.map((opt, idx) => {
                    const selected = currentAnswer === opt;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          setUserAnswers({ ...userAnswers, [currentQ.id]: opt })
                        }
                        className={`text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                          selected
                            ? "border-sky-600 bg-sky-50/80 text-sky-950 font-bold"
                            : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                            selected ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {["A", "B", "C", "D"][idx] || idx + 1}
                        </span>
                        <span className="text-sm">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Question Navigation */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Câu trước</span>
            </button>

            {currentIndex < activeQuiz.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => prev + 1)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
              >
                <span>Câu tiếp theo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitQuiz}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Nộp Bài &amp; Nhận Thưởng YouTube / Sao</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Zone (5 cols): Student Support Tools (Scratchpad & Dictionary) */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="text-xs font-bold text-slate-800">Công Cụ Hỗ Trợ Làm Bài</div>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setSupportTab("scratchpad")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  supportTab === "scratchpad"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Pencil className="w-3.5 h-3.5 text-sky-600" />
                <span>Bảng vẽ nháp ô ly</span>
              </button>
              <button
                type="button"
                onClick={() => setSupportTab("dictionary")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  supportTab === "dictionary"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                <span>Từ điển Tiếng Việt</span>
              </button>
            </div>
          </div>

          <div className="flex-1">
            {supportTab === "scratchpad" ? (
              <ScratchpadCanvas />
            ) : (
              <DictionaryTool grade={profile.grade} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
