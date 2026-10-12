import React, { useState } from 'react';
import { Award, Star, Flame, BookOpen, Clock, Calendar, CheckCircle2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { Student, QuizSubmission, Story } from '../types';
import { calculateStudentBadges } from '../data/badges';

interface StudentHistoryProps {
  student: Student;
  submissions: QuizSubmission[];
  stories: Story[];
  onReadStory: (story: Story) => void;
}

export const StudentHistory: React.FC<StudentHistoryProps> = ({
  student,
  submissions,
  stories,
  onReadStory,
}) => {
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);

  const studentSubs = submissions.filter((s) => s.studentId === student.id);
  const badgesWithStatus = calculateStudentBadges(student, submissions);

  const avgScore =
    studentSubs.length > 0
      ? (studentSubs.reduce((acc, cur) => acc + cur.totalScore, 0) / studentSubs.length).toFixed(1)
      : '0.0';

  const uniqueCompletedStoryIds = new Set(studentSubs.map((s) => s.storyId));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-in fade-in duration-300">
      {/* Profile Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-3xl p-6 sm:p-8 text-white shadow-md mb-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-4xl shadow-inner border border-white/30 shrink-0">
            {student.avatar}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <h2 className="text-2xl sm:text-3xl font-black font-['Quicksand',sans-serif]">
                {student.name}
              </h2>
              <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full border border-white/30">
                Mã: {student.id} • Lớp {student.grade}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-emerald-100 font-medium">
              Chào mừng con đến với nhật ký đọc sách cá nhân! Hãy cùng tích lũy thật nhiều sao vàng nhé.
            </p>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <div className="bg-white/15 backdrop-blur-xs rounded-2xl p-3 border border-white/20 text-center">
                <div className="text-xl sm:text-2xl font-black">{uniqueCompletedStoryIds.size}</div>
                <div className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider">Bài đã đọc</div>
              </div>

              <div className="bg-white/15 backdrop-blur-xs rounded-2xl p-3 border border-white/20 text-center">
                <div className="text-xl sm:text-2xl font-black">{avgScore} / 10</div>
                <div className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider">Điểm trung bình</div>
              </div>

              <div className="bg-white/15 backdrop-blur-xs rounded-2xl p-3 border border-white/20 text-center">
                <div className="text-xl sm:text-2xl font-black flex items-center justify-center gap-1 text-amber-300">
                  <Star className="w-4 h-4 fill-amber-300 inline" />
                  {student.totalStars}
                </div>
                <div className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider">Sao vàng</div>
              </div>

              <div className="bg-white/15 backdrop-blur-xs rounded-2xl p-3 border border-white/20 text-center">
                <div className="text-xl sm:text-2xl font-black flex items-center justify-center gap-1 text-orange-300">
                  <Flame className="w-4 h-4 fill-orange-300 inline" />
                  {student.streakDays} ngày
                </div>
                <div className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider">Chuỗi đọc</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Badges Section */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-700" />
            <h3 className="text-lg font-black text-stone-900 font-['Quicksand',sans-serif]">
              Bộ sưu tập Huy hiệu ({badgesWithStatus.filter((b) => b.unlocked).length}/{badgesWithStatus.length})
            </h3>
          </div>
          <span className="text-xs text-stone-500 font-semibold">
            Đọc bài và đạt điểm cao để mở khóa
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {badgesWithStatus.map((badge) => (
            <div
              key={badge.id}
              className={`p-4 rounded-2xl border-2 text-center transition flex flex-col items-center justify-between ${
                badge.unlocked
                  ? 'bg-[#FFFDF9] border-emerald-300 shadow-xs'
                  : 'bg-stone-100/60 border-stone-200 opacity-60'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-2 ${
                  badge.unlocked ? 'bg-emerald-100 shadow-xs' : 'bg-stone-200 grayscale'
                }`}
              >
                {badge.icon}
              </div>
              <div>
                <h4 className="text-xs font-black text-stone-900 leading-tight mb-1">
                  {badge.title}
                </h4>
                <p className="text-[10px] text-stone-500 leading-tight line-clamp-2">
                  {badge.description}
                </p>
              </div>
              <span
                className={`mt-2 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  badge.unlocked
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-stone-200 text-stone-600'
                }`}
              >
                {badge.unlocked ? '✓ Đã đạt' : '🔒 Khóa'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Reading History */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-700" />
            <h3 className="text-lg font-black text-stone-900 font-['Quicksand',sans-serif]">
              Lịch sử làm bài đọc hiểu ({studentSubs.length} lần)
            </h3>
          </div>
        </div>

        {studentSubs.length === 0 ? (
          <div className="bg-[#FFFDF9] border-2 border-dashed border-stone-300 rounded-3xl p-8 text-center">
            <BookOpen className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h4 className="font-extrabold text-stone-700 text-base mb-1">
              Chưa có lượt làm bài nào
            </h4>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mb-4">
              Hãy ghé qua Tủ sách số và chọn một câu chuyện thú vị để bắt đầu hành trình đọc sách nhé!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {studentSubs.map((sub) => {
              const isExpanded = expandedSubId === sub.id;
              const formattedDate = new Date(sub.submittedAt).toLocaleString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              });

              const targetStory = stories.find((s) => s.id === sub.storyId);

              return (
                <div
                  key={sub.id}
                  className="bg-[#FFFDF9] border-2 border-[#E7DFCD] rounded-2xl overflow-hidden transition"
                >
                  <div
                    onClick={() => setExpandedSubId(isExpanded ? null : sub.id)}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-stone-50/60"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                          Lớp {sub.grade}
                        </span>
                        <span className="text-xs text-stone-500 flex items-center gap-1 font-semibold">
                          <Calendar className="w-3 h-3 text-stone-400" />
                          {formattedDate}
                        </span>
                      </div>
                      <h4 className="text-base font-black text-stone-900">
                        {sub.storyTitle}
                      </h4>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-lg font-black text-emerald-700">
                          {sub.totalScore} / {sub.maxScore} đ
                        </div>
                        <div className="text-xs text-amber-500 font-bold">
                          {'★'.repeat(sub.starsEarned)}
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-stone-100 text-stone-500">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 border-t border-stone-200 bg-[#FAF8F2] space-y-3">
                      {sub.teacherNote && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                          <strong className="font-bold">Lời phê của giáo viên:</strong> {sub.teacherNote}
                        </div>
                      )}

                      <h5 className="font-extrabold text-xs uppercase tracking-wider text-stone-700 pt-1">
                        Chi tiết câu trả lời:
                      </h5>

                      <div className="space-y-2">
                        {sub.answers.map((ans, idx) => (
                          <div
                            key={ans.questionId}
                            className="p-3 rounded-xl bg-white border border-stone-200 text-xs"
                          >
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <span className="font-extrabold text-stone-800">
                                Câu {idx + 1}: {ans.questionText}
                              </span>
                              <span
                                className={`font-black px-2 py-0.5 rounded-md text-[11px] ${
                                  ans.score >= 1.5
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {ans.score}/{ans.maxScore} đ
                              </span>
                            </div>
                            <div className="text-stone-700 mt-1">
                              <strong>Em trả lời:</strong>{' '}
                              <span className="font-semibold">{ans.studentAnswer || '(Trống)'}</span>
                            </div>
                            <div className="text-emerald-800 mt-0.5">
                              <strong>Đáp án đúng/mẫu:</strong>{' '}
                              <span>{ans.correctAnswer || ans.sampleAnswer}</span>
                            </div>
                            {ans.teacherFeedback && (
                              <div className="text-[11px] text-stone-500 mt-1 italic">
                                Nhận xét: {ans.teacherFeedback}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {targetStory && (
                        <div className="pt-2 text-right">
                          <button
                            onClick={() => onReadStory(targetStory)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition"
                          >
                            Đọc lại câu chuyện này
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
