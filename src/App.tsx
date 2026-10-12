import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Sparkles,
  Award,
  Flame,
  Star,
  Users,
  Compass,
  CheckCircle,
  HelpCircle,
  LogIn,
} from 'lucide-react';
import { Student, Story, QuizSubmission, UserRole, GradeLevel } from './types';
import {
  getStoredStudents,
  saveStudents,
  getStoredStories,
  saveStories,
  getStoredSubmissions,
  saveSubmissions,
  getStoredSession,
  saveSession,
} from './utils/storage';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { StoryCard } from './components/StoryCard';
import { StoryReader } from './components/StoryReader';
import { QuizModal } from './components/QuizModal';
import { StudentHistory } from './components/StudentHistory';
import { TeacherPortal } from './components/TeacherPortal';
import { GuideModal } from './components/GuideModal';

export default function App() {
  // Master state
  const [students, setStudents] = useState<Student[]>(() => getStoredStudents());
  const [stories, setStories] = useState<Story[]>(() => getStoredStories());
  const [submissions, setSubmissions] = useState<QuizSubmission[]>(() => getStoredSubmissions());
  const [session, setSession] = useState<{ role: UserRole; studentId?: string }>(() =>
    getStoredSession()
  );

  // Navigation & Filters
  const [activeTab, setActiveTab] = useState<'library' | 'progress' | 'teacher'>('library');
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Reader & Quiz view state
  const [readingStory, setReadingStory] = useState<Story | null>(null);
  const [isQuizOpen, setIsQuizOpen] = useState(false);

  // Modals state
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Sync to storage on updates
  useEffect(() => {
    saveStudents(students);
  }, [students]);

  useEffect(() => {
    saveStories(stories);
  }, [stories]);

  useEffect(() => {
    saveSubmissions(submissions);
  }, [submissions]);

  useEffect(() => {
    saveSession(session);
  }, [session]);

  // Current logged in student
  const currentStudent =
    session.role === 'student' && session.studentId
      ? students.find((s) => s.id === session.studentId) || students[0] || null
      : null;

  // Handle switching active student
  const handleSelectStudent = (studentId: string) => {
    setSession({ role: 'student', studentId });
    setActiveTab('library');
    setReadingStory(null);
  };

  // Handle switching to teacher portal
  const handleSelectTeacher = () => {
    setSession({ role: 'teacher' });
    setActiveTab('teacher');
    setReadingStory(null);
  };

  // Handle logout
  const handleLogout = () => {
    setSession({ role: 'student', studentId: 'HS001' });
    setActiveTab('library');
    setReadingStory(null);
  };

  // Handle student submitting a quiz
  const handleCompleteQuiz = (submission: QuizSubmission) => {
    // 1. Save submission to history
    const newSubmissions = [submission, ...submissions];
    setSubmissions(newSubmissions);

    // 2. Award stars and XP to current student
    if (currentStudent) {
      const updatedStudent: Student = {
        ...currentStudent,
        totalStars: currentStudent.totalStars + submission.starsEarned,
        xp: currentStudent.xp + submission.xpEarned,
      };

      const updatedStudents = students.map((s) =>
        s.id === updatedStudent.id ? updatedStudent : s
      );
      setStudents(updatedStudents);
    }
  };

  // Filtered stories for library
  // Học sinh chỉ xem các truyện giáo viên đã cho phép xuất bản (isPublished !== false)
  const availableStoriesForStudents = stories.filter(
    (s) => s.isPublished !== false
  );

  const categories = Array.from(new Set(availableStoriesForStudents.map((s) => s.category)));

  const filteredStories = availableStoriesForStudents.filter((story) => {
    const matchGrade = selectedGrade === 'all' || story.grade === selectedGrade;
    const matchCategory = selectedCategory === 'all' || story.category === selectedCategory;
    const matchSearch =
      story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (story.author && story.author.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchGrade && matchCategory && matchSearch;
  });

  // Submissions for current student
  const currentStudentSubmissions = currentStudent
    ? submissions.filter((s) => s.studentId === currentStudent.id)
    : [];

  return (
    <div className="min-h-screen bg-[#FAF8F2] text-[#243324] flex flex-col font-['Nunito',sans-serif]">
      {/* Global Child-Friendly Navbar */}
      <Navbar
        role={session.role}
        currentStudent={currentStudent}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setReadingStory(null);
        }}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 pb-16">
        {/* VIEW 1: STORY READER VIEW */}
        {readingStory ? (
          <StoryReader
            story={readingStory}
            onBack={() => setReadingStory(null)}
            onStartQuiz={() => setIsQuizOpen(true)}
          />
        ) : activeTab === 'teacher' ? (
          /* VIEW 2: TEACHER DASHBOARD */
          <TeacherPortal
            students={students}
            stories={stories}
            submissions={submissions}
            onUpdateStudents={setStudents}
            onUpdateSubmissions={setSubmissions}
            onUpdateStories={setStories}
            onSwitchToStudent={(id) => {
              handleSelectStudent(id);
              setActiveTab('library');
            }}
          />
        ) : activeTab === 'progress' && currentStudent ? (
          /* VIEW 3: STUDENT PROGRESS & BADGES */
          <StudentHistory
            student={currentStudent}
            submissions={submissions}
            stories={stories}
            onReadStory={(s) => setReadingStory(s)}
          />
        ) : (
          /* VIEW 4: DIGITAL BOOKSHELF / LIBRARY */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 animate-in fade-in duration-300">
            {/* Hero Welcome Banner */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-3xl p-6 sm:p-10 text-white shadow-md relative overflow-hidden mb-8">
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-3 border border-white/25">
                  <Sparkles className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                  <span>Hành trình khám phá tri thức</span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-black font-['Quicksand',sans-serif] tracking-tight leading-tight">
                  Chào mừng {currentStudent ? currentStudent.name : 'các bạn nhỏ'} đến với ReadUp!
                </h1>

                <p className="text-xs sm:text-sm text-emerald-100 font-medium mt-2 leading-relaxed">
                  Hành trình đọc sách số dành cho học sinh trường Tiểu học Ngô Sĩ Liên. Cùng đọc những câu chuyện tiếng Việt nhân văn, rèn luyện kỹ năng đọc hiểu và rinh về thật nhiều huy hiệu sao vàng lấp lánh nhé!
                </p>

                {currentStudent && (
                  <div className="flex flex-wrap items-center gap-3 mt-5">
                    <div className="bg-white/20 backdrop-blur-xs px-4 py-2 rounded-2xl border border-white/20 flex items-center gap-2 text-xs font-bold">
                      <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
                      <span>{currentStudent.totalStars} Sao vàng</span>
                    </div>

                    <div className="bg-white/20 backdrop-blur-xs px-4 py-2 rounded-2xl border border-white/20 flex items-center gap-2 text-xs font-bold">
                      <Flame className="w-4 h-4 fill-orange-300 text-orange-300" />
                      <span>{currentStudent.streakDays} Ngày đọc liên tiếp</span>
                    </div>

                    <button
                      onClick={() => setActiveTab('progress')}
                      className="px-4 py-2 rounded-2xl bg-white text-emerald-900 font-extrabold text-xs hover:bg-emerald-50 transition shadow-xs flex items-center gap-1.5"
                    >
                      <Award className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Xem huy hiệu của em</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Decorative Mascot / Graphic */}
              <div className="absolute right-4 -bottom-4 text-8xl sm:text-9xl opacity-20 lg:opacity-30 pointer-events-none select-none">
                📚
              </div>
            </div>

            {/* Filter and Shelf Controls */}
            <div className="bg-[#FFFDF9] border-2 border-[#E7DFCD] rounded-3xl p-4 sm:p-6 mb-8 shadow-xs">
              {/* Grade Selector Tabs: Lớp 1 -> Lớp 5 */}
              <div className="mb-5">
                <label className="block text-xs font-black uppercase tracking-wider text-stone-500 mb-2">
                  Chọn khối lớp học:
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setSelectedGrade('all')}
                    className={`px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition ${
                      selectedGrade === 'all'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-[#FAF7F0] text-stone-700 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200'
                    }`}
                  >
                    Tất cả các lớp
                  </button>

                  {([1, 2, 3, 4, 5] as GradeLevel[]).map((grade) => (
                    <button
                      key={grade}
                      onClick={() => setSelectedGrade(grade)}
                      className={`px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition flex items-center gap-1.5 ${
                        selectedGrade === grade
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-[#FAF7F0] text-stone-700 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200'
                      }`}
                    >
                      <span>Lớp {grade}</span>
                      {currentStudent?.grade === grade && (
                        <span className="text-[10px] bg-amber-400 text-amber-950 px-1.5 py-0.2 rounded-md font-extrabold">
                          Lớp của em
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Secondary Filters: Search & Category */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-stone-100">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm tên câu chuyện, bài học hoặc chủ đề..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FAF7F0] border-2 border-stone-200 rounded-2xl text-xs font-bold text-stone-900 focus:border-emerald-500 focus:outline-hidden transition"
                  />
                </div>

                {/* Categories */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                  <span className="text-xs font-bold text-stone-400 shrink-0 hidden md:inline">
                    Chủ đề:
                  </span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 bg-[#FAF7F0] border-2 border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:border-emerald-500 focus:outline-hidden"
                  >
                    <option value="all">Tất cả chủ đề</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Story Cards Grid */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-black text-stone-900 font-['Quicksand',sans-serif] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-700" />
                <span>
                  Tủ sách số ({filteredStories.length} câu chuyện phù hợp)
                </span>
              </h2>

              <button
                onClick={() => setIsGuideOpen(true)}
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Cách đọc và làm bài</span>
              </button>
            </div>

            {stories.length === 0 ? (
              <div className="bg-[#FFFDF9] border-2 border-dashed border-emerald-300 rounded-3xl p-10 sm:p-14 text-center shadow-xs">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-4xl mb-4 shadow-inner">
                  📚
                </div>
                <h3 className="font-black text-emerald-950 text-lg sm:text-xl mb-2 font-['Quicksand',sans-serif]">
                  Thư viện chưa có sách. Giáo viên hãy tải sách lên để bắt đầu.
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 max-w-lg mx-auto mb-6 leading-relaxed">
                  Ứng dụng tuyệt đối không tự sáng tác hoặc tự thêm truyện mẫu. Thầy/Cô vui lòng chuyển sang mục <strong>"Góc Giáo viên"</strong> để tải lên các tệp bài đọc (TXT, JSON, tranh ảnh, PDF) cho học sinh.
                </p>
                <button
                  onClick={() => setActiveTab('teacher')}
                  className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-sm transition inline-flex items-center gap-2 cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>Vào Góc Giáo viên để tải sách lên ngay</span>
                </button>
              </div>
            ) : filteredStories.length === 0 ? (
              <div className="bg-[#FFFDF9] border-2 border-dashed border-stone-300 rounded-3xl p-12 text-center">
                <div className="text-4xl mb-3">🔍</div>
                <h3 className="font-extrabold text-stone-800 text-base mb-1">
                  Không tìm thấy bài đọc phù hợp
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto mb-4">
                  Em hãy thử chọn "Tất cả các lớp" hoặc nhập từ khóa tìm kiếm khác nhé!
                </p>
                <button
                  onClick={() => {
                    setSelectedGrade('all');
                    setSelectedCategory('all');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl"
                >
                  Xem lại tất cả bài đọc
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStories.map((story) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                    studentSubmissions={currentStudentSubmissions}
                    onSelectStory={(s) => setReadingStory(s)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#FFFDF9] border-t border-[#E6E0D2] py-8 text-center text-xs text-stone-500 font-medium">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <div className="flex items-center justify-center gap-2 font-extrabold text-stone-700 font-['Quicksand',sans-serif]">
            <span>ReadUp – Hành trình đọc sách số dành cho học sinh Ngô Sĩ Liên</span>
          </div>
          <p className="text-[11px] text-stone-400">
            Ứng dụng chạy trực tiếp bằng React & localStorage • Không gọi AI API trả phí • Miễn phí & thân thiện với trẻ em.
          </p>
          <div className="flex items-center justify-center gap-4 text-stone-400 text-[11px] pt-1">
            <button onClick={() => setIsGuideOpen(true)} className="hover:text-emerald-700 underline">
              Hướng dẫn sử dụng & Giới hạn
            </button>
            <span>•</span>
            <button onClick={() => setIsLoginOpen(true)} className="hover:text-emerald-700 underline">
              Đổi tài khoản đăng nhập
            </button>
          </div>
        </div>
      </footer>

      {/* Interactive Quiz Modal */}
      {readingStory && isQuizOpen && currentStudent && (
        <QuizModal
          story={readingStory}
          currentStudent={currentStudent}
          isOpen={isQuizOpen}
          onClose={() => setIsQuizOpen(false)}
          onCompleteQuiz={handleCompleteQuiz}
          onReviewStory={() => setIsQuizOpen(false)}
        />
      )}

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        students={students}
        onSelectStudent={handleSelectStudent}
        onSelectTeacher={handleSelectTeacher}
      />

      {/* User Guide Modal */}
      <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}
