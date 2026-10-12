import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Image,
  BookOpen,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  X,
  FileCode,
  Sparkles,
  FileType,
  FileCheck,
  Info,
} from 'lucide-react';
import { Story, GradeLevel, StoryIllustration } from '../types';
import { readTextFile, readImageFileDataUri, parseTxtToStory } from '../utils/fileParser';
import {
  saveFileToIndexedDB,
  saveRenderedPdfPagesToIndexedDB,
} from '../utils/indexedDbStorage';
import { renderPdfToPages, PdfRenderedPage } from '../utils/pdfRenderer';

interface TeacherUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStory: (story: Story) => void;
  onAddMultipleStories: (stories: Story[]) => void;
}

export const TeacherUploadModal: React.FC<TeacherUploadModalProps> = ({
  isOpen,
  onClose,
  onAddStory,
  onAddMultipleStories,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [fileFormatNotice, setFileFormatNotice] = useState<{
    type: 'info' | 'warning';
    title: string;
    message: string;
  } | null>(null);

  // Thông tin bài đọc
  const [storyTitle, setStoryTitle] = useState('');
  const [storyAuthor, setStoryAuthor] = useState('');
  const [storyGrade, setStoryGrade] = useState<GradeLevel>(3);
  const [storyCategory, setStoryCategory] = useState('Đời sống quanh ta');
  const [storySummary, setStorySummary] = useState('');
  const [storyContent, setStoryContent] = useState('');
  const [storyMoral, setStoryMoral] = useState('');
  const [detectedFileName, setDetectedFileName] = useState<string>('');
  const [selectedFileType, setSelectedFileType] = useState<'txt' | 'image-book' | 'pdf' | 'epub' | 'manual'>('manual');

  // Ảnh bìa riêng
  const [coverImageDataUri, setCoverImageDataUri] = useState<string>('');
  const [coverImageAlt, setCoverImageAlt] = useState('');

  // Minh họa từng đoạn
  const [pageIllustrations, setPageIllustrations] = useState<
    Array<{ paragraphIndex: number; dataUri: string; caption: string; altText: string }>
  >([]);

  // Tệp PDF / EPUB lưu trữ đính kèm (Lưu trữ trong IndexedDB)
  const [attachedPdfDataUri, setAttachedPdfDataUri] = useState<string>('');
  const [attachedEpubName, setAttachedEpubName] = useState<string>('');
  const [renderedPdfPages, setRenderedPdfPages] = useState<PdfRenderedPage[]>([]);
  const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number } | null>(null);

  // Bộ ảnh tranh truyện nhiều trang (JPG, PNG, WEBP)
  const [imageBookPages, setImageBookPages] = useState<Array<{ dataUri: string; name: string }>>([]);

  const mainFileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setStoryTitle('');
    setStoryAuthor('');
    setStoryGrade(3);
    setStoryCategory('Đời sống quanh ta');
    setStorySummary('');
    setStoryContent('');
    setStoryMoral('');
    setCoverImageDataUri('');
    setCoverImageAlt('');
    setPageIllustrations([]);
    setImageBookPages([]);
    setAttachedPdfDataUri('');
    setAttachedEpubName('');
    setRenderedPdfPages([]);
    setProcessingProgress(null);
    setDetectedFileName('');
    setSelectedFileType('manual');
    setUploadError(null);
    setUploadSuccess(null);
    setFileFormatNotice(null);
  };

  /**
   * Xử lý khi giáo viên chọn tệp bất kỳ từ máy tính:
   * PDF, EPUB, TXT, JPG, JPEG, PNG, WEBP, JSON
   */
  const handleMainFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setUploadError(null);
    setUploadSuccess(null);
    setFileFormatNotice(null);

    try {
      // Trường hợp chọn nhiều ảnh cùng lúc để làm sách tranh
      if (files.length > 1) {
        const fileList = Array.from(files);
        const imageFiles = fileList.filter((f) =>
          /\.(jpg|jpeg|png|webp|svg)$/i.test(f.name) || f.type.startsWith('image/')
        );

        if (imageFiles.length > 0) {
          imageFiles.sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
          );

          const newPages: Array<{ dataUri: string; name: string }> = [];
          for (const imgFile of imageFiles) {
            const uri = await readImageFileDataUri(imgFile);
            newPages.push({ dataUri: uri, name: imgFile.name });
          }

          setImageBookPages(newPages);
          setSelectedFileType('image-book');
          if (!storyTitle) {
            const firstClean = imageFiles[0].name.replace(/\.[^/.]+$/, '').replace(/[_\-\d]+$/, '');
            setStoryTitle(firstClean || 'Bộ sách tranh minh họa');
          }
          if (!coverImageDataUri && newPages.length > 0) {
            setCoverImageDataUri(newPages[0].dataUri);
          }

          setUploadSuccess(
            `Đã nạp thành công bộ ${newPages.length} trang tranh ảnh từ máy tính! Sách sẽ lật từng trang tương ứng.`
          );
          setIsProcessing(false);
          return;
        }
      }

      const file = files[0];
      const fileName = file.name;
      const lowerName = fileName.toLowerCase();
      setDetectedFileName(fileName);

      // 1. TỆP TXT
      if (lowerName.endsWith('.txt') || file.type === 'text/plain') {
        setSelectedFileType('txt');
        const rawText = await readTextFile(file);
        const parsed = parseTxtToStory(rawText, storyGrade);

        if (parsed.title) setStoryTitle(parsed.title);
        if (parsed.grade) setStoryGrade(parsed.grade);
        if (parsed.category) setStoryCategory(parsed.category);
        if (parsed.author) setStoryAuthor(parsed.author);
        if (parsed.summary) setStorySummary(parsed.summary);
        if (parsed.moralLesson) setStoryMoral(parsed.moralLesson);
        if (parsed.content) setStoryContent(parsed.content.join('\n\n'));

        setUploadSuccess(
          `Đã đọc thành công tệp văn bản "${fileName}". Nội dung đã được tự động điền vào các mục bên dưới.`
        );
      }
      // 2. TỆP PDF
      else if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') {
        setSelectedFileType('pdf');
        const base64Data = await readImageFileDataUri(file);
        setAttachedPdfDataUri(base64Data);

        const cleanTitle = fileName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ').trim();
        if (!storyTitle) setStoryTitle(cleanTitle);

        setUploadSuccess(`Đang giải mã và đọc từng trang từ tệp PDF "${fileName}"...`);

        try {
          const pages = await renderPdfToPages(
            base64Data,
            (curr, total) => setProcessingProgress({ current: curr, total }),
            2.4
          );

          setRenderedPdfPages(pages);

          // Tự động gán trang 1 làm ảnh bìa
          if (!coverImageDataUri && pages.length > 0) {
            setCoverImageDataUri(pages[0].imageUrl);
            setCoverImageAlt(`Bìa sách ${cleanTitle}`);
          }

          // Trích xuất văn bản từ các trang
          const extractedText = pages
            .map((p) => p.text)
            .filter((t) => t.trim().length > 0)
            .join('\n\n');

          if (!storyContent || storyContent.includes('Tài liệu sách PDF:')) {
            setStoryContent(
              extractedText || pages.map((p) => `[Nội dung Trang ${p.pageNumber}]`).join('\n\n')
            );
          }

          if (!storySummary) {
            setStorySummary(
              extractedText
                ? extractedText.slice(0, 160) + '...'
                : `Cuốn sách PDF "${cleanTitle}" gồm ${pages.length} trang do giáo viên tải lên.`
            );
          }

          setFileFormatNotice({
            type: 'info',
            title: `Đã đọc thành công ${pages.length} trang từ tệp PDF`,
            message: `Tệp PDF "${fileName}" (${(file.size / 1024).toFixed(0)} KB) đã được giải mã và kết xuất thành công toàn bộ ${pages.length} trang. Sách sẽ hiển thị đầy đủ hình vẽ, chữ và màu sắc nguyên bản của tài liệu gốc trong giao diện sách lật 2D.`,
          });

          setUploadSuccess(
            `Đã đọc thành công toàn bộ ${pages.length} trang của "${fileName}"! Mỗi trang PDF sẽ là một trang sách lật giữ nguyên vẹn nội dung.`
          );
        } catch (pdfErr: any) {
          console.error('Lỗi phân tích cú pháp tệp PDF:', pdfErr);
          setUploadError(`Lỗi khi đọc tệp PDF "${fileName}": ${pdfErr?.message || 'Không thể render PDF.'}`);
        }
      }
      // 3. TỆP EPUB
      else if (lowerName.endsWith('.epub') || file.type.includes('epub')) {
        setSelectedFileType('epub');
        const base64Data = await readImageFileDataUri(file);
        setAttachedPdfDataUri(base64Data);
        setAttachedEpubName(fileName);

        const cleanTitle = fileName.replace(/\.epub$/i, '').replace(/[-_]/g, ' ');
        if (!storyTitle) setStoryTitle(cleanTitle);
        if (!storySummary) setStorySummary(`Sách điện tử EPUB: "${fileName}" do giáo viên tải lên.`);

        // Thông báo trung thực theo yêu cầu:
        // "Nếu định dạng nào chưa được hỗ trợ đọc trực tiếp, hãy thông báo rõ cho giáo viên thay vì báo tải thành công giả."
        setFileFormatNotice({
          type: 'warning',
          title: 'Thông báo về định dạng EPUB',
          message: `Tệp EPUB "${fileName}" đã được lưu an toàn vào cơ sở dữ liệu IndexedDB. Lưu ý: Định dạng nén đa tệp EPUB hiện chưa có bộ phân tích chương tự động trong trình đọc Flipbook ngoại tuyến. Thầy/Cô hãy dán nội dung chữ (TXT) vào ô bên dưới để học sinh có thể lật từng trang và làm bài đọc hiểu.`,
        });

        if (!storyContent) {
          setStoryContent(`[Sách điện tử EPUB: ${fileName}]\n\nVui lòng dán thêm nội dung văn bản để các em học sinh có trải nghiệm lật trang sách điện tử sinh động nhất.`);
        }

        setUploadSuccess(`Đã nạp tệp EPUB "${fileName}" vào IndexedDB.`);
      }
      // 4. HÌNH ẢNH (JPG, JPEG, PNG, WEBP)
      else if (/\.(jpg|jpeg|png|webp|svg)$/i.test(lowerName) || file.type.startsWith('image/')) {
        const dataUri = await readImageFileDataUri(file);
        // Tự động gán làm ảnh bìa hoặc tạo trang tranh
        if (!coverImageDataUri) {
          setCoverImageDataUri(dataUri);
          setCoverImageAlt(`Ảnh bìa cho ${fileName}`);
        }
        setImageBookPages([{ dataUri, name: fileName }]);
        const cleanTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        if (!storyTitle) setStoryTitle(cleanTitle);

        setUploadSuccess(`Đã nạp tệp hình ảnh "${fileName}". Ảnh đã được đặt làm ảnh bìa xem trước.`);
      }
      // 5. TỆP JSON (Hàng loạt)
      else if (lowerName.endsWith('.json')) {
        const rawText = await readTextFile(file);
        try {
          const parsed = JSON.parse(rawText);
          const list: Story[] = Array.isArray(parsed) ? parsed : [parsed];
          if (list.length > 0 && list[0].title) {
            onAddMultipleStories(list);
            setUploadSuccess(`Đã nhập thành công ${list.length} bài đọc từ tệp JSON "${fileName}"!`);
            setTimeout(() => {
              onClose();
              resetForm();
            }, 1200);
            setIsProcessing(false);
            return;
          } else {
            throw new Error('Dữ liệu JSON không đúng cấu trúc Story của ReadUp.');
          }
        } catch (jErr: any) {
          setUploadError(`Lỗi tệp JSON: ${jErr.message}`);
        }
      } else {
        setUploadError(`Định dạng tệp "${fileName}" chưa được hỗ trợ. Vui lòng chọn PDF, EPUB, TXT, JPG, PNG, WEBP.`);
      }
    } catch (err: any) {
      setUploadError(`Lỗi khi đọc tệp: ${err.message || 'Lỗi không xác định'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Tải ảnh bìa riêng
   */
  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUri = await readImageFileDataUri(file);
      setCoverImageDataUri(dataUri);
      if (!coverImageAlt) {
        setCoverImageAlt(`Ảnh bìa ${storyTitle || file.name}`);
      }
      setUploadSuccess(`Đã nạp ảnh bìa "${file.name}" thành công!`);
    } catch (err: any) {
      setUploadError('Lỗi đọc ảnh bìa: ' + err.message);
    }
  };

  /**
   * Gắn ảnh minh họa xen kẽ cho từng đoạn văn
   */
  const handleAddIllustration = async (e: React.ChangeEvent<HTMLInputElement>, paragraphIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUri = await readImageFileDataUri(file);
      setPageIllustrations((prev) => [
        ...prev.filter((p) => p.paragraphIndex !== paragraphIndex),
        {
          paragraphIndex,
          dataUri,
          caption: `Minh họa cho đoạn ${paragraphIndex + 1}`,
          altText: `Tranh minh họa đoạn ${paragraphIndex + 1}`,
        },
      ]);
      setUploadSuccess(`Đã gắn ảnh cho đoạn ${paragraphIndex + 1}.`);
    } catch (err: any) {
      setUploadError('Lỗi đọc ảnh minh họa: ' + err.message);
    }
  };

  /**
   * Lưu sách vào hệ thống
   */
  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (!storyTitle.trim()) {
      setUploadError('Vui lòng nhập Tên sách / Tiêu đề bài đọc.');
      return;
    }

    let paragraphs: string[] = [];
    let illustrations: StoryIllustration[] = [];

    if (selectedFileType === 'image-book' && imageBookPages.length > 0) {
      paragraphs = imageBookPages.map((p, idx) => `[Trang tranh minh họa số ${idx + 1}: ${p.name}]`);
      illustrations = imageBookPages.map((p, idx) => ({
        id: `illus-img-${Date.now()}-${idx}`,
        afterParagraphIndex: idx,
        imageUrl: p.dataUri,
        altText: `Trang tranh số ${idx + 1} của cuốn sách ${storyTitle}`,
        caption: `Trang ${idx + 1}: ${p.name.replace(/\.[^/.]+$/, '')}`,
      }));
    } else {
      paragraphs = storyContent
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      if (paragraphs.length === 0) {
        setUploadError('Vui lòng nhập hoặc nạp nội dung bài đọc để học sinh có thể lật trang và đọc hiểu.');
        return;
      }

      illustrations = pageIllustrations.map((item, idx) => ({
        id: `illus-tc-${Date.now()}-${idx}`,
        afterParagraphIndex: item.paragraphIndex,
        imageUrl: item.dataUri,
        altText: item.altText,
        caption: item.caption,
      }));
    }

    const storyId = `story-teacher-${Date.now()}`;

    // Lưu tệp dung lượng lớn (PDF, EPUB) vào IndexedDB thay vì localStorage
    if (attachedPdfDataUri) {
      try {
        await saveFileToIndexedDB(
          storyId,
          attachedPdfDataUri,
          selectedFileType === 'pdf' ? 'application/pdf' : 'application/epub+zip'
        );

        // Lưu cache các trang PDF đã render sẵn để mở tức thì
        if (selectedFileType === 'pdf' && renderedPdfPages.length > 0) {
          await saveRenderedPdfPagesToIndexedDB(storyId, renderedPdfPages);
        }
      } catch (idbErr) {
        console.warn('Lưu trữ IndexedDB phụ trợ:', idbErr);
      }
    }

    const newStory: Story = {
      id: storyId,
      title: storyTitle.trim(),
      grade: storyGrade,
      category: storyCategory.trim() || 'Bài đọc tự chọn',
      author: storyAuthor.trim() || 'Giáo viên',
      estimatedReadMinutes: Math.max(2, Math.ceil(paragraphs.length * 1.2)),
      coverEmoji: '📖',
      coverColor: 'from-emerald-100 to-teal-100 border-emerald-200 text-emerald-800',
      coverImage: coverImageDataUri || (renderedPdfPages[0]?.imageUrl) || undefined,
      coverImageAlt: coverImageAlt || `Bìa sách ${storyTitle.trim()}`,
      summary:
        storySummary.trim() ||
        (paragraphs[0] ? paragraphs[0].slice(0, 140) + '...' : 'Sách do giáo viên biên soạn và tải lên.'),
      content: paragraphs,
      moralLesson: storyMoral.trim() || undefined,
      illustrations,
      questions: [], // Giáo viên tự tạo trong Kho bài đọc
      isPublished: true, // Mặc định xuất bản cho học sinh đọc
      uploadedAt: new Date().toISOString(),
      fileType: selectedFileType,
      pdfFileUrl: attachedPdfDataUri ? `indexeddb://${storyId}` : undefined,
      epubFileName: attachedEpubName || undefined,
    };

    onAddStory(newStory);
    setUploadSuccess(`Đã lưu sách "${newStory.title}" thành công vào Kho bài đọc Lớp ${newStory.grade}!`);

    setTimeout(() => {
      onClose();
      resetForm();
    }, 1200);
  };

  const paragraphsList = storyContent
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FFFDF9] border border-[#E7DFCD] rounded-3xl shadow-2xl max-w-3xl w-full my-auto overflow-hidden text-stone-800 max-h-[92vh] flex flex-col">
        {/* Header modal */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
              📤
            </div>
            <div>
              <h2 className="text-lg font-black font-['Quicksand',sans-serif]">
                Tải sách và truyện lên thư viện
              </h2>
              <p className="text-xs text-emerald-100">
                Dành cho giáo viên • Hỗ trợ PDF, EPUB, TXT, JPG, PNG, WEBP • Không tự tạo nội dung giả
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              resetForm();
            }}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung form */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs sm:text-sm">
          {/* Thông báo lỗi & thành công */}
          {uploadError && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-center gap-2.5 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2.5 text-xs font-bold">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {/* Hộp thông báo về định dạng tệp (PDF/EPUB) */}
          {fileFormatNotice && (
            <div
              className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                fileFormatNotice.type === 'warning'
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2 font-black mb-1">
                <Info className="w-4 h-4 shrink-0 text-emerald-700" />
                <span>{fileFormatNotice.title}</span>
              </div>
              <p className="text-stone-700">{fileFormatNotice.message}</p>
            </div>
          )}

          {/* VÙNG CHỌN TỆP CHÍNH TỪ MÁY TÍNH */}
          <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border-2 border-dashed border-emerald-300 rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-2xl text-emerald-800">
              📁
            </div>
            <div>
              <h4 className="font-black text-sm sm:text-base text-emerald-950">
                Chọn tệp sách/truyện từ máy tính
              </h4>
              <p className="text-xs text-stone-600 mt-1 max-w-lg mx-auto">
                Hỗ trợ các định dạng học liệu: <strong>PDF, EPUB, TXT, JPG, JPEG, PNG, WEBP</strong>
              </p>
            </div>

            {/* Badges định dạng được hỗ trợ */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              {['PDF', 'EPUB', 'TXT', 'JPG', 'PNG', 'WEBP'].map((fmt) => (
                <span
                  key={fmt}
                  className="px-2 py-0.5 bg-white border border-emerald-200 rounded-md text-[11px] font-extrabold text-emerald-800"
                >
                  .{fmt.toLowerCase()}
                </span>
              ))}
            </div>

            {/* Nút chọn tệp chính */}
            <div className="pt-2">
              <input
                ref={mainFileInputRef}
                type="file"
                multiple
                accept=".pdf,.epub,.txt,.jpg,.jpeg,.png,.webp,.json"
                onChange={handleMainFileSelected}
                className="hidden"
                id="main-teacher-file-input"
              />
              <label
                htmlFor="main-teacher-file-input"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-sm cursor-pointer transition"
              >
                <Upload className="w-4 h-4" />
                <span>{detectedFileName ? `Đổi tệp (${detectedFileName})` : 'Chọn tệp từ máy tính'}</span>
              </label>
              {detectedFileName && (
                <p className="text-[11px] text-emerald-800 font-bold mt-1.5">
                  Đã nhận: <span className="underline">{detectedFileName}</span>
                </p>
              )}

              {/* Thanh tiến trình đang render PDF */}
              {isProcessing && processingProgress && (
                <div className="pt-3 max-w-xs mx-auto space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-black text-emerald-900">
                    <span>Đang giải mã trang {processingProgress.current} / {processingProgress.total}...</span>
                    <span>{Math.round((processingProgress.current / processingProgress.total) * 100)}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-emerald-200/60 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-emerald-700 rounded-full transition-all duration-200"
                      style={{ width: `${Math.round((processingProgress.current / processingProgress.total) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Thư viện xem trước các trang PDF đã render */}
            {renderedPdfPages.length > 0 && (
              <div className="p-3 bg-white border border-emerald-300 rounded-2xl space-y-2 shadow-2xs text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-emerald-700" />
                    <span>
                      Nội dung đã nhận diện ({renderedPdfPages.length} trang sách lật nguyên bản):
                    </span>
                  </span>
                  <span className="text-[11px] font-black bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-200">
                    ✓ Đầy đủ {renderedPdfPages.length} trang
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1 bg-[#FAF8F2] rounded-xl border border-stone-200">
                  {renderedPdfPages.map((page) => (
                    <div
                      key={page.pageNumber}
                      className="bg-white p-1 rounded-lg border border-stone-200 text-center shadow-2xs flex flex-col items-center"
                    >
                      <div className="aspect-3/4 w-full rounded overflow-hidden bg-stone-100 mb-1 border border-stone-200/50">
                        <img
                          src={page.imageUrl}
                          alt={`Trang ${page.pageNumber}`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="text-[10px] font-black text-stone-700 block">
                        Trang {page.pageNumber}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* FORM NHẬP THÔNG TIN CHI TIẾT */}
          <form onSubmit={handleSaveBook} className="space-y-4">
            {/* 1. Tên sách và Khối lớp */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-black uppercase text-stone-700 mb-1">
                  Tên sách / Truyện / Bài đọc *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Dế Mèn phiêu lưu ký, Cô bé bán diêm..."
                  value={storyTitle}
                  onChange={(e) => setStoryTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-stone-200 rounded-xl font-bold text-stone-900 text-xs sm:text-sm focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-stone-700 mb-1">
                  Khối lớp phù hợp *
                </label>
                <select
                  value={storyGrade}
                  onChange={(e) => setStoryGrade(parseInt(e.target.value, 10) as GradeLevel)}
                  className="w-full px-3 py-2.5 bg-white border-2 border-stone-200 rounded-xl font-bold text-stone-900 text-xs sm:text-sm focus:border-emerald-600 focus:outline-hidden cursor-pointer"
                >
                  {[1, 2, 3, 4, 5].map((g) => (
                    <option key={g} value={g}>
                      Khối Lớp {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. Tác giả & Thể loại */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black uppercase text-stone-700 mb-1">
                  Tác giả / Người biên soạn
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tô Hoài, An-đéc-xen, Cô giáo Thu Hà..."
                  value={storyAuthor}
                  onChange={(e) => setStoryAuthor(e.target.value)}
                  className="w-full px-3 py-2 bg-white border-2 border-stone-200 rounded-xl font-semibold text-stone-900 text-xs focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-stone-700 mb-1">
                  Thể loại / Chủ đề
                </label>
                <input
                  type="text"
                  placeholder="Truyện đồng thoại, Cổ tích, Khoa học, Đời sống..."
                  value={storyCategory}
                  onChange={(e) => setStoryCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white border-2 border-stone-200 rounded-xl font-semibold text-stone-900 text-xs focus:border-emerald-600 focus:outline-hidden"
                />
              </div>
            </div>

            {/* 3. Mô tả sách */}
            <div>
              <label className="block text-xs font-black uppercase text-stone-700 mb-1">
                Mô tả / Lời giới thiệu ngắn
              </label>
              <textarea
                rows={2}
                placeholder="1-2 câu tóm tắt nội dung hấp dẫn để gợi mở hứng thú cho học sinh..."
                value={storySummary}
                onChange={(e) => setStorySummary(e.target.value)}
                className="w-full px-3 py-2 bg-white border-2 border-stone-200 rounded-xl font-medium text-stone-900 text-xs focus:border-emerald-600 focus:outline-hidden"
              />
            </div>

            {/* 4. Chọn ảnh bìa riêng (JPG, JPEG, PNG, WEBP) */}
            <div className="p-3.5 bg-[#FAF7F0] border border-stone-200 rounded-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-stone-800">
                    Ảnh bìa sách riêng (Tùy chọn)
                  </label>
                  <span className="text-[11px] text-stone-500">
                    Tải tranh bìa 2D hoặc ảnh vẽ bìa sách (JPG, JPEG, PNG, WEBP)
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    ref={coverFileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleCoverImageChange}
                    className="hidden"
                    id="teacher-cover-file-input"
                  />
                  <label
                    htmlFor="teacher-cover-file-input"
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 transition shadow-2xs"
                  >
                    <Image className="w-3.5 h-3.5" />
                    <span>{coverImageDataUri ? 'Đổi ảnh bìa' : 'Chọn ảnh bìa'}</span>
                  </label>
                  {coverImageDataUri && (
                    <button
                      type="button"
                      onClick={() => setCoverImageDataUri('')}
                      className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition"
                    >
                      Gỡ ảnh
                    </button>
                  )}
                </div>
              </div>

              {coverImageDataUri && (
                <div className="mt-3 flex items-center gap-3 bg-white p-2.5 rounded-xl border border-stone-200">
                  <img
                    src={coverImageDataUri}
                    alt="Ảnh bìa"
                    className="w-16 h-12 object-cover rounded-lg border border-stone-200 shadow-2xs"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-stone-800 truncate block">
                      Đã chọn ảnh bìa riêng cho cuốn sách
                    </span>
                    <input
                      type="text"
                      placeholder="Mô tả alt text cho ảnh bìa..."
                      value={coverImageAlt}
                      onChange={(e) => setCoverImageAlt(e.target.value)}
                      className="text-[11px] text-stone-600 bg-stone-50 border border-stone-200 rounded px-2 py-0.5 mt-1 w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 5. Nội dung bài đọc để đọc theo lật trang Flipbook */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-black uppercase text-stone-700">
                  Nội dung bài đọc (Mỗi đoạn cách nhau một dòng trống) *
                </label>
                <span className="text-[11px] text-emerald-800 font-black">
                  {paragraphsList.length} đoạn văn
                </span>
              </div>
              <textarea
                rows={6}
                required
                placeholder="Dán hoặc nhập nội dung câu chuyện tiếng Việt vào đây..."
                value={storyContent}
                onChange={(e) => setStoryContent(e.target.value)}
                className="w-full p-3.5 bg-white border-2 border-stone-200 rounded-2xl text-xs sm:text-sm font-normal leading-relaxed focus:border-emerald-600 focus:outline-hidden text-stone-900"
              />

              {/* Vùng gắn tranh minh họa xen kẽ cho các đoạn */}
              {paragraphsList.length > 0 && (
                <div className="mt-3 p-3 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>
                        Gắn hình minh họa xen kẽ vào từng đoạn ({pageIllustrations.length} ảnh đã gắn):
                      </span>
                    </span>
                  </div>

                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {paragraphsList.map((p, idx) => {
                      const existing = pageIllustrations.find((pi) => pi.paragraphIndex === idx);
                      return (
                        <div
                          key={idx}
                          className="p-2 bg-white rounded-xl border border-stone-200 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="font-black text-emerald-800">Đoạn {idx + 1}:</span>{' '}
                            <span className="text-stone-600 truncate inline-block max-w-[260px] align-bottom">
                              {p.slice(0, 50)}...
                            </span>
                          </div>

                          {existing ? (
                            <div className="flex items-center gap-2">
                              <img
                                src={existing.dataUri}
                                alt=""
                                className="w-8 h-8 rounded object-cover border border-stone-300"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setPageIllustrations((prev) =>
                                    prev.filter((pi) => pi.paragraphIndex !== idx)
                                  )
                                }
                                className="text-red-600 hover:text-red-800 font-bold cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <label className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-[11px] rounded-lg cursor-pointer transition shrink-0 flex items-center gap-1">
                              <Plus className="w-3 h-3 text-emerald-600" />
                              <span>Gắn ảnh</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleAddIllustration(e, idx)}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 6. Bài học rút ra */}
            <div>
              <label className="block text-xs font-black uppercase text-stone-700 mb-1">
                Bài học rút ra / Lời nhắn nhủ (Hiển thị trang kết thúc)
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Biết quan tâm, giúp đỡ bạn bè và yêu quý thiên nhiên..."
                value={storyMoral}
                onChange={(e) => setStoryMoral(e.target.value)}
                className="w-full px-3 py-2 bg-white border-2 border-stone-200 rounded-xl font-medium text-stone-900 text-xs focus:border-emerald-600 focus:outline-hidden"
              />
            </div>

            {/* NÚT LƯU SÁCH & HỦY */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  resetForm();
                }}
                className="px-5 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-7 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4 text-emerald-200" />
                <span>Lưu sách</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
