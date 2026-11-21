# Retro · Đảo Đèn Lồng

## Qua bốn Phase

**Phase 1.** Bản thử ban đầu chứng minh HTML offline và luồng nhặt đom đóm. Sau khi có PRD, tách State khỏi WebGL giúp thay bản đồ và bổ sung Test Contract. Lỗi đầu tiên là ánh sáng môi trường chỉ phục vụ đèn gần nhất nên các đèn khác có vẻ chưa sáng. Quầng riêng theo đèn và bài kiểm tra trình duyệt đã làm lỗi tái hiện được.

**Phase 2.** Lên bản đồ chuẩn bằng tọa độ thay vì bố trí theo cảm giác. Kịch bản thử giúp kiểm tra cầu, lớp cao độ, bục nhảy và điểm qua ba Đêm. Một số điều chỉnh dễ chơi ở bản trình duyệt sau đó xung đột với những số cố định trong ticket. Điều chỉnh lại mã để gameplay và headless dùng cùng số chuẩn, tách phần hỗ trợ kiểm tra ra Thử đảo.

**Phase 3.** Số nguyên 1/60 cho dầu tránh sai lệch khi so ngưỡng 30 và điểm tại bình minh. Vấn đề lực đẩy của Q được tách thành nhận trúng, choáng, đường đẩy và vật cản. Agent ban đầu chỉ đo một đối tượng ở kịch bản mô phỏng và chưa thể giải thích tình huống nhiều quái. Sau khi đo bằng phím Q trên Edge, có thể kiểm tra hai quái cùng đẩy đủ 4 m và báo trạng thái rõ hơn trên HUD.

**Phase 4.** Đo cảnh chuẩn thay vì lấy đồng hồ FPS ở gameplay. Soak báo RSS cả khi còn chịu ảnh hưởng của môi trường Node, nên lệnh sử dụng cấu hình bộ nhớ được công khai. Điểm số và tùy chọn trợ năng cần được kiểm tra qua tải lại trang và qua chức năng xuất, bên cạnh các bài kiểm tra luật chơi.

## Harness và sử dụng AI

`AGENTS.md`, lệnh Node và bộ bài test xác định được vòng phản hồi nhanh. Kiểm tra kịch bản trên Edge giúp phát hiện lỗi tích hợp UI, WebGL và âm thanh mà headless không thấy. Các lỗi AI được phát hiện qua đo vị trí, so commit theo tag, kiểm tra dấu hiệu trên HUD và chạy lại output theo seed. Các phiên có Codex nhưng không có dữ liệu tổng token hoặc hóa đơn để ước tính một con số có căn cứ. Dùng lại renderer, ghi tình huống tái hiện ngắn và chạy bài kiểm tra theo phần thay đổi để giảm lượng ngữ cảnh.

Nếu làm lại, chốt công cụ benchmark và phần đo trên máy mục tiêu từ Phase 1, viết các tình huống cho vùng an toàn và lực đẩy trước khi thêm hiệu ứng, rồi thu video ngắn ngay khi phiên bản phát hành đã được kiểm chứng.
