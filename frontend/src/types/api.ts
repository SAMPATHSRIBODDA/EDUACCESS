export interface ApiListResponse<T> {
  data: T[];
  total?: number;
}

export interface UserRecord {
  id: number;
  name: string;
  email: string;
  role: "student" | "teacher" | "college" | "admin";
  avatar: string;
  collegeEmail?: string;
}

export interface CourseRecord {
  id: number;
  title: string;
  description: string;
  category: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  rating: number;
  reviews: string;
  price: string;
  image: string;
  badge?: string;
  accessibilityTags?: string[];
  topic?: string;
  grade?: string;
  students?: number;
  progress?: number;
  icon?: string;
  panels?: string[];
  units?: CourseUnitRecord[];
  status?: "pending" | "approved" | "rejected";
  createdBy?: string;
  teacherName?: string;
}

export interface McqOptionRecord {
  id: string;
  text: string;
}

export interface CodeTestCaseRecord {
  input: string;
  expectedOutput: string;
}

export interface CourseLectureTestRecord {
  id: string;
  title: string;
  type: "mcq" | "code";
  mcqQuestion?: string;
  options?: McqOptionRecord[];
  correctOptionId?: string;
  prompt?: string;
  functionName?: string;
  testCases?: CodeTestCaseRecord[];
  language?: string;
}

export interface CourseModuleRecord {
  id: string;
  title: string;
  pdfUrl?: string;
  pptUrl?: string;
  videoUrl?: string;
  notes?: string;
}

export interface CourseLectureRecord {
  id: string;
  title: string;
  summary?: string;
  testTimeMinutes?: number;
  documentUrl?: string;
  documentName?: string;
  tests: CourseLectureTestRecord[];
  modules?: CourseModuleRecord[];
}

export interface CourseUnitRecord {
  id: string;
  title: string;
  lectures: CourseLectureRecord[];
}

export interface CourseCreateInput {
  title: string;
  description: string;
  category: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  grade?: string;
  topic?: string;
  students?: number;
  progress?: number;
  icon?: string;
  image?: string;
  price?: string;
  panels?: string[];
  units?: CourseUnitRecord[];
  createdBy?: string;
  collegeEmail?: string;
}

export interface CodeEvaluationCaseResult {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  pass: boolean;
}

export interface CodeEvaluationResponse {
  passed: boolean;
  message: string;
  results: CodeEvaluationCaseResult[];
}

export interface EventRecord {
  id: number;
  time: string;
  name: string;
  location: string;
  date?: string;
  panel: "student" | "teacher" | "college" | "superadmin";
}

export interface AnnouncementRecord {
  id: number;
  title: string;
  description: string;
  date: string;
  tag?: string;
  panel: "student" | "teacher" | "college" | "superadmin";
}

export interface PanelStatRecord {
  label: string;
  value: string;
  trend?: string;
  note?: string;
}

export interface AssignmentCodeQuestionRecord {
    id: string;
    prompt: string;
    codeStarter: string;
    language: string;
    testCases?: CodeTestCaseRecord[];
}

export interface AssignmentSectionRecord {
    id: string;
    title: string;
    sectionType: 'mcq' | 'code';
    mcqQuestions?: Array<{
        id: string;
        question: string;
        options: Array<{ id: string; text: string }>;
        correctOptionId: string;
    }>;
    codeQuestions?: AssignmentCodeQuestionRecord[];
}

export interface AssignmentRecord {
  id: number;
  title: string;
  course: string;
  due: string;
  openDate?: string;
  closeDate?: string;
  submissions: string;
  status: "Pending" | "In Review" | "Graded";
  teacherEmail?: string;
  assignmentType?: "mcq" | "code" | "mixed";
  language?: string;
  timeLimit?: number;
  questions?: Array<{
        id: string;
        question: string;
        options: Array<{ id: string; text: string }>;
        correctOptionId: string;
    }>;
  sections?: AssignmentSectionRecord[];
  mcqQuestion?: string;
  options?: Array<{ id: string; text: string }>;
  correctOptionId?: string;
  prompt?: string;
  codeStarter?: string;
  testCases?: Array<{ input: string; expectedOutput: string }>;
  codeQuestions?: AssignmentCodeQuestionRecord[];
  assignmentFileUrl?: string;
  assignmentFileName?: string;
  assignmentFileSize?: string;
  enrolledStudents?: number;
}

export interface AssignmentAttemptDetailRecord {
  questionId: string;
  questionType: "mcq" | "code";
  passed: boolean;
  language?: string;
  message?: string;
  score?: number;
  total?: number;
}

export interface AssignmentAttemptRecord {
  _id: string;
  assignmentId: number;
  studentEmail: string;
  mcqAnswers: Record<string, string>;
  codeAnswers: Record<string, string>;
  score: number;
  total: number;
  warningCount: number;
  timeTakenSeconds: number;
  attemptNumber: number;
  submittedAt: string;
  details?: AssignmentAttemptDetailRecord[];
  assignmentTitle?: string;
  assignmentCourse?: string;
}

export interface AssignmentAttemptSummaryRecord {
  assignmentId: number;
  attemptsCount: number;
  bestScore: number;
  lastScore: number;
  lastWarningCount: number;
  lastSubmittedAt: string;
}

export interface TeacherAssignmentResultStudentRecord {
  name: string;
  email: string;
  regId?: string;
  attemptsCount?: number;
  bestScore?: number;
  lastScore?: number;
  lastWarningCount?: number;
  lastSubmittedAt?: string;
}

export interface TeacherAssignmentResultRecord {
  assignment: {
    id: number;
    title: string;
    course: string;
  };
  attempted: TeacherAssignmentResultStudentRecord[];
  pending: TeacherAssignmentResultStudentRecord[];
  stats: {
    assignedCount: number;
    attemptedCount: number;
    pendingCount: number;
    averageBestScore: number;
  };
}

export interface AssignmentInput {
  title: string;
  course: string;
  due: string;
  openDate?: string;
  closeDate?: string;
  submissions?: string;
  status?: "Pending" | "In Review" | "Graded";
  teacherEmail?: string;
  assignmentType?: "mcq" | "code" | "mixed";
  language?: string;
  timeLimit?: number;
  questions?: Array<{
        id: string;
        question: string;
        options: Array<{ id: string; text: string }>;
        correctOptionId: string;
    }>;
  sections?: AssignmentSectionRecord[];
  mcqQuestion?: string;
  options?: Array<{ id: string; text: string }>;
  correctOptionId?: string;
  prompt?: string;
  codeStarter?: string;
  testCases?: Array<{ input: string; expectedOutput: string }>;
  assignmentFileUrl?: string;
  assignmentFileName?: string;
  assignmentFileSize?: string;
}

export interface QuizOptionRecord {
  id: string;
  text: string;
}

export interface QuizQuestionRecord {
  id: string;
  question: string;
  options: QuizOptionRecord[];
  correctOptionId: string;
}

export interface QuizRecord {
  id: number;
  title: string;
  course: string;
  teacherEmail?: string;
  status?: "draft" | "active" | "archived";
  questions: QuizQuestionRecord[];
  openDate?: string;
  closeDate?: string;
  timeLimit?: number;
  attempts?: string;
  avgScore?: string;
  attemptsCount?: number;
  avgScoreNumber?: number;
  enrolledStudents?: number;
}

export interface QuizAttemptRecord {
  _id: string;
  quizId: number;
  studentEmail: string;
  answers: Record<string, string>;
  score: number;
  total: number;
  warningCount: number;
  timeTakenSeconds: number;
  attemptNumber: number;
  submittedAt: string;
  quizTitle?: string;
  quizCourse?: string;
}

export interface QuizAttemptSummaryRecord {
  quizId: number;
  attemptsCount: number;
  bestScore: number;
  lastScore: number;
  lastWarningCount: number;
  lastSubmittedAt: string;
}

export interface TeacherQuizResultStudentRecord {
  name: string;
  email: string;
  regId?: string;
  attemptsCount?: number;
  bestScore?: number;
  lastScore?: number;
  lastWarningCount?: number;
  lastSubmittedAt?: string;
}

export interface TeacherQuizResultRecord {
  quiz: {
    id: number;
    title: string;
    course: string;
  };
  attempted: TeacherQuizResultStudentRecord[];
  pending: TeacherQuizResultStudentRecord[];
  stats: {
    assignedCount: number;
    attemptedCount: number;
    pendingCount: number;
    averageBestScore: number;
  };
}

export interface QuizInput {
  title: string;
  course: string;
  teacherEmail?: string;
  status?: "draft" | "active" | "archived";
  questions: QuizQuestionRecord[];
  openDate?: string;
  closeDate?: string;
  timeLimit?: number;
  attempts?: string;
  avgScore?: string;
}

export interface CollegeMemberRecord {
  id: number;
  role: "student" | "teacher";
  name: string;
  regId: string;
  email?: string;
  avatar?: string;
  phone: string;
  branch: string;
  course?: string;
  year?: string;
  subject?: string;
  status?: "active" | "suspended";
  collegeEmail?: string;
}

export interface DepartmentStatRecord {
  branch: string;
  students: number;
  head: string;
}

export interface CollegeTaskRecord {
  title: string;
  note: string;
  tone: "neutral" | "info" | "success" | "warning";
}

export interface CollegeOverviewRecord {
  metrics: {
    totalStudents: number;
    totalTeachers: number;
    pendingCourses: number;
    approvedCourses: number;
    totalDepartments: number;
    activityCount: number;
  };
  activities: Array<{ type: string; message: string; time: string }>;
  teacherName?: string;
  announcements: AnnouncementRecord[];
  events: EventRecord[];
  quickStats: PanelStatRecord[];
  tasks: CollegeTaskRecord[];
  departmentStats: Array<{ branch: string; students: number }>;
}

export interface LearningProgressRecord {
  totalLectures: number;
  totalModules: number;
  completedLectures: number;
  completedModules: number;
  lecturePercent: number;
  modulePercent: number;
  expectedTopicSeconds?: number;
  topicTimeSpentSeconds?: number;
  topicTimePercent?: number;
  topicTimeByLecture?: Record<string, number>;
}

export interface CourseDetailResponse {
  course: CourseRecord;
  progress: LearningProgressRecord;
  enrolled?: boolean;
}

export interface CodeRunResultRecord {
  passed: boolean;
  message: string;
  results: Array<{ input: string; expectedOutput: string; actualOutput: string; pass: boolean }>;
}

export interface TestSubmissionResultRecord {
  submissionId: string;
  score: number;
  total: number;
  passed: boolean;
  details: any[];
}

export interface CourseEnrollmentRecord {
  studentEmail: string;
  courseId: number;
  enrolledAt: string;
  lastAccessedAt: string;
  paymentStatus?: "free" | "paid";
  amountPaid?: number;
  currency?: string;
  paymentOrderId?: string;
  paymentId?: string;
}

export interface CompilerResponse {
  passed: boolean;
  message: string;
  results: Array<{ input: string; expectedOutput: string; actualOutput: string; pass: boolean }>;
}

export interface MessageRecord {
  id: number;
  from: string;
  to: string;
  body: string;
  time: string;
  status: "sent" | "delivered" | "read";
  panel: "teacher" | "student" | "college" | "superadmin";
}

export interface MessageInput {
  from: string;
  to: string;
  body: string;
  time: string;
  status?: "sent" | "delivered" | "read";
  panel?: "teacher" | "student" | "college" | "superadmin";
}

export interface TeacherOverviewRecord {
  stats: PanelStatRecord[];
  students: UserRecord[];
  courses: CourseRecord[];
  events: EventRecord[];
  announcements: AnnouncementRecord[];
  assignments: AssignmentRecord[];
  quizzes: QuizRecord[];
}

export interface TeacherStudentRecord extends UserRecord {
  regId: string;
  phoneNumber: string;
  course: string;
  year: number | string;
  branch: string;
  belongsToBranch: boolean;
  isOpted: boolean;
  activeCourse: string;
  enrolledCourses: Array<{
    courseId: number;
    courseTitle: string;
    paymentStatus: string;
    enrolledAt?: string;
  }>;
}

export interface TeacherStudentsResponse {
  data: TeacherStudentRecord[];
  branch: string;
  branchStudents: TeacherStudentRecord[];
  optedStudents: TeacherStudentRecord[];
  summary: {
    totalStudents: number;
    branchStudents: number;
    optedStudents: number;
    teacherCourses: number;
  };
}

export interface ResourceRecord {
  id: number;
  title: string;
  description: string;
  type: "document" | "video" | "link" | "other";
  fileUrl?: string;
  linkUrl?: string;
  fileName?: string;
  fileSize?: string;
  course: string;
  teacherEmail: string;
  status: "active" | "archived";
  createdAt?: string;
  updatedAt?: string;
  allLevels?: boolean;
}

export interface ResourceInput {
  title: string;
  description?: string;
  type: "document" | "video" | "link" | "other";
  fileUrl?: string;
  linkUrl?: string;
  fileName?: string;
  fileSize?: string;
  course: string;
  teacherEmail?: string;
  status?: "active" | "archived";
  allLevels?: boolean;
}

export interface GradeDistribution {
  range: string;
  count: number;
  color: string;
}

export interface StudentPerformance {
  id: string | number;
  name: string;
  email: string;
  avatar: string;
  assignmentAvg: number;
  quizAvg: number;
  completion: number;
  status: string;
}
