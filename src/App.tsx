/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import {
  ChildProfile,
  CustomRewardItem,
  MistakeRecord,
  QuestionItem,
  RedeemedRewardLog,
  StudySessionRecord,
  SubjectId,
  TextbookMaterial,
} from "./types";
import {
  INITIAL_CUSTOM_REWARDS,
  INITIAL_PROFILES,
  INITIAL_QUESTIONS,
  INITIAL_TEXTBOOKS,
} from "./data/seedData";
import { StudentWorkspace } from "./components/StudentWorkspace";
import { DashboardAnalytics } from "./components/DashboardAnalytics";
import { YouTubeRewardPlayer } from "./components/YouTubeRewardPlayer";
import { TeacherPortal } from "./components/TeacherPortal";
import { Lock, Plus, RotateCcw, Trash2, UserCheck, X } from "lucide-react";

type MainNavTab = "student" | "dashboard" | "rewards" | "teacher";

const STORAGE_KEY = "but_chi_thong_minh_state_v1";

export default function App() {
  const [activeTab, setActiveTab] = useState<MainNavTab>("student");

  // Persistent State
  const [profiles, setProfiles] = useState<ChildProfile[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
          return parsed.profiles;
        }
      } catch {
        // ignore
      }
    }
    return INITIAL_PROFILES;
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.activeProfileId) return parsed.activeProfileId;
      } catch {
        // ignore
      }
    }
    return INITIAL_PROFILES[0].id;
  });

  const [textbooks, setTextbooks] = useState<TextbookMaterial[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.textbooks) && parsed.textbooks.length > 0) {
          return parsed.textbooks;
        }
      } catch {
        // ignore
      }
    }
    return INITIAL_TEXTBOOKS;
  });

  const [questions, setQuestions] = useState<QuestionItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          return parsed.questions;
        }
      } catch {
        // ignore
      }
    }
    return INITIAL_QUESTIONS;
  });

  const [sessions, setSessions] = useState<StudySessionRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.sessions)) return parsed.sessions;
      } catch {
        // ignore
      }
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    return [
      {
        id: "seed-session-1",
        childId: "child-1",
        subject: "math",
        dateStr: todayStr,
        timestamp: new Date().toISOString(),
        durationSeconds: 480,
        totalQuestions: 5,
        correctCount: 4,
        accuracyPercent: 80,
        earnedYoutubeMinutes: 2.0,
        earnedStars: 2,
        topicsCovered: ["Tính chu vi hình chữ nhật", "Nhận biết hình và đếm cạnh"],
        wrongQuestionIds: ["q-math-6"],
      },
    ];
  });

  const [mistakes, setMistakes] = useState<MistakeRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.mistakes)) return parsed.mistakes;
      } catch {
        // ignore
      }
    }
    return [
      {
        id: "seed-mistake-1",
        childId: "child-1",
        questionId: "q-math-6",
        subject: "math",
        topic: "Tính diện tích và chu vi nâng cao",
        questionText:
          "[Nâng cao] Một mảnh sân hình chữ L được ghép bởi hai hình chữ nhật trên lưới ô vuông như hình vẽ (kích thước bao ngoài rộng 6 m, cao 5 m, phần khuyết ở góc trên bên phải rộng 3 m, cao 2 m). Diện tích của mảnh sân hình chữ L là bao nhiêu m²?",
        userAnswer: "30 m²",
        correctAnswer: "24 m²",
        explanation:
          "Lấy diện tích hình chữ nhật lớn (6 × 5 = 30 m²) trừ đi phần góc bị khuyết (3 × 2 = 6 m²), ta được 30 - 6 = 24 m².",
        geometrySpec: {
          hasGeometry: true,
          shapeType: "composite_l",
          width: 6,
          height: 5,
          unit: "m",
          showGrid: true,
          taskFocus: "area",
          customLabel: "Mảnh sân hình chữ L",
        },
        timestamp: new Date().toISOString(),
        resolved: false,
      },
    ];
  });

  const [customRewards, setCustomRewards] = useState<CustomRewardItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.customRewards)) return parsed.customRewards;
      } catch {
        // ignore
      }
    }
    return INITIAL_CUSTOM_REWARDS;
  });

  const [redeemLogs, setRedeemLogs] = useState<RedeemedRewardLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.redeemLogs)) return parsed.redeemLogs;
      } catch {
        // ignore
      }
    }
    return [];
  });

  const [parentPin, setParentPin] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.parentPin) return parsed.parentPin;
      } catch {
        // ignore
      }
    }
    return "1234";
  });

  // Save state to localStorage on change
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        profiles,
        activeProfileId,
        textbooks,
        questions,
        sessions,
        mistakes,
        customRewards,
        redeemLogs,
        parentPin,
      })
    );
  }, [
    profiles,
    activeProfileId,
    textbooks,
    questions,
    sessions,
    mistakes,
    customRewards,
    redeemLogs,
    parentPin,
  ]);

  // Modals & Navigation Helpers
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [editingProfile, setEditingProfile] = useState<ChildProfile | null>(null);
  const [pName, setPName] = useState<string>("");
  const [pNickname, setPNickname] = useState<string>("");
  const [pGrade, setPGrade] = useState<number>(3);
  const [pGoal, setPGoal] = useState<number>(25);

  // Teacher PIN Lock state
  const [teacherUnlocked, setTeacherUnlocked] = useState<boolean>(false);
  const [pinPromptInput, setPinPromptInput] = useState<string>("");
  const [pinPromptError, setPinPromptError] = useState<string | null>(null);

  // Targeted Weakness Review trigger
  const [reviewTrigger, setReviewTrigger] = useState<{
    subject?: SubjectId;
    topic?: string;
  } | null>(null);

  const activeProfile =
    profiles.find((p) => p.id === activeProfileId) || profiles[0];

  const approvedQuestions = questions.filter((q) => q.status === "approved");
  const pendingCount = questions.filter((q) => q.status === "pending_review").length;

  const handleCompleteSession = (
    session: StudySessionRecord,
    newMistakes: MistakeRecord[],
    resolvedQuestionIds: string[],
    completedQuestionIds: string[]
  ) => {
    setSessions((prev) => [session, ...prev]);

    // Subtract completed questions from the child's active question bank so they cannot repeat them to farm rewards
    if (completedQuestionIds.length > 0) {
      setQuestions((prev) =>
        prev.map((q) => {
          if (!completedQuestionIds.includes(q.id)) return q;
          const existingList = q.completedByChildIds || [];
          if (existingList.includes(activeProfile.id)) return q;
          return {
            ...q,
            completedByChildIds: [...existingList, activeProfile.id],
          };
        })
      );
    }

    // Update profile YouTube minutes, stars & study streak
    setProfiles((prev) =>
      prev.map((p) => {
        if (p.id !== activeProfile.id) return p;
        const todayStr = new Date().toISOString().slice(0, 10);
        const isNewDay = p.lastStudyDate !== todayStr;
        return {
          ...p,
          youtubeMinutes: Number((p.youtubeMinutes + session.earnedYoutubeMinutes).toFixed(1)),
          stars: p.stars + session.earnedStars,
          streakDays: isNewDay ? p.streakDays + 1 : p.streakDays,
          lastStudyDate: todayStr,
        };
      })
    );

    // Mark resolved mistakes and append new mistakes
    setMistakes((prev) => {
      const updated = prev.map((m) =>
        m.childId === activeProfile.id && resolvedQuestionIds.includes(m.questionId)
          ? { ...m, resolved: true }
          : m
      );
      return [...newMistakes, ...updated];
    });
  };

  const handleRestoreCompletedQuestion = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              completedByChildIds: (q.completedByChildIds || []).filter(
                (id) => id !== activeProfile.id
              ),
            }
          : q
      )
    );
  };

  const handleRestoreAllCompletedQuestions = () => {
    setQuestions((prev) =>
      prev.map((q) => ({
        ...q,
        completedByChildIds: (q.completedByChildIds || []).filter(
          (id) => id !== activeProfile.id
        ),
      }))
    );
  };

  const handleDeductYoutubeMinutes = (mins: number) => {
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === activeProfile.id
          ? { ...p, youtubeMinutes: Math.max(0, Number((p.youtubeMinutes - mins).toFixed(1))) }
          : p
      )
    );
  };

  const handleRedeemReward = (reward: CustomRewardItem) => {
    if (activeProfile.stars < reward.starsCost) return;
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === activeProfile.id
          ? {
              ...p,
              stars: p.stars - reward.starsCost,
              youtubeMinutes: reward.youtubeMinutesBonus
                ? Number((p.youtubeMinutes + reward.youtubeMinutesBonus).toFixed(1))
                : p.youtubeMinutes,
            }
          : p
      )
    );

    setRedeemLogs((prev) => [
      {
        id: `redeem-${Date.now()}`,
        childId: activeProfile.id,
        rewardTitle: reward.title,
        starsSpent: reward.starsCost,
        redeemedAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const handleOpenEditProfile = (prof?: ChildProfile) => {
    if (prof) {
      setEditingProfile(prof);
      setPName(prof.name);
      setPNickname(prof.nickname);
      setPGrade(prof.grade);
      setPGoal(prof.dailyGoalMinutes);
    } else {
      setEditingProfile(null);
      setPName("");
      setPNickname("");
      setPGrade(3);
      setPGoal(25);
    }
  };

  const handleDeleteProfile = (profileIdToDelete: string) => {
    const remaining = profiles.filter((p) => p.id !== profileIdToDelete);

    // Clean up associated history for the deleted profile
    setSessions((prev) => prev.filter((s) => s.childId !== profileIdToDelete));
    setMistakes((prev) => prev.filter((m) => m.childId !== profileIdToDelete));
    setRedeemLogs((prev) => prev.filter((r) => r.childId !== profileIdToDelete));
    setQuestions((prev) =>
      prev.map((q) => ({
        ...q,
        completedByChildIds: (q.completedByChildIds || []).filter(
          (id) => id !== profileIdToDelete
        ),
      }))
    );

    if (remaining.length > 0) {
      setProfiles(remaining);
      if (activeProfileId === profileIdToDelete) {
        setActiveProfileId(remaining[0].id);
      }
      if (editingProfile?.id === profileIdToDelete) {
        handleOpenEditProfile(remaining[0]);
      }
    } else {
      // If the user deleted the very last profile, create a fresh blank profile ready for their child's name
      const freshProfile: ChildProfile = {
        id: `child-${Date.now()}`,
        name: "Bé Yêu",
        nickname: "Bé",
        grade: 3,
        avatarColor: "#0284C7",
        avatarIcon: "star",
        youtubeMinutes: 0,
        stars: 0,
        streakDays: 0,
        lastStudyDate: "",
        dailyGoalMinutes: 25,
      };
      setProfiles([freshProfile]);
      setActiveProfileId(freshProfile.id);
      handleOpenEditProfile(freshProfile);
    }
  };

  const handleResetProfileStats = (profileIdToReset: string) => {
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === profileIdToReset
          ? { ...p, youtubeMinutes: 0, stars: 0, streakDays: 0, lastStudyDate: "" }
          : p
      )
    );
    setSessions((prev) => prev.filter((s) => s.childId !== profileIdToReset));
    setMistakes((prev) => prev.filter((m) => m.childId !== profileIdToReset));
    setRedeemLogs((prev) => prev.filter((r) => r.childId !== profileIdToReset));
    setQuestions((prev) =>
      prev.map((q) => ({
        ...q,
        completedByChildIds: (q.completedByChildIds || []).filter(
          (id) => id !== profileIdToReset
        ),
      }))
    );
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim()) return;

    if (editingProfile) {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === editingProfile.id
            ? {
                ...p,
                name: pName.trim(),
                nickname: pNickname.trim() || pName.trim(),
                grade: pGrade,
                dailyGoalMinutes: pGoal,
              }
            : p
        )
      );
    } else {
      const newProf: ChildProfile = {
        id: `child-${Date.now()}`,
        name: pName.trim(),
        nickname: pNickname.trim() || pName.trim(),
        grade: pGrade,
        avatarColor: "#0284C7",
        avatarIcon: "star",
        youtubeMinutes: 0,
        stars: 0,
        streakDays: 0,
        lastStudyDate: "",
        dailyGoalMinutes: pGoal,
      };
      setProfiles((prev) => [...prev, newProf]);
      setActiveProfileId(newProf.id);
    }
    setEditingProfile(null);
    setPName("");
  };

  const handleExportBackup = () => {
    const payload = {
      profiles,
      activeProfileId,
      textbooks,
      questions,
      sessions,
      mistakes,
      customRewards,
      redeemLogs,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `but-chi-thong-minh-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || "{}"));
        if (Array.isArray(data.profiles)) setProfiles(data.profiles);
        if (Array.isArray(data.textbooks)) setTextbooks(data.textbooks);
        if (Array.isArray(data.questions)) setQuestions(data.questions);
        if (Array.isArray(data.sessions)) setSessions(data.sessions);
        if (Array.isArray(data.mistakes)) setMistakes(data.mistakes);
        if (Array.isArray(data.customRewards)) setCustomRewards(data.customRewards);
      } catch {
        // ignore invalid json
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      {/* Strict 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-6 py-3.5">
        <div className="max-w-[1360px] mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Brand Title */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("student");
            }}
            className="text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Bút Chì Thông Minh
          </a>

          {/* Zone 2: 4 Single-line Navigation Links */}
          <nav className="flex items-center gap-6 text-sm font-semibold text-slate-600 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("student")}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === "student"
                  ? "border-sky-600 text-slate-900"
                  : "border-transparent hover:text-slate-900"
              }`}
            >
              Góc Học Tập
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("dashboard")}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === "dashboard"
                  ? "border-sky-600 text-slate-900"
                  : "border-transparent hover:text-slate-900"
              }`}
            >
              Bảng Tổng Kết
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("rewards")}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === "rewards"
                  ? "border-sky-600 text-slate-900"
                  : "border-transparent hover:text-slate-900"
              }`}
            >
              Xem YouTube &amp; Đổi Sao
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("teacher")}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === "teacher"
                  ? "border-sky-600 text-slate-900"
                  : "border-transparent hover:text-slate-900"
              }`}
            >
              Giáo Viên &amp; Duyệt Đề {pendingCount > 0 ? `(${pendingCount})` : ""}
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action (Child Profile Switcher) */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                handleOpenEditProfile(activeProfile);
                setShowProfileModal(true);
              }}
              className="px-4 py-2 text-xs font-extrabold text-white bg-sky-600 hover:bg-sky-700 border-b-4 border-sky-800 rounded-xl shadow-xs transition-all active:translate-y-0.5 whitespace-nowrap shrink-0"
            >
              Hồ sơ: {activeProfile.name} (Lớp {activeProfile.grade})
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-[1360px] mx-auto px-6 py-8">
        {activeTab === "student" && (
          <StudentWorkspace
            profile={activeProfile}
            approvedQuestions={approvedQuestions}
            mistakes={mistakes}
            initialReviewConfig={reviewTrigger}
            onClearInitialReview={() => setReviewTrigger(null)}
            onGoToRewards={() => setActiveTab("rewards")}
            onCompleteSession={handleCompleteSession}
          />
        )}

        {activeTab === "dashboard" && (
          <DashboardAnalytics
            profile={activeProfile}
            sessions={sessions}
            mistakes={mistakes}
            onStartWeaknessReview={(subject, topic) => {
              setReviewTrigger({ subject, topic });
              setActiveTab("student");
            }}
            onResolveMistake={(id) =>
              setMistakes((prev) =>
                prev.map((m) => (m.id === id ? { ...m, resolved: true } : m))
              )
            }
          />
        )}

        {activeTab === "rewards" && (
          <YouTubeRewardPlayer
            profile={activeProfile}
            rewards={customRewards}
            redeemLogs={redeemLogs.filter((r) => r.childId === activeProfile.id)}
            onDeductYoutubeMinutes={handleDeductYoutubeMinutes}
            onRedeemReward={handleRedeemReward}
            onAddCustomReward={(newReward) =>
              setCustomRewards((prev) => [
                ...prev,
                { ...newReward, id: `reward-${Date.now()}` },
              ])
            }
            parentPin={parentPin}
          />
        )}

        {activeTab === "teacher" && (
          <>
            {!teacherUnlocked ? (
              <div className="max-w-md mx-auto my-12 rounded-2xl border border-slate-200 bg-white p-8 space-y-5 text-center">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-900">
                    Khu Vực Dành Cho Giáo Viên &amp; Phụ Huynh
                  </h2>
                  <p className="text-xs text-slate-500">
                    Nhập mã PIN để tải sách giáo khoa, tạo đề bằng AI và duyệt câu hỏi (Mã PIN mặc định: <strong>1234</strong>)
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (pinPromptInput === parentPin) {
                      setTeacherUnlocked(true);
                      setPinPromptError(null);
                      setPinPromptInput("");
                    } else {
                      setPinPromptError("Mã PIN chưa chính xác. Bạn hãy thử nhập 1234 nhé!");
                    }
                  }}
                  className="space-y-3"
                >
                  <input
                    type="password"
                    maxLength={6}
                    value={pinPromptInput}
                    onChange={(e) => setPinPromptInput(e.target.value)}
                    placeholder="Nhập mã PIN 4 số (1234)"
                    className="w-full px-4 py-2.5 text-center text-base font-bold font-mono-tabular rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  {pinPromptError && (
                    <div className="text-xs text-rose-600 font-medium">{pinPromptError}</div>
                  )}
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors"
                  >
                    Mở Khóa Phòng Giáo Viên
                  </button>
                </form>
              </div>
            ) : (
              <TeacherPortal
                activeChildId={activeProfile.id}
                activeChildName={activeProfile.name}
                grade={activeProfile.grade}
                textbooks={textbooks}
                questions={questions}
                mistakes={mistakes.filter((m) => m.childId === activeProfile.id)}
                onAddTextbook={(tb) => setTextbooks((prev) => [tb, ...prev])}
                onDeleteTextbook={(id) =>
                  setTextbooks((prev) => prev.filter((t) => t.id !== id))
                }
                onAddQuestions={(newItems) =>
                  setQuestions((prev) => [...newItems, ...prev])
                }
                onApproveQuestion={(id, updated) =>
                  setQuestions((prev) =>
                    prev.map((q) =>
                      q.id === id
                        ? { ...(updated || q), status: "approved" }
                        : q
                    )
                  )
                }
                onApproveAllPending={() =>
                  setQuestions((prev) =>
                    prev.map((q) =>
                      q.status === "pending_review" ? { ...q, status: "approved" } : q
                    )
                  )
                }
                onDeleteQuestion={(id) =>
                  setQuestions((prev) => prev.filter((q) => q.id !== id))
                }
                onRestoreCompletedQuestion={handleRestoreCompletedQuestion}
                onRestoreAllCompletedQuestions={handleRestoreAllCompletedQuestions}
                onExportBackup={handleExportBackup}
                onImportBackup={handleImportBackup}
              />
            )}
          </>
        )}
      </main>

      {/* Child Profile Switcher & Editor Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Quản Lý Hồ Sơ Các Bé Trong Gia Đình
                </h2>
                <p className="text-xs text-slate-500">
                  Chọn hồ sơ của bé để lưu riêng điểm số, phút YouTube, số sao và các câu đã làm
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profiles.map((prof) => {
                const isCurrent = prof.id === activeProfile.id;
                return (
                  <div
                    key={prof.id}
                    onClick={() => {
                      setActiveProfileId(prof.id);
                      handleOpenEditProfile(prof);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                      isCurrent
                        ? "border-2 border-sky-600 bg-sky-50/60"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                        <span>
                          {prof.name} ({prof.nickname})
                        </span>
                        {isCurrent && <UserCheck className="w-4 h-4 text-sky-600 shrink-0" />}
                      </div>
                      <div className="text-xs text-slate-600">
                        Lớp {prof.grade} · {prof.youtubeMinutes.toFixed(1)}p YT · {prof.stars} Sao
                      </div>
                    </div>

                    <button
                      type="button"
                      title={`Xóa hồ sơ ${prof.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProfile(prof.id);
                      }}
                      className="p-2 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={handleSaveProfile}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-800">
                  {editingProfile
                    ? `Chỉnh sửa hồ sơ: ${editingProfile.name}`
                    : "Tạo hồ sơ bé mới"}
                </span>
                <div className="flex items-center gap-3">
                  {editingProfile && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleResetProfileStats(editingProfile.id)}
                        className="inline-flex items-center gap-1 text-amber-700 font-semibold hover:underline"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Đặt lại Sao &amp; Phút về 0</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProfile(editingProfile.id)}
                        className="inline-flex items-center gap-1 text-rose-600 font-semibold hover:underline"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa hồ sơ này</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditProfile(undefined)}
                        className="inline-flex items-center gap-1 text-sky-700 font-semibold hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm bé mới</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Họ và tên bé:</label>
                  <input
                    type="text"
                    required
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    placeholder="VD: Nguyễn Minh Khôi"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tên gọi ở nhà (Biệt danh):
                  </label>
                  <input
                    type="text"
                    value={pNickname}
                    onChange={(e) => setPNickname(e.target.value)}
                    placeholder="VD: Bé Bắp"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Khối lớp:</label>
                  <select
                    value={pGrade}
                    onChange={(e) => setPGrade(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  >
                    {[1, 2, 3, 4, 5].map((g) => (
                      <option key={g} value={g}>
                        Lớp {g} Tiểu học
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mục tiêu học mỗi ngày (phút):
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={pGoal}
                    onChange={(e) => setPGoal(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono-tabular"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-600 text-white font-bold hover:bg-sky-700"
                >
                  {editingProfile ? "Lưu thay đổi" : "Tạo hồ sơ mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
