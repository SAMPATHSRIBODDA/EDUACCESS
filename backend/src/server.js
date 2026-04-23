import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { connectToDatabase } from "./config/db.js";
import { seedDatabase } from "./data/seedDatabase.js";
import { backfillCollegeScopes } from "./data/backfillCollegeScopes.js";
import { Message } from "./models/Message.js";

import announcementsRoutes from "./routes/announcements.js";
import assignmentsRoutes from "./routes/assignments.js";
import authRoutes from "./routes/auth.js";
import collegeActivitiesRoutes from "./routes/collegeActivities.js";
import collegeMembersRoutes from "./routes/collegeMembers.js";
import collegePanelRoutes from "./routes/collegePanel.js";
import coursesRoutes from "./routes/courses.js";
import eventsRoutes from "./routes/events.js";
import guidesRoutes from "./routes/guides.js";
import messagesRoutes from "./routes/messages.js";
import quizzesRoutes from "./routes/quizzes.js";
import statsRoutes from "./routes/stats.js";
import superAdminRoutes from "./routes/superAdmin.js";
import resourcesRoutes from "./routes/resources.js";
import teacherPanelRoutes from "./routes/teacherPanel.js";
import usersRoutes from "./routes/users.js";
import gradesRoutes from "./routes/grades.js";
import learningRoutes from "./routes/learning.js";
import communityRoutes from "./routes/community.js";

dotenv.config({ override: true });

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

const PORT = process.env.PORT || 5000;

// Socket logic
io.on("connection", (socket) => {
  socket.on("join", (email) => {
    socket.join(email);
    console.log(`User joined room: ${email}`);
  });

  socket.on("send_message", async (data) => {
    try {
      const latest = await Message.findOne().sort({ id: -1 });
      const newMessage = await Message.create({
        id: (latest?.id || 0) + 1,
        from: data.from,
        to: data.to,
        body: data.body,
        time: data.time || new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        panel: data.panel || "teacher",
        status: "sent"
      });

      io.to(data.to).emit("receive_message", newMessage);
      socket.emit("message_sent", newMessage);
    } catch (error) {
      console.error("Socket error (send_message):", error);
    }
  });

  socket.on("mark_read", async (data) => {
    try {
      const { myEmail, otherEmail } = data;
      await Message.updateMany(
        { from: otherEmail, to: myEmail, status: { $ne: "read" } },
        { $set: { status: "read" } }
      );
      io.to(otherEmail).emit("messages_read", { by: myEmail });
    } catch (error) {
      console.error("Socket error (mark_read):", error);
    }
  });

  // Community Events
  socket.on("join_community", () => {
    socket.join("community_global");
  });

  socket.on("ask_question", (question) => {
    socket.to("community_global").emit("new_question", question);
  });

  socket.on("post_answer", (answer) => {
    // Room name is 'question_ID'
    socket.to(`question_${answer.questionId}`).emit("new_answer", answer);
    // Also notify global community for the "live" feel
    socket.to("community_global").emit("community_activity", { 
      type: 'answer', 
      questionId: answer.questionId,
      studentName: answer.studentName 
    });
  });

  socket.on("join_question", (questionId) => {
    socket.join(`question_${questionId}`);
  });
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "eduaccess-backend" });
});

app.use("/api/users", usersRoutes);
app.use("/api/guides", guidesRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/announcements", announcementsRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/assignments", assignmentsRoutes);
app.use("/api/quizzes", quizzesRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/resources", resourcesRoutes);
app.use("/api/grades", gradesRoutes);
app.use("/api/teacher-panel", teacherPanelRoutes);
app.use("/api/college-panel", collegePanelRoutes);
app.use("/api/college-activities", collegeActivitiesRoutes);
app.use("/api/college-members", collegeMembersRoutes);
app.use("/api", learningRoutes);
app.use("/api/community", communityRoutes);

const startServer = async () => {
  try {
    console.log("Connecting to database...");
    await connectToDatabase();
    console.log("Database connected.");
    // await seedDatabase();
    // await backfillCollegeScopes();
    console.log("Fresh startup (seeding disabled). Starting server...");

    httpServer.listen(PORT, () => {
      console.log(`EduAccess backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start backend:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  }
};

startServer();
