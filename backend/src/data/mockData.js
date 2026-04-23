export const users = [
  {
    id: 1,
    name: "John Doe",
    email: "student@edu.com",
    role: "student",
    avatar: "JD"
  },
  {
    id: 2,
    name: "Priya Sharma",
    email: "teacher@edu.com",
    role: "teacher",
    avatar: "PS"
  },
  {
    id: 3,
    name: "ABC University",
    email: "college@edu.com",
    role: "college",
    avatar: "AU"
  },
  {
    id: 4,
    name: "Admin",
    email: "admin@edu.com",
    role: "admin",
    avatar: "AD"
  }
];

export const guides = [
  {
    id: 1,
    title: "Introduction to Python Programming",
    category: "Programming",
    difficulty: "Beginner",
    status: "approved",
    rating: 4.8,
    description: "Learn how to write your first hello world program and understand the basic syntax of Python.",
    steps: [
      {
        title: "Install Python",
        content: "Download the latest Python installer from the official website python.org and follow the instructions.",
        code: "python --version"
      },
      {
        title: "Write Hello World",
        content: "Create a file named hello.py and add the following line of code to it.",
        code: "print('Hello, World!')"
      },
      {
        title: "Run your Script",
        content: "Go to the terminal, navigate to the folder with your file, and run it using the python command.",
        code: "python hello.py"
      }
    ],
    media: [
      { type: "image", url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800" },
      { type: "video", url: "https://www.youtube.com/embed/rfscVS0vtbw" }
    ]
  },
  {
    id: 2,
    title: "Basic Math Skills for Everyday Life",
    category: "Mathematics",
    difficulty: "Beginner",
    status: "approved",
    rating: 4.7,
    description: "Master the fundamental arithmetic used in daily tasks like budgeting, shopping, and measurements.",
    steps: [
      {
        title: "Addition & Subtraction",
        content: "Understand how to combine and remove quantities in common scenarios.",
        code: "10 + 5 = 15; 20 - 7 = 13"
      },
      {
        title: "Percentages & Tips",
        content: "Learn how to calculate a 15% tip or a 20% discount quickly.",
        code: "Price * 0.15 = Tip; Price * 0.20 = Discount"
      }
    ],
    media: [
      { type: "image", url: "https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=800" }
    ]
  },
  {
    id: 3,
    title: "Using Screen Readers Effectively",
    category: "Accessibility",
    difficulty: "Intermediate",
    status: "approved",
    rating: 5,
    description: "A comprehensive guide on using NVDA and VoiceOver for digital navigation and content consumption.",
    steps: [
      {
        title: "Keyboard Shortcuts",
        content: "Learn the essential shortcuts for navigating headers, landmarks, and links.",
        code: "Insert + F7: List Links; H: Next Header"
      },
      {
        title: "Form Filling",
        content: "Techniques for navigating and filling web forms accurately using screen readers.",
        code: "F: Next Form Field; Enter: Enter Focus Mode"
      }
    ],
    media: [
      { type: "audio", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" }
    ]
  }
];

export const courses = [
  {
    id: 1,
    title: "UI/UX Design Fundamentals",
    description: "Learn core principles of accessible UI/UX design.",
    category: "Design",
    difficulty: "Beginner",
    rating: 4.8,
    reviews: "1.2k",
    price: "₹999",
    image: "https://images.unsplash.com/photo-1586717791821-3f44a563dc4c?w=600",
    badge: "Popular",
    accessibilityTags: ["TTS", "Captions"],
    topic: "UI/UX",
    grade: "Grade 10",
    students: 45,
    progress: 75,
    icon: "🌐",
    panels: ["student", "teacher", "college"],
    status: "approved",
    createdBy: "teacher@edu.com",
    collegeEmail: "college@edu.com"
  },
  {
    id: 2,
    title: "Advanced React Patterns",
    description: "Build scalable React apps with reusable patterns.",
    category: "Programming",
    difficulty: "Advanced",
    rating: 4.9,
    reviews: "2.4k",
    price: "₹1,499",
    image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600",
    badge: "Trending",
    accessibilityTags: ["TTS", "A11y-Ready"],
    topic: "Web Dev",
    grade: "Grade 11",
    students: 32,
    progress: 40,
    icon: "🐍",
    panels: ["student", "teacher"],
    status: "approved",
    createdBy: "teacher@edu.com",
    collegeEmail: "college@edu.com"
  },
  {
    id: 3,
    title: "Python for Data Analysis",
    description: "Analyze and visualize data with Python essentials.",
    category: "Data Science",
    difficulty: "Beginner",
    rating: 4.7,
    reviews: "1.8k",
    price: "₹799",
    image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600",
    badge: "Best Seller",
    accessibilityTags: ["Captions"],
    topic: "AI",
    grade: "Grade 12",
    students: 28,
    progress: 90,
    icon: "📊",
    panels: ["student", "teacher", "college"],
    status: "approved",
    createdBy: "teacher@edu.com",
    collegeEmail: "college@edu.com"
  },
  {
    id: 4,
    title: "Accessible Web Development",
    description: "Master ARIA and semantic HTML for inclusive web apps.",
    category: "Programming",
    difficulty: "Intermediate",
    rating: 4.9,
    reviews: "800",
    price: "Free",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600",
    badge: "A11y Choice",
    accessibilityTags: ["TTS", "Captions", "A11y-Ready"],
    topic: "Web Dev",
    grade: "Grade 10",
    students: 50,
    progress: 15,
    icon: "🎨",
    panels: ["student", "teacher", "college", "superadmin"],
    status: "approved",
    createdBy: "teacher@edu.com",
    collegeEmail: "college@edu.com"
  }
];

export const events = [
  { id: 1, time: "09:00 AM", name: "Web Development - 10A", location: "Room 204", date: "2026-04-07", panel: "teacher" },
  { id: 2, time: "11:00 AM", name: "Python Programming - 11B", location: "Lab 3", date: "2026-04-07", panel: "teacher" },
  { id: 3, time: "09:30", name: "Orientation Session", location: "Auditorium", date: "2026-04-07", panel: "college" },
  { id: 4, time: "14:15", name: "Exam Committee Meet", location: "Admin Hall", date: "2026-04-07", panel: "college" },
  { id: 5, time: "04:30 PM", name: "Career Guidance Webinar", location: "Online", date: "2026-04-08", panel: "student" },
  { id: 6, time: "12:00 PM", name: "Institution Review", location: "Virtual Boardroom", date: "2026-04-09", panel: "superadmin" }
];

export const announcements = [
  { id: 1, title: "Exam Schedule Updated", description: "Updated exam dates published for all classes.", date: "07 Apr 2026", tag: "Academic", panel: "teacher" },
  { id: 2, title: "New Course Material", description: "Upload complete for Spring course packs.", date: "06 Apr 2026", tag: "Materials", panel: "teacher" },
  { id: 3, title: "Mid-Semester Exams", description: "Exam schedule uploaded for all departments.", date: "07 Apr 2026", tag: "Exams", panel: "college" },
  { id: 4, title: "NAAC Review Visit", description: "Accreditation team visit planned next week.", date: "06 Apr 2026", tag: "Compliance", panel: "college" },
  { id: 5, title: "Scholarship Window Open", description: "Apply for merit scholarships before Apr 18.", date: "05 Apr 2026", tag: "Finance", panel: "student" },
  { id: 6, title: "Platform Policy Update", description: "New moderation policy now live across all institutions.", date: "07 Apr 2026", tag: "Policy", panel: "superadmin" }
];

export const assignments = [
  { id: 1, title: "React Hooks Mastery", course: "Web Dev", due: "May 20", submissions: "32/45", status: "In Review", teacherEmail: "teacher@edu.com" },
  { id: 2, title: "Pandas Data Cleaning", course: "Data Science", due: "May 18", submissions: "28/30", status: "Graded", teacherEmail: "teacher@edu.com" },
  { id: 3, title: "Python Loops Lab", course: "Python Mastery", due: "May 15", submissions: "30/32", status: "Graded", teacherEmail: "teacher@edu.com" },
  { id: 4, title: "Figma Prototyping", course: "UI/UX Design", due: "May 25", submissions: "0/50", status: "Pending", teacherEmail: "teacher@edu.com" }
];

export const messages = [
  { id: 1, from: "Alex Johnson", to: "Priya Sharma", body: "About the submission deadline...", time: "9:41 AM", status: "read", panel: "teacher" },
  { id: 2, from: "Priya Sharma", to: "Alex Johnson", body: "Deadline is May 20 midnight.", time: "9:45 AM", status: "read", panel: "teacher" },
  { id: 3, from: "Sarah Miller", to: "Priya Sharma", body: "Thank you for the feedback!", time: "Yesterday", status: "delivered", panel: "teacher" },
  { id: 4, from: "Faculty Room", to: "Priya Sharma", body: "Meeting starts in 5 mins", time: "May 18", status: "sent", panel: "teacher" }
];

export const collegeActivities = [
  { id: 1, type: "Student admission", message: "38 new students admitted in Computer Science this week", time: "10 min ago" },
  { id: 2, type: "Grade updates", message: "Mid-semester grade sheets published for BBA and BCom", time: "45 min ago" },
  { id: 3, type: "Payments", message: "248 tuition payments reconciled in finance portal", time: "1 hr ago" },
  { id: 4, type: "New faculty", message: "2 faculty members onboarded in Science department", time: "2 hrs ago" }
];
