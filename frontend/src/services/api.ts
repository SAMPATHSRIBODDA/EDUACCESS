import type {
  AssignmentInput,
  AssignmentAttemptRecord,
  AssignmentAttemptSummaryRecord,
  AssignmentRecord,
  AnnouncementRecord,
  ApiListResponse,
  CourseEnrollmentRecord,
  CodeRunResultRecord,
  CourseDetailResponse,
  CodeEvaluationResponse,
  CourseCreateInput,
  CourseRecord,
  CollegeMemberRecord,
  CollegeOverviewRecord,
  CompilerResponse,
  EventRecord,
  GradeDistribution,
  MessageInput,
  MessageRecord,
  PanelStatRecord,
  QuizInput,
  QuizAttemptRecord,
  QuizAttemptSummaryRecord,
  QuizRecord,
  ResourceInput,
  ResourceRecord,
  TestSubmissionResultRecord,
  StudentPerformance,
  TeacherOverviewRecord,
  TeacherAssignmentResultRecord,
  TeacherQuizResultRecord,
  UserRecord,
} from "../types/api";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "http://localhost:5000/api";
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

async function extractErrorMessage(response: Response) {
  try {
    const payload = await response.json();
    const message = String(payload?.message || "").trim();
    if (message) {
      return message;
    }
  } catch {
    // Ignore parse failures and use status-based fallback.
  }

  return `API request failed: ${response.status}`;
}

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

export const resolveAssetUrl = (value?: string) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:") || raw.startsWith("blob:")) {
    return raw;
  }

  if (raw.startsWith("/")) {
    return `${API_ORIGIN}${raw}`;
  }

  return raw;
};

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }
  return response.json() as Promise<T>;
}

async function mutate<T>(path: string, method: "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

export const api = {
  getUsers: () => request<ApiListResponse<UserRecord>>("/users"),
  getGuides: () => request("/guides"),
  getCourses: (panel?: string) =>
    request<ApiListResponse<CourseRecord>>(panel ? `/courses?panel=${encodeURIComponent(panel)}` : "/courses"),
  getCourseDetail: (courseId: number, studentEmail: string) =>
    request<{ data: CourseDetailResponse }>(`/course/${encodeURIComponent(String(courseId))}?studentEmail=${encodeURIComponent(studentEmail)}`),
  getLectureDetail: (lectureId: string, studentEmail: string) =>
    request<{ data: any }>(`/lecture/${encodeURIComponent(lectureId)}?studentEmail=${encodeURIComponent(studentEmail)}`),
  createCourse: (payload: CourseCreateInput) => mutate<{ data: CourseRecord }>("/courses", "POST", payload),
  updateCourse: (id: number, payload: CourseCreateInput) => mutate<{ data: CourseRecord }>(`/courses/${encodeURIComponent(String(id))}`, "PUT", payload),
  updateCourseStatus: (id: number, status: "pending" | "approved" | "rejected") =>
    mutate<{ data: CourseRecord }>(`/courses/${encodeURIComponent(String(id))}/status`, "PATCH", { status }),
  compileCourseCode: (payload: { code: string; functionName: string; testCases: Array<{ input: string; expectedOutput: string }> }) =>
    mutate<{ data: CodeEvaluationResponse }>("/courses/compile", "POST", payload),
  runLearningCode: (payload: { code: string; functionName: string; testCases: Array<{ input: string; expectedOutput: string }>; language: string }) =>
    mutate<{ data: CodeRunResultRecord }>("/code/run", "POST", payload),
  submitLearningTest: (payload: {
    studentEmail: string;
    courseId: number;
    lectureId: string;
    testId: string;
    answers?: Record<string, string>;
    code?: string;
    language?: string;
    warningCount?: number;
    timeTakenSeconds?: number;
  }) => mutate<{ data: TestSubmissionResultRecord }>("/test/submit", "POST", payload),
  trackTopicTime: (payload: { studentEmail: string; courseId: number; lectureId: string; secondsSpent: number }) =>
    mutate<{ data: any }>("/progress/topic-time", "POST", payload),
  markModuleCompleted: (payload: { studentEmail: string; courseId: number; lectureId: string; moduleId: string }) =>
    mutate<{ data: any }>("/progress/mark-module", "POST", payload),
  getTestSubmissions: (studentEmail: string, courseId: number) =>
    request<{ data: any[]; total: number }>(`/test/submissions?studentEmail=${encodeURIComponent(studentEmail)}&courseId=${encodeURIComponent(String(courseId))}`),
  getEnrollments: (studentEmail: string) =>
    request<{ data: CourseEnrollmentRecord[]; total: number }>(`/enrollments?studentEmail=${encodeURIComponent(studentEmail)}`),
  enrollInCourse: (studentEmail: string, courseId: number) =>
    mutate<{ data: CourseEnrollmentRecord }>("/enrollments/enroll", "POST", { studentEmail, courseId }),
  createCoursePaymentOrder: (studentEmail: string, courseId: number) =>
    mutate<{
      data: {
        keyId: string;
        orderId: string;
        amount: number;
        currency: string;
        courseId: number;
        courseTitle: string;
      };
    }>("/payments/razorpay/order", "POST", { studentEmail, courseId }),
  verifyCoursePaymentAndEnroll: (payload: {
    studentEmail: string;
    courseId: number;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => mutate<{ data: CourseEnrollmentRecord; message?: string }>("/payments/razorpay/verify", "POST", payload),
  getEvents: (panel?: string) =>
    request<ApiListResponse<EventRecord>>(panel ? `/events?panel=${encodeURIComponent(panel)}` : "/events"),
  createEvent: (payload: { time: string; name: string; location: string; date?: string; panel?: string }) =>
    mutate<{ data: EventRecord }>("/events", "POST", payload),
  updateEvent: (id: number, payload: Partial<{ time: string; name: string; location: string; date: string; panel: string }>) =>
    mutate<{ data: EventRecord }>(`/events/${encodeURIComponent(String(id))}`, "PUT", payload),
  deleteEvent: (id: number) => mutate<{ data: { deleted: true; id: number } }>(`/events/${encodeURIComponent(String(id))}`, "DELETE"),
  getAnnouncements: (panel?: string) =>
    request<ApiListResponse<AnnouncementRecord>>(
      panel ? `/announcements?panel=${encodeURIComponent(panel)}` : "/announcements"
    ),
  createAnnouncement: (payload: { title: string; description: string; date: string; tag?: string; panel?: string }) =>
    mutate<{ data: AnnouncementRecord }>("/announcements", "POST", payload),
  updateAnnouncement: (id: number, payload: Partial<{ title: string; description: string; date: string; tag: string; panel: string }>) =>
    mutate<{ data: AnnouncementRecord }>(`/announcements/${encodeURIComponent(String(id))}`, "PUT", payload),
  deleteAnnouncement: (id: number) => mutate<{ data: { deleted: true; id: number } }>(`/announcements/${encodeURIComponent(String(id))}`, "DELETE"),
  createCollegeActivity: (payload: { type: string; message: string; time: string }) =>
    mutate<{ data: { id: number; type: string; message: string; time: string } }>("/college-activities", "POST", payload),
  updateCollegeActivity: (id: number, payload: { type?: string; message?: string; time?: string }) =>
    mutate<{ data: { id: number; type: string; message: string; time: string } }>(`/college-activities/${encodeURIComponent(String(id))}`, "PUT", payload),
  deleteCollegeActivity: (id: number) =>
    mutate<{ data: { deleted: true; id: number } }>(`/college-activities/${encodeURIComponent(String(id))}`, "DELETE"),
  getStats: (panel: string) => request<{ data: PanelStatRecord[]; panel: string }>(`/stats/${encodeURIComponent(panel)}`),
  getAssignments: (teacherEmail?: string, course?: string) => {
    let url = "/assignments";
    const params = new URLSearchParams();
    if (teacherEmail) params.append("teacherEmail", teacherEmail);
    if (course) params.append("course", course);
    if (params.toString()) url += `?${params.toString()}`;
    return request<ApiListResponse<AssignmentRecord>>(url);
  },
  getStudentAssignmentAttempts: (studentEmail: string) =>
    request<{ data: AssignmentAttemptRecord[]; summary: AssignmentAttemptSummaryRecord[] }>(
      `/assignments/attempts/student?studentEmail=${encodeURIComponent(studentEmail)}`
    ),
  submitAssignmentAttempt: (
    assignmentId: number,
    payload: {
      studentEmail: string;
      mcqAnswers: Record<string, string>;
      codeAnswers: Record<string, string>;
      warningCount?: number;
      timeTakenSeconds?: number;
    }
  ) => mutate<{ data: AssignmentAttemptRecord }>(`/assignments/${encodeURIComponent(String(assignmentId))}/attempts`, "POST", payload),
  getTeacherAssignmentResults: (assignmentId: number, teacherEmail?: string) =>
    request<{ data: TeacherAssignmentResultRecord }>(
      teacherEmail
        ? `/assignments/${encodeURIComponent(String(assignmentId))}/results?teacherEmail=${encodeURIComponent(teacherEmail)}`
        : `/assignments/${encodeURIComponent(String(assignmentId))}/results`
    ),
  createAssignment: (payload: AssignmentInput) => mutate<{ data: AssignmentRecord }>("/assignments", "POST", payload),
  updateAssignment: (id: number, payload: Partial<AssignmentInput>) =>
    mutate<{ data: AssignmentRecord }>(`/assignments/${encodeURIComponent(String(id))}`, "PUT", payload),
  deleteAssignment: (id: number) => mutate<{ data: { deleted: true; id: number } }>(`/assignments/${encodeURIComponent(String(id))}`, "DELETE"),
  compileAssignmentCode: (payload: { code: string; functionName: string; testCases: Array<{ input: string; expectedOutput: string }>; language: string }) =>
    mutate<{ data: CompilerResponse }>("/assignments/compile", "POST", payload),
  getCollegeMembers: (role?: "student" | "teacher") =>
    request<ApiListResponse<CollegeMemberRecord>>(role ? `/college-members?role=${encodeURIComponent(role)}` : "/college-members"),
  getCollegeMemberById: (id: number) =>
    request<{ data: CollegeMemberRecord }>(`/college-members/${encodeURIComponent(String(id))}`),
  lookupCollegeMemberByEmail: (email: string) =>
    request<{ data: CollegeMemberRecord }>(`/college-members/lookup?email=${encodeURIComponent(email)}`),
  getDepartmentStats: () => request<{ data: Array<{ branch: string; students: number; head: string }>; total: number }>("/college-members/department-stats"),
  getQuizzes: (teacherEmail?: string) =>
    request<ApiListResponse<QuizRecord>>(teacherEmail ? `/quizzes?teacherEmail=${encodeURIComponent(teacherEmail)}` : "/quizzes"),
  getStudentQuizAttempts: (studentEmail: string) =>
    request<{ data: QuizAttemptRecord[]; summary: QuizAttemptSummaryRecord[] }>(`/quizzes/attempts/student?studentEmail=${encodeURIComponent(studentEmail)}`),
  submitQuizAttempt: (
    quizId: number,
    payload: {
      studentEmail: string;
      answers: Record<string, string>;
      warningCount?: number;
      timeTakenSeconds?: number;
    }
  ) => mutate<{ data: QuizAttemptRecord }>(`/quizzes/${encodeURIComponent(String(quizId))}/attempts`, "POST", payload),
  getTeacherQuizResults: (quizId: number, teacherEmail?: string) =>
    request<{ data: TeacherQuizResultRecord }>(
      teacherEmail
        ? `/quizzes/${encodeURIComponent(String(quizId))}/results?teacherEmail=${encodeURIComponent(teacherEmail)}`
        : `/quizzes/${encodeURIComponent(String(quizId))}/results`
    ),
  createQuiz: (payload: QuizInput) => mutate<{ data: QuizRecord }>("/quizzes", "POST", payload),
  updateQuiz: (id: number, payload: Partial<QuizInput>) => mutate<{ data: QuizRecord }>(`/quizzes/${encodeURIComponent(String(id))}`, "PUT", payload),
  deleteQuiz: (id: number) => mutate<{ data: { deleted: true; id: number } }>(`/quizzes/${encodeURIComponent(String(id))}`, "DELETE"),
  getMessages: (panel?: string) =>
    request<ApiListResponse<MessageRecord>>(panel ? `/messages?panel=${encodeURIComponent(panel)}` : "/messages"),
  createMessage: (payload: MessageInput) => mutate<{ data: MessageRecord }>("/messages", "POST", payload),
  updateMessage: (id: number, payload: Partial<MessageInput>) =>
    mutate<{ data: MessageRecord }>(`/messages/${encodeURIComponent(String(id))}`, "PUT", payload),
  deleteMessage: (id: number) => mutate<{ data: { deleted: true; id: number } }>(`/messages/${encodeURIComponent(String(id))}`, "DELETE"),
  uploadLectureDocument: (fileName: string, fileData: string) =>
    mutate<{ data: { success: boolean; fileUrl: string; fileName: string } }>("/courses/uploads/lecture-document", "POST", { fileName, fileData }),
  uploadProfileImage: async (file: File) => {
    const fileData = await fileToDataUrl(file);
    return mutate<{ data: { success: boolean; fileUrl: string; fileName: string } }>("/courses/uploads/lecture-document", "POST", {
      fileName: file.name,
      fileData,
    });
  },
  getTeacherOverview: (teacherEmail?: string) =>
    request<{ data: TeacherOverviewRecord }>(teacherEmail ? `/teacher-panel/overview?teacherEmail=${encodeURIComponent(teacherEmail)}` : "/teacher-panel/overview"),
  getResources: (teacherEmail?: string, course?: string) => {
    let url = "/resources";
    const params = new URLSearchParams();
    if (teacherEmail) params.append("teacherEmail", teacherEmail);
    if (course) params.append("course", course);
    if (params.toString()) url += `?${params.toString()}`;
    return request<ApiListResponse<ResourceRecord>>(url);
  },
  createResource: (payload: ResourceInput) => mutate<{ data: ResourceRecord }>("/resources", "POST", payload),
  uploadResourceFile: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${API_BASE}/resources/upload`, {
      method: "POST",
      body: formData,
    }).then((res) => {
      if (!res.ok) throw new Error("Upload failed");
      return res.json() as Promise<{ data: { fileUrl: string; fileName: string; fileSize: string } }>;
    });
  },
  deleteResource: (id: number) => mutate<{ data: { deleted: true; id: number } }>(`/resources/${encodeURIComponent(String(id))}`, "DELETE"),
  getGradesSummary: () => request<{ data: { distribution: GradeDistribution[], stats: any } }>("/grades/summary"),
  getCollegeOverview: () => request<{ data: CollegeOverviewRecord }>("/college-panel/overview"),
  loadCourseApprovals: () => request<{ data: any[] }>("/college-panel/courses/pending"),
  getStudentPerformance: () => request<{ data: StudentPerformance[] }>("/grades/students"),
  getTeacherStudents: (teacherEmail?: string) =>
    request<{ data: any[] }>(teacherEmail ? `/teacher-panel/students?teacherEmail=${encodeURIComponent(teacherEmail)}` : "/teacher-panel/students"),
  importCollegeMembersBulk: (role: "student" | "teacher", records: any[]) =>
    mutate<{ data: CollegeMemberRecord[]; imported: number }>("/college-members/bulk", "POST", { role, records }),
  updateCollegeMember: (id: number, payload: Partial<CollegeMemberRecord>) =>
    mutate<{ data: CollegeMemberRecord }>(`/college-members/${encodeURIComponent(String(id))}`, "PATCH", payload),
  deleteCollegeMember: (id: number) =>
    mutate<{ data: { deleted: true; id: number } }>(`/college-members/${encodeURIComponent(String(id))}`, "DELETE"),
  getContacts: (role: string, email: string) =>
    request<{ data: any[] }>(`/messages/contacts?role=${encodeURIComponent(role)}&email=${encodeURIComponent(email)}`),
  getChatHistory: (myEmail: string, otherEmail: string) =>
    request<{ data: MessageRecord[] }>(`/messages/history/${encodeURIComponent(otherEmail)}?myEmail=${encodeURIComponent(myEmail)}`),

  // Community API
  getCommunityQuestions: (tag?: string, search?: string) => 
    request<{ success: boolean; data: any[] }>(`/community/questions?${tag ? 'tag='+tag : ''}&${search ? 'search='+search : ''}`),
  getCommunityQuestionDetail: (id: string) => 
    request<{ success: boolean; data: any }>(`/community/questions/${encodeURIComponent(id)}`),
  postCommunityQuestion: (payload: any) => 
    mutate<{ success: boolean; data: any }>("/community/questions", "POST", payload),
  postCommunityAnswer: (payload: any) => 
    mutate<{ success: boolean; data: any }>("/community/answers", "POST", payload),
  updateCourseStatus: (id: number, status: "pending" | "approved" | "rejected") =>
    mutate<{ data: CourseRecord }>(`/courses/${encodeURIComponent(String(id))}/status`, "PATCH", { status }),
  compileCourseCode: (payload: { code: string; functionName: string; testCases: Array<{ input: string; expectedOutput: string }> }) =>
    mutate<{ data: CodeEvaluationResponse }>("/courses/compile", "POST", payload),
  runLearningCode: (payload: { code: string; functionName: string; testCases: Array<{ input: string; expectedOutput: string }>; language: string }) =>
    mutate<{ data: CodeRunResultRecord }>("/code/run", "POST", payload),
  submitLearningTest: (payload: {
    studentEmail: string;
    courseId: number;
    lectureId: string;
    testId: string;
    answers?: Record<string, string>;
    code?: string;
    language?: string;
    warningCount?: number;
    timeTakenSeconds?: number;
  }) => mutate<{ data: TestSubmissionResultRecord }>("/test/submit", "POST", payload),
  trackTopicTime: (payload: { studentEmail: string; courseId: number; lectureId: string; secondsSpent: number }) =>
    mutate<{ data: any }>("/progress/topic-time", "POST", payload),
  markModuleCompleted: (payload: { studentEmail: string; courseId: number; lectureId: string; moduleId: string }) =>
    mutate<{ data: any }>("/progress/mark-module", "POST", payload),
  getTestSubmissions: (studentEmail: string, courseId: number) =>
    request<{ data: any[]; total: number }>(`/test/submissions?studentEmail=${encodeURIComponent(studentEmail)}&courseId=${encodeURIComponent(String(courseId))}`),
  getEnrollments: (studentEmail: string) =>
    request<{ data: CourseEnrollmentRecord[]; total: number }>(`/enrollments?studentEmail=${encodeURIComponent(studentEmail)}`),
  enrollInCourse: (studentEmail: string, courseId: number) =>
    mutate<{ data: CourseEnrollmentRecord }>("/enrollments/enroll", "POST", { studentEmail, courseId }),
  createCoursePaymentOrder: (studentEmail: string, courseId: number) =>
    mutate<{
      data: {
        keyId: string;
        orderId: string;
        amount: number;
        currency: string;
        courseId: number;
        courseTitle: string;
      };
    }>("/payments/razorpay/order", "POST", { studentEmail, courseId }),
  verifyCoursePaymentAndEnroll: (payload: {
    studentEmail: string;
    courseId: number;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => mutate<{ data: CourseEnrollmentRecord; message?: string }>("/payments/razorpay/verify", "POST", payload),
  getEvents: (panel?: string) =>
    request<ApiListResponse<EventRecord>>(panel ? `/events?panel=${encodeURIComponent(panel)}` : "/events"),
  createEvent: (payload: { time: string; name: string; location: string; date?: string; panel?: string }) =>
    mutate<{ data: EventRecord }>("/events", "POST", payload),
  updateEvent: (id: number, payload: Partial<{ time: string; name: string; location: string; date: string; panel: string }>) =>
    mutate<{ data: EventRecord }>(`/events/${encodeURIComponent(String(id))}`, "PUT", payload),
  deleteEvent: (id: number) => mutate<{ data: { deleted: true; id: number } }>(`/events/${encodeURIComponent(String(id))}`, "DELETE"),
  getAnnouncements: (panel?: string) =>
    request<ApiListResponse<AnnouncementRecord>>(
      panel ? `/announcements?panel=${encodeURIComponent(panel)}` : "/announcements"
    ),
  createAnnouncement: (payload: { title: string; description: string; date: string; tag?: string; panel?: string }) =>
    mutate<{ data: AnnouncementRecord }>("/announcements", "POST", payload),
  updateAnnouncement: (id: number, payload: Partial<{ title: string; description: string; date: string; tag: string; panel: string }>) =>
    mutate<{ data: AnnouncementRecord }>(`/announcements/${encodeURIComponent(String(id))}`, "PUT", payload),
  deleteAnnouncement: (id: number) => mutate<{ data: { deleted: true; id: number } }>(`/announcements/${encodeURIComponent(String(id))}`, "DELETE"),
  createCollegeActivity: (payload: { type: string; message: string; time: string }) =>
    mutate<{ data: { id: number; type: string; message: string; time: string } }>("/college-activities", "POST", payload),
  updateCollegeActivity: (id: number, payload: { type?: string; message?: string; time?: string }) =>
    mutate<{ data: { id: number; type: string; message: string; time: string } }>(`/college-activities/${encodeURIComponent(String(id))}`, "PUT", payload),
  deleteCollegeActivity: (id: number) =>
    mutate<{ data: { deleted: true; id: number } }>(`/college-activities/${encodeURIComponent(String(id))}`, "DELETE"),
  getStats: (panel: string) => request<{ data: PanelStatRecord[]; panel: string }>(`/stats/${encodeURIComponent(panel)}`),
  getAssignments: (teacherEmail?: string, course?: string) => {
    let url = "/assignments";
    const params = new URLSearchParams();
    if (teacherEmail) params.append("teacherEmail", teacherEmail);
    if (course) params.append("course", course);
    if (params.toString()) url += `?${params.toString()}`;
    return request<ApiListResponse<AssignmentRecord>>(url);
  },
  getStudentAssignmentAttempts: (studentEmail: string) =>
    request<{ data: AssignmentAttemptRecord[]; summary: AssignmentAttemptSummaryRecord[] }>(
      `/assignments/attempts/student?studentEmail=${encodeURIComponent(studentEmail)}`
    ),
  submitAssignmentAttempt: (
    assignmentId: number,
    payload: {
      studentEmail: string;
      mcqAnswers: Record<string, string>;
      codeAnswers: Record<string, string>;
      warningCount?: number;
      timeTakenSeconds?: number;
    }
  ) => mutate<{ data: AssignmentAttemptRecord }>(`/assignments/${encodeURIComponent(String(assignmentId))}/attempts`, "POST", payload),
  getTeacherAssignmentResults: (assignmentId: number, teacherEmail?: string) =>
    request<{ data: TeacherAssignmentResultRecord }>(
      teacherEmail
        ? `/assignments/${encodeURIComponent(String(assignmentId))}/results?teacherEmail=${encodeURIComponent(teacherEmail)}`
        : `/assignments/${encodeURIComponent(String(assignmentId))}/results`
    ),
  createAssignment: (payload: AssignmentInput) => mutate<{ data: AssignmentRecord }>("/assignments", "POST", payload),
  updateAssignment: (id: number, payload: Partial<AssignmentInput>) =>
    mutate<{ data: AssignmentRecord }>(`/assignments/${encodeURIComponent(String(id))}`, "PUT", payload),
  deleteAssignment: (id: number) => mutate<{ data: { deleted: true; id: number } }>(`/assignments/${encodeURIComponent(String(id))}`, "DELETE"),
  compileAssignmentCode: (payload: { code: string; functionName: string; testCases: Array<{ input: string; expectedOutput: string }>; language: string }) =>
    mutate<{ data: CompilerResponse }>("/assignments/compile", "POST", payload),
  getCollegeMembers: (role?: "student" | "teacher") =>
    request<ApiListResponse<CollegeMemberRecord>>(role ? `/college-members?role=${encodeURIComponent(role)}` : "/college-members"),
  getCollegeMemberById: (id: number) =>
    request<{ data: CollegeMemberRecord }>(`/college-members/${encodeURIComponent(String(id))}`),
  lookupCollegeMemberByEmail: (email: string) =>
    request<{ data: CollegeMemberRecord }>(`/college-members/lookup?email=${encodeURIComponent(email)}`),
  getDepartmentStats: () => request<{ data: Array<{ branch: string; students: number; head: string }>; total: number }>("/college-members/department-stats"),
  getQuizzes: (teacherEmail?: string) =>
    request<ApiListResponse<QuizRecord>>(teacherEmail ? `/quizzes?teacherEmail=${encodeURIComponent(teacherEmail)}` : "/quizzes"),
  getStudentQuizAttempts: (studentEmail: string) =>
    request<{ data: QuizAttemptRecord[]; summary: QuizAttemptSummaryRecord[] }>(`/quizzes/attempts/student?studentEmail=${encodeURIComponent(studentEmail)}`),
  submitQuizAttempt: (
    quizId: number,
    payload: {
      studentEmail: string;
      answers: Record<string, string>;
      warningCount?: number;
      timeTakenSeconds?: number;
    }
  ) => mutate<{ data: QuizAttemptRecord }>(`/quizzes/${encodeURIComponent(String(quizId))}/attempts`, "POST", payload),
  getTeacherQuizResults: (quizId: number, teacherEmail?: string) =>
    request<{ data: TeacherQuizResultRecord }>(
      teacherEmail
        ? `/quizzes/${encodeURIComponent(String(quizId))}/results?teacherEmail=${encodeURIComponent(teacherEmail)}`
        : `/quizzes/${encodeURIComponent(String(quizId))}/results`
    ),
  createQuiz: (payload: QuizInput) => mutate<{ data: QuizRecord }>("/quizzes", "POST", payload),
  updateQuiz: (id: number, payload: Partial<QuizInput>) => mutate<{ data: QuizRecord }>(`/quizzes/${encodeURIComponent(String(id))}`, "PUT", payload),
  deleteQuiz: (id: number) => mutate<{ data: { deleted: true; id: number } }>(`/quizzes/${encodeURIComponent(String(id))}`, "DELETE"),
  getMessages: (panel?: string) =>
    request<ApiListResponse<MessageRecord>>(panel ? `/messages?panel=${encodeURIComponent(panel)}` : "/messages"),
  createMessage: (payload: MessageInput) => mutate<{ data: MessageRecord }>("/messages", "POST", payload),
  updateMessage: (id: number, payload: Partial<MessageInput>) =>
    mutate<{ data: MessageRecord }>(`/messages/${encodeURIComponent(String(id))}`, "PUT", payload),
  deleteMessage: (id: number) => mutate<{ data: { deleted: true; id: number } }>(`/messages/${encodeURIComponent(String(id))}`, "DELETE"),
  uploadLectureDocument: (fileName: string, fileData: string) =>
    mutate<{ data: { success: boolean; fileUrl: string; fileName: string } }>("/courses/uploads/lecture-document", "POST", { fileName, fileData }),
  uploadProfileImage: async (file: File) => {
    const fileData = await fileToDataUrl(file);
    return mutate<{ data: { success: boolean; fileUrl: string; fileName: string } }>("/courses/uploads/lecture-document", "POST", {
      fileName: file.name,
      fileData,
    });
  },
  getTeacherOverview: (teacherEmail?: string) =>
    request<{ data: TeacherOverviewRecord }>(teacherEmail ? `/teacher-panel/overview?teacherEmail=${encodeURIComponent(teacherEmail)}` : "/teacher-panel/overview"),
  getResources: (teacherEmail?: string, course?: string) => {
    let url = "/resources";
    const params = new URLSearchParams();
    if (teacherEmail) params.append("teacherEmail", teacherEmail);
    if (course) params.append("course", course);
    if (params.toString()) url += `?${params.toString()}`;
    return request<ApiListResponse<ResourceRecord>>(url);
  },
  createResource: (payload: ResourceInput) => mutate<{ data: ResourceRecord }>("/resources", "POST", payload),
  uploadResourceFile: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${API_BASE}/resources/upload`, {
      method: "POST",
      body: formData,
    }).then((res) => {
      if (!res.ok) throw new Error("Upload failed");
      return res.json() as Promise<{ data: { fileUrl: string; fileName: string; fileSize: string } }>;
    });
  },
  deleteResource: (id: number) => mutate<{ data: { deleted: true; id: number } }>(`/resources/${encodeURIComponent(String(id))}`, "DELETE"),
  getGradesSummary: () => request<{ data: { distribution: GradeDistribution[], stats: any } }>("/grades/summary"),
  getCollegeOverview: () => request<{ data: CollegeOverviewRecord }>("/college-panel/overview"),
  loadCourseApprovals: () => request<{ data: any[] }>("/college-panel/courses/pending"),
  getStudentPerformance: () => request<{ data: StudentPerformance[] }>("/grades/students"),
  getTeacherStudents: (teacherEmail?: string) =>
    request<{ data: any[] }>(teacherEmail ? `/teacher-panel/students?teacherEmail=${encodeURIComponent(teacherEmail)}` : "/teacher-panel/students"),
  importCollegeMembersBulk: (role: "student" | "teacher", records: any[]) =>
    mutate<{ data: CollegeMemberRecord[]; imported: number }>("/college-members/bulk", "POST", { role, records }),
  updateCollegeMember: (id: number, payload: Partial<CollegeMemberRecord>) =>
    mutate<{ data: CollegeMemberRecord }>(`/college-members/${encodeURIComponent(String(id))}`, "PATCH", payload),
  deleteCollegeMember: (id: number) =>
    mutate<{ data: { deleted: true; id: number } }>(`/college-members/${encodeURIComponent(String(id))}`, "DELETE"),
  getContacts: (role: string, email: string) =>
    request<{ data: any[] }>(`/messages/contacts?role=${encodeURIComponent(role)}&email=${encodeURIComponent(email)}`),
  getChatHistory: (myEmail: string, otherEmail: string) =>
    request<{ data: MessageRecord[] }>(`/messages/history/${encodeURIComponent(otherEmail)}?myEmail=${encodeURIComponent(myEmail)}`),

  // Community API
  getCommunityQuestions: (tag?: string, search?: string) => 
    request<{ success: boolean; data: any[] }>(`/community/questions?${tag ? 'tag='+tag : ''}&${search ? 'search='+search : ''}`),
  getCommunityQuestionDetail: (id: string) => 
    request<{ success: boolean; data: any }>(`/community/questions/${encodeURIComponent(id)}`),
  postCommunityQuestion: (payload: any) => 
    mutate<{ success: boolean; data: any }>("/community/questions", "POST", payload),
  postCommunityAnswer: (payload: any) => 
    mutate<{ success: boolean; data: any }>("/community/answers", "POST", payload),
  voteOnCommunity: (payload: { type: 'question' | 'answer', targetId: number, studentEmail: string, voteType: 'up' | 'down' }) => 
    mutate<{ success: boolean; upvotes: number, downvotes: number }>("/community/vote", "POST", payload),

  getCourseMetadata: () => request<{ data: { categories: string[], topics: string[] } }>("/courses/metadata"),
  getLandingStats: () => request<{ data: { totalUsers: number, totalCourses: number, totalTeachers: number, totalStudents: number, satisfiedLearners: number } }>("/stats/landing"),
  getCommunityTopContributor: () => request<{ success: boolean; data: any }>("/community/stats/top-contributor"),
  deleteCommunityQuestion: (id: number) => mutate<{ success: boolean }>("/community/questions/" + id, "DELETE"),
};
