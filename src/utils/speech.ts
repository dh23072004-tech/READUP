/**
 * Web Speech API - Đọc diễn cảm tiếng Việt trực tiếp trên trình duyệt
 * Hoàn toàn miễn phí, không gọi server, không API key
 */

let isCurrentlySpeaking = false;

// Khởi tạo và lưu giọng đọc
function getVietnameseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const viVoice = voices.find(
    (v) => v.lang.toLowerCase().includes('vi') || v.name.toLowerCase().includes('vietnam')
  );
  return viVoice || null;
}

// Lắng nghe sự kiện nạp danh sách giọng của trình duyệt
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    getVietnameseVoice();
  };
}

export function speakVietnameseText(
  text: string,
  onEnd?: () => void,
  onError?: () => void
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }

  // Dừng bài đang đọc nếu có
  window.speechSynthesis.cancel();
  isCurrentlySpeaking = true;

  // Chia đoạn văn thành các câu ngắn để tránh giới hạn timeout 15s của Chrome
  const sentences = text
    .split(/(?<=[.?!…\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length === 0) {
    isCurrentlySpeaking = false;
    if (onEnd) onEnd();
    return true;
  }

  const voice = getVietnameseVoice();
  let currentIndex = 0;

  const speakNext = () => {
    if (!isCurrentlySpeaking) return;

    if (currentIndex >= sentences.length) {
      isCurrentlySpeaking = false;
      if (onEnd) onEnd();
      return;
    }

    const sentence = sentences[currentIndex];
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.9; // Tốc độ vừa phải, rõ ràng cho học sinh tiểu học nghe
    utterance.pitch = 1.05;

    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => {
      currentIndex++;
      speakNext();
    };

    utterance.onerror = (e) => {
      // Bỏ qua lỗi canceled khi người dùng chủ động bấm dừng
      if (e.error !== 'canceled') {
        console.warn('SpeechSynthesis error:', e.error);
        if (onError) onError();
      }
      isCurrentlySpeaking = false;
    };

    window.speechSynthesis.speak(utterance);
  };

  speakNext();
  return true;
}

export function stopSpeaking() {
  isCurrentlySpeaking = false;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeaking(): boolean {
  return isCurrentlySpeaking;
}
