import { StoryIllustration } from '../types';

/**
 * BẢN ĐỒ MINH HỌA MẪU CŨ ĐÃ DỌN DẸP.
 * ReadUp không tự tạo tranh hay gán truyện mẫu nữa.
 * Mọi hình ảnh minh họa và ảnh bìa do giáo viên tự tải lên và cấu hình theo từng bài đọc.
 */
export const STORY_ILLUSTRATIONS_MAP: Record<
  string,
  {
    coverImage: string;
    coverImageAlt: string;
    illustrations: StoryIllustration[];
  }
> = {};
