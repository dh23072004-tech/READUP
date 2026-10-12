import React from 'react';
import { Clock, Star, CheckCircle, ArrowRight, BookOpen } from 'lucide-react';
import { Story, QuizSubmission } from '../types';

interface StoryCardProps {
  story: Story;
  studentSubmissions: QuizSubmission[];
  onSelectStory: (story: Story) => void;
}

export const StoryCard: React.FC<StoryCardProps> = ({
  story,
  studentSubmissions,
  onSelectStory,
}) => {
  // Tìm kết quả tốt nhất của học sinh này đối với bài này
  const relevantSubs = studentSubmissions.filter((s) => s.storyId === story.id);
  const bestSubmission = relevantSubs.reduce<QuizSubmission | null>((best, cur) => {
    if (!best) return cur;
    return cur.totalScore > best.totalScore ? cur : best;
  }, null);

  const isCompleted = bestSubmission !== null;

  return (
    <div className="bg-[#FFFDF9] border-2 border-[#E7DFCD] rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 flex flex-col justify-between group">
      <div>
        {/* Cover Image */}
        {story.coverImage ? (
          <div className="relative w-full aspect-16/10 rounded-2xl overflow-hidden mb-3.5 border border-stone-200/80 bg-stone-100 shadow-2xs">
            <img
              src={story.coverImage}
              alt={story.coverImageAlt || `Tranh minh họa truyện ${story.title}`}
              className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
              loading="lazy"
            />
            <span className="absolute top-2.5 left-2.5 text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-xl bg-white/95 backdrop-blur-xs text-emerald-900 border border-emerald-200 shadow-2xs">
              Lớp {story.grade}
            </span>
            <span className="absolute bottom-2.5 right-2.5 text-[11px] font-bold text-stone-700 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-2xs">
              <Clock className="w-3 h-3 text-stone-500" />
              ~{story.estimatedReadMinutes} phút
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200">
              Lớp {story.grade}
            </span>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-lg">
              <Clock className="w-3 h-3 text-stone-400" />
              <span>~{story.estimatedReadMinutes} phút</span>
            </div>
          </div>
        )}

        {/* Title & Category */}
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg leading-none" role="img" aria-label="icon">
              {story.coverEmoji}
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
              {story.category}
            </span>
          </div>

          <h3 className="font-extrabold text-base text-stone-900 group-hover:text-emerald-700 transition leading-snug line-clamp-2">
            {story.title}
          </h3>
        </div>

        {/* Summary text */}
        <p className="text-stone-600 text-xs leading-relaxed line-clamp-2 mb-4">
          {story.summary}
        </p>

        {story.author && (
          <p className="text-[11px] font-semibold text-emerald-800 mb-2 truncate">
            ✍️ {story.author}
          </p>
        )}
      </div>

      {/* Footer Info & Action */}
      <div className="pt-3 border-t border-stone-100">
        <div className="flex items-center justify-between mb-3">
          {isCompleted ? (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Điểm: {bestSubmission.totalScore}/10</span>
              <span className="text-amber-500 flex items-center ml-1">
                {'★'.repeat(bestSubmission.starsEarned)}
              </span>
            </div>
          ) : (
            <span className="text-xs font-semibold text-stone-400 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-stone-300" />
              Chưa đọc
            </span>
          )}

          <span className="text-[11px] font-bold text-stone-500">
            {story.questions && story.questions.length > 0
              ? `${story.questions.length} câu hỏi`
              : 'Đọc mở rộng'}
          </span>
        </div>

        <button
          onClick={() => onSelectStory(story)}
          className="w-full py-2.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs group-hover:shadow-md cursor-pointer"
        >
          <span>{isCompleted ? 'Đọc lại & Rèn luyện' : 'Bắt đầu đọc'}</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
