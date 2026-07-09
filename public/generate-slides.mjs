import PptxGenJS from 'pptxgenjs';

const COLORS = {
  primary: '1B3A5C',
  accent: '2563EB',
  accent2: 'C8102E',
  text: '1F2937',
  muted: '4B5563',
  light: 'F3F4F6',
  white: 'FFFFFF',
  placeholder: 'D1D5DB',
};

const pres = new PptxGenJS();
pres.layout = 'LAYOUT_16x9';
pres.author = 'Hoàng Thế Anh';
pres.title = 'TroFinder - Phản biện đồ án';
pres.subject = 'Hệ thống tìm kiếm và quản lý nhà trọ trực tuyến';

function addHeaderBar(slide, title, section = '') {
  slide.addShape(pres.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.72,
    fill: { color: COLORS.primary },
    line: { color: COLORS.primary },
  });
  slide.addShape(pres.ShapeType.rect, {
    x: 0,
    y: 0.72,
    w: 10,
    h: 0.06,
    fill: { color: COLORS.accent },
    line: { color: COLORS.accent },
  });
  slide.addText(title, {
    x: 0.45,
    y: 0.12,
    w: 8.5,
    h: 0.5,
    fontFace: 'Arial',
    fontSize: 20,
    bold: true,
    color: COLORS.white,
    valign: 'middle',
  });
  if (section) {
    slide.addText(section, {
      x: 8.2,
      y: 0.18,
      w: 1.5,
      h: 0.35,
      fontFace: 'Arial',
      fontSize: 10,
      color: 'BFD7FF',
      align: 'right',
    });
  }
}

function addFooter(slide, num) {
  slide.addText(`TroFinder — Hoàng Thế Anh`, {
    x: 0.45,
    y: 5.25,
    w: 5,
    h: 0.25,
    fontSize: 9,
    color: COLORS.muted,
  });
  slide.addText(String(num), {
    x: 9.2,
    y: 5.25,
    w: 0.5,
    h: 0.25,
    fontSize: 9,
    color: COLORS.muted,
    align: 'right',
  });
}

function addImagePlaceholder(slide, label, x, y, w, h) {
  slide.addShape(pres.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: { color: COLORS.light },
    line: { color: COLORS.placeholder, dashType: 'dash', pt: 1 },
  });
  slide.addText(`[Chèn ảnh]\n${label}`, {
    x,
    y,
    w,
    h,
    fontSize: 9,
    color: COLORS.muted,
    align: 'center',
    valign: 'middle',
  });
}

function addBullets(slide, items, x, y, w, h, opts = {}) {
  const runs = items.map((item, i) => {
    if (typeof item === 'string') {
      return { text: item, options: { bullet: true, breakLine: i < items.length - 1 } };
    }
    const parts = [];
    if (item.label) {
      parts.push({
        text: item.label,
        options: { bold: true, breakLine: false, color: COLORS.primary },
      });
    }
    item.lines.forEach((line, li) => {
      parts.push({
        text: line,
        options: {
          bullet: !item.label || li > 0,
          breakLine: li < item.lines.length - 1 || i < items.length - 1,
          indentLevel: item.label && li === 0 ? 0 : item.label ? 1 : 0,
        },
      });
    });
    return parts;
  }).flat();

  slide.addText(runs, {
    x,
    y,
    w,
    h,
    fontFace: 'Arial',
    fontSize: opts.fontSize || 13,
    color: COLORS.text,
    valign: 'top',
    paraSpaceAfter: 6,
    ...opts,
  });
}

// SLIDE 1 — Cover
{
  const slide = pres.addSlide();
  slide.background = { color: COLORS.primary };
  slide.addShape(pres.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.15,
    fill: { color: COLORS.accent2 },
    line: { color: COLORS.accent2 },
  });
  slide.addShape(pres.ShapeType.rect, {
    x: 0,
    y: 5.475,
    w: 10,
    h: 0.15,
    fill: { color: COLORS.accent },
    line: { color: COLORS.accent },
  });
  slide.addText('HỆ THỐNG TÌM KIẾM VÀ QUẢN LÝ\nNHÀ TRỌ TRỰC TUYẾN', {
    x: 0.6,
    y: 1.35,
    w: 6.2,
    h: 1.5,
    fontFace: 'Arial',
    fontSize: 28,
    bold: true,
    color: COLORS.white,
    lineSpacing: 34,
  });
  slide.addText('(TroFinder)', {
    x: 0.6,
    y: 2.85,
    w: 4,
    h: 0.5,
    fontFace: 'Arial',
    fontSize: 22,
    color: '93C5FD',
    italic: true,
  });
  slide.addText('Đồ án tốt nghiệp — Chương trình Khoa học Máy tính', {
    x: 0.6,
    y: 3.55,
    w: 6,
    h: 0.4,
    fontSize: 14,
    color: 'E5E7EB',
  });
  const info = [
    'Sinh viên: Hoàng Thế Anh',
    'Email: anh.ht204508@sis.hust.edu.vn',
    'GVHD: ThS. Vũ Đức Vượng',
    'Đại học Bách khoa Hà Nội — 2026',
  ];
  slide.addText(
    info.map((t, i) => ({ text: t, options: { breakLine: i < info.length - 1 } })),
    {
      x: 0.6,
      y: 4.15,
      w: 5.5,
      h: 1.2,
      fontSize: 13,
      color: COLORS.white,
      lineSpacing: 20,
    }
  );
  addImagePlaceholder(slide, 'Logo ĐHBK / Screenshot trang chủ', 6.9, 1.2, 2.6, 3.8);
}

// SLIDE 2
{
  const slide = pres.addSlide();
  addHeaderBar(slide, '1. BÀI TOÁN ĐẶT RA', 'Phản biện');
  addBullets(
    slide,
    [
      {
        label: 'Bối cảnh\n',
        lines: [
          'Nhu cầu thuê phòng trọ tăng cao tại đô thị (sinh viên, lao động)',
          'Thị trường chủ yếu qua MXH / website rao vặt → thông tin phân tán',
        ],
      },
      {
        label: 'Khó khăn hiện tại\n',
        lines: [
          'Người thuê: tin giả, ảnh không đúng, khó kiểm chứng chủ trọ',
          'Chủ trọ: quản lý thủ công (sổ sách, Zalo), HĐ & thu tiền rời rạc',
          'Quy trình phân mảnh: tìm phòng → chat ngoài → ký giấy → không theo dõi sau thuê',
        ],
      },
    ],
    0.45,
    0.95,
    5.8,
    3.8,
    { fontSize: 12 }
  );
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.45,
    y: 4.35,
    w: 5.8,
    h: 0.75,
    fill: { color: 'EFF6FF' },
    line: { color: COLORS.accent, pt: 1 },
    rectRadius: 0.08,
  });
  slide.addText('Bài toán: Xây dựng nền tảng web KHÉP KÍN — từ tìm phòng đến HĐ, thanh toán, vận hành sau thuê', {
    x: 0.6,
    y: 4.48,
    w: 5.5,
    h: 0.5,
    fontSize: 12,
    bold: true,
    color: COLORS.primary,
    valign: 'middle',
  });
  addImagePlaceholder(slide, 'Sơ đồ hiện trạng vs TroFinder (Hình 2.8)', 6.5, 0.95, 3.05, 4.15);
  addFooter(slide, 2);
}

// SLIDE 3
{
  const slide = pres.addSlide();
  addHeaderBar(slide, 'MỤC TIÊU & PHẠM VI');
  addBullets(
    slide,
    [
      {
        label: 'Mục tiêu\n',
        lines: [
          'Số hóa toàn bộ vòng đời thuê trọ trên một website',
          'Phục vụ: người thuê, chủ trọ (quy mô vừa & nhỏ), quản trị viên',
        ],
      },
      {
        label: 'Khác biệt so với "bảng tin" rao vặt\n',
        lines: [
          'Xác thực (SSO, 2FA), định danh OCR',
          'Chat, hợp đồng điện tử, ký số, thanh toán theo tháng, nhắc việc tự động',
        ],
      },
      {
        label: 'Phạm vi đồ án\n',
        lines: [
          'Ứng dụng web (Angular + Spring Boot)',
          'Chưa app mobile; thanh toán QR + xác nhận thủ công',
        ],
      },
    ],
    0.45,
    0.95,
    5.5,
    4.1,
    { fontSize: 12 }
  );
  // Mini comparison table
  const rows = [
    [
      { text: 'Tính năng', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white } },
      { text: 'MXH', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white } },
      { text: 'Rao vặt', options: { bold: true, fill: { color: COLORS.primary }, color: COLORS.white } },
      { text: 'TroFinder', options: { bold: true, fill: { color: COLORS.accent }, color: COLORS.white } },
    ],
    ['Chat trực tiếp', 'Qua MXH', 'Không', 'Có'],
    ['HĐ điện tử + ký số', 'Không', 'Không', 'Có'],
    ['OCR định danh', 'Không', 'Không', 'Có'],
    ['QL thanh toán', 'Không', 'Không', 'Có'],
    ['Nhắc hạn HĐ', 'Không', 'Không', 'Có'],
  ];
  slide.addTable(rows, {
    x: 6.15,
    y: 1.0,
    w: 3.4,
    h: 2.6,
    fontSize: 9,
    border: { pt: 0.5, color: COLORS.placeholder },
    align: 'center',
    valign: 'middle',
  });
  slide.addText('(Bảng 6.1 rút gọn)', {
    x: 6.15,
    y: 3.65,
    w: 3.4,
    h: 0.25,
    fontSize: 8,
    color: COLORS.muted,
    align: 'center',
  });
  addFooter(slide, 3);
}

// SLIDE 4
{
  const slide = pres.addSlide();
  addHeaderBar(slide, '2. PHƯƠNG ÁN THỰC HIỆN — Kiến trúc hệ thống');
  const arch = `Kiến trúc Client–Server, FE/BE tách biệt

  ┌─────────────┐     REST API      ┌──────────────────┐
  │ Angular SPA │ ◄──────────────► │ Spring Boot API  │
  └─────────────┘                   └────────┬─────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    ▼                        ▼                        ▼
                 MySQL                   MinIO              OCR / Email / WS`;
  slide.addText(arch, {
    x: 0.45,
    y: 0.9,
    w: 5.6,
    h: 2.5,
    fontFace: 'Courier New',
    fontSize: 10,
    color: COLORS.text,
    fill: { color: COLORS.light },
  });
  addBullets(
    slide,
    [
      'FE: Angular, TypeScript, Leaflet (OpenStreetMap)',
      'BE: Java 17, Spring Boot, Spring Security (JWT), JPA',
      'DB & file: MySQL, MinIO',
      'Real-time: WebSocket/STOMP (chat)',
      'OCR: VNeID QR + OCR.Space + DeepSeek OCR',
    ],
    0.45,
    3.55,
    5.6,
    1.6,
    { fontSize: 11 }
  );
  addImagePlaceholder(slide, 'Biểu đồ gói BE/FE (Hình 4.1–4.2)', 6.2, 0.9, 3.35, 4.2);
  addFooter(slide, 4);
}

// SLIDE 5
{
  const slide = pres.addSlide();
  addHeaderBar(slide, 'Quy trình nghiệp vụ khép kín');
  const flow = `Tìm & lọc phòng (bản đồ)
  → Xem chi tiết / lưu phòng / chat chủ trọ
  → Định danh OCR (CCCD)
  → Tạo hợp đồng → Xác nhận → Ký số 2 bên
  → HĐ hoàn thành → Phòng "đã thuê"
  → Thanh toán tháng + QR + nhắc email/Telegram`;
  slide.addText(flow, {
    x: 0.45,
    y: 0.95,
    w: 5.5,
    h: 2.8,
    fontSize: 12,
    color: COLORS.text,
    fill: { color: 'F0FDF4' },
    line: { color: '86EFAC', pt: 1 },
  });
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.45,
    y: 4.0,
    w: 5.5,
    h: 0.9,
    fill: { color: 'EFF6FF' },
    line: { color: COLORS.accent, pt: 1 },
    rectRadius: 0.06,
  });
  slide.addText('Máy trạng thái HĐ:\nDRAFT → PROPOSED → COUNTERPARTY_CONFIRMED → Ký tuần tự → COMPLETED', {
    x: 0.6,
    y: 4.1,
    w: 5.2,
    h: 0.75,
    fontSize: 11,
    bold: true,
    color: COLORS.primary,
  });
  addImagePlaceholder(slide, 'Quy trình tìm phòng & ký HĐ (Hình 2.8)', 6.15, 0.95, 3.4, 3.95);
  addFooter(slide, 5);
}

// SLIDE 6
{
  const slide = pres.addSlide();
  addHeaderBar(slide, 'Các giải pháp then chốt');
  const boxes = [
    {
      title: '(1) Quy trình khép kín',
      body: 'Một tài khoản — nhiều vai trò; dữ liệu phòng–HĐ–thanh toán liên kết',
      x: 0.4,
      y: 0.95,
    },
    {
      title: '(2) HĐ điện tử HTML → PDF + ký số',
      body: 'Mẫu tự điền; preview; ký tuần tự; không hoàn thành khi thiếu 1 bên',
      x: 5.1,
      y: 0.95,
    },
    {
      title: '(3) Định danh OCR căn cước',
      body: 'Tự trích xuất; tái sử dụng khi tạo HĐ; tăng độ tin cậy tài khoản',
      x: 0.4,
      y: 2.55,
    },
    {
      title: '(4) Thanh toán & nhắc việc',
      body: 'RoomPayment/tháng; breakdown điện nước; QR; cron + email',
      x: 5.1,
      y: 2.55,
    },
    {
      title: '(5) Tìm phòng trực quan',
      body: 'Bộ lọc đa tiêu chí + bản đồ OSM + trạng thái phòng',
      x: 0.4,
      y: 4.15,
    },
  ];
  boxes.forEach((b) => {
    slide.addShape(pres.ShapeType.roundRect, {
      x: b.x,
      y: b.y,
      w: 4.55,
      h: 1.35,
      fill: { color: COLORS.white },
      line: { color: COLORS.accent, pt: 1 },
      rectRadius: 0.08,
    });
    slide.addText(b.title, {
      x: b.x + 0.12,
      y: b.y + 0.1,
      w: 4.3,
      h: 0.35,
      fontSize: 11,
      bold: true,
      color: COLORS.primary,
    });
    slide.addText(b.body, {
      x: b.x + 0.12,
      y: b.y + 0.48,
      w: 4.3,
      h: 0.75,
      fontSize: 10,
      color: COLORS.muted,
    });
  });
  slide.addText('[Chèn collage: bản đồ, OCR, HĐ, dashboard — Hình 4.4–4.6]', {
    x: 5.1,
    y: 4.35,
    w: 4.55,
    h: 0.55,
    fontSize: 9,
    color: COLORS.muted,
    align: 'center',
    italic: true,
  });
  addFooter(slide, 6);
}

// SLIDE 7
{
  const slide = pres.addSlide();
  addHeaderBar(slide, '3. KẾT QUẢ');
  addBullets(
    slide,
    [
      {
        label: 'Sản phẩm hoàn thiện\n',
        lines: [
          'Website TroFinder: tìm phòng, quản lý nhà trọ, dashboard HĐ, chat, admin RBAC',
          'API REST đầy đủ; triển khai thử nghiệm (trofinder.io.vn, HTTPS)',
        ],
      },
      {
        label: 'Đã hiện thực\n',
        lines: [
          'Đăng ký/đăng nhập (OTP, 2FA, SSO Google/Facebook)',
          'Tìm kiếm + lọc + bản đồ + lưu phòng + đánh giá có điều kiện',
          'Chat WebSocket; HĐ điện tử + ký số; OCR 3 nguồn',
          'Thanh toán tháng, QR, breakdown, nhắc tự động & thủ công',
        ],
      },
      {
        label: 'Kiểm thử\n',
        lines: ['Kiểm thử thủ công các luồng: tìm phòng, OCR, HĐ, thanh toán, nhắc việc'],
      },
    ],
    0.45,
    0.95,
    5.5,
    4.0,
    { fontSize: 11 }
  );
  addImagePlaceholder(slide, 'Dashboard chủ trọ + người thuê', 6.15, 1.0, 3.4, 3.9);
  addFooter(slide, 7);
}

// SLIDE 8
{
  const slide = pres.addSlide();
  addHeaderBar(slide, 'Hạn chế & kết luận');
  addBullets(
    slide,
    [
      {
        label: 'Hạn chế\n',
        lines: [
          'Ký số: môi trường dev/demo; cần CA hợp lệ cho thương mại',
          'OCR phụ thuộc chất lượng ảnh; OCR GPU chưa deploy production',
          'Thanh toán: QR + xác nhận thủ công, chưa đối soát ngân hàng',
          'Chưa kiểm thử tải lớn / chưa app mobile',
        ],
      },
    ],
    0.45,
    0.95,
    9.1,
    2.5,
    { fontSize: 12 }
  );
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.45,
    y: 3.65,
    w: 9.1,
    h: 1.0,
    fill: { color: COLORS.primary },
    line: { color: COLORS.primary },
    rectRadius: 0.08,
  });
  slide.addText(
    'Kết luận: Đồ án đã xây dựng thành công nền tảng số hóa quy trình thuê trọ khép kín, vượt mô hình "đăng tin" truyền thống.',
    {
      x: 0.65,
      y: 3.82,
      w: 8.7,
      h: 0.7,
      fontSize: 14,
      bold: true,
      color: COLORS.white,
      valign: 'middle',
    }
  );
  slide.addText('→ Xin trình bày demo hệ thống', {
    x: 0.45,
    y: 4.85,
    w: 9.1,
    h: 0.4,
    fontSize: 16,
    bold: true,
    color: COLORS.accent,
    align: 'center',
  });
  addFooter(slide, 8);
}

await pres.writeFile({ fileName: 'TroFinder-PhanBien.pptx' });
console.log('Created: TroFinder-PhanBien.pptx');
