import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
  Headphones,
  Sparkles,
  BookOpen,
  Gauge,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  StoryAudioSegment,
  getBestVietnameseVoice,
  formatAudioDuration,
} from '../utils/storyAudioEngine';

interface StoryAudioPlayerProps {
  storyTitle: string;
  segments: StoryAudioSegment[];
  currentFlipbookPageIndex: number;
  onPageChange: (flipbookPageIndex: number) => void;
  onClose: () => void;
  autoFlip?: boolean;
}

export const StoryAudioPlayer: React.FC<StoryAudioPlayerProps> = ({
  storyTitle,
  segments,
  currentFlipbookPageIndex,
  onPageChange,
  onClose,
  autoFlip = true,
}) => {
  // Trạng thái phát âm thanh
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<0.75 | 1 | 1.25>(1);
  const [autoTurnPage, setAutoTurnPage] = useState<boolean>(autoFlip);
  const [isVoiceSupported, setIsVoiceSupported] = useState<boolean>(true);
  const [voiceName, setVoiceName] = useState<string>('');

  // Refs để điều khiển chuỗi phát âm Web Speech API
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const currentSegmentIdxRef = useRef<number>(0);
  const playbackRateRef = useRef<number>(1);
  const autoTurnPageRef = useRef<boolean>(autoFlip);

  isPlayingRef.current = isPlaying;
  currentSegmentIdxRef.current = currentSegmentIdx;
  playbackRateRef.current = playbackRate;
  autoTurnPageRef.current = autoTurnPage;

  // Khởi tạo giọng đọc tiếng Việt khi tải component
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsVoiceSupported(false);
      return;
    }

    const checkVoice = () => {
      const voice = getBestVietnameseVoice();
      if (voice) {
        setVoiceName(voice.name);
      }
    };

    checkVoice();
    window.speechSynthesis.onvoiceschanged = checkVoice;

    // Tự động tìm đoạn âm thanh gần với trang sách hiện tại nhất khi mở
    const initialSegmentIdx = segments.findIndex(
      (s) => s.flipbookPageIndex === currentFlipbookPageIndex
    );
    if (initialSegmentIdx >= 0) {
      setCurrentSegmentIdx(initialSegmentIdx);
      currentSegmentIdxRef.current = initialSegmentIdx;
    }

    // Tự động phát khi người dùng mở thanh nghe truyện
    handlePlay(initialSegmentIdx >= 0 ? initialSegmentIdx : 0);

    return () => {
      // Dọn dẹp dừng phát khi đóng component
      handleStopInternal();
    };
  }, []);

  const totalSegments = segments.length;
  const currentSegment = segments[currentSegmentIdx] || segments[0];

  // Tính tổng thời lượng ước tính và thời lượng đã qua
  const totalDurationSeconds = Math.round(
    segments.reduce((acc, s) => acc + s.estimatedSeconds, 0) / playbackRate
  );

  const elapsedSeconds = Math.round(
    segments
      .slice(0, currentSegmentIdx)
      .reduce((acc, s) => acc + s.estimatedSeconds, 0) / playbackRate
  );

  /**
   * Phát một đoạn văn bản cụ thể
   */
  const speakSegment = (segIdx: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (segIdx < 0 || segIdx >= segments.length) {
      setIsPlaying(false);
      setIsPaused(false);
      return;
    }

    // Dừng phát bài hiện tại
    window.speechSynthesis.cancel();

    const segment = segments[segIdx];
    setCurrentSegmentIdx(segIdx);
    currentSegmentIdxRef.current = segIdx;

    // Tự động lật sách sang trang tương ứng
    if (autoTurnPageRef.current && segment.flipbookPageIndex !== undefined) {
      onPageChange(segment.flipbookPageIndex);
    }

    const utterance = new SpeechSynthesisUtterance(segment.text);
    utteranceRef.current = utterance;

    // Thiết lập ngôn ngữ tiếng Việt và giọng đọc
    utterance.lang = 'vi-VN';
    utterance.rate = 0.92 * playbackRateRef.current; // Tốc độ chuẩn mực cho trẻ em tiểu học
    utterance.pitch = 1.05; // Cao độ nhẹ nhàng, tươi sáng

    const voice = getBestVietnameseVoice();
    if (voice) {
      utterance.voice = voice;
      setVoiceName(voice.name);
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      // Nếu còn đang trong chế độ phát và chưa dừng, tự động phát đoạn tiếp theo
      if (isPlayingRef.current) {
        const nextIdx = currentSegmentIdxRef.current + 1;
        if (nextIdx < segments.length) {
          // Thêm khoảng dừng nhẹ 350ms giữa các đoạn để trẻ em tiếp thu nội dung
          setTimeout(() => {
            if (isPlayingRef.current) {
              speakSegment(nextIdx);
            }
          }, 350);
        } else {
          // Đã nghe hết toàn bộ câu chuyện
          setIsPlaying(false);
          setIsPaused(false);
        }
      }
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.warn('Lỗi đọc tiếng Việt:', e.error);
      }
      if (e.error !== 'canceled') {
        setIsPlaying(false);
        setIsPaused(false);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  /**
   * Bắt đầu phát
   */
  const handlePlay = (targetIdx?: number) => {
    const idx = targetIdx !== undefined ? targetIdx : currentSegmentIdx;
    setIsPlaying(true);
    setIsPaused(false);
    speakSegment(idx);
  };

  /**
   * Tạm dừng
   */
  const handlePause = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  /**
   * Tiếp tục nghe
   */
  const handleResume = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
        setIsPlaying(true);
      } else {
        handlePlay(currentSegmentIdx);
      }
    }
  };

  /**
   * Dừng hẳn
   */
  const handleStopInternal = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
  };

  const handleStop = () => {
    handleStopInternal();
  };

  /**
   * Đọc lại đoạn trước
   */
  const handlePrevSegment = () => {
    const prevIdx = Math.max(0, currentSegmentIdx - 1);
    handlePlay(prevIdx);
  };

  /**
   * Chuyển sang đoạn tiếp theo
   */
  const handleNextSegment = () => {
    const nextIdx = Math.min(segments.length - 1, currentSegmentIdx + 1);
    handlePlay(nextIdx);
  };

  /**
   * Đổi tốc độ đọc: 0.75x, 1x, 1.25x
   */
  const handleChangeRate = (newRate: 0.75 | 1 | 1.25) => {
    setPlaybackRate(newRate);
    playbackRateRef.current = newRate;
    // Nếu đang phát, khởi động lại đoạn hiện tại với tốc độ mới
    if (isPlaying) {
      speakSegment(currentSegmentIdx);
    }
  };

  /**
   * Nhảy tới đoạn được chọn trên thanh trượt
   */
  const handleSeek = (newIdx: number) => {
    if (newIdx >= 0 && newIdx < segments.length) {
      handlePlay(newIdx);
    }
  };

  return (
    <div className="w-full bg-gradient-to-r from-emerald-950 via-stone-900 to-teal-950 text-white rounded-2xl md:rounded-3xl p-3 sm:p-4 shadow-2xl border-2 border-emerald-500/30 animate-in fade-in slide-in-from-top-3 relative z-40">
      {/* 1. Header của thanh nghe truyện */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-emerald-800/40">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
            <Headphones className="w-4 h-4 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                Nghe truyện tiếng Việt
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-[11px] font-bold border border-emerald-500/30">
                {currentSegment?.pageNumber ? `Trang ${currentSegment.pageNumber}` : 'Đang đọc'}
              </span>
            </div>
            <p className="text-xs text-stone-300 font-medium truncate max-w-xs sm:max-w-md">
              {storyTitle}
            </p>
          </div>
        </div>

        {/* Nút bật/tắt tự động lật trang & Nút đóng */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoTurnPage(!autoTurnPage)}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black border transition cursor-pointer ${
              autoTurnPage
                ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200 shadow-xs'
                : 'bg-stone-800/60 border-stone-700 text-stone-400'
            }`}
            title="Tự động lật trang sách theo giọng đọc đang phát"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tự lật trang: {autoTurnPage ? 'Bật' : 'Tắt'}</span>
          </button>

          <button
            onClick={() => {
              handleStop();
              onClose();
            }}
            className="p-1.5 hover:bg-white/10 rounded-xl text-stone-300 hover:text-white transition cursor-pointer"
            title="Đóng thanh nghe truyện"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Hộp hiển thị văn bản đang đọc với chữ to, nổi bật cho học sinh theo dõi */}
      <div className="my-2.5 p-2.5 sm:p-3 bg-stone-900/90 rounded-xl sm:rounded-2xl border border-emerald-500/20 shadow-inner flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0 text-amber-400">
          <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-stone-100 text-xs sm:text-sm md:text-base font-bold font-['Quicksand',sans-serif] leading-relaxed line-clamp-2 sm:line-clamp-3">
            {currentSegment?.text || 'Đang chuẩn bị câu chuyện...'}
          </p>
        </div>
      </div>

      {/* 3. Thanh tiến trình âm thanh */}
      <div className="space-y-1 my-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-stone-300">
          <span className="text-emerald-300">
            Đoạn {currentSegmentIdx + 1} / {totalSegments}
          </span>
          <span className="text-stone-400 font-mono">
            {formatAudioDuration(elapsedSeconds)} / {formatAudioDuration(totalDurationSeconds)}
          </span>
        </div>

        {/* Thanh trượt tiến trình tương tác */}
        <div
          className="w-full h-2.5 bg-stone-800 rounded-full overflow-hidden p-0.5 cursor-pointer relative group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const ratio = Math.max(0, Math.min(1, clickX / rect.width));
            const targetIdx = Math.floor(ratio * totalSegments);
            handleSeek(targetIdx);
          }}
          title="Bấm để nhảy tới đoạn tương ứng trong truyện"
        >
          <div
            className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-300 rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, Math.max(4, ((currentSegmentIdx + 1) / totalSegments) * 100))}%`,
            }}
          />
        </div>
      </div>

      {/* 4. Hàng nút điều khiển âm thanh đầy đủ */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {/* Nhóm nút chính: Lùi - Phát/Tạm dừng/Tiếp tục - Dừng hẳn - Tiến */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* ⏮ Đọc lại đoạn trước */}
          <button
            onClick={handlePrevSegment}
            disabled={currentSegmentIdx === 0}
            className="p-2 sm:px-3 sm:py-2 bg-stone-800/90 hover:bg-stone-700 disabled:opacity-30 disabled:pointer-events-none text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 shadow-xs"
            title="Đọc lại đoạn trước (⏮)"
          >
            <SkipBack className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline">Đoạn trước</span>
          </button>

          {/* ▶ / ⏸ Phát - Tạm dừng - Tiếp tục nghe */}
          {isPlaying ? (
            <button
              onClick={handlePause}
              className="px-3.5 py-2 sm:px-4 bg-amber-500 hover:bg-amber-600 active:scale-95 text-stone-950 font-black text-xs sm:text-sm rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5"
              title="Tạm dừng nghe (⏸)"
            >
              <Pause className="w-4 h-4 fill-stone-950" />
              <span>Tạm dừng</span>
            </button>
          ) : isPaused ? (
            <button
              onClick={handleResume}
              className="px-3.5 py-2 sm:px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-stone-950 font-black text-xs sm:text-sm rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5 animate-pulse"
              title="Tiếp tục nghe (▶)"
            >
              <Play className="w-4 h-4 fill-stone-950" />
              <span>Tiếp tục</span>
            </button>
          ) : (
            <button
              onClick={() => handlePlay(currentSegmentIdx)}
              className="px-3.5 py-2 sm:px-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 active:scale-95 text-stone-950 font-black text-xs sm:text-sm rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5"
              title="Phát truyện (▶)"
            >
              <Play className="w-4 h-4 fill-stone-950" />
              <span>Phát truyện</span>
            </button>
          )}

          {/* ⏹ Dừng hẳn */}
          <button
            onClick={handleStop}
            className="p-2 sm:px-3 sm:py-2 bg-stone-800/90 hover:bg-stone-700 text-stone-200 hover:text-red-400 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 shadow-xs"
            title="Dừng hẳn (⏹)"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span className="hidden md:inline">Dừng</span>
          </button>

          {/* ⏭ Chuyển sang đoạn tiếp theo */}
          <button
            onClick={handleNextSegment}
            disabled={currentSegmentIdx >= totalSegments - 1}
            className="p-2 sm:px-3 sm:py-2 bg-stone-800/90 hover:bg-stone-700 disabled:opacity-30 disabled:pointer-events-none text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 shadow-xs"
            title="Chuyển sang đoạn tiếp theo (⏭)"
          >
            <span className="hidden md:inline">Đoạn sau</span>
            <SkipForward className="w-4 h-4 text-emerald-400" />
          </button>
        </div>

        {/* Nhóm điều chỉnh tốc độ đọc: 0.75x, 1x, 1.25x */}
        <div className="flex items-center gap-1 bg-stone-900/80 p-1 rounded-xl border border-stone-700/60">
          <span className="text-[11px] font-bold text-stone-400 px-1 hidden sm:inline flex items-center gap-0.5">
            <Gauge className="w-3 h-3" />
            <span>Tốc độ:</span>
          </span>
          <button
            onClick={() => handleChangeRate(0.75)}
            className={`px-2 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
              playbackRate === 0.75
                ? 'bg-emerald-500 text-stone-950 shadow-xs'
                : 'text-stone-300 hover:text-white'
            }`}
            title="Tốc độ đọc chậm 0.75x (thích hợp cho lớp 1-2 mới tập đọc)"
          >
            0.75x
          </button>
          <button
            onClick={() => handleChangeRate(1)}
            className={`px-2 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
              playbackRate === 1
                ? 'bg-emerald-500 text-stone-950 shadow-xs'
                : 'text-stone-300 hover:text-white'
            }`}
            title="Tốc độ đọc chuẩn 1x (tự nhiên, rõ ràng)"
          >
            1x
          </button>
          <button
            onClick={() => handleChangeRate(1.25)}
            className={`px-2 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
              playbackRate === 1.25
                ? 'bg-emerald-500 text-stone-950 shadow-xs'
                : 'text-stone-300 hover:text-white'
            }`}
            title="Tốc độ đọc nhanh 1.25x (lớp 4-5)"
          >
            1.25x
          </button>
        </div>
      </div>
    </div>
  );
};
