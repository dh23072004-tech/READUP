import { Story, StoryIllustration, VocabularyNote } from '../types';
import { PdfRenderedPage } from './pdfRenderer';

export interface FlipbookPage {
  id: string;
  pageNumber: number; // 0: Cover, 1..N: Content, N+1: End
  type: 'cover' | 'story' | 'end' | 'pdf-page';
  title?: string;
  subtitle?: string;
  paragraphs: string[];
  pdfImageUrl?: string;
  pdfPageNumber?: number;
  width?: number;
  height?: number;
  aspectRatio?: number;
  illustration?: {
    imageUrl: string;
    altText: string;
    caption?: string;
  };
  layout:
    | 'cover'
    | 'illustration-top'
    | 'illustration-left'
    | 'illustration-right'
    | 'text-only'
    | 'end-celebration'
    | 'pdf-page';
  highlightVocab?: VocabularyNote[];
  moralLesson?: string;
}

/**
 * Phân chia nội dung bài đọc thành danh sách các trang sách tranh điện tử (Flipbook pages)
 * Hỗ trợ cả sách tranh tạo từ văn bản và sách số render từ từng trang tệp PDF nguyên gốc
 */
export function buildFlipbookPages(
  story: Story,
  pdfPages?: PdfRenderedPage[] | null
): FlipbookPage[] {
  // ==================== TRƯỜNG HỢP SÁCH PDF THẬT ====================
  if (pdfPages && pdfPages.length > 0) {
    const pages: FlipbookPage[] = [];

    const defaultRatio =
      pdfPages[0]?.aspectRatio ||
      (pdfPages[0]?.width && pdfPages[0]?.height ? pdfPages[0].width / pdfPages[0].height : 0.707);

    // Mỗi trang PDF nguyên bản ứng với đúng một trang sách lật (1:1), giữ nguyên vẹn 100% tài liệu gốc
    pdfPages.forEach((p) => {
      const pageRatio =
        p.aspectRatio || (p.width && p.height ? p.width / p.height : defaultRatio);
      pages.push({
        id: `${story.id}-pdf-page-${p.pageNumber}`,
        pageNumber: p.pageNumber,
        type: 'pdf-page',
        title: `${story.title} • Trang ${p.pageNumber}`,
        paragraphs: p.text ? [p.text] : [],
        pdfImageUrl: p.imageUrl,
        pdfPageNumber: p.pageNumber,
        width: p.width,
        height: p.height,
        aspectRatio: pageRatio,
        illustration: {
          imageUrl: p.imageUrl,
          altText: `Trang ${p.pageNumber} của ${story.title}`,
          caption: `Trang ${p.pageNumber}`,
        },
        layout: 'pdf-page',
      });
    });

    // Trang kết thúc: Chúc mừng, bài học ý nghĩa và nút làm bài đọc hiểu
    pages.push({
      id: `${story.id}-page-${pdfPages.length + 1}-end`,
      pageNumber: pdfPages.length + 1,
      type: 'end',
      title: 'Hành trình hoàn thành!',
      subtitle: 'Em đã đọc trọn vẹn cuốn sách tuyệt vời này.',
      paragraphs: [],
      moralLesson: story.moralLesson,
      layout: 'end-celebration',
      aspectRatio: defaultRatio,
    });

    return pages;
  }

  // ==================== TRƯỜNG HỢP SÁCH VĂN BẢN THƯỜNG ====================
  const pages: FlipbookPage[] = [];

  // ==================== TRANG BÌA (Trang 0) ====================
  pages.push({
    id: `${story.id}-page-0-cover`,
    pageNumber: 0,
    type: 'cover',
    title: story.title,
    subtitle: story.summary,
    paragraphs: [],
    illustration: story.coverImage
      ? {
          imageUrl: story.coverImage,
          altText: story.coverImageAlt || `Bìa sách ${story.title}`,
          caption: `Tranh bìa chính: ${story.title}`,
        }
      : undefined,
    layout: 'cover',
  });

  const content = story.content && story.content.length > 0 ? story.content : ['Nội dung câu chuyện đang cập nhật.'];
  const illustrations: StoryIllustration[] = story.illustrations || [];
  const vocabulary: VocabularyNote[] = story.vocabulary || [];

  // Phân chia các đoạn văn vào các trang
  // Mỗi trang ruột nhận 1 hoặc tối đa 2 đoạn văn để đảm bảo thoáng đãng, cỡ chữ to cho học sinh tiểu học
  let pIdx = 0;
  let pageSeq = 1;

  while (pIdx < content.length) {
    // Tìm tranh minh họa gắn với đoạn văn này hoặc đoạn kế tiếp
    const matchingIllus = illustrations.find(
      (illus) => illus.afterParagraphIndex === pIdx || illus.afterParagraphIndex === pIdx + 1
    );

    // Nếu câu chuyện có nhiều đoạn (ví dụ 4-6 đoạn)
    const isSingleParaPage = content.length <= 4 || (matchingIllus && pIdx % 2 === 0);
    const takeCount = isSingleParaPage ? 1 : Math.min(2, content.length - pIdx);
    const pageParagraphs = content.slice(pIdx, pIdx + takeCount);

    // Xác định layout phong phú như sách xuất bản:
    // - Trang chẵn / lẻ thay đổi vị trí tranh
    let layout: FlipbookPage['layout'] = 'text-only';
    let chosenIllus = matchingIllus;

    // Nếu chưa có tranh mà có ảnh bìa hoặc minh họa dự phòng, có thể dùng tranh phù hợp
    if (chosenIllus) {
      layout = pageSeq % 2 === 1 ? 'illustration-top' : 'illustration-right';
    } else if (pageSeq === 1 && story.coverImage) {
      // Trang 1 có thể hiển thị tranh nhỏ đầu truyện nếu muốn
      chosenIllus = {
        id: `${story.id}-illus-opening`,
        afterParagraphIndex: 0,
        imageUrl: story.coverImage,
        altText: `Cảnh mở đầu câu chuyện ${story.title}`,
        caption: `Cảnh mở đầu câu chuyện`,
      };
      layout = 'illustration-top';
    }

    // Từ vựng xuất hiện trong trang này
    const pageVocab = vocabulary.filter((v) =>
      pageParagraphs.some((p) => p.toLowerCase().includes(v.word.toLowerCase()))
    );

    pages.push({
      id: `${story.id}-page-${pageSeq}`,
      pageNumber: pageSeq,
      type: 'story',
      title: pageSeq === 1 ? story.title : undefined,
      paragraphs: pageParagraphs,
      illustration: chosenIllus
        ? {
            imageUrl: chosenIllus.imageUrl,
            altText: chosenIllus.altText,
            caption: chosenIllus.caption,
          }
        : undefined,
      layout: chosenIllus ? layout : 'text-only',
      highlightVocab: pageVocab.length > 0 ? pageVocab : undefined,
    });

    pIdx += takeCount;
    pageSeq++;
  }

  // ==================== TRANG KẾT THÚC (Trang End) ====================
  pages.push({
    id: `${story.id}-page-${pageSeq}-end`,
    pageNumber: pageSeq,
    type: 'end',
    title: 'Hành trình hoàn thành!',
    subtitle: 'Em đã đọc trọn vẹn cuốn sách tranh tuyệt vời này.',
    paragraphs: [],
    moralLesson: story.moralLesson,
    highlightVocab: vocabulary,
    layout: 'end-celebration',
  });

  return pages;
}

/**
 * Gom các trang thành các lượt mở hai trang (Spread: Left page & Right page)
 * Dành cho giao diện màn hình lớn máy tính / máy tính bảng nằm ngang
 */
export interface FlipbookSpread {
  spreadIndex: number;
  leftPage: FlipbookPage | null; // null nếu là bìa hoặc trang đơn
  rightPage: FlipbookPage;
}

export function buildFlipbookSpreads(pages: FlipbookPage[]): FlipbookSpread[] {
  const spreads: FlipbookSpread[] = [];

  if (pages.length === 0) return spreads;

  // Spread 0: Bìa sách hiển thị đơn lẻ (trang bên phải, bên trái là bìa gập hoặc trống)
  spreads.push({
    spreadIndex: 0,
    leftPage: null,
    rightPage: pages[0], // Bìa sách
  });

  // Các trang ruột và trang kết
  let idx = 1;
  let spreadIndex = 1;

  while (idx < pages.length) {
    const left = pages[idx];
    const right = idx + 1 < pages.length ? pages[idx + 1] : null;

    if (right) {
      spreads.push({
        spreadIndex,
        leftPage: left,
        rightPage: right,
      });
      idx += 2;
    } else {
      // Còn trang lẻ cuối cùng
      spreads.push({
        spreadIndex,
        leftPage: left,
        rightPage: {
          id: 'filler-page',
          pageNumber: left.pageNumber + 1,
          type: 'end',
          title: 'Ghi chú đọc sách',
          paragraphs: ['Chúc em luôn giữ vững niềm say mê đọc sách mỗi ngày!'],
          layout: 'end-celebration',
        },
      });
      idx += 1;
    }
    spreadIndex++;
  }

  return spreads;
}
