import React, { useState } from 'react';
import {
  Sparkles,
  Award,
  BookOpen,
  Clock,
  RotateCcw,
  CheckCircle2,
  Maximize2,
  Lightbulb,
  X,
  Volume2,
  HelpCircle,
  Bookmark,
} from 'lucide-react';
import { Story, VocabularyNote } from '../types';
import { FlipbookPage } from '../utils/flipbookEngine';

interface FlipbookPageRendererProps {
  page: FlipbookPage;
  story: Story;
  fontSize: 'normal' | 'large' | 'xlarge';
  position: 'left' | 'right' | 'single';
  totalPages?: number;
  onStartQuiz: () => void;
  onRestartBook: () => void;
  onOpenCover: () => void;
  onOpenImageZoom?: (imageUrl: string, altText: string, caption?: string) => void;
  onSpeakText?: (text: string) => void;
}

export const FlipbookPageRenderer: React.FC<FlipbookPageRendererProps> = ({
  page,
  story,
  fontSize,
  position,
  totalPages,
  onStartQuiz,
  onRestartBook,
  onOpenCover,
  onOpenImageZoom,
  onSpeakText,
}) => {
  const [selectedVocab, setSelectedVocab] = useState<VocabularyNote | null>(null);

  // Cỡ chữ tùy chỉnh cho học sinh tiểu học
  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'normal':
        return 'text-sm sm:text-base leading-relaxed sm:leading-loose';
      case 'large':
        return 'text-base sm:text-lg leading-loose font-medium';
      case 'xlarge':
        return 'text-lg sm:text-xl leading-loose font-semibold';
    }
  };

  // Helper render đoạn văn có gắn từ vựng tương tác
  const renderInteractiveText = (text: string) => {
    const vocabList = story.vocabulary || [];
    if (vocabList.length === 0) {
      return text;
    }

    // Tạo regex tìm các từ vựng
    const words = vocabList.map((v) => v.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern = new RegExp(`(${words.join('|')})`, 'gi');
    const parts = text.split(pattern);

    return parts.map((part, idx) => {
      const match = vocabList.find((v) => v.word.toLowerCase() === part.toLowerCase());
      if (match) {
        return (
          <span
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedVocab(match);
            }}
            className="cursor-pointer bg-amber-100/80 text-amber-950 font-bold px-1.5 py-0.5 rounded-md border-b-2 border-emerald-500 hover:bg-amber-200 transition-colors inline-flex items-center gap-0.5 mx-0.5 group"
            title={`Bấm để xem nghĩa từ: ${match.word}`}
          >
            <span>{part}</span>
            <Lightbulb className="w-3 h-3 text-emerald-600 inline group-hover:scale-125 transition-transform" />
          </span>
        );
      }
      return part;
    });
  };

  // =========================================================================
  // 1. TRANG BÌA (COVER PAGE)
  // =========================================================================
  if (page.type === 'cover') {
    return (
      <div className="relative h-full w-full flex flex-col justify-between p-5 sm:p-8 bg-gradient-to-br from-[#FEFDF9] via-[#FAF6ED] to-[#F2ECE1] text-stone-900 overflow-hidden select-none">
        {/* Dải trang trí gáy sách sang trọng */}
        <div className="absolute top-0 bottom-0 left-0 w-3 bg-gradient-to-r from-amber-800/40 via-amber-700/20 to-transparent" />

        {/* Họa tiết góc sách cổ điển */}
        <div className="absolute top-3 left-4 w-6 h-6 border-t-2 border-l-2 border-amber-600/40 rounded-tl-lg pointer-events-none" />
        <div className="absolute top-3 right-4 w-6 h-6 border-t-2 border-r-2 border-amber-600/40 rounded-tr-lg pointer-events-none" />
        <div className="absolute bottom-3 left-4 w-6 h-6 border-b-2 border-l-2 border-amber-600/40 rounded-bl-lg pointer-events-none" />
        <div className="absolute bottom-3 right-4 w-6 h-6 border-b-2 border-r-2 border-amber-600/40 rounded-br-lg pointer-events-none" />

        {/* Header bìa */}
        <div className="text-center pt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-800 text-amber-100 text-[10px] sm:text-xs font-black tracking-wider uppercase shadow-xs mb-2 border border-amber-300/40">
            <Bookmark className="w-3 h-3 text-amber-300 fill-amber-300" />
            <span>Sách tranh đọc hiểu • Lớp {story.grade}</span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-stone-900 font-['Quicksand',sans-serif] tracking-tight leading-snug px-2">
            {story.title}
          </h1>

          {story.author && (
            <p className="text-xs sm:text-sm font-bold text-emerald-850 mt-1">
              Tác giả / Biên soạn: <span className="underline decoration-emerald-300">{story.author}</span>
            </p>
          )}

          <div className="flex items-center justify-center gap-2 mt-2 text-xs font-semibold text-stone-600">
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
              {story.category}
            </span>
            <span className="flex items-center gap-1 text-stone-500">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              ~{story.estimatedReadMinutes} phút
            </span>
          </div>
        </div>

        {/* Tranh minh họa bìa chính 2D */}
        <div className="my-2 flex-1 flex flex-col justify-center items-center overflow-hidden">
          {page.illustration ? (
            <div
              className="relative max-w-[90%] max-h-[50vh] rounded-2xl overflow-hidden shadow-xl border-4 border-white ring-1 ring-stone-200 bg-stone-100 group cursor-pointer flex items-center justify-center transition-transform hover:scale-[1.01]"
              onClick={() =>
                onOpenImageZoom?.(
                  page.illustration!.imageUrl,
                  page.illustration!.altText,
                  page.illustration!.caption
                )
              }
              title="Bấm để xem ảnh bìa phóng to"
            >
              <img
                src={page.illustration.imageUrl}
                alt={page.illustration.altText}
                className="max-h-[48vh] max-w-full w-auto h-auto object-contain transition-transform duration-500 group-hover:scale-102"
              />
              <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-xs text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize2 className="w-4 h-4" />
              </div>
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center text-4xl shadow-inner border border-emerald-200">
              {story.coverEmoji}
            </div>
          )}

          {page.subtitle && (
            <p className="text-stone-600 text-xs sm:text-sm font-medium italic text-center max-w-sm mt-2 px-3 line-clamp-2">
              "{page.subtitle}"
            </p>
          )}
        </div>

        {/* Nút Mở sách bắt đầu đọc */}
        <div className="text-center pb-2">
          <button
            onClick={onOpenCover}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2.5 mx-auto cursor-pointer"
          >
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-amber-200" />
            <span>Mở sách & Bắt đầu đọc 📖</span>
          </button>
          <p className="text-[11px] text-stone-500 font-semibold mt-2">
            Tủ sách số ReadUp • Bản quyền tiểu học Việt Nam
          </p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. TRANG KẾT THÚC (END CELEBRATION PAGE)
  // =========================================================================
  if (page.type === 'end') {
    return (
      <div className="relative h-full w-full flex flex-col justify-between p-5 sm:p-7 bg-gradient-to-b from-[#FFFDF9] via-[#FAF7EE] to-[#F5EFE0] text-stone-900 overflow-y-auto">
        {/* Header trang chúc mừng */}
        <div className="text-center pt-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 shadow-sm text-amber-600 mb-2">
            <Award className="w-6 h-6 text-amber-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-emerald-900 font-['Quicksand',sans-serif]">
            Hoan hô! Em đã đọc xong cuốn sách
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-stone-600 mt-0.5">
            Em vừa hoàn thành trọn vẹn bài đọc: <strong className="text-stone-800">{story.title}</strong>
          </p>
        </div>

        {/* Khung bài học ý nghĩa */}
        {story.moralLesson && (
          <div className="my-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200/90 rounded-2xl shadow-xs">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                Bài học ý nghĩa từ câu chuyện:
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-amber-950 leading-relaxed italic pl-6">
              "{story.moralLesson}"
            </p>
          </div>
        )}

        {/* Ô ôn tập từ vựng đã học */}
        {story.vocabulary && story.vocabulary.length > 0 && (
          <div className="my-2 p-3 bg-white/90 border border-emerald-200/80 rounded-2xl shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-emerald-800 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-emerald-600" />
                <span>Từ mới em đã tích lũy ({story.vocabulary.length} từ):</span>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
              {story.vocabulary.map((vocab, vIdx) => (
                <div
                  key={vIdx}
                  className="p-2 bg-[#FAF8F2] rounded-xl border border-stone-200/70 text-xs"
                >
                  <strong className="text-emerald-900 block font-black">✦ {vocab.word}:</strong>
                  <span className="text-stone-700 leading-tight block text-[11px] mt-0.5">
                    {vocab.meaning}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Các nút hành động chính: Đọc lại & Bắt đầu làm bài (nếu có câu hỏi) */}
        <div className="pt-2 border-t border-stone-200 space-y-2.5">
          {story.questions && story.questions.length > 0 ? (
            <button
              onClick={onStartQuiz}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm sm:text-base uppercase tracking-wider rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer animate-pulse ring-2 ring-emerald-300"
            >
              <Sparkles className="w-5 h-5 text-amber-300 fill-amber-300" />
              <span>Bắt đầu thử thách đọc hiểu ({story.questions.length} câu hỏi) ⭐</span>
            </button>
          ) : (
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl text-center text-xs text-stone-600 font-semibold">
              Bài đọc này dành cho việc đọc hiểu mở rộng (chưa gắn câu hỏi trắc nghiệm).
            </div>
          )}

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onRestartBook}
              className="text-stone-600 hover:text-emerald-800 font-bold text-xs py-1.5 px-3 rounded-xl hover:bg-stone-100 transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Lật lại đọc từ đầu</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. TRANG SÁCH PDF NGUYÊN BẢN (PDF HIGH-RESOLUTION PAGE)
  // =========================================================================
  if (page.type === 'pdf-page' || page.pdfImageUrl) {
    const pdfSrc = page.pdfImageUrl || page.illustration?.imageUrl;
    const hasText = page.paragraphs && page.paragraphs.length > 0 && page.paragraphs[0].trim().length > 0;
    const pageText = page.paragraphs.join(' ');

    return (
      <div className="relative h-full w-full bg-[#FFFDF9] text-stone-900 overflow-hidden select-none group flex items-center justify-center">
        {/* Nội dung trang PDF nguyên bản: Chiếm trọn 100% diện tích trang theo đúng tỉ lệ gốc */}
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-[#FFFDF9]">
          {pdfSrc ? (
            <div
              className="relative w-full h-full flex items-center justify-center cursor-pointer group"
              onClick={() =>
                onOpenImageZoom?.(
                  pdfSrc,
                  `Trang ${page.pageNumber} của ${story.title}`,
                  `Trang ${page.pageNumber} • ${story.title}`
                )
              }
              title="Bấm để phóng to trang sách"
            >
              <img
                src={pdfSrc}
                alt={`Nội dung trang ${page.pageNumber} cuốn ${story.title}`}
                className="w-full h-full object-contain select-none transition-transform duration-200 group-hover:scale-[1.004]"
                style={{
                  width: '100%',
                  height: '100%',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  imageRendering: '-webkit-optimize-contrast',
                }}
              />
            </div>
          ) : (
            <div className="p-8 text-center text-stone-400">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Đang chuẩn bị hiển thị nội dung trang...</p>
            </div>
          )}
        </div>

        {/* Floating overlays: Thanh công cụ nổi tinh tế ở góc trên ngoài trang */}
        <div
          className={`absolute top-2.5 ${
            position === 'left' ? 'left-3' : 'right-3'
          } flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity z-20 pointer-events-auto`}
        >
          {hasText && onSpeakText && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSpeakText(pageText);
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-white/95 hover:bg-white text-emerald-900 rounded-xl shadow-md border border-emerald-200/90 text-[11px] font-black transition cursor-pointer backdrop-blur-xs hover:scale-105 active:scale-95"
              title="Nghe đọc trang này"
            >
              <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Nghe đọc</span>
            </button>
          )}
          {pdfSrc && onOpenImageZoom && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenImageZoom(
                  pdfSrc,
                  `Trang ${page.pageNumber} của ${story.title}`,
                  `Trang ${page.pageNumber} • ${story.title}`
                );
              }}
              className="flex items-center gap-1 px-2 py-1 bg-white/95 hover:bg-white text-stone-850 rounded-xl shadow-md border border-stone-200/90 text-[11px] font-black transition cursor-pointer backdrop-blur-xs hover:scale-105 active:scale-95"
              title="Phóng to trang sách xem chi tiết"
            >
              <Maximize2 className="w-3.5 h-3.5 text-stone-700" />
              <span className="hidden sm:inline">Phóng to</span>
            </button>
          )}
        </div>

        {/* Huy hiệu số trang nổi thanh nhã ở góc chân trang */}
        <div
          className={`absolute bottom-2.5 ${
            position === 'left' ? 'left-3' : 'right-3'
          } z-10 pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity`}
        >
          <span className="px-2.5 py-0.5 rounded-lg bg-stone-900/70 backdrop-blur-xs text-white text-[10px] font-black tracking-wide shadow-sm">
            {totalPages ? `Trang ${page.pageNumber}/${totalPages}` : `Trang ${page.pageNumber}`}
          </span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 4. TRANG NỘI DUNG RUỘT (STORY INNER PAGE CHO VĂN BẢN)
  // =========================================================================
  const hasIllustration = !!page.illustration;

  return (
    <div className="relative h-full w-full flex flex-col justify-between p-5 sm:p-7 bg-[#FFFDF9] text-stone-900 overflow-hidden select-text">
      {/* Running header trên cùng của trang sách */}
      <div className="flex items-center justify-between text-[11px] font-bold text-stone-600 pb-2 border-b border-stone-200/60 select-none">
        <span className="truncate max-w-[200px] flex items-center gap-1 text-emerald-800">
          <BookOpen className="w-3 h-3 text-emerald-600" />
          <span>{story.title}</span>
        </span>
        <div className="flex items-center gap-2">
          {onSpeakText && (
            <button
              onClick={() => onSpeakText(page.paragraphs.join('. '))}
              className="p-1 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-md transition"
              title="Nghe đọc trang này"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-stone-600">Lớp {story.grade}</span>
        </div>
      </div>

      {/* Thân trang sách: Bố trí kết hợp Tranh minh họa 2D và Chữ viết */}
      <div className="my-auto py-2 flex-1 flex flex-col justify-center overflow-y-auto">
        {/* Tiêu đề truyện nếu là trang 1 */}
        {page.title && (
          <h2 className="text-lg sm:text-xl font-black text-stone-900 font-['Quicksand',sans-serif] mb-2 pb-1 border-b-2 border-emerald-100 text-center">
            {page.title}
          </h2>
        )}

        {/* Bố trí Tranh minh họa nếu trang này có tranh */}
        {hasIllustration && (
          <figure className="mb-3 rounded-2xl overflow-hidden border border-emerald-200/80 shadow-xs bg-[#FAF7F0] group">
            <div
              className="relative aspect-16/9 sm:aspect-16/10 w-full overflow-hidden bg-stone-100 cursor-pointer"
              onClick={() =>
                onOpenImageZoom?.(
                  page.illustration!.imageUrl,
                  page.illustration!.altText,
                  page.illustration!.caption
                )
              }
              title="Bấm để xem tranh kích thước lớn"
            >
              <img
                src={page.illustration!.imageUrl}
                alt={page.illustration!.altText}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                loading="lazy"
              />
              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-xs p-1 rounded-lg text-stone-700 shadow-2xs opacity-75 group-hover:opacity-100 transition">
                <Maximize2 className="w-3.5 h-3.5" />
              </div>
            </div>

            {page.illustration!.caption && (
              <figcaption className="p-2 sm:p-2.5 text-center text-xs font-bold text-stone-700 border-t border-stone-200/60 bg-[#FFFDF9] flex items-center justify-center gap-1.5">
                <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{page.illustration!.caption}</span>
              </figcaption>
            )}
          </figure>
        )}

        {/* Các đoạn văn trong trang với hiệu ứng lùi đầu dòng và từ vựng tương tác */}
        <div className={`space-y-3.5 text-stone-800 text-justify ${getFontSizeClass()}`}>
          {page.paragraphs
            .filter((p) => !(hasIllustration && (p.startsWith('[Trang minh họa') || p.startsWith('[Trang tranh'))))
            .map((p, idx) => (
              <p key={idx} className="indent-6 sm:indent-8">
                {renderInteractiveText(p)}
              </p>
            ))}
        </div>
      </div>

      {/* Chân trang sách: Số trang */}
      <div
        className={`pt-2 border-t border-stone-200/60 text-xs font-extrabold text-stone-600 flex items-center select-none ${
          position === 'left' ? 'justify-start' : position === 'right' ? 'justify-end' : 'justify-between'
        }`}
      >
        {position === 'single' && (
          <span className="text-[11px] text-stone-600">
            {totalPages ? `Trang ${page.pageNumber}/${totalPages}` : `Trang ${page.pageNumber}`}
          </span>
        )}
        <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[11px]">
          {totalPages ? `Trang ${page.pageNumber}/${totalPages}` : `Trang ${page.pageNumber}`}
        </span>
      </div>

      {/* Popover giải nghĩa từ vựng tức thì khi học sinh bấm vào từ mới */}
      {selectedVocab && (
        <div
          className="absolute inset-x-4 bottom-14 z-30 p-3.5 bg-white rounded-2xl shadow-xl border-2 border-emerald-400 animate-in fade-in slide-in-from-bottom-2 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-emerald-100 text-emerald-800">
                <Lightbulb className="w-4 h-4" />
              </span>
              <div>
                <span className="text-xs font-black text-emerald-900 uppercase">
                  Giải nghĩa từ:
                </span>
                <h4 className="text-sm font-black text-stone-900">
                  {selectedVocab.word}
                </h4>
              </div>
            </div>
            <button
              onClick={() => setSelectedVocab(null)}
              className="p-1 rounded-full hover:bg-stone-100 text-stone-500 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-2 text-xs font-semibold text-stone-700 bg-[#FAF8F2] p-2.5 rounded-xl border border-stone-200 leading-relaxed">
            {selectedVocab.meaning}
          </p>
          <div className="mt-2 text-right">
            <button
              onClick={() => setSelectedVocab(null)}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 px-2 py-0.5 rounded-md hover:bg-emerald-50 transition cursor-pointer"
            >
              Đã hiểu ✓
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
