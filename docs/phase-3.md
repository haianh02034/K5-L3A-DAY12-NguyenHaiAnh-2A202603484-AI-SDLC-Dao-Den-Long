# Phase 3 · Đèn cạn dầu

## Quyết định thiết kế

Dầu lưu dưới dạng số nguyên theo đơn vị 1/60. Mỗi tick mô phỏng trừ một đơn vị hao tự nhiên, cộng năm đơn vị mỗi Bóng Mực ở trạng thái hút hợp lệ. Cách này giữ chính xác ngưỡng bằng 30, thời điểm đèn tắt và kết quả headless theo seed. Làm tròn một chữ số thập phân khi xuất snapshot hoặc sự kiện. `fuel_drain` ghi theo nhịp 60 tick mô phỏng, sau khi cộng dồn số Bóng Mực đang hút.

Đèn giữ trạng thái đã từng sáng và số lần thắp lại. Lúc dầu cạn, đèn tắt và tiến độ nạp về 0. Lần thắp tiếp theo có giá 5. Số lần thắp thành công trong đêm được lưu trên người chơi để tính sức chứa. Các đèn sáng sẵn trong scenario không tăng bộ đếm này.

Kiểm tra kết thúc sau mọi cập nhật của tick. Hết Ngọn Lửa ưu tiên thua. Khi hết giờ, Mây thắng nếu còn đủ đèn sáng. Các quầng sáng, vòng chiêu và hào quang chỉ thuộc bản trình duyệt. Vòng chính của Q biểu diễn bán kính 5 m. Vảy rồng và tia lửa có thể bay xa hơn vòng tác dụng.

## Changelog · thay đổi ảnh hưởng tương thích

- Dùng Test Contract v1.2 với các trường dầu, lịch sử thắp, sức chứa và trạng thái `drain`.
- Đèn có thể châm dầu hoặc tắt. Đèn dưới 30 dầu mất vùng an toàn và có thể bị hút.
- Bỏ thắng sớm `all_lit`. Các Đêm kéo dài 240, 270 và 300 giây; thắng ở bình minh bằng `dawn_survived` khi còn 3, 4 hoặc 5 đèn.
- Điểm mỗi đom đóm nạp là 5. Thắp lần đầu cộng 100, thắp lại cộng 40. Mỗi Bóng Mực trúng Q cộng 5, hoặc 15 nếu đang hút dầu. Khi thắng, mỗi đèn còn sáng cộng 50 và phần nguyên dầu còn lại; mỗi Ngọn Lửa còn lại cộng 50. Bỏ thưởng thời gian.
- Bản chơi và Thử đảo dùng lại tốc độ, bán kính, số đom đóm và lịch sinh bắt buộc từ PDF. Các test dành riêng cho nới thông số trình duyệt được thay bằng test đối chiếu bản chơi với headless.
- Đường đi qua dốc và bục nhảy có sẵn giúp Bóng Mực của bản 3D tiếp cận tầng tháp. Khoảng phát hiện vẫn là 12 m và bỏ đuổi ở 18 m; mô phỏng chấm giữ các quy tắc đã công bố.
- Bài kiểm tra thắng ngay của Phase 2 được sửa thành giữ đủ đèn tới bình minh. Bài kiểm tra thao tác nạp dùng các đèn khác vị trí để phù hợp với luật chọn đèn gần nhất nhận được dầu.

## Kiểm chứng

- `npm test` kiểm tra thắp, châm, tắt, thắp lại, sức chứa, hai Bóng Mực cùng hút, vùng an toàn phục hồi, Q đẩy Bóng hút dầu và kiểm tra đủ ba ngưỡng thắng.
- Kịch bản headless được chạy hai lần để so JSONL từng byte và kiểm tra lý do `dawn_survived`.
- Edge dùng kịch bản kiểm tra để xác minh bảng màu dễ phân biệt, thanh dầu thấp, Q hiển thị rồng và làm choáng, châm dầu và nút chuyển Đêm khi thắng lúc bình minh.
- Chưa chạy bộ test ẩn của giảng viên hoặc xác minh trên macOS/Linux.

## Nhật ký AI

Codex triển khai luật mới, cải tiến mô hình rồng và giao diện cảnh báo, cập nhật bài kiểm tra, build và chạy kiểm tra trình duyệt. Phiên làm việc không có số liệu token hoặc chi phí.
