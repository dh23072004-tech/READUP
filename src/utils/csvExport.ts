import { Student, QuizSubmission } from '../types';

/**
 * Xuất báo cáo kết quả các lượt làm bài của học sinh (đầy đủ các trường theo quy định)
 * Định dạng chuẩn UTF-8 with BOM mở được trực tiếp trên Excel tiếng Việt không bị lỗi font
 */
export function exportSubmissionsReportCSV(submissions: QuizSubmission[]): void {
  const header = [
    'Mã Học Sinh',
    'Tên Học Sinh',
    'Khối Lớp',
    'Tên Bài Đọc',
    'Ngày Làm Bài',
    'Điểm Số (Thang 10)',
    'Số Câu Đúng',
    'Số Sao Đạt Được',
    'Trạng Thái Giáo Viên Xem Lại',
    'Lời Phê Của Giáo Viên',
  ];

  const rows = submissions.map((sub) => {
    const dateFormatted = new Date(sub.submittedAt).toLocaleString('vi-VN');
    const correctCount = sub.answers.filter((a) => a.isCorrect || a.score >= 1.5).length;
    const totalCount = sub.answers.length;
    const statusText = sub.teacherReviewed ? 'Đã xem lại' : 'Chưa xem lại';
    const noteText = (sub.teacherNote || '').replace(/"/g, '""');

    return [
      `"${sub.studentId}"`,
      `"${sub.studentName.replace(/"/g, '""')}"`,
      `"Lớp ${sub.grade}"`,
      `"${sub.storyTitle.replace(/"/g, '""')}"`,
      `"${dateFormatted}"`,
      `"${sub.totalScore}/${sub.maxScore}"`,
      `"${correctCount}/${totalCount} câu"`,
      `"${sub.starsEarned} sao"`,
      `"${statusText}"`,
      `"${noteText}"`,
    ].join(',');
  });

  const csvContent = '\uFEFF' + [header.join(','), ...rows].join('\r\n');
  downloadCSVFile(csvContent, `ReadUp_Bao_Cao_Bai_Nop_${new Date().toISOString().slice(0, 10)}.csv`);
}

/**
 * Xuất bảng tổng hợp kết quả học sinh ra file CSV (UTF-8 BOM hỗ trợ tiếng Việt trên Excel)
 */
export function exportStudentsSummaryCSV(students: Student[], submissions: QuizSubmission[]): void {
  const header = ['Mã Học Sinh', 'Họ Và Tên', 'Khối Lớp', 'Số Bài Đã Làm', 'Điểm Trung Bình (Thang 10)', 'Tổng Số Sao', 'Điểm XP', 'Chuỗi Ngày Đọc'];
  
  const rows = students.map((student) => {
    const studentSubs = submissions.filter((s) => s.studentId === student.id);
    const avgScore =
      studentSubs.length > 0
        ? (studentSubs.reduce((acc, cur) => acc + cur.totalScore, 0) / studentSubs.length).toFixed(1)
        : '0.0';

    return [
      `"${student.id}"`,
      `"${student.name.replace(/"/g, '""')}"`,
      `"Lớp ${student.grade}"`,
      `"${studentSubs.length}"`,
      `"${avgScore}"`,
      `"${student.totalStars}"`,
      `"${student.xp}"`,
      `"${student.streakDays} ngày"`,
    ];
  });

  const csvContent = '\uFEFF' + [header.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  downloadCSVFile(csvContent, `ReadUp_Danh_Sach_Hoc_Sinh_${new Date().toISOString().slice(0, 10)}.csv`);
}

/**
 * Xuất chi tiết từng câu trả lời và kết quả chấm điểm của học sinh ra file CSV
 */
export function exportDetailedSubmissionsCSV(submissions: QuizSubmission[]): void {
  const header = [
    'Mã Bài Nộp',
    'Mã Học Sinh',
    'Họ Tên Học Sinh',
    'Khối Lớp',
    'Tên Bài Đọc',
    'Thời Gian Nộp',
    'Tổng Điểm',
    'Số Sao Đạt Được',
    'Câu Hỏi',
    'Dạng Câu Hỏi',
    'Câu Trả Lời Của Học Sinh',
    'Đáp Án Chuẩn / Mẫu',
    'Tự Chấm',
    'Điểm GV Duyệt',
    'Nhận Xét Của Giáo Viên',
  ];

  const rows: string[] = [];

  submissions.forEach((sub) => {
    const dateFormatted = new Date(sub.submittedAt).toLocaleString('vi-VN');
    
    sub.answers.forEach((ans, idx) => {
      const qType = ans.type === 'multiple_choice' ? 'Trắc nghiệm' : 'Trả lời ngắn';
      const cleanStudentAns = (ans.studentAnswer || '').replace(/"/g, '""');
      const cleanCorrectAns = (ans.sampleAnswer || ans.correctAnswer || '').replace(/"/g, '""');
      const cleanQuestionText = `Câu ${idx + 1}: ${ans.questionText.replace(/"/g, '""')}`;
      const teacherNote = (ans.teacherFeedback || '').replace(/"/g, '""');
      const teacherScoreVal = ans.teacherScore !== undefined ? ans.teacherScore : ans.score;

      rows.push(
        [
          `"${sub.id}"`,
          `"${sub.studentId}"`,
          `"${sub.studentName.replace(/"/g, '""')}"`,
          `"Lớp ${sub.grade}"`,
          `"${sub.storyTitle.replace(/"/g, '""')}"`,
          `"${dateFormatted}"`,
          `"${sub.totalScore}/${sub.maxScore}"`,
          `"${sub.starsEarned} sao"`,
          `"${cleanQuestionText}"`,
          `"${qType}"`,
          `"${cleanStudentAns}"`,
          `"${cleanCorrectAns}"`,
          `"${ans.score} đ"`,
          `"${teacherScoreVal} đ"`,
          `"${teacherNote}"`,
        ].join(',')
      );
    });
  });

  const csvContent = '\uFEFF' + [header.join(','), ...rows].join('\r\n');
  downloadCSVFile(csvContent, `ReadUp_Chi_Tiet_Cau_Tra_Loi_${new Date().toISOString().slice(0, 10)}.csv`);
}

function downloadCSVFile(content: string, fileName: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
