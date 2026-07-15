# TroFinderFe

Tài liệu phân tích thiết kế: Phiếu giao nhiệm vụ, báo cáo đồ án, slide thuyết trình cùng các biểu đồ use-case, luồng nghiệp vụ chính được public tại thư mục /public của project.

3.  Mục tiêu của ĐATN:

    3.1. Kiến thức sinh viên thu thập được:
    - Nắm được quy trình phân tích, thiết kế và phát triển một hệ thống web app hoàn chỉnh.
    - Hiểu cách xây dựng hệ thống có nhiều vai trò người dùng như chủ nhà, người thuê, khách truy cập.
    - Nắm được cách tích hợp các chức năng xác thực, tìm kiếm, chat, đánh giá, quản lý phòng trọ và thanh toán trực tuyến.
    - Hiểu thêm về quy trình xử lý dữ liệu, xác thực tài khoản, ký số và ứng dụng OCR trong thực tế."

      3.2. Công nghệ sinh viên thu thập được:

    - Frontend: Angular, TypeScript.
    - Backend: Spring Boot, Java.
    - Database: MySQL.
    - Xác thực và đăng nhập: SSO, OTP xác thực qua email.
    - Tìm kiếm và hiển thị địa điểm trên bản đồ: Google Maps, iframe.
    - Nhận diện và trích xuất dữ liệu: DeepSeek OCR.
    - Ký số và sinh hợp đồng điện tử.
    - Công cụ quản lý mã nguồn và làm việc nhóm: Git, Github."

      3.3. Kỹ năng sinh viên phát triển được:

    - Kỹ năng khảo sát yêu cầu và phân tích bài toán thực tế.
    - Kỹ năng thiết kế luồng nghiệp vụ cho hệ thống nhiều phân quyền.
    - Kỹ năng lập trình frontend, backend, xử lý cơ sở dữ liệu.
    - Kỹ năng tích hợp các dịch vụ bên ngoài như email, bản đồ, OCR, ký số.
    - Kỹ năng xây dựng giao diện thân thiện, dễ sử dụng cho nhiều nhóm người dùng.
    - Kỹ năng quản lý thời gian và viết báo cáo kỹ thuật."

      3.4. Sản phẩm kỳ vọng:

      Một nền tảng web hoàn chỉnh hỗ trợ tìm kiếm và quản lý nhà trọ trực tuyến với các chức năng chính:
      - Đăng ký, đăng nhập, xác thực tài khoản bằng email/OTP hoặc SSO.
      - Chủ nhà có thể tạo tài khoản, đăng bài cho thuê và quản lý phòng trọ.
      - Người thuê có thể tìm kiếm phòng theo tỉnh/thành, xã/huyện, giá phòng, nội thất, giá điện nước và các tiêu chí khác.
      - Hỗ trợ chat giữa chủ nhà và người thuê, bao gồm cả nhóm chat theo từng nhà trọ.
      - Cho phép đánh giá nhà trọ, chỉ những người đã hoặc đang ký hợp đồng mới được đánh giá, có hỗ trợ ẩn danh.
      - Sinh hợp đồng thuê nhà, hợp đồng đặt cọc và đơn tạm trú/tạm vắng bằng OCR.
      - OCR giấy tờ tùy thân (căn cước công dân) để tạo hồ sơ tài khoản chính chủ.
      - Hỗ trợ ký hợp đồng online bằng ký số.
      - Quản lý cơ sở vật chất phòng trọ, báo cáo sự cố, thu tiền và tính tiền điện nước hàng tháng.
      - Gửi thông báo nhắc đóng tiền phòng hàng tháng qua email và hiển thị trạng thái xác nhận thanh toán.
      - Tích hợp QR thanh toán của chủ nhà và trang thông báo để theo dõi trạng thái thanh toán."

        3.5. Vấn đề thực tiễn đồ án giải quyết:

      - Cung cấp nền tảng tìm kiếm nhà trọ minh bạch, giá cả, nội thất rõ ràng, hạn chế môi giới trung gian, ""cò mồi"".
      - Xác thực người dùng bằng OCR CCCD và tài khoản chính chủ.
      - Hỗ trợ tạo, ký kết hợp đồng điện tử và các giấy tờ liên quan.
      - Tích hợp quản lý phòng trọ, thanh toán và giao tiếp giữa các bên trên cùng một hệ thống."

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.9.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
