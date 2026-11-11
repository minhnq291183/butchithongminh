import React, { useEffect, useRef, useState } from "react";
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
import { playCorrectSound, playWrongSound } from "../utils/soundEffects";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Loader2,
  Pencil,
  Play,
  Search,
  Sparkles,
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
  onGoToRewards?: () => void;
  onCompleteSession: (
    session: StudySessionRecord,
    newMistakes: MistakeRecord[],
    resolvedQuestionIds: string[],
    completedQuestionIds: string[]
  ) => void;
}

export const StudentWorkspace: React.FC<StudentWorkspaceProps> = ({
  profile,
  approvedQuestions,
  mistakes,
  initialReviewConfig,
  onClearInitialReview,
  onGoToRewards,
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
  const [checkedStatus, setCheckedStatus] = useState<Record<string, "correct" | "wrong">>({});
  const [orderingSelections, setOrderingSelections] = useState<Record<string, string[]>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [supportTab, setSupportTab] = useState<"scratchpad" | "dictionary">("scratchpad");
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // Highlighted word for instant dictionary lookup
  const [highlightedWord, setHighlightedWord] = useState<string>("");
  const [dictionaryLookupWord, setDictionaryLookupWord] = useState<string | null>(null);

  // Audio TTS state
  const [playingAudio, setPlayingAudio] = useState<boolean>(false);
  const autoAdvanceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        window.clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  // Only questions that have NOT been completed by this child are available in the main reward bank
  const uncompletedApprovedQuestions = approvedQuestions.filter(
    (q) => !q.completedByChildIds?.includes(profile.id)
  );
  const completedApprovedQuestions = approvedQuestions.filter((q) =>
    q.completedByChildIds?.includes(profile.id)
  );

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
      setCheckedStatus({});
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

  const subjectUncompletedQuestions = uncompletedApprovedQuestions.filter(
    (q) => q.subject === selectedSubject
  );
  const subjectCompletedCount = completedApprovedQuestions.filter(
    (q) => q.subject === selectedSubject
  ).length;

  const availableTopics = Array.from(new Set(subjectUncompletedQuestions.map((q) => q.topic)));
  const childMistakes = mistakes.filter((m) => m.childId === profile.id && !m.resolved);

  const handleStartQuiz = () => {
    let pool: QuestionItem[] = [];

    if (quizMode === "weakness_review") {
      const mistakeIds = new Set(childMistakes.map((m) => m.questionId));
      pool = approvedQuestions.filter((q) => mistakeIds.has(q.id));
      if (pool.length === 0) {
        pool = subjectUncompletedQuestions;
      }
    } else {
      pool = subjectUncompletedQuestions.filter(
        (q) => selectedTopic === "all" || q.topic === selectedTopic
      );
    }

    const picked = pool.slice(0, Math.max(1, questionCount));
    if (picked.length === 0) return;

    setActiveQuiz(picked);
    setCurrentIndex(0);
    setUserAnswers({});
    setCheckedStatus({});
    setOrderingSelections({});
    setElapsedSeconds(0);
    setIsSubmitted(false);
    setHighlightedWord("");
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
      // Fallback to browser Web Speech API
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

  const isAnswerMatch = (ans: string, correct: string) =>
    normalizeAnswer(ans) === normalizeAnswer(correct);

  const finalizeQuizSubmission = (
    finalAnswers: Record<string, string>,
    quizQuestions: QuestionItem[]
  ) => {
    if (isSubmitted) return;
    setIsSubmitted(true);

    let correctCount = 0;
    const newMistakes: MistakeRecord[] = [];
    const resolvedIds: string[] = [];
    const wrongIds: string[] = [];
    const completedIds: string[] = [];

    quizQuestions.forEach((q) => {
      const ans = finalAnswers[q.id] || "";
      // Any question the child answered is marked completed so they can't farm it repeatedly
      if (ans.trim() !== "") {
        completedIds.push(q.id);
      }

      if (isAnswerMatch(ans, q.correctAnswer)) {
        correctCount += 1;
        resolvedIds.push(q.id);
        if (!completedIds.includes(q.id)) completedIds.push(q.id);
      } else {
        wrongIds.push(q.id);
        newMistakes.push({
          id: `mistake-${Date.now()}-${q.id}`,
          childId: profile.id,
          questionId: q.id,
          subject: q.subject,
          topic: q.topic,
          questionText: q.questionText,
          userAnswer: ans,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          geometrySpec: q.geometrySpec,
          timestamp: new Date().toISOString(),
          resolved: false,
        });
      }
    });

    const total = quizQuestions.length;
    const accuracyPercent = Math.round((correctCount / total) * 100);
    const earnedYoutubeMinutes = accuracyPercent >= 70 ? correctCount * 0.5 : 0;
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
      subject: quizQuestions[0]?.subject || selectedSubject,
      dateStr: new Date().toISOString().slice(0, 10),
      timestamp: new Date().toISOString(),
      durationSeconds: Math.max(10, elapsedSeconds),
      totalQuestions: total,
      correctCount,
      accuracyPercent,
      earnedYoutubeMinutes,
      earnedStars,
      topicsCovered: Array.from(new Set(quizQuestions.map((q) => q.topic))),
      wrongQuestionIds: wrongIds,
    };

    onCompleteSession(sessionRecord, newMistakes, resolvedIds, completedIds);
  };

  // Immediate check when child selects or submits an answer for the current question
  const evaluateCurrentQuestion = (question: QuestionItem, answerValue: string) => {
    if (!activeQuiz || checkedStatus[question.id]) return;

    const updatedAnswers = { ...userAnswers, [question.id]: answerValue };
    setUserAnswers(updatedAnswers);

    const correct = isAnswerMatch(answerValue, question.correctAnswer);
    const nextChecked = {
      ...checkedStatus,
      [question.id]: (correct ? "correct" : "wrong") as "correct" | "wrong",
    };
    setCheckedStatus(nextChecked);

    if (correct) {
      // Play cheerful "Tèn ten tén!" sound and auto-advance to the next question
      playCorrectSound();
      if (autoAdvanceTimerRef.current) {
        window.clearTimeout(autoAdvanceTimerRef.current);
      }
      autoAdvanceTimerRef.current = window.setTimeout(() => {
        if (currentIndex < activeQuiz.length - 1) {
          setCurrentIndex((prev) => prev + 1);
          setHighlightedWord("");
        } else {
          // Last question answered correctly -> automatically submit quiz!
          finalizeQuizSubmission(updatedAnswers, activeQuiz);
        }
      }, 1150);
    } else {
      // Play "Ố ồ!" sound and let child read explanation before advancing
      playWrongSound();
    }
  };

  // Capture highlighted text in the question stage for 1-click dictionary lookup
  const handleQuestionTextSelection = () => {
    const sel = window.getSelection();
    if (!sel) return;
    const text = sel.toString().trim();
    if (text.length >= 2 && text.length <= 45) {
      setHighlightedWord(text);
    }
  };

  const handleLookupHighlightedWord = () => {
    if (!highlightedWord) return;
    setSupportTab("dictionary");
    setDictionaryLookupWord(highlightedWord);
  };

  // Setup View (Before starting quiz)
  if (!activeQuiz) {
    const subjectCardStyles: Record<
      SubjectId,
      {
        activeBorder: string;
        idleBorder: string;
        bgGradient: string;
        badgeBg: string;
        badgeText: string;
        ctaText: string;
      }
    > = {
      math: {
        activeBorder: "border-sky-600 border-b-[6px] ring-2 ring-sky-200",
        idleBorder: "border-sky-200 border-b-[5px] hover:border-sky-400",
        bgGradient: "from-sky-50/90 via-white to-white",
        badgeBg: "bg-sky-600 text-white",
        badgeText: "text-sky-700",
        ctaText: "text-sky-700",
      },
      vietnamese: {
        activeBorder: "border-amber-500 border-b-[6px] ring-2 ring-amber-200",
        idleBorder: "border-amber-200 border-b-[5px] hover:border-amber-400",
        bgGradient: "from-amber-50/90 via-white to-white",
        badgeBg: "bg-amber-500 text-white",
        badgeText: "text-amber-700",
        ctaText: "text-amber-700",
      },
      english: {
        activeBorder: "border-indigo-600 border-b-[6px] ring-2 ring-indigo-200",
        idleBorder: "border-indigo-200 border-b-[5px] hover:border-indigo-400",
        bgGradient: "from-indigo-50/90 via-white to-white",
        badgeBg: "bg-indigo-600 text-white",
        badgeText: "text-indigo-700",
        ctaText: "text-indigo-700",
      },
      science: {
        activeBorder: "border-emerald-600 border-b-[6px] ring-2 ring-emerald-200",
        idleBorder: "border-emerald-200 border-b-[5px] hover:border-emerald-400",
        bgGradient: "from-emerald-50/90 via-white to-white",
        badgeBg: "bg-emerald-600 text-white",
        badgeText: "text-emerald-700",
        ctaText: "text-emerald-700",
      },
    };

    return (
      <div className="space-y-8">
        {/* Top Row: Hero Greeting + Big Tactile 3D Ví YouTube & Hũ Sao Blocks */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Welcome Card (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border-2 border-sky-200 border-b-[6px] bg-gradient-to-br from-sky-50 via-white to-indigo-50/60 p-6 shadow-md flex flex-col justify-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-100 text-sky-800 text-xs font-extrabold uppercase tracking-wide w-fit mb-2">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>Góc Học Tập Tiểu Học · Lớp {profile.grade}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              Chào {profile.name} ({profile.nickname})! Hôm nay con muốn học môn gì?
            </h1>
          </div>

          {/* Big Tactile Ví YouTube Block (3.5 cols -> 4 cols on lg) */}
          <div
            onClick={onGoToRewards}
            role={onGoToRewards ? "button" : undefined}
            tabIndex={onGoToRewards ? 0 : undefined}
            className="lg:col-span-4 rounded-2xl border-2 border-rose-300 border-b-[6px] bg-gradient-to-br from-rose-50 via-white to-orange-50 p-5 shadow-md hover:-translate-y-1 transition-all cursor-pointer flex items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[11px] font-extrabold uppercase tracking-wide">
                <Tv className="w-3.5 h-3.5 text-rose-600" />
                <span>Ví Xem YouTube</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-rose-600 font-mono-tabular tracking-tight">
                {profile.youtubeMinutes.toFixed(1)}{" "}
                <span className="text-lg font-extrabold text-rose-500">phút</span>
              </div>
              <div className="text-xs font-bold text-rose-700">
                Bấm để mở tab YouTube &amp; tính giờ →
              </div>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-rose-600 border-2 border-rose-700 border-b-4 shadow-md flex items-center justify-center text-white shrink-0">
              <Tv className="w-8 h-8" />
            </div>
          </div>

          {/* Big Tactile Hũ Sao Block (3 cols) */}
          <div
            onClick={onGoToRewards}
            role={onGoToRewards ? "button" : undefined}
            tabIndex={onGoToRewards ? 0 : undefined}
            className="lg:col-span-3 rounded-2xl border-2 border-amber-300 border-b-[6px] bg-gradient-to-br from-amber-50 via-white to-yellow-50 p-5 shadow-md hover:-translate-y-1 transition-all cursor-pointer flex items-center justify-between gap-3"
          >
            <div className="space-y-1.5 flex-1">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[11px] font-extrabold uppercase tracking-wide">
                <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                <span>Hũ Sao Thưởng</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-amber-600 font-mono-tabular tracking-tight">
                {profile.stars}
                <span className="text-base font-extrabold text-amber-500">/100</span>
              </div>
              <div className="w-full h-2.5 bg-amber-100 border border-amber-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-300"
                  style={{ width: `${Math.min(100, profile.stars)}%` }}
                />
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-amber-500 border-2 border-amber-600 border-b-4 shadow-md flex items-center justify-center text-white shrink-0">
              <Star className="w-7 h-7 fill-white" />
            </div>
          </div>
        </div>

        {/* Step 1: Subject Cards with Raised 3D Tactile Blocks */}
        <div className="space-y-3">
          <h2 className="text-base font-extrabold text-slate-900">
            1. Chọn môn học con muốn chinh phục:
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {(["math", "vietnamese", "english", "science"] as SubjectId[]).map((sub) => {
              const meta = SUBJECT_META[sub];
              const style = subjectCardStyles[sub];
              const remainingCount = uncompletedApprovedQuestions.filter(
                (q) => q.subject === sub
              ).length;
              const doneCount = completedApprovedQuestions.filter(
                (q) => q.subject === sub
              ).length;
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
                  className={`text-left p-5 rounded-2xl border-2 bg-gradient-to-b ${style.bgGradient} transition-all hover:-translate-y-1 shadow-sm flex flex-col justify-between gap-4 ${
                    isSelected ? style.activeBorder : style.idleBorder
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={`px-2.5 py-1 rounded-lg font-extrabold font-mono-tabular ${style.badgeBg}`}
                      >
                        Còn {remainingCount} câu mới
                      </span>
                      <span className="text-slate-500 font-bold font-mono-tabular">
                        Đã làm: {doneCount}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 pt-1">{meta.label}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{meta.description}</p>
                  </div>
                  <div className={`text-xs font-extrabold ${style.ctaText}`}>
                    {isSelected ? "✓ Đang chọn môn này" : "Bấm để chọn môn →"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Topic & Custom Question Count Configuration — Raised 3D Card */}
        <div className="rounded-2xl border-2 border-slate-200 border-b-[6px] bg-white p-6 shadow-md space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-extrabold text-slate-800 mb-2">
                2. Chế độ luyện tập:
              </label>
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => setQuizMode("bank")}
                  className={`w-full text-left p-3.5 rounded-xl border-2 border-b-4 text-xs font-extrabold transition-all ${
                    quizMode === "bank"
                      ? "bg-sky-50 border-sky-500 text-sky-950"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Làm câu hỏi mới chưa làm ({subjectUncompletedQuestions.length} câu sẵn sàng)
                </button>
                <button
                  type="button"
                  onClick={() => setQuizMode("weakness_review")}
                  className={`w-full text-left p-3.5 rounded-xl border-2 border-b-4 text-xs font-extrabold transition-all ${
                    quizMode === "weakness_review"
                      ? "bg-amber-50 border-amber-500 text-amber-950"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Ôn tập các câu con từng làm sai ({childMistakes.length} câu cần sửa)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-800 mb-2">
                3. Chọn chuyên đề cụ thể:
              </label>
              <select
                value={selectedTopic}
                disabled={quizMode === "weakness_review"}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full p-3.5 rounded-xl border-2 border-slate-200 bg-white text-xs font-bold disabled:opacity-50"
              >
                <option value="all">
                  Tất cả chuyên đề ({subjectUncompletedQuestions.length} câu chưa làm)
                </option>
                {availableTopics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-2">
                Đã hoàn thành và chuyển sang mục Đã làm:{" "}
                <strong className="font-mono-tabular text-slate-700">
                  {subjectCompletedCount} câu
                </strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-800 mb-2">
                4. Số câu con muốn làm (Chọn nhanh hoặc nhập tùy ý):
              </label>
              <div className="flex items-center gap-1.5 mb-2.5">
                {[3, 5, 10, 15, 20].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setQuestionCount(cnt)}
                    className={`flex-1 py-2.5 rounded-xl border-2 border-b-4 text-xs font-black font-mono-tabular transition-all ${
                      questionCount === cnt
                        ? "bg-sky-600 text-white border-sky-800"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                  Hoặc nhập số câu:
                </span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Math.max(1, Number(e.target.value) || 1))}
                  className="w-24 px-3 py-1.5 text-xs font-black font-mono-tabular rounded-xl border-2 border-slate-300 bg-white"
                />
                <span className="text-xs text-slate-500">câu</span>
              </div>
            </div>
          </div>

          {quizMode === "bank" && subjectUncompletedQuestions.length === 0 ? (
            <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-extrabold text-sm">
                  Con đã làm hết toàn bộ câu hỏi đã duyệt của môn {SUBJECT_META[selectedSubject].shortLabel}!
                </div>
                <p className="text-amber-800 mt-0.5">
                  Các câu đã làm đã được chuyển sang mục "Đã hoàn thành" để tránh làm đi làm lại. Bố mẹ hãy vào mục Giáo Viên để duyệt thêm đề AI hoặc khôi phục câu hỏi nhé!
                </p>
              </div>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                Mẹo nhỏ: Khi đang làm bài, con có thể <strong>bôi đen bất kỳ từ nào trong đề</strong> để bấm tra Từ điển ngay lập tức!
              </div>
              <button
                type="button"
                onClick={handleStartQuiz}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-700 border-b-4 border-sky-800 text-white text-sm font-black shadow-md transition-all active:translate-y-0.5 whitespace-nowrap shrink-0"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>
                  Bắt Đầu Làm Bài (
                  {Math.min(
                    questionCount,
                    quizMode === "weakness_review"
                      ? Math.max(childMistakes.length, subjectUncompletedQuestions.length)
                      : subjectUncompletedQuestions.length
                  )}{" "}
                  câu)
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Completed Summary View
  if (isSubmitted) {
    const total = activeQuiz.length;
    const correctCount = activeQuiz.filter((q) =>
      isAnswerMatch(userAnswers[q.id] || "", q.correctAnswer)
    ).length;
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
              : `Con đạt ${accuracy}% (${correctCount}/${total} câu đúng) — Cố gắng thêm ở đề tiếp theo nhé!`}
          </h2>

          <p className="text-xs text-slate-500">
            {total} câu hỏi trong đề này đã được chuyển sang mục <strong>Đã làm xong</strong> (đã trừ khỏi ngân hàng đề chờ làm).
          </p>

          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <div className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 font-bold font-mono-tabular">
              {qualifiedForYt
                ? `Thưởng YouTube: +${earnedYt.toFixed(1)} phút (Đạt chuẩn từ 70%)`
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
              className="px-6 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-700"
            >
              Quay về Góc Học Tập (Làm tiếp câu hỏi mới)
            </button>
          </div>
        </div>

        {/* Detailed Review of Each Question */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900">
            Xem lại đáp án &amp; lời giải chi tiết:
          </h3>
          {activeQuiz.map((q, idx) => {
            const correct = isAnswerMatch(userAnswers[q.id] || "", q.correctAnswer);
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
  const currentStatus = checkedStatus[currentQ.id]; // undefined | "correct" | "wrong"

  const handleSelectOrderingPart = (part: string) => {
    if (currentStatus) return; // locked after checking
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
              const st = checkedStatus[q.id];
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(i);
                    setHighlightedWord("");
                  }}
                  className={`w-7 h-7 rounded-lg text-xs font-bold font-mono-tabular transition-colors ${
                    i === currentIndex
                      ? "bg-sky-600 text-white ring-2 ring-sky-300"
                      : st === "correct"
                      ? "bg-emerald-500 text-white"
                      : st === "wrong"
                      ? "bg-rose-500 text-white"
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

      {/* Two-Zone Educational Sandbox Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Zone (7 cols): Interactive Question & Geometry Stage */}
        <div
          onMouseUp={handleQuestionTextSelection}
          onKeyUp={handleQuestionTextSelection}
          onTouchEnd={handleQuestionTextSelection}
          className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between space-y-5"
        >
          <div className="space-y-4">
            {/* Question Kicker & Read Aloud TTS Controls (Only for English subject) */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="text-xs font-bold text-sky-700">
                Câu hỏi {currentIndex + 1} / {activeQuiz.length} ·{" "}
                {currentQ.level === "advanced" ? "Mức Nâng cao" : "Mức Cơ bản"}
              </div>

              {currentQ.subject === "english" && (
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
                    <span>Đọc thành tiếng (Luyện nghe)</span>
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
              )}
            </div>

            {/* Question Text (Selectable for instant Dictionary lookup) */}
            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-relaxed select-text">
                {currentQ.questionText}
              </h2>
              <p className="text-[11px] text-slate-400">
                💡 Mẹo: Con hãy dùng chuột bôi đen bất kỳ từ nào chưa hiểu trong đề để bấm{" "}
                <strong>Tra từ điển ngay</strong>!
              </p>
            </div>

            {/* Instant Highlighted Word Action Bar */}
            {highlightedWord && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 flex flex-wrap items-center justify-between gap-2 animate-fadeIn">
                <div className="flex items-center gap-2 text-xs text-emerald-950">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Từ con vừa bôi đen:{" "}
                    <strong className="underline">“{highlightedWord}”</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLookupHighlightedWord}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Tra nghĩa từ “{highlightedWord}” luôn</span>
                  </button>
                  {currentQ.subject === "english" && (
                    <button
                      type="button"
                      onClick={() => handleSpeakText(highlightedWord, false)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 whitespace-nowrap shrink-0"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Đọc từ này</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Parametric SVG Geometry Visual if present */}
            {currentQ.geometrySpec?.hasGeometry && (
              <GeometryVisual spec={currentQ.geometrySpec} />
            )}

            {/* Answer Input by Question Type */}
            <div className="pt-2 space-y-3">
              {currentQ.type === "fill_blank" || currentQ.options.length === 0 ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (currentAnswer.trim()) {
                      evaluateCurrentQuestion(currentQ, currentAnswer);
                    }
                  }}
                  className="space-y-2"
                >
                  <label className="block text-xs font-bold text-slate-700">
                    Nhập đáp án của con rồi bấm Kiểm tra:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      disabled={Boolean(currentStatus)}
                      value={currentAnswer}
                      onChange={(e) =>
                        setUserAnswers({ ...userAnswers, [currentQ.id]: e.target.value })
                      }
                      placeholder="Gõ số hoặc từ trả lời tại đây..."
                      className="flex-1 px-4 py-3 text-base font-bold rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none font-mono-tabular disabled:bg-slate-50"
                    />
                    {!currentStatus && (
                      <button
                        type="submit"
                        disabled={!currentAnswer.trim()}
                        className="px-5 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white text-xs font-bold whitespace-nowrap shrink-0"
                      >
                        Kiểm tra đáp án
                      </button>
                    )}
                  </div>
                </form>
              ) : currentQ.type === "ordering" ? (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-700">
                    Bấm chọn từng cụm từ theo đúng thứ tự rồi nhấn Kiểm tra:
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
                          disabled={Boolean(currentStatus)}
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
                  {!currentStatus && (
                    <button
                      type="button"
                      disabled={!currentAnswer.trim()}
                      onClick={() => evaluateCurrentQuestion(currentQ, currentAnswer)}
                      className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white text-xs font-bold"
                    >
                      Kiểm tra câu vừa ghép
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQ.options.map((opt, idx) => {
                    const selected = currentAnswer === opt;
                    const isCorrectOption = isAnswerMatch(opt, currentQ.correctAnswer);

                    let btnStyle =
                      "border-slate-200 bg-white text-slate-800 hover:border-slate-300";
                    if (currentStatus) {
                      if (isCorrectOption) {
                        btnStyle = "border-emerald-500 bg-emerald-50 text-emerald-950 font-bold";
                      } else if (selected && currentStatus === "wrong") {
                        btnStyle = "border-rose-500 bg-rose-50 text-rose-950 font-bold";
                      }
                    } else if (selected) {
                      btnStyle = "border-sky-600 bg-sky-50/80 text-sky-950 font-bold";
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={Boolean(currentStatus)}
                        onClick={() => evaluateCurrentQuestion(currentQ, opt)}
                        className={`text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${btnStyle}`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                            currentStatus && isCorrectOption
                              ? "bg-emerald-600 text-white"
                              : currentStatus && selected && currentStatus === "wrong"
                              ? "bg-rose-600 text-white"
                              : selected
                              ? "bg-sky-600 text-white"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {["A", "B", "C", "D"][idx] || idx + 1}
                        </span>
                        <span className="text-sm select-text">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Immediate Audio & Visual Feedback Banner ("Tèn ten tén!" or "Ố ồ!") */}
            {currentStatus === "correct" && (
              <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-sm font-extrabold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    🎵 Tèn ten tén! Chính xác!{" "}
                    {currentIndex < activeQuiz.length - 1
                      ? "Đang tự động chuyển sang câu tiếp theo..."
                      : "Đang tổng kết điểm thưởng cho con..."}
                  </span>
                </div>
              </div>
            )}

            {currentStatus === "wrong" && (
              <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-rose-800">
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>🔊 Ố ồ! Chưa đúng rồi — Đáp án đúng là: {currentQ.correctAnswer}</span>
                  </div>
                  {currentIndex < activeQuiz.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentIndex((prev) => prev + 1);
                        setHighlightedWord("");
                      }}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold whitespace-nowrap shrink-0"
                    >
                      <span>Đã hiểu — Sang câu tiếp</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => finalizeQuizSubmission(userAnswers, activeQuiz)}
                      className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold whitespace-nowrap shrink-0"
                    >
                      <span>Xem kết quả bài làm</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-700 pl-7">
                  <strong>Giải thích: </strong>
                  {currentQ.explanation}
                </p>
              </div>
            )}
          </div>

          {/* Bottom Question Navigation */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => {
                setCurrentIndex((prev) => Math.max(0, prev - 1));
                setHighlightedWord("");
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Câu trước</span>
            </button>

            <div className="flex items-center gap-2">
              {currentIndex < activeQuiz.length - 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentIndex((prev) => prev + 1);
                    setHighlightedWord("");
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <span>Bỏ qua / Câu tiếp</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => finalizeQuizSubmission(userAnswers, activeQuiz)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Nộp Bài &amp; Nhận Thưởng</span>
              </button>
            </div>
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
              <DictionaryTool
                grade={profile.grade}
                externalWord={dictionaryLookupWord}
                onExternalWordHandled={() => setDictionaryLookupWord(null)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
