import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle,
  HelpCircle,
  ListOrdered,
  FileQuestion,
} from 'lucide-react';
import { Story, Question, QuestionType } from '../types';

interface QuestionEditorModalProps {
  story: Story;
  isOpen: boolean;
  onClose: () => void;
  onSaveQuestions: (questions: Question[]) => void;
}

export const QuestionEditorModal: React.FC<QuestionEditorModalProps> = ({
  story,
  isOpen,
  onClose,
  onSaveQuestions,
}) => {
  const [questions, setQuestions] = useState<Question[]>(() =>
    story.questions ? JSON.parse(JSON.stringify(story.questions)) : []
  );

  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(
    questions.length > 0 ? questions[0].id : null
  );

  if (!isOpen) return null;

  const handleAddQuestion = (type: QuestionType) => {
    const newQ: Question = {
      id: `q-manual-${Date.now()}`,
      type,
      questionText: '',
      options:
        type === 'multiple_choice'
          ? ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D']
          : undefined,
      correctAnswer: type === 'multiple_choice' ? 'A' : undefined,
      sampleAnswer: type === 'short_answer' ? '' : undefined,
      keywords: type === 'short_answer' ? [] : undefined,
      explanation: 'Giải thích câu trả lời đúng dựa theo nội dung bài đọc.',
    };
    setQuestions([...questions, newQ]);
    setActiveQuestionId(newQ.id);
  };

  const handleRemoveQuestion = (id: string) => {
    const updated = questions.filter((q) => q.id !== id);
    setQuestions(updated);
    if (activeQuestionId === id) {
      setActiveQuestionId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const handleUpdateCurrent = (field: keyof Question, value: any) => {
    if (!activeQuestionId) return;
    setQuestions((prev) =>
      prev.map((q) => (q.id === activeQuestionId ? { ...q, [field]: value } : q))
    );
  };

  const currentQ = questions.find((q) => q.id === activeQuestionId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FFFDF9] border border-[#E7DFCD] rounded-3xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden text-stone-800 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 p-5 text-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-black font-['Quicksand',sans-serif]">
              Soạn câu hỏi đọc hiểu: {story.title}
            </h2>
            <p className="text-xs text-emerald-100">
              Khối Lớp {story.grade} • Hiện có {questions.length} câu hỏi
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thân Modal: Cột trái danh sách câu, Cột phải chi tiết câu */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Cột Trái: Danh sách câu hỏi */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-stone-200 bg-stone-50/70 p-4 flex flex-col shrink-0">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase text-stone-700">
                Danh sách câu ({questions.length})
              </span>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  onClick={() => setActiveQuestionId(q.id)}
                  className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition flex items-center justify-between ${
                    activeQuestionId === q.id
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-white text-stone-700 hover:bg-stone-100 border-stone-200'
                  }`}
                >
                  <span className="truncate">
                    Câu {idx + 1}: {q.type === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveQuestion(q.id);
                    }}
                    className={`p-1 rounded-md transition ${
                      activeQuestionId === q.id
                        ? 'text-emerald-100 hover:text-white'
                        : 'text-red-500 hover:text-red-700'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {questions.length === 0 && (
                <div className="text-center py-6 text-stone-400 text-xs">
                  Chưa có câu hỏi nào. Nhấn nút bên dưới để thêm.
                </div>
              )}
            </div>

            {/* Các nút thêm câu hỏi */}
            <div className="pt-3 border-t border-stone-200 space-y-1.5 mt-2">
              <button
                type="button"
                onClick={() => handleAddQuestion('multiple_choice')}
                className="w-full py-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>+ Câu trắc nghiệm (A,B,C,D)</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddQuestion('short_answer')}
                className="w-full py-2 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-amber-600" />
                <span>+ Câu trả lời ngắn (Tự luận)</span>
              </button>
            </div>
          </div>

          {/* Cột Phải: Trình chỉnh sửa câu hỏi đang chọn */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {currentQ ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                  <span className="text-xs font-black uppercase text-emerald-900 bg-emerald-100 px-2.5 py-1 rounded-lg">
                    {currentQ.type === 'multiple_choice' ? 'Câu hỏi trắc nghiệm' : 'Câu hỏi trả lời ngắn'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(currentQ.id)}
                    className="text-xs text-red-600 hover:underline font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa câu hỏi này</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-stone-700 mb-1">
                    Nội dung câu hỏi *
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Nhập câu hỏi đọc hiểu dành cho học sinh..."
                    value={currentQ.questionText}
                    onChange={(e) => handleUpdateCurrent('questionText', e.target.value)}
                    className="w-full p-3 bg-white border-2 border-stone-200 rounded-xl text-xs sm:text-sm font-semibold text-stone-900 focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>

                {/* Các phương án nếu là trắc nghiệm */}
                {currentQ.type === 'multiple_choice' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase text-stone-700">
                      4 Phương án lựa chọn và Chọn đáp án đúng:
                    </label>
                    {(['A', 'B', 'C', 'D'] as const).map((letter, optIdx) => {
                      const currentVal = (currentQ.options && currentQ.options[optIdx]) || '';
                      const isCorrect = currentQ.correctAnswer === letter;

                      return (
                        <div
                          key={letter}
                          className={`flex items-center gap-2 p-2 rounded-xl border ${
                            isCorrect ? 'bg-emerald-50/80 border-emerald-300' : 'bg-white border-stone-200'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleUpdateCurrent('correctAnswer', letter)}
                            className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center transition cursor-pointer ${
                              isCorrect
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                            }`}
                            title="Bấm để đặt làm đáp án đúng"
                          >
                            {letter}
                          </button>
                          <input
                            type="text"
                            placeholder={`Nội dung phương án ${letter}...`}
                            value={currentVal}
                            onChange={(e) => {
                              const newOpts = [...(currentQ.options || ['', '', '', ''])];
                              newOpts[optIdx] = e.target.value;
                              handleUpdateCurrent('options', newOpts);
                            }}
                            className="flex-1 px-3 py-1.5 bg-transparent text-xs font-semibold text-stone-900 focus:outline-hidden"
                          />
                          {isCorrect && (
                            <span className="text-[11px] font-black text-emerald-700 px-2 py-0.5 bg-emerald-100 rounded-md">
                              Đáp án đúng ✓
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Nếu là câu trả lời ngắn */}
                {currentQ.type === 'short_answer' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-black uppercase text-stone-700 mb-1">
                        Đáp án mẫu gợi ý (Dành cho học sinh đối chiếu sau khi nộp)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Nội dung câu trả lời mẫu hoàn chỉnh..."
                        value={currentQ.sampleAnswer || ''}
                        onChange={(e) => handleUpdateCurrent('sampleAnswer', e.target.value)}
                        className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:border-emerald-600 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase text-stone-700 mb-1">
                        Từ khóa chính (Cách nhau bởi dấu phẩy)
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: giúp đỡ, chia sẻ, yêu thương, chăm chỉ"
                        value={(currentQ.keywords || []).join(', ')}
                        onChange={(e) => {
                          const words = e.target.value
                            .split(',')
                            .map((w) => w.trim())
                            .filter((w) => w.length > 0);
                          handleUpdateCurrent('keywords', words);
                        }}
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:border-emerald-600 focus:outline-hidden"
                      />
                      <span className="text-[11px] text-stone-500 mt-0.5 block">
                        Hệ thống sẽ đối chiếu tự động nếu câu trả lời học sinh có chứa từ khóa này.
                      </span>
                    </div>
                  </div>
                )}

                {/* Giải thích chi tiết */}
                <div>
                  <label className="block text-xs font-black uppercase text-stone-700 mb-1">
                    Lời giải thích cặn kẽ vì sao đúng
                  </label>
                  <input
                    type="text"
                    placeholder="Giải thích dựa theo đoạn văn nào trong bài..."
                    value={currentQ.explanation}
                    onChange={(e) => handleUpdateCurrent('explanation', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-stone-400">
                <FileQuestion className="w-12 h-12 text-stone-300 mb-2" />
                <p className="text-xs font-bold">
                  Chọn một câu hỏi ở danh sách bên trái hoặc bấm nút thêm câu hỏi mới.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-stone-500 font-semibold">
            Tổng cộng: {questions.length} câu hỏi đọc hiểu cho bài này
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-stone-600 font-bold text-xs hover:bg-stone-200 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => {
                onSaveQuestions(questions);
                onClose();
              }}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Lưu danh sách câu hỏi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
