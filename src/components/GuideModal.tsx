import React from 'react';
import { X, BookOpen, User, CheckCircle2, ShieldAlert, Award, FileSpreadsheet, HardDrive, Sparkles } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FFFDF9] border border-[#E7DFCD] rounded-3xl shadow-2xl max-w-2xl w-full my-auto overflow-hidden text-stone-800">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl">
              📖
            </div>
            <div>
              <h2 className="text-lg font-black font-['Quicksand',sans-serif]">
                Hướng dẫn sử dụng & Giới hạn kỹ thuật
              </h2>
              <p className="text-xs text-emerald-100">
                ReadUp – Hành trình đọc sách số cho học sinh tiểu học
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-7 max-h-[75vh] overflow-y-auto space-y-6 text-xs sm:text-sm">
          {/* Critical Disclaimer */}
          <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl">
            <div className="flex items-center gap-2 text-amber-900 font-black mb-1.5 text-sm">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <span>LƯU Ý QUAN TRỌNG VỀ PHIÊN BẢN THỬ NGHIỆM</span>
            </div>
            <ul className="space-y-1.5 text-amber-950 font-medium text-xs leading-relaxed list-disc list-inside">
              <li>
                <strong>Không sử dụng API trả phí:</strong> Ứng dụng chạy 100% bằng JavaScript/React trên trình duyệt, không kết nối Gemini API hay bất kỳ API AI trả phí nào, không yêu cầu API key và hoàn toàn miễn phí.
              </li>
              <li>
                <strong>Đăng nhập thử nghiệm không bảo mật:</strong> Mã học sinh (HS001, HS002...) và mã giáo viên (1234) chỉ là cơ chế phân vai mô phỏng trong trình duyệt. Không dùng mật khẩu thực tế và không bảo mật thông tin bí mật.
              </li>
              <li>
                <strong>Lưu trữ cục bộ qua localStorage:</strong> Dữ liệu (học sinh, điểm số, lịch sử) chỉ lưu trên trình duyệt và thiết bị hiện tại, <em>không tự động đồng bộ sang máy tính hoặc điện thoại khác</em>.
              </li>
              <li>
                <strong>Khuyến nghị sao lưu:</strong> Giáo viên nên định kỳ dùng tính năng <em>"Tải bản sao lưu JSON"</em> trong Cổng giáo viên để giữ lại điểm số ra tệp máy tính.
              </li>
            </ul>
          </div>

          {/* Guide Sections */}
          <div className="space-y-4">
            {/* 1. Dành cho Học sinh */}
            <div className="p-4 bg-white rounded-2xl border border-stone-200">
              <div className="flex items-center gap-2 font-black text-emerald-800 text-sm mb-2">
                <User className="w-4 h-4 text-emerald-600" />
                <span>1. Dành cho Học sinh (Lớp 1 đến Lớp 5)</span>
              </div>
              <ol className="space-y-1 text-stone-700 text-xs leading-relaxed list-decimal list-inside font-medium">
                <li>
                  <strong>Đăng nhập:</strong> Nhập mã học sinh của mình (ví dụ <code>HS001</code> hoặc <code>HS002</code>) hoặc bấm chọn tài khoản mẫu có sẵn.
                </li>
                <li>
                  <strong>Tủ sách số:</strong> Chọn khối lớp (1, 2, 3, 4, 5) để tìm các câu chuyện phù hợp lứa tuổi.
                </li>
                <li>
                  <strong>Đọc truyện:</strong> Có thể điều chỉnh cỡ chữ (A, A+, A++) hoặc bấm <em>"Nghe đọc mẫu"</em> để trình duyệt phát âm giọng tiếng Việt.
                </li>
                <li>
                  <strong>Làm bài đọc hiểu:</strong> Mỗi bài gồm 5 câu hỏi (kết hợp trắc nghiệm và câu hỏi ngắn). Trả lời xong sẽ nhận được sao vàng (⭐) và điểm kinh nghiệm (XP).
                </li>
                <li>
                  <strong>Bộ sưu tập huy hiệu:</strong> Xem các huy hiệu vui nhộn và lịch sử bài làm tại mục <em>"Hành trình của em"</em>.
                </li>
              </ol>
            </div>

            {/* 2. Dành cho Giáo viên */}
            <div className="p-4 bg-white rounded-2xl border border-stone-200">
              <div className="flex items-center gap-2 font-black text-amber-900 text-sm mb-2">
                <HardDrive className="w-4 h-4 text-amber-600" />
                <span>2. Dành cho Thầy Cô Giáo & Quản lý Thư viện</span>
              </div>
              <ol className="space-y-1 text-stone-700 text-xs leading-relaxed list-decimal list-inside font-medium">
                <li>
                  <strong>Vào cổng quản lý:</strong> Chọn "Góc Giáo viên" và nhập mã demo <code>1234</code>.
                </li>
                <li>
                  <strong>Tải sách & Quản lý học liệu:</strong> Ứng dụng không tự sáng tác thêm sách. Thầy/Cô trực tiếp tải lên các tệp bài đọc định dạng <em>TXT, bộ trang tranh ảnh quét (JPG/PNG/WEBP) hoặc tệp JSON</em>.
                </li>
                <li>
                  <strong>Xuất bản & Soạn câu hỏi:</strong> Thầy/Cô có thể chủ động ẩn/hiện từng bài đọc, đổi ảnh bìa, và soạn riêng bộ câu hỏi đọc hiểu (trắc nghiệm và tự luận) cho học sinh.
                </li>
                <li>
                  <strong>Xem và chấm lại bài làm:</strong> Hệ thống tự động so khớp từ khóa câu trả lời ngắn. Giáo viên có thể bấm <em>"Xem & Chấm bài"</em> để đọc nguyên văn câu trả lời của học sinh, điều chỉnh điểm và viết lời khen.
                </li>
                <li>
                  <strong>Xuất tệp Excel (CSV) & Sao lưu JSON:</strong> Tải báo cáo kết quả lượt thi về máy tính và định kỳ sao lưu tệp JSON để bảo toàn dữ liệu.
                </li>
              </ol>
            </div>

            {/* 3. Cơ chế tự chấm điểm */}
            <div className="p-4 bg-[#FAF7F0] rounded-2xl border border-stone-200">
              <div className="flex items-center gap-2 font-black text-stone-900 text-sm mb-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>3. Cơ chế Chấm điểm & So sánh Văn bản</span>
              </div>
              <p className="text-xs text-stone-700 leading-relaxed font-medium">
                • <strong>Câu trắc nghiệm:</strong> Hệ thống tự động đối chiếu phương án (A, B, C, D) và cho điểm tối đa nếu đúng.<br />
                • <strong>Câu trả lời ngắn:</strong> Hệ thống tự động chuẩn hóa chữ tiếng Việt (bỏ dấu chấm câu, chuyển chữ thường) và dò tìm các <em>từ khóa trọng tâm</em> để cho điểm dự kiến (0.5 – 2.0 điểm). Giáo viên luôn có toàn quyền xem xét lại và ghi đè điểm số để đảm bảo tính công bằng và động viên các em.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 text-right">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs"
          >
            Đã hiểu, quay lại ứng dụng
          </button>
        </div>
      </div>
    </div>
  );
};
