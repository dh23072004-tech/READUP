import { Badge, Student, QuizSubmission } from '../types';

export const BADGE_DEFINITIONS: Omit<Badge, 'unlockedAt'>[] = [
  {
    id: 'badge-first-step',
    title: 'Khởi đầu rực rỡ',
    description: 'Hoàn thành bài đọc đầu tiên trên ReadUp',
    icon: '🌱',
  },
  {
    id: 'badge-perfect-10',
    title: 'Điểm 10 xuất sắc',
    description: 'Đạt điểm tối đa (10/10) trong một bài đọc hiểu',
    icon: '⭐',
  },
  {
    id: 'badge-star-collector',
    title: 'Thợ săn sao vàng',
    description: 'Thu thập được từ 15 ngôi sao trở lên',
    icon: '🌟',
  },
  {
    id: 'badge-reading-streak',
    title: 'Chiến binh chăm chỉ',
    description: 'Duy trì chuỗi ngày đọc sách từ 3 ngày trở lên',
    icon: '🔥',
  },
  {
    id: 'badge-bookworm',
    title: 'Mọt sách nhí',
    description: 'Hoàn thành từ 3 bài đọc khác nhau trở lên',
    icon: '📚',
  },
  {
    id: 'badge-master-explorer',
    title: 'Nhà thám hiểm tri thức',
    description: 'Tích lũy trên 200 điểm kinh nghiệm (XP)',
    icon: '🏆',
  },
];

export function calculateStudentBadges(
  student: Student,
  submissions: QuizSubmission[]
): (Badge & { unlocked: boolean })[] {
  const studentSubs = submissions.filter((s) => s.studentId === student.id);
  const uniqueStories = new Set(studentSubs.map((s) => s.storyId));
  const hasPerfectScore = studentSubs.some((s) => s.totalScore >= 10);

  return BADGE_DEFINITIONS.map((badge) => {
    let unlocked = false;
    let unlockedAt: string | undefined = undefined;

    switch (badge.id) {
      case 'badge-first-step':
        unlocked = studentSubs.length > 0;
        if (unlocked) unlockedAt = studentSubs[0].submittedAt;
        break;
      case 'badge-perfect-10':
        unlocked = hasPerfectScore;
        if (unlocked) {
          const match = studentSubs.find((s) => s.totalScore >= 10);
          unlockedAt = match?.submittedAt;
        }
        break;
      case 'badge-star-collector':
        unlocked = student.totalStars >= 15;
        break;
      case 'badge-reading-streak':
        unlocked = student.streakDays >= 3;
        break;
      case 'badge-bookworm':
        unlocked = uniqueStories.size >= 3;
        break;
      case 'badge-master-explorer':
        unlocked = student.xp >= 200;
        break;
      default:
        break;
    }

    return {
      ...badge,
      unlocked,
      unlockedAt,
    };
  });
}
