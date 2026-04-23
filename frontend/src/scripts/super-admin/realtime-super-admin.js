const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const SUPER_ADMIN_EMAIL = "Eduaccess@gmail.com";
const SUPER_ADMIN_PASSWORD = "Eduaccess2228";

window.__superAdminPanelReady = false;

const authScreen = document.getElementById("authScreen");
const loginForm = document.getElementById("superAdminLoginForm");
const superAdminEmail = document.getElementById("superAdminEmail");
const superAdminPassword = document.getElementById("superAdminPassword");
const authError = document.getElementById("authError");
const shell = document.getElementById("shell");

const state = {
  authenticated: !authScreen,
  activeSection: new URLSearchParams(window.location.search).get("section") || "dashboard",
  dataset: null,
  selectedCollegeEmail: "",
  selectedCourseId: null,
  selectedTeacherEmail: "",
  selectedStudentEmail: "",
  filters: {
    courseCollege: "all",
    courseTeacher: "all",
    teacherCollege: "all",
    studentCollege: "all",
    studentStatus: "all",
    studentBranch: "all",
    studentSearch: "",
    teacherSearch: "",
    courseSearch: "",
    collegeSearch: "",
    approvalSearch: "",
  },
};

const VIEW_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
`;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function request(path, options) {
  return fetch(`${API_BASE}${path}`, options);
}

async function jsonRequest(path, options) {
  const response = await request(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || `Request failed: ${response.status}`);
  }
  return data;
}

function showLogin() {
  if (!authScreen) return;
  authScreen.hidden = false;
  shell.hidden = true;
  authError.textContent = "";
  loginForm.reset();
  superAdminEmail.focus();
}

function showPanel() {
  if (!authScreen) return;
  authScreen.hidden = true;
  shell.hidden = false;
}

function buildShellMarkup() {
  shell.innerHTML = `
    <aside class="sidebar" id="sidebar" aria-label="Main navigation">
      <div class="brand">
        <div class="brand-mark">EA</div>
        <div class="brand-text">
          <strong>EduAccess</strong>
          <small>Super Admin</small>
        </div>
      </div>

      <nav class="sidebar-nav" id="sidebarNav" aria-label="Sidebar links">
        <button class="nav-item active" data-section="dashboard" type="button"><span class="nav-glyph" aria-hidden="true">◆</span><span class="nav-label">Dashboard</span></button>
        <button class="nav-item" data-section="colleges" type="button"><span class="nav-glyph" aria-hidden="true">◆</span><span class="nav-label">Colleges</span></button>
        <button class="nav-item" data-section="courses" type="button"><span class="nav-glyph" aria-hidden="true">◆</span><span class="nav-label">Courses</span></button>
        <button class="nav-item" data-section="teachers" type="button"><span class="nav-glyph" aria-hidden="true">◆</span><span class="nav-label">Teachers</span></button>
        <button class="nav-item" data-section="students" type="button"><span class="nav-glyph" aria-hidden="true">◆</span><span class="nav-label">Students</span></button>
        <button class="nav-item" data-section="approvals" type="button"><span class="nav-glyph" aria-hidden="true">◆</span><span class="nav-label">Approvals</span></button>
        <button class="nav-item danger" data-action="logout" type="button"><span class="nav-glyph" aria-hidden="true">×</span><span class="nav-label">Logout</span></button>
      </nav>
    </aside>

    <div class="main">
      <header class="topbar" aria-label="Top navigation bar">
        <div class="left-tools">
          <button id="toggleSidebar" class="icon-btn" type="button" aria-label="Toggle sidebar" aria-controls="sidebar" aria-expanded="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <label class="search-wrap" for="globalSearch">
            <span class="sr-only">Global search</span>
            <input id="globalSearch" type="search" placeholder="Search colleges, teachers, students, courses" aria-label="Search colleges, teachers, students, courses" />
          </label>
        </div>

        <div class="right-tools">
          <button id="refreshDataBtn" class="icon-btn" type="button" aria-label="Refresh data">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap round="round" stroke-linejoin="round"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
          </button>
          <button id="logoutBtn" class="icon-btn" type="button" aria-label="Logout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
          <div class="profile-menu-wrap" id="profileWrap">
            <button id="profileBtn" class="profile-btn" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="profileMenu">
              <span class="avatar">SA</span>
              <span class="profile-meta"><strong>Super Admin</strong><small>Platform Owner</small></span>
              <span>v</span>
            </button>
            <div id="profileMenu" class="menu" role="menu" hidden>
              <button type="button" role="menuitem" data-profile-action="refresh">Refresh</button>
              <button type="button" role="menuitem" data-profile-action="logout">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <main id="mainContent" class="content" tabindex="-1">
        <section class="toolbar">
          <h1 id="sectionTitle">Dashboard</h1>
          <div class="toolbar-actions">
            <button id="fontDown" class="pill-btn" type="button" aria-label="Decrease font size">A-</button>
            <button id="fontUp" class="pill-btn" type="button" aria-label="Increase font size">A+</button>
          </div>
        </section>

        <p id="statusLive" class="sr-only" role="status" aria-live="polite"></p>

        <section class="section active" data-section-content="dashboard">
          <section class="dashboard-hero">
            <div class="hero-copy">
              <p class="hero-kicker">Platform command center</p>
              <h2>Super Admin Dashboard</h2>
              <p class="hero-text">Monitor colleges, teachers, students, approvals, and course flow from one high-clarity control panel.</p>
            </div>
            <div class="hero-actions">
              <div class="hero-pill">
                <strong>Live Sync</strong>
                <span>Real-time database overview</span>
              </div>
              <div class="hero-pill">
                <strong>Approvals</strong>
                <span>Pending college actions</span>
              </div>
              <div class="hero-pill hero-pill-accent">
                <strong>Quick Access</strong>
                <span>Search across every entity</span>
              </div>
            </div>
          </section>

          <section class="overview-cards" id="dashboardMetrics"></section>
          <section class="grid two">
            <article class="card">
              <div class="card-head split"><h2>College Snapshot</h2><span class="muted-text">Real database data</span></div>
              <div id="collegeSnapshot" class="list-stack"></div>
            </article>
            <article class="card">
              <div class="card-head split"><h2>Approval Snapshot</h2><span class="muted-text">Pending actions</span></div>
              <div id="approvalSnapshot" class="list-stack"></div>
            </article>
          </section>
        </section>

        <section class="section" data-section-content="colleges">
          <article class="card">
            <div class="card-head split">
              <h2>Colleges</h2>
              <div class="inline-actions">
                <input id="collegeSearch" type="search" placeholder="Search college name or owner" />
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Owner</th>
                    <th>Students</th>
                    <th>Teachers</th>
                    <th>Courses</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="collegesBody"></tbody>
              </table>
            </div>
          </article>
        </section>

        <section class="section" data-section-content="courses">
          <article class="card">
            <div class="card-head split">
              <h2>Courses</h2>
              <div class="inline-actions">
                <select id="courseCollegeFilter"><option value="all">All colleges</option></select>
                <select id="courseTeacherFilter"><option value="all">All teachers</option></select>
                <input id="courseSearch" type="search" placeholder="Search course title or category" />
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>College</th>
                    <th>Teacher</th>
                    <th>Lectures</th>
                    <th>Modules</th>
                    <th>Students</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="coursesBody"></tbody>
              </table>
            </div>
          </article>
        </section>

        <section class="section" data-section-content="teachers">
          <article class="card">
            <div class="card-head split">
              <h2>Teachers</h2>
              <div class="inline-actions">
                <select id="teacherCollegeFilter"><option value="all">All colleges</option></select>
                <input id="teacherSearch" type="search" placeholder="Search teacher name or email" />
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Email</th>
                    <th>College</th>
                    <th>Branch</th>
                    <th>Courses uploaded</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="teachersBody"></tbody>
              </table>
            </div>
          </article>
        </section>

        <section class="section" data-section-content="students">
          <article class="card">
            <div class="card-head split">
              <h2>Students</h2>
              <div class="inline-actions">
                <select id="studentCollegeFilter"><option value="all">All colleges</option></select>
                <select id="studentStatusFilter">
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
                <select id="studentBranchFilter"><option value="all">All branches</option></select>
                <input id="studentSearch" type="search" placeholder="Search student name or email" />
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Email</th>
                    <th>College</th>
                    <th>Branch</th>
                    <th>Course</th>
                    <th>Year</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="studentsBody"></tbody>
              </table>
            </div>
          </article>
        </section>

        <section class="section" data-section-content="approvals">
          <section class="grid two">
            <article class="card">
              <div class="card-head split">
                <h2>College Approvals</h2>
                <input id="approvalSearch" type="search" placeholder="Search pending applications" />
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>College</th>
                      <th>Owner</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody id="approvalsBody"></tbody>
                </table>
              </div>
            </article>

            <article class="card">
              <div class="card-head"><h2>Pending Courses</h2></div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>College</th>
                      <th>Teacher</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody id="pendingCoursesBody"></tbody>
                </table>
              </div>
            </article>
          </section>
        </section>
      </main>
    </div>
  `;
}

function setActiveSection(sectionId) {
  state.activeSection = sectionId;
  document.querySelectorAll(".nav-item[data-section]").forEach((item) => {
    item.classList.toggle("active", item.dataset.section === sectionId);
  });
  document.querySelectorAll(".section[data-section-content]").forEach((section) => {
    section.classList.toggle("active", section.dataset.sectionContent === sectionId);
    section.hidden = section.dataset.sectionContent !== sectionId;
  });

  const labels = {
    dashboard: "Dashboard",
    colleges: "Colleges",
    courses: "Courses",
    teachers: "Teachers",
    students: "Students",
    approvals: "Approvals",
  };

  const title = document.getElementById("sectionTitle");
  if (title) {
    title.textContent = labels[sectionId] || "Dashboard";
  }
}

function announce(message) {
  const live = document.getElementById("statusLive");
  if (live) live.textContent = message;
}

function applyFont(levelDelta) {
  const body = document.body;
  const levels = ["font-sm", "font-md", "font-lg"];
  let current = levels.findIndex((cls) => body.classList.contains(cls));
  if (current < 0) current = 1;
  const next = Math.min(2, Math.max(0, current + levelDelta));
  body.classList.remove(...levels);
  body.classList.add(levels[next]);
}

function uniqueOptions(items, key, fallback = "all") {
  const seen = new Set();
  const values = [];
  items.forEach((item) => {
    const value = normalizeText(item?.[key]);
    if (value && !seen.has(value)) {
      seen.add(value);
      values.push(value);
    }
  });
  return [fallback, ...values];
}

function resolveCollegeLabel(email) {
  const normalized = normalizeEmail(email);
  const college = state.dataset?.colleges?.find((item) => normalizeEmail(item.collegeEmail || item.ownerEmail) === normalized);
  return college?.name || state.dataset?.primaryCollege?.collegeName || "Unassigned College";
}

function renderMetrics() {
  const metrics = [
    { label: "Total Colleges", value: state.dataset?.metrics?.colleges || 0, note: "Approved colleges" },
    { label: "Teachers", value: state.dataset?.metrics?.teachers || 0, note: "Live faculty roster" },
    { label: "Students", value: state.dataset?.metrics?.students || 0, note: "Live student roster" },
    { label: "Courses", value: state.dataset?.metrics?.courses || 0, note: "Database courses" },
    { label: "Pending Colleges", value: state.dataset?.metrics?.pendingColleges || 0, note: "Awaiting approval" },
    { label: "Pending Courses", value: state.dataset?.metrics?.pendingCourses || 0, note: "Awaiting review" },
  ];

  const metricsWrap = document.getElementById("dashboardMetrics");
  if (!metricsWrap) return;

  metricsWrap.innerHTML = metrics
    .map(
      (metric) => `
        <article class="card metric">
          <div class="metric-head"><span class="metric-icon">EA</span><span class="metric-tag">Live</span></div>
          <h3>${escapeHtml(metric.label)}</h3>
          <p>${escapeHtml(String(metric.value))}</p>
          <span class="growth">${escapeHtml(metric.note)}</span>
        </article>
      `
    )
    .join("");
}

function renderDashboardSnapshots() {
  const collegeSnapshot = document.getElementById("collegeSnapshot");
  const approvalSnapshot = document.getElementById("approvalSnapshot");
  if (!collegeSnapshot || !approvalSnapshot) return;

  const colleges = state.dataset?.colleges || [];
  const approvals = state.dataset?.approvals?.collegeApplications || [];
  const courseCount = state.dataset?.courses?.length || 0;

  collegeSnapshot.innerHTML = colleges.length
    ? colleges
        .slice(0, 4)
        .map(
          (college) => `
            <div class="list-item-card">
              <strong>${escapeHtml(college.name)}</strong>
              <p>${escapeHtml(college.ownerEmail)} · ${escapeHtml(college.city || college.state || "India")}</p>
              <small>${college.studentCount || 0} students · ${college.teacherCount || 0} teachers · ${college.courseCount || 0} courses</small>
            </div>
          `
        )
        .join("")
    : `<div class="list-item-card"><strong>No colleges approved yet</strong><p>Approve a college application to populate this area.</p></div>`;

  approvalSnapshot.innerHTML = `
    <div class="list-item-card">
      <strong>${approvals.length}</strong>
      <p>Pending college applications</p>
    </div>
    <div class="list-item-card">
      <strong>${state.dataset?.approvals?.courses?.length || 0}</strong>
      <p>Pending course approvals</p>
    </div>
    <div class="list-item-card">
      <strong>${courseCount}</strong>
      <p>Total courses in database</p>
    </div>
  `;
}

function renderColleges() {
  const body = document.getElementById("collegesBody");
  if (!body) return;

  const query = state.filters.collegeSearch.toLowerCase();
  const colleges = (state.dataset?.colleges || []).filter((college) => {
    const haystack = `${college.name} ${college.ownerName} ${college.ownerEmail} ${college.city} ${college.state} ${college.status}`.toLowerCase();
    return !query || haystack.includes(query);
  });

  body.innerHTML = colleges
    .map(
      (college) => `
        <tr data-college-email="${escapeHtml(college.collegeEmail || college.ownerEmail)}">
          <td>${escapeHtml(college.name)}</td>
          <td>${escapeHtml(college.ownerName)}</td>
          <td>${escapeHtml(String(college.studentCount || 0))}</td>
          <td>${escapeHtml(String(college.teacherCount || 0))}</td>
          <td>${escapeHtml(String(college.courseCount || 0))}</td>
          <td><span class="status ${college.status}">${escapeHtml(college.status)}</span></td>
          <td>
            <div class="table-actions">
              <button class="btn-view btn-icon" type="button" data-college-action="view" title="View details" aria-label="View details">${VIEW_ICON}</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("") || `<tr><td colspan="7"><span class="muted-text">No colleges found.</span></td></tr>`;

  body.querySelectorAll("tr[data-college-email]").forEach((row) => {
    const email = row.dataset.collegeEmail || "";
    row.querySelectorAll("button[data-college-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const college = (state.dataset?.colleges || []).find((item) => normalizeEmail(item.collegeEmail || item.ownerEmail) === normalizeEmail(email));
        if (!college) return;
        alert(
          `${college.name}\n\nOwner: ${college.ownerName}\nEmail: ${college.ownerEmail}\nAddress: ${[college.city, college.state, college.country].filter(Boolean).join(", ")}\nStudents: ${college.studentCount || 0}\nTeachers: ${college.teacherCount || 0}\nCourses: ${college.courseCount || 0}\nStatus: ${college.status}`
        );
      });
    });
  });
}

function renderCourseFilters() {
  const courseCollegeFilter = document.getElementById("courseCollegeFilter");
  const courseTeacherFilter = document.getElementById("courseTeacherFilter");
  const teacherCollegeFilter = document.getElementById("teacherCollegeFilter");
  const studentCollegeFilter = document.getElementById("studentCollegeFilter");
  const studentBranchFilter = document.getElementById("studentBranchFilter");

  if (courseCollegeFilter) {
    const colleges = uniqueOptions(state.dataset?.colleges || [], "name");
    courseCollegeFilter.innerHTML = colleges.map((value) => `<option value="${escapeHtml(value === "all" ? "all" : value)}">${escapeHtml(value === "all" ? "All colleges" : value)}</option>`).join("");
    courseCollegeFilter.value = state.filters.courseCollege;
  }

  if (courseTeacherFilter) {
    const teachers = uniqueOptions(state.dataset?.teachers || [], "email");
    courseTeacherFilter.innerHTML = teachers.map((value) => `<option value="${escapeHtml(value === "all" ? "all" : value)}">${escapeHtml(value === "all" ? "All teachers" : value)}</option>`).join("");
    courseTeacherFilter.value = state.filters.courseTeacher;
  }

  if (teacherCollegeFilter) {
    const colleges = uniqueOptions(state.dataset?.colleges || [], "name");
    teacherCollegeFilter.innerHTML = colleges.map((value) => `<option value="${escapeHtml(value === "all" ? "all" : value)}">${escapeHtml(value === "all" ? "All colleges" : value)}</option>`).join("");
    teacherCollegeFilter.value = state.filters.teacherCollege;
  }

  if (studentCollegeFilter) {
    const colleges = uniqueOptions(state.dataset?.colleges || [], "name");
    studentCollegeFilter.innerHTML = colleges.map((value) => `<option value="${escapeHtml(value === "all" ? "all" : value)}">${escapeHtml(value === "all" ? "All colleges" : value)}</option>`).join("");
    studentCollegeFilter.value = state.filters.studentCollege;
  }

  if (studentBranchFilter) {
    const branches = uniqueOptions(state.dataset?.students || [], "branch");
    studentBranchFilter.innerHTML = branches.map((value) => `<option value="${escapeHtml(value === "all" ? "all" : value)}">${escapeHtml(value === "all" ? "All branches" : value)}</option>`).join("");
    studentBranchFilter.value = state.filters.studentBranch;
  }
}

function renderCourses() {
  const body = document.getElementById("coursesBody");
  const pendingBody = document.getElementById("pendingCoursesBody");
  if (!body || !pendingBody) return;

  const collegeFilter = state.filters.courseCollege;
  const teacherFilter = state.filters.courseTeacher;
  const search = state.filters.courseSearch.toLowerCase();

  const courses = (state.dataset?.courses || []).filter((course) => {
    const matchesCollege = collegeFilter === "all" || normalizeText(course.collegeName) === collegeFilter;
    const matchesTeacher = teacherFilter === "all" || normalizeEmail(course.createdBy) === normalizeEmail(teacherFilter) || normalizeEmail(course.teacherName) === normalizeEmail(teacherFilter);
    const haystack = `${course.title} ${course.category} ${course.description} ${course.teacherName} ${course.collegeName} ${course.status}`.toLowerCase();
    return matchesCollege && matchesTeacher && (!search || haystack.includes(search));
  });

  body.innerHTML = courses
    .map(
      (course) => `
        <tr data-course-id="${escapeHtml(String(course.id))}">
          <td>
            <strong>${escapeHtml(course.title)}</strong>
            <div class="muted-text">${escapeHtml(course.category)} · ${escapeHtml(course.difficulty)}</div>
          </td>
          <td>${escapeHtml(course.collegeName)}</td>
          <td>${escapeHtml(course.teacherName)}</td>
          <td>${escapeHtml(String(course.lectureCount || 0))}</td>
          <td>${escapeHtml(String(course.moduleCount || 0))}</td>
          <td>${escapeHtml(String(course.students || 0))}</td>
          <td><span class="status ${String(course.status || "pending").toLowerCase()}">${escapeHtml(String(course.status || "pending"))}</span></td>
          <td>
            <div class="table-actions">
              <button class="btn-view btn-icon" type="button" data-course-action="view" title="View details" aria-label="View details">${VIEW_ICON}</button>
              <button class="btn-approve" type="button" data-course-action="approve">Approve</button>
              <button class="btn-reject" type="button" data-course-action="reject">Reject</button>
              <button class="btn-delete" type="button" data-course-action="delete">Delete</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("") || `<tr><td colspan="8"><span class="muted-text">No courses found.</span></td></tr>`;

  pendingBody.innerHTML = (state.dataset?.approvals?.courses || [])
    .map(
      (course) => `
        <tr data-course-id="${escapeHtml(String(course.id))}">
          <td>${escapeHtml(course.title)}</td>
          <td>${escapeHtml(course.collegeName)}</td>
          <td>${escapeHtml(course.teacherName)}</td>
          <td><span class="status pending">${escapeHtml(String(course.status || "pending"))}</span></td>
          <td>
            <div class="table-actions">
              <button class="btn-approve" type="button" data-course-action="approve">Approve</button>
              <button class="btn-reject" type="button" data-course-action="reject">Reject</button>
              <button class="btn-delete" type="button" data-course-action="delete">Delete</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("") || `<tr><td colspan="5"><span class="muted-text">No pending courses.</span></td></tr>`;

  body.querySelectorAll("tr[data-course-id]").forEach((row) => {
    row.querySelectorAll("button[data-course-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = row.dataset.courseId;
        const action = button.dataset.courseAction;
        if (!id || !action) return;

        if (action === "view") {
          const course = (state.dataset?.courses || []).find((item) => String(item.id) === String(id));
          if (course) {
            state.selectedCourseId = course.id;
            alert(`${course.title}\n\n${course.description}\n\nCollege: ${course.collegeName}\nTeacher: ${course.teacherName}\nUnits: ${course.unitCount}\nLectures: ${course.lectureCount}`);
          }
          return;
        }

        try {
          if (action === "delete") {
            await jsonRequest(`/courses/${encodeURIComponent(String(id))}`, { method: "DELETE" });
          } else {
            await jsonRequest(`/courses/${encodeURIComponent(String(id))}/status`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: action === "approve" ? "approved" : "rejected" }),
            });
          }
          await refreshDataset();
          announce(`Course ${action}d successfully.`);
        } catch (error) {
          announce(error.message || "Failed to update course");
        }
      });
    });
  });

  pendingBody.querySelectorAll("tr[data-course-id]").forEach((row) => {
    row.querySelectorAll("button[data-course-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = row.dataset.courseId;
        const action = button.dataset.courseAction;
        if (!id || !action) return;
        try {
          if (action === "delete") {
            await jsonRequest(`/courses/${encodeURIComponent(String(id))}`, { method: "DELETE" });
          } else {
            await jsonRequest(`/courses/${encodeURIComponent(String(id))}/status`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: action === "approve" ? "approved" : "rejected" }),
            });
          }
          await refreshDataset();
          announce(`Pending course ${action}d.`);
        } catch (error) {
          announce(error.message || "Failed to update course");
        }
      });
    });
  });
}

function renderTeachers() {
  const body = document.getElementById("teachersBody");
  if (!body) return;

  const search = state.filters.teacherSearch.toLowerCase();
  const collegeFilter = state.filters.teacherCollege;
  const teachers = (state.dataset?.teachers || []).filter((teacher) => {
    const collegeMatches = collegeFilter === "all" || teacher.collegeName === collegeFilter;
    const haystack = `${teacher.name} ${teacher.email} ${teacher.branch} ${teacher.subject}`.toLowerCase();
    return collegeMatches && (!search || haystack.includes(search));
  });

  body.innerHTML = teachers
    .map(
      (teacher) => `
        <tr data-teacher-id="${escapeHtml(String(teacher.id))}">
          <td>${escapeHtml(teacher.name)}</td>
          <td>${escapeHtml(teacher.email)}</td>
          <td>${escapeHtml(teacher.collegeName)}</td>
          <td>${escapeHtml(teacher.branch)}</td>
          <td>${escapeHtml(String(teacher.courseCount || 0))}</td>
          <td><span class="status ${escapeHtml(String(teacher.status || "active").toLowerCase())}">${escapeHtml(String(teacher.status || "active"))}</span></td>
          <td>
            <div class="table-actions">
              <button class="btn-view btn-icon" type="button" data-teacher-action="view" title="View details" aria-label="View details">${VIEW_ICON}</button>
              <button class="btn-suspend" type="button" data-teacher-action="suspend">Suspend</button>
              <button class="btn-delete" type="button" data-teacher-action="delete">Delete</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("") || `<tr><td colspan="7"><span class="muted-text">No teachers found.</span></td></tr>`;

  body.querySelectorAll("tr[data-teacher-id]").forEach((row) => {
    row.querySelectorAll("button[data-teacher-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = row.dataset.teacherId;
        const action = button.dataset.teacherAction;
        const teacher = (state.dataset?.teachers || []).find((item) => String(item.id) === String(id));
        if (!id || !action || !teacher) return;

        if (action === "view") {
          alert(`${teacher.name}\n\nEmail: ${teacher.email}\nCollege: ${teacher.collegeName}\nCourses uploaded: ${teacher.courseCount}\nBranch: ${teacher.branch}\nSubject: ${teacher.subject}`);
          return;
        }

        try {
          if (action === "delete") {
            await jsonRequest(`/college-members/${encodeURIComponent(String(id))}`, { method: "DELETE" });
          } else {
            await jsonRequest(`/college-members/${encodeURIComponent(String(id))}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: teacher.status === "suspended" ? "active" : "suspended" }),
            });
          }
          await refreshDataset();
          announce(`Teacher ${action}d successfully.`);
        } catch (error) {
          announce(error.message || "Failed to update teacher");
        }
      });
    });
  });
}

function renderStudents() {
  const body = document.getElementById("studentsBody");
  if (!body) return;

  const search = state.filters.studentSearch.toLowerCase();
  const collegeFilter = state.filters.studentCollege;
  const statusFilter = state.filters.studentStatus;
  const branchFilter = state.filters.studentBranch;

  const students = (state.dataset?.students || []).filter((student) => {
    const collegeMatches = collegeFilter === "all" || student.collegeName === collegeFilter;
    const statusMatches = statusFilter === "all" || String(student.status || "active").toLowerCase() === statusFilter;
    const branchMatches = branchFilter === "all" || student.branch === branchFilter;
    const haystack = `${student.name} ${student.email} ${student.course} ${student.branch}`.toLowerCase();
    return collegeMatches && statusMatches && branchMatches && (!search || haystack.includes(search));
  });

  body.innerHTML = students
    .map(
      (student) => `
        <tr data-student-id="${escapeHtml(String(student.id))}">
          <td>${escapeHtml(student.name)}</td>
          <td>${escapeHtml(student.email)}</td>
          <td>${escapeHtml(student.collegeName)}</td>
          <td>${escapeHtml(student.branch)}</td>
          <td>${escapeHtml(student.course || "N/A")}</td>
          <td>${escapeHtml(String(student.year || ""))}</td>
          <td><span class="status ${escapeHtml(String(student.status || "active").toLowerCase())}">${escapeHtml(String(student.status || "active"))}</span></td>
          <td>
            <div class="table-actions">
              <button class="btn-view btn-icon" type="button" data-student-action="view" title="View details" aria-label="View details">${VIEW_ICON}</button>
              <button class="btn-suspend" type="button" data-student-action="suspend">Suspend</button>
              <button class="btn-delete" type="button" data-student-action="delete">Delete</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("") || `<tr><td colspan="8"><span class="muted-text">No students found.</span></td></tr>`;

  body.querySelectorAll("tr[data-student-id]").forEach((row) => {
    row.querySelectorAll("button[data-student-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = row.dataset.studentId;
        const action = button.dataset.studentAction;
        const student = (state.dataset?.students || []).find((item) => String(item.id) === String(id));
        if (!id || !action || !student) return;

        if (action === "view") {
          alert(`${student.name}\n\nEmail: ${student.email}\nCollege: ${student.collegeName}\nBranch: ${student.branch}\nCourse: ${student.course || "N/A"}\nYear: ${student.year || "N/A"}`);
          return;
        }

        try {
          if (action === "delete") {
            await jsonRequest(`/college-members/${encodeURIComponent(String(id))}`, { method: "DELETE" });
          } else {
            await jsonRequest(`/college-members/${encodeURIComponent(String(id))}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: student.status === "suspended" ? "active" : "suspended" }),
            });
          }
          await refreshDataset();
          announce(`Student ${action}d successfully.`);
        } catch (error) {
          announce(error.message || "Failed to update student");
        }
      });
    });
  });
}

function renderApprovals() {
  const approvalsBody = document.getElementById("approvalsBody");
  if (!approvalsBody) return;

  const search = state.filters.approvalSearch.toLowerCase();
  const applications = (state.dataset?.approvals?.collegeApplications || []).filter((application) => {
    const haystack = `${application.collegeName} ${application.ownerName} ${application.ownerEmail}`.toLowerCase();
    return !search || haystack.includes(search);
  });

  approvalsBody.innerHTML = applications
    .map(
      (application) => `
        <tr data-application-id="${escapeHtml(String(application.id))}">
          <td>${escapeHtml(application.collegeName)}</td>
          <td>${escapeHtml(application.ownerName)}</td>
          <td>${escapeHtml(application.ownerEmail)}</td>
          <td><span class="status pending">pending</span></td>
          <td>
            <div class="table-actions">
              <button class="btn-approve" type="button" data-approval-action="approve">Approve</button>
              <button class="btn-reject" type="button" data-approval-action="reject">Reject</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("") || `<tr><td colspan="5"><span class="muted-text">No pending applications.</span></td></tr>`;

  approvalsBody.querySelectorAll("tr[data-application-id]").forEach((row) => {
    row.querySelectorAll("button[data-approval-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = row.dataset.applicationId;
        const action = button.dataset.approvalAction;
        if (!id || !action) return;

        try {
          await jsonRequest(`/super-admin/college-applications/${encodeURIComponent(String(id))}/${action}`, {
            method: "PATCH",
          });
          await refreshDataset();
          announce(`College application ${action}d.`);
        } catch (error) {
          announce(error.message || "Failed to update application");
        }
      });
    });
  });
}

function bindEvents() {
  const navItems = Array.from(document.querySelectorAll(".nav-item[data-section]"));
  const profileMenu = document.getElementById("profileMenu");
  const profileBtn = document.getElementById("profileBtn");
  const profileWrap = document.getElementById("profileWrap");
  const toggleSidebar = document.getElementById("toggleSidebar");
  const sidebar = document.getElementById("sidebar");
  const globalSearch = document.getElementById("globalSearch");
  const refreshDataBtn = document.getElementById("refreshDataBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const fontDown = document.getElementById("fontDown");
  const fontUp = document.getElementById("fontUp");
  const collegeSearch = document.getElementById("collegeSearch");
  const courseSearch = document.getElementById("courseSearch");
  const teacherSearch = document.getElementById("teacherSearch");
  const studentSearch = document.getElementById("studentSearch");
  const approvalSearch = document.getElementById("approvalSearch");
  const courseCollegeFilter = document.getElementById("courseCollegeFilter");
  const courseTeacherFilter = document.getElementById("courseTeacherFilter");
  const teacherCollegeFilter = document.getElementById("teacherCollegeFilter");
  const studentCollegeFilter = document.getElementById("studentCollegeFilter");
  const studentStatusFilter = document.getElementById("studentStatusFilter");
  const studentBranchFilter = document.getElementById("studentBranchFilter");

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const section = item.dataset.section;
      if (section) {
        setActiveSection(section);
      }
    });
  });

  profileBtn?.addEventListener("click", () => {
    profileMenu.hidden = !profileMenu.hidden;
    profileBtn.setAttribute("aria-expanded", String(!profileMenu.hidden));
  });

  document.addEventListener("click", (event) => {
    if (!profileWrap || !profileMenu || !profileBtn) return;
    if (!profileWrap.contains(event.target)) {
      profileMenu.hidden = true;
      profileBtn.setAttribute("aria-expanded", "false");
    }
  });

  toggleSidebar?.addEventListener("click", () => {
    sidebar?.classList.toggle("collapsed");
    const expanded = !sidebar?.classList.contains("collapsed");
    toggleSidebar.setAttribute("aria-expanded", String(expanded));
  });

  globalSearch?.addEventListener("input", () => {
    const q = globalSearch.value.trim().toLowerCase();
    if (!q) return;
    const sections = ["dashboard", "colleges", "courses", "teachers", "students", "approvals"];
    const hit = sections.find((section) => section.includes(q));
    if (hit) {
      setActiveSection(hit);
      announce(`Moved to ${hit} section`);
    }
  });

  refreshDataBtn?.addEventListener("click", async () => {
    await refreshDataset();
    announce("Data refreshed");
  });

  logoutBtn?.addEventListener("click", handleLogout);
  document.querySelectorAll("[data-profile-action='logout'], [data-action='logout']").forEach((button) => {
    button.addEventListener("click", handleLogout);
  });
  document.querySelectorAll("[data-profile-action='refresh']").forEach((button) => {
    button.addEventListener("click", async () => {
      await refreshDataset();
      announce("Data refreshed");
    });
  });

  fontDown?.addEventListener("click", () => applyFont(-1));
  fontUp?.addEventListener("click", () => applyFont(1));

  collegeSearch?.addEventListener("input", () => {
    state.filters.collegeSearch = collegeSearch.value;
    renderColleges();
  });
  courseSearch?.addEventListener("input", () => {
    state.filters.courseSearch = courseSearch.value;
    renderCourses();
  });
  teacherSearch?.addEventListener("input", () => {
    state.filters.teacherSearch = teacherSearch.value;
    renderTeachers();
  });
  studentSearch?.addEventListener("input", () => {
    state.filters.studentSearch = studentSearch.value;
    renderStudents();
  });
  approvalSearch?.addEventListener("input", () => {
    state.filters.approvalSearch = approvalSearch.value;
    renderApprovals();
  });

  courseCollegeFilter?.addEventListener("change", () => {
    state.filters.courseCollege = courseCollegeFilter.value;
    renderCourses();
  });
  courseTeacherFilter?.addEventListener("change", () => {
    state.filters.courseTeacher = courseTeacherFilter.value;
    renderCourses();
  });
  teacherCollegeFilter?.addEventListener("change", () => {
    state.filters.teacherCollege = teacherCollegeFilter.value;
    renderTeachers();
  });
  studentCollegeFilter?.addEventListener("change", () => {
    state.filters.studentCollege = studentCollegeFilter.value;
    renderStudents();
  });
  studentStatusFilter?.addEventListener("change", () => {
    state.filters.studentStatus = studentStatusFilter.value;
    renderStudents();
  });
  studentBranchFilter?.addEventListener("change", () => {
    state.filters.studentBranch = studentBranchFilter.value;
    renderStudents();
  });
}

function renderAll() {
  renderMetrics();
  renderDashboardSnapshots();
  renderCourseFilters();
  renderColleges();
  renderCourses();
  renderTeachers();
  renderStudents();
  renderApprovals();
  setActiveSection(state.activeSection);
}

async function refreshDataset() {
  const payload = await jsonRequest("/super-admin/dataset");
  state.dataset = payload.data;
  state.selectedCollegeEmail = state.selectedCollegeEmail || state.dataset?.primaryCollege?.collegeEmail || "";
  renderAll();
}

function handleLogout() {
  console.log("Super Admin Logging out...");
  localStorage.removeItem("superAdminAuthenticated");
  window.location.assign("/");
}

function handleLoginSubmit(event) {
  event.preventDefault();
  const email = normalizeText(superAdminEmail?.value);
  const password = normalizeText(superAdminPassword?.value);

  if (normalizeEmail(email) === normalizeEmail(SUPER_ADMIN_EMAIL) && password === SUPER_ADMIN_PASSWORD) {
    unlockSuperAdmin();
    return;
  }

  authError.textContent = "Invalid super admin credentials.";
}

function unlockSuperAdmin() {
  state.authenticated = true;
  localStorage.setItem("superAdminAuthenticated", "true");
  authError.textContent = "";
  window.location.assign("/super-admin-panel.html");
}

function tryAutoLoginFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const email = normalizeEmail(params.get("email"));
  const password = normalizeText(params.get("password"));

  if (email && password && email === normalizeEmail(SUPER_ADMIN_EMAIL) && password === SUPER_ADMIN_PASSWORD) {
    localStorage.setItem("superAdminAuthenticated", "true");
    const cleanUrl = `${window.location.pathname}${params.get("section") ? `?section=${encodeURIComponent(params.get("section"))}` : ""}${window.location.hash || ""}`;
    window.history.replaceState({}, document.title, cleanUrl);
    return true;
  }

  return false;
}

async function initPanel() {
  buildShellMarkup();
  bindEvents();
  try {
    await refreshDataset();
  } catch (error) {
    console.error(error);
    announce(error.message || "Failed to load super admin dataset");
  }
  setActiveSection(state.activeSection);
}

function boot() {
  const queryAutoLogin = tryAutoLoginFromQuery();

  if (authScreen) {
    const stored = localStorage.getItem("superAdminAuthenticated") === "true";
    if (stored || queryAutoLogin) {
      unlockSuperAdmin();
    } else {
      showLogin();
      loginForm?.addEventListener("submit", handleLoginSubmit);
      loginForm?.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        handleLoginSubmit(event);
      });
      [superAdminEmail, superAdminPassword].forEach((input) => {
        input?.addEventListener("keydown", (event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          handleLoginSubmit(event);
        });
      });
      loginForm?.addEventListener("click", (event) => {
        const target = event.target;
        if (target instanceof HTMLButtonElement && target.type === "submit") {
          const email = normalizeText(superAdminEmail?.value);
          const password = normalizeText(superAdminPassword?.value);
          if (normalizeEmail(email) === normalizeEmail(SUPER_ADMIN_EMAIL) && password === SUPER_ADMIN_PASSWORD) {
            unlockSuperAdmin();
          }
        }
      });
    }
    return;
  }

  showPanel();
  void initPanel();
}

boot();
window.__superAdminPanelReady = true;
