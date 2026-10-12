import * as pdfjsLib from 'pdfjs-dist';
// Vite URL import for worker
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Configure the worker for pdfjs
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    pdfjsWorker ||
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export interface PdfRenderedPage {
  pageNumber: number; // 1-indexed (1, 2, 3...)
  imageUrl: string;
  text: string;
  width: number;
  height: number;
  aspectRatio: number;
}

/**
 * Chuyển đổi dữ liệu base64 (Data URI hoặc chuỗi base64 thuần) thành Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  try {
    const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
    // Đảm bảo padding hợp lệ cho base64
    const padded = cleanBase64.padEnd(
      cleanBase64.length + ((4 - (cleanBase64.length % 4)) % 4),
      '='
    );
    const binaryString = atob(padded.replace(/[\r\n\s]/g, ''));
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (err: any) {
    console.error('Lỗi giải mã base64:', err);
    throw new Error('Dữ liệu tệp PDF bị lỗi định dạng mã hóa Base64: ' + err.message);
  }
}

/**
 * Phân tích và render toàn bộ các trang PDF thành danh sách hình ảnh độ nét cao và văn bản
 */
export async function renderPdfToPages(
  source: string | ArrayBuffer | Uint8Array,
  onProgress?: (current: number, total: number) => void,
  targetScale: number = 2.4
): Promise<PdfRenderedPage[]> {
  try {
    let loadingTask;

    const commonOptions = {
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
    };

    if (typeof source === 'string') {
      if (source.startsWith('data:') || source.includes('base64')) {
        const bytes = base64ToUint8Array(source);
        loadingTask = pdfjsLib.getDocument({
          data: bytes,
          ...commonOptions,
        });
      } else {
        // Đường dẫn URL
        loadingTask = pdfjsLib.getDocument({
          url: source,
          ...commonOptions,
        });
      }
    } else if (source instanceof Uint8Array) {
      loadingTask = pdfjsLib.getDocument({
        data: source,
        ...commonOptions,
      });
    } else {
      // ArrayBuffer
      loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(source),
        ...commonOptions,
      });
    }

    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;

    if (numPages === 0) {
      throw new Error('Tệp PDF không chứa trang nào.');
    }

    const renderedPages: PdfRenderedPage[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      onProgress?.(pageNum, numPages);

      const page = await pdfDoc.getPage(pageNum);

      // Tính toán tỉ lệ độ nét cao (High-DPI) dựa theo kích thước gốc của từng trang PDF
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const pageAspectRatio = unscaledViewport.width / unscaledViewport.height;

      // Đảm bảo chiều rộng tối thiểu 1800px hoặc chiều cao 2400px để khi hiển thị chữ luôn sắc nét tối đa
      const calculatedScale = Math.max(
        2.4,
        Math.min(3.5, Math.max(1800 / unscaledViewport.width, 2400 / unscaledViewport.height))
      );
      const effectiveScale = targetScale ? Math.max(targetScale, calculatedScale) : calculatedScale;
      const viewport = page.getViewport({ scale: effectiveScale });

      // Tạo canvas để render
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        throw new Error('Không thể khởi tạo Canvas 2D để hiển thị trang PDF.');
      }

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      // Bật chế độ làm mịn chất lượng cao chống nhòe răng cưa chữ
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Render nội dung trang PDF lên canvas
      const renderContext = {
        canvasContext: ctx,
        canvas,
        viewport,
      };

      await page.render(renderContext).promise;

      // Trích xuất văn bản từ trang để hỗ trợ giọng đọc TTS và tìm kiếm
      let pageText = '';
      try {
        const textContent = await page.getTextContent();
        const textItems = textContent.items as Array<{ str?: string }>;
        pageText = textItems
          .map((item) => item.str || '')
          .filter((s) => s.trim().length > 0)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      } catch (textErr) {
        console.warn(`Không thể trích xuất văn bản trang ${pageNum}:`, textErr);
      }

      // Xuất ảnh chất lượng cao sắc nét (JPEG 0.96)
      const imageUrl = canvas.toDataURL('image/jpeg', 0.96);

      renderedPages.push({
        pageNumber: pageNum,
        imageUrl,
        text: pageText,
        width: Math.floor(viewport.width),
        height: Math.floor(viewport.height),
        aspectRatio: pageAspectRatio,
      });
    }

    return renderedPages;
  } catch (error: any) {
    console.error('Lỗi phân tích cú pháp tệp PDF:', error);
    throw new Error(
      error?.message || 'Không thể đọc tệp PDF. Tệp có thể bị hỏng hoặc có định dạng không hợp lệ.'
    );
  }
}
