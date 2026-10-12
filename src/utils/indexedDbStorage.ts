import { Story } from '../types';
import { PdfRenderedPage } from './pdfRenderer';

/**
 * Quản lý lưu trữ tệp dung lượng lớn (ảnh minh họa, ảnh trang sách, pdf data)
 * bằng IndexedDB chạy hoàn toàn cục bộ trong trình duyệt của người dùng:
 * - 100% Miễn phí, 0ms mạng, không tốn chi phí máy chủ
 * - Không bị giới hạn 5MB như localStorage thông thường
 */

const DB_NAME = 'readup_teacher_files_db';
const DB_VERSION = 1;
const STORE_NAME = 'files';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB không được hỗ trợ trên trình duyệt này.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveFileToIndexedDB(id: string, fileData: string, mimeType: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ id, fileData, mimeType, updatedAt: Date.now() });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Lưu file vào IndexedDB thất bại, bỏ qua lưu trữ phụ trợ:', err);
  }
}

export async function getFileFromIndexedDB(id: string): Promise<string | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        if (req.result && req.result.fileData) {
          resolve(req.result.fileData);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function deleteFileFromIndexedDB(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

export async function getAllFilesFromIndexedDB(): Promise<Array<{ id: string; fileData: string; mimeType: string }>> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        resolve(req.result || []);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Tìm kiếm và lấy dữ liệu PDF thô (Data URI hoặc URL) cho một cuốn sách cụ thể
 * Kiểm tra nhiều phương thức dự phòng để đảm bảo 100% tính sẵn sàng
 */
export async function getPdfDataForStory(story: Story): Promise<string | null> {
  // 1. Kiểm tra trực tiếp bằng story.id
  if (story.id) {
    const direct = await getFileFromIndexedDB(story.id);
    if (direct) return direct;
  }

  // 2. Kiểm tra bằng key từ pdfFileUrl (ví dụ indexeddb://story-teacher-12345)
  if (story.pdfFileUrl && story.pdfFileUrl.startsWith('indexeddb://')) {
    const key = story.pdfFileUrl.replace('indexeddb://', '');
    const fromKey = await getFileFromIndexedDB(key);
    if (fromKey) return fromKey;
  }

  // 3. Nếu pdfFileUrl đã là data URI hoặc URL hợp lệ
  if (
    story.pdfFileUrl &&
    (story.pdfFileUrl.startsWith('data:application/pdf') ||
      story.pdfFileUrl.startsWith('http://') ||
      story.pdfFileUrl.startsWith('https://') ||
      story.pdfFileUrl.startsWith('blob:'))
  ) {
    return story.pdfFileUrl;
  }

  // 4. Tìm kiếm nâng cao trong IndexedDB:
  // So khớp theo ID hoặc tìm tệp PDF duy nhất nếu có
  try {
    const all = await getAllFilesFromIndexedDB();
    if (all.length > 0) {
      // Khớp theo ID một phần
      const matchById = all.find(
        (f) =>
          f.id === story.id ||
          f.id.includes(story.id) ||
          story.id.includes(f.id) ||
          (story.pdfFileUrl && f.id.includes(story.pdfFileUrl.replace('indexeddb://', '')))
      );
      if (matchById && matchById.fileData) {
        return matchById.fileData;
      }

      // Khớp theo tệp PDF
      const pdfFiles = all.filter(
        (f) =>
          (f.mimeType && f.mimeType.includes('pdf')) ||
          (f.fileData && f.fileData.startsWith('data:application/pdf'))
      );
      if (pdfFiles.length === 1) {
        return pdfFiles[0].fileData;
      }
    }
  } catch (err) {
    console.warn('Lỗi khi tra cứu danh sách tệp trong IndexedDB:', err);
  }

  return null;
}

/**
 * Lưu bộ trang PDF đã render vào IndexedDB dạng cache tốc độ cao
 */
export async function saveRenderedPdfPagesToIndexedDB(
  storyId: string,
  pages: PdfRenderedPage[]
): Promise<void> {
  try {
    const cacheKey = `${storyId}-rendered-pages`;
    await saveFileToIndexedDB(cacheKey, JSON.stringify(pages), 'application/json');
  } catch (err) {
    console.warn('Lưu cache trang PDF thất bại:', err);
  }
}

/**
 * Lấy bộ trang PDF đã render từ bộ nhớ IndexedDB
 */
export async function getRenderedPdfPagesFromIndexedDB(
  storyId: string
): Promise<PdfRenderedPage[] | null> {
  try {
    const cacheKey = `${storyId}-rendered-pages`;
    const cached = await getFileFromIndexedDB(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Lỗi đọc cache trang PDF:', err);
  }
  return null;
}
