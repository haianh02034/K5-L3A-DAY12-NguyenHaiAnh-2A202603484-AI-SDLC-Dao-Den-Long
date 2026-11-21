# Phase 2 · Ba hòn đảo

## Thay đổi từ Phase 1

- Tag `phase-1` lưu phiên bản Đảo Bến ban đầu. Chiến dịch mới bắt đầu ở Đảo Bến chuẩn hóa của Ticket-02, sau đó mở Đảo Cau và Đảo Chuông khi thắng Đêm trước.
- Dùng các vị trí đèn, điểm sinh, giới hạn đảo và hằng số của Ticket-02. Hình ảnh rừng, trang phục, quái và va chạm trang trí của bản 3D giữ phong cách đã có. Va chạm có tính chấm điểm dùng địa hình chung với headless.
- Đêm 3 bắt đầu ở (0, 0, 29), trên tầng trệt ngoài đĩa tháp. Ticket chỉ chỉ định tọa độ xuất phát ở Đêm 1. Khi rơi, Mây trở lại điểm xuất phát của Đêm hiện tại.
- Chưa có giá trị riêng trong ticket cho tốc độ đi lang thang của Bóng Mực, nên dùng 40% tốc độ đuổi. Đom đóm mặc định lấy 20 vị trí khác nhau từ tập điểm chuẩn bằng seed.
- Thiết lập âm lượng và độ nhạy chuột lưu trong trình duyệt. Giữ chuột phải và kéo để xoay camera.

## Kiểm chứng

- `npm test` kiểm tra luật di chuyển, lướt, nhặt và nạp đèn, vùng an toàn, cướp đồ trước sát thương, bùa, gió, rơi và hồi sinh, hai tuyến bục nhảy, pause và JSONL tất định.
- Scenario thắng trong CLI kiểm tra tick 0, thứ tự sự kiện và công thức điểm. Kịch bản sai định dạng trả mã 2.
- Edge mở HTML offline và kiểm tra menu, intro, cài đặt, tạm dừng và tiếp tục. Bản kiểm tra trình duyệt kích hoạt trạng thái thắng có chủ đích ở mỗi Đêm để xác minh chuyển Đêm và tổng điểm đến màn Bình Minh.
- Bài test ẩn của giảng viên và môi trường macOS/Linux chưa được xác minh.

## Nhật ký AI

Codex chuyển Ticket-02 thành luật mô phỏng dùng chung, mở rộng cảnh 3D và chiến dịch, thêm âm thanh tổng hợp và kiểm tra hồi quy. Phiên làm việc không có số liệu token hoặc chi phí.
