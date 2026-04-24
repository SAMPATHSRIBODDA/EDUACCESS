const appShell = document.getElementById("appShell");
const sidebarToggle = document.getElementById("sidebarToggle");
const pageTitle = document.getElementById("pageTitle");
const sidebarNavItems = document.querySelectorAll(".nav-item[data-page]");
const pageSections = document.querySelectorAll(".page-content[data-page-content]");
const globalSearch = document.getElementById("globalSearch");
const searchResults = document.getElementById("searchResults");
const notificationBtn = document.getElementById("notificationBtn");
const messageBtn = document.getElementById("messageBtn");
const notificationMenu = document.getElementById("notificationMenu");
const messageMenu = document.getElementById("messageMenu");
const notificationMenuList = document.getElementById("notificationMenuList");
const messageMenuList = document.getElementById("messageMenuList");
const notificationBadge = document.getElementById("notificationBadge");
const messageBadge = document.getElementById("messageBadge");
const profileButton = document.getElementById("profileButton");
const profileMenu = document.getElementById("profileMenu");
const profileMenuItems = document.querySelectorAll("#profileMenu [data-profile-action]");
const quickActionBtn = document.getElementById("quickActionBtn");
const quickActionMenu = document.getElementById("quickActionMenu");
const quickActionItems = document.querySelectorAll("#quickActionMenu [data-action]");
const quickActionModal = document.getElementById("quickActionModal");
const quickActionModalOverlay = document.getElementById("quickActionModalOverlay");
const quickActionModalTitle = document.getElementById("quickActionModalTitle");
const quickActionModalCloseBtn = document.getElementById("quickActionModalCloseBtn");
const quickActionModalCancelBtn = document.getElementById("quickActionModalCancelBtn");
const quickActionModalSubmitBtn = document.getElementById("quickActionModalSubmitBtn");
const quickActionForm = document.getElementById("quickActionForm");
const quickActionFormFields = document.getElementById("quickActionFormFields");
const actionStatus = document.getElementById("actionStatus");
const accessibilityStatus = document.getElementById("accessibilityStatus");
const contrastToggle = document.getElementById("contrastToggle");
const fontIncrease = document.getElementById("fontIncrease");
const fontDecrease = document.getElementById("fontDecrease");

const monthLabel = document.getElementById("calendarMonth");
const calendarGrid = document.getElementById("calendarGrid");
const selectedDateLabel = document.getElementById("selectedDateLabel");
const prevMonth = document.getElementById("prevMonth");
const nextMonth = document.getElementById("nextMonth");

const eventsList = document.getElementById("eventsList");
const announcementsWrap = document.getElementById("announcements");
const activityFeed = document.getElementById("activityFeed");
const quickStatsWrap = document.getElementById("quickStats");
const dashboardTasksWrap = document.getElementById("dashboardTasks");
const studentTemplateDownloadBtn = document.getElementById("studentTemplateDownloadBtn");
const teacherTemplateDownloadBtn = document.getElementById("teacherTemplateDownloadBtn");
const studentBulkUploadBtn = document.getElementById("studentBulkUploadBtn");
const teacherBulkUploadBtn = document.getElementById("teacherBulkUploadBtn");
const studentBulkFileInput = document.getElementById("studentBulkFileInput");
const teacherBulkFileInput = document.getElementById("teacherBulkFileInput");
const studentSearchInput = document.getElementById("studentSearchInput");
const teacherSearchInput = document.getElementById("teacherSearchInput");
const courseSearchInput = document.getElementById("courseSearchInput");
const studentsTableRows = document.getElementById("studentsTableRows");
const teachersTableRows = document.getElementById("teachersTableRows");
const departmentsTableRows = document.getElementById("departmentsTableRows");
const refreshCoursesBtn = document.getElementById("refreshCoursesBtn");
const pendingCoursesRows = document.getElementById("pendingCoursesRows");
const metricTotalStudents = document.getElementById("metricTotalStudents");
const metricStudentsTrend = document.getElementById("metricStudentsTrend");
const metricTotalTeachers = document.getElementById("metricTotalTeachers");
const metricTeachersTrend = document.getElementById("metricTeachersTrend");
const metricTotalDepartments = document.getElementById("metricTotalDepartments");
const metricDepartmentsTrend = document.getElementById("metricDepartmentsTrend");
const metricPendingCourses = document.getElementById("metricPendingCourses");
const metricPendingTrend = document.getElementById("metricPendingTrend");
const metricApprovedCourses = document.getElementById("metricApprovedCourses");
const metricApprovedTrend = document.getElementById("metricApprovedTrend");
const dashboardActivityCount = document.getElementById("dashboardActivityCount");
const overviewSnapshotGrid = document.getElementById("overviewSnapshotGrid");
const departmentBreakdownList = document.getElementById("departmentBreakdownList");
const deptSummary = document.getElementById("deptSummary");
const settingsRuntime = document.getElementById("settingsRuntime");
const settingToggleInputs = document.querySelectorAll('input[data-setting-key]');
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const ACTIVE_PAGE_STORAGE_KEY = "clgAdminActivePage";
const SETTINGS_STORAGE_KEY = "clgAdminSettings";

function getActiveCollegeEmail() {
  try {
    const raw = window.localStorage.getItem("authUser");
    if (!raw) return "";
    const user = JSON.parse(raw);
    if (String(user?.role || "").toLowerCase() !== "college") return "";
    return String(user?.email || "").trim().toLowerCase();
  } catch {
    return "";
  }
}

const activeCollegeEmail = getActiveCollegeEmail();

function withCollegeScope(url) {
  if (!activeCollegeEmail) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}collegeEmail=${encodeURIComponent(activeCollegeEmail)}`;
}

const STUDENTS_STORAGE_KEY = activeCollegeEmail
  ? `clgAdminStudentsDirectory:${activeCollegeEmail}`
  : "clgAdminStudentsDirectory";
const TEACHERS_STORAGE_KEY = activeCollegeEmail
  ? `clgAdminTeachersDirectory:${activeCollegeEmail}`
  : "clgAdminTeachersDirectory";

// Global management handlers
window.openEditModal = (id, role) => {
  const list = role === 'student' ? studentsDirectory : teachersDirectory;
  const member = list.find((m) => String(m.id) === String(id));
  if (!member) return;

  const modal = document.getElementById('editMemberModal');
  
  document.getElementById('editMemberId').value = member.id;
  document.getElementById('editMemberName').value = member.name;
  document.getElementById('editMemberRegId').value = member.regId;
  document.getElementById('editMemberEmail').value = member.email || '';
  document.getElementById('editMemberPhone').value = member.phone;
  document.getElementById('editMemberBranch').value = member.branch;
  document.getElementById('editMemberStatus').value = member.status || 'active';
  
  const courseGrp = document.getElementById('courseFieldGroup');
  const yearGrp = document.getElementById('yearFieldGroup');
  const subjectGrp = document.getElementById('subjectFieldGroup');

  if (role === 'student') {
    courseGrp.style.display = 'block';
    yearGrp.style.display = 'block';
    subjectGrp.style.display = 'none';
    document.getElementById('editMemberCourse').value = member.course || '';
    document.getElementById('editMemberYear').value = member.year || '';
    document.getElementById('modalTitle').innerText = 'Edit Student Details';
  } else {
    courseGrp.style.display = 'none';
    yearGrp.style.display = 'none';
    subjectGrp.style.display = 'block';
    document.getElementById('editMemberSubject').value = member.subject || '';
    document.getElementById('modalTitle').innerText = 'Edit Faculty Details';
  }

  modal.dataset.role = role;
  modal.style.display = 'flex';
};

window.toggleSuspend = async (id) => {
  try {
    const student = studentsDirectory.find((m) => String(m.id) === String(id));
    const teacher = teachersDirectory.find((m) => String(m.id) === String(id));
    const member = student || teacher;
    if (!member) return;

    const newStatus = member.status === 'suspended' ? 'active' : 'suspended';
    const response = await fetch(withCollegeScope(`${API_BASE}/college-members/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (response.ok) {
      member.status = newStatus;
      renderStudentsDirectory();
      renderTeachersDirectory();
      showActionStatus(`Member account ${newStatus === 'suspended' ? 'suspended' : 'activated'}.`);
    }
  } catch (error) {
    showActionStatus("Failed to update status.");
  }
};

window.deleteMember = async (id) => {
  if (!confirm("Are you sure you want to delete this member permanently?")) return;
  try {
    const response = await fetch(withCollegeScope(`${API_BASE}/college-members/${id}`), { method: "DELETE" });
    if (response.ok) {
      studentsDirectory = studentsDirectory.filter((m) => String(m.id) !== String(id));
      teachersDirectory = teachersDirectory.filter((m) => String(m.id) !== String(id));
      renderStudentsDirectory();
      renderTeachersDirectory();
      showActionStatus("Member deleted permanently.");
    }
  } catch (error) {
    showActionStatus("Failed to delete member.");
  }
};

const editMemberForm = document.getElementById('editMemberForm');
if (editMemberForm) {
  editMemberForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editMemberId').value;
    const role = document.getElementById('editMemberModal').dataset.role;
    
    const payload = {
      name: document.getElementById('editMemberName').value,
      regId: document.getElementById('editMemberRegId').value,
      email: document.getElementById('editMemberEmail').value.trim().toLowerCase(),
      phone: document.getElementById('editMemberPhone').value,
      branch: document.getElementById('editMemberBranch').value,
      status: document.getElementById('editMemberStatus').value
    };

    if (role === 'student') {
      payload.course = document.getElementById('editMemberCourse').value;
      payload.year = document.getElementById('editMemberYear').value;
    } else {
      payload.subject = document.getElementById('editMemberSubject').value;
    }

    try {
      const response = await fetch(withCollegeScope(`${API_BASE}/college-members/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        const updated = result.data;
        if (role === 'student') {
          studentsDirectory = studentsDirectory.map(m => m.id == id ? updated : m);
        } else {
          teachersDirectory = teachersDirectory.map(m => m.id == id ? updated : m);
        }
        renderStudentsDirectory();
        renderTeachersDirectory();
        document.getElementById('editMemberModal').style.display = 'none';
        showActionStatus("Member details updated successfully.");
      }
    } catch (error) {
      showActionStatus("Failed to update member.");
    }
  });
}

let currentDate = new Date();
let selectedDate = new Date();
let fontLevel = 1;

let dashboardOverview = {
  metrics: {
    totalStudents: 0,
    totalTeachers: 0,
    pendingCourses: 0,
    approvedCourses: 0,
    totalDepartments: 0,
    activityCount: 0,
  },
  departmentStats: [],
};

let events = [
  { time: "09:30", name: "Orientation Session", location: "Auditorium" },
  { time: "11:00", name: "Department Council", location: "Block B" },
  { time: "14:15", name: "Exam Committee Meet", location: "Admin Hall" },
  { time: "16:00", name: "Placement Drive Brief", location: "Career Center" },
];

let announcements = [
  { title: "Mid-Semester Exams", description: "Exam schedule uploaded for all departments.", date: "07 Apr 2026" },
  { title: "NAAC Review Visit", description: "Accreditation team visit planned next week.", date: "06 Apr 2026" },
  { title: "Library Portal Update", description: "Digital issue-return module maintenance tonight.", date: "05 Apr 2026" },
];

let activities = [
  {
    type: "Student admission",
    message: "38 new students admitted in Computer Science this week",
    time: "10 min ago",
  },
  {
    type: "Grade updates",
    message: "Mid-semester grade sheets published for BBA and BCom",
    time: "45 min ago",
  },
  {
    type: "Payments",
    message: "248 tuition payments reconciled in finance portal",
    time: "1 hr ago",
  },
  {
    type: "New faculty",
    message: "2 faculty members onboarded in Science department",
    time: "2 hrs ago",
  },
];

let quickStats = [
  { label: "Attendance Rate", value: "92%", note: "Up 2.1% this month" },
  { label: "Exam Pass Rate", value: "88%", note: "Stable vs previous term" },
  { label: "Placed Students", value: "1,245", note: "+84 offers this quarter" },
  { label: "Research Grants", value: "$420K", note: "3 grants approved this month" },
];

const DEFAULT_ADMIN_SETTINGS = {
  roleBasedAccess: true,
  twoFactorAuth: true,
  autoBackup: false,
  emailAlerts: true,
  examReminders: true,
  financeDigest: false,
  lastBackupAt: "",
};

let adminSettings = { ...DEFAULT_ADMIN_SETTINGS };

let dashboardTasks = [];

const searchDataset = [
  { type: "Student", name: "Aarav Sharma" },
  { type: "Student", name: "Priya Nair" },
  { type: "Student", name: "Rahul Verma" },
  { type: "Course", name: "BSc Computer Science" },
  { type: "Course", name: "MBA Finance" },
  { type: "Course", name: "BA Economics" },
  { type: "Staff", name: "Dr. Meera Singh" },
  { type: "Staff", name: "Prof. Arjun Rao" },
  { type: "Staff", name: "Dean Office Team" },
];

let studentsDirectory = [
  {
    name: "Aarav Sharma",
    regId: "REG-2026-001",
    phone: "9876543210",
    course: "BSc CS",
    year: "1",
    branch: "Computer Science",
  },
  {
    name: "Riya Menon",
    regId: "REG-2026-002",
    phone: "9876501234",
    course: "BBA",
    year: "2",
    branch: "Commerce",
  },
  {
    name: "Imran Ali",
    regId: "REG-2026-003",
    phone: "9876555566",
    course: "BA Economics",
    year: "3",
    branch: "Economics",
  },
];

let teachersDirectory = [
  {
    name: "Dr. Meera Singh",
    regId: "FAC-001",
    phone: "9898989898",
    branch: "Computer Science",
    subject: "Data Structures",
  },
  {
    name: "Prof. Arjun Rao",
    regId: "FAC-002",
    phone: "9797979797",
    branch: "Commerce",
    subject: "Financial Accounting",
  },
  {
    name: "Dr. Kavita Jain",
    regId: "FAC-003",
    phone: "9696969696",
    branch: "Mathematics",
    subject: "Linear Algebra",
  },
];

let pendingCourses = [];
let departmentStats = [];
let currentActivePage = "dashboard";

const pageLabels = {
  dashboard: "Dashboard",
  students: "Students",
  teachers: "Teachers",
  departments: "Departments",
  courses: "Courses",
  academic: "Academic",
  examinations: "Examinations",
  library: "Library",
  placements: "Placements",
  finance: "Finance",
  reports: "Reports",
  settings: "Settings",
};

const validPages = new Set(Object.keys(pageLabels));

function resolveInitialPage() {
  const hashPage = window.location.hash.replace("#", "").trim();
  const savedPage = window.localStorage.getItem(ACTIVE_PAGE_STORAGE_KEY) || "";

  if (validPages.has(hashPage)) return hashPage;
  if (validPages.has(savedPage)) return savedPage;
  return "dashboard";
}

function normalizeHeaderKey(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getRowValue(row, aliases) {
  if (!row || typeof row !== "object") return "";

  const entries = Object.entries(row);
  const aliasSet = new Set(aliases.map((alias) => normalizeHeaderKey(alias)));
  const matched = entries.find(([key]) => aliasSet.has(normalizeHeaderKey(key)));

  if (!matched) return "";
  return String(matched[1] ?? "").trim();
}

function parseCsvText(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row = {};
    headers.forEach((header, index) => {
      row[header] = (values[index] || "").trim();
    });
    return row;
  });
}

function normalizeDepartmentName(value) {
  const text = String(value || "").trim();
  if (!text) return "Unknown";
  return text
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function downloadCsvTemplate(fileName, headers, sampleRows) {
  const lines = [headers.join(",")];

  sampleRows.forEach((row) => {
    const cells = headers.map((header) => {
      const value = String(row[header] ?? "").replace(/"/g, '""');
      return `"${value}"`;
    });
    lines.push(cells.join(","));
  });

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function parseExcelOrCsvFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Could not read the uploaded file."));
    };

    reader.onload = () => {
      try {
        const result = reader.result;
        const fileName = String(file?.name || "").toLowerCase();

        if (fileName.endsWith(".csv")) {
          const rows = parseCsvText(String(result || ""));
          resolve(rows);
          return;
        }

        if (!window.XLSX) {
          reject(new Error("Excel parser is unavailable. Please upload CSV or refresh page."));
          return;
        }

        const workbook = window.XLSX.read(result, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          resolve([]);
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rows = window.XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        resolve(rows);
      } catch {
        reject(new Error("Invalid Excel/CSV format."));
      }
    };

    if (String(file?.name || "").toLowerCase().endsWith(".csv")) {
      reader.readAsText(file);
      return;
    }

    reader.readAsArrayBuffer(file);
  });
}

function mapStudentRows(rows) {
  return rows
    .map((row, index) => ({
      name: getRowValue(row, ["name", "student name"]),
      regId: getRowValue(row, ["reg id", "registration id", "regid", "id"]),
      email: getRowValue(row, ["email", "gmail", "mail", "email id"]),
      phone: getRowValue(row, ["phone", "phone no", "phn no", "mobile", "contact"]),
      course: getRowValue(row, ["course", "program"]),
      year: getRowValue(row, ["year", "academic year"]),
      branch: getRowValue(row, ["branch", "dept", "department"]),
      _rowNumber: index + 2,
    }));
}

function mapTeacherRows(rows) {
  return rows
    .map((row, index) => ({
      name: getRowValue(row, ["name", "teacher name", "faculty"]),
      regId: getRowValue(row, ["reg id", "registration id", "regid", "id"]),
      email: getRowValue(row, ["email", "gmail", "mail", "email id"]),
      phone: getRowValue(row, ["phone", "phone no", "phn no", "mobile", "contact"]),
      branch: getRowValue(row, ["branch", "breach", "dept", "department"]),
      subject: getRowValue(row, ["subject", "subjects", "specialization"]),
      _rowNumber: index + 2,
    }));
}

function saveDirectories() {
  window.localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(studentsDirectory));
  window.localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(teachersDirectory));
}

function loadDirectoriesFromStorage() {
  try {
    const savedStudents = JSON.parse(window.localStorage.getItem(STUDENTS_STORAGE_KEY) || "[]");
    const savedTeachers = JSON.parse(window.localStorage.getItem(TEACHERS_STORAGE_KEY) || "[]");

    if (Array.isArray(savedStudents) && savedStudents.length > 0) {
      studentsDirectory = savedStudents;
    }
    if (Array.isArray(savedTeachers) && savedTeachers.length > 0) {
      teachersDirectory = savedTeachers;
    }
  } catch {
    // Ignore corrupted local storage and keep seeded data.
  }
}

function renderStudentsDirectory() {
  if (!studentsTableRows) return;

  studentsTableRows.innerHTML = "";
  const term = (studentSearchInput?.value || "").trim().toLowerCase();
  const filteredStudents = term
    ? studentsDirectory.filter((student) => {
      const haystack = [student.name, student.regId, student.email, student.phone, student.course, student.year, student.branch, student.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    })
    : studentsDirectory;

  filteredStudents.forEach((student) => {
    const isSuspended = student.status === "suspended";
    const row = document.createElement("div");
    row.className = `row row-students ${isSuspended ? "suspended" : ""}`;
    const safeId = escapeHtml(String(student.id ?? student.regId ?? student.name));
    row.innerHTML = `
      <span>${student.name}</span>
      <span>${student.regId}</span>
      <span>${student.email || "-"}</span>
      <span>${student.phone}</span>
      <span>${student.course}</span>
      <span>${student.year}</span>
      <span>${student.branch}</span>
      <div class="action-stack">
        <button class="action-chip edit" onclick="window.openEditModal('${safeId}', 'student')">Edit</button>
        <button class="action-chip suspend" onclick="window.toggleSuspend('${safeId}')">${isSuspended ? "Active" : "Suspend"}</button>
        <button class="action-chip delete" onclick="window.deleteMember('${safeId}')">Delete</button>
      </div>
    `;
    studentsTableRows.appendChild(row);
  });
}

function renderTeachersDirectory() {
  if (!teachersTableRows) return;

  teachersTableRows.innerHTML = "";
  const term = (teacherSearchInput?.value || "").trim().toLowerCase();
  const filteredTeachers = term
    ? teachersDirectory.filter((teacher) => {
      const haystack = [teacher.name, teacher.regId, teacher.email, teacher.phone, teacher.branch, teacher.subject, teacher.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    })
    : teachersDirectory;

  filteredTeachers.forEach((teacher) => {
    const isSuspended = teacher.status === "suspended";
    const row = document.createElement("div");
    row.className = `row row-teachers ${isSuspended ? "suspended" : ""}`;
    const safeId = escapeHtml(String(teacher.id ?? teacher.regId ?? teacher.name));
    row.innerHTML = `
      <span>${teacher.name}</span>
      <span>${teacher.regId}</span>
      <span>${teacher.email || "-"}</span>
      <span>${teacher.phone}</span>
      <span>${teacher.branch}</span>
      <span>${teacher.subject}</span>
      <div class="action-stack">
        <button class="action-chip edit" onclick="window.openEditModal('${safeId}', 'teacher')">Edit</button>
        <button class="action-chip suspend" onclick="window.toggleSuspend('${safeId}')">${isSuspended ? "Active" : "Suspend"}</button>
        <button class="action-chip delete" onclick="window.deleteMember('${safeId}')">Delete</button>
      </div>
    `;
    teachersTableRows.appendChild(row);
  });
}

function renderDepartmentsFromStats() {
  if (!departmentsTableRows) return;

  departmentsTableRows.innerHTML = "";

  if (!departmentStats.length) {
    const emptyRow = document.createElement("div");
    emptyRow.className = "row";
    emptyRow.innerHTML = `<span>No department data</span><span>-</span><span>-</span>`;
    departmentsTableRows.appendChild(emptyRow);
    return;
  }

  departmentStats.forEach((item) => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <span>${escapeHtml(normalizeDepartmentName(item.branch))}</span>
      <span>${escapeHtml(String(item.students || 0))}</span>
      <span>${escapeHtml(item.head || "TBD")}</span>
    `;
    departmentsTableRows.appendChild(row);
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDashboardNumber(value) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function renderDashboardOverview() {
  const metrics = dashboardOverview.metrics || {};
  const liveDepartmentStats = Array.isArray(dashboardOverview.departmentStats) ? dashboardOverview.departmentStats : [];

  if (metricTotalStudents) metricTotalStudents.textContent = formatDashboardNumber(metrics.totalStudents);
  if (metricTotalTeachers) metricTotalTeachers.textContent = formatDashboardNumber(metrics.totalTeachers);
  if (metricTotalDepartments) metricTotalDepartments.textContent = formatDashboardNumber(metrics.totalDepartments);
  if (metricPendingCourses) metricPendingCourses.textContent = formatDashboardNumber(metrics.pendingCourses);
  if (metricApprovedCourses) metricApprovedCourses.textContent = formatDashboardNumber(metrics.approvedCourses);

  if (metricStudentsTrend) metricStudentsTrend.textContent = "Live enrollment";
  if (metricTeachersTrend) metricTeachersTrend.textContent = "Live faculty count";
  if (metricDepartmentsTrend) metricDepartmentsTrend.textContent = "Live department count";
  if (metricPendingTrend) metricPendingTrend.textContent = `${formatDashboardNumber(metrics.pendingCourses)} awaiting review`;
  if (metricApprovedTrend) metricApprovedTrend.textContent = `${formatDashboardNumber(metrics.approvedCourses)} published`;

  if (dashboardActivityCount) {
    dashboardActivityCount.textContent = `${formatDashboardNumber(metrics.activityCount)} activities`;
  }

  if (overviewSnapshotGrid) {
    overviewSnapshotGrid.innerHTML = "";
    const snapshotCards = [
      { label: "Student Enrollment", value: metrics.totalStudents, note: "Students currently active", tone: "emerald" },
      { label: "Faculty Strength", value: metrics.totalTeachers, note: "Teachers on the roster", tone: "indigo" },
      { label: "Course Pipeline", value: `${formatDashboardNumber(metrics.pendingCourses)} pending`, note: `${formatDashboardNumber(metrics.approvedCourses)} approved`, tone: "amber" },
      { label: "Activity Stream", value: metrics.activityCount, note: "Recent college actions", tone: "rose" },
    ];

    snapshotCards.forEach((card) => {
      const article = document.createElement("article");
      article.className = "dashboard-snapshot-card";
      article.innerHTML = `
        <div class="snapshot-chip snapshot-${card.tone}">${escapeHtml(String(card.note))}</div>
        <strong>${escapeHtml(String(card.label))}</strong>
        <span>${escapeHtml(String(card.value))}</span>
      `;
      overviewSnapshotGrid.appendChild(article);
    });
  }

  if (departmentBreakdownList) {
    departmentBreakdownList.innerHTML = "";

    if (!liveDepartmentStats.length) {
      const empty = document.createElement("div");
      empty.className = "department-breakdown-empty";
      empty.textContent = "No department data available";
      departmentBreakdownList.appendChild(empty);
      return;
    }

    const totalStudents = liveDepartmentStats.reduce((sum, item) => sum + Number(item.students || 0), 0) || 1;
    liveDepartmentStats.slice(0, 5).forEach((item) => {
      const share = Math.round((Number(item.students || 0) / totalStudents) * 100);
      const row = document.createElement("div");
      row.className = "department-breakdown-item";
      row.innerHTML = `
        <div class="department-breakdown-head">
          <strong>${escapeHtml(item.branch || "Unassigned")}</strong>
          <span>${formatDashboardNumber(item.students)} students</span>
        </div>
        <div class="department-breakdown-bar"><span style="width: ${Math.max(8, share)}%"></span></div>
        <small>${share}% of student body</small>
      `;
      departmentBreakdownList.appendChild(row);
    });

    const top = liveDepartmentStats[0];
    if (deptSummary && top) {
      deptSummary.textContent = `Top department: ${top.branch || "Unassigned"} with ${formatDashboardNumber(top.students)} students`;
    }
  }
}

function renderPendingCourses() {
  if (!pendingCoursesRows) return;

  pendingCoursesRows.innerHTML = "";
  const term = (courseSearchInput?.value || "").trim().toLowerCase();
  const filteredCourses = term
    ? pendingCourses.filter((course) => {
      const haystack = [course.title, course.description, course.category, course.difficulty, course.grade, course.price]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    })
    : pendingCourses;

  if (filteredCourses.length === 0) {
    const empty = document.createElement("div");
    empty.className = "row row-seven";
    empty.innerHTML = term
      ? `<span class="course-title-cell"><strong>No matching courses</strong><small>Try a different search term.</small></span><span>-</span><span>-</span><span>-</span><span>-</span><span>-</span><span>-</span>`
      : `<span class="course-title-cell"><strong>No pending courses</strong><small>All teacher uploaded courses are reviewed.</small></span><span>-</span><span>-</span><span>-</span><span>-</span><span>-</span><span>-</span>`;
    pendingCoursesRows.appendChild(empty);
    return;
  }

  filteredCourses.forEach((course) => {
    const row = document.createElement("div");
    row.className = "row row-seven";
    row.innerHTML = `
      <span class="course-title-cell"><strong>${escapeHtml(course.title)}</strong><small>${escapeHtml(course.description || "No description")}</small></span>
      <span>${escapeHtml(course.category || "General")}</span>
      <span>${escapeHtml(course.difficulty || "-")}</span>
      <span>${escapeHtml(course.grade || "-")}</span>
      <span>${escapeHtml(course.price || "Free")}</span>
      <span>${Array.isArray(course.lectures) ? course.lectures.length : 0}</span>
      <span class="course-action-wrap">
        <button class="action-chip approve" data-course-action="approve" data-course-id="${course.id}" type="button">Approve</button>
        <button class="action-chip reject" data-course-action="reject" data-course-id="${course.id}" type="button">Reject</button>
        <button class="action-chip delete" data-course-action="delete" data-course-id="${course.id}" type="button">Delete</button>
      </span>
    `;
    pendingCoursesRows.appendChild(row);
  });
}

if (studentSearchInput) {
  studentSearchInput.addEventListener("input", () => {
    renderStudentsDirectory();
  });
}

if (teacherSearchInput) {
  teacherSearchInput.addEventListener("input", () => {
    renderTeachersDirectory();
  });
}

if (courseSearchInput) {
  courseSearchInput.addEventListener("input", () => {
    renderPendingCourses();
  });
}

async function loadCourseApprovalData() {
  try {
    const pendingRes = await fetch(withCollegeScope(`${API_BASE}/courses?status=pending`));

    if (!pendingRes.ok) {
      throw new Error("Failed to load courses");
    }

    const pendingPayload = await pendingRes.json();

    pendingCourses = Array.isArray(pendingPayload?.data) ? pendingPayload.data : [];

    renderPendingCourses();
  } catch {
    pendingCourses = [];
    renderPendingCourses();
    showActionStatus("Failed to load course approvals.");
  }
}

async function handleCourseStatusUpdate(courseId, status) {
  try {
    const response = await fetch(withCollegeScope(`${API_BASE}/courses/${courseId}/status`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update status: ${response.status}`);
    }

    await loadCourseApprovalData();
    showActionStatus(`Course ${status} successfully.`);
  } catch {
    showActionStatus("Failed to update course status.");
  }
}

async function handleCourseDelete(courseId) {
  if (!confirm("Are you sure you want to delete this course request?")) return;
  try {
    const response = await fetch(withCollegeScope(`${API_BASE}/courses/${courseId}`), {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`Failed to delete course: ${response.status}`);
    }

    await loadCourseApprovalData();
    showActionStatus("Course request deleted successfully.");
  } catch {
    showActionStatus("Failed to delete course request.");
  }
}

async function handleStudentBulkUpload(file) {
  if (!file) return;

  try {
    const rows = await parseExcelOrCsvFile(file);
    const mapped = mapStudentRows(rows);

    const review = buildBulkImportReview({
      role: "student",
      rows,
      mappedRows: mapped,
      existingRecords: studentsDirectory,
      expectedHeaders: ["Name", "Reg ID", "Email", "Phone No", "Course", "Year", "Branch"],
      requiredFields: ["name", "regId", "email", "phone", "course", "year", "branch"],
    });

    const shouldImport = await openBulkImportReviewModal(review, "student");
    if (!shouldImport) {
      showActionStatus("Student import cancelled.");
      return;
    }

    if (review.importableRows.length === 0) {
      showActionStatus("No importable student rows found.");
      return;
    }

    const response = await fetch(`${API_BASE}/college-members/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "student", records: review.importableRows, collegeEmail: activeCollegeEmail }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      throw new Error(errorPayload.message || `Failed to save students: ${response.status}`);
    }

    await loadDirectories();
    await loadDepartmentStats();
    setActivePage("students");
    showActionStatus(`${review.importableRows.length} students imported. ${review.skippedRows.length} rows skipped.`);
  } catch (error) {
    showActionStatus(error?.message || "Failed to import student file.");
  }
}

async function handleTeacherBulkUpload(file) {
  if (!file) return;

  try {
    const rows = await parseExcelOrCsvFile(file);
    const mapped = mapTeacherRows(rows);

    const review = buildBulkImportReview({
      role: "teacher",
      rows,
      mappedRows: mapped,
      existingRecords: teachersDirectory,
      expectedHeaders: ["Name", "Reg ID", "Email", "Phone No", "Branch", "Subject"],
      requiredFields: ["name", "regId", "email", "phone", "branch", "subject"],
    });

    const shouldImport = await openBulkImportReviewModal(review, "teacher");
    if (!shouldImport) {
      showActionStatus("Teacher import cancelled.");
      return;
    }

    if (review.importableRows.length === 0) {
      showActionStatus("No importable teacher rows found.");
      return;
    }

    const response = await fetch(`${API_BASE}/college-members/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "teacher", records: review.importableRows, collegeEmail: activeCollegeEmail }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      throw new Error(errorPayload.message || `Failed to save teachers: ${response.status}`);
    }

    await loadDirectories();
    await loadDepartmentStats();
    setActivePage("teachers");
    showActionStatus(`${review.importableRows.length} teachers imported. ${review.skippedRows.length} rows skipped.`);
  } catch (error) {
    showActionStatus(error?.message || "Failed to import teacher file.");
  }
}

function getHeaderOrderIssues(rows, expectedHeaders) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return ["File has no data rows."];
  }

  const headers = Object.keys(rows[0]);
  const issues = [];

  expectedHeaders.forEach((expected, index) => {
    const actual = headers[index] || "(missing)";
    if (normalizeHeaderKey(actual) !== normalizeHeaderKey(expected)) {
      issues.push(`Column ${index + 1} should be ${expected}, found ${actual}`);
    }
  });

  return issues;
}

function buildBulkImportReview({ role, rows, mappedRows, existingRecords, expectedHeaders, requiredFields }) {
  const templateOrderIssues = getHeaderOrderIssues(rows, expectedHeaders);
  const existingRegSet = new Set((existingRecords || []).map((item) => String(item.regId || "").toLowerCase()).filter(Boolean));
  const existingEmailSet = new Set((existingRecords || []).map((item) => String(item.email || "").toLowerCase()).filter(Boolean));

  const seenRegSet = new Set();
  const seenEmailSet = new Set();
  const reviewedRows = [];

  mappedRows.forEach((row) => {
    const missingFields = requiredFields.filter((key) => !String(row[key] || "").trim());
    const issues = [];
    if (missingFields.length > 0) {
      issues.push(`Missing: ${missingFields.join(", ")}`);
    }

    const regKey = String(row.regId || "").toLowerCase();
    const emailKey = String(row.email || "").toLowerCase();
    let duplicateReason = "";

    if (!issues.length) {
      if (existingRegSet.has(regKey) || existingEmailSet.has(emailKey)) {
        duplicateReason = "Already in current list";
      } else if (seenRegSet.has(regKey) || seenEmailSet.has(emailKey)) {
        duplicateReason = "Duplicate within uploaded file";
      }
    }

    seenRegSet.add(regKey);
    seenEmailSet.add(emailKey);

    const importable = issues.length === 0 && !duplicateReason && templateOrderIssues.length === 0;
    reviewedRows.push({
      ...row,
      _issues: issues,
      _duplicateReason: duplicateReason,
      _importable: importable,
      _status: importable ? "Import" : duplicateReason ? "Skip Duplicate" : "Error",
    });
  });

  const importableRows = reviewedRows
    .filter((row) => row._importable)
    .map((row) => {
      const payload = {
        name: row.name,
        regId: row.regId,
        email: row.email,
        phone: row.phone,
        branch: row.branch,
      };

      if (role === "student") {
        payload.course = row.course;
        payload.year = row.year;
      } else {
        payload.subject = row.subject;
      }

      return payload;
    });

  const skippedRows = reviewedRows.filter((row) => !row._importable);
  const duplicateRows = reviewedRows.filter((row) => row._duplicateReason);
  const invalidRows = reviewedRows.filter((row) => Array.isArray(row._issues) && row._issues.length > 0);

  return {
    templateOrderIssues,
    reviewedRows,
    importableRows,
    skippedRows,
    duplicateRows,
    invalidRows,
  };
}

function downloadBulkReviewRowsAsCsv(rows, role, fileName) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return;
  }

  const baseHeaders = role === "student"
    ? ["Row", "Name", "Reg ID", "Email", "Phone", "Course", "Year", "Branch", "Status", "Reason"]
    : ["Row", "Name", "Reg ID", "Email", "Phone", "Branch", "Subject", "Status", "Reason"];

  const csvLines = [baseHeaders.join(",")];

  rows.forEach((row) => {
    const reason = row._duplicateReason || (Array.isArray(row._issues) ? row._issues.join("; ") : "");
    const values = role === "student"
      ? [row._rowNumber, row.name, row.regId, row.email, row.phone, row.course, row.year, row.branch, row._status, reason]
      : [row._rowNumber, row.name, row.regId, row.email, row.phone, row.branch, row.subject, row._status, reason];

    csvLines.push(values.map((value) => `"${String(value || "").replace(/"/g, '""')}"`).join(","));
  });

  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function openBulkImportReviewModal(review, role) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "bulk-review-overlay";

    const modal = document.createElement("div");
    modal.className = "bulk-review-modal";

    const templateBlock = review.templateOrderIssues.length > 0
      ? `<div class="bulk-review-card"><h4>Template Order Issues</h4><ul>${review.templateOrderIssues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")}</ul></div>`
      : "";

    const duplicateBlock = review.duplicateRows.length > 0
      ? `<div class="bulk-review-card"><h4>Duplicates Found: ${review.duplicateRows.length}</h4><ul>${review.duplicateRows.slice(0, 8).map((row) => `<li>Row ${row._rowNumber}: ${escapeHtml(row.regId)} / ${escapeHtml(row.email)}</li>`).join("")}</ul></div>`
      : "";

    const invalidBlock = review.invalidRows.length > 0
      ? `<div class="bulk-review-card"><h4>Invalid Rows: ${review.invalidRows.length}</h4><ul>${review.invalidRows.slice(0, 8).map((row) => `<li>Row ${row._rowNumber}: ${escapeHtml((row._issues || []).join("; "))}</li>`).join("")}</ul></div>`
      : "";

    const previewHeaders = role === "student"
      ? ["Status", "Row", "Name", "Reg ID", "Email", "Phone", "Course", "Year", "Branch", "Reason"]
      : ["Status", "Row", "Name", "Reg ID", "Email", "Phone", "Branch", "Subject", "Reason"];

    const previewRowsHtml = review.reviewedRows.slice(0, 20).map((row) => {
      const statusClass = row._importable ? "bulk-status-import" : row._duplicateReason ? "bulk-status-duplicate" : "bulk-status-error";
      const reason = row._duplicateReason || (Array.isArray(row._issues) ? row._issues.join("; ") : "");

      if (role === "student") {
        return `<tr>
          <td class="${statusClass}">${escapeHtml(row._status)}</td>
          <td>${escapeHtml(String(row._rowNumber))}</td>
          <td>${escapeHtml(row.name)}</td>
          <td>${escapeHtml(row.regId)}</td>
          <td>${escapeHtml(row.email)}</td>
          <td>${escapeHtml(row.phone)}</td>
          <td>${escapeHtml(row.course)}</td>
          <td>${escapeHtml(row.year)}</td>
          <td>${escapeHtml(row.branch)}</td>
          <td>${escapeHtml(reason)}</td>
        </tr>`;
      }

      return `<tr>
        <td class="${statusClass}">${escapeHtml(row._status)}</td>
        <td>${escapeHtml(String(row._rowNumber))}</td>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.regId)}</td>
        <td>${escapeHtml(row.email)}</td>
        <td>${escapeHtml(row.phone)}</td>
        <td>${escapeHtml(row.branch)}</td>
        <td>${escapeHtml(row.subject)}</td>
        <td>${escapeHtml(reason)}</td>
      </tr>`;
    }).join("");

    modal.innerHTML = `
      <h3>Review ${escapeHtml(role)} import</h3>
      <p class="panel-subtext">${review.reviewedRows.length} rows parsed • ${review.importableRows.length} ready • ${review.skippedRows.length} skipped</p>
      <div class="bulk-review-grid">
        ${templateBlock || ""}
        ${duplicateBlock || ""}
        ${invalidBlock || ""}
      </div>
      <div class="bulk-review-table">
        <table>
          <thead><tr>${previewHeaders.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
          <tbody>${previewRowsHtml || `<tr><td colspan="${previewHeaders.length}">No rows to preview</td></tr>`}</tbody>
        </table>
      </div>
      <div class="bulk-review-actions">
        <button class="pill-btn" type="button" data-download="duplicates">Download Duplicates CSV</button>
        <button class="pill-btn" type="button" data-download="errors">Download Errors CSV</button>
        <button class="pill-btn" type="button" data-download="skipped">Download All Skipped CSV</button>
        <button class="pill-btn" type="button" data-action="cancel">Cancel</button>
        <button class="pill-btn" type="button" data-action="import" ${review.importableRows.length === 0 || review.templateOrderIssues.length > 0 ? "disabled" : ""}>Import Valid Rows Only</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        overlay.remove();
        resolve(false);
      }
    });

    modal.querySelector('[data-action="cancel"]').addEventListener("click", () => {
      overlay.remove();
      resolve(false);
    });

    modal.querySelector('[data-action="import"]').addEventListener("click", () => {
      overlay.remove();
      resolve(true);
    });

    modal.querySelector('[data-download="duplicates"]').addEventListener("click", () => {
      downloadBulkReviewRowsAsCsv(review.duplicateRows, role, `${role}_duplicate_rows.csv`);
    });

    modal.querySelector('[data-download="errors"]').addEventListener("click", () => {
      downloadBulkReviewRowsAsCsv(review.invalidRows, role, `${role}_error_rows.csv`);
    });

    modal.querySelector('[data-download="skipped"]').addEventListener("click", () => {
      downloadBulkReviewRowsAsCsv(review.skippedRows, role, `${role}_skipped_rows.csv`);
    });
  });
}

async function loadDirectories() {
  try {
    const [studentsResponse, teachersResponse] = await Promise.all([
      fetch(withCollegeScope(`${API_BASE}/college-members?role=student`)),
      fetch(withCollegeScope(`${API_BASE}/college-members?role=teacher`)),
    ]);

    if (!studentsResponse.ok || !teachersResponse.ok) {
      throw new Error("Failed to load college members");
    }

    const studentsPayload = await studentsResponse.json();
    const teachersPayload = await teachersResponse.json();

    studentsDirectory = Array.isArray(studentsPayload?.data)
      ? studentsPayload.data.map((student) => ({
        id: student.id,
        role: "student",
        name: student.name,
        regId: student.regId,
        email: student.email,
        phone: student.phone,
        course: student.course,
        year: student.year,
        branch: student.branch,
        status: student.status || "active",
      }))
      : studentsDirectory;

    teachersDirectory = Array.isArray(teachersPayload?.data)
      ? teachersPayload.data.map((teacher) => ({
        id: teacher.id,
        role: "teacher",
        name: teacher.name,
        regId: teacher.regId,
        email: teacher.email,
        phone: teacher.phone,
        branch: teacher.branch,
        subject: teacher.subject,
        status: teacher.status || "active",
      }))
      : teachersDirectory;

    renderStudentsDirectory();
    renderTeachersDirectory();
  } catch {
    // Fallback to local cache or built-in sample data if backend is unavailable.
    loadDirectoriesFromStorage();
    renderStudentsDirectory();
    renderTeachersDirectory();
  }
}

async function loadDepartmentStats() {
  try {
    const response = await fetch(withCollegeScope(`${API_BASE}/college-members/department-stats`));
    if (!response.ok) {
      throw new Error(`Failed to load department stats: ${response.status}`);
    }

    const payload = await response.json();
    departmentStats = Array.isArray(payload?.data) ? payload.data : [];
    renderDepartmentsFromStats();
  } catch {
    departmentStats = [];
    renderDepartmentsFromStats();
  }
}

function toggleMenu(button, menu) {
  const isOpen = !menu.hidden;
  menu.hidden = isOpen;
  button.setAttribute("aria-expanded", String(!isOpen));
}

function closeAllMenus() {
  profileMenu.hidden = true;
  quickActionMenu.hidden = true;
  if (notificationMenu) notificationMenu.hidden = true;
  if (messageMenu) messageMenu.hidden = true;
  if (searchResults) {
    searchResults.hidden = true;
  }
  profileButton.setAttribute("aria-expanded", "false");
  quickActionBtn.setAttribute("aria-expanded", "false");
  if (notificationBtn) notificationBtn.setAttribute("aria-expanded", "false");
  if (messageBtn) messageBtn.setAttribute("aria-expanded", "false");
  if (globalSearch) {
    globalSearch.setAttribute("aria-expanded", "false");
  }
}

function openQuickActionForm(config) {
  return new Promise((resolve) => {
    if (!quickActionModal || !quickActionModalTitle || !quickActionForm || !quickActionFormFields || !quickActionModalSubmitBtn) {
      resolve(null);
      return;
    }

    const title = config?.title || "Quick Action";
    const submitLabel = config?.submitLabel || "Submit";
    const fields = Array.isArray(config?.fields) ? config.fields : [];

    quickActionModalTitle.textContent = title;
    quickActionModalSubmitBtn.textContent = submitLabel;

    quickActionFormFields.innerHTML = fields
      .map((field) => {
        const type = field.type || "text";
        const id = `qa-field-${field.name}`;
        const fullWidthClass = field.fullWidth ? " full-width" : "";
        const requiredAttr = field.required ? "required" : "";
        const placeholderAttr = field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : "";
        const valueAttr = field.value !== undefined ? `value="${escapeHtml(String(field.value))}"` : "";

        if (type === "textarea") {
          return `
            <div class="form-group${fullWidthClass}">
              <label for="${id}">${escapeHtml(field.label)}</label>
              <textarea id="${id}" name="${escapeHtml(field.name)}" ${placeholderAttr} ${requiredAttr}>${escapeHtml(String(field.value || ""))}</textarea>
            </div>
          `;
        }

        if (type === "select") {
          const options = Array.isArray(field.options) ? field.options : [];
          const selectedValue = String(field.value ?? "");
          const optionsMarkup = options
            .map((option) => {
              const optionValue = typeof option === "string" ? option : option.value;
              const optionLabel = typeof option === "string" ? option : option.label;
              const isSelected = String(optionValue) === selectedValue ? "selected" : "";
              return `<option value="${escapeHtml(String(optionValue))}" ${isSelected}>${escapeHtml(String(optionLabel))}</option>`;
            })
            .join("");

          return `
            <div class="form-group${fullWidthClass}">
              <label for="${id}">${escapeHtml(field.label)}</label>
              <select id="${id}" name="${escapeHtml(field.name)}" ${requiredAttr}>
                ${optionsMarkup}
              </select>
            </div>
          `;
        }

        return `
          <div class="form-group${fullWidthClass}">
            <label for="${id}">${escapeHtml(field.label)}</label>
            <input id="${id}" name="${escapeHtml(field.name)}" type="${escapeHtml(type)}" ${placeholderAttr} ${valueAttr} ${requiredAttr} />
          </div>
        `;
      })
      .join("");

    quickActionModal.style.display = "flex";

    const closeWithResult = (result) => {
      cleanup();
      quickActionModal.style.display = "none";
      quickActionForm.reset();
      resolve(result);
    };

    const handleSubmit = (event) => {
      event.preventDefault();
      if (!quickActionForm.reportValidity()) return;

      const formData = new FormData(quickActionForm);
      const values = {};
      formData.forEach((value, key) => {
        values[key] = String(value).trim();
      });

      closeWithResult(values);
    };

    const handleCancel = () => closeWithResult(null);
    const handleOverlay = (event) => {
      if (event.target === quickActionModalOverlay) {
        closeWithResult(null);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeWithResult(null);
      }
    };

    const cleanup = () => {
      quickActionForm.removeEventListener("submit", handleSubmit);
      quickActionModalOverlay?.removeEventListener("click", handleOverlay);
      quickActionModalCloseBtn?.removeEventListener("click", handleCancel);
      quickActionModalCancelBtn?.removeEventListener("click", handleCancel);
      document.removeEventListener("keydown", handleEscape);
    };

    quickActionForm.addEventListener("submit", handleSubmit);
    quickActionModalOverlay?.addEventListener("click", handleOverlay);
    quickActionModalCloseBtn?.addEventListener("click", handleCancel);
    quickActionModalCancelBtn?.addEventListener("click", handleCancel);
    document.addEventListener("keydown", handleEscape);

    window.requestAnimationFrame(() => {
      const firstField = quickActionForm.querySelector("input, textarea, select");
      firstField?.focus();
    });
  });
}

function announceAccessibility(message) {
  if (!accessibilityStatus) return;
  accessibilityStatus.textContent = message;
}

function focusDashboardSection(sectionId) {
  setActivePage("dashboard");
  const sectionHeading = document.getElementById(sectionId);
  if (!sectionHeading) return;
  sectionHeading.scrollIntoView({ behavior: "smooth", block: "start" });
}

function isExamAnnouncement(announcement) {
  const text = `${announcement?.title || ""} ${announcement?.description || ""}`.toLowerCase();
  return /exam|semester|test/.test(text);
}

function getRuntimeActivities() {
  const runtimeActivities = Array.isArray(activities) ? [...activities] : [];

  if (adminSettings.autoBackup && adminSettings.lastBackupAt) {
    runtimeActivities.unshift({
      type: "System backup",
      message: "Automated backup completed successfully",
      time: new Date(adminSettings.lastBackupAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
    });
  }

  if (adminSettings.financeDigest) {
    runtimeActivities.unshift({
      type: "Finance digest",
      message: "Weekly finance summary is ready for review",
      time: "Weekly",
    });
  }

  return runtimeActivities;
}

function persistAdminSettings() {
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(adminSettings));
}

function sanitizeAdminSettings(source) {
  return {
    roleBasedAccess: Boolean(source?.roleBasedAccess),
    twoFactorAuth: Boolean(source?.twoFactorAuth),
    autoBackup: Boolean(source?.autoBackup),
    emailAlerts: Boolean(source?.emailAlerts),
    examReminders: Boolean(source?.examReminders),
    financeDigest: Boolean(source?.financeDigest),
    lastBackupAt: typeof source?.lastBackupAt === "string" ? source.lastBackupAt : "",
  };
}

function syncSettingInputsFromState() {
  settingToggleInputs.forEach((input) => {
    const key = input.dataset.settingKey;
    if (!key) return;
    if (Object.prototype.hasOwnProperty.call(adminSettings, key)) {
      input.checked = Boolean(adminSettings[key]);
    }
  });
}

async function saveAdminSettingsToServer() {
  const response = await fetch(withCollegeScope(`${API_BASE}/college-panel/settings`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(adminSettings),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const payload = await response.json();
  const serverSettings = sanitizeAdminSettings({ ...DEFAULT_ADMIN_SETTINGS, ...(payload.data || {}) });
  adminSettings = { ...serverSettings };
  persistAdminSettings();
  syncSettingInputsFromState();
}

function renderSettingsRuntime() {
  if (!settingsRuntime) return;

  const chips = [
    { label: "2FA", enabled: adminSettings.twoFactorAuth },
    { label: "Auto Backup", enabled: adminSettings.autoBackup, note: adminSettings.lastBackupAt ? `last ${new Date(adminSettings.lastBackupAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "idle" },
    { label: "Email Alerts", enabled: adminSettings.emailAlerts },
    { label: "Exam Reminders", enabled: adminSettings.examReminders },
  ];

  settingsRuntime.innerHTML = chips
    .map((chip) => {
      const note = chip.note ? ` · ${chip.note}` : "";
      return `<span class="settings-chip ${chip.enabled ? "" : "is-off"}">${escapeHtml(chip.label)}: ${chip.enabled ? "On" : "Off"}${escapeHtml(note)}</span>`;
    })
    .join("");
}

function applyAdminSettingsEffects() {
  if (notificationBtn) {
    const disabled = !adminSettings.emailAlerts;
    notificationBtn.classList.toggle("is-disabled", disabled);
    notificationBtn.setAttribute("aria-disabled", String(disabled));
  }

  renderSettingsRuntime();
  renderTopbarFeedMenus();
}

async function loadAdminSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      adminSettings = sanitizeAdminSettings({ ...DEFAULT_ADMIN_SETTINGS, ...parsed });
    }
  } catch {
    // Ignore invalid setting payload and keep defaults.
    adminSettings = { ...DEFAULT_ADMIN_SETTINGS };
  }

  syncSettingInputsFromState();
  applyAdminSettingsEffects();

  try {
    const response = await fetch(withCollegeScope(`${API_BASE}/college-panel/settings`));
    if (response.ok) {
      const payload = await response.json();
      adminSettings = sanitizeAdminSettings({ ...DEFAULT_ADMIN_SETTINGS, ...(payload.data || {}) });
      persistAdminSettings();
      syncSettingInputsFromState();
      applyAdminSettingsEffects();
    }
  } catch {
    // Keep local settings if backend is offline.
  }
}

function renderTopbarFeedMenus() {
  const visibleAnnouncements = adminSettings.examReminders
    ? announcements
    : announcements.filter((announcement) => !isExamAnnouncement(announcement));
  const runtimeActivities = getRuntimeActivities();

  if (notificationBadge) {
    notificationBadge.textContent = String(adminSettings.emailAlerts ? Math.min(visibleAnnouncements.length, 99) : 0);
  }
  if (messageBadge) {
    messageBadge.textContent = String(Math.min(runtimeActivities.length, 99));
  }

  if (notificationMenuList) {
    notificationMenuList.innerHTML = "";
    const items = visibleAnnouncements.slice(0, 5);

    if (!adminSettings.emailAlerts) {
      const disabled = document.createElement("div");
      disabled.className = "topbar-feed-empty";
      disabled.textContent = "Email alerts are disabled in settings.";
      notificationMenuList.appendChild(disabled);
    } else if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "topbar-feed-empty";
      empty.textContent = "No new notifications.";
      notificationMenuList.appendChild(empty);
    } else {
      items.forEach((announcement) => {
        const row = document.createElement("div");
        row.className = "topbar-feed-item";
        row.innerHTML = `
          <strong>${escapeHtml(String(announcement.title || "Announcement"))}</strong>
          <p>${escapeHtml(String(announcement.description || ""))}</p>
          <small>${escapeHtml(String(announcement.date || "Today"))}</small>
        `;
        notificationMenuList.appendChild(row);
      });
    }
  }

  if (messageMenuList) {
    messageMenuList.innerHTML = "";
    const items = runtimeActivities.slice(0, 5);

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "topbar-feed-empty";
      empty.textContent = "No recent messages.";
      messageMenuList.appendChild(empty);
    } else {
      items.forEach((activity) => {
        const row = document.createElement("div");
        row.className = "topbar-feed-item";
        row.innerHTML = `
          <strong>${escapeHtml(String(activity.type || "Update"))}</strong>
          <p>${escapeHtml(String(activity.message || ""))}</p>
          <small>${escapeHtml(String(activity.time || "Now"))}</small>
        `;
        messageMenuList.appendChild(row);
      });
    }
  }
}

function renderSearchResults(query) {
  if (!searchResults) return;
  const term = query.trim().toLowerCase();

  if (!term) {
    searchResults.hidden = true;
    searchResults.innerHTML = "";
    if (globalSearch) {
      globalSearch.setAttribute("aria-expanded", "false");
    }
    return;
  }

  const matches = searchDataset
    .filter((item) => item.name.toLowerCase().includes(term) || item.type.toLowerCase().includes(term))
    .slice(0, 6);

  searchResults.innerHTML = "";

  if (matches.length === 0) {
    const empty = document.createElement("div");
    empty.className = "search-result-item";
    empty.textContent = "No matches found";
    searchResults.appendChild(empty);
    searchResults.hidden = false;
    if (globalSearch) {
      globalSearch.setAttribute("aria-expanded", "true");
    }
    return;
  }

  matches.forEach((match, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "search-result-item";
    btn.id = `searchResult-${index}`;
    btn.setAttribute("role", "option");
    btn.innerHTML = `<span>${match.name}</span><span class="search-type">${match.type}</span>`;
    btn.addEventListener("click", () => {
      if (globalSearch) {
        globalSearch.value = match.name;
        globalSearch.setAttribute("aria-activedescendant", btn.id);
      }
      searchResults.hidden = true;
      if (globalSearch) {
        globalSearch.setAttribute("aria-expanded", "false");
      }
    });
    searchResults.appendChild(btn);
  });

  searchResults.hidden = false;
  if (globalSearch) {
    globalSearch.setAttribute("aria-expanded", "true");
  }
}

function renderCalendar() {
  if (!monthLabel || !calendarGrid) return;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  monthLabel.textContent = monthName;

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  calendarGrid.innerHTML = "";

  dayNames.forEach((d) => {
    const head = document.createElement("div");
    head.className = "day-name";
    head.textContent = d;
    calendarGrid.appendChild(head);
  });

  for (let i = 0; i < firstDay; i += 1) {
    const empty = document.createElement("div");
    calendarGrid.appendChild(empty);
  }

  const today = new Date();

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, month, day);
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "day-cell";
    cell.textContent = String(day);

    if (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    ) {
      cell.classList.add("is-today");
    }

    if (
      date.getFullYear() === selectedDate.getFullYear() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getDate() === selectedDate.getDate()
    ) {
      cell.classList.add("is-selected");
    }

    cell.addEventListener("click", () => {
      selectedDate = date;
      renderCalendar();
    });

    calendarGrid.appendChild(cell);
  }

  if (selectedDateLabel) {
    selectedDateLabel.textContent = `Selected date: ${selectedDate.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    })}`;
  }
}

function renderEvents() {
  if (!eventsList) return;
  eventsList.innerHTML = "";

  if (!events.length) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "No events scheduled yet.";
    eventsList.appendChild(empty);
    return;
  }

  events.forEach((evt) => {
    const li = document.createElement("li");
    li.className = "event-row";
    li.innerHTML = `
      <span class="event-time">${escapeHtml(String(evt.time || ""))}</span>
      <div class="event-meta">
        <strong>${escapeHtml(String(evt.name || ""))}</strong>
        <small>${escapeHtml(String(evt.location || ""))}</small>
      </div>
    `;
    eventsList.appendChild(li);
  });
}

function renderAnnouncements() {
  if (!announcementsWrap) return;
  announcementsWrap.innerHTML = "";

  if (!announcements.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No announcements published yet.";
    announcementsWrap.appendChild(empty);
    return;
  }

  announcements.forEach((a) => {
    const card = document.createElement("article");
    card.className = "announcement-card";
    card.innerHTML = `
      <h3>${escapeHtml(String(a.title || ""))}</h3>
      <p>${escapeHtml(String(a.description || ""))}</p>
      <time datetime="${escapeHtml(String(a.date || ""))}">${escapeHtml(String(a.date || ""))}</time>
    `;
    announcementsWrap.appendChild(card);
  });
}

function renderActivities() {
  if (!activityFeed) return;
  activityFeed.innerHTML = "";
  const runtimeActivities = getRuntimeActivities();

  if (!runtimeActivities.length) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "No recent activities yet.";
    activityFeed.appendChild(empty);
    return;
  }

  const activityIcon = {
    "Student admission": "ADM",
    "Grade updates": "GRD",
    Payments: "PAY",
    "New faculty": "FAC",
  };

  runtimeActivities.forEach((activity) => {
    const li = document.createElement("li");
    li.className = "activity-item";
    li.innerHTML = `
      <span class="activity-icon" aria-hidden="true">${activityIcon[activity.type] || "•"}</span>
      <div class="activity-meta">
        <strong>${escapeHtml(String(activity.type || ""))}</strong>
        <p>${escapeHtml(String(activity.message || ""))}</p>
        <small>${escapeHtml(String(activity.time || ""))}</small>
      </div>
    `;
    activityFeed.appendChild(li);
  });
}

function renderQuickStats() {
  if (!quickStatsWrap) return;
  quickStatsWrap.innerHTML = "";

  if (!quickStats.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No quick statistics available.";
    quickStatsWrap.appendChild(empty);
    return;
  }

  quickStats.forEach((stat) => {
    const card = document.createElement("article");
    card.className = "quick-stat";
    const displayValue = typeof stat.value === "number" ? formatDashboardNumber(stat.value) : String(stat.value ?? "");
    card.innerHTML = `
      <div class="quick-stat-label">${escapeHtml(String(stat.label || ""))}</div>
      <div class="value">${escapeHtml(displayValue)}</div>
      <small>${escapeHtml(String(stat.note || ""))}</small>
    `;
    quickStatsWrap.appendChild(card);
  });
}

function renderDashboardTasks() {
  if (!dashboardTasksWrap) return;
  dashboardTasksWrap.innerHTML = "";

  if (!dashboardTasks.length) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "No live tasks right now.";
    dashboardTasksWrap.appendChild(empty);
    return;
  }

  dashboardTasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = "task-item";
    item.innerHTML = `
      <div class="task-copy">
        <strong>${escapeHtml(task.title)}</strong>
        <p>${escapeHtml(task.note || "")}</p>
      </div>
      <span class="task-tone task-tone-${escapeHtml(task.tone || "neutral")}">${escapeHtml(task.tone || "live")}</span>
    `;
    dashboardTasksWrap.appendChild(item);
  });
}

function renderDashboardPanels() {
  renderDashboardOverview();
  renderEvents();
  renderAnnouncements();
  renderActivities();
  renderQuickStats();
  renderDashboardTasks();
  renderTopbarFeedMenus();
}

async function loadPanelData() {
  try {
    const response = await fetch(withCollegeScope(`${API_BASE}/college-panel/overview`));

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const payload = await response.json();
    const overview = payload.data || {};

    events = Array.isArray(overview.events) ? overview.events : [];
    announcements = Array.isArray(overview.announcements) ? overview.announcements : [];
    activities = Array.isArray(overview.activities) ? overview.activities : [];
    quickStats = Array.isArray(overview.quickStats) ? overview.quickStats : [];
    dashboardTasks = Array.isArray(overview.tasks) ? overview.tasks : [];

    dashboardOverview = {
      metrics: overview.metrics || dashboardOverview.metrics,
      departmentStats: Array.isArray(overview.departmentStats) ? overview.departmentStats : dashboardOverview.departmentStats,
    };

    const college = overview.college;
    if (college) {
      const profileName = document.getElementById("profileName");
      const profileAvatar = document.getElementById("profileAvatar");
      if (profileName) profileName.textContent = college.ownerName || "College Admin";
      if (profileAvatar && college.ownerName) {
        profileAvatar.textContent = college.ownerName.slice(0, 2).toUpperCase();
      }
    }

    renderDashboardPanels();
  } catch {
    // Keep default dashboard data if backend is not reachable.
  }
}

async function postCollegeAnnouncement() {
  const values = await openQuickActionForm({
    title: "Create Announcement",
    submitLabel: "Create Announcement",
    fields: [
      { name: "title", label: "Announcement Title", placeholder: "Exam schedule update", required: true, fullWidth: true },
      { name: "date", label: "Publish Date", type: "date", value: new Date().toISOString().slice(0, 10), required: true },
      { name: "tag", label: "Tag", placeholder: "College", value: "College" },
      { name: "description", label: "Announcement Details", type: "textarea", placeholder: "Write announcement details", required: true, fullWidth: true },
    ],
  });

  if (!values) return;

  const title = values.title;
  const description = values.description;
  const date = values.date || new Date().toISOString().slice(0, 10);
  const tag = values.tag || "College";

  try {
    const response = await fetch(`${API_BASE}/announcements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        date,
        tag,
        panel: "college",
        collegeEmail: activeCollegeEmail,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    await loadPanelData();
    showActionStatus("Announcement published to college panel.");
  } catch {
    showActionStatus("Failed to publish announcement.");
  }
}

async function logCollegeActivity() {
  const values = await openQuickActionForm({
    title: "Create Activity Log",
    submitLabel: "Create Activity",
    fields: [
      {
        name: "type",
        label: "Activity Type",
        type: "select",
        value: "Student admission",
        required: true,
        options: [
          { value: "Student admission", label: "Student Admission" },
          { value: "Grade updates", label: "Grade Updates" },
          { value: "Payments", label: "Payments" },
          { value: "New faculty", label: "New Faculty" },
          { value: "Operations", label: "Operations" },
        ],
      },
      { name: "message", label: "Activity Description", type: "textarea", placeholder: "New activity recorded from clg-admin panel.", required: true, fullWidth: true },
    ],
  });

  if (!values) return;

  const type = values.type;
  const message = values.message;

  try {
    const response = await fetch(`${API_BASE}/college-activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        message,
        time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        collegeEmail: activeCollegeEmail,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    await loadPanelData();
    showActionStatus("Activity logged to college panel.");
  } catch {
    showActionStatus("Failed to log activity.");
  }
}

async function addCollegeEvent() {
  const values = await openQuickActionForm({
    title: "Create Event",
    submitLabel: "Create Event",
    fields: [
      { name: "name", label: "Event Title", placeholder: "Orientation Session", required: true, fullWidth: true },
      { name: "time", label: "Event Time", placeholder: "10:00 AM", value: "10:00 AM", required: true },
      { name: "date", label: "Event Date", type: "date", value: new Date().toISOString().slice(0, 10), required: true },
      { name: "location", label: "Event Location", placeholder: "Main Auditorium", required: true, fullWidth: true },
    ],
  });

  if (!values) return;

  const name = values.name;
  const time = values.time;
  const location = values.location;
  const date = values.date || new Date().toISOString().slice(0, 10);

  try {
    const response = await fetch(`${API_BASE}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        time,
        location,
        date,
        panel: "college",
        collegeEmail: activeCollegeEmail,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    await loadPanelData();
    renderCalendar();
    showActionStatus("Event added to college panel.");
  } catch {
    showActionStatus("Failed to add event.");
  }
}

function showActionStatus(message) {
  if (!actionStatus) return;
  actionStatus.textContent = message;
  actionStatus.hidden = false;

  window.clearTimeout(showActionStatus.timer);
  showActionStatus.timer = window.setTimeout(() => {
    actionStatus.hidden = true;
  }, 2200);
}

showActionStatus.timer = 0;

function handleLogout() {
  showActionStatus("Signing out...");
  window.localStorage.removeItem("authUser");
  window.localStorage.removeItem(ACTIVE_PAGE_STORAGE_KEY);
  window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
  
  const keysToRemove = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && (key.startsWith("clgAdminStudentsDirectory") || key.startsWith("clgAdminTeachersDirectory"))) {
       keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => window.localStorage.removeItem(k));

  window.setTimeout(() => {
    window.location.assign("/");
  }, 600);
}

function setActivePage(page) {
  if (page === "logout") {
    handleLogout();
    return;
  }
  const safePage = validPages.has(page) ? page : "dashboard";
  currentActivePage = safePage;

  window.localStorage.setItem(ACTIVE_PAGE_STORAGE_KEY, safePage);
  if (window.location.hash !== `#${safePage}`) {
    window.history.replaceState(null, "", `#${safePage}`);
  }

  sidebarNavItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.page === safePage);
  });

  pageSections.forEach((section) => {
    section.classList.toggle("active", section.dataset.pageContent === safePage);
  });

  if (pageTitle) {
    pageTitle.textContent = pageLabels[safePage] || "Dashboard";
  }

  if (safePage === "dashboard") {
    renderDashboardPanels();
  }

  if (safePage === "courses") {
    void loadCourseApprovalData();
  }

  if (safePage === "departments") {
    void loadDepartmentStats();
  }
}

sidebarToggle.addEventListener("click", () => {
  appShell.classList.toggle("sidebar-collapsed");
  const expanded = !appShell.classList.contains("sidebar-collapsed");
  sidebarToggle.setAttribute("aria-expanded", String(expanded));
});

sidebarNavItems.forEach((item) => {
  item.addEventListener("keydown", (event) => {
    const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();

    const items = Array.from(sidebarNavItems);
    if (event.key === "Home") {
      items[0].focus();
      return;
    }
    if (event.key === "End") {
      items[items.length - 1].focus();
      return;
    }

    moveFocusInList(items, item, event.key === "ArrowDown" ? 1 : -1);
  });
});

sidebarNavItems.forEach((item) => {
  item.addEventListener("click", () => {
    const targetPage = item.dataset.page;
    if (!targetPage) return;
    setActivePage(targetPage);
  });
});

if (globalSearch) {
  globalSearch.addEventListener("input", (event) => {
    const target = event.target;
    renderSearchResults(target.value || "");
  });

  globalSearch.addEventListener("focus", () => {
    renderSearchResults(globalSearch.value || "");
  });

  globalSearch.addEventListener("keydown", (event) => {
    if (!searchResults || searchResults.hidden) return;

    const options = Array.from(searchResults.querySelectorAll(".search-result-item"));
    if (!options.length) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      moveFocusInList(options, document.activeElement, direction);
      return;
    }

    if (event.key === "Escape") {
      searchResults.hidden = true;
      globalSearch.setAttribute("aria-expanded", "false");
    }
  });
}

profileButton.addEventListener("click", () => {
  if (notificationMenu && !notificationMenu.hidden) toggleMenu(notificationBtn, notificationMenu);
  if (messageMenu && !messageMenu.hidden) toggleMenu(messageBtn, messageMenu);
  if (!quickActionMenu.hidden) toggleMenu(quickActionBtn, quickActionMenu);
  toggleMenu(profileButton, profileMenu);
});

if (notificationBtn && notificationMenu) {
  notificationBtn.addEventListener("click", () => {
    if (!profileMenu.hidden) toggleMenu(profileButton, profileMenu);
    if (!quickActionMenu.hidden) toggleMenu(quickActionBtn, quickActionMenu);
    if (messageMenu && !messageMenu.hidden) toggleMenu(messageBtn, messageMenu);
    toggleMenu(notificationBtn, notificationMenu);
  });
}

if (messageBtn && messageMenu) {
  messageBtn.addEventListener("click", () => {
    if (!profileMenu.hidden) toggleMenu(profileButton, profileMenu);
    if (!quickActionMenu.hidden) toggleMenu(quickActionBtn, quickActionMenu);
    if (notificationMenu && !notificationMenu.hidden) toggleMenu(notificationBtn, notificationMenu);
    toggleMenu(messageBtn, messageMenu);
  });
}

profileMenuItems.forEach((item) => {
  item.addEventListener("click", () => {
    const action = item.dataset.profileAction;
    profileMenu.hidden = true;
    profileButton.setAttribute("aria-expanded", "false");

    if (action === "profile") {
      const currentName = document.getElementById("profileName")?.textContent || "College Admin";
      const currentEmail = activeCollegeEmail || "admin@eduaccess.com";
      
      void openQuickActionForm({
        title: "My Profile",
        submitLabel: "Close",
        fields: [
          { name: "name", label: "Admin Name", value: currentName, fullWidth: true },
          { name: "role", label: "Role", value: "College Admin" },
          { name: "email", label: "Email", value: currentEmail, fullWidth: true },
        ],
      });
      showActionStatus("Profile details opened.");
      return;
    }

    if (action === "settings") {
      setActivePage("settings");
      showActionStatus("Account settings opened.");
      return;
    }

    if (action === "logout") {
      handleLogout();
    }
  });
});

quickActionBtn.addEventListener("click", () => {
  if (!profileMenu.hidden) toggleMenu(profileButton, profileMenu);
  if (notificationMenu && !notificationMenu.hidden) toggleMenu(notificationBtn, notificationMenu);
  if (messageMenu && !messageMenu.hidden) toggleMenu(messageBtn, messageMenu);
  toggleMenu(quickActionBtn, quickActionMenu);
});

quickActionItems.forEach((item) => {
  item.addEventListener("click", () => {
    const action = item.dataset.action;
    quickActionMenu.hidden = true;
    quickActionBtn.setAttribute("aria-expanded", "false");

    if (action === "add-student") {
      setActivePage("students");
      showActionStatus("Quick Action: Students section opened.");
      return;
    }

    if (action === "add-teacher") {
      setActivePage("teachers");
      showActionStatus("Quick Action: Teachers section opened.");
      return;
    }

    if (action === "create-course") {
      setActivePage("courses");
      showActionStatus("Quick Action: Courses section opened.");
      return;
    }

    if (action === "post-announcement") {
      setActivePage("dashboard");
      void postCollegeAnnouncement();
      return;
    }

    if (action === "log-activity") {
      setActivePage("dashboard");
      void logCollegeActivity();
      return;
    }

    if (action === "add-event") {
      setActivePage("dashboard");
      void addCollegeEvent();
    }
  });
});

settingToggleInputs.forEach((input) => {
  input.addEventListener("change", async () => {
    const key = input.dataset.settingKey;
    const label = input.dataset.settingLabel || "Setting";
    if (!key) return;

    adminSettings[key] = input.checked;

    if (key === "autoBackup" && input.checked) {
      adminSettings.lastBackupAt = new Date().toISOString();
    }

    if (key === "autoBackup" && !input.checked) {
      adminSettings.lastBackupAt = "";
    }

    persistAdminSettings();
    applyAdminSettingsEffects();
    renderDashboardPanels();

    try {
      await saveAdminSettingsToServer();
      applyAdminSettingsEffects();
      renderDashboardPanels();
    } catch {
      showActionStatus(`${label} saved locally. Backend sync failed.`);
      return;
    }

    showActionStatus(`${label} ${input.checked ? "enabled" : "disabled"}.`);
  });
});

contrastToggle.addEventListener("click", () => {
  const willEnable = !document.body.classList.contains("high-contrast");
  setHighContrast(willEnable);
  announceAccessibility(willEnable ? "High contrast mode enabled" : "High contrast mode disabled");
});

fontIncrease.addEventListener("click", () => {
  fontLevel = Math.min(2, fontLevel + 1);
  updateFontClass();
  announceAccessibility("Font size increased");
});

fontDecrease.addEventListener("click", () => {
  fontLevel = Math.max(0, fontLevel - 1);
  updateFontClass();
  announceAccessibility("Font size decreased");
});

prevMonth.addEventListener("click", () => {
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  renderCalendar();
});

nextMonth.addEventListener("click", () => {
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  renderCalendar();
});

function updateFontClass() {
  document.body.classList.remove("font-sm", "font-md", "font-lg");
  if (fontLevel === 0) document.body.classList.add("font-sm");
  if (fontLevel === 1) document.body.classList.add("font-md");
  if (fontLevel === 2) document.body.classList.add("font-lg");
  window.localStorage.setItem("adminPanelFontLevel", String(fontLevel));
}

function setHighContrast(isEnabled) {
  document.body.classList.toggle("high-contrast", isEnabled);
  contrastToggle.setAttribute("aria-pressed", String(isEnabled));
  contrastToggle.textContent = isEnabled ? "Normal Contrast" : "High Contrast";
  window.localStorage.setItem("adminPanelHighContrast", String(isEnabled));
}

function moveFocusInList(items, currentElement, direction) {
  if (!items.length) return;
  const currentIndex = items.indexOf(currentElement);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + direction + items.length) % items.length;
  items[nextIndex].focus();
}

document.addEventListener("click", (event) => {
  const target = event.target;
  const notificationWrap = document.getElementById("notificationMenuWrap");
  const messageWrap = document.getElementById("messageMenuWrap");
  const profileWrap = document.getElementById("profileMenuWrap");
  const quickWrap = document.getElementById("quickActionWrap");
  const searchWrap = document.querySelector(".search-wrap");

  const clickedOutsideSearch = searchWrap ? !searchWrap.contains(target) : true;
  const outsideNotification = notificationWrap ? !notificationWrap.contains(target) : true;
  const outsideMessages = messageWrap ? !messageWrap.contains(target) : true;
  const outsideProfile = profileWrap ? !profileWrap.contains(target) : true;
  const outsideQuick = quickWrap ? !quickWrap.contains(target) : true;

  if (outsideNotification && outsideMessages && outsideProfile && outsideQuick && clickedOutsideSearch) {
    closeAllMenus();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAllMenus();
  }

  if (event.altKey && event.key.toLowerCase() === "b") {
    event.preventDefault();
    appShell.classList.toggle("sidebar-collapsed");
    const expanded = !appShell.classList.contains("sidebar-collapsed");
    sidebarToggle.setAttribute("aria-expanded", String(expanded));
    announceAccessibility(expanded ? "Sidebar expanded" : "Sidebar collapsed");
  }
});

profileMenu.addEventListener("keydown", (event) => {
  const items = Array.from(profileMenu.querySelectorAll("button"));
  if (!items.length) return;

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    moveFocusInList(items, document.activeElement, event.key === "ArrowDown" ? 1 : -1);
  }
});

quickActionMenu.addEventListener("keydown", (event) => {
  const items = Array.from(quickActionMenu.querySelectorAll("button"));
  if (!items.length) return;

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    moveFocusInList(items, document.activeElement, event.key === "ArrowDown" ? 1 : -1);
  }
});

if (notificationMenu) {
  notificationMenu.addEventListener("keydown", (event) => {
    const items = Array.from(notificationMenu.querySelectorAll("button"));
    if (!items.length) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      moveFocusInList(items, document.activeElement, event.key === "ArrowDown" ? 1 : -1);
    }
  });

  notificationMenu.querySelector('[data-feed-action="announcements"]')?.addEventListener("click", () => {
    closeAllMenus();
    focusDashboardSection("announceTitle");
  });
}

if (messageMenu) {
  messageMenu.addEventListener("keydown", (event) => {
    const items = Array.from(messageMenu.querySelectorAll("button"));
    if (!items.length) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      moveFocusInList(items, document.activeElement, event.key === "ArrowDown" ? 1 : -1);
    }
  });

  messageMenu.querySelector('[data-feed-action="activities"]')?.addEventListener("click", () => {
    closeAllMenus();
    focusDashboardSection("activityTitle");
  });
}

if (studentBulkUploadBtn && studentBulkFileInput) {
  studentBulkUploadBtn.addEventListener("click", () => {
    studentBulkFileInput.click();
  });

  studentBulkFileInput.addEventListener("change", async (event) => {
    const target = event.target;
    const file = target.files && target.files[0];
    await handleStudentBulkUpload(file);
    target.value = "";
  });
}

if (studentTemplateDownloadBtn) {
  studentTemplateDownloadBtn.addEventListener("click", () => {
    const headers = ["Name", "Reg ID", "Email", "Phone No", "Course", "Year", "Branch"];
    const rows = [
      {
        Name: "Aarav Sharma",
        "Reg ID": "REG-2026-011",
        Email: "aarav.sharma@gmail.com",
        "Phone No": "9876543210",
        Course: "BSc CS",
        Year: "1",
        Branch: "Computer Science",
      },
      {
        Name: "Riya Menon",
        "Reg ID": "REG-2026-012",
        Email: "riya.menon@gmail.com",
        "Phone No": "9876501234",
        Course: "BBA",
        Year: "2",
        Branch: "Commerce",
      },
    ];

    downloadCsvTemplate("student_bulk_template.csv", headers, rows);
    showActionStatus("Student template downloaded.");
  });
}

if (teacherBulkUploadBtn && teacherBulkFileInput) {
  teacherBulkUploadBtn.addEventListener("click", () => {
    teacherBulkFileInput.click();
  });

  teacherBulkFileInput.addEventListener("change", async (event) => {
    const target = event.target;
    const file = target.files && target.files[0];
    await handleTeacherBulkUpload(file);
    target.value = "";
  });
}

if (teacherTemplateDownloadBtn) {
  teacherTemplateDownloadBtn.addEventListener("click", () => {
    const headers = ["Name", "Reg ID", "Email", "Phone No", "Branch", "Subject"];
    const rows = [
      {
        Name: "Dr. Meera Singh",
        "Reg ID": "FAC-011",
        Email: "meera.singh@gmail.com",
        "Phone No": "9898989898",
        Branch: "Computer Science",
        Subject: "Data Structures",
      },
      {
        Name: "Prof. Arjun Rao",
        "Reg ID": "FAC-012",
        Email: "arjun.rao@gmail.com",
        "Phone No": "9797979797",
        Branch: "Commerce",
        Subject: "Financial Accounting",
      },
    ];

    downloadCsvTemplate("teacher_bulk_template.csv", headers, rows);
    showActionStatus("Teacher template downloaded.");
  });
}

if (refreshCoursesBtn) {
  refreshCoursesBtn.addEventListener("click", () => {
    void loadCourseApprovalData();
  });
}

if (pendingCoursesRows) {
  pendingCoursesRows.addEventListener("click", (event) => {
    const target = event.target;
    const button = target.closest("button[data-course-action]");
    if (!button) return;

    const courseId = Number(button.dataset.courseId);
    const action = button.dataset.courseAction;
    if (Number.isNaN(courseId) || !action) return;

    if (action === "approve") {
      void handleCourseStatusUpdate(courseId, "approved");
      return;
    }

    if (action === "reject") {
      void handleCourseStatusUpdate(courseId, "rejected");
      return;
    }

    if (action === "delete") {
      void handleCourseDelete(courseId);
    }
  });
}

calendarGrid.addEventListener("keydown", (event) => {
  const activeElement = document.activeElement;
  if (!activeElement || !activeElement.classList.contains("day-cell")) return;

  const deltaMap = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -7,
    ArrowDown: 7,
  };

  const delta = deltaMap[event.key];
  if (!delta) return;
  event.preventDefault();

  const nextDate = new Date(selectedDate);
  nextDate.setDate(nextDate.getDate() + delta);
  selectedDate = nextDate;
  currentDate = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1);
  renderCalendar();

  const dayCells = Array.from(calendarGrid.querySelectorAll(".day-cell"));
  const selectedCell = dayCells.find((cell) => cell.classList.contains("is-selected"));
  if (selectedCell) {
    selectedCell.focus();
  }
});

const savedContrast = window.localStorage.getItem("adminPanelHighContrast") === "true";
setHighContrast(savedContrast);

const savedFont = Number(window.localStorage.getItem("adminPanelFontLevel"));
if (!Number.isNaN(savedFont)) {
  fontLevel = Math.max(0, Math.min(2, savedFont));
}
updateFontClass();

window.addEventListener("resize", () => {
  renderDashboardOverview();
});

async function bootstrap() {
  const initialPage = resolveInitialPage();
  loadDirectoriesFromStorage();
  setActivePage(initialPage);
  await loadAdminSettings();

  await loadPanelData();
  await loadDirectories();
  await loadDepartmentStats();
  await loadCourseApprovalData();
  renderCalendar();
  renderDashboardPanels();

  // Preserve whichever page user selected while async data was loading.
  if (currentActivePage !== initialPage) {
    setActivePage(currentActivePage);
  }
}

void bootstrap();
