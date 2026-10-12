import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, Award, Sparkles, ArrowRight, RotateCcw, AlertCircle, BookOpen } from 'lucide-react';
import { Story, Student, QuizSubmission } from '../types';
import { evaluateAllQuestions } from '../utils/grading';

interface QuizModalProps {
  story: Story;
  currentStudent: Student;
  isOpen: boolean;
  onClose: () => void;
  onCompleteQuiz: (submission: QuizSubmission) => void;
  onReviewStory: () => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  story,
  currentStudent,
  isOpen,
  onClose,
  onCompleteQuiz,
  onReviewStory,
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<QuizSubmission | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Confetti effect when successfully submitted
  useEffect(() => {
    if (!isSubmitted || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 600;
    canvas.height = 300;

    const colors = ['#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6', '#14B8A6'];
    const particles = Array.from({ length: 60 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -50,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 3 + 2,
      speedX: (Math.random() - 0.5) * 3,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 6,
    }));

    let animationId: number;
    let frames = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frames++;

      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      if (frames < 180) {
        animationId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isSubmitted]);

  if (!isOpen) return null;

  const currentQ = story.questions[currentQuestionIndex];
  const totalQuestions = story.questions.length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  const handleSelectOption = (optionLetter: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionLetter,
    }));
  };

  const handleShortAnswerChange = (val: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: val,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmitQuiz = () => {
    // Đánh giá tất cả câu hỏi
    const evaluated = evaluateAllQuestions(story.questions, answers);

    const submission: QuizSubmission = {
      id: `sub-${Date.now()}`,
      storyId: story.id,
      storyTitle: story.title,
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      grade: story.grade,
      submittedAt: new Date().toISOString(),
      totalScore: evaluated.totalScore,
      maxScore: evaluated.maxScore,
      starsEarned: evaluated.starsEarned,
      xpEarned: evaluated.xpEarned,
      answers: evaluated.answers,
      teacherReviewed: false,
    };

    setResult(submission);
    setIsSubmitted(true);
    onCompleteQuiz(submission);
  };

  const handleRetry = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setIsSubmitted(false);
    setResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FFFDF9] border border-[#E7DFCD] rounded-3xl shadow-2xl max-w-2xl w-full my-auto overflow-hidden text-stone-800">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 sm:p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shrink-0">
              {story.coverEmoji}
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider bg-white/25 px-2 py-0.5 rounded-md">
                Bài kiểm tra đọc hiểu • Lớp {story.grade}
              </span>
              <h2 className="text-base sm:text-lg font-black font-['Quicksand',sans-serif] truncate max-w-xs sm:max-w-md">
                {story.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        {!isSubmitted ? (
          <div className="p-5 sm:p-7">
            {/* Progress indicators */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs font-bold text-stone-600 mb-2">
                <span>Câu hỏi {currentQuestionIndex + 1} / {totalQuestions}</span>
                <span className="text-emerald-700">
                  {currentQ.type === 'multiple_choice' ? 'Dạng trắc nghiệm (Chọn 1 đáp án)' : 'Dạng câu hỏi ngắn (Viết câu)'}
                </span>
              </div>
              <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
                ></div>
              </div>

              {/* Dots tracker */}
              <div className="flex items-center justify-center gap-2 mt-3">
                {story.questions.map((q, idx) => {
                  const hasAnswer = Boolean((answers[q.id] || '').trim());
                  const isCurrent = idx === currentQuestionIndex;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition ${
                        isCurrent
                          ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                          : hasAnswer
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-200 text-stone-500 hover:bg-stone-300'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question Text */}
            <div className="mb-6 p-4 bg-[#FAF7F0] border-2 border-[#E7DFCD] rounded-2xl">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-700 block mb-1">
                Câu {currentQuestionIndex + 1}:
              </span>
              <p className="text-base sm:text-lg font-extrabold text-stone-900 leading-snug">
                {currentQ.questionText}
              </p>
            </div>

            {/* Answer Input */}
            {currentQ.type === 'multiple_choice' ? (
              <div className="space-y-3 mb-6">
                {(currentQ.options || []).map((option, idx) => {
                  // Option letter: 'A', 'B', 'C', 'D'
                  const letter = String.fromCharCode(65 + idx);
                  const isSelected = answers[currentQ.id] === letter;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectOption(letter)}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 transition flex items-start gap-3 ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/80 shadow-xs ring-1 ring-emerald-500'
                          : 'border-stone-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {letter}
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-stone-800 leading-snug">
                        {option}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mb-6">
                <label className="block text-xs font-bold text-stone-600 mb-2">
                  Em hãy viết câu trả lời của mình vào khung bên dưới:
                </label>
                <textarea
                  rows={4}
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => handleShortAnswerChange(e.target.value)}
                  placeholder="Nhập câu trả lời của em bằng tiếng Việt..."
                  className="w-full p-4 bg-white border-2 border-stone-300 rounded-2xl text-stone-900 font-semibold focus:border-emerald-500 focus:outline-hidden text-sm leading-relaxed transition resize-none"
                />
                <p className="text-[11px] text-stone-500 mt-1.5 italic">
                  💡 Gợi ý: Hệ thống sẽ tự động so sánh với đáp án mẫu. Giáo viên có thể xem lại bài làm của em và cộng thêm điểm.
                </p>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentQuestionIndex === 0}
                className="px-4 py-2.5 rounded-xl border border-stone-300 font-bold text-xs text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:pointer-events-none transition"
              >
                ← Câu trước
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onReviewStory}
                  className="hidden sm:flex items-center gap-1 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl transition"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Xem lại bài đọc
                </button>

                {isLastQuestion ? (
                  <button
                    type="button"
                    onClick={handleSubmitQuiz}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition transform active:scale-98 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Nộp bài & Chấm điểm</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xs transition flex items-center gap-1.5"
                  >
                    <span>Câu tiếp theo</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Result Screen */
          <div className="p-5 sm:p-7 max-h-[80vh] overflow-y-auto">
            {/* Score Showcase */}
            <div className="text-center py-6 px-4 bg-gradient-to-b from-emerald-50 to-amber-50/50 border-2 border-emerald-200 rounded-3xl mb-6 relative overflow-hidden">
              <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none z-10 w-full h-full"
              />
              <div className="text-4xl mb-2 animate-bounce">🎉</div>
              <h3 className="text-2xl font-black text-emerald-950 font-['Quicksand',sans-serif]">
                Chúc mừng {currentStudent.name}!
              </h3>
              <p className="text-xs font-bold text-stone-600 mt-1">
                Con đã hoàn thành xuất sắc bài đọc hiểu: <span className="text-emerald-800 font-extrabold">{story.title}</span>
              </p>

              {/* Badges and Stars */}
              <div className="flex flex-wrap items-center justify-center gap-4 my-5">
                <div className="bg-white px-5 py-3 rounded-2xl shadow-xs border border-emerald-200">
                  <div className="text-3xl font-black text-emerald-700">
                    {result?.totalScore} <span className="text-sm font-bold text-stone-500">/ 10 đ</span>
                  </div>
                  <div className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                    Tổng điểm
                  </div>
                </div>

                <div className="bg-white px-5 py-3 rounded-2xl shadow-xs border border-amber-200">
                  <div className="text-3xl font-black text-amber-500 flex items-center justify-center gap-0.5">
                    {'★'.repeat(result?.starsEarned || 0)}
                  </div>
                  <div className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                    +{result?.starsEarned} Sao thưởng
                  </div>
                </div>

                <div className="bg-white px-5 py-3 rounded-2xl shadow-xs border border-teal-200">
                  <div className="text-3xl font-black text-teal-600">
                    +{result?.xpEarned}
                  </div>
                  <div className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                    Điểm kinh nghiệm (XP)
                  </div>
                </div>
              </div>

              <div className="text-xs text-stone-600 max-w-md mx-auto bg-white/70 p-3 rounded-xl border border-stone-200">
                <AlertCircle className="w-3.5 h-3.5 text-emerald-600 inline mr-1" />
                Câu hỏi ngắn đã được đối chiếu từ khóa tự động. Thầy cô giáo có thể xem lại bài làm để điều chỉnh điểm nếu cần.
              </div>
            </div>

            {/* Detailed Question Review */}
            <h4 className="font-extrabold text-sm uppercase tracking-wider text-stone-800 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Xem lại chi tiết lời giải & đáp án:</span>
            </h4>

            <div className="space-y-4 mb-6">
              {result?.answers.map((ans, idx) => (
                <div
                  key={ans.questionId}
                  className={`p-4 rounded-2xl border-2 text-xs ${
                    ans.score >= 1.5
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : ans.score > 0
                      ? 'bg-amber-50/60 border-amber-200'
                      : 'bg-red-50/60 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-black text-stone-900 text-sm">
                      Câu {idx + 1}: {ans.questionText}
                    </span>
                    <span
                      className={`font-black px-2.5 py-0.5 rounded-full text-xs shrink-0 ${
                        ans.score >= 1.5
                          ? 'bg-emerald-200 text-emerald-900'
                          : ans.score > 0
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-red-200 text-red-900'
                      }`}
                    >
                      {ans.score} / {ans.maxScore} đ
                    </span>
                  </div>

                  <div className="space-y-1.5 mt-2 bg-white/80 p-3 rounded-xl border border-stone-200/80">
                    <div>
                      <strong className="text-stone-700">Câu trả lời của em:</strong>{' '}
                      <span className="font-bold text-stone-900">{ans.studentAnswer || '(Để trống)'}</span>
                    </div>

                    {ans.type === 'multiple_choice' ? (
                      <div>
                        <strong className="text-emerald-800">Đáp án đúng:</strong>{' '}
                        <span className="font-bold text-emerald-900">{ans.correctAnswer}</span>
                      </div>
                    ) : (
                      <div>
                        <strong className="text-emerald-800">Đáp án mẫu gợi ý:</strong>{' '}
                        <span className="font-semibold text-emerald-950">{ans.sampleAnswer}</span>
                      </div>
                    )}

                    <div className="pt-1 text-stone-600 border-t border-stone-100">
                      <strong className="text-stone-700">Giải thích chi tiết:</strong> {ans.explanation}
                    </div>

                    {ans.teacherFeedback && (
                      <div className="text-amber-800 bg-amber-50 p-2 rounded-lg mt-1 font-medium">
                        ✦ <em>Đánh giá hệ thống:</em> {ans.teacherFeedback}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={handleRetry}
                className="px-4 py-2.5 rounded-xl border border-stone-300 font-bold text-xs text-stone-700 hover:bg-stone-100 transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Làm lại bài
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xs transition"
              >
                Đóng & Xem tủ sách
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
