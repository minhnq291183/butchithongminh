export type SubjectId = "math" | "vietnamese" | "english" | "science";

export type QuestionLevel = "basic" | "advanced";

export type QuestionType =
  | "geometry_visual"
  | "multiple_choice"
  | "fill_blank"
  | "true_false"
  | "ordering";

export type QuestionStatus = "pending_review" | "approved";

export type ShapeType =
  | "rectangle"
  | "square"
  | "triangle"
  | "right_triangle"
  | "trapezoid"
  | "parallelogram"
  | "pentagon"
  | "hexagon"
  | "circle"
  | "composite_l";

export interface GeometrySpec {
  hasGeometry?: boolean;
  shapeType: ShapeType;
  width?: number;
  height?: number;
  topWidth?: number;
  sideA?: number;
  sideB?: number;
  sideC?: number;
  unit?: string;
  showGrid?: boolean;
  taskFocus?: "identify_shape" | "count_sides" | "perimeter" | "area";
  customLabel?: string;
}

export interface QuestionItem {
  id: string;
  subject: SubjectId;
  grade: number;
  topic: string;
  level: QuestionLevel;
  type: QuestionType;
  status: QuestionStatus;
  questionText: string;
  audioText?: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  geometrySpec?: GeometrySpec;
  sourceTextbookId?: string;
  createdAt: string;
}

export interface TextbookExerciseSample {
  question: string;
  solutionHint: string;
  topicTag: string;
}

export interface TextbookMaterial {
  id: string;
  title: string;
  subject: SubjectId;
  grade: number;
  extractedText: string;
  summary: string;
  keyConcepts: string[];
  formulasOrRules: string[];
  sampleExercises: TextbookExerciseSample[];
  createdAt: string;
}

export interface CustomRewardItem {
  id: string;
  title: string;
  starsCost: number;
  youtubeMinutesBonus?: number;
  description: string;
}

export interface RedeemedRewardLog {
  id: string;
  childId: string;
  rewardTitle: string;
  starsSpent: number;
  redeemedAt: string;
}

export interface MistakeRecord {
  id: string;
  childId: string;
  questionId: string;
  subject: SubjectId;
  topic: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  geometrySpec?: GeometrySpec;
  timestamp: string;
  resolved: boolean;
}

export interface StudySessionRecord {
  id: string;
  childId: string;
  subject: SubjectId;
  dateStr: string; // YYYY-MM-DD
  timestamp: string;
  durationSeconds: number;
  totalQuestions: number;
  correctCount: number;
  accuracyPercent: number;
  earnedYoutubeMinutes: number;
  earnedStars: number;
  topicsCovered: string[];
  wrongQuestionIds: string[];
}

export interface ChildProfile {
  id: string;
  name: string;
  nickname: string;
  grade: number; // 1 to 5
  avatarColor: string;
  avatarIcon: string;
  youtubeMinutes: number; // Earned YouTube minutes balance (0.5 min per correct answer if >= 70%)
  stars: number; // Earned stars (3, 2, 1, 0 per test; 100 stars = redeem gift)
  streakDays: number;
  lastStudyDate?: string;
  dailyGoalMinutes: number;
}

export interface DictionaryEntry {
  word: string;
  wordType: string;
  simpleMeaning: string;
  exampleSentence: string;
  relatedWords: string[];
  memoryTip: string;
}
