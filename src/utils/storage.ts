import { Student, Story, QuizSubmission, AppSession } from '../types';
import { DEFAULT_STUDENTS, DEFAULT_SUBMISSIONS } from '../data/defaultStudents';
import { DEFAULT_STORIES } from '../data/defaultStories';
import { STORY_ILLUSTRATIONS_MAP } from '../data/storyIllustrations';

const STORAGE_KEYS = {
  STUDENTS: 'readup_students_v1',
  STORIES: 'readup_stories_v1',
  SUBMISSIONS: 'readup_submissions_v1',
  SESSION: 'readup_session_v1',
};

export function getStoredStudents(): Student[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (!raw) {
      saveStudents(DEFAULT_STUDENTS);
      return DEFAULT_STUDENTS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading students from localStorage:', err);
    return DEFAULT_STUDENTS;
  }
}

export function saveStudents(students: Student[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  } catch (err) {
    console.error('Error saving students to localStorage:', err);
  }
}

export function getStoredStories(): Story[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STORIES);
    if (!raw) {
      saveStories([]);
      return [];
    }
    const parsed: Story[] = JSON.parse(raw);
    // Danh sách id của các truyện mẫu cũ do ứng dụng tạo trước đây cần loại bỏ
    const oldSampleStoryIds = new Set([
      'story-lop-1',
      'story-lop-1-2',
      'story-lop-2',
      'story-lop-2-2',
      'story-lop-3',
      'story-lop-3-2',
      'story-lop-3-3',
      'story-extra-giadinh',
      'story-lop-4',
      'story-lop-4-2',
      'story-lop-5',
      'story-lop-5-2',
    ]);

    // Chỉ giữ lại những sách do giáo viên tự thêm (không nằm trong danh sách truyện mẫu cũ)
    const teacherOnlyStories = parsed.filter(
      (s) => !oldSampleStoryIds.has(s.id) && !s.id.startsWith('story-lop-')
    );

    if (teacherOnlyStories.length !== parsed.length) {
      saveStories(teacherOnlyStories);
      return teacherOnlyStories;
    }

    return parsed;
  } catch (err) {
    console.error('Error loading stories from localStorage:', err);
    return [];
  }
}

export function saveStories(stories: Story[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STORIES, JSON.stringify(stories));
  } catch (err) {
    console.error('Error saving stories to localStorage:', err);
  }
}

export function getStoredSubmissions(): QuizSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
    if (!raw) {
      saveSubmissions(DEFAULT_SUBMISSIONS);
      return DEFAULT_SUBMISSIONS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading submissions from localStorage:', err);
    return DEFAULT_SUBMISSIONS;
  }
}

export function saveSubmissions(submissions: QuizSubmission[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));
  } catch (err) {
    console.error('Error saving submissions to localStorage:', err);
  }
}

export function getStoredSession(): AppSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!raw) {
      // Mặc định đăng nhập HS001 để học sinh trải nghiệm ngay hoặc chọn chế độ
      const defaultSession: AppSession = { role: 'student', studentId: 'HS001' };
      saveSession(defaultSession);
      return defaultSession;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading session from localStorage:', err);
    return { role: 'student', studentId: 'HS001' };
  }
}

export function saveSession(session: AppSession): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
  } catch (err) {
    console.error('Error saving session to localStorage:', err);
  }
}

/**
 * Đặt lại dữ liệu về mặc định ban đầu
 */
export function resetAllToDefault() {
  saveStudents(DEFAULT_STUDENTS);
  saveStories(DEFAULT_STORIES);
  saveSubmissions(DEFAULT_SUBMISSIONS);
  saveSession({ role: 'student', studentId: 'HS001' });
}

/**
 * Xóa sạch toàn bộ dữ liệu trong localStorage
 */
export function clearAllStorage() {
  localStorage.removeItem(STORAGE_KEYS.STUDENTS);
  localStorage.removeItem(STORAGE_KEYS.STORIES);
  localStorage.removeItem(STORAGE_KEYS.SUBMISSIONS);
  localStorage.removeItem(STORAGE_KEYS.SESSION);
}

/**
 * Xuất toàn bộ dữ liệu dưới dạng tệp JSON để sao lưu
 */
export function downloadBackupJSON() {
  const data = {
    exportedAt: new Date().toISOString(),
    appName: 'ReadUp - Hành trình đọc sách số',
    version: '1.0.0',
    students: getStoredStudents(),
    stories: getStoredStories(),
    submissions: getStoredSubmissions(),
  };

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute('download', `readup_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Khôi phục dữ liệu từ tệp JSON sao lưu
 */
export function restoreFromBackupJSON(rawJson: string): { success: boolean; message: string } {
  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed.students || !parsed.stories) {
      return { success: false, message: 'Tệp JSON không đúng định dạng sao lưu của ReadUp.' };
    }

    if (Array.isArray(parsed.students)) {
      saveStudents(parsed.students);
    }
    if (Array.isArray(parsed.stories)) {
      saveStories(parsed.stories);
    }
    if (Array.isArray(parsed.submissions)) {
      saveSubmissions(parsed.submissions);
    }

    return { success: true, message: 'Khôi phục dữ liệu thành công! Ứng dụng sẽ tự tải lại.' };
  } catch (err) {
    return { success: false, message: 'Lỗi đọc tệp JSON: định dạng không hợp lệ.' };
  }
}
