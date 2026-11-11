# Bút Chì Thông Minh — Nền Tảng Học Tập & Tích Điểm Thưởng Tiểu Học

Một ứng dụng web học tập tương tác dành riêng cho học sinh tiểu học (Lớp 1–5) kết hợp công nghệ AI đọc sách giáo khoa để ra đề (có bước giáo viên duyệt tay), bộ công cụ hỗ trợ làm bài trực quan (hình học động, bảng nháp ô ly, từ điển tiếng Việt, đọc phát âm tiếng Anh) cùng cơ chế thưởng phút xem YouTube và tích sao đổi quà giúp trẻ tự giác học tập mỗi ngày.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Dưới đây là các quyết định sản phẩm đã được chốt dựa trên trao đổi của bạn. Bạn hãy xem qua bản thiết kế tổng thể và bấm **Proceed** (hoặc góp ý chỉnh sửa) để mình bắt đầu lập trình hoàn thiện ứng dụng.

- **Môn học hỗ trợ**: Toán, Tiếng Việt, Tiếng Anh, và Tự nhiên & Xã hội / Khoa học (tùy chỉnh theo khối lớp 1–5 của từng bé).
- **Trọng tâm dạng bài & Hình học trực quan**: Hỗ trợ Trắc nghiệm, Điền khuyết, Đúng/Sai, Sắp xếp thứ tự, và đặc biệt là **Dạng bài Hình học trực quan (Nhận biết hình, Đếm cạnh/đỉnh/góc, Tính chu vi, Tính diện tích)** với trình dựng hình SVG tự động hiển thị kích thước cạnh và lưới ô vuông.
- **Lưu trữ & Sao lưu**: Lưu trữ trực tiếp trên trình duyệt của thiết bị (nhanh, không cần cấu hình tài khoản phức tạp) kèm tính năng **Xuất / Nhập file sao lưu (.json)** để dễ dàng chuyển máy hoặc lưu trữ lâu dài.
- **Quản lý thưởng & Bảo mật Phụ huynh**: Tích hợp **Khóa mã PIN 4 số** bảo vệ khu vực Giáo viên/Phụ huynh và duyệt thưởng, kết hợp **Bộ đếm giờ xem YouTube trực tiếp** trên ứng dụng để tự động trừ số phút thưởng theo thời gian thực.

---

### 1. Overview & Core Concept

- **What It Does**: Hệ thống đóng vai trò vừa là "trợ giảng AI" cho bố mẹ/giáo viên (quét sách giáo khoa sang văn bản/JSON, sinh đề mức Cơ bản & Nâng cao có kiểm duyệt), vừa là "góc học tập thông minh" cho các bé với bàn nháp vẽ hình, từ điển giải nghĩa dễ hiểu, đọc phát âm chuẩn và ví thưởng phút YouTube minh bạch.
- **Target Audience / Persona**:
  - **Phụ huynh / Giáo viên**: Cần công cụ tạo bài tập sát chương trình sách giáo khoa của con mà không tốn thời gian gõ từng câu, đồng thời theo dõi chính xác con học bao nhiêu phút, mạnh/yếu ở chủ đề nào và quản lý thời gian xem YouTube công bằng.
  - **Học sinh Tiểu học (Lớp 1–5)**: Cần giao diện rõ ràng, có hình vẽ minh họa trực quan, có chỗ nháp tính toán ngay trên màn hình và động lực rõ ràng (đúng $\ge 70\%$ được cộng phút xem YouTube và tích lũy 100 sao đổi quà lớn).
- **Key Value**: Chuyển hóa việc "xin xem YouTube" của trẻ thành động lực tự giác hoàn thành bài tập chất lượng cao (phải đạt tối thiểu 70% mới được tính thưởng), đồng thời tự động phát hiện và lấp đầy lỗ hổng kiến thức từ những câu làm sai.

---

### 2. User Experience & Visual Design

#### Key User Flows

1. **Quản lý Hồ sơ Bé (Child Profile Switcher)**:
   - Tạo và chỉnh sửa nhiều hồ sơ cho các bé trong gia đình (Tên, Lớp 1–5, Ảnh đại diện, Số phút YouTube hiện có, Tổng số Sao, Chuỗi ngày học).
   - Chuyển đổi nhanh giữa các bé chỉ với 1 chạm ở thanh điều hướng.

2. **Khu vực Giáo viên / Phụ huynh (Bảo vệ bằng Mã PIN)**:
   - **Kho Sách Giáo Khoa (Textbook Scanner)**: Tải lên ảnh chụp trang sách, file PDF hoặc văn bản $\rightarrow$ AI tự động quét (OCR) và bóc tách thành cấu trúc JSON gồm: *Tên bài học, Kiến thức trọng tâm, Công thức/Quy tắc, và Các bài tập mẫu*. Hệ thống cũng tích hợp sẵn kho bài học mẫu Lớp 1–5 (bao gồm trọn bộ chuyên đề Hình học: nhận biết hình, đếm cạnh, chu vi, diện tích).
   - **Trình tạo đề AI 2 mức độ & Duyệt tay (Manual Review Queue)**:
     - Chọn bài học từ SGK đã lưu, chọn mức độ **Cơ bản** (giữ nguyên dạng bài trong sách, chỉ thay đổi số liệu/tên gọi) hoặc **Nâng cao** (mở rộng tư duy, bài toán nhiều bước, ghép hình tính diện tích trong phạm vi đã học), hoặc **Tạo đề từ phần con còn yếu**.
     - **Bước Duyệt Tay bắt buộc**: Danh sách câu hỏi AI vừa tạo sẽ hiển thị ở bảng *Chờ duyệt*. Giáo viên/Phụ huynh kiểm tra nội dung, xem trước hình vẽ minh họa (đối với bài hình học), chỉnh sửa câu chữ/đáp án nếu cần, rồi bấm **"Duyệt vào Ngân hàng đề"** hoặc **"Loại bỏ"**.
   - **Soạn câu hỏi thủ công**: Form tạo nhanh câu hỏi kèm trình cấu hình hình học (chọn hình vuông, chữ nhật, tam giác, hình ghép, nhập số đo cạnh để tự sinh hình vẽ).

3. **Khu vực Học sinh Làm bài & Công cụ hỗ trợ (Two-Zone Sandbox Layout)**:
   - **Thiết lập bài học**: Bé chọn Môn học (`Toán`, `Tiếng Việt`, `Tiếng Anh`, `Tự nhiên & Xã hội / Khoa học`), chọn chế độ (`Làm đề từ Ngân hàng` hoặc `Luyện lại phần con yếu`), và chọn số câu muốn làm (`5`, `10`, `15`, hoặc `20` câu).
   - **Không gian làm bài 2 vùng (Two-Zone Layout)**:
     - *Vùng Câu hỏi & Tương tác chính (60% chiều rộng)*: Hiển thị câu hỏi chữ to rõ ràng, hình vẽ SVG trực quan (với bài nhận biết hình, đếm cạnh, tính chu vi, diện tích), nút **Đọc thành tiếng (Loa AI)** cho môn Tiếng Anh/Tiếng Việt, và khu vực chọn/nhập đáp án.
     - *Vùng Công cụ Hỗ trợ (40% chiều rộng)*: Chuyển đổi linh hoạt giữa **Bảng vẽ nháp ô ly** (bút nhiều màu, tẩy, lưới ô vuông, công cụ vẽ đoạn thẳng/hình để tính toán hoặc đếm cạnh) và **Từ điển Tiếng Việt Tiểu học** (nhập hoặc bấm vào từ khó để xem giải nghĩa ngắn gọn, dễ hiểu kèm câu ví dụ cho trẻ em).

4. **Chấm điểm, Thưởng YouTube & Đổi Sao**:
   - Khi nộp bài, hệ thống chấm điểm ngay lập tức kèm lời giải chi tiết cho từng câu:
     - **Điều kiện nhận thưởng YouTube**: Nếu tỷ lệ đúng **$\ge 70\%$**, mỗi câu đúng được cộng **+0.5 phút xem YouTube** vào ví của bé. Nếu **$< 70\%$**, bé nhận **0 phút** và được khích lệ ôn lại câu sai để thử sức lại.
     - **Thưởng Sao theo tỷ lệ đúng**:
       - Đúng $\ge 90\%$: **3 Sao**
       - Đúng $80\% - 89\%$: **2 Sao**
       - Đúng $70\% - 79\%$: **1 Sao**
       - Đúng $< 70\%$: **0 Sao**
   - **Cửa hàng Đổi Sao (100 Sao = Quà lớn)**: Khi tích đủ 100 sao, bé có thể chọn đổi **+60 phút (1 tiếng) xem YouTube** hoặc các phần quà tự chọn do bố mẹ cài đặt (đi nhà sách, mua đồ chơi, ăn kem...).
   - **Bộ đếm giờ xem YouTube trực tiếp**: Bé mở tab "Xem Thưởng", nhập link video YouTube hoặc bật đồng hồ đếm ngược; hệ thống tự động trừ dần số phút trong quỹ thưởng và khóa màn hình phát khi hết giờ.

5. **Dashboard Tổng Kết & Phân Tích Điểm Yếu**:
   - **Báo cáo Hôm nay**: Hôm nay con học những môn gì, đạt mấy điểm, thời gian làm bài bao nhiêu phút mỗi môn, tích lũy được bao nhiêu phút YouTube và mấy sao.
   - **Lịch học trong tuần (Weekly Calendar)**: Bảng theo dõi Thứ 2 đến Chủ Nhật đánh dấu những ngày bé có học và tổng thời lượng từng ngày.
   - **Bản đồ Lỗ hổng Kiến thức (Weakness Analyzer)**: Thống kê tỷ lệ đúng/sai theo từng chuyên đề (ví dụ: *Toán - Tính chu vi hình chữ nhật*, *Toán - Đếm cạnh hình tứ giác*, *Tiếng Anh - Từ vựng chủ đề Động vật*). Chỉ rõ phần nào bé đang yếu (<70%) kèm nút **"Tạo đề ôn tập phần yếu này ngay"**.

#### Visual Identity & Theme

- **Aesthetic Direction**: Thiết kế theo phong cách **Interactive Educational Sandbox** hiện đại, trong sáng, rõ ràng, thân thiện với mắt trẻ nhỏ nhưng vẫn đảm bảo tính khoa học, mạch lạc cho phụ huynh quản lý.
- **Color Palette & Mood (60-30-10 Rule)**:
  - **60% Dominant Canvas (`--background`)**: Nền giấy sáng dịu mắt `#F8FAFC` (Slate 50) giúp bé đọc chữ và nhìn hình học lâu không bị mỏi mắt.
  - **30% Structural Surfaces (`--surface`)**: Thẻ nội dung trắng tinh `#FFFFFF` với đường viền mảnh `#E2E8F0` và lưới ô ly nháp `#F1F5F9`.
  - **10% Semantic Focal Accents**:
    - *Primary Action / Toán học*: Xanh lam tri thức `#0284C7` (Sky 600)
    - *Success / Đạt chuẩn $\ge 70\%$*: Xanh ngọc lục bảo `#059669` (Emerald 600)
    - *Star & Reward / Tích sao*: Vàng hổ phách `#D97706` (Amber 600)
    - *Warning / Điểm yếu & Phút YouTube*: Đỏ san hô `#DC2626` (Red 600)
- **Typography & Hierarchy**:
  - *Display / Tiêu đề & Câu hỏi*: `Plus Jakarta Sans` (SemiBold/Bold) — nét chữ tròn trịa, rõ ràng, hỗ trợ tiếng Việt hoàn hảo cho lứa tuổi tiểu học.
  - *Body Prose*: `Plus Jakarta Sans` (Regular/Medium) cỡ chữ lớn (16px–20px ở màn hình làm bài của bé).
  - *Số liệu, Công thức, Đồng hồ đếm giờ & Điểm số*: `JetBrains Mono` với `tabular-nums` giúp các con số thẳng hàng tuyệt đối.
- **Component Styling & Layout**:
  - Bố cục màn hình rộng 1440px, thanh điều hướng 3 vùng gọn gàng.
  - Màn hình làm bài chia 2 cột cân đối (Câu hỏi bên trái — Bảng nháp & Từ điển bên phải) để bé vừa đọc đề vừa vẽ nháp tính chu vi/diện tích mà không phải cuộn trang hay bật tắt cửa sổ đè lên đề bài.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Trình dựng Hình học Trực quan bằng SVG có tham số (Parametric SVG Geometry Engine)**
  - *Chosen Approach*: Thay vì dùng ảnh tĩnh mờ hoặc vẽ hình ngẫu nhiên không đúng tỷ lệ, hệ thống sử dụng bộ dựng hình học SVG tự động từ dữ liệu JSON của câu hỏi (ví dụ: hình chữ nhật có chiều dài $a=8\text{cm}$, chiều rộng $b=4\text{cm}$, hình vuông, tam giác, đa giác để đếm cạnh/đỉnh, hình ghép trên lưới ô vuông $1\text{cm} \times 1\text{cm}$).
  - *Why*: Đảm bảo 100% hình vẽ chính xác tuyệt đối với con số trong đề bài, sắc nét ở mọi kích thước màn hình, giúp bé đếm cạnh, đếm ô vuông hoặc nhìn số đo tính chu vi/diện tích trực quan nhất.

- **Decision 2: Quy trình AI Tạo Đề 2 Tầng + Kiểm Duyệt Thủ Công (Human-in-the-loop)**
  - *Chosen Approach*: Tách biệt hoàn toàn "Hàng đợi câu hỏi AI vừa sinh" (`pending_review`) và "Ngân hàng câu hỏi chính thức" (`approved`).
  - *Why*: Loại bỏ hoàn toàn rủi ro AI ra đề vượt quá chương trình hoặc sai đáp án trước khi đến tay trẻ làm bài. Giáo viên/phụ huynh có toàn quyền sửa số liệu, sửa hình vẽ trước khi bấm duyệt.

- **Decision 3: Lưu trữ Cục bộ Bền vững kết hợp Sao lưu JSON (Local-First + Portable Backup)**
  - *Chosen Approach*: Lưu toàn bộ hồ sơ bé, kho sách giáo khoa đã scan, ngân hàng đề và lịch sử câu sai trong IndexedDB/LocalStorage của thiết bị, kèm chức năng Xuất/Nhập file `.json` 1 chạm.
  - *Why*: Phản hồi tức thì không độ trễ, không lo mất dữ liệu khi mất mạng, và dễ dàng chuyển toàn bộ ngân hàng đề từ máy tính của mẹ sang máy tính bảng của con.

---

### 4. Technical Architecture & Data Strategy

#### Architecture & Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        TOP NAVIGATION BAR (3 ZONES)                          │
│  [Bút Chì Thông Minh]  ──  [Góc Học Tập · Tổng Kết · Đổi Quà · Giáo Viên]    │
│                                                  ──  [Chọn Hồ Sơ Bé / PIN]   │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
┌───────────────────────┐  ┌───────────────────────┐  ┌────────────────────────┐
│   GÓC HỌC SINH        │  │  DASHBOARD & ĐỔI QUÀ  │  │  KHU VỰC GIÁO VIÊN     │
│  (Student Workspace)  │  │  (Analytics & Wallet) │  │  (PIN-Protected Zone)  │
├───────────────────────┤  ├───────────────────────┤  ├────────────────────────┤
│ • Chọn Môn & Số câu   │  │ • Thống kê Hôm nay    │  │ • Upload/Scan SGK      │
│ • Chế độ Ôn phần yếu  │  │   (Điểm, Phút, Môn)   │  │   (Ảnh/PDF/Văn bản)    │
│ • Khung làm bài 2 cột:│  │ • Lịch học 7 ngày     │  │ • Trình tạo đề AI:     │
│   ├─ Câu hỏi + Hình   │  │ • Bản đồ Điểm yếu     │  │   ├─ Mức Cơ bản        │
│   │  SVG (Chu vi,     │  │   theo từng chuyên đề │  │   ├─ Mức Nâng cao      │
│   │  Diện tích, Cạnh) │  │ • Cửa hàng 100 Sao    │  │   └─ Từ phần con yếu   │
│   ├─ Loa đọc Tiếng Anh│  │ • Bộ đếm giờ YouTube  │  │ • Hàng đợi Duyệt Tay   │
│   ├─ Bảng vẽ nháp ô ly│  │   trực tiếp (tự động  │  │   (Sửa & Duyệt câu hỏi)│
│   └─ Từ điển TV trẻ em│  │   trừ phút khi xem)   │  │ • Tạo câu hỏi thủ công │
└───────────┬───────────┘  └───────────┬───────────┘  └───────────┬────────────┘
            │                          │                          │
            └──────────────────────────┼──────────────────────────┘
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│             LOCAL PERSISTENCE STORE (IndexedDB / LocalStorage + JSON)        │
│  • Profiles (Hồ sơ bé, Lớp, Phút YouTube, Sao, Chuỗi ngày học)               │
│  • Textbooks (Sách giáo khoa đã scan dạng Text + JSON cấu trúc kiến thức)    │
│  • QuestionBank (Câu hỏi Chờ duyệt & Đã duyệt, phân loại theo Môn/Chủ đề)    │
│  • StudySessions & MistakeLog (Lịch sử làm bài, Thời gian, Lưu câu sai)      │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │ HTTP POST (/api/ai/*)
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                   EXPRESS BACKEND & GEMINI AI ENGINE (server.ts)             │
│  • POST /api/ai/scan-textbook   ──► gemini-3.8-flash (Multimodal OCR -> JSON)│
│  • POST /api/ai/generate-exam   ──► gemini-3.8-flash (Structured Schema)     │
│  • POST /api/ai/dictionary      ──► gemini-3.8-flash (Giải nghĩa từ tiểu học)│
│  • POST /api/ai/tts             ──► gemini-3.8-flash-lite-tts (WAV Audio)    │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Data Model & State

1. **ChildProfile (`Hồ sơ bé`)**:
   - `id`, `name`, `grade` (Lớp 1–5), `avatar`, `youtubeMinutes` (số phút tích lũy, làm tròn 0.5p), `stars` (tổng sao hiện có), `streakDays`, `customRewards` (danh sách quà đổi 100 sao).
2. **TextbookMaterial (`Tài liệu SGK đã scan`)**:
   - `id`, `subject` (`math` | `vietnamese` | `english` | `science`), `grade`, `title`, `rawText`, `structuredJson` (danh sách khái niệm, công thức, từ vựng, dạng bài mẫu).
3. **QuestionItem (`Câu hỏi trong Ngân hàng`)**:
   - `id`, `subject`, `grade`, `topic` (ví dụ: *"Nhận biết hình và đếm cạnh"*, *"Tính chu vi và diện tích"*, *"Từ vựng Tiếng Anh"*), `level` (`basic` | `advanced`), `type` (`multiple_choice` | `fill_blank` | `true_false` | `ordering` | `geometry_visual`), `status` (`pending_review` | `approved`).
   - `geometrySpec` (tùy chọn cho bài hình học): `{ shapeType: 'rectangle' | 'square' | 'triangle' | 'polygon' | 'composite_grid', dimensions: { width, height, sideA, sideB, sideC, sidesCount, unit }, showGrid: boolean, highlightTarget: 'perimeter' | 'area' | 'sides' | 'vertices' }`.
   - `questionText`, `audioText` (cho môn Tiếng Anh), `options`, `correctAnswer`, `explanation`.
4. **StudySession & MistakeRecord (`Phiên học & Câu sai`)**:
   - Lưu ngày giờ, môn học, thời gian làm bài (giây), tổng số câu, số câu đúng, tỷ lệ %, số phút YouTube được thưởng, số sao đạt được, và danh sách chi tiết từng câu làm sai (`questionId`, `topic`, `userAnswer`, `timestamp`, `resolved`).

#### Interactive Component & State Mapping

- **Quét SGK & Sinh đề AI**: Khi giáo viên tải ảnh trang sách hoặc file văn bản lên, client gửi base64/text tới `/api/ai/scan-textbook`. Server trả về dữ liệu bài học đã chuẩn hóa JSON. Khi bấm "Yêu cầu AI ra đề", `/api/ai/generate-exam` nhận dữ liệu bài học + mức độ (`Cơ bản` / `Nâng cao`) + dạng bài ưu tiên (như nhận biết hình, đếm cạnh, tính chu vi, diện tích) và trả về mảng câu hỏi kèm cấu hình `geometrySpec` đưa vào danh sách `pending_review`.
- **Trải nghiệm làm bài & Công cụ hỗ trợ**:
  - **Bảng nháp Canvas**: Sử dụng HTML5 `<canvas>` hỗ trợ chuột và cảm ứng (touch), cho phép vẽ tự do trên nền giấy ô ly, đổi màu bút, xóa từng nét hoặc xóa sạch khi sang câu mới.
  - **Từ điển Tiếng Việt**: Tra cứu tức thì từ kho từ vựng tiểu học tích hợp sẵn và gọi `/api/ai/dictionary` để giải thích từ vựng theo ngôn ngữ trong sáng, dễ hiểu cho trẻ kèm câu ví dụ.
  - **Đọc thành tiếng (TTS)**: Gọi `/api/ai/tts` (`gemini-3.8-flash-lite-tts`) trả về âm thanh WAV chất lượng cao kết hợp Web Speech API dự phòng, có nút đọc tốc độ bình thường (1.0x) và đọc chậm từng từ (0.75x) cho môn Tiếng Anh.
- **Tính toán Thưởng & Lỗ hổng kiến thức**:
  - Khi kết thúc đề: Tính `accuracy = (correctCount / totalQuestions) * 100`.
  - Nếu `accuracy >= 70`: `earnedMinutes = correctCount * 0.5`; cập nhật trực tiếp vào `profile.youtubeMinutes`.
  - Cộng sao (`3 sao` nếu $\ge 90\%$, `2 sao` nếu $\ge 80\%$, `1 sao` nếu $\ge 70\%$, `0 sao` nếu $< 70\%$).
  - Mọi câu trả lời sai được ghi vào `MistakeRecord` gắn nhãn `topic` để hiển thị trên Dashboard và sẵn sàng cho tính năng "Tạo đề từ phần con còn yếu".
