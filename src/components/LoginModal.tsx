import React, { useState } from 'react';
import { X, User, KeyRound, AlertTriangle, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { Student } from '../types';
import { TEACHER_DEMO_CODE } from '../data/defaultStudents';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onSelectStudent: (studentId: string) => void;
  onSelectTeacher: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  students,
  onSelectStudent,
  onSelectTeacher,
}) => {
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');
  const [studentCodeInput, setStudentCodeInput] = useState('');
  const [teacherPinInput, setTeacherPinInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = studentCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMessage('Vui lòng nhập mã học sinh (ví dụ: HS001, HS002)');
      return;
    }
    const found = students.find((s) => s.id.toUpperCase() === cleanCode);
    if (!found) {
      setErrorMessage(`Không tìm thấy mã học sinh "${cleanCode}". Vui lòng thử HS001, HS002 hoặc bấm chọn bên dưới.`);
      return;
    }
    setErrorMessage('');
    onSelectStudent(found.id);
    onClose();
  };

  const handleTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (teacherPinInput.trim() === TEACHER_DEMO_CODE) {
      setErrorMessage('');
      onSelectTeacher();
      onClose();
    } else {
      setErrorMessage('Mã PIN giáo viên demo không chính xác. Mã dùng thử mặc định là: 1234');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FFFDF9] border border-[#E6DEC9] rounded-3xl shadow-2xl max-w-md w-full overflow-hidden text-stone-800">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🎒</span>
            <h2 className="text-2xl font-black font-['Quicksand',sans-serif]">Đăng nhập ReadUp</h2>
          </div>
          <p className="text-emerald-100 text-xs">
            Hành trình đọc sách số cho học sinh tiểu học
          </p>
        </div>

        {/* Security Warning Notice */}
        <div className="bg-amber-50 p-4 border-b border-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <strong className="font-bold">Lưu ý quan trọng:</strong> Đây là bản chạy thử nghiệm (Demo) trong trình duyệt bằng <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-amber-950">localStorage</code>. 
            Đăng nhập này <span className="underline font-bold">không có bảo mật</span> và không dùng mật khẩu thật. Dữ liệu chỉ lưu trên thiết bị này.
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 bg-stone-50/50 p-1 m-3 rounded-2xl">
          <button
            onClick={() => {
              setActiveTab('student');
              setErrorMessage('');
            }}
            className={`flex-1 py-2.5 text-sm font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'student'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <User className="w-4 h-4" />
            Dành cho Học sinh
          </button>
          <button
            onClick={() => {
              setActiveTab('teacher');
              setErrorMessage('');
            }}
            className={`flex-1 py-2.5 text-sm font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'teacher'
                ? 'bg-white text-amber-800 shadow-sm'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            Khu vực Giáo viên
          </button>
        </div>

        {/* Content */}
        <div className="p-6 pt-2">
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <span className="shrink-0 text-red-600">⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'student' ? (
            <div>
              <form onSubmit={handleStudentSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Nhập mã học sinh của em
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={studentCodeInput}
                      onChange={(e) => setStudentCodeInput(e.target.value.toUpperCase())}
                      placeholder="Ví dụ: HS001 hoặc HS002"
                      className="w-full px-4 py-3 bg-[#FAF8F3] border-2 border-stone-300 rounded-2xl text-stone-900 font-bold focus:border-emerald-500 focus:outline-hidden text-base tracking-wider transition uppercase"
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl shadow-md transition transform active:scale-98 flex items-center justify-center gap-2 text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  Bắt đầu học ngay
                </button>
              </form>

              {/* Quick sample account list */}
              <div className="mt-5 pt-4 border-t border-stone-200">
                <p className="text-xs font-bold text-stone-500 mb-2">
                  Hoặc bấm chọn tài khoản mẫu có sẵn:
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {students.slice(0, 6).map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => {
                        onSelectStudent(student.id);
                        onClose();
                      }}
                      className="text-left p-2.5 rounded-xl border border-stone-200 bg-[#FAF7F0] hover:bg-emerald-50 hover:border-emerald-300 transition flex items-center gap-2"
                    >
                      <span className="text-xl shrink-0">{student.avatar}</span>
                      <div className="truncate">
                        <div className="text-xs font-extrabold text-stone-900 truncate">
                          {student.name}
                        </div>
                        <div className="text-[10px] text-stone-500 font-bold">
                          {student.id} • Lớp {student.grade}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <form onSubmit={handleTeacherSubmit} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Mã PIN Giáo Viên Demo
                    </label>
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                      Mã mẫu: 1234
                    </span>
                  </div>
                  <input
                    type="password"
                    maxLength={10}
                    value={teacherPinInput}
                    onChange={(e) => setTeacherPinInput(e.target.value)}
                    placeholder="Nhập 1234"
                    className="w-full px-4 py-3 bg-[#FAF8F3] border-2 border-stone-300 rounded-2xl text-stone-900 font-bold focus:border-amber-500 focus:outline-hidden text-base tracking-widest text-center transition"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-2xl shadow-md transition transform active:scale-98 flex items-center justify-center gap-2 text-sm"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Vào Cổng Quản Lý Giáo Viên
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTeacherPinInput('1234');
                    onSelectTeacher();
                    onClose();
                  }}
                  className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition"
                >
                  Bấm để điền nhanh mã demo 1234
                </button>
              </form>

              <div className="mt-4 p-3 bg-stone-100 rounded-xl text-[11px] text-stone-600 leading-relaxed">
                <CheckCircle2 className="w-3.5 h-3.5 text-stone-500 inline mr-1" />
                Trong cổng giáo viên, thầy cô có thể xem câu trả lời của từng học sinh, chấm lại câu tự luận, xuất tệp CSV điểm và sao lưu dữ liệu.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
