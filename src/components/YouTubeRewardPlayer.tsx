import React, { useEffect, useRef, useState } from "react";
import { ChildProfile, CustomRewardItem, RedeemedRewardLog } from "../types";
import {
  BellRing,
  CheckCircle2,
  Clock,
  ExternalLink,
  Gift,
  Lock,
  Pause,
  Play,
  Plus,
  Star,
  Tv,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  startBackgroundAudioKeepAlive,
  startContinuousAlarm,
  stopBackgroundAudioKeepAlive,
  stopContinuousAlarm,
} from "../utils/soundEffects";

interface YouTubeRewardPlayerProps {
  profile: ChildProfile;
  rewards: CustomRewardItem[];
  redeemLogs: RedeemedRewardLog[];
  onDeductYoutubeMinutes: (minutesUsed: number) => void;
  onRedeemReward: (reward: CustomRewardItem) => void;
  onAddCustomReward: (reward: Omit<CustomRewardItem, "id">) => void;
  parentPin: string;
}

export const YouTubeRewardPlayer: React.FC<YouTubeRewardPlayerProps> = ({
  profile,
  rewards,
  redeemLogs,
  onDeductYoutubeMinutes,
  onRedeemReward,
  onAddCustomReward,
  parentPin,
}) => {
  const [isWatching, setIsWatching] = useState<boolean>(false);
  const [secondsIntoCurrentHalfMin, setSecondsIntoCurrentHalfMin] = useState<number>(0);
  const [isAlarmRinging, setIsAlarmRinging] = useState<boolean>(false);
  const [videoUrl, setVideoUrl] = useState<string>("https://www.youtube.com");
  const [embedId, setEmbedId] = useState<string>("");
  const [pinInput, setPinInput] = useState<string>("");
  const [manualDeductMinutes, setManualDeductMinutes] = useState<number>(5);
  const [pinMessage, setPinMessage] = useState<string | null>(null);

  // New custom gift form
  const [showAddGift, setShowAddGift] = useState<boolean>(false);
  const [giftTitle, setGiftTitle] = useState<string>("");
  const [giftDesc, setGiftDesc] = useState<string>("");
  const [giftStars, setGiftStars] = useState<number>(100);
  const [giftYtBonus, setGiftYtBonus] = useState<number>(0);

  // Wall-clock tracking so background tabs don't drift when child is on the YouTube tab
  const lastTickTimestampRef = useRef<number | null>(null);
  const carrySecondsRef = useRef<number>(0);

  const remainingSeconds = Math.max(
    0,
    Math.round(profile.youtubeMinutes * 60) - secondsIntoCurrentHalfMin
  );

  // Cleanup alarm & audio keep-alive on unmount
  useEffect(() => {
    return () => {
      stopContinuousAlarm();
      stopBackgroundAudioKeepAlive();
    };
  }, []);

  // Flash browser tab title while alarm is ringing so child sees it on the tab bar
  useEffect(() => {
    if (!isAlarmRinging) return;
    const originalTitle = document.title;
    let toggle = false;
    const titleInterval = window.setInterval(() => {
      toggle = !toggle;
      document.title = toggle
        ? "🚨 HẾT GIỜ XEM YOUTUBE! TÚT TÚT!"
        : "⏰ ĐÓNG YOUTUBE NGAY CON ƠI!";
    }, 600);

    return () => {
      window.clearInterval(titleInterval);
      document.title = originalTitle;
    };
  }, [isAlarmRinging]);

  // Accurate wall-clock countdown that works even when browser tab is in the background
  useEffect(() => {
    if (!isWatching) {
      lastTickTimestampRef.current = null;
      return;
    }

    if (remainingSeconds <= 0) {
      setIsWatching(false);
      setSecondsIntoCurrentHalfMin(0);
      carrySecondsRef.current = 0;
      stopBackgroundAudioKeepAlive();
      setIsAlarmRinging(true);
      startContinuousAlarm();
      return;
    }

    lastTickTimestampRef.current = Date.now();

    const interval = window.setInterval(() => {
      const now = Date.now();
      const last = lastTickTimestampRef.current || now;
      const deltaSec = Math.max(1, Math.round((now - last) / 1000));
      lastTickTimestampRef.current = now;

      const totalAccumulated = carrySecondsRef.current + deltaSec;
      if (totalAccumulated >= 30) {
        const halfMinsToDeduct = Math.floor(totalAccumulated / 30) * 0.5;
        const remainder = totalAccumulated % 30;
        carrySecondsRef.current = remainder;
        setSecondsIntoCurrentHalfMin(remainder);
        onDeductYoutubeMinutes(halfMinsToDeduct);
      } else {
        carrySecondsRef.current = totalAccumulated;
        setSecondsIntoCurrentHalfMin(totalAccumulated);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isWatching, remainingSeconds, onDeductYoutubeMinutes]);

  const handleStopAlarm = () => {
    stopContinuousAlarm();
    stopBackgroundAudioKeepAlive();
    setIsAlarmRinging(false);
  };

  const handleStartWatchingAndOpenTab = () => {
    if (profile.youtubeMinutes <= 0) return;
    handleStopAlarm();
    // Keep audio thread active while child switches to the new YouTube tab
    startBackgroundAudioKeepAlive();
    carrySecondsRef.current = secondsIntoCurrentHalfMin;
    lastTickTimestampRef.current = Date.now();
    setIsWatching(true);
  };

  const handlePauseWatching = () => {
    setIsWatching(false);
    stopBackgroundAudioKeepAlive();
  };

  const handleTestAlarm = () => {
    if (isAlarmRinging) {
      handleStopAlarm();
    } else {
      setIsAlarmRinging(true);
      startContinuousAlarm();
    }
  };

  const extractYoutubeId = (url: string) => {
    const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : "";
  };

  const handleLoadVideo = (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractYoutubeId(videoUrl);
    if (id) {
      setEmbedId(id);
    }
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleParentManualDeduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput !== parentPin) {
      setPinMessage("Mã PIN phụ huynh chưa đúng (Mặc định: 1234).");
      return;
    }
    onDeductYoutubeMinutes(manualDeductMinutes);
    setPinMessage(`Đã trừ ${manualDeductMinutes} phút khỏi quỹ YouTube của ${profile.name}.`);
    setPinInput("");
  };

  const handleCreateCustomGift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!giftTitle.trim()) return;
    onAddCustomReward({
      title: giftTitle.trim(),
      description: giftDesc.trim() || "Phần thưởng tự chọn khi con tích đủ sao",
      starsCost: giftStars,
      youtubeMinutesBonus: giftYtBonus > 0 ? giftYtBonus : undefined,
    });
    setGiftTitle("");
    setGiftDesc("");
    setShowAddGift(false);
  };

  const targetYoutubeTabUrl =
    videoUrl.trim().startsWith("http://") || videoUrl.trim().startsWith("https://")
      ? videoUrl.trim()
      : "https://www.youtube.com";

  return (
    <div className="space-y-8">
      {/* Loud Continuous Timeout Alarm Banner when time runs out */}
      {isAlarmRinging && (
        <div className="rounded-2xl border-2 border-rose-600 border-b-[6px] bg-rose-600 text-white p-6 shadow-xl flex flex-wrap items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white text-rose-600 flex items-center justify-center shrink-0 shadow-md">
              <BellRing className="w-8 h-8 animate-bounce" />
            </div>
            <div className="space-y-1">
              <div className="text-xl font-black tracking-tight uppercase">
                TÚT TÚT TÚT! ĐÃ HẾT GIỜ XEM YOUTUBE RỒI {profile.name.toUpperCase()} ƠI!
              </div>
              <p className="text-sm text-rose-100 font-medium">
                Chuông cảnh báo đang kêu liên tục vì quỹ thời gian đã về 00:00. Con hãy tắt tab YouTube và bấm nút bên cạnh để dừng chuông nhé!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleStopAlarm}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-rose-700 hover:bg-rose-50 text-sm font-black border-b-4 border-rose-200 shadow-lg transition-transform active:translate-y-0.5 whitespace-nowrap shrink-0"
          >
            <VolumeX className="w-5 h-5" />
            <span>TẮT CHUÔNG BÁO HẾT GIỜ</span>
          </button>
        </div>
      )}

      {/* Top Wallet Summary — Large Raised 3D Tactile Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ví YouTube Raised 3D Block */}
        <div className="rounded-2xl border-2 border-rose-300 border-b-[6px] bg-gradient-to-br from-rose-50 via-white to-orange-50 p-6 shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-100 text-rose-800 text-xs font-extrabold uppercase tracking-wide">
              <Tv className="w-3.5 h-3.5 text-rose-600" />
              <span>Ví Thời Gian YouTube Của {profile.name}</span>
            </div>
            <div className="text-4xl sm:text-5xl font-black text-rose-600 font-mono-tabular tracking-tight">
              {profile.youtubeMinutes.toFixed(1)}{" "}
              <span className="text-2xl font-extrabold text-rose-500">phút</span>
            </div>
            <p className="text-xs font-medium text-slate-600">
              1 câu đúng = <strong>+0.5 phút</strong> (tính khi bài làm đạt từ 70% trở lên)
            </p>
          </div>
          <div className="w-20 h-20 rounded-2xl bg-rose-600 border-2 border-rose-700 border-b-[5px] shadow-md flex items-center justify-center text-white shrink-0">
            <Tv className="w-10 h-10" />
          </div>
        </div>

        {/* Hũ Sao Tích Lũy Raised 3D Block */}
        <div className="rounded-2xl border-2 border-amber-300 border-b-[6px] bg-gradient-to-br from-amber-50 via-white to-yellow-50 p-6 shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-between gap-5">
          <div className="space-y-2 flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-100 text-amber-900 text-xs font-extrabold uppercase tracking-wide">
              <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
              <span>Hũ Sao Thưởng (Đủ 100 Sao Đổi Quà Lớn)</span>
            </div>
            <div className="text-4xl sm:text-5xl font-black text-amber-600 font-mono-tabular tracking-tight">
              {profile.stars}{" "}
              <span className="text-2xl font-extrabold text-amber-500">/ 100 Sao</span>
            </div>
            <div className="w-full max-w-sm h-3.5 bg-amber-100 border border-amber-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-300"
                style={{ width: `${Math.min(100, profile.stars)}%` }}
              />
            </div>
          </div>
          <div className="w-20 h-20 rounded-2xl bg-amber-500 border-2 border-amber-600 border-b-[5px] shadow-md flex items-center justify-center text-white shrink-0">
            <Star className="w-10 h-10 fill-white" />
          </div>
        </div>
      </div>

      {/* Two-Column Split: YouTube Timer Player & 100-Star Shop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Direct YouTube Reward Timer & Player (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border-2 border-slate-200 border-b-[6px] bg-white p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Bộ Đếm Giờ Xem YouTube &amp; Chuông Báo Hết Giờ
              </h2>
              <p className="text-xs text-slate-500">
                Bấm nút bắt đầu sẽ mở sang tab YouTube ngay và đếm ngược. Khi hết giờ còi sẽ kêu "Tút tút" liên tục!
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Digital Countdown Clock */}
              <div
                className={`px-4 py-2.5 rounded-xl border-b-4 font-mono-tabular text-xl font-black flex items-center gap-2 ${
                  isWatching
                    ? "bg-rose-600 border-rose-800 text-white"
                    : "bg-slate-900 border-slate-950 text-white"
                }`}
              >
                <Clock className={`w-5 h-5 ${isWatching ? "text-yellow-300 animate-spin" : "text-rose-400"}`} />
                <span>{formatTime(remainingSeconds)}</span>
              </div>

              {isWatching ? (
                <button
                  type="button"
                  onClick={handlePauseWatching}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 border-b-4 border-amber-700 text-xs font-extrabold text-white transition-all whitespace-nowrap shrink-0"
                >
                  <Pause className="w-4 h-4" />
                  <span>Tạm dừng đếm giờ</span>
                </button>
              ) : profile.youtubeMinutes > 0 ? (
                <a
                  href={targetYoutubeTabUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleStartWatchingAndOpenTab}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 border-b-4 border-rose-800 text-xs font-extrabold text-white shadow-sm transition-all active:translate-y-0.5 whitespace-nowrap shrink-0"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Bắt đầu tính giờ &amp; Mở tab YouTube</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-200 text-slate-400 text-xs font-bold cursor-not-allowed whitespace-nowrap shrink-0"
                >
                  <Play className="w-4 h-4" />
                  <span>Đã hết phút xem YouTube</span>
                </button>
              )}
            </div>
          </div>

          {/* Test Alarm Button & Custom URL Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="text-xs text-slate-600 font-medium">
              🔔 Khi đồng hồ về <strong>00:00</strong>, web sẽ phát tiếng còi <strong>"TÚT TÚT"</strong> liên tục át tiếng YouTube.
            </div>
            <button
              type="button"
              onClick={handleTestAlarm}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap shrink-0 ${
                isAlarmRinging
                  ? "bg-rose-600 text-white border-rose-700"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
              }`}
            >
              <Volume2 className="w-3.5 h-3.5 text-rose-600" />
              <span>{isAlarmRinging ? "Dừng thử chuông" : "Nghe thử còi báo hết giờ"}</span>
            </button>
          </div>

          {/* Optional YouTube Video Embed or URL target */}
          <form onSubmit={handleLoadVideo} className="flex items-center gap-2">
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Link YouTube muốn mở (Mặc định: https://www.youtube.com)..."
              className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button
              type="submit"
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              Xem ngay tại đây
            </button>
          </form>

          {profile.youtubeMinutes <= 0 ? (
            <div className="rounded-2xl bg-rose-50/60 border-2 border-rose-200 p-8 text-center space-y-2">
              <Tv className="w-10 h-10 text-rose-400 mx-auto" />
              <div className="text-base font-extrabold text-slate-800">
                Quỹ phút YouTube của con hiện đang bằng 0 phút
              </div>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Con hãy vào <strong>Góc Học Tập</strong> làm bài tập đạt tỷ lệ đúng từ 70% trở lên (mỗi câu đúng được +0.5 phút) hoặc dùng 100 Sao để đổi thêm 60 phút nhé!
              </p>
            </div>
          ) : embedId && isWatching ? (
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border-2 border-slate-200">
              <iframe
                title="YouTube Reward Player"
                src={`https://www.youtube.com/embed/${embedId}?autoplay=1`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Play className="w-6 h-6 fill-rose-600" />
              </div>
              <div className="text-sm font-extrabold text-slate-800">
                {isWatching
                  ? "Đang mở tab YouTube và đếm ngược thời gian thực..."
                  : "Bấm nút 'Bắt đầu tính giờ & Mở tab YouTube' ở trên để mở YouTube và tự động tính giờ"}
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Mỗi 30 giây xem thực tế sẽ tự động trừ 0.5 phút trong ví thưởng. Khi hết giờ chuông sẽ kêu "Tút tút" liên tục báo hiệu cho con nghỉ mắt.
              </p>
            </div>
          )}

          {/* Parent Manual Deduction with PIN */}
          <form
            onSubmit={handleParentManualDeduct}
            className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold">Phụ huynh trừ phút thủ công (khi con xem trên TV):</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={manualDeductMinutes}
                onChange={(e) => setManualDeductMinutes(Number(e.target.value))}
                className="w-20 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 font-mono-tabular"
              />
              <span className="text-xs text-slate-500">phút</span>
              <input
                type="password"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Mã PIN"
                className="w-24 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 font-mono-tabular"
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg whitespace-nowrap shrink-0"
              >
                Trừ phút
              </button>
            </div>
            {pinMessage && <div className="w-full text-xs text-sky-700 font-medium">{pinMessage}</div>}
          </form>
        </div>

        {/* Right: 100-Star Gift Shop (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border-2 border-slate-200 border-b-[6px] bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Cửa Hàng Đổi Sao</h2>
              <p className="text-xs text-slate-500">
                Đạt 3 sao (từ 90%), 2 sao (từ 80%), 1 sao (từ 70%) sau mỗi đề thi
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddGift((prev) => !prev)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm quà</span>
            </button>
          </div>

          {showAddGift && (
            <form
              onSubmit={handleCreateCustomGift}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs"
            >
              <div className="font-bold text-slate-800">Tạo phần thưởng mới cho bé</div>
              <input
                type="text"
                required
                value={giftTitle}
                onChange={(e) => setGiftTitle(e.target.value)}
                placeholder="Tên món quà (VD: Đi công viên nước cuối tuần)"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
              />
              <input
                type="text"
                value={giftDesc}
                onChange={(e) => setGiftDesc(e.target.value)}
                placeholder="Mô tả chi tiết..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1">Số sao cần đổi:</label>
                  <input
                    type="number"
                    min={10}
                    value={giftStars}
                    onChange={(e) => setGiftStars(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Cộng phút YouTube (nếu có):</label>
                  <input
                    type="number"
                    min={0}
                    value={giftYtBonus}
                    onChange={(e) => setGiftYtBonus(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono-tabular"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddGift(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-sky-600 text-white font-bold"
                >
                  Lưu phần quà
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {rewards.map((item) => {
              const canRedeem = profile.stars >= item.starsCost;
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border-2 border-slate-200 border-b-4 bg-white flex items-center justify-between gap-4 hover:border-amber-300 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-amber-600 shrink-0" />
                      <h3 className="text-sm font-extrabold text-slate-900">{item.title}</h3>
                    </div>
                    <p className="text-xs text-slate-500">{item.description}</p>
                    <div className="text-xs font-bold text-amber-700 font-mono-tabular">
                      Cần: {item.starsCost} Sao
                      {item.youtubeMinutesBonus ? ` · Cộng ngay +${item.youtubeMinutesBonus} phút YouTube` : ""}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!canRedeem}
                    onClick={() => onRedeemReward(item)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap shrink-0 ${
                      canRedeem
                        ? "bg-amber-500 text-white border-b-4 border-amber-700 hover:bg-amber-600"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {canRedeem ? "Đổi quà ngay" : `Thiếu ${item.starsCost - profile.stars} sao`}
                  </button>
                </div>
              );
            })}
          </div>

          {redeemLogs.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <div className="text-xs font-bold text-slate-700">Lịch sử đổi quà của con</div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {redeemLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between text-xs text-slate-600 py-1 border-b border-slate-50"
                  >
                    <span className="flex items-center gap-1.5 font-medium text-slate-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {log.rewardTitle}
                    </span>
                    <span className="font-mono-tabular text-slate-500">
                      -{log.starsSpent} sao · {new Date(log.redeemedAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
