import React from "react";
import {
  ChildProfile,
  MistakeRecord,
  StudySessionRecord,
  SubjectId,
} from "../types";
import { SUBJECT_META } from "../data/seedData";
import { GeometryVisual } from "./GeometryVisual";
import {
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Play,
  Sparkles,
  Star,
  Tv,
} from "lucide-react";

interface DashboardAnalyticsProps {
  profile: ChildProfile;
  sessions: StudySessionRecord[];
  mistakes: MistakeRecord[];
  onStartWeaknessReview: (subject?: SubjectId, topic?: string) => void;
  onResolveMistake: (id: string) => void;
}

export const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({
  profile,
  sessions,
  mistakes,
  onStartWeaknessReview,
  onResolveMistake,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  const childSessions = sessions.filter((s) => s.childId === profile.id);
  const todaySessions = childSessions.filter((s) => s.dateStr === todayStr);
  const childMistakes = mistakes.filter((m) => m.childId === profile.id && !m.resolved);

  const todayMinutes = Math.round(
    todaySessions.reduce((acc, s) => acc + s.durationSeconds, 0) / 60
  );
  const todayEarnedYt = todaySessions.reduce((acc, s) => acc + s.earnedYoutubeMinutes, 0);
  const todayEarnedStars = todaySessions.reduce((acc, s) => acc + s.earnedStars, 0);
  const todayAvgScore =
    todaySessions.length > 0
      ? Math.round(
          todaySessions.reduce((acc, s) => acc + s.accuracyPercent, 0) / todaySessions.length
        )
      : 0;

  // Per-subject breakdown for today
  const subjectStatsToday = (["math", "vietnamese", "english", "science"] as SubjectId[]).map(
    (sub) => {
      const subSessions = todaySessions.filter((s) => s.subject === sub);
      const totalSec = subSessions.reduce((acc, s) => acc + s.durationSeconds, 0);
      const avgAcc =
        subSessions.length > 0
          ? Math.round(
              subSessions.reduce((acc, s) => acc + s.accuracyPercent, 0) / subSessions.length
            )
          : null;
      const earnedYt = subSessions.reduce((acc, s) => acc + s.earnedYoutubeMinutes, 0);
      return {
        subject: sub,
        count: subSessions.length,
        minutes: Math.max(subSessions.length > 0 ? 1 : 0, Math.round(totalSec / 60)),
        avgAcc,
        earnedYt,
      };
    }
  );

  // Weekly 7-day calendar (Mon -> Sun of current week)
  const getWeekDays = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sun
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);

    const labels = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];
    return labels.map((label, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const daySessions = childSessions.filter((s) => s.dateStr === dateStr);
      const mins = Math.round(
        daySessions.reduce((acc, s) => acc + s.durationSeconds, 0) / 60
      );
      return {
        label,
        dateStr,
        shortDate: `${d.getDate()}/${d.getMonth() + 1}`,
        studied: daySessions.length > 0,
        sessionCount: daySessions.length,
        minutes: mins > 0 ? mins : daySessions.length > 0 ? 1 : 0,
        isToday: dateStr === todayStr,
      };
    });
  };

  const weekDays = getWeekDays();

  // Group mistakes by topic to pinpoint weak areas
  const weaknessMap = childMistakes.reduce<
    Record<string, { topic: string; subject: SubjectId; count: number }>
  >((acc, m) => {
    const key = `${m.subject}__${m.topic}`;
    if (!acc[key]) {
      acc[key] = { topic: m.topic, subject: m.subject, count: 0 };
    }
    acc[key].count += 1;
    return acc;
  }, {});

  const weakTopicsList = Object.values(weaknessMap).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-8">
      {/* Row 1: Today's KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Thời gian học hôm nay</span>
            <Clock className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono-tabular">
            {todayMinutes} / {profile.dailyGoalMinutes} phút
          </div>
          <div className="text-xs text-slate-500">
            Đã hoàn thành {todaySessions.length} bài luyện tập hôm nay
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Điểm trung bình hôm nay</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 font-mono-tabular">
            {todaySessions.length > 0 ? `${todayAvgScore}%` : "Chưa làm bài"}
          </div>
          <div className="text-xs text-slate-500">
            Mốc nhận thưởng YouTube: Đạt từ 70% trở lên
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Phút YouTube thưởng hôm nay</span>
            <Tv className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600 font-mono-tabular">
            +{todayEarnedYt.toFixed(1)} phút
          </div>
          <div className="text-xs text-slate-500">
            Tổng quỹ hiện có:{" "}
            <strong className="font-mono-tabular text-slate-800">
              {profile.youtubeMinutes.toFixed(1)} phút
            </strong>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Sao tích lũy &amp; Chuỗi ngày học</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600 font-mono-tabular">
            +{todayEarnedStars} Sao · {profile.streakDays} ngày
          </div>
          <div className="text-xs text-slate-500">
            Tổng hũ sao:{" "}
            <strong className="font-mono-tabular text-slate-800">{profile.stars}/100 Sao</strong>
          </div>
        </div>
      </div>

      {/* Row 2: Weekly Study Schedule & Today's Subject Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Today's Subject Breakdown (7 cols) */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Hôm Nay {profile.name} Học Gì &amp; Bao Nhiêu Phút Mỗi Môn?
            </h2>
            <p className="text-xs text-slate-500">
              Thống kê chi tiết số bài đã làm, thời lượng và điểm số từng môn trong ngày hôm nay
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {subjectStatsToday.map((st) => {
              const meta = SUBJECT_META[st.subject];
              return (
                <div
                  key={st.subject}
                  className="py-3.5 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-slate-900">{meta.label}</div>
                    <div className="text-xs text-slate-500">
                      {st.count > 0
                        ? `Đã làm ${st.count} đề · Thời gian học: ${st.minutes} phút`
                        : "Hôm nay chưa học môn này"}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono-tabular">
                    {st.avgAcc !== null ? (
                      <>
                        <span
                          className={`font-bold ${
                            st.avgAcc >= 70 ? "text-emerald-700" : "text-rose-600"
                          }`}
                        >
                          Đúng {st.avgAcc}%
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="font-semibold text-rose-600">
                          +{st.earnedYt.toFixed(1)}p YouTube
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-400">0 phút · 0 điểm</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Weekly Study Calendar (5 cols) */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Tuần Này Con Học Những Ngày Nào?
              </h2>
              <p className="text-xs text-slate-500">
                Theo dõi thói quen tự giác học tập từ Thứ 2 đến Chủ Nhật
              </p>
            </div>
            <Calendar className="w-5 h-5 text-sky-600" />
          </div>

          <div className="grid grid-cols-7 gap-2 pt-2">
            {weekDays.map((d) => (
              <div
                key={d.dateStr}
                className={`p-2.5 rounded-xl border text-center space-y-1.5 ${
                  d.studied
                    ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                    : d.isToday
                    ? "bg-sky-50 border-sky-300 text-sky-900"
                    : "bg-slate-50 border-slate-200 text-slate-500"
                }`}
              >
                <div className="text-[11px] font-bold">{d.label}</div>
                <div className="text-[10px] font-mono-tabular opacity-75">{d.shortDate}</div>
                <div className="py-1 flex justify-center">
                  {d.studied ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-dashed border-slate-300" />
                  )}
                </div>
                <div className="text-[10px] font-mono-tabular font-semibold">
                  {d.studied ? `${d.minutes}p` : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Weakness Diagnosis & Mistake Notebook */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>Đánh Giá Con Còn Yếu Phần Nào &amp; Sổ Tay Câu Sai ({childMistakes.length} câu)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Hệ thống tự động lưu lại mọi câu con làm sai để thống kê chuyên đề con còn hổng kiến thức và tạo đề ôn tập riêng
            </p>
          </div>

          {childMistakes.length > 0 && (
            <button
              type="button"
              onClick={() => onStartWeaknessReview()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0"
            >
              <Play className="w-4 h-4" />
              <span>Làm Đề Ôn Lại Các Phần Con Còn Yếu Ngay</span>
            </button>
          )}
        </div>

        {weakTopicsList.length === 0 ? (
          <div className="p-8 rounded-xl bg-emerald-50/60 border border-emerald-200 text-center space-y-2">
            <Sparkles className="w-8 h-8 text-emerald-600 mx-auto" />
            <div className="text-sm font-bold text-emerald-950">
              Tuyệt vời! Hiện tại {profile.name} không có lỗ hổng kiến thức hay câu sai nào tồn đọng.
            </div>
            <p className="text-xs text-emerald-800">
              Khi con làm sai bất kỳ câu nào trong lúc luyện đề, hệ thống sẽ tự động ghi nhận chuyên đề đó tại đây.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Topic Weakness Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {weakTopicsList.map((wt) => (
                <div
                  key={`${wt.subject}-${wt.topic}`}
                  className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="text-xs text-rose-700 font-semibold">
                      {SUBJECT_META[wt.subject].shortLabel} · Cần củng cố
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">{wt.topic}</h3>
                    <div className="text-xs text-slate-600 mt-1">
                      Đang sai <strong className="font-mono-tabular text-rose-600">{wt.count} câu</strong> ở chuyên đề này
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onStartWeaknessReview(wt.subject, wt.topic)}
                    className="w-full py-2 px-3 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-colors"
                  >
                    Luyện lại chuyên đề này →
                  </button>
                </div>
              ))}
            </div>

            {/* Detailed Wrong Questions List */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800">
                Chi tiết các câu con đã làm sai gần đây:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {childMistakes.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between text-slate-500">
                      <span>
                        {SUBJECT_META[m.subject].shortLabel} · {m.topic}
                      </span>
                      <button
                        type="button"
                        onClick={() => onResolveMistake(m.id)}
                        className="text-emerald-700 font-semibold hover:underline"
                      >
                        ✓ Đánh dấu con đã hiểu bài
                      </button>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{m.questionText}</p>
                    {m.geometrySpec?.hasGeometry && <GeometryVisual spec={m.geometrySpec} />}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800">
                        <span className="font-semibold">Con chọn/điền: </span>
                        <span className="font-mono-tabular">{m.userAnswer || "(Bỏ trống)"}</span>
                      </div>
                      <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800">
                        <span className="font-semibold">Đáp án đúng: </span>
                        <span className="font-mono-tabular font-bold">{m.correctAnswer}</span>
                      </div>
                    </div>
                    <div className="text-slate-600">
                      <strong className="text-slate-800">Giải thích: </strong>
                      {m.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
