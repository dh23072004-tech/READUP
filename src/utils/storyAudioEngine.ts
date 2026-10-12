import { FlipbookPage } from './flipbookEngine';
import { PdfRenderedPage } from './pdfRenderer';
import { Story } from '../types';

export interface StoryAudioSegment {
  id: string;
  segmentIndex: number;
  flipbookPageIndex: number;
  pageNumber: number;
  text: string;
  cleanText: string;
  estimatedSeconds: number;
}

/**
 * Lọc sạch văn bản trước khi đưa vào bộ đọc SpeechSynthesis:
 * - Loại bỏ tên file (vd: tho_va_rua.pdf, tap_doc_lop1.pdf)
 * - Loại bỏ số trang thừa như "Trang 1/12", "- 2 -", "Page 1"
 * - Loại bỏ ký tự đặc biệt, tiêu đề lặp lại vô nghĩa
 */
export function cleanTextForSpeech(raw: string): string {
  if (!raw) return '';

  let text = raw
    // Xóa ký tự xuống dòng thừa, tab
    .replace(/[\r\n\t]+/g, ' ')
    // Xóa tên file có đuôi .pdf, .epub, .doc, .txt
    .replace(/\b[a-zA-Z0-9_\-\u00C0-\u024F\u1EA0-\u1EF9]+\.(pdf|epub|txt|docx?)\b/gi, '')
    // Xóa định dạng số trang dạng: "Trang 1", "Trang 1/12", "Trang 1 / 12", "Page 1"
    .replace(/\b(Trang|trang|Page|page)\s*\d+(\s*\/\s*\d+)?\b/gi, '')
    // Xóa số trang cô lập ở đầu hoặc cuối dòng: "- 1 -", "— 2 —", "[ 3 ]"
    .replace(/[-–—\[\(]\s*\d+\s*[-–—\]\)]/g, '')
    // Xóa dòng chỉ chứa toàn số
    .replace(/^\s*\d+\s*$/gm, '')
    // Xóa các ký hiệu trang trí dư thừa
    .replace(/[*#_=~]{2,}/g, '')
    // Chuẩn hóa khoảng trắng
    .replace(/\s{2,}/g, ' ')
    .trim();

  return text;
}

/**
 * Chia một đoạn văn bản dài thành các câu hoặc đoạn ngắn tự nhiên (15 - 35 từ),
 * phù hợp với lứa tuổi tiểu học và không bị lỗi ngắt quãng của Web Speech API.
 */
function splitIntoNaturalPhrases(text: string): string[] {
  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) return [];

  // Tách theo dấu kết thúc câu (. ! ? … hoặc dấu chấm lửng)
  const rawSentences = cleaned
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^[\d\W]+$/.test(s));

  const phrases: string[] = [];
  let buffer = '';

  for (const sentence of rawSentences) {
    const wordCount = (buffer + ' ' + sentence).trim().split(/\s+/).length;
    // Nếu gộp lại dưới 35 từ thì gộp để câu nghe liền mạch, nếu dài hơn thì tách
    if (buffer && wordCount > 35) {
      phrases.push(buffer.trim());
      buffer = sentence;
    } else {
      buffer = buffer ? `${buffer} ${sentence}` : sentence;
    }
  }

  if (buffer.trim()) {
    phrases.push(buffer.trim());
  }

  return phrases.filter((p) => p.length >= 3);
}

/**
 * Trích xuất toàn bộ các đoạn âm thanh từ sách:
 * - Ưu tiên nội dung văn bản trích xuất trực tiếp từ các trang PDF bằng PDF.js
 * - Nếu không có PDF hoặc PDF không có văn bản, sử dụng story.content
 * - Đồng bộ chính xác từng đoạn với vị trí trang sách lật tương ứng
 */
export function extractStoryAudioSegments(
  story: Story,
  pdfPages?: PdfRenderedPage[] | null,
  allFlipbookPages?: FlipbookPage[]
): StoryAudioSegment[] {
  const segments: StoryAudioSegment[] = [];
  let currentSegmentIndex = 0;

  // Bản đồ tìm flipbookPageIndex theo pageNumber
  const findFlipbookIndex = (pageNum: number): number => {
    if (!allFlipbookPages || allFlipbookPages.length === 0) return 0;
    const idx = allFlipbookPages.findIndex(
      (p) => p.pdfPageNumber === pageNum || p.pageNumber === pageNum
    );
    return idx >= 0 ? idx : 0;
  };

  // 1. Trường hợp có các trang PDF kết xuất
  if (pdfPages && pdfPages.length > 0) {
    // Kiểm tra xem PDF có lớp văn bản thực sự hay không
    const totalChars = pdfPages.reduce((acc, p) => acc + (p.text?.trim().length || 0), 0);

    if (totalChars > 25) {
      // Có lớp văn bản PDF trích xuất được
      pdfPages.forEach((p) => {
        if (!p.text || !p.text.trim()) return;

        const phrases = splitIntoNaturalPhrases(p.text);
        const flipbookIdx = findFlipbookIndex(p.pageNumber);

        phrases.forEach((phrase) => {
          const words = phrase.split(/\s+/).length;
          // Ước tính khoảng 2.1 từ/giây ở tốc độ đọc trẻ em 0.9x
          const estimatedSec = Math.max(2, Math.round(words / 2.1));

          segments.push({
            id: `seg-pdf-${p.pageNumber}-${currentSegmentIndex}`,
            segmentIndex: currentSegmentIndex++,
            flipbookPageIndex: flipbookIdx,
            pageNumber: p.pageNumber,
            text: phrase,
            cleanText: phrase,
            estimatedSeconds: estimatedSec,
          });
        });
      });
    }
  }

  // 2. Nếu chưa có đoạn nào từ PDF (hoặc PDF dạng scan không có text), thử lấy từ story.content
  if (segments.length === 0 && story.content && story.content.length > 0) {
    story.content.forEach((paragraph, pIdx) => {
      // Bỏ qua các placeholder dạng "[Nội dung Trang 1]"
      if (/^\[Nội dung Trang \d+\]$/i.test(paragraph.trim())) return;

      const phrases = splitIntoNaturalPhrases(paragraph);
      // Ước lượng trang sách tương ứng cho sách văn bản
      let flipbookIdx = 0;
      if (allFlipbookPages && allFlipbookPages.length > 0) {
        const found = allFlipbookPages.findIndex((page) =>
          page.paragraphs?.some((p) => p.includes(paragraph.slice(0, 30)))
        );
        flipbookIdx = found >= 0 ? found : Math.min(pIdx + 1, allFlipbookPages.length - 1);
      }

      phrases.forEach((phrase) => {
        const words = phrase.split(/\s+/).length;
        const estimatedSec = Math.max(2, Math.round(words / 2.1));

        segments.push({
          id: `seg-story-${currentSegmentIndex}`,
          segmentIndex: currentSegmentIndex++,
          flipbookPageIndex: flipbookIdx,
          pageNumber: flipbookIdx + 1,
          text: phrase,
          cleanText: phrase,
          estimatedSeconds: estimatedSec,
        });
      });
    });
  }

  // Nếu có bài học rút ra, thêm một đoạn kết nhẹ nhàng
  if (segments.length > 0 && story.moralLesson && story.moralLesson.trim()) {
    const endFlipbookIdx = allFlipbookPages ? Math.max(0, allFlipbookPages.length - 1) : 0;
    const moralClean = cleanTextForSpeech(story.moralLesson);
    if (moralClean) {
      segments.push({
        id: `seg-moral-${currentSegmentIndex}`,
        segmentIndex: currentSegmentIndex,
        flipbookPageIndex: endFlipbookIdx,
        pageNumber: allFlipbookPages?.length || segments.length + 1,
        text: `Bài học ý nghĩa: ${moralClean}`,
        cleanText: `Bài học ý nghĩa: ${moralClean}`,
        estimatedSeconds: Math.max(3, Math.round(moralClean.split(/\s+/).length / 2.1)),
      });
    }
  }

  return segments;
}

/**
 * Tìm giọng đọc tiếng Việt tối ưu nhất của trình duyệt:
 * Ưu tiên:
 * 1. Giọng Google Tiếng Việt hoặc Microsoft Tiếng Việt (chuẩn, biểu cảm tự nhiên)
 * 2. Giọng có mã ngôn ngữ vi-VN hoặc vi
 */
export function getBestVietnameseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // 1. Tìm giọng Việt Nam chất lượng cao
  const naturalViVoice = voices.find(
    (v) =>
      (v.lang.toLowerCase().includes('vi') || v.name.toLowerCase().includes('vietnam')) &&
      (v.name.toLowerCase().includes('natural') ||
        v.name.toLowerCase().includes('online') ||
        v.name.toLowerCase().includes('google') ||
        v.name.toLowerCase().includes('hoaimy') ||
        v.name.toLowerCase().includes('an'))
  );

  if (naturalViVoice) return naturalViVoice;

  // 2. Tìm bất kỳ giọng vi-VN nào
  const viVnVoice = voices.find(
    (v) => v.lang.toLowerCase() === 'vi-vn' || v.lang.toLowerCase() === 'vi_vn'
  );
  if (viVnVoice) return viVnVoice;

  // 3. Tìm bất kỳ giọng vi nào
  const generalViVoice = voices.find(
    (v) => v.lang.toLowerCase().startsWith('vi') || v.name.toLowerCase().includes('viet')
  );

  return generalViVoice || null;
}

/**
 * Định dạng thời lượng (giây) thành chuỗi mm:ss
 */
export function formatAudioDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
