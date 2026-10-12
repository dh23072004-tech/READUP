import React, { useState } from 'react';
import {
  Users,
  FileText,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Plus,
  Edit2,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  Search,
  BookOpen,
  Filter,
  Save,
  X,
  ExternalLink,
  Eye,
  EyeOff,
  Image,
  ArrowUpDown,
  BookCheck,
} from 'lucide-react';
import { Student, Story, QuizSubmission, GradeLevel, Question } from '../types';
import { exportStudentsSummaryCSV, exportDetailedSubmissionsCSV, exportSubmissionsReportCSV } from '../utils/csvExport';
import { downloadBackupJSON, restoreFromBackupJSON, resetAllToDefault, clearAllStorage } from '../utils/storage';
import { TeacherUploadModal } from './TeacherUploadModal';
import { StoryEditModal } from './StoryEditModal';
import { QuestionEditorModal } from './QuestionEditorModal';
import { StoryReader } from './StoryReader';

interface TeacherPortalProps {
  students: Student[];
  stories: Story[];
  submissions: QuizSubmission[];
  onUpdateStudents: (newStudents: Student[]) => void;
  onUpdateSubmissions: (newSubmissions: QuizSubmission[]) => void;
  onUpdateStories: (newStories: Story[]) => void;
  onSwitchToStudent: (studentId: string) => void;
}

export const TeacherPortal: React.FC<TeacherPortalProps> = ({
  students,
  stories,
  submissions,
  onUpdateStudents,
  onUpdateSubmissions,
  onUpdateStories,
  onSwitchToStudent,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'students' | 'submissions' | 'stories' | 'data'>('students');

  // Filters
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<number | 'all'>('all');
  const [selectedStoryFilter, setSelectedStoryFilter] = useState<string | 'all'>('all');
  const [selectedStudentIdFilter, setSelectedStudentIdFilter] = useState<string | 'all'>('all');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Modals state
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // New Student Form
  const [newStudentId, setNewStudentId] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGrade, setNewStudentGrade] = useState<GradeLevel>(2);
  const [newStudentAvatar, setNewStudentAvatar] = useState('🐱');
  const [addStudentError, setAddStudentError] = useState('');

  // Review Submission Modal
  const [reviewingSubmission, setReviewingSubmission] = useState<QuizSubmission | null>(null);
  const [reviewTeacherNotes, setReviewTeacherNotes] = useState('');
  const [reviewQuestionScores, setReviewQuestionScores] = useState<Record<string, number>>({});
  const [reviewQuestionNotes, setReviewQuestionNotes] = useState<Record<string, string>>({});

  // Reset & Clear Confirmations
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [clearInputConfirm, setClearInputConfirm] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Story Management States
  const [storySearchQuery, setStorySearchQuery] = useState('');
  const [storyGradeFilter, setStoryGradeFilter] = useState<number | 'all'>('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [editingQuestionsStory, setEditingQuestionsStory] = useState<Story | null>(null);
  const [previewingStory, setPreviewingStory] = useState<Story | null>(null);
  const [deletingStory, setDeletingStory] = useState<Story | null>(null);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Metrics
  const totalSubmissionsCount = submissions.length;
  const avgOverallScore =
    totalSubmissionsCount > 0
      ? (submissions.reduce((acc, c) => acc + c.totalScore, 0) / totalSubmissionsCount).toFixed(1)
      : '0.0';
  const unreviewedCount = submissions.filter((s) => !s.teacherReviewed).length;

  // Filtered Students
  const filteredStudents = students.filter((s) => {
    const matchGrade = selectedGradeFilter === 'all' || s.grade === selectedGradeFilter;
    const matchQuery =
      s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(studentSearchQuery.toLowerCase());
    return matchGrade && matchQuery;
  });

  // Filtered Submissions
  const filteredSubmissions = submissions.filter((sub) => {
    const matchGrade = selectedGradeFilter === 'all' || sub.grade === selectedGradeFilter;
    const matchStory = selectedStoryFilter === 'all' || sub.storyId === selectedStoryFilter;
    const matchStudent = selectedStudentIdFilter === 'all' || sub.studentId === selectedStudentIdFilter;
    const matchQuery =
      sub.studentName.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      sub.studentId.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      sub.storyTitle.toLowerCase().includes(studentSearchQuery.toLowerCase());
    return matchGrade && matchStory && matchStudent && matchQuery;
  });

  // Handlers for Students
  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newStudentId.trim().toUpperCase();
    const cleanName = newStudentName.trim();

    if (!cleanId || !cleanName) {
      setAddStudentError('Vui lòng nhập đầy đủ mã học sinh và họ tên.');
      return;
    }

    if (students.some((s) => s.id.toUpperCase() === cleanId)) {
      setAddStudentError(`Mã học sinh "${cleanId}" đã tồn tại trên hệ thống.`);
      return;
    }

    const newStudent: Student = {
      id: cleanId,
      name: cleanName,
      grade: newStudentGrade,
      avatar: newStudentAvatar,
      totalStars: 0,
      xp: 0,
      streakDays: 1,
      createdAt: new Date().toISOString(),
    };

    onUpdateStudents([newStudent, ...students]);
    setIsAddStudentOpen(false);
    setNewStudentId('');
    setNewStudentName('');
    setAddStudentError('');
    showNotification(`Đã thêm thành công học sinh ${cleanName} (${cleanId})!`);
  };

  const handleUpdateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const updated = students.map((s) => (s.id === editingStudent.id ? editingStudent : s));
    onUpdateStudents(updated);

    // Đồng bộ tên và lớp mới sang bảng lịch sử bài nộp
    const updatedSubs = submissions.map((sub) =>
      sub.studentId === editingStudent.id
        ? { ...sub, studentName: editingStudent.name, grade: editingStudent.grade }
        : sub
    );
    onUpdateSubmissions(updatedSubs);

    setEditingStudent(null);
    showNotification(`Đã cập nhật thông tin học sinh ${editingStudent.name}!`);
  };

  // Handlers for Reviewing Submissions
  const handleOpenReview = (sub: QuizSubmission) => {
    setReviewingSubmission(sub);
    setReviewTeacherNotes(sub.teacherNote || '');
    const scores: Record<string, number> = {};
    const notes: Record<string, string> = {};
    sub.answers.forEach((ans) => {
      scores[ans.questionId] = ans.teacherScore !== undefined ? ans.teacherScore : ans.score;
      notes[ans.questionId] = ans.teacherFeedback || '';
    });
    setReviewQuestionScores(scores);
    setReviewQuestionNotes(notes);
  };

  const handleSaveReview = () => {
    if (!reviewingSubmission) return;

    // Recalculate total score
    let newTotal = 0;
    const updatedAnswers = reviewingSubmission.answers.map((ans) => {
      const qScore = reviewQuestionScores[ans.questionId] !== undefined ? reviewQuestionScores[ans.questionId] : ans.score;
      const qNote = reviewQuestionNotes[ans.questionId] || ans.teacherFeedback;
      newTotal += qScore;
      return {
        ...ans,
        score: qScore,
        teacherScore: qScore,
        teacherFeedback: qNote,
      };
    });

    const finalTotal = Math.min(10, Math.round(newTotal * 10) / 10);
    const updatedSub: QuizSubmission = {
      ...reviewingSubmission,
      totalScore: finalTotal,
      teacherReviewed: true,
      teacherNote: reviewTeacherNotes,
      answers: updatedAnswers,
    };

    const updatedList = submissions.map((s) => (s.id === updatedSub.id ? updatedSub : s));
    onUpdateSubmissions(updatedList);
    setReviewingSubmission(null);
    showNotification(`Đã lưu kết quả chấm lại cho bài thi của ${updatedSub.studentName} (Tổng điểm mới: ${finalTotal}/10).`);
  };

  // Handlers for Backup & Restore
  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = restoreFromBackupJSON(content);
      if (res.success) {
        showNotification(res.message);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showNotification(res.message, 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleResetToDefault = () => {
    resetAllToDefault();
    setIsResetConfirmOpen(false);
    showNotification('Đã đặt lại dữ liệu mẫu thành công!');
    setTimeout(() => window.location.reload(), 800);
  };

  const handleClearAll = () => {
    if (clearInputConfirm.trim().toUpperCase() !== 'XOA') {
      showNotification('Vui lòng gõ chữ "XOA" để xác nhận xóa toàn bộ dữ liệu.', 'error');
      return;
    }
    clearAllStorage();
    setIsClearConfirmOpen(false);
    showNotification('Đã xóa toàn bộ dữ liệu trên trình duyệt này!');
    setTimeout(() => window.location.reload(), 800);
  };

  // Handlers for Teacher Story Management
  const handleAddStory = (newStory: Story) => {
    onUpdateStories([newStory, ...stories]);
    showNotification(`Đã thêm thành công cuốn sách "${newStory.title}" vào Thư viện Lớp ${newStory.grade}!`);
  };

  const handleAddMultipleStories = (newStories: Story[]) => {
    onUpdateStories([...newStories, ...stories]);
    showNotification(`Đã nạp thành công ${newStories.length} bài đọc vào Thư viện!`);
  };

  const handleUpdateStory = (updatedStory: Story) => {
    const updated = stories.map((s) => (s.id === updatedStory.id ? updatedStory : s));
    onUpdateStories(updated);
    showNotification(`Đã cập nhật bài đọc: "${updatedStory.title}"!`);
  };

  const handleTogglePublish = (storyId: string) => {
    const updated = stories.map((s) => {
      if (s.id === storyId) {
        const nextState = s.isPublished === false ? true : false;
        showNotification(
          nextState
            ? `Đã xuất bản "${s.title}"! Học sinh có thể nhìn thấy và đọc bài này.`
            : `Đã tạm ẩn "${s.title}". Học sinh sẽ không nhìn thấy bài này.`
        );
        return { ...s, isPublished: nextState };
      }
      return s;
    });
    onUpdateStories(updated);
  };

  const handleDeleteStoryConfirm = () => {
    if (!deletingStory) return;
    const targetTitle = deletingStory.title;
    const updated = stories.filter((s) => s.id !== deletingStory.id);
    onUpdateStories(updated);
    setDeletingStory(null);
    showNotification(`Đã xóa bài đọc "${targetTitle}" khỏi hệ thống.`);
  };

  const handleSaveQuestions = (questions: Question[]) => {
    if (!editingQuestionsStory) return;
    const updatedStory: Story = {
      ...editingQuestionsStory,
      questions,
    };
    handleUpdateStory(updatedStory);
    setEditingQuestionsStory(null);
    showNotification(`Đã lưu ${questions.length} câu hỏi đọc hiểu cho bài "${updatedStory.title}".`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {feedbackMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl border text-sm font-bold flex items-center gap-2 animate-in slide-in-from-bottom duration-200 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-800 text-white border-emerald-700'
              : 'bg-red-800 text-white border-red-700'
          }`}
        >
          {feedbackMessage.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-300" /> : <AlertTriangle className="w-5 h-5 text-red-300" />}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-emerald-950 to-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-md mb-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">👨‍🏫</span>
              <h2 className="text-2xl sm:text-3xl font-black font-['Quicksand',sans-serif]">
                Khu vực Quản trị Giáo viên
              </h2>
              <span className="text-[11px] font-bold uppercase tracking-wider bg-emerald-800 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-700">
                Mã demo: 1234
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl font-medium">
              Theo dõi tiến độ đọc, xem xét và điều chỉnh điểm số các câu trả lời ngắn của học sinh, xuất báo cáo CSV và sao lưu dữ liệu an toàn.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10 text-center flex-1 sm:flex-initial min-w-28">
              <div className="text-2xl font-black text-emerald-400">{students.length}</div>
              <div className="text-[11px] font-bold text-stone-300 uppercase tracking-wider">Học sinh</div>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10 text-center flex-1 sm:flex-initial min-w-28">
              <div className="text-2xl font-black text-amber-400">{totalSubmissionsCount}</div>
              <div className="text-[11px] font-bold text-stone-300 uppercase tracking-wider">Lượt làm bài</div>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10 text-center flex-1 sm:flex-initial min-w-28">
              <div className="text-2xl font-black text-teal-400">{avgOverallScore}</div>
              <div className="text-[11px] font-bold text-stone-300 uppercase tracking-wider">Điểm TB toàn trường</div>
            </div>
          </div>
        </div>

        {/* LocalStorage Security & Persistence Notice */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-start gap-2 text-xs text-amber-300/90">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <span>
            <strong>Ghi nhớ về bảo mật:</strong> ReadUp hoạt động 100% trong trình duyệt và lưu trữ trên <code className="bg-black/40 px-1 py-0.5 rounded font-mono">localStorage</code> của máy này. 
            Mã đăng nhập là chế độ thử nghiệm (demo không bảo mật). Hãy sử dụng chức năng <strong>Tải bản sao lưu JSON</strong> để lưu lại điểm số học sinh ra máy tính của thầy cô.
          </span>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-2 border-b border-stone-200">
        <div className="flex items-center gap-1.5 bg-[#FAF7F0] p-1.5 rounded-2xl border border-stone-200">
          <button
            onClick={() => setActiveSubTab('students')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-1.5 ${
              activeSubTab === 'students'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Danh sách học sinh ({students.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('submissions')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-1.5 relative ${
              activeSubTab === 'submissions'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Kết quả & Chấm bài ({submissions.length})</span>
            {unreviewedCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-1.5 right-1.5 animate-pulse"></span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('stories')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-1.5 ${
              activeSubTab === 'stories'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Kho bài đọc ({stories.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('data')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-1.5 ${
              activeSubTab === 'data'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Sao lưu & Dữ liệu</span>
          </button>
        </div>

        {/* Global Export CSV Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportSubmissionsReportCSV(submissions)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-2xs flex items-center gap-1.5 transition"
            title="Xuất báo cáo kết quả lượt làm bài (mã HS, tên, lớp, bài đọc, ngày nộp, điểm, số câu đúng, trạng thái duyệt)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất báo cáo bài nộp (CSV)</span>
          </button>

          <button
            onClick={() => exportStudentsSummaryCSV(students, submissions)}
            className="px-3.5 py-2 bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 font-bold rounded-xl text-xs shadow-2xs flex items-center gap-1.5 transition"
            title="Xuất bảng điểm tổng hợp học sinh sang Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Xuất danh sách HS (CSV)</span>
            <span className="sm:hidden">CSV Học sinh</span>
          </button>

          <button
            onClick={() => exportDetailedSubmissionsCSV(submissions)}
            className="px-3.5 py-2 bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 font-bold rounded-xl text-xs shadow-2xs flex items-center gap-1.5 transition"
            title="Xuất chi tiết toàn bộ câu trả lời của học sinh"
          >
            <Download className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Xuất chi tiết câu trả lời (CSV)</span>
            <span className="sm:hidden">CSV Chi tiết</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: STUDENTS MANAGEMENT */}
      {activeSubTab === 'students' && (
        <div>
          {/* Controls bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-56">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm theo tên hoặc mã HS..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Grade Filter */}
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-bold">
                <span className="text-stone-500 px-2 hidden sm:inline">Khối lớp:</span>
                {(['all', 1, 2, 3, 4, 5] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setSelectedGradeFilter(g)}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      selectedGradeFilter === g
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {g === 'all' ? 'Tất cả' : `Lớp ${g}`}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setIsAddStudentOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm học sinh mới</span>
            </button>
          </div>

          {/* Table */}
          <div className="bg-[#FFFDF9] border border-[#E7DFCD] rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF7F0] border-b border-stone-200 text-stone-600 font-black uppercase tracking-wider">
                    <th className="py-3 px-4">Mã HS</th>
                    <th className="py-3 px-4">Họ và Tên</th>
                    <th className="py-3 px-4">Khối lớp</th>
                    <th className="py-3 px-4 text-center">Số bài đã nộp</th>
                    <th className="py-3 px-4 text-center">Điểm TB</th>
                    <th className="py-3 px-4 text-center">Sao vàng</th>
                    <th className="py-3 px-4 text-center">Chuỗi ngày</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-semibold text-stone-800">
                  {filteredStudents.map((st) => {
                    const stSubs = submissions.filter((s) => s.studentId === st.id);
                    const avg =
                      stSubs.length > 0
                        ? (stSubs.reduce((acc, c) => acc + c.totalScore, 0) / stSubs.length).toFixed(1)
                        : '—';

                    return (
                      <tr key={st.id} className="hover:bg-stone-50/70 transition">
                        <td className="py-3 px-4">
                          <span className="font-mono font-black text-stone-900 bg-stone-100 px-2 py-0.5 rounded-md">
                            {st.id}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{st.avatar}</span>
                            <div>
                              <div className="font-extrabold text-stone-900">{st.name}</div>
                              {st.notes && <div className="text-[10px] text-stone-500">{st.notes}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Lớp {st.grade}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          {stSubs.length} bài
                        </td>
                        <td className="py-3 px-4 text-center font-black text-emerald-700">
                          {avg !== '—' ? `${avg} / 10` : '—'}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-amber-600">
                          ⭐ {st.totalStars}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-orange-600">
                          🔥 {st.streakDays}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onSwitchToStudent(st.id)}
                              className="px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              title="Xem thử góc nhìn học sinh này"
                            >
                              Ghé thăm
                            </button>
                            <button
                              onClick={() => setEditingStudent(st)}
                              className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
                              title="Sửa thông tin học sinh"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredStudents.length === 0 && (
              <div className="p-8 text-center text-stone-500">
                Không tìm thấy học sinh nào phù hợp với bộ lọc.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: SUBMISSIONS & SHORT ANSWER REVIEW */}
      {activeSubTab === 'submissions' && (
        <div>
          {/* Controls Bar */}
          <div className="flex flex-col gap-3 mb-5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-56 flex-1 sm:flex-initial">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm bài theo tên HS, mã HS hoặc bài đọc..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Grade Filter */}
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-bold">
                <span className="text-stone-500 px-2 hidden sm:inline">Khối lớp:</span>
                {(['all', 1, 2, 3, 4, 5] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setSelectedGradeFilter(g)}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      selectedGradeFilter === g
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {g === 'all' ? 'Tất cả' : `Lớp ${g}`}
                  </button>
                ))}
              </div>

              {/* Student Filter Dropdown */}
              <div className="flex items-center gap-1">
                <select
                  value={selectedStudentIdFilter}
                  onChange={(e) => setSelectedStudentIdFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-semibold text-stone-800 focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="all">Tất cả học sinh ({students.length})</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.id} - Lớp {st.grade})
                    </option>
                  ))}
                </select>
              </div>

              {/* Story Filter Dropdown */}
              <div className="flex items-center gap-1">
                <select
                  value={selectedStoryFilter}
                  onChange={(e) => setSelectedStoryFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-semibold text-stone-800 focus:outline-hidden focus:border-emerald-500 max-w-xs truncate"
                >
                  <option value="all">Tất cả bài đọc ({stories.length})</option>
                  {stories.map((st) => (
                    <option key={st.id} value={st.id}>
                      Lớp {st.grade}: {st.title}
                    </option>
                  ))}
                </select>
              </div>

              {(selectedGradeFilter !== 'all' || selectedStoryFilter !== 'all' || selectedStudentIdFilter !== 'all' || studentSearchQuery) && (
                <button
                  onClick={() => {
                    setSelectedGradeFilter('all');
                    setSelectedStoryFilter('all');
                    setSelectedStudentIdFilter('all');
                    setStudentSearchQuery('');
                  }}
                  className="px-2.5 py-2 text-stone-500 hover:text-stone-900 text-xs font-bold underline"
                >
                  Đặt lại bộ lọc
                </button>
              )}
            </div>

            <div className="text-xs font-semibold text-stone-500">
              💡 Bấm vào <strong className="text-emerald-800">"Xem & Chấm bài"</strong> để xem câu trả lời của học sinh, điều chỉnh điểm từ 0 đến 2 điểm và ghi lời nhận xét.
            </div>
          </div>

          {/* Submissions Table */}
          <div className="bg-[#FFFDF9] border border-[#E7DFCD] rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF7F0] border-b border-stone-200 text-stone-600 font-black uppercase tracking-wider">
                    <th className="py-3 px-4">Thời gian nộp</th>
                    <th className="py-3 px-4">Học sinh</th>
                    <th className="py-3 px-4">Khối lớp</th>
                    <th className="py-3 px-4">Tên bài đọc</th>
                    <th className="py-3 px-4 text-center">Tổng điểm</th>
                    <th className="py-3 px-4 text-center">Sao</th>
                    <th className="py-3 px-4 text-center">Trạng thái duyệt</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-semibold text-stone-800">
                  {filteredSubmissions.map((sub) => {
                    const formattedDate = new Date(sub.submittedAt).toLocaleString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                    });

                    return (
                      <tr key={sub.id} className="hover:bg-stone-50/70 transition">
                        <td className="py-3 px-4 text-stone-500 font-mono text-[11px]">
                          {formattedDate}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-extrabold text-stone-900">{sub.studentName}</span>{' '}
                          <span className="text-stone-400 font-mono text-[10px]">({sub.studentId})</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md">
                            Lớp {sub.grade}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-stone-900 max-w-xs truncate">
                          {sub.storyTitle}
                        </td>
                        <td className="py-3 px-4 text-center font-black text-emerald-700">
                          {sub.totalScore} / 10 đ
                        </td>
                        <td className="py-3 px-4 text-center text-amber-500 font-bold">
                          {'★'.repeat(sub.starsEarned)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {sub.teacherReviewed ? (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                              ✓ GV đã duyệt
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                              Chờ GV xem lại
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleOpenReview(sub)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold rounded-xl text-xs transition border border-emerald-200"
                          >
                            Xem & Chấm bài
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredSubmissions.length === 0 && (
              <div className="p-8 text-center text-stone-500">
                Chưa có lượt nộp bài nào phù hợp.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: STORIES MANAGEMENT (QUẢN LÝ SÁCH VÀ HỌC LIỆU DÀNH RIÊNG CHO GIÁO VIÊN) */}
      {activeSubTab === 'stories' && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="bg-[#FFFDF9] border-2 border-emerald-200/90 rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black uppercase tracking-wider mb-2 border border-emerald-200">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Khu vực Quản lý Học liệu & Thư viện Sách</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-emerald-950 font-['Quicksand',sans-serif]">
                  Quản lý Sách và Bài đọc của Thầy/Cô ({stories.length} bài)
                </h3>
                <p className="text-xs text-stone-600 mt-1 max-w-2xl leading-relaxed">
                  Ứng dụng không tự tạo sách. Thầy/Cô hoàn toàn chủ động tải lên, biên soạn câu hỏi đọc hiểu, ẩn/hiện hoặc xuất bản sách cho học sinh Lớp 1 đến Lớp 5.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-5 py-3 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-md transition flex items-center gap-2 cursor-pointer border border-emerald-500/30"
                >
                  <Plus className="w-4 h-4 text-amber-200 stroke-[3]" />
                  <span>+ TẢI SÁCH/TRUYỆN LÊN</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="mt-5 pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Tìm theo tên sách, tác giả, thể loại..."
                  value={storySearchQuery}
                  onChange={(e) => setStorySearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-stone-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              {/* Grade Filter */}
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-bold">
                <span className="text-stone-500 px-2 hidden sm:inline">Khối lớp:</span>
                {(['all', 1, 2, 3, 4, 5] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setStoryGradeFilter(g)}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      storyGradeFilter === g
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {g === 'all' ? 'Tất cả' : `Lớp ${g}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Danh sách sách */}
          {(() => {
            const filtered = stories.filter((st) => {
              const matchGrade = storyGradeFilter === 'all' || st.grade === storyGradeFilter;
              const matchQuery =
                st.title.toLowerCase().includes(storySearchQuery.toLowerCase()) ||
                st.category.toLowerCase().includes(storySearchQuery.toLowerCase()) ||
                (st.author && st.author.toLowerCase().includes(storySearchQuery.toLowerCase())) ||
                st.summary.toLowerCase().includes(storySearchQuery.toLowerCase());
              return matchGrade && matchQuery;
            });

            if (stories.length === 0) {
              return (
                <div className="bg-[#FFFDF9] border-2 border-dashed border-emerald-300 rounded-3xl p-12 text-center shadow-xs">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-4xl mb-4 shadow-inner">
                    📚
                  </div>
                  <h3 className="font-black text-emerald-950 text-lg mb-2 font-['Quicksand',sans-serif]">
                    Thư viện chưa có sách. Giáo viên hãy tải sách lên để bắt đầu.
                  </h3>
                  <p className="text-xs text-stone-600 max-w-md mx-auto mb-6">
                    Bấm nút <strong>"+ TẢI SÁCH/TRUYỆN LÊN"</strong> ở trên để nạp tệp PDF, EPUB, TXT, hoặc tranh ảnh từ máy tính vào hệ thống nhé!
                  </p>
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-sm transition inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-amber-200 stroke-[3]" />
                    <span>+ TẢI SÁCH/TRUYỆN LÊN</span>
                  </button>
                </div>
              );
            }

            if (filtered.length === 0) {
              return (
                <div className="bg-[#FFFDF9] border-2 border-stone-200 rounded-3xl p-10 text-center">
                  <p className="text-stone-500 font-bold text-xs">
                    Không tìm thấy bài đọc nào khớp với từ khóa tìm kiếm hoặc khối lớp đã chọn.
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((st) => (
                  <div
                    key={st.id}
                    className="p-5 rounded-3xl bg-[#FFFDF9] border-2 border-[#E7DFCD] flex flex-col justify-between hover:border-emerald-300 transition-all shadow-xs group"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                          Lớp {st.grade}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {st.isPublished !== false ? (
                            <span className="text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Eye className="w-3 h-3 text-emerald-600" />
                              <span>Đang xuất bản</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-extrabold bg-stone-100 text-stone-600 border border-stone-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <EyeOff className="w-3 h-3 text-stone-400" />
                              <span>Tạm ẩn</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Cover Preview Image */}
                      {st.coverImage ? (
                        <div className="w-full aspect-16/10 rounded-2xl overflow-hidden mb-3 bg-stone-100 border border-stone-200 shadow-2xs">
                          <img
                            src={st.coverImage}
                            alt={st.title}
                            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="w-full aspect-16/10 rounded-2xl overflow-hidden mb-3 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 flex flex-col items-center justify-center text-center p-3">
                          <span className="text-3xl mb-1">{st.coverEmoji || '📖'}</span>
                          <span className="text-xs font-bold text-emerald-800">Sách văn bản đọc</span>
                        </div>
                      )}

                      {/* Story Title & Author */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                            {st.category}
                          </span>
                          <span className="text-[11px] font-medium text-stone-500">
                            ~{st.estimatedReadMinutes} phút đọc
                          </span>
                        </div>

                        <h4 className="font-black text-base text-stone-900 group-hover:text-emerald-700 transition leading-snug line-clamp-2">
                          {st.title}
                        </h4>

                        {st.author && (
                          <p className="text-xs font-bold text-stone-600 mt-0.5 truncate">
                            ✍️ {st.author}
                          </p>
                        )}
                      </div>

                      <p className="text-xs text-stone-600 line-clamp-2 mb-3 leading-relaxed">
                        {st.summary}
                      </p>

                      <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between text-xs font-bold text-stone-700 mb-4">
                        <span className="flex items-center gap-1">
                          <BookCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{st.questions ? st.questions.length : 0} câu hỏi</span>
                        </span>
                        <span className="text-stone-500">
                          {st.content.length} đoạn văn
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons: Preview, Edit, Questions, Toggle Publish, Delete */}
                    <div className="pt-3 border-t border-stone-100 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {/* Xem trước sách (Lật trang Flipbook) */}
                        <button
                          onClick={() => setPreviewingStory(st)}
                          className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-1.5 border border-emerald-200 cursor-pointer"
                          title="Xem trước giao diện lật sách của học sinh"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Xem trước</span>
                        </button>

                        {/* Soạn/Sửa câu hỏi */}
                        <button
                          onClick={() => setEditingQuestionsStory(st)}
                          className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-1.5 border border-amber-200 cursor-pointer"
                          title="Quản lý bộ câu hỏi đọc hiểu của bài"
                        >
                          <BookCheck className="w-3.5 h-3.5" />
                          <span>Soạn câu hỏi</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-1 pt-1">
                        {/* Xuất bản / Tạm ẩn */}
                        <button
                          onClick={() => handleTogglePublish(st.id)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 cursor-pointer ${
                            st.isPublished !== false
                              ? 'text-stone-600 hover:bg-stone-100'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-extrabold'
                          }`}
                          title={st.isPublished !== false ? 'Bấm để tạm ẩn khỏi học sinh' : 'Bấm để xuất bản cho học sinh'}
                        >
                          {st.isPublished !== false ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-stone-500" />
                              <span>Ẩn sách</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Xuất bản</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-1">
                          {/* Chỉnh sửa thông tin */}
                          <button
                            onClick={() => setEditingStory(st)}
                            className="p-2 text-stone-600 hover:text-emerald-700 hover:bg-stone-100 rounded-xl transition cursor-pointer"
                            title="Sửa thông tin bài đọc"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Xóa sách */}
                          <button
                            onClick={() => setDeletingStory(st)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition cursor-pointer"
                            title="Xóa cuốn sách này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* SUB-TAB 4: BACKUP & DATA MANAGEMENT */}
      {activeSubTab === 'data' && (
        <div className="space-y-6">
          {/* Informational Card */}
          <div className="bg-[#FFFDF9] border-2 border-emerald-200 rounded-3xl p-6 sm:p-8 shadow-xs">
            <h3 className="text-lg font-black text-emerald-950 font-['Quicksand',sans-serif] mb-2 flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-600" />
              <span>Sao lưu và Khôi phục dữ liệu ReadUp</span>
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-3xl mb-6">
              Ứng dụng ReadUp chạy hoàn toàn trong trình duyệt web của bạn và lưu vào <code>localStorage</code>. Để tránh mất dữ liệu học sinh khi dọn dẹp bộ nhớ đệm trình duyệt hoặc khi đổi máy tính, giáo viên nên thường xuyên tải về bản sao lưu tệp JSON.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Export Backup JSON */}
              <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between">
                <div>
                  <h4 className="font-black text-sm text-emerald-900 mb-1">
                    1. Tải bản sao lưu JSON về máy tính
                  </h4>
                  <p className="text-xs text-emerald-800 leading-relaxed mb-4">
                    Tải về một tệp .json chứa toàn bộ danh sách học sinh, bài đọc, câu hỏi và lịch sử làm bài thi.
                  </p>
                </div>
                <button
                  onClick={downloadBackupJSON}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-xs transition flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải bản sao lưu (Download JSON)</span>
                </button>
              </div>

              {/* Import Restore JSON */}
              <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col justify-between">
                <div>
                  <h4 className="font-black text-sm text-amber-950 mb-1">
                    2. Khôi phục dữ liệu từ tệp JSON
                  </h4>
                  <p className="text-xs text-amber-900 leading-relaxed mb-4">
                    Nhập tệp .json đã sao lưu trước đó để phục hồi lại dữ liệu học sinh và bài thi.
                  </p>
                </div>
                <label className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-xs transition flex items-center justify-center gap-2 cursor-pointer text-center">
                  <Upload className="w-4 h-4" />
                  <span>Chọn tệp JSON để khôi phục</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileRestore}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Reset & Danger Zone */}
          <div className="bg-[#FFFDF9] border-2 border-stone-200 rounded-3xl p-6 sm:p-8 shadow-xs">
            <h3 className="text-lg font-black text-stone-900 font-['Quicksand',sans-serif] mb-2 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-stone-700" />
              <span>Thiết lập lại & Vùng quản trị cấp cao</span>
            </h3>
            <p className="text-xs text-stone-600 mb-6">
              Các tính năng đặt lại này dùng khi muốn nạp lại tài khoản demo mẫu hoặc dọn dẹp sạch sẽ trình duyệt.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => setIsResetConfirmOpen(true)}
                className="px-5 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition flex items-center gap-2 border border-stone-300"
              >
                <RotateCcw className="w-4 h-4 text-stone-600" />
                <span>Đặt lại dữ liệu mẫu ban đầu (Demo Reset)</span>
              </button>

              <button
                onClick={() => {
                  setClearInputConfirm('');
                  setIsClearConfirmOpen(true);
                }}
                className="px-5 py-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition flex items-center gap-2 border border-red-200"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>Xóa toàn bộ dữ liệu trên trình duyệt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD STUDENT */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FFFDF9] border border-[#E7DFCD] rounded-3xl shadow-2xl max-w-md w-full p-6 text-stone-800">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200 mb-4">
              <h3 className="text-lg font-black text-stone-900 font-['Quicksand',sans-serif]">
                Thêm học sinh mới
              </h3>
              <button
                onClick={() => setIsAddStudentOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addStudentError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold">
                {addStudentError}
              </div>
            )}

            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Mã học sinh (Viết liền, không dấu)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: HS006, HS101..."
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2.5 bg-[#FAF7F0] border-2 border-stone-300 rounded-xl font-bold uppercase text-stone-900 text-sm focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Họ và tên học sinh
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#FAF7F0] border-2 border-stone-300 rounded-xl font-bold text-stone-900 text-sm focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Khối lớp
                  </label>
                  <select
                    value={newStudentGrade}
                    onChange={(e) => setNewStudentGrade(Number(e.target.value) as GradeLevel)}
                    className="w-full px-3 py-2.5 bg-[#FAF7F0] border-2 border-stone-300 rounded-xl font-bold text-stone-900 text-sm focus:border-emerald-500 focus:outline-hidden"
                  >
                    <option value={1}>Lớp 1</option>
                    <option value={2}>Lớp 2</option>
                    <option value={3}>Lớp 3</option>
                    <option value={4}>Lớp 4</option>
                    <option value={5}>Lớp 5</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Ảnh đại diện
                  </label>
                  <select
                    value={newStudentAvatar}
                    onChange={(e) => setNewStudentAvatar(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#FAF7F0] border-2 border-stone-300 rounded-xl font-bold text-stone-900 text-sm focus:border-emerald-500 focus:outline-hidden"
                  >
                    <option value="🐱">🐱 Mèo con</option>
                    <option value="🦁">🦁 Sư tử</option>
                    <option value="🐰">🐰 Thỏ trắng</option>
                    <option value="🐼">🐼 Gấu trúc</option>
                    <option value="🦊">🦊 Cáo nhỏ</option>
                    <option value="🐶">🐶 Chó con</option>
                    <option value="🐻">🐻 Gấu nâu</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 font-bold text-xs hover:bg-stone-100"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs"
                >
                  Lưu học sinh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT STUDENT */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FFFDF9] border border-[#E7DFCD] rounded-3xl shadow-2xl max-w-md w-full p-6 text-stone-800">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200 mb-4">
              <h3 className="text-lg font-black text-stone-900 font-['Quicksand',sans-serif]">
                Chỉnh sửa thông tin học sinh
              </h3>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
                  Mã học sinh (Cố định)
                </label>
                <input
                  type="text"
                  disabled
                  value={editingStudent.id}
                  className="w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl font-bold font-mono text-stone-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Họ và tên học sinh
                </label>
                <input
                  type="text"
                  required
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#FAF7F0] border-2 border-stone-300 rounded-xl font-bold text-stone-900 text-sm focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Khối lớp
                  </label>
                  <select
                    value={editingStudent.grade}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, grade: Number(e.target.value) as GradeLevel })
                    }
                    className="w-full px-3 py-2.5 bg-[#FAF7F0] border-2 border-stone-300 rounded-xl font-bold text-stone-900 text-sm focus:border-emerald-500 focus:outline-hidden"
                  >
                    <option value={1}>Lớp 1</option>
                    <option value={2}>Lớp 2</option>
                    <option value={3}>Lớp 3</option>
                    <option value={4}>Lớp 4</option>
                    <option value={5}>Lớp 5</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Ảnh đại diện
                  </label>
                  <select
                    value={editingStudent.avatar}
                    onChange={(e) => setEditingStudent({ ...editingStudent, avatar: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#FAF7F0] border-2 border-stone-300 rounded-xl font-bold text-stone-900 text-sm focus:border-emerald-500 focus:outline-hidden"
                  >
                    <option value="🐱">🐱 Mèo con</option>
                    <option value="🦁">🦁 Sư tử</option>
                    <option value="🐰">🐰 Thỏ trắng</option>
                    <option value="🐼">🐼 Gấu trúc</option>
                    <option value="🦊">🦊 Cáo nhỏ</option>
                    <option value="🐶">🐶 Chó con</option>
                    <option value="🐻">🐻 Gấu nâu</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-xl text-stone-600 font-bold text-xs hover:bg-stone-100"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs"
                >
                  Cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REVIEW SUBMISSION & SHORT-ANSWER OVERRIDE */}
      {reviewingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#FFFDF9] border border-[#E7DFCD] rounded-3xl shadow-2xl max-w-3xl w-full my-auto overflow-hidden text-stone-800">
            {/* Header */}
            <div className="bg-gradient-to-r from-stone-900 to-emerald-950 p-5 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                  Chấm lại bài thi • {reviewingSubmission.studentId}
                </span>
                <h3 className="text-lg font-black font-['Quicksand',sans-serif] mt-1">
                  {reviewingSubmission.studentName} – {reviewingSubmission.storyTitle}
                </h3>
              </div>
              <button
                onClick={() => setReviewingSubmission(null)}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Questions list */}
            <div className="p-5 sm:p-6 max-h-[70vh] overflow-y-auto space-y-4">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
                <strong>Hướng dẫn cho giáo viên:</strong> Quý thầy cô có thể điều chỉnh điểm từ <strong>0 đến 2 điểm</strong> cho từng câu hỏi ngắn và viết thêm lời khen/gợi ý để động viên học sinh.
              </div>

              {reviewingSubmission.answers.map((ans, idx) => (
                <div
                  key={ans.questionId}
                  className="p-4 rounded-2xl border-2 border-stone-200 bg-white space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-extrabold text-stone-900 text-sm">
                      Câu {idx + 1} ({ans.type === 'multiple_choice' ? 'Trắc nghiệm' : 'Câu hỏi ngắn'}): {ans.questionText}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-bold text-stone-600">Điểm:</span>
                      <select
                        value={reviewQuestionScores[ans.questionId] ?? ans.score}
                        onChange={(e) =>
                          setReviewQuestionScores({
                            ...reviewQuestionScores,
                            [ans.questionId]: Number(e.target.value),
                          })
                        }
                        className="px-2 py-1 bg-emerald-50 border-2 border-emerald-300 font-black rounded-lg text-emerald-900 text-xs focus:outline-hidden"
                      >
                        <option value={0}>0.0 đ</option>
                        <option value={0.5}>0.5 đ</option>
                        <option value={1}>1.0 đ</option>
                        <option value={1.5}>1.5 đ</option>
                        <option value={2}>2.0 đ (Tối đa)</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-3 bg-[#FAF8F2] rounded-xl space-y-1.5 border border-stone-200">
                    <div>
                      <strong className="text-stone-700">Câu trả lời của học sinh:</strong>{' '}
                      <span className="font-bold text-stone-900">{ans.studentAnswer || '(Không trả lời)'}</span>
                    </div>

                    {ans.type === 'multiple_choice' ? (
                      <div>
                        <strong className="text-emerald-800">Đáp án chuẩn:</strong>{' '}
                        <span className="font-bold text-emerald-900">{ans.correctAnswer}</span>
                      </div>
                    ) : (
                      <div>
                        <strong className="text-emerald-800">Đáp án mẫu:</strong>{' '}
                        <span className="font-medium text-emerald-900">{ans.sampleAnswer}</span>
                      </div>
                    )}

                    <div className="text-stone-500 text-[11px]">
                      <em>Giải thích đề bài:</em> {ans.explanation}
                    </div>
                  </div>

                  {/* Teacher Feedback for this question */}
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Lời phê / Ghi chú cho câu này:
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Con viết câu gãy gọn, đúng ý!"
                      value={reviewQuestionNotes[ans.questionId] ?? ''}
                      onChange={(e) =>
                        setReviewQuestionNotes({
                          ...reviewQuestionNotes,
                          [ans.questionId]: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 bg-[#FAF7F0] border border-stone-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                </div>
              ))}

              {/* General comment */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Nhận xét chung toàn bài của Giáo viên
                </label>
                <textarea
                  rows={2}
                  value={reviewTeacherNotes}
                  onChange={(e) => setReviewTeacherNotes(e.target.value)}
                  placeholder="Ví dụ: Cô khen con hoàn thành bài rất tốt! Cố gắng duy trì nhé..."
                  className="w-full p-3 bg-white border-2 border-stone-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setReviewingSubmission(null)}
                className="px-4 py-2 rounded-xl text-stone-600 font-bold text-xs hover:bg-stone-200"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleSaveReview}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xs flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Lưu kết quả chấm lại</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TẢI SÁCH VÀ HỌC LIỆU MỚI (TXT, ẢNH TRANH, JSON, THỦ CÔNG) */}
      <TeacherUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onAddStory={handleAddStory}
        onAddMultipleStories={handleAddMultipleStories}
      />

      {/* MODAL: CHỈNH SỬA THÔNG TIN SÁCH */}
      {editingStory && (
        <StoryEditModal
          story={editingStory}
          isOpen={true}
          onClose={() => setEditingStory(null)}
          onSaveStory={handleUpdateStory}
        />
      )}

      {/* MODAL: SOẠN VÀ QUẢN LÝ CÂU HỎI ĐỌC HIỂU */}
      {editingQuestionsStory && (
        <QuestionEditorModal
          story={editingQuestionsStory}
          isOpen={true}
          onClose={() => setEditingQuestionsStory(null)}
          onSaveQuestions={handleSaveQuestions}
        />
      )}

      {/* MODAL: XEM TRƯỚC SÁCH LẬT TRANG (PREVIEW FLIPBOOK) */}
      {previewingStory && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex flex-col p-2 sm:p-4 overflow-hidden animate-in fade-in">
          <div className="max-w-6xl w-full mx-auto flex items-center justify-between pb-2 text-white">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-600 text-white text-xs font-black px-2.5 py-1 rounded-lg">
                CHẾ ĐỘ XEM TRƯỚC DÀNH CHO GIÁO VIÊN
              </span>
              <span className="text-xs text-stone-300 font-medium hidden sm:inline">
                (Đang mở cuốn: {previewingStory.title})
              </span>
            </div>
            <button
              onClick={() => setPreviewingStory(null)}
              className="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Đóng xem trước</span>
            </button>
          </div>

          <div className="flex-1 w-full max-w-6xl mx-auto overflow-hidden rounded-3xl">
            <StoryReader
              story={previewingStory}
              onBack={() => setPreviewingStory(null)}
              onStartQuiz={() => {
                showNotification('Ở chế độ xem trước, bạn có thể kiểm tra trực tiếp bộ câu hỏi bằng nút "Soạn câu hỏi" trong bảng quản lý.');
              }}
            />
          </div>
        </div>
      )}

      {/* CONFIRM MODAL: XÓA SÁCH */}
      {deletingStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FFFDF9] border border-red-200 rounded-3xl shadow-2xl max-w-md w-full p-6 text-stone-800 animate-in fade-in">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center text-2xl mx-auto mb-3">
              🗑️
            </div>
            <h3 className="text-lg font-black text-center text-stone-900 font-['Quicksand',sans-serif] mb-2">
              Xác nhận Xóa cuốn sách này?
            </h3>
            <p className="text-xs text-stone-600 text-center leading-relaxed mb-4">
              Thầy/Cô có chắc chắn muốn xóa bài đọc: <strong className="text-stone-900">"{deletingStory.title}"</strong> (Khối Lớp {deletingStory.grade})?
            </p>
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-[11px] text-red-800 font-semibold mb-5 text-center">
              Lưu ý: Sau khi xóa, học sinh sẽ không còn nhìn thấy và không thể làm bài đọc này nữa.
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeletingStory(null)}
                className="px-4 py-2.5 rounded-xl font-bold text-xs text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteStoryConfirm}
                className="px-5 py-2.5 rounded-xl font-black text-xs uppercase bg-red-600 hover:bg-red-700 text-white shadow-xs transition cursor-pointer"
              >
                Xác nhận Xóa sách
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL: RESET DEMO DATA */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FFFDF9] border border-stone-300 rounded-3xl shadow-2xl max-w-md w-full p-6 text-stone-800">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl mx-auto mb-3">
              ⚠️
            </div>
            <h3 className="text-lg font-black text-center text-stone-900 font-['Quicksand',sans-serif] mb-2">
              Xác nhận Đặt lại Dữ liệu Mẫu?
            </h3>
            <p className="text-xs text-stone-600 text-center leading-relaxed mb-6">
              Hành động này sẽ khôi phục lại các tài khoản mẫu ban đầu (HS001, HS002...), bộ bài đọc mẫu và xóa các bài đọc hay học sinh bạn vừa thêm thủ công.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2 rounded-xl font-bold text-xs text-stone-600 hover:bg-stone-100"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleResetToDefault}
                className="px-5 py-2.5 rounded-xl font-black text-xs uppercase bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
              >
                Đồng ý Đặt lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL: CLEAR ALL STORAGE */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FFFDF9] border border-red-300 rounded-3xl shadow-2xl max-w-md w-full p-6 text-stone-800">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center text-2xl mx-auto mb-3">
              🚨
            </div>
            <h3 className="text-lg font-black text-center text-red-900 font-['Quicksand',sans-serif] mb-2">
              Cảnh báo: Xóa sạch toàn bộ dữ liệu!
            </h3>
            <p className="text-xs text-stone-600 text-center leading-relaxed mb-4">
              Toàn bộ học sinh, lịch sử làm bài và các bài đọc sẽ bị xóa hoàn toàn khỏi localStorage của trình duyệt này và không thể phục hồi nếu chưa tải bản sao lưu.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-bold text-stone-700 mb-1 text-center">
                Vui lòng gõ chữ <strong className="text-red-700">XOA</strong> để xác nhận:
              </label>
              <input
                type="text"
                value={clearInputConfirm}
                onChange={(e) => setClearInputConfirm(e.target.value)}
                placeholder="Nhập XOA"
                className="w-full text-center px-4 py-2 bg-stone-100 border-2 border-red-300 rounded-xl font-black text-sm uppercase focus:outline-hidden"
              />
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setIsClearConfirmOpen(false)}
                className="px-4 py-2 rounded-xl font-bold text-xs text-stone-600 hover:bg-stone-100"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleClearAll}
                className="px-5 py-2.5 rounded-xl font-black text-xs uppercase bg-red-600 hover:bg-red-700 text-white shadow-xs"
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
