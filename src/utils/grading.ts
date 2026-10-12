import { Question, StudentAnswerRecord } from '../types';

/**
 * Chuẩn hóa chuỗi tiếng Việt để so sánh đơn giản:
 * - Chuyển chữ thường
 * - Xóa dấu chấm câu thừa
 * - Rút gọn khoảng trắng
 */
export function normalizeVietnamese(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Đánh giá câu trả lời ngắn bằng đối chiếu từ khóa và mức độ tương đồng
 */
export function gradeShortAnswer(
  studentAnswer: string,
  sampleAnswer: string,
  keywords: string[] = []
): {
  isCorrect: boolean;
  score: number;
  matchedKeywords: string[];
  feedbackNotes: string;
} {
  const normStudent = normalizeVietnamese(studentAnswer);
  const normSample = normalizeVietnamese(sampleAnswer);

  if (!normStudent) {
    return {
      isCorrect: false,
      score: 0,
      matchedKeywords: [],
      feedbackNotes: 'Chưa có câu trả lời.',
    };
  }

  // 1. Kiểm tra nếu câu trả lời trùng khớp phần lớn với đáp án mẫu
  if (normStudent === normSample || normSample.includes(normStudent) || normStudent.includes(normSample)) {
    return {
      isCorrect: true,
      score: 2,
      matchedKeywords: keywords,
      feedbackNotes: 'Câu trả lời rất sát với đáp án gợi ý! (2.0/2 điểm)',
    };
  }

  // 2. So sánh danh sách từ khóa chính
  const matchedKeywords: string[] = [];
  keywords.forEach((kw) => {
    const normKw = normalizeVietnamese(kw);
    if (normKw && normStudent.includes(normKw)) {
      matchedKeywords.push(kw);
    }
  });

  const keywordRatio = keywords.length > 0 ? matchedKeywords.length / keywords.length : 0;

  if (keywordRatio >= 0.5 || matchedKeywords.length >= 2) {
    return {
      isCorrect: true,
      score: 2,
      matchedKeywords,
      feedbackNotes: `Khớp ${matchedKeywords.length}/${keywords.length} từ khóa chính. Đạt điểm tối đa! (Giáo viên có thể chấm lại).`,
    };
  } else if (matchedKeywords.length >= 1 || normStudent.length >= 10) {
    return {
      isCorrect: true,
      score: 1.5,
      matchedKeywords,
      feedbackNotes: `Tìm thấy từ khóa liên quan [${matchedKeywords.join(', ') || 'ý tương đối'}]. Cho 1.5 điểm dự kiến.`,
    };
  } else {
    return {
      isCorrect: false,
      score: 0.5,
      matchedKeywords: [],
      feedbackNotes: 'Câu trả lời còn ngắn hoặc chưa rõ từ khóa. Hệ thống cho 0.5 điểm khuyến khích (Giáo viên có thể chấm lại).',
    };
  }
}

/**
 * Chấm toàn bộ câu hỏi của bài đọc
 */
export function evaluateAllQuestions(
  questions: Question[],
  userAnswers: Record<string, string>
): {
  answers: StudentAnswerRecord[];
  totalScore: number;
  maxScore: number;
  starsEarned: number;
  xpEarned: number;
} {
  const answers: StudentAnswerRecord[] = [];
  let totalScore = 0;
  const maxScore = 10; // Mỗi bài có 5 câu, mỗi câu 2 điểm = 10 điểm
  const pointsPerQuestion = 2;

  questions.forEach((q) => {
    const rawStudentAnswer = (userAnswers[q.id] || '').trim();

    if (q.type === 'multiple_choice') {
      // Đáp án trắc nghiệm: học sinh chọn 'A', 'B', 'C' hoặc 'D'
      const cleanAnswer = rawStudentAnswer.toUpperCase().charAt(0);
      const targetCorrect = (q.correctAnswer || 'A').toUpperCase().charAt(0);
      const isCorrect = cleanAnswer === targetCorrect;
      const score = isCorrect ? pointsPerQuestion : 0;

      totalScore += score;
      answers.push({
        questionId: q.id,
        questionText: q.questionText,
        type: 'multiple_choice',
        studentAnswer: rawStudentAnswer,
        correctAnswer: q.correctAnswer || 'A',
        isCorrect,
        score,
        maxScore: pointsPerQuestion,
        explanation: q.explanation,
      });
    } else {
      // Câu trả lời ngắn
      const result = gradeShortAnswer(rawStudentAnswer, q.sampleAnswer || '', q.keywords || []);
      totalScore += result.score;

      answers.push({
        questionId: q.id,
        questionText: q.questionText,
        type: 'short_answer',
        studentAnswer: rawStudentAnswer,
        correctAnswer: q.sampleAnswer || '',
        sampleAnswer: q.sampleAnswer,
        isCorrect: result.isCorrect,
        score: result.score,
        maxScore: pointsPerQuestion,
        explanation: q.explanation,
        teacherFeedback: result.feedbackNotes,
        matchKeywordsFound: result.matchedKeywords,
      });
    }
  });

  // Tính sao thưởng dựa trên thang điểm 10
  let starsEarned = 1;
  if (totalScore >= 9) {
    starsEarned = 3;
  } else if (totalScore >= 6) {
    starsEarned = 2;
  }

  // XP: 10 XP mỗi điểm + sao thưởng * 5
  const xpEarned = Math.round(totalScore * 5 + starsEarned * 5);

  return {
    answers,
    totalScore: Math.round(totalScore * 10) / 10,
    maxScore,
    starsEarned,
    xpEarned,
  };
}
