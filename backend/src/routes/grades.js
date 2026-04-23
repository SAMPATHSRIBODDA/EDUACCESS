import { Router } from "express";
import { User } from "../models/User.js";
import { Course } from "../models/Course.js";
import { Assignment } from "../models/Assignment.js";

const router = Router();

// Mock aggregation since we don't have individual submission records yet
router.get("/summary", async (req, res) => {
    try {
        // Distribution of marks in brackets
        const distribution = [
            { range: "0-40%", count: 5, color: "#f43f5e" },  // Rose
            { range: "41-60%", count: 12, color: "#f59e0b" }, // Amber
            { range: "61-80%", count: 28, color: "#3b82f6" }, // Blue
            { range: "81-100%", count: 15, color: "#10b981" }, // Emerald
        ];

        const stats = {
            classAverage: 78,
            assignmentsGraded: 42,
            quizzesCompleted: 156,
            passingRate: 92,
        };

        res.json({ data: { distribution, stats } });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch grade summary" });
    }
});

router.get("/students", async (req, res) => {
    try {
        const students = await User.find({ role: "student" }).limit(10);
        
        const performance = students.map((student, idx) => {
            // Generating semi-random but stable performance data
            const assignmentAvg = Math.floor(70 + (idx * 3) % 30);
            const quizAvg = Math.floor(65 + (idx * 4) % 35);
            const completion = Math.floor(40 + (idx * 7) % 60);
            
            let status = "Average";
            if (assignmentAvg > 85 && quizAvg > 80) status = "Excelling";
            if (assignmentAvg < 50 || completion < 20) status = "At Risk";

            return {
                id: student.id || idx + 1,
                name: student.name,
                email: student.email,
                avatar: `https://i.pravatar.cc/150?u=${student.email}`,
                assignmentAvg,
                quizAvg,
                completion,
                status
            };
        });

        res.json({ data: performance });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch student performance" });
    }
});

export default router;
