import React from 'react';
import { BookOpen, Sparkles, User, Award, HelpCircle, LogOut, Flame, ShieldAlert } from 'lucide-react';
import { Student, UserRole } from '../types';

interface NavbarProps {
  role: UserRole;
  currentStudent: Student | null;
  activeTab: 'library' | 'progress' | 'teacher';
  setActiveTab: (tab: 'library' | 'progress' | 'teacher') => void;
  onOpenLogin: () => void;
  onOpenGuide: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  role,
  currentStudent,
  activeTab,
  setActiveTab,
  onOpenLogin,
  onOpenGuide,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-[#E6E0D2] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('library')}>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 transform transition hover:scale-105">
              <BookOpen className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-2xl tracking-tight text-emerald-950 font-['Quicksand',sans-serif]">
                  Read<span className="text-emerald-600">Up</span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                  Ngô Sĩ Liên
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium hidden sm:block">
                Hành trình đọc sách số dành cho học sinh Lớp 1 – Lớp 5
              </p>
            </div>
          </div>

          {/* Navigation Links for Desktop */}
          <nav className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setActiveTab('library')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
                activeTab === 'library'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-700 hover:bg-emerald-50 hover:text-emerald-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Tủ sách số
            </button>

            {role === 'student' && (
              <button
                onClick={() => setActiveTab('progress')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
                  activeTab === 'progress'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-stone-700 hover:bg-emerald-50 hover:text-emerald-800'
                }`}
              >
                <Award className="w-4 h-4" />
                Hành trình của em
              </button>
            )}

            <button
              onClick={() => setActiveTab('teacher')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
                activeTab === 'teacher'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-stone-700 hover:bg-amber-50 hover:text-amber-800'
              }`}
            >
              <User className="w-4 h-4" />
              Góc Giáo viên
            </button>

            <button
              onClick={onOpenGuide}
              className="px-3 py-2 rounded-xl text-sm font-semibold text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition flex items-center gap-1.5"
              title="Hướng dẫn sử dụng & Lưu ý"
            >
              <HelpCircle className="w-4 h-4 text-emerald-600" />
              <span>Hướng dẫn</span>
            </button>
          </nav>

          {/* User Profile / Status pill */}
          <div className="flex items-center gap-2 sm:gap-3">
            {role === 'student' && currentStudent ? (
              <div className="flex items-center gap-2 bg-[#F3EFE6] border border-[#DDD5C5] rounded-2xl px-2.5 py-1.5 shadow-2xs">
                <span className="text-2xl leading-none" role="img" aria-label="avatar">
                  {currentStudent.avatar}
                </span>
                <div className="hidden sm:block text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-stone-900 leading-tight">
                      {currentStudent.name}
                    </span>
                    <span className="text-[10px] bg-emerald-700 text-white font-bold px-1.5 py-0.2 rounded-md">
                      Lớp {currentStudent.grade}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-stone-600 font-semibold mt-0.5">
                    <span className="flex items-center gap-0.5 text-amber-700 font-bold">
                      <Sparkles className="w-3 h-3 fill-amber-400 text-amber-500 inline" />
                      {currentStudent.totalStars} sao
                    </span>
                    <span className="flex items-center gap-0.5 text-orange-600 font-bold">
                      <Flame className="w-3 h-3 fill-orange-400 text-orange-500 inline" />
                      {currentStudent.streakDays} ngày
                    </span>
                  </div>
                </div>

                <button
                  onClick={onOpenLogin}
                  className="ml-1 p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 transition"
                  title="Đổi tài khoản học sinh"
                >
                  <User className="w-4 h-4" />
                </button>
              </div>
            ) : role === 'teacher' ? (
              <div className="flex items-center gap-2 bg-amber-100 border border-amber-300 rounded-2xl px-3 py-1.5 text-amber-950 font-bold text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span>Chế độ Giáo viên</span>
                <button
                  onClick={onLogout}
                  className="ml-1 text-stone-500 hover:text-stone-900 p-1"
                  title="Thoát chế độ giáo viên"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition flex items-center gap-1.5"
              >
                <User className="w-4 h-4" />
                <span>Đăng nhập</span>
              </button>
            )}

            {/* Mobile Menu Button & Help */}
            <button
              onClick={onOpenGuide}
              className="md:hidden p-2 rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200"
              title="Hướng dẫn"
            >
              <HelpCircle className="w-5 h-5 text-emerald-700" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sub-bar */}
      <div className="md:hidden flex items-center justify-around border-t border-[#EBE4D5] bg-[#FAF7F0] px-2 py-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('library')}
          className={`flex-1 py-1.5 text-center rounded-lg ${
            activeTab === 'library' ? 'bg-emerald-600 text-white' : 'text-stone-600'
          }`}
        >
          Tủ sách
        </button>
        {role === 'student' && (
          <button
            onClick={() => setActiveTab('progress')}
            className={`flex-1 py-1.5 text-center rounded-lg ${
              activeTab === 'progress' ? 'bg-emerald-600 text-white' : 'text-stone-600'
            }`}
          >
            Tiến trình
          </button>
        )}
        <button
          onClick={() => setActiveTab('teacher')}
          className={`flex-1 py-1.5 text-center rounded-lg ${
            activeTab === 'teacher' ? 'bg-amber-600 text-white' : 'text-stone-600'
          }`}
        >
          Giáo viên
        </button>
      </div>

      {/* Safety Notice Strip */}
      <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 py-1 text-center text-[11px] text-amber-900 font-medium flex items-center justify-center gap-1.5">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span>
          Phiên bản thử nghiệm (Demo) chạy trực tiếp trong trình duyệt bằng localStorage. Không bảo mật & không đồng bộ qua mạng.
        </span>
      </div>
    </header>
  );
};
