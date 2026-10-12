import { Story, GradeLevel, Question, StoryIllustration } from '../types';

/**
 * Đọc tệp văn bản UTF-8 (TXT)
 */
export async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'utf-8');
  });
}

/**
 * Đọc tệp thành Data URI (Dùng cho hình ảnh JPG, PNG, WEBP, SVG)
 */
export async function readImageFileDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Chuyển đổi nội dung TXT thành cấu trúc Story hoàn chỉnh
 * Hỗ trợ các trường tùy chọn trong file TXT:
 * TIÊU ĐỀ: Tên bài đọc
 * LỚP: 1..5
 * TÁC GIẢ: Nguyễn Nhật Ánh
 * THỂ LOẠI: Cổ tích / Đời sống
 * BÀI HỌC: Lời khuyên
 * --- (Phần nội dung văn bản)
 */
export function parseTxtToStory(text: string, defaultGrade: GradeLevel = 3): Partial<Story> {
  const lines = text.split(/\r?\n/);
  let title = '';
  let grade: GradeLevel = defaultGrade;
  let category = 'Đời sống quanh ta';
  let author = '';
  let moralLesson = '';
  let summary = '';
  const contentParagraphs: string[] = [];

  let isReadingContent = false;
  let currentParagraph = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!isReadingContent) {
      if (line.startsWith('---') || line.startsWith('===')) {
        isReadingContent = true;
        continue;
      }

      const lower = line.toLowerCase();
      if (lower.startsWith('tiêu đề:') || lower.startsWith('tên truyện:') || lower.startsWith('tên bài:')) {
        title = line.substring(line.indexOf(':') + 1).trim();
        continue;
      }
      if (lower.startsWith('lớp:') || lower.startsWith('khối lớp:')) {
        const parsedGrade = parseInt(line.substring(line.indexOf(':') + 1).trim(), 10);
        if ([1, 2, 3, 4, 5].includes(parsedGrade)) {
          grade = parsedGrade as GradeLevel;
        }
        continue;
      }
      if (lower.startsWith('tác giả:')) {
        author = line.substring(line.indexOf(':') + 1).trim();
        continue;
      }
      if (lower.startsWith('thể loại:') || lower.startsWith('chủ đề:')) {
        category = line.substring(line.indexOf(':') + 1).trim();
        continue;
      }
      if (lower.startsWith('tóm tắt:') || lower.startsWith('giới thiệu:')) {
        summary = line.substring(line.indexOf(':') + 1).trim();
        continue;
      }
      if (lower.startsWith('bài học:') || lower.startsWith('ý nghĩa:')) {
        moralLesson = line.substring(line.indexOf(':') + 1).trim();
        continue;
      }

      // Nếu không có tiền tố và chưa có title, lấy dòng đầu tiên làm tiêu đề
      if (!title && line.length > 0) {
        title = line;
        continue;
      }

      // Nếu đã có title nhưng gặp dòng chữ dài không có prefix, bắt đầu chuyển sang content
      if (title && line.length > 0) {
        isReadingContent = true;
      }
    }

    if (isReadingContent) {
      if (line.length === 0) {
        if (currentParagraph.trim().length > 0) {
          contentParagraphs.push(currentParagraph.trim());
          currentParagraph = '';
        }
      } else {
        if (currentParagraph) {
          currentParagraph += ' ' + line;
        } else {
          currentParagraph = line;
        }
      }
    }
  }

  if (currentParagraph.trim().length > 0) {
    contentParagraphs.push(currentParagraph.trim());
  }

  // Tóm tắt mặc định nếu chưa có
  if (!summary && contentParagraphs.length > 0) {
    summary = contentParagraphs[0].slice(0, 140) + '...';
  }

  const estimatedMinutes = Math.max(2, Math.ceil(contentParagraphs.join(' ').split(/\s+/).length / 80));

  return {
    title: title || 'Bài đọc giáo viên tải lên',
    grade,
    category: category || 'Bài đọc bổ trợ',
    author: author || 'Giáo viên trường Ngô Sĩ Liên',
    summary: summary || 'Bài đọc do giáo viên tải lên phục vụ rèn luyện kỹ năng đọc hiểu.',
    content: contentParagraphs.length > 0 ? contentParagraphs : ['Nội dung bài đọc do giáo viên cập nhật.'],
    moralLesson: moralLesson || undefined,
    estimatedReadMinutes: estimatedMinutes,
    coverEmoji: '📚',
    coverColor: 'from-emerald-100 to-teal-100 border-emerald-200 text-emerald-800',
    questions: [],
    isPublished: true,
  };
}

/**
 * Phân tích tệp JSON chứa danh sách bài đọc hoặc 1 bài đọc
 */
export function parseJsonToStories(jsonString: string): Story[] {
  const parsed = JSON.parse(jsonString);
  const list = Array.isArray(parsed) ? parsed : parsed.stories ? parsed.stories : [parsed];

  return list.map((item: any, idx: number) => {
    return {
      id: item.id || `teacher-story-${Date.now()}-${idx}`,
      title: item.title || 'Bài đọc chưa đặt tên',
      grade: [1, 2, 3, 4, 5].includes(item.grade) ? item.grade : 3,
      category: item.category || 'Đọc hiểu',
      estimatedReadMinutes: item.estimatedReadMinutes || 3,
      coverEmoji: item.coverEmoji || '📖',
      coverColor: item.coverColor || 'from-emerald-100 to-teal-100 border-emerald-200 text-emerald-800',
      coverImage: item.coverImage,
      coverImageAlt: item.coverImageAlt,
      illustrations: item.illustrations || [],
      summary: item.summary || (Array.isArray(item.content) && item.content[0] ? item.content[0].slice(0, 120) + '...' : ''),
      content: Array.isArray(item.content) ? item.content : [item.content || ''],
      vocabulary: item.vocabulary || [],
      questions: Array.isArray(item.questions) ? item.questions : [],
      moralLesson: item.moralLesson,
      author: item.author || 'Giáo viên biên soạn',
      isPublished: item.isPublished !== undefined ? item.isPublished : true,
      uploadedAt: item.uploadedAt || new Date().toISOString(),
      fileType: item.fileType || 'json',
    };
  });
}
