/**
 * Âm thanh lật trang sách (Flipbook sound)
 * Tạo trực tiếp bằng Web Audio API của trình duyệt:
 * - Hoàn toàn miễn phí, 0ms latency, không tải tệp MP3 ngoài
 * - Mô phỏng tiếng xào xạc nhẹ nhàng tự nhiên của trang giấy thật
 */

let audioCtx: AudioContext | null = null;
let isSoundMuted = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function isAudioMuted(): boolean {
  return isSoundMuted;
}

export function setAudioMuted(muted: boolean): void {
  isSoundMuted = muted;
}

export function playPageFlipSound(): void {
  if (isSoundMuted) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Tạo tiếng xào xạc trang giấy ngắn 120ms
    const duration = 0.12;
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      // Exponential decay envelope
      const env = Math.sin(t * Math.PI) * Math.exp(-t * 3);
      // Gentle colored noise
      data[i] = (Math.random() * 2 - 1) * env * 0.18;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    // Lọc dải tần âm giấy (khoảng 300Hz - 1200Hz)
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(650, ctx.currentTime);
    bandpass.Q.setValueAtTime(1.2, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    noiseSource.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(ctx.destination);

    noiseSource.start();
  } catch {
    // Không làm gián đoạn trải nghiệm nếu trình duyệt chặn tự phát âm
  }
}
