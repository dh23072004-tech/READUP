import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Sparkles,
  Maximize2,
  Minimize2,
  RotateCcw,
  BookOpen,
  SlidersHorizontal,
  Bookmark,
  CheckSquare,
  X,
  Info,
  Layers,
  Volume1,
  Headphones,
} from 'lucide-react';
import { Story, StoryIllustration } from '../types';
import { speakVietnameseText, stopSpeaking } from '../utils/speech';
import { playPageFlipSound, isAudioMuted, setAudioMuted } from '../utils/flipbookSound';
import {
  buildFlipbookPages,
  FlipbookPage,
} from '../utils/flipbookEngine';
import { FlipbookPageRenderer } from './FlipbookPageRenderer';
import { PdfRenderedPage, renderPdfToPages } from '../utils/pdfRenderer';
import {
  getPdfDataForStory,
  getRenderedPdfPagesFromIndexedDB,
  saveRenderedPdfPagesToIndexedDB,
} from '../utils/indexedDbStorage';
import {
  extractStoryAudioSegments,
  StoryAudioSegment,
} from '../utils/storyAudioEngine';
import { StoryAudioPlayer } from './StoryAudioPlayer';

interface StoryReaderProps {
  story: Story;
  onBack: () => void;
  onStartQuiz: () => void;
}

export const StoryReader: React.FC<StoryReaderProps> = ({
  story,
  onBack,
  onStartQuiz,
}) => {
  // Kiểm tra nếu cuốn sách này là sách PDF
  const isPdfStory = useMemo(() => {
    return (
      story.fileType === 'pdf' ||
      !!story.pdfFileUrl ||
      (story.content &&
        story.content.some(
          (c) =>
            c.includes('.pdf') ||
            c.includes('Tài liệu sách PDF') ||
            c.includes('tài liệu học liệu đính kèm này')
        ))
    );
  }, [story]);

  // States quản lý nạp PDF
  const [pdfPages, setPdfPages] = useState<PdfRenderedPage[] | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Hàm đọc và render nội dung PDF thật
  const loadPdfContent = async () => {
    if (!isPdfStory) return;
    setPdfLoading(true);
    setPdfError(null);
    setPdfProgress(null);

    try {
      // 1. Kiểm tra cache các trang đã render từ trước trong IndexedDB
      const cached = await getRenderedPdfPagesFromIndexedDB(story.id);
      if (cached && cached.length > 0) {
        // Đảm bảo mọi trang trong cache đều có aspectRatio chính xác để căn chỉnh khung lật
        const normalized = cached.map((p) => ({
          ...p,
          aspectRatio:
            p.aspectRatio || (p.width && p.height ? p.width / p.height : 0.707),
        }));
        setPdfPages(normalized);
        setPdfLoading(false);
        return;
      }

      // 2. Lấy dữ liệu tệp PDF thô từ IndexedDB hoặc url
      const pdfData = await getPdfDataForStory(story);
      if (!pdfData) {
        setPdfError(
          `Không tìm thấy dữ liệu tệp PDF của cuốn sách "${story.title}" trong bộ nhớ IndexedDB. Có thể tệp chưa được lưu thành công hoặc dữ liệu trình duyệt đã bị xóa. Vui lòng kiểm tra lại tệp PDF.`
        );
        setPdfLoading(false);
        return;
      }

      // 3. Phân tích và render toàn bộ các trang PDF thành hình ảnh độ nét cao
      const pages = await renderPdfToPages(
        pdfData,
        (curr, total) => setPdfProgress({ current: curr, total }),
        2.4
      );

      if (pages.length === 0) {
        setPdfError('Tệp PDF không có trang nào để hiển thị.');
        setPdfLoading(false);
        return;
      }

      // 4. Lưu cache vào IndexedDB để mở lại ngay lập tức lần sau
      await saveRenderedPdfPagesToIndexedDB(story.id, pages);
      setPdfPages(pages);
      setPdfLoading(false);
    } catch (err: any) {
      console.error('Lỗi khi nạp sách PDF:', err);
      setPdfError(
        `Lỗi khi đọc và xử lý tệp PDF "${story.title}": ${
          err?.message || 'Không thể phân tích cú pháp tệp PDF.'
        }. Vui lòng thử lại hoặc tải lại tệp hợp lệ.`
      );
      setPdfLoading(false);
    }
  };

  useEffect(() => {
    if (isPdfStory) {
      loadPdfContent();
    } else {
      setPdfPages(null);
      setPdfLoading(false);
      setPdfError(null);
    }
  }, [story.id, isPdfStory]);

  // Chuẩn bị danh sách trang đơn (mỗi trang PDF tương ứng một trang sách lật duy nhất)
  const allPages = useMemo(() => buildFlipbookPages(story, pdfPages), [story, pdfPages]);

  // Trích xuất các đoạn văn bản sạch từ PDF và câu chuyện để đọc tự động bằng giọng tiếng Việt
  const audioSegments = useMemo(
    () => extractStoryAudioSegments(story, pdfPages, allPages),
    [story, pdfPages, allPages]
  );

  // States
  const [currentPageIndex, setCurrentPageIndex] = useState(0); // Chế độ 1 trang duy nhất (Single-Page Mode)
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('large');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false); // Bật/tắt thanh nghe truyện tự động
  const [showNoAudioNotice, setShowNoAudioNotice] = useState(false); // Thông báo khi PDF là bản scan chưa có text
  const [soundEnabled, setSoundEnabled] = useState(!isAudioMuted());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<{
    imageUrl: string;
    altText: string;
    caption?: string;
  } | null>(null);

  // Đặt lại trang về đầu khi đổi sách hoặc khi tải xong PDF
  useEffect(() => {
    setCurrentPageIndex(0);
  }, [story.id, pdfPages]);

  // Animation turn state cho hiệu ứng lật 3D tự nhiên
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev'>('next');

  // Container refs for Touch Gestures, Mouse Drag, and Fullscreen
  const readerContainerRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number | null>(null);
  const isDraggingMouseRef = useRef(false);
  const mouseStartXRef = useRef<number | null>(null);

  // Tự động phát hiện kích thước màn hình để tính toán trang sách vừa vặn
  const [viewportSize, setViewportSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  useEffect(() => {
    const checkViewport = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  // Dừng phát âm thanh TTS khi rời khỏi trang
  useEffect(() => {
    return () => {
      stopSpeaking();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Xử lý phím mũi tên bàn phím để lật trang
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPageIndex, allPages.length]);

  // Lắng nghe sự kiện Fullscreen thay đổi
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Tổng số trang và trang hiện tại
  const totalPagesCount = allPages.length;
  const currentPage = allPages[currentPageIndex] || allPages[0];
  const isAtLastPage = currentPageIndex === totalPagesCount - 1;

  // Lật trang tiếp theo
  const handleNextPage = () => {
    if (isPlayingAudio) {
      stopSpeaking();
      setIsPlayingAudio(false);
    }

    if (currentPageIndex < totalPagesCount - 1) {
      setFlipDirection('next');
      setIsFlipping(true);
      playPageFlipSound();
      setTimeout(() => {
        setCurrentPageIndex((prev) => prev + 1);
        setTimeout(() => {
          setIsFlipping(false);
        }, 40);
      }, 190);
    }
  };

  // Lật trang trước đó
  const handlePrevPage = () => {
    if (isPlayingAudio) {
      stopSpeaking();
      setIsPlayingAudio(false);
    }

    if (currentPageIndex > 0) {
      setFlipDirection('prev');
      setIsFlipping(true);
      playPageFlipSound();
      setTimeout(() => {
        setCurrentPageIndex((prev) => prev - 1);
        setTimeout(() => {
          setIsFlipping(false);
        }, 40);
      }, 190);
    }
  };

  // Nhảy tới trang cụ thể theo số thứ tự (index)
  const handleJumpToPage = (targetPageIndex: number) => {
    if (isPlayingAudio) {
      stopSpeaking();
      setIsPlayingAudio(false);
    }
    playPageFlipSound();
    if (targetPageIndex >= 0 && targetPageIndex < totalPagesCount) {
      setCurrentPageIndex(targetPageIndex);
    }
    setShowThumbnails(false);
  };

  // Lật lại từ đầu
  const handleRestartBook = () => {
    stopSpeaking();
    setIsPlayingAudio(false);
    playPageFlipSound();
    setCurrentPageIndex(0);
  };

  // Chuyển sang đọc trang 1 từ bìa
  const handleOpenCover = () => {
    handleNextPage();
  };

  // Mở thanh điều khiển nghe truyện tự động
  const handleOpenAudioPlayer = () => {
    stopSpeaking();
    setIsPlayingAudio(false);

    if (audioSegments.length === 0) {
      setShowNoAudioNotice(true);
      return;
    }

    setShowAudioPlayer(true);
  };

  // Bật/tắt đọc bằng giọng Web Speech API cho trang hiện tại
  const handleToggleSpeak = () => {
    if (isPlayingAudio) {
      stopSpeaking();
      setIsPlayingAudio(false);
      setNoticeMessage('Đã dừng phát giọng đọc.');
      setTimeout(() => setNoticeMessage(null), 2500);
      return;
    }

    // Lấy nội dung trang hiện tại đang hiển thị để đọc
    const page = allPages[currentPageIndex];
    let textToRead = page ? page.paragraphs.join('. ') : '';
    if (!textToRead && page?.type === 'cover') {
      textToRead = `${story.title}. Lớp ${story.grade}. ${story.summary}`;
    } else if (!textToRead && page?.type === 'end') {
      textToRead = `Chúc mừng em đã hoàn thành cuốn sách. ${story.moralLesson || ''}`;
    }
    if (!textToRead) {
      textToRead = `${story.title}. Trang ${page?.pageNumber || 1}`;
    }

    if (!textToRead) {
      textToRead = story.title;
    }

    const started = speakVietnameseText(
      textToRead,
      () => setIsPlayingAudio(false),
      () => setIsPlayingAudio(false)
    );

    if (started) {
      setIsPlayingAudio(true);
      setNoticeMessage('Đang phát giọng đọc mẫu tiếng Việt cho trang này...');
      setTimeout(() => setNoticeMessage(null), 3500);
    } else {
      setNoticeMessage('Trình duyệt hiện tại chưa hỗ trợ Web Speech API.');
      setTimeout(() => setNoticeMessage(null), 4000);
    }
  };

  // Bật/tắt toàn màn hình
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (readerContainerRef.current) {
        readerContainerRef.current.requestFullscreen().catch(() => {});
      }
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Bật/tắt âm thanh xào xạc lật sách
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setAudioMuted(!next);
    if (next) {
      playPageFlipSound();
      setNoticeMessage('Đã bật hiệu ứng âm thanh lật sách giấy.');
    } else {
      setNoticeMessage('Đã tắt âm thanh lật sách.');
    }
    setTimeout(() => setNoticeMessage(null), 2500);
  };

  // Touch Swipe Handlers cho thiết bị cảm ứng
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;

    // Vuốt sang trái > 50px: Trang tiếp theo
    if (diff > 50) {
      handleNextPage();
    }
    // Vuốt sang phải > 50px: Trang trước
    else if (diff < -50) {
      handlePrevPage();
    }
    touchStartXRef.current = null;
  };

  // Mouse Drag support cho thao tác kéo trang bằng chuột trên máy tính
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input, select')) return;
    isDraggingMouseRef.current = true;
    mouseStartXRef.current = e.clientX;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDraggingMouseRef.current || mouseStartXRef.current === null) return;
    const diff = mouseStartXRef.current - e.clientX;
    if (diff > 40) {
      handleNextPage();
    } else if (diff < -40) {
      handlePrevPage();
    }
    isDraggingMouseRef.current = false;
    mouseStartXRef.current = null;
  };

  // Tính toán kích thước tối ưu cho một trang sách đơn (Single-Page Flipbook)
  // Tận dụng tối đa diện tích màn hình, giữ nguyên tỉ lệ gốc của trang PDF, không bị méo hay cắt viền
  const bookDimensions = useMemo(() => {
    const vWidth = viewportSize.width;
    const vHeight = viewportSize.height;
    const isMobile = vWidth < 768;

    // Khoảng trống khả dụng theo chiều dọc (trừ header trên, audio player nếu mở, footer điều hướng dưới và margin)
    const headerHeight = isFullscreen ? 50 : 58;
    const audioPlayerExtra = showAudioPlayer ? (isMobile ? 180 : 160) : 0;
    const footerHeight = isFullscreen ? 62 : 74;
    const verticalPadding = isFullscreen ? 16 : 28;
    const maxAvailHeight = Math.max(
      260,
      vHeight - headerHeight - audioPlayerExtra - footerHeight - verticalPadding
    );

    // Khoảng trống khả dụng theo chiều ngang (trừ nút lật trang hai bên và lề thoáng đãng)
    const horizontalMargin = isMobile ? 64 : (vWidth < 1024 ? 130 : 180);
    const maxAvailWidth = Math.max(280, vWidth - horizontalMargin);

    const p = currentPage;
    const targetRatio =
      p?.aspectRatio && p.aspectRatio > 0
        ? p.aspectRatio
        : p?.width && p?.height
        ? p.width / p.height
        : 0.707; // Chuẩn tỉ lệ trang A4 dọc (1 / 1.414 = 0.707)

    // Tính toán kích thước tối đa vừa vặn khung hình (Contain without dead whitespace)
    let bWidth: number;
    let bHeight: number;

    const widthIfFitHeight = maxAvailHeight * targetRatio;

    if (widthIfFitHeight <= maxAvailWidth) {
      bHeight = maxAvailHeight;
      bWidth = widthIfFitHeight;
    } else {
      bWidth = maxAvailWidth;
      bHeight = maxAvailWidth / targetRatio;
    }

    return {
      width: Math.round(bWidth),
      height: Math.round(bHeight),
      targetRatio,
    };
  }, [
    viewportSize,
    isFullscreen,
    showAudioPlayer,
    currentPage,
  ]);

  // Tổng số trang nội dung chính
  const totalContentPages = useMemo(() => {
    if (pdfPages && pdfPages.length > 0) {
      return pdfPages.length;
    }
    const storyPages = allPages.filter((p) => p.type === 'story');
    return storyPages.length > 0 ? storyPages.length : totalPagesCount;
  }, [pdfPages, allPages, totalPagesCount]);

  // Tính số trang hiển thị: Chuẩn "Trang 3/12"
  const pageDisplayString = useMemo(() => {
    if (pdfPages && pdfPages.length > 0) {
      if (currentPage.type === 'pdf-page' && currentPage.pdfPageNumber) {
        return `Trang ${currentPage.pdfPageNumber}/${pdfPages.length}`;
      } else if (currentPage.type === 'end') {
        return `Hoàn thành (${pdfPages.length}/${pdfPages.length})`;
      } else if (currentPage.type === 'cover') {
        return `Bìa sách (Trang 1/${pdfPages.length})`;
      }
      return `Trang ${currentPage.pageNumber}/${pdfPages.length}`;
    }

    if (currentPage.type === 'cover') {
      return 'Bìa sách';
    } else if (currentPage.type === 'end') {
      return 'Hoàn thành';
    }
    return `Trang ${currentPage.pageNumber}/${totalContentPages}`;
  }, [pdfPages, currentPage, totalContentPages]);

  // Tiến trình đọc (0% đến 100%)
  const progressPercent = useMemo(() => {
    if (totalPagesCount <= 1) return 100;
    return Math.round((currentPageIndex / (totalPagesCount - 1)) * 100);
  }, [currentPageIndex, totalPagesCount]);

  return (
    <div
      ref={readerContainerRef}
      className={`min-h-[calc(100vh-80px)] flex flex-col justify-between py-3 px-2 sm:px-6 select-none bg-[#F5EFE6] transition-colors duration-300 ${
        isFullscreen ? 'fixed inset-0 z-50 p-2 sm:p-4 overflow-y-auto bg-[#ECE5D8]' : ''
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* =========================================================================
          1. THANH CÔNG CỤ TRÊN CÙNG (TOP TOOLBAR)
          ========================================================================= */}
      <header className="max-w-[min(98vw,1600px)] w-full mx-auto mb-2 bg-[#FFFDF9] border border-[#E2D8C3] p-2 sm:p-2.5 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-2">
        {/* Nút thoát về tủ sách */}
        <button
          onClick={() => {
            stopSpeaking();
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
              window.speechSynthesis.cancel();
            }
            onBack();
          }}
          className="flex items-center gap-1.5 text-stone-700 hover:text-emerald-800 font-extrabold text-xs sm:text-sm px-3 py-1.5 rounded-xl hover:bg-stone-100 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tủ sách</span>
        </button>

        {/* Thông tin tên sách ngắn gọn */}
        <div className="hidden lg:flex items-center gap-2 text-stone-800 font-bold text-sm">
          <BookOpen className="w-4 h-4 text-emerald-600" />
          <span className="truncate max-w-xs">{story.title}</span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 text-xs font-black">
            Lớp {story.grade}
          </span>
        </div>

        {/* Các nút công cụ điều khiển đọc sách */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* NÚT “🔊 NGHE TRUYỆN” NỔI BẬT DÀNH CHO HỌC SINH TIỂU HỌC */}
          <button
            onClick={() => {
              if (showAudioPlayer) {
                setShowAudioPlayer(false);
              } else {
                handleOpenAudioPlayer();
              }
            }}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer shadow-md ${
              showAudioPlayer
                ? 'bg-amber-500 text-stone-950 ring-2 ring-amber-300 shadow-amber-900/20'
                : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/20 active:scale-95'
            }`}
            title="Bật tính năng Nghe truyện tự động bằng giọng đọc tiếng Việt"
          >
            <Headphones className="w-4 h-4 text-amber-200 shrink-0" />
            <span>🔊 Nghe truyện</span>
          </button>

          {/* Âm thanh xào xạc lật sách */}
          <button
            onClick={handleToggleSound}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              soundEnabled
                ? 'bg-stone-100 text-emerald-800 hover:bg-stone-200'
                : 'bg-stone-100 text-stone-400 line-through'
            }`}
            title={soundEnabled ? 'Âm thanh lật sách: Bật' : 'Âm thanh lật sách: Tắt'}
          >
            <Volume1 className="w-4 h-4" />
          </button>

          {/* Bộ đổi cỡ chữ */}
          <div className="flex items-center bg-stone-100 rounded-xl p-0.5 border border-stone-200">
            <button
              onClick={() => setFontSize('normal')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                fontSize === 'normal' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-500'
              }`}
              title="Cỡ chữ Vừa"
            >
              A
            </button>
            <button
              onClick={() => setFontSize('large')}
              className={`px-2 py-1 rounded-lg text-sm font-black transition cursor-pointer ${
                fontSize === 'large' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-500'
              }`}
              title="Cỡ chữ Lớn"
            >
              A+
            </button>
            <button
              onClick={() => setFontSize('xlarge')}
              className={`px-2 py-1 rounded-lg text-base font-black transition cursor-pointer ${
                fontSize === 'xlarge' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-500'
              }`}
              title="Cỡ chữ Rất lớn"
            >
              A++
            </button>
          </div>

          {/* Huy hiệu chế độ 1 trang tập trung (Single-Page Mode) */}
          <div
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200/80 shadow-2xs select-none"
            title="Chế độ đọc một trang tập trung (Single-Page)"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
            <span>1 trang</span>
          </div>

          {/* Nút Toàn màn hình (Fullscreen) */}
          <button
            onClick={handleToggleFullscreen}
            className="p-1.5 sm:px-2.5 sm:py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition cursor-pointer"
            title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Đọc toàn màn hình (Full Screen)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* =========================================================================
          THANH NGHE TRUYỆN TIẾNG VIỆT TỰ ĐỘNG DÀNH CHO HỌC SINH TIỂU HỌC
          ========================================================================= */}
      {showAudioPlayer && audioSegments.length > 0 && (
        <div className="max-w-[min(98vw,1400px)] w-full mx-auto mb-2 px-1">
          <StoryAudioPlayer
            storyTitle={story.title}
            segments={audioSegments}
            currentFlipbookPageIndex={currentPageIndex}
            onPageChange={(targetIdx) => handleJumpToPage(targetIdx)}
            onClose={() => setShowAudioPlayer(false)}
            autoFlip={true}
          />
        </div>
      )}

      {/* MODAL THÔNG BÁO KHI SÁCH PDF LÀ BẢN SCAN CHƯA CÓ LỚP VĂN BẢN */}
      {showNoAudioNotice && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFDF9] border-2 border-amber-300 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-3xl shadow-inner">
              📢
            </div>
            <div>
              <h3 className="text-lg font-black text-stone-900 font-['Quicksand',sans-serif]">
                Thông báo tính năng Nghe truyện
              </h3>
              <p className="text-xs sm:text-sm text-stone-700 mt-2 p-3 bg-amber-50/80 rounded-2xl border border-amber-200 leading-relaxed text-left font-medium">
                Tệp PDF này là bản scan hình ảnh, chưa có lớp văn bản số để máy đọc tự động. Thầy cô có thể bổ sung nội dung bài đọc bằng cách nhấn vào <strong>Quản lý của Giáo viên &rarr; Chỉnh sửa sách</strong> để học sinh có thể nghe truyện tự động.
              </p>
            </div>
            <button
              onClick={() => setShowNoAudioNotice(false)}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {/* Thông báo giọng đọc hoặc âm thanh */}
      {noticeMessage && (
        <div className="max-w-md mx-auto mb-2 p-2.5 bg-emerald-100/90 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm animate-in fade-in">
          <Info className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{noticeMessage}</span>
        </div>
      )}

      {/* =========================================================================
          2. KHU VỰC CUỐN SÁCH ĐIỆN TỬ (FLIPBOOK STAGE)
          ========================================================================= */}
      {pdfLoading ? (
        <main className="flex-1 max-w-xl w-full mx-auto flex items-center justify-center p-4">
          <div className="bg-[#FFFDF9] border-2 border-emerald-300 rounded-3xl p-8 sm:p-12 shadow-2xl w-full text-center space-y-5 animate-in fade-in">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-4xl shadow-inner animate-pulse">
              📖
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Đang chuẩn bị trang sách PDF
              </span>
              <h3 className="text-lg sm:text-xl font-black text-stone-900 font-['Quicksand',sans-serif] mt-2">
                {story.title}
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-sm mx-auto">
                Đang giải mã và kết xuất các trang PDF chất lượng cao để hiển thị sách lật...
              </p>
            </div>

            {pdfProgress ? (
              <div className="space-y-2 pt-2 max-w-xs mx-auto">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                  <span>Trang {pdfProgress.current} / {pdfProgress.total}</span>
                  <span>{Math.round((pdfProgress.current / pdfProgress.total) * 100)}%</span>
                </div>
                <div className="w-full h-3 bg-stone-200 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.round((pdfProgress.current / pdfProgress.total) * 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 animate-pulse">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Đang tải tài liệu từ bộ nhớ trình duyệt...</span>
              </div>
            )}
          </div>
        </main>
      ) : pdfError ? (
        <main className="flex-1 max-w-lg w-full mx-auto flex items-center justify-center p-4">
          <div className="bg-[#FFFDF9] border-2 border-red-300 rounded-3xl p-7 sm:p-10 shadow-2xl w-full text-center space-y-4 animate-in fade-in">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-100 flex items-center justify-center text-red-600 text-3xl shadow-inner">
              ⚠️
            </div>
            <div>
              <h3 className="text-lg font-black text-red-950 font-['Quicksand',sans-serif]">
                Không thể hiển thị nội dung tệp PDF
              </h3>
              <p className="text-xs sm:text-sm text-stone-700 mt-2 p-3.5 bg-red-50/80 rounded-2xl border border-red-200 leading-relaxed text-left font-medium">
                {pdfError}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                onClick={onBack}
                className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-extrabold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                Quay lại tủ sách
              </button>
              <button
                onClick={loadPdfContent}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Thử tải lại</span>
              </button>
            </div>
          </div>
        </main>
      ) : (
        <main className="flex-1 w-full flex items-center justify-center relative py-1 sm:py-2 px-1 sm:px-2 overflow-hidden select-none">
          {/* Nút lật trang trước (Bên trái) */}
          <button
            onClick={handlePrevPage}
            disabled={currentPageIndex === 0}
            className={`fixed md:absolute left-1 sm:left-3 lg:left-6 z-30 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-white/95 hover:bg-white text-emerald-950 border-2 border-emerald-300 shadow-xl flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 cursor-pointer disabled:opacity-0 disabled:pointer-events-none ${
              currentPageIndex === 0 ? 'hidden' : ''
            }`}
            title="Lật về trang trước (Phím ← hoặc kéo sang phải)"
          >
            <ChevronLeft className="w-5 h-5 sm:w-7 sm:h-7" />
          </button>

          {/* Nút lật trang sau (Bên phải) */}
          <button
            onClick={handleNextPage}
            disabled={isAtLastPage}
            className={`fixed md:absolute right-1 sm:right-3 lg:right-6 z-30 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-white/95 hover:bg-white text-emerald-950 border-2 border-emerald-300 shadow-xl flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 cursor-pointer disabled:opacity-0 disabled:pointer-events-none ${
              isAtLastPage ? 'hidden' : ''
            }`}
            title="Lật sang trang tiếp theo (Phím → hoặc kéo sang trái)"
          >
            <ChevronRight className="w-5 h-5 sm:w-7 sm:h-7" />
          </button>

          {/* KHUNG CUỐN SÁCH MỘT TRANG DUY NHẤT (SINGLE-PAGE FLIPBOOK DESK) */}
          <div
            style={{
              width: `${bookDimensions.width}px`,
              height: `${bookDimensions.height}px`,
              maxWidth: '100%',
              maxHeight: '100%',
              perspective: '1800px',
            }}
            className="relative mx-auto transition-all duration-300 select-none flex items-center justify-center"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
          >
            {/* Các lớp bóng giấy xếp tầng (Stacked Paper Sheets Effect) tạo chiều sâu tập sách thật */}
            <div
              className="absolute inset-0 bg-[#E8DFC8] rounded-2xl md:rounded-3xl transform translate-x-2 translate-y-2.5 -z-20 opacity-70 shadow-md"
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 bg-[#F4EDE1] rounded-2xl md:rounded-3xl transform translate-x-1 translate-y-1.5 -z-10 opacity-90 shadow-sm"
              aria-hidden="true"
            />

            {/* Lớp bóng đổ mềm mại dưới trang giấy */}
            <div
              className="absolute inset-0 bg-stone-900/15 rounded-3xl blur-xl transform translate-y-4 -z-30 pointer-events-none"
              aria-hidden="true"
            />

            {/* Khung trang giấy đơn: Chỉ một trang tại mọi thời điểm, hiệu ứng lật 3D tự nhiên */}
            <div
              style={{
                transformOrigin: flipDirection === 'next' ? 'left center' : 'right center',
                transform: isFlipping
                  ? flipDirection === 'next'
                    ? 'rotateY(-24deg) scale(0.985) translateZ(12px)'
                    : 'rotateY(24deg) scale(0.985) translateZ(12px)'
                  : 'rotateY(0deg) scale(1) translateZ(0px)',
                transition: 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 200ms ease',
              }}
              className={`relative w-full h-full rounded-2xl md:rounded-3xl overflow-hidden bg-[#FFFDF9] border-2 md:border-4 border-[#DECBB5] shadow-[0_12px_32px_-6px_rgba(0,0,0,0.15),0_4px_12px_-2px_rgba(0,0,0,0.08)] flex flex-col transition-all cursor-grab active:cursor-grabbing ${
                isFlipping ? 'pointer-events-none' : ''
              }`}
            >
              {/* Vệt bóng gáy sách / nếp trang tinh tế bên mép trái */}
              <div
                className="absolute top-0 bottom-0 left-0 w-3 sm:w-4 bg-gradient-to-r from-stone-400/20 via-stone-300/10 to-transparent pointer-events-none z-10"
                aria-hidden="true"
              />

              {/* Lớp bóng đổ tương tác khi đang lật trang */}
              {isFlipping && (
                <div
                  className={`absolute inset-0 pointer-events-none z-30 transition-opacity duration-200 ${
                    flipDirection === 'next'
                      ? 'bg-gradient-to-r from-transparent via-stone-900/10 to-stone-900/25'
                      : 'bg-gradient-to-l from-transparent via-stone-900/10 to-stone-900/25'
                  }`}
                />
              )}

              {/* Vùng bấm lật nhanh bên trái & phải trang */}
              <div
                className="absolute top-0 bottom-0 left-0 w-12 sm:w-16 z-15 cursor-pointer"
                onClick={handlePrevPage}
                title="Bấm mép trái để về trang trước"
              />
              <div
                className="absolute top-0 bottom-0 right-0 w-12 sm:w-16 z-15 cursor-pointer"
                onClick={handleNextPage}
                title="Bấm mép phải để sang trang tiếp theo"
              />

              {/* Renderer trang hiện tại */}
              <FlipbookPageRenderer
                page={currentPage}
                story={story}
                fontSize={fontSize}
                position="single"
                totalPages={totalContentPages}
                onStartQuiz={onStartQuiz}
                onRestartBook={handleRestartBook}
                onOpenCover={handleNextPage}
                onOpenImageZoom={(url, alt, cap) =>
                  setZoomedImage({ imageUrl: url, altText: alt, caption: cap })
                }
                onSpeakText={(text) => {
                  speakVietnameseText(text, () => setIsPlayingAudio(false), () => setIsPlayingAudio(false));
                  setIsPlayingAudio(true);
                }}
              />
            </div>
          </div>
        </main>
      )}

      {/* =========================================================================
          3. THANH ĐIỀU HƯỚNG VÀ TIẾN TRÌNH DƯỚI CÙNG (BOTTOM NAVIGATION DOCK)
          ========================================================================= */}
      {!pdfLoading && !pdfError && (
        <footer className="max-w-4xl w-full mx-auto mt-2 bg-[#FFFDF9] border border-[#E2D8C3] p-3 rounded-2xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Nút lật trang trước */}
        <button
          onClick={handlePrevPage}
          disabled={currentPageIndex === 0}
          className="w-full sm:w-auto px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 disabled:opacity-40 disabled:hover:bg-stone-100 font-extrabold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Trang trước</span>
        </button>

        {/* Thanh đo tiến trình đọc và số trang */}
        <div className="flex-1 w-full max-w-sm px-2 text-center">
          <div className="flex items-center justify-between text-xs font-black text-stone-700 mb-1">
            <span className="flex items-center gap-1 text-emerald-800">
              <Bookmark className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
              <span>{pageDisplayString}</span>
            </span>
            <span className="text-emerald-700">{progressPercent}%</span>
          </div>

          {/* Thanh thước đo tiến trình lật trang */}
          <div className="relative w-full h-2.5 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Nút mở danh sách trang nhỏ (Thumbnails) */}
          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 hover:underline mt-1 inline-flex items-center gap-1 cursor-pointer"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Mục lục các trang ({totalPagesCount} trang)</span>
          </button>
        </div>

        {/* Nút lật tiếp theo hoặc nút làm bài nếu ở trang cuối */}
        {isAtLastPage ? (
          story.questions && story.questions.length > 0 ? (
            <button
              onClick={onStartQuiz}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer animate-pulse"
            >
              <CheckSquare className="w-4 h-4 text-amber-300" />
              <span>Làm bài đọc hiểu ({story.questions.length} câu) ⭐</span>
            </button>
          ) : (
            <button
              onClick={handleRestartBook}
              className="w-full sm:w-auto px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Đọc lại từ đầu</span>
            </button>
          )
        ) : (
          <button
            onClick={handleNextPage}
            className="w-full sm:w-auto px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Trang sau</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </footer>
      )}

      {/* =========================================================================
          4. NGĂN MỤC LỤC & DANH SÁCH ẢNH THU NHỎ (THUMBNAILS DRAWER)
          ========================================================================= */}
      {showThumbnails && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-6 animate-in fade-in"
          onClick={() => setShowThumbnails(false)}
        >
          <div
            className="bg-[#FFFDF9] rounded-3xl max-w-3xl w-full p-5 shadow-2xl border-2 border-emerald-300 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-black text-stone-900">
                  Mục lục trang sách: {story.title}
                </h3>
              </div>
              <button
                onClick={() => setShowThumbnails(false)}
                className="p-1 rounded-full hover:bg-stone-100 text-stone-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid các trang sách nhỏ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 overflow-y-auto flex-1 p-1">
              {allPages.map((p, idx) => (
                <div
                  key={p.id}
                  onClick={() => handleJumpToPage(idx)}
                  className={`p-2 rounded-2xl border-2 text-center cursor-pointer transition-all transform hover:scale-103 ${
                    currentPageIndex === idx
                      ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-300 shadow-sm'
                      : 'border-stone-200 bg-white hover:border-emerald-300'
                  }`}
                >
                  <div className="aspect-3/4 rounded-xl overflow-hidden bg-stone-100 mb-1.5 flex items-center justify-center border border-stone-200/60">
                    {p.illustration ? (
                      <img
                        src={p.illustration.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : p.type === 'cover' ? (
                      <span className="text-2xl">{story.coverEmoji}</span>
                    ) : (
                      <div className="p-1 text-[9px] text-stone-500 line-clamp-4 leading-tight">
                        {p.paragraphs[0] || 'Nội dung'}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-black text-stone-800 block">
                    {p.type === 'cover'
                      ? 'Bìa'
                      : p.type === 'end'
                      ? 'Kết'
                      : `Trang ${p.pageNumber}${totalContentPages ? `/${totalContentPages}` : ''}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          5. MODAL PHÓNG TO HÌNH ẢNH MINH HỌA (IMAGE LIGHTBOX MODAL)
          ========================================================================= */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs animate-in fade-in"
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="bg-[#FFFDF9] rounded-3xl max-w-4xl max-h-[92vh] w-auto overflow-hidden shadow-2xl border-2 border-emerald-300 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex-1 max-h-[82vh] bg-stone-900/95 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
              <img
                src={zoomedImage.imageUrl}
                alt={zoomedImage.altText}
                className="max-h-[80vh] max-w-full w-auto h-auto object-contain rounded-xl shadow-lg"
              />
              <button
                onClick={() => setZoomedImage(null)}
                className="absolute top-3 right-3 p-2.5 rounded-full bg-black/70 hover:bg-black text-white transition cursor-pointer shadow-md"
                title="Đóng xem phóng to"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {zoomedImage.caption && (
              <div className="p-3 sm:p-4 text-center font-bold text-xs sm:text-sm text-stone-800 bg-white border-t border-stone-200 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{zoomedImage.caption}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
