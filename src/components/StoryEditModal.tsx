import React, { useState } from 'react';
import {
  X,
  CheckCircle,
  Image,
  Upload,
} from 'lucide-react';
import { Story, GradeLevel } from '../types';
import { readImageFileDataUri } from '../utils/fileParser';

interface StoryEditModalProps {
  story: Story;
  isOpen: boolean;
  onClose: () => void;
  onSaveStory: (updated: Story) => void;
}

export const StoryEditModal: React.FC<StoryEditModalProps> = ({
  story,
  isOpen,
  onClose,
  onSaveStory,
}) => {
  const [title, setTitle] = useState(story.title);
  const [grade, setGrade] = useState<GradeLevel>(story.grade);
  const [category, setCategory] = useState(story.category);
  const [author, setAuthor] = useState(story.author || '');
  const [summary, setSummary] = useState(story.summary);
  const [content, setContent] = useState(story.content.join('\n\n'));
  const [moralLesson, setMoralLesson] = useState(story.moralLesson || '');
  const [coverImage, setCoverImage] = useState(story.coverImage || '');
  const [isPublished, setIsPublished] = useState(story.isPublished !== false);
  const [displayOrder, setDisplayOrder] = useState<number>(story.displayOrder || 0);

  if (!isOpen) return null;

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const uri = await readImageFileDataUri(file);
      setCoverImage(uri);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const paragraphs = content
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const updated: Story = {
      ...story,
      title: title.trim(),
      grade,
      category: category.trim(),
      author: author.trim() || undefined,
      summary: summary.trim(),
      content: paragraphs.length > 0 ? paragraphs : story.content,
      moralLesson: moralLesson.trim() || undefined,
      coverImage: coverImage || undefined,
      isPublished,
      displayOrder: Number(displayOrder) || 0,
    };

    onSaveStory(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FFFDF9] border border-[#E7DFCD] rounded-3xl shadow-2xl max-w-2xl w-full my-auto overflow-hidden text-stone-800 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 p-5 text-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-black font-['Quicksand',sans-serif]">
              Chỉnh sửa thông tin bài đọc
            </h2>
            <p className="text-xs text-emerald-100">
              Cập nhật thông tin, nội dung và trạng thái hiển thị đối với học sinh
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-black uppercase text-stone-700 mb-1">
                Tên bài đọc / Cuốn sách *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border-2 border-stone-200 rounded-xl font-bold text-stone-900 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-stone-700 mb-1">
                Khối lớp *
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(parseInt(e.target.value, 10) as GradeLevel)}
                className="w-full px-3 py-2.5 bg-white border-2 border-stone-200 rounded-xl font-bold text-stone-900 focus:border-emerald-600 focus:outline-hidden"
              >
                {[1, 2, 3, 4, 5].map((g) => (
                  <option key={g} value={g}>
                    Khối Lớp {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-stone-700 mb-1">
                Tác giả / Người biên soạn
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-3 py-2 bg-white border-2 border-stone-200 rounded-xl font-semibold text-stone-900 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-stone-700 mb-1">
                Thể loại / Chủ đề
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white border-2 border-stone-200 rounded-xl font-semibold text-stone-900 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Trạng thái xuất bản & Thứ tự hiển thị */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-isPublished"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="edit-isPublished" className="text-xs font-black text-emerald-950 cursor-pointer">
                Xuất bản (Cho phép học sinh nhìn thấy và đọc)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-stone-700 whitespace-nowrap">
                Thứ tự hiển thị:
              </label>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
                className="w-20 px-2 py-1 bg-white border border-stone-300 rounded-lg text-xs font-bold text-stone-800"
              />
            </div>
          </div>

          {/* Ảnh bìa */}
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {coverImage ? (
                <img
                  src={coverImage}
                  alt="Bìa"
                  className="w-16 h-12 rounded-lg object-cover border border-stone-300"
                />
              ) : (
                <div className="w-16 h-12 rounded-lg bg-stone-200 flex items-center justify-center text-xs text-stone-500 font-bold">
                  Chưa có bìa
                </div>
              )}
              <div>
                <span className="font-black text-xs text-stone-800 block">
                  Ảnh bìa sách
                </span>
                {coverImage && (
                  <button
                    type="button"
                    onClick={() => setCoverImage('')}
                    className="text-[11px] text-red-600 hover:underline"
                  >
                    Gỡ ảnh bìa
                  </button>
                )}
              </div>
            </div>

            <label className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl cursor-pointer transition flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5" />
              <span>Đổi ảnh bìa</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Tóm tắt */}
          <div>
            <label className="block text-xs font-black uppercase text-stone-700 mb-1">
              Tóm tắt / Lời dẫn
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full px-3 py-2 bg-white border-2 border-stone-200 rounded-xl font-medium text-stone-900 focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          {/* Nội dung */}
          <div>
            <label className="block text-xs font-black uppercase text-stone-700 mb-1">
              Nội dung bài đọc (Mỗi đoạn cách nhau một dòng trống)
            </label>
            <textarea
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-3 bg-white border-2 border-stone-200 rounded-xl font-normal leading-relaxed text-stone-900 focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          {/* Bài học rút ra */}
          <div>
            <label className="block text-xs font-black uppercase text-stone-700 mb-1">
              Bài học rút ra (Hiển thị trang kết thúc cuốn sách)
            </label>
            <input
              type="text"
              value={moralLesson}
              onChange={(e) => setMoralLesson(e.target.value)}
              className="w-full px-3 py-2 bg-white border-2 border-stone-200 rounded-xl font-medium text-stone-900 focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          {/* Footer nút hành động */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-stone-600 font-bold text-xs hover:bg-stone-100 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
