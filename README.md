# 🎓 EduAccess: Accessible Learning Platform

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

**EduAccess** is a comprehensive, quad-panel educational platform designed to streamline the learning and teaching experience while providing robust institutional oversight. Built with accessibility and real-time interaction at its core, it serves students, teachers, college administrators, and platform-wide super administrators.

---

## 🌟 Key Features

### 👨‍🎓 Student Panel (Learning Ecosystem)
- **Personalized Learning Path**: Track course progress, units completed, and grades.
- **Interactive Content**: Access rich course materials including PDFs, PPTs, and videos.
- **Real-time Community**: Engage in discussions and see live peer activity via WebSockets.
- **Accessibility Ready**: Built-in support for voice-to-text and screen reader compatibility.

### 👩‍🏫 Teacher Panel (Instructional Management)
- **Course Lifecycle Management**: Create and update courses with nested units and lectures.
- **Assessment Tools**: Design quizzes and assignments with automated and manual grading.
- **Analytics Dashboard**: Monitor student performance and engagement metrics at a glance.
- **Resource Hub**: Upload and manage instructional materials via Cloudinary.

### 🏛️ College Admin Panel (Institutional Governance)
- **Institutional Oversight**: Monitor all courses and users within the college domain.
- **User Management**: Manage student and teacher lists specific to the institution.
- **Audit Logs**: Track institutional activities for compliance and quality assurance.
- **Domain Scoping**: All data is automatically filtered to ensure privacy and institutional integrity.

### 👑 Super Admin Panel (Platform Governance)
- **Global Management**: High-level control over all colleges, users, and platform settings.
- **Institutional Onboarding**: Review and approve college applications with automated workflow triggers.
- **Financial Oversight**: Monitor transactions and platform-wide enrollment statistics.
- **Data Centralization**: Comprehensive view of the entire EduAccess ecosystem.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 19 (Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Real-time**: Socket.io-client
- **Utilities**: clsx, tailwind-merge, jszip, xlsx

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.io
- **Authentication**: Google OAuth 2.0 (Google Auth Library)
- **Cloud Storage**: Cloudinary
- **Payments**: Razorpay Integration
- **File Handling**: Multer

---

## 📂 Project Structure

```text
EDUACCESS/
├── frontend/           # React + TypeScript Vite Application
│   ├── src/            # Source code
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Page-level components (Student, Teacher, etc.)
│   │   ├── context/    # React Context providers
│   │   └── services/   # API and WebSocket services
│   └── index.html      # Main entry point
├── backend/            # Node.js + Express API
│   ├── src/            # Source code
│   │   ├── models/     # Mongoose Schemas
│   │   ├── routes/     # API Endpoints
│   │   └── server.js   # Server entry point
│   └── scripts/        # Database maintenance scripts
└── BACKEND_REPORT.md   # Detailed technical documentation
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB account (local or Atlas)
- Cloudinary account
- Google Cloud Project (for OAuth)

### 1. Backend Setup
```bash
cd backend
npm install
# Create a .env file based on .env.example
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
# Create a .env file based on .env.example
npm run dev
```

---

## 📄 License
This project is proprietary and confidential.

---

**Built with ❤️ by the EduAccess Team**
