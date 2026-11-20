# Checkpoint 0

## Giả định

- Nguyên mẫu dùng JavaScript và Three.js, với dữ liệu màn chơi JSON. Điều khiển trực tiếp bằng bàn phím hoặc chạm/nhấp.
- Mây dùng đèn cầm tay, thu thập 6 trong 8 đom đóm và thắp đèn lớn khi đi vào vùng kích hoạt. Các con số, vị trí và luật này là tạm thời.
- PRD-0 và Test Contract cần lấy từ lab board trước khi bắt đầu Phase 1. Prototype chưa có Bóng Mực. Chưa xác minh trên macOS/Linux.

## Kiểm chứng

- `npm test` kiểm tra tốc độ chéo, giới hạn bờ đảo, gom đom đóm không đếm lặp và điều kiện thắp đèn.
- `npm run build` tạo trang HTML tự chứa. Edge trên Windows mở bằng `file://`, hiển thị WebGL và cập nhật bộ đếm từ 0 lên 1 khi di chuyển bằng W. Không ghi nhận lỗi JavaScript trong lượt chạy.
- Kiểm tra tab Phase 1, trợ giảng và hạn của Coach là các mục chuẩn bị còn chờ.

## Nhật ký AI

Codex viết nguyên mẫu, chạy test và kiểm tra trình duyệt. Phiên làm việc không có số liệu token hoặc chi phí để ghi nhận.
