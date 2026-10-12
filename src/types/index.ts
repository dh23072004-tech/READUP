export type GradeLevel = 1 | 2 | 3 | 4 | 5;

export type QuestionType = 'multiple_choice' | 'short_answer';

export interface Question {
  id: string;
  type: QuestionType;
  questionText: string;
  options?: string[]; // Trắc nghiệm thường có 4 phương án A, B, C, D
  correctAnswer?: string; // Đối với trắc nghiệm là ký tự A, B, C, D hoặc nội dung phương án
  sampleAnswer?: string; // Đáp án mẫu gợi ý cho câu trả lời ngắn
  keywords?: string[]; // Từ khóa chính dùng so sánh văn bản đơn giản
  explanation: string; // Lời giải thích cặn kẽ vì sao đúng
}

export interface VocabularyNote {
  word: string;
  meaning: string;
}

export interface StoryIllustration {
  id: string;
  afterParagraphIndex: number; // Chèn vào sau đoạn văn số mấy (0, 1, 2...)
  imageUrl: string; // SVG minh họa nội dung hoặc đường dẫn hình ảnh
  altText: string; // Văn bản thay thế hỗ trợ tiếp cận (a11y)
  caption?: string; // Lời chú thích ý nghĩa dưới tranh
}

export interface Story {
  id: string;
  title: string;
  grade: GradeLevel;
  category: string;
  estimatedReadMinutes: number;
  coverEmoji: string;
  coverColor: string;
  coverImage?: string; // Ảnh bìa lớn cho câu chuyện
  coverImageAlt?: string; // Alt text cho ảnh bìa
  illustrations?: StoryIllustration[]; // Các hình ảnh minh họa xen kẽ trong bài đọc
  summary: string;
  content: string[]; // Các đoạn văn
  vocabulary?: VocabularyNote[];
  questions: Question[]; // Các câu hỏi đọc hiểu (tùy chọn hoặc tối đa 5+)
  moralLesson?: string;
  // Các trường quản lý tài liệu do giáo viên tải lên:
  author?: string; // Tên tác giả hoặc tên giáo viên biên soạn
  isPublished?: boolean; // Cho phép học sinh đọc hay tạm ẩn
  uploadedAt?: string; // Thời gian giáo viên tải lên
  fileType?: 'txt' | 'json' | 'image-book' | 'pdf' | 'epub' | 'manual'; // Nguồn định dạng gốc
  displayOrder?: number; // Thứ tự hiển thị
  pdfFileUrl?: string; // Dữ liệu hoặc đường dẫn PDF (lưu trữ trong IndexedDB)
  epubFileName?: string; // Tên tệp EPUB đính kèm
}

export interface StudentAnswerRecord {
  questionId: string;
  questionText: string;
  type: QuestionType;
  studentAnswer: string;
  correctAnswer: string;
  sampleAnswer?: string;
  isCorrect: boolean;
  score: number; // Điểm số câu này (ví dụ 2 điểm)
  maxScore: number;
  explanation: string;
  teacherScore?: number; // Điểm giáo viên chấm lại
  teacherFeedback?: string; // Nhận xét của giáo viên
  matchKeywordsFound?: string[]; // Từ khóa tìm thấy khi đối chiếu
}

export interface QuizSubmission {
  id: string;
  storyId: string;
  storyTitle: string;
  studentId: string;
  studentName: string;
  grade: GradeLevel;
  submittedAt: string; // ISO string
  totalScore: number; // Điểm tổng kết (thang 10)
  maxScore: number; // 10
  starsEarned: number;
  xpEarned: number;
  answers: StudentAnswerRecord[];
  teacherReviewed: boolean;
  teacherNote?: string;
}

export interface Student {
  id: string; // Mã học sinh: HS001, HS002...
  name: string;
  grade: GradeLevel;
  avatar: string; // Emoji con vật vui nhộn
  totalStars: number;
  xp: number;
  streakDays: number;
  createdAt: string;
  notes?: string;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  requiredStars?: number;
  requiredStories?: number;
  unlockedAt?: string;
}

export type UserRole = 'guest' | 'student' | 'teacher';

export interface AppSession {
  role: UserRole;
  studentId?: string;
}
