import React, { useEffect, useState } from "react";
import { ChildProfile, CustomRewardItem, RedeemedRewardLog } from "../types";
import { Clock, Gift, Lock, Pause, Play, Plus, Star, Tv, CheckCircle2 } from "lucide-react";

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
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [videoUrl, setVideoUrl] = useState<string>("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
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

  const remainingSeconds = Math.max(0, Math.round(profile.youtubeMinutes * 60) - secondsElapsed);

  useEffect(() => {
    if (!isWatching) return;
    if (remainingSeconds <= 0) {
      setIsWatching(false);
      return;
    }

    const interval = setInterval(() => {
      setSecondsElapsed((prev) => {
        const next = prev + 1;
        // Every 30 seconds (0.5 minutes), deduct 0.5 minutes from profile balance
        if (next >= 30) {
          onDeductYoutubeMinutes(0.5);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isWatching, remainingSeconds, onDeductYoutubeMinutes]);

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

  return (
    <div className="space-y-8">
      {/* Top Wallet Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-500">
              Quỹ thời gian YouTube của {profile.name}
            </div>
            <div className="text-3xl font-extrabold text-rose-600 font-mono-tabular">
              {profile.youtubeMinutes.toFixed(1)} phút
            </div>
            <p className="text-xs text-slate-600">
              Quy tắc: 1 câu đúng = +0.5 phút (chỉ tính khi bài làm đạt từ 70% trở lên)
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
            <Tv className="w-7 h-7" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-500">
              Hũ Sao Tích Lũy (Mục tiêu 100 Sao đổi quà)
            </div>
            <div className="text-3xl font-extrabold text-amber-600 font-mono-tabular">
              {profile.stars} / 100 Sao
            </div>
            <div className="w-full max-w-xs h-2.5 bg-slate-100 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${Math.min(100, profile.stars)}%` }}
              />
            </div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <Star className="w-7 h-7 fill-amber-500" />
          </div>
        </div>
      </div>

      {/* Two-Column Split: YouTube Timer Player & 100-Star Shop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Direct YouTube Reward Timer & Player (7 cols) */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Bộ Đếm Giờ Xem YouTube Trực Tiếp
              </h2>
              <p className="text-xs text-slate-500">
                Khi bấm Bắt đầu xem, đồng hồ sẽ tự động trừ quỹ phút thưởng của con theo thời gian thực
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3.5 py-2 rounded-lg bg-slate-900 text-white font-mono-tabular text-lg font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-400" />
                <span>{formatTime(remainingSeconds)}</span>
              </div>

              <button
                type="button"
                disabled={profile.youtubeMinutes <= 0 && !isWatching}
                onClick={() => setIsWatching((prev) => !prev)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 ${
                  isWatching
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-rose-600 hover:bg-rose-700 disabled:opacity-40"
                }`}
              >
                {isWatching ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Tạm dừng đếm giờ</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Bắt đầu tính giờ xem</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Optional YouTube Video Embed inside safe timer */}
          <form onSubmit={handleLoadVideo} className="flex items-center gap-2">
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Dán link video YouTube con muốn xem vào đây..."
              className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button
              type="submit"
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Mở Video
            </button>
          </form>

          {profile.youtubeMinutes <= 0 ? (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-8 text-center space-y-2">
              <Tv className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-slate-800">
                Quỹ phút YouTube của con hiện đang bằng 0 phút
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Con hãy vào Góc Học Tập làm bài tập đạt tỷ lệ đúng từ 70% trở lên (mỗi câu đúng được +0.5 phút) hoặc dùng 100 Sao để đổi thêm 60 phút nhé!
              </p>
            </div>
          ) : embedId && isWatching ? (
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-slate-200">
              <iframe
                title="YouTube Reward Player"
                src={`https://www.youtube.com/embed/${embedId}?autoplay=1`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-8 text-center space-y-2">
              <Play className="w-8 h-8 text-rose-500 mx-auto" />
              <div className="text-sm font-semibold text-slate-800">
                {isWatching
                  ? "Đồng hồ đang đếm ngược thời gian xem YouTube của con..."
                  : "Bấm 'Bắt đầu tính giờ xem' để mở khóa màn hình hoặc tính giờ xem trên TV/iPad"}
              </div>
              <p className="text-xs text-slate-500">
                Mỗi 30 giây xem thực tế sẽ tự động trừ 0.5 phút trong ví thưởng.
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
              <span className="font-medium">Phụ huynh trừ phút thủ công (khi con xem trên TV):</span>
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
                className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg whitespace-nowrap shrink-0"
              >
                Trừ phút
              </button>
            </div>
            {pinMessage && <div className="w-full text-xs text-sky-700 font-medium">{pinMessage}</div>}
          </form>
        </div>

        {/* Right: 100-Star Gift Shop (5 cols) */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Cửa Hàng Đổi Sao</h2>
              <p className="text-xs text-slate-500">
                Đạt 3 sao (từ 90%), 2 sao (từ 80%), 1 sao (từ 70%) sau mỗi đề thi
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddGift((prev) => !prev)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 transition-colors whitespace-nowrap shrink-0"
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
              <div className="font-semibold text-slate-800">Tạo phần thưởng mới cho bé</div>
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
                  className="px-3 py-1.5 rounded-lg bg-sky-600 text-white font-semibold"
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
                  className="p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4 hover:border-amber-300 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-amber-600 shrink-0" />
                      <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                    </div>
                    <p className="text-xs text-slate-500">{item.description}</p>
                    <div className="text-xs font-semibold text-amber-700 font-mono-tabular">
                      Cần: {item.starsCost} Sao
                      {item.youtubeMinutesBonus ? ` · Cộng ngay +${item.youtubeMinutesBonus} phút YouTube` : ""}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!canRedeem}
                    onClick={() => onRedeemReward(item)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      canRedeem
                        ? "bg-amber-600 text-white hover:bg-amber-700"
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
