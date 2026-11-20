# Phase 1 · Đêm 1, Đảo Bến

## Giả định

- Một đảo tròn có đường kính khoảng 192 m. Biển mây, vách đá, cây và công trình là hình ảnh. Biên đảo giữ người chơi bên trong, nên kịch bản không bị phạt rơi.
- Người chơi nạp hết số đom đóm cần thiết cho đèn gần nhất bằng một lần nhấn. Có thể nạp nhiều lần khi chưa đủ 7 đom đóm. Chỉ đèn đã thắp tạo vùng an toàn.
- Bóng Mực sinh sau 25 giây, sau đó mỗi 20 giây, tối đa 4. Chạm làm mất một sinh lực, với 3,5 giây miễn nhiễm sau đòn, và không làm rơi đom đóm. Tỏa sáng tốn 2 đom đóm, đẩy lùi và làm choáng Bóng Mực.
- Thắng khi thắp đủ 5 đèn. Hết sinh lực hoặc trời sáng thì thua. Thời lượng một đêm là 7 phút.

## Kiểm chứng

- `npm test` kiểm tra xoay vector và nhảy, nhặt và nạp đom đóm, thắp 5 đèn, tỏa sáng, vùng an toàn, miễn nhiễm, hết giờ và hết sinh lực.
- Kiểm tra CLI bằng scenario riêng, so sánh hai lần chạy từng byte, xác nhận snapshot tick 0, chuỗi sự kiện ở tick 1, điểm kết thúc và mã lỗi 2 nếu tick bị lặp.
- `npm run build` tạo bản HTML tự chứa. Trình duyệt và CLI dùng cùng module mô phỏng với 60 tick mỗi giây.
- Edge trên Windows mở bản HTML trực tiếp, nhận phím W để đi và nhặt đom đóm, nhận E để nạp vào Bến Trăng. Không ghi nhận lỗi trình duyệt trong lượt kiểm tra.
- Lượt mô phỏng map mặc định với seed 18271 đã thắng ở tick 2757, đạt 2398 điểm và còn 3 sinh lực.
- Chưa chạy bộ test ẩn của giảng viên hoặc xác minh trên macOS/Linux.

## Nhật ký AI

Codex chuyển các yêu cầu trong PRD-0 thành logic dùng chung, làm lại cảnh và nhân vật 3D, viết và chạy kiểm tra. Phiên làm việc không có số liệu token hoặc chi phí.
