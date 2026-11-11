import {
  ChildProfile,
  CustomRewardItem,
  DictionaryEntry,
  QuestionItem,
  SubjectId,
  TextbookMaterial,
} from "../types";

export const SUBJECT_META: Record<
  SubjectId,
  {
    label: string;
    shortLabel: string;
    description: string;
    accentColor: string;
    bgLight: string;
    textDark: string;
    borderLight: string;
  }
> = {
  math: {
    label: "Toán Học & Hình Học",
    shortLabel: "Toán",
    description: "Nhận biết hình, đếm cạnh, tính chu vi, diện tích và giải toán có lời văn",
    accentColor: "#0284C7",
    bgLight: "bg-sky-50",
    textDark: "text-sky-800",
    borderLight: "border-sky-200",
  },
  vietnamese: {
    label: "Tiếng Việt",
    shortLabel: "Tiếng Việt",
    description: "Đọc hiểu, mở rộng vốn từ, chính tả, từ chỉ sự vật, hoạt động, đặc điểm",
    accentColor: "#059669",
    bgLight: "bg-emerald-50",
    textDark: "text-emerald-800",
    borderLight: "border-emerald-200",
  },
  english: {
    label: "Tiếng Anh (English)",
    shortLabel: "Tiếng Anh",
    description: "Từ vựng, mẫu câu giao tiếp, luyện nghe phát âm chuẩn và sắp xếp câu",
    accentColor: "#D97706",
    bgLight: "bg-amber-50",
    textDark: "text-amber-800",
    borderLight: "border-amber-200",
  },
  science: {
    label: "Tự Nhiên & Xã Hội / Khoa Học",
    shortLabel: "TN & XH / Khoa học",
    description: "Khám phá cơ thể người, thực vật, động vật, môi trường và hiện tượng tự nhiên",
    accentColor: "#4F46E5",
    bgLight: "bg-indigo-50",
    textDark: "text-indigo-800",
    borderLight: "border-indigo-200",
  },
};

export const INITIAL_PROFILES: ChildProfile[] = [
  {
    id: "child-1",
    name: "Nguyễn Minh Khôi",
    nickname: "Bé Bắp",
    grade: 3,
    avatarColor: "#0284C7",
    avatarIcon: "rocket",
    youtubeMinutes: 14.5,
    stars: 86,
    streakDays: 5,
    lastStudyDate: new Date().toISOString().slice(0, 10),
    dailyGoalMinutes: 25,
  },
  {
    id: "child-2",
    name: "Nguyễn Ngọc Bảo An",
    nickname: "Bé Bông",
    grade: 2,
    avatarColor: "#059669",
    avatarIcon: "star",
    youtubeMinutes: 9.0,
    stars: 42,
    streakDays: 3,
    lastStudyDate: new Date().toISOString().slice(0, 10),
    dailyGoalMinutes: 20,
  },
];

export const INITIAL_CUSTOM_REWARDS: CustomRewardItem[] = [
  {
    id: "reward-yt-60",
    title: "Đổi 60 phút (1 tiếng) xem YouTube",
    starsCost: 100,
    youtubeMinutesBonus: 60,
    description: "Cộng trực tiếp 60 phút vào quỹ thời gian xem YouTube của con",
  },
  {
    id: "reward-bookstore",
    title: "Đi nhà sách chọn 1 cuốn truyện tranh",
    starsCost: 100,
    description: "Cuối tuần bố mẹ đưa con đi nhà sách tự chọn 1 cuốn truyện yêu thích",
  },
  {
    id: "reward-icecream",
    title: "1 buổi đi ăn kem hoặc trà sữa cùng cả nhà",
    starsCost: 100,
    description: "Phần thưởng ngọt ngào sau khi con chăm chỉ tích đủ 100 sao",
  },
  {
    id: "reward-lego",
    title: "Bộ đồ chơi lắp ráp / Dụng cụ vẽ mới",
    starsCost: 100,
    description: "Quà tự chọn theo thỏa thuận của bố mẹ và con",
  },
];

export const INITIAL_TEXTBOOKS: TextbookMaterial[] = [
  {
    id: "tb-math-geometry-3",
    title: "SGK Toán 3 — Chủ đề Hình phẳng: Nhận biết hình, Đếm cạnh, Chu vi & Diện tích",
    subject: "math",
    grade: 3,
    extractedText: `CHƯƠNG HÌNH HỌC LỚP 3:
1. Hình tam giác có 3 cạnh, 3 đỉnh, 3 góc. Hình tứ giác có 4 cạnh, 4 đỉnh, 4 góc. Hình ngũ giác có 5 cạnh. Hình lục giác có 6 cạnh.
2. Hình chữ nhật có 4 góc vuông, 2 cạnh dài bằng nhau và 2 cạnh ngắn (chiều rộng) bằng nhau.
   - Muốn tính chu vi hình chữ nhật, ta lấy chiều dài cộng với chiều rộng (cùng đơn vị đo) rồi nhân với 2: P = (a + b) × 2.
   - Muốn tính diện tích hình chữ nhật, ta lấy chiều dài nhân với chiều rộng (cùng đơn vị đo): S = a × b.
3. Hình vuông có 4 góc vuông và 4 cạnh có độ dài bằng nhau.
   - Muốn tính chu vi hình vuông, ta lấy độ dài một cạnh nhân với 4: P = a × 4.
   - Muốn tính diện tích hình vuông, ta lấy độ dài một cạnh nhân với chính nó: S = a × a.`,
    summary:
      "Tổng hợp kiến thức nhận biết các hình phẳng (tam giác, tứ giác, chữ nhật, vuông, ngũ giác, lục giác), cách đếm số cạnh/đỉnh và công thức tính chu vi, diện tích hình chữ nhật, hình vuông.",
    keyConcepts: [
      "Nhận biết đặc điểm hình tam giác (3 cạnh), tứ giác (4 cạnh), ngũ giác (5 cạnh), lục giác (6 cạnh)",
      "Đặc điểm 4 góc vuông và các cạnh của hình chữ nhật, hình vuông",
      "Chu vi là tổng độ dài các cạnh bao quanh hình phẳng",
      "Diện tích là toàn bộ bề mặt bên trong của hình (đơn vị cm², dm², m²)",
    ],
    formulasOrRules: [
      "Chu vi hình chữ nhật: P = (chiều dài + chiều rộng) × 2",
      "Diện tích hình chữ nhật: S = chiều dài × chiều rộng",
      "Chu vi hình vuông: P = cạnh × 4",
      "Diện tích hình vuông: S = cạnh × cạnh",
      "Chu vi hình tam giác: P = cạnh a + cạnh b + cạnh c",
    ],
    sampleExercises: [
      {
        question: "Một hình chữ nhật có chiều dài 8 cm, chiều rộng 5 cm. Tính chu vi và diện tích hình chữ nhật đó.",
        solutionHint: "Chu vi = (8 + 5) × 2 = 26 cm; Diện tích = 8 × 5 = 40 cm²",
        topicTag: "Tính chu vi và diện tích",
      },
      {
        question: "Một mảnh giấy hình vuông có cạnh dài 6 cm. Tính diện tích mảnh giấy đó.",
        solutionHint: "Diện tích = 6 × 6 = 36 cm²",
        topicTag: "Tính diện tích",
      },
      {
        question: "Quan sát hình vẽ bên và cho biết hình đó là hình gì, có bao nhiêu cạnh và bao nhiêu đỉnh?",
        solutionHint: "Đếm số đoạn thẳng khép kín tạo nên hình.",
        topicTag: "Nhận biết hình và đếm cạnh",
      },
    ],
    createdAt: "2026-11-08T08:00:00.000Z",
  },
  {
    id: "tb-viet-3",
    title: "SGK Tiếng Việt 3 — Mở rộng vốn từ, Từ chỉ sự vật, hoạt động, đặc điểm",
    subject: "vietnamese",
    grade: 3,
    extractedText: `BÀI HỌC TIẾNG VIỆT LỚP 3:
1. Từ chỉ sự vật: chỉ người, con vật, cây cối, đồ vật, hiện tượng tự nhiên (ví dụ: giáo viên, chim sẻ, phượng vĩ, chiếc cặp, cơn mưa).
2. Từ chỉ hoạt động, trạng thái: chỉ việc làm, sự vận động (ví dụ: giảng bài, bay lượn, nở rộ, chạy nhảy).
3. Từ chỉ đặc điểm, tính chất: chỉ màu sắc, hình dáng, tính tình (ví dụ: chăm chỉ, rực rỡ, vuông vắn, hiền lành).
4. Câu kiểu Ai là gì? Ai làm gì? Ai thế nào?`,
    summary: "Phân biệt từ chỉ sự vật, hoạt động, đặc điểm và cách đặt câu theo 3 mẫu câu cơ bản ở tiểu học.",
    keyConcepts: [
      "Nhận diện từ chỉ sự vật, từ chỉ hoạt động, từ chỉ đặc điểm",
      "Tìm từ đồng nghĩa, trái nghĩa gần gũi trong học tập và gia đình",
      "Xác định bộ phận trả lời câu hỏi Ai? Làm gì? Thế nào?",
    ],
    formulasOrRules: [
      "Từ chỉ sự vật trả lời cho câu hỏi: Ai? Cái gì? Con gì?",
      "Từ chỉ hoạt động trả lời cho câu hỏi: Làm gì?",
      "Từ chỉ đặc điểm trả lời cho câu hỏi: Thế nào?",
    ],
    sampleExercises: [
      {
        question: "Tìm từ chỉ đặc điểm trong câu: 'Những bông hoa hướng dương vàng rực dưới nắng sớm.'",
        solutionHint: "Từ chỉ đặc điểm màu sắc là: vàng rực",
        topicTag: "Từ chỉ sự vật, hoạt động, đặc điểm",
      },
    ],
    createdAt: "2026-11-08T09:00:00.000Z",
  },
  {
    id: "tb-eng-3",
    title: "SGK Tiếng Anh Global Success — Shapes, School Things & Family",
    subject: "english",
    grade: 3,
    extractedText: `UNIT: SHAPES & SCHOOL THINGS
Vocabulary:
- circle (hình tròn), square (hình vuông), rectangle (hình chữ nhật), triangle (hình tam giác), star (hình ngôi sao).
- pen (bút mực), pencil (bút chì), ruler (thước kẻ), eraser (cục tẩy), school bag (cặp sách), notebook (quyển vở).
Sentence Patterns:
- What shape is it? -> It is a square. / It's a rectangle.
- How many sides does a triangle have? -> It has three sides.
- Do you have a ruler? -> Yes, I do. / No, I don't.`,
    summary: "Từ vựng và mẫu câu tiếng Anh về các hình học cơ bản, đồ dùng học tập và số đếm.",
    keyConcepts: [
      "Từ vựng các hình trong tiếng Anh: square, rectangle, triangle, circle",
      "Từ vựng đồ dùng học tập: pencil, ruler, eraser, notebook",
      "Mẫu câu hỏi đáp về hình dạng và số lượng",
    ],
    formulasOrRules: [
      "What shape is this? -> It's a + [tên hình].",
      "How many + [danh từ số nhiều] + are there? -> There are + [số lượng].",
    ],
    sampleExercises: [
      {
        question: "What shape has 4 equal sides? (Hình nào có 4 cạnh bằng nhau?)",
        solutionHint: "Square (Hình vuông)",
        topicTag: "Từ vựng Hình học & Đồ dùng Tiếng Anh",
      },
    ],
    createdAt: "2026-11-08T10:00:00.000Z",
  },
  {
    id: "tb-sci-3",
    title: "SGK Tự Nhiên & Xã Hội / Khoa Học — Các bộ phận của Thực vật & Cơ thể người",
    subject: "science",
    grade: 3,
    extractedText: `CHỦ ĐỀ THỰC VẬT VÀ MÔI TRƯỜNG:
1. Cây xanh thường có các bộ phận chính: Rễ, Thân, Lá, Hoa và Quả.
   - Rễ cây giúp hút nước và muối khoáng từ trong đất, đồng thời giữ cho cây bám chặt vào đất.
   - Thân cây vận chuyển nước và chất dinh dưỡng từ rễ lên lá và nâng đỡ tán lá.
   - Lá cây thực hiện quang hợp dưới ánh sáng mặt trời để chế tạo chất dinh dưỡng nuôi cây, đồng thời nhả khí ô-xi.
2. Các giác quan của cơ thể người: Thị giác (mắt), Thính giác (tai), Khứu giác (mũi), Vị giác (lưỡi), Xúc giác (da).`,
    summary: "Chức năng của rễ, thân, lá, hoa, quả ở cây xanh và 5 giác quan của cơ thể người.",
    keyConcepts: [
      "Chức năng của rễ, thân, lá trong quá trình sống của thực vật",
      "Quang hợp của lá cây tạo ra chất dinh dưỡng và khí ô-xi",
      "Bảo vệ 5 giác quan của cơ thể",
    ],
    formulasOrRules: [
      "Rễ: Hút nước & muối khoáng + Giữ cây đứng vững",
      "Lá: Quang hợp + Hô hấp + Thoát hơi nước",
    ],
    sampleExercises: [
      {
        question: "Bộ phận nào của cây có nhiệm vụ hút nước và muối khoáng từ đất?",
        solutionHint: "Rễ cây",
        topicTag: "Thực vật và các bộ phận của cây",
      },
    ],
    createdAt: "2026-11-08T11:00:00.000Z",
  },
];

export const INITIAL_QUESTIONS: QuestionItem[] = [
  // --- TOÁN & HÌNH HỌC (Approved) ---
  {
    id: "q-math-1",
    subject: "math",
    grade: 3,
    topic: "Nhận biết hình và đếm cạnh",
    level: "basic",
    type: "geometry_visual",
    status: "approved",
    questionText:
      "Quan sát hình vẽ bên dưới. Đố con biết hình này tên là gì và có tất cả bao nhiêu cạnh, bao nhiêu đỉnh?",
    options: [
      "Hình lục giác — có 6 cạnh và 6 đỉnh",
      "Hình ngũ giác — có 5 cạnh và 5 đỉnh",
      "Hình tứ giác — có 4 cạnh và 4 đỉnh",
      "Hình bát giác — có 8 cạnh và 8 đỉnh",
    ],
    correctAnswer: "Hình lục giác — có 6 cạnh và 6 đỉnh",
    explanation:
      "Khi đếm lần lượt các đoạn thẳng bao quanh hình (từ đỉnh số 1 đến đỉnh số 6), ta thấy hình có đúng 6 cạnh và 6 đỉnh. Hình có 6 cạnh gọi là hình lục giác (giống hình tổ ong).",
    geometrySpec: {
      hasGeometry: true,
      shapeType: "hexagon",
      sideA: 5,
      unit: "cm",
      showGrid: true,
      taskFocus: "count_sides",
      customLabel: "Đếm số cạnh và đỉnh",
    },
    sourceTextbookId: "tb-math-geometry-3",
    createdAt: "2026-11-09T08:00:00.000Z",
  },
  {
    id: "q-math-2",
    subject: "math",
    grade: 3,
    topic: "Tính chu vi hình chữ nhật",
    level: "basic",
    type: "geometry_visual",
    status: "approved",
    questionText:
      "Cho hình chữ nhật ABCD có chiều dài 8 cm và chiều rộng 5 cm như hình vẽ. Chu vi của hình chữ nhật ABCD là bao nhiêu xăng-ti-mét?",
    options: ["26 cm", "40 cm", "13 cm", "21 cm"],
    correctAnswer: "26 cm",
    explanation:
      "Áp dụng công thức tính chu vi hình chữ nhật: P = (chiều dài + chiều rộng) × 2. Ta có: (8 + 5) × 2 = 13 × 2 = 26 (cm).",
    geometrySpec: {
      hasGeometry: true,
      shapeType: "rectangle",
      width: 8,
      height: 5,
      unit: "cm",
      showGrid: true,
      taskFocus: "perimeter",
      customLabel: "Hình chữ nhật ABCD",
    },
    sourceTextbookId: "tb-math-geometry-3",
    createdAt: "2026-11-09T08:05:00.000Z",
  },
  {
    id: "q-math-3",
    subject: "math",
    grade: 3,
    topic: "Tính diện tích hình vuông",
    level: "basic",
    type: "fill_blank",
    status: "approved",
    questionText:
      "Một viên gạch hoa hình vuông có độ dài một cạnh là 7 cm (xem hình vẽ trên lưới ô vuông). Diện tích của viên gạch đó bằng bao nhiêu cm²? (Con chỉ cần điền số)",
    options: [],
    correctAnswer: "49",
    explanation:
      "Muốn tính diện tích hình vuông, ta lấy độ dài một cạnh nhân với chính nó: S = 7 × 7 = 49 (cm²).",
    geometrySpec: {
      hasGeometry: true,
      shapeType: "square",
      width: 7,
      height: 7,
      unit: "cm",
      showGrid: true,
      taskFocus: "area",
      customLabel: "Hình vuông cạnh 7 cm",
    },
    sourceTextbookId: "tb-math-geometry-3",
    createdAt: "2026-11-09T08:10:00.000Z",
  },
  {
    id: "q-math-4",
    subject: "math",
    grade: 3,
    topic: "Tính chu vi hình tam giác",
    level: "basic",
    type: "geometry_visual",
    status: "approved",
    questionText:
      "Cho hình tam giác có độ dài ba cạnh lần lượt là 6 cm, 8 cm và 10 cm như hình minh họa. Chu vi của hình tam giác này là bao nhiêu?",
    options: ["24 cm", "48 cm", "14 cm", "20 cm"],
    correctAnswer: "24 cm",
    explanation:
      "Chu vi hình tam giác bằng tổng độ dài 3 cạnh của nó: P = 6 + 8 + 10 = 24 (cm).",
    geometrySpec: {
      hasGeometry: true,
      shapeType: "right_triangle",
      sideA: 6,
      sideB: 8,
      sideC: 10,
      width: 8,
      height: 6,
      unit: "cm",
      showGrid: true,
      taskFocus: "perimeter",
      customLabel: "Tam giác vuông",
    },
    sourceTextbookId: "tb-math-geometry-3",
    createdAt: "2026-11-09T08:15:00.000Z",
  },
  {
    id: "q-math-5",
    subject: "math",
    grade: 3,
    topic: "Tính diện tích hình chữ nhật",
    level: "basic",
    type: "geometry_visual",
    status: "approved",
    questionText:
      "Một tấm bìa hình chữ nhật có chiều dài 9 cm và chiều rộng 4 cm. Diện tích của tấm bìa đó là bao nhiêu cm²?",
    options: ["36 cm²", "26 cm²", "13 cm²", "45 cm²"],
    correctAnswer: "36 cm²",
    explanation:
      "Diện tích hình chữ nhật bằng chiều dài nhân với chiều rộng: S = 9 × 4 = 36 (cm²). Con cũng có thể đếm trên lưới có 4 hàng, mỗi hàng 9 ô vuông nhỏ.",
    geometrySpec: {
      hasGeometry: true,
      shapeType: "rectangle",
      width: 9,
      height: 4,
      unit: "cm",
      showGrid: true,
      taskFocus: "area",
      customLabel: "Tấm bìa 9 cm × 4 cm",
    },
    sourceTextbookId: "tb-math-geometry-3",
    createdAt: "2026-11-09T08:20:00.000Z",
  },
  {
    id: "q-math-6",
    subject: "math",
    grade: 3,
    topic: "Tính diện tích và chu vi nâng cao",
    level: "advanced",
    type: "geometry_visual",
    status: "approved",
    questionText:
      "[Nâng cao] Một mảnh sân hình chữ L được ghép bởi hai hình chữ nhật trên lưới ô vuông như hình vẽ (kích thước bao ngoài rộng 6 m, cao 5 m, phần khuyết ở góc trên bên phải rộng 3 m, cao 2 m). Diện tích của mảnh sân hình chữ L là bao nhiêu m²?",
    options: ["24 m²", "30 m²", "22 m²", "18 m²"],
    correctAnswer: "24 m²",
    explanation:
      "Cách 1: Lấy diện tích hình chữ nhật lớn (6 × 5 = 30 m²) trừ đi phần góc bị khuyết (3 × 2 = 6 m²), ta được 30 - 6 = 24 m². Cách 2: Đếm trực tiếp số ô vuông được tô màu trên hình vẽ là 24 ô vuông.",
    geometrySpec: {
      hasGeometry: true,
      shapeType: "composite_l",
      width: 6,
      height: 5,
      unit: "m",
      showGrid: true,
      taskFocus: "area",
      customLabel: "Mảnh sân hình chữ L",
    },
    sourceTextbookId: "tb-math-geometry-3",
    createdAt: "2026-11-09T08:25:00.000Z",
  },
  {
    id: "q-math-7",
    subject: "math",
    grade: 3,
    topic: "Nhận biết hình và đếm cạnh",
    level: "basic",
    type: "geometry_visual",
    status: "approved",
    questionText:
      "Quan sát hình vẽ bên dưới. Hình này có tên gọi là gì và có mấy cạnh?",
    options: [
      "Hình ngũ giác — có 5 cạnh",
      "Hình tứ giác — có 4 cạnh",
      "Hình lục giác — có 6 cạnh",
      "Hình tam giác — có 3 cạnh",
    ],
    correctAnswer: "Hình ngũ giác — có 5 cạnh",
    explanation:
      "Hình vẽ có 5 đỉnh (1, 2, 3, 4, 5) nối với nhau tạo thành 5 cạnh thẳng khép kín. Trong toán học, hình có 5 cạnh được gọi là hình ngũ giác ('ngũ' nghĩa là năm).",
    geometrySpec: {
      hasGeometry: true,
      shapeType: "pentagon",
      sideA: 6,
      unit: "cm",
      showGrid: true,
      taskFocus: "count_sides",
      customLabel: "Hình 5 cạnh",
    },
    sourceTextbookId: "tb-math-geometry-3",
    createdAt: "2026-11-09T08:30:00.000Z",
  },
  {
    id: "q-math-8",
    subject: "math",
    grade: 3,
    topic: "Tính chu vi hình chữ nhật",
    level: "advanced",
    type: "fill_blank",
    status: "approved",
    questionText:
      "[Nâng cao] Một hình chữ nhật có chu vi bằng 28 cm và chiều rộng bằng 5 cm. Hỏi chiều dài của hình chữ nhật đó bằng bao nhiêu cm? (Chỉ điền số)",
    options: [],
    correctAnswer: "9",
    explanation:
      "Bước 1: Tìm nửa chu vi (tổng chiều dài và chiều rộng) = 28 : 2 = 14 (cm). Bước 2: Chiều dài hình chữ nhật = 14 - 5 = 9 (cm).",
    geometrySpec: {
      hasGeometry: true,
      shapeType: "rectangle",
      width: 9,
      height: 5,
      unit: "cm",
      showGrid: true,
      taskFocus: "perimeter",
      customLabel: "Chu vi P = 28 cm, rộng = 5 cm",
    },
    sourceTextbookId: "tb-math-geometry-3",
    createdAt: "2026-11-09T08:35:00.000Z",
  },

  // --- TIẾNG VIỆT (Approved) ---
  {
    id: "q-viet-1",
    subject: "vietnamese",
    grade: 3,
    topic: "Từ chỉ sự vật, hoạt động, đặc điểm",
    level: "basic",
    type: "multiple_choice",
    status: "approved",
    questionText:
      "Trong câu: 'Chú chim sâu nhỏ nhắn đang bắt sâu trên cành bưởi', từ nào là từ chỉ ĐẶC ĐIỂM?",
    options: ["nhỏ nhắn", "chim sâu", "bắt sâu", "cành bưởi"],
    correctAnswer: "nhỏ nhắn",
    explanation:
      "'Chim sâu' và 'cành bưởi' là từ chỉ sự vật; 'bắt sâu' là từ chỉ hoạt động; còn 'nhỏ nhắn' miêu tả hình dáng của chú chim nên là từ chỉ đặc điểm.",
    sourceTextbookId: "tb-viet-3",
    createdAt: "2026-11-09T09:00:00.000Z",
  },
  {
    id: "q-viet-2",
    subject: "vietnamese",
    grade: 3,
    topic: "Mở rộng vốn từ & Từ trái nghĩa",
    level: "basic",
    type: "multiple_choice",
    status: "approved",
    questionText: "Từ nào dưới đây trái nghĩa với từ 'chăm chỉ'?",
    options: ["lười biếng", "siêng năng", "cần cù", "chuyên cần"],
    correctAnswer: "lười biếng",
    explanation:
      "'Siêng năng', 'cần cù', 'chuyên cần' đều cùng nghĩa với 'chăm chỉ'. Từ trái nghĩa (ngược lại) với 'chăm chỉ' là 'lười biếng'.",
    sourceTextbookId: "tb-viet-3",
    createdAt: "2026-11-09T09:05:00.000Z",
  },
  {
    id: "q-viet-3",
    subject: "vietnamese",
    grade: 3,
    topic: "Sắp xếp từ thành câu hoàn chỉnh",
    level: "advanced",
    type: "ordering",
    status: "approved",
    questionText:
      "Con hãy bấm chọn lần lượt các cụm từ dưới đây để sắp xếp thành một câu văn đúng ngữ pháp:",
    options: ["Những tia nắng sớm", "chiếu rọi", "trên sân trường", "ấm áp."],
    correctAnswer: "Những tia nắng sớm chiếu rọi trên sân trường ấm áp.",
    explanation:
      "Câu hoàn chỉnh theo mẫu 'Ai làm gì?' gồm chủ ngữ 'Những tia nắng sớm' + hoạt động 'chiếu rọi trên sân trường ấm áp.'",
    sourceTextbookId: "tb-viet-3",
    createdAt: "2026-11-09T09:10:00.000Z",
  },
  {
    id: "q-viet-4",
    subject: "vietnamese",
    grade: 3,
    topic: "Chính tả Tiếng Việt",
    level: "basic",
    type: "fill_blank",
    status: "approved",
    questionText:
      "Điền chữ 'ch' hoặc 'tr' thích hợp vào chỗ trống: '...ong trẻo' (Con hãy gõ cả từ hoàn chỉnh)",
    options: [],
    correctAnswer: "trong trẻo",
    explanation:
      "Từ đúng chính tả là 'trong trẻo' (dùng để tả làn nước hoặc bầu trời, giọng nói rất sạch và sáng).",
    sourceTextbookId: "tb-viet-3",
    createdAt: "2026-11-09T09:15:00.000Z",
  },

  // --- TIẾNG ANH (Approved) ---
  {
    id: "q-eng-1",
    subject: "english",
    grade: 3,
    topic: "Từ vựng Hình học & Đồ dùng Tiếng Anh",
    level: "basic",
    type: "geometry_visual",
    status: "approved",
    questionText:
      "Look at the picture and listen. What shape is it? (Quan sát hình vẽ và bấm nút Loa để nghe câu hỏi)",
    audioText: "What shape is it? It has four equal sides. It is a square.",
    options: [
      "It is a square",
      "It is a triangle",
      "It is a circle",
      "It is a pentagon",
    ],
    correctAnswer: "It is a square",
    explanation:
      "'Square' nghĩa là hình vuông (hình có 4 cạnh bằng nhau). 'Triangle' là hình tam giác, 'Circle' là hình tròn.",
    geometrySpec: {
      hasGeometry: true,
      shapeType: "square",
      width: 6,
      height: 6,
      unit: "cm",
      showGrid: false,
      taskFocus: "identify_shape",
      customLabel: "What shape is it?",
    },
    sourceTextbookId: "tb-eng-3",
    createdAt: "2026-11-09T10:00:00.000Z",
  },
  {
    id: "q-eng-2",
    subject: "english",
    grade: 3,
    topic: "Từ vựng Hình học & Đồ dùng Tiếng Anh",
    level: "basic",
    type: "multiple_choice",
    status: "approved",
    questionText:
      "Listen and choose the correct answer: 'I use a ______ to draw straight lines and measure length.'",
    audioText: "I use a ruler to draw straight lines and measure length.",
    options: ["ruler", "eraser", "crayon", "bookcase"],
    correctAnswer: "ruler",
    explanation:
      "'Ruler' là chiếc thước kẻ dùng để kẻ đường thẳng và đo độ dài cạnh. 'Eraser' là cục tẩy, 'Crayon' là bút sáp màu.",
    sourceTextbookId: "tb-eng-3",
    createdAt: "2026-11-09T10:05:00.000Z",
  },
  {
    id: "q-eng-3",
    subject: "english",
    grade: 3,
    topic: "Mẫu câu giao tiếp Tiếng Anh",
    level: "advanced",
    type: "ordering",
    status: "approved",
    questionText:
      "Bấm nghe và sắp xếp các từ sau thành câu hỏi tiếng Anh đúng: (Hình tam giác có bao nhiêu cạnh?)",
    audioText: "How many sides does a triangle have?",
    options: ["How many", "sides", "does", "a triangle", "have?"],
    correctAnswer: "How many sides does a triangle have?",
    explanation:
      "Cấu trúc hỏi số lượng: 'How many sides does a triangle have?' (Một hình tam giác có bao nhiêu cạnh?).",
    sourceTextbookId: "tb-eng-3",
    createdAt: "2026-11-09T10:10:00.000Z",
  },

  // --- TỰ NHIÊN & XÃ HỘI / KHOA HỌC (Approved) ---
  {
    id: "q-sci-1",
    subject: "science",
    grade: 3,
    topic: "Thực vật và các bộ phận của cây",
    level: "basic",
    type: "multiple_choice",
    status: "approved",
    questionText:
      "Bộ phận nào của cây xanh thực hiện quá trình quang hợp dưới ánh nắng mặt trời để tạo ra chất dinh dưỡng và nhả khí ô-xi?",
    options: ["Lá cây", "Rễ cây", "Hạt giống", "Vỏ thân cây"],
    correctAnswer: "Lá cây",
    explanation:
      "Lá cây chứa chất diệp lục, khi có ánh sáng mặt trời sẽ quang hợp để tổng hợp chất dinh dưỡng nuôi cây và tạo ra khí ô-xi trong lành.",
    sourceTextbookId: "tb-sci-3",
    createdAt: "2026-11-09T11:00:00.000Z",
  },
  {
    id: "q-sci-2",
    subject: "science",
    grade: 3,
    topic: "Thực vật và các bộ phận của cây",
    level: "basic",
    type: "true_false",
    status: "approved",
    questionText:
      "Phát biểu sau đây là Đúng hay Sai: 'Rễ cây chỉ có tác dụng giữ cho cây không bị đổ chứ không hút nước trong đất.'",
    options: ["Đúng", "Sai"],
    correctAnswer: "Sai",
    explanation:
      "Phát biểu trên là SAI vì rễ cây có 2 nhiệm vụ quan trọng: vừa hút nước và muối khoáng hòa tan trong đất để nuôi cây, vừa bám chặt vào đất giữ cây đứng vững.",
    sourceTextbookId: "tb-sci-3",
    createdAt: "2026-11-09T11:05:00.000Z",
  },

  // --- CÂU HỎI AI VỪA SINH CHỜ GIÁO VIÊN DUYỆT TAY (Pending Review) ---
  {
    id: "q-pending-1",
    subject: "math",
    grade: 3,
    topic: "Tính chu vi và diện tích hình thang / tứ giác",
    level: "advanced",
    type: "geometry_visual",
    status: "pending_review",
    questionText:
      "[Đề AI tạo - Chờ duyệt] Quan sát hình thang cân bên dưới có đáy nhỏ 4 cm, đáy lớn 8 cm và hai cạnh bên đều bằng 5 cm. Chu vi của hình thang này là bao nhiêu cm?",
    options: ["22 cm", "17 cm", "24 cm", "20 cm"],
    correctAnswer: "22 cm",
    explanation:
      "Chu vi của hình tứ giác / hình thang bằng tổng độ dài 4 cạnh bao quanh nó: P = 4 + 8 + 5 + 5 = 22 (cm).",
    geometrySpec: {
      hasGeometry: true,
      shapeType: "trapezoid",
      topWidth: 4,
      width: 8,
      height: 4,
      sideA: 5,
      sideB: 5,
      unit: "cm",
      showGrid: true,
      taskFocus: "perimeter",
      customLabel: "Hình thang cân",
    },
    sourceTextbookId: "tb-math-geometry-3",
    createdAt: "2026-11-10T07:30:00.000Z",
  },
  {
    id: "q-pending-2",
    subject: "math",
    grade: 3,
    topic: "Tính diện tích hình chữ nhật",
    level: "basic",
    type: "geometry_visual",
    status: "pending_review",
    questionText:
      "[Đề AI tạo - Chờ duyệt] Một bồn hoa hình chữ nhật có chiều dài 10 dm và chiều rộng 6 dm. Diện tích của bồn hoa đó bằng bao nhiêu dm²?",
    options: ["60 dm²", "32 dm²", "16 dm²", "50 dm²"],
    correctAnswer: "60 dm²",
    explanation:
      "Diện tích bồn hoa hình chữ nhật là: 10 × 6 = 60 (dm²).",
    geometrySpec: {
      hasGeometry: true,
      shapeType: "rectangle",
      width: 10,
      height: 6,
      unit: "dm",
      showGrid: true,
      taskFocus: "area",
      customLabel: "Bồn hoa 10 dm × 6 dm",
    },
    sourceTextbookId: "tb-math-geometry-3",
    createdAt: "2026-11-10T07:35:00.000Z",
  },
];

export const BUILTIN_DICTIONARY: Record<string, DictionaryEntry> = {
  "chu vi": {
    word: "Chu vi",
    wordType: "Khái niệm Toán học (Danh từ)",
    simpleMeaning:
      "Là tổng độ dài của tất cả các đường viền (các cạnh) bao xung quanh một hình phẳng khép kín.",
    exampleSentence:
      "Để rào xung quanh mảnh vườn hình chữ nhật, bác nông dân cần tính chu vi của mảnh vườn đó.",
    relatedWords: ["độ dài đường bao", "cạnh hình vuông", "chiều dài", "chiều rộng"],
    memoryTip:
      "Con hãy tưởng tượng một chú kiến đi bộ đúng 1 vòng quanh mép ngoài của hình — quãng đường chú kiến đi chính là CHU VI!",
  },
  "diện tích": {
    word: "Diện tích",
    wordType: "Khái niệm Toán học (Danh từ)",
    simpleMeaning:
      "Là độ rộng của toàn bộ phần bề mặt nằm bên trong một hình phẳng (thường đo bằng số ô vuông đơn vị cm², dm², m²).",
    exampleSentence:
      "Diện tích căn phòng cho biết cần lát bao nhiêu viên gạch hoa trên mặt sàn.",
    relatedWords: ["bề mặt", "xăng-ti-mét vuông (cm²)", "mét vuông (m²)"],
    memoryTip:
      "Nếu Chu vi là hàng rào bao quanh bên ngoài, thì DIỆN TÍCH là toàn bộ lớp cỏ xanh được trải kín ở bên trong!",
  },
  "tứ giác": {
    word: "Tứ giác",
    wordType: "Khái niệm Hình học (Danh từ)",
    simpleMeaning:
      "Là hình phẳng khép kín có 4 cạnh thẳng, 4 đỉnh và 4 góc (ví dụ: hình vuông, hình chữ nhật, hình thang, hình bình hành).",
    exampleSentence: "Chiếc diều giấy và mặt bàn học đều có dạng hình tứ giác.",
    relatedWords: ["hình vuông", "hình chữ nhật", "hình thang", "4 cạnh"],
    memoryTip: "'Tứ' có nghĩa là số 4, 'giác' là góc. Tứ giác là hình có 4 góc và 4 cạnh!",
  },
  "ngũ giác": {
    word: "Ngũ giác",
    wordType: "Khái niệm Hình học (Danh từ)",
    simpleMeaning: "Là hình phẳng khép kín có 5 cạnh thẳng, 5 đỉnh và 5 góc.",
    exampleSentence: "Những ô đen trên quả bóng đá thường có hình ngũ giác đều.",
    relatedWords: ["lục giác (6 cạnh)", "tứ giác (4 cạnh)", "tam giác (3 cạnh)"],
    memoryTip: "'Ngũ' nghĩa là số 5 (giống như ngũ quả, ngũ hành). Ngũ giác là hình có 5 cạnh!",
  },
  "lục giác": {
    word: "Lục giác",
    wordType: "Khái niệm Hình học (Danh từ)",
    simpleMeaning: "Là hình phẳng khép kín có 6 cạnh thẳng, 6 đỉnh và 6 góc.",
    exampleSentence: "Các chú ong mật xây từng ô tổ ong có hình lục giác đều rất khít nhau.",
    relatedWords: ["ngũ giác", "đa giác", "6 cạnh"],
    memoryTip: "'Lục' nghĩa là số 6. Con đếm đủ 6 cạnh và 6 đỉnh thì đó chính là hình lục giác!",
  },
  "quang hợp": {
    word: "Quang hợp",
    wordType: "Khái niệm Khoa học (Động từ)",
    simpleMeaning:
      "Là quá trình lá cây xanh dùng ánh sáng mặt trời, nước và khí các-bô-níc để tự chế tạo ra chất dinh dưỡng nuôi cây và nhả ra khí ô-xi.",
    exampleSentence: "Nhờ có cây xanh quang hợp mà không khí quanh ta luôn mát mẻ, giàu ô-xi.",
    relatedWords: ["lá cây", "ánh nắng", "khí ô-xi", "chất diệp lục"],
    memoryTip: "'Quang' là ánh sáng, 'hợp' là tổng hợp chất dinh dưỡng nhờ ánh sáng mặt trời.",
  },
  "chăm chỉ": {
    word: "Chăm chỉ",
    wordType: "Từ chỉ đặc điểm (Tính từ)",
    simpleMeaning:
      "Cố gắng làm việc hoặc học tập đều đặn mỗi ngày, không ngại khó và không bỏ cuộc giữa chừng.",
    exampleSentence: "Bạn Minh Khôi rất chăm chỉ làm bài tập nên tích được nhiều sao thưởng.",
    relatedWords: ["siêng năng", "cần cù", "chuyên cần"],
    memoryTip: "Chăm chỉ giống như chú ong nhỏ mỗi ngày đều bay đi tìm mật!",
  },
  "trong trẻo": {
    word: "Trong trẻo",
    wordType: "Từ chỉ đặc điểm (Tính từ)",
    simpleMeaning:
      "Rất trong, sạch, không một chút vẩn đục (dùng cho nước, bầu trời) hoặc âm thanh cao, sáng và dễ nghe.",
    exampleSentence: "Tiếng chim hót buổi sớm vang lên trong trẻo khắp khu vườn.",
    relatedWords: ["trong vắt", "thanh tao", "tinh khiết"],
    memoryTip: "Nhớ viết cả hai chữ đều bắt đầu bằng 'tr' nhé: trong trẻo!",
  },
};
