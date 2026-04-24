import express from "express";
import { CommunityQuestion } from "../models/CommunityQuestion.js";
import { CommunityAnswer } from "../models/CommunityAnswer.js";
import { CollegeMember } from "../models/CollegeMember.js";

const router = express.Router();

// Helper to get student college
const getStudentInfo = async (email) => {
  const member = await CollegeMember.findOne({ email });
  return {
    collegeName: member?.collegeEmail?.split('@')[1]?.split('.')[0]?.toUpperCase() || "General",
    name: member?.name || "Student"
  };
};

// GET all questions
router.get("/questions", async (req, res) => {
  try {
    const { tag, search, collegeEmail } = req.query;
    let query = {};
    if (collegeEmail) query.collegeEmail = collegeEmail;
    if (tag) query.tags = tag;
    if (search) query.$or = [
      { title: { $regex: search, $options: "i" } },
      { content: { $regex: search, $options: "i" } }
    ];
    
    const questions = await CommunityQuestion.find(query).sort({ createdAt: -1 });
    console.log(`Found ${questions.length} questions for query:`, query);
    res.json({ success: true, data: questions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single question with answers
router.get("/questions/:id", async (req, res) => {
  try {
    const question = await CommunityQuestion.findOne({ id: req.params.id });
    if (!question) return res.status(404).json({ success: false, message: "Question not found" });
    
    const answers = await CommunityAnswer.find({ questionId: req.params.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: { ...question._doc, answers } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST new question
router.post("/questions", async (req, res) => {
  try {
    let { studentEmail, collegeEmail, studentName, title, content, codeSnippet, tags } = req.body;
    
    // Auto-fetch college from CollegeMember if missing
    if (!collegeEmail) {
      const member = await CollegeMember.findOne({ email: studentEmail });
      collegeEmail = member?.collegeEmail || "";
    }

    const memberForName = await CollegeMember.findOne({ email: studentEmail });
    const collegeName = memberForName?.collegeEmail?.split('@')[1]?.split('.')[0]?.toUpperCase() || "Independent";

    const latest = await CommunityQuestion.findOne().sort({ createdAt: -1 });
    const nextId = (latest?.id || 0) + 1;
    console.log("Creating new question with ID:", nextId);

    const newQuestion = await CommunityQuestion.create({
      id: nextId,
      studentEmail,
      collegeEmail,
      studentName,
      collegeName,
      title,
      content,
      codeSnippet,
      tags
    });
    
    console.log("Successfully created question:", newQuestion.id);
    res.status(201).json({ success: true, data: newQuestion });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST answer
router.post("/answers", async (req, res) => {
  try {
    let { 
      questionId, studentEmail, collegeEmail, studentName, content, 
      explanation, codeSnippet, isStepByStep,
      attachmentUrl, attachmentName 
    } = req.body;
    
    if (!collegeEmail) {
      const member = await CollegeMember.findOne({ email: studentEmail });
      collegeEmail = member?.collegeEmail || "";
    }

    const memberForName = await CollegeMember.findOne({ email: studentEmail });
    const collegeName = memberForName?.collegeEmail?.split('@')[1]?.split('.')[0]?.toUpperCase() || "Independent";

    const latest = await CommunityAnswer.findOne().sort({ id: -1 });
    const newAnswer = await CommunityAnswer.create({
      id: (latest?.id || 0) + 1,
      questionId,
      studentEmail,
      collegeEmail,
      studentName,
      collegeName,
      content,
      explanation,
      codeSnippet,
      isStepByStep,
      attachmentUrl,
      attachmentName
    });
    
    res.status(201).json({ success: true, data: newAnswer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST vote (question or answer)
router.post("/vote", async (req, res) => {
  try {
    const { type, targetId, studentEmail, voteType } = req.body; // type: 'question' or 'answer', voteType: 'up' or 'down'
    const Model = type === 'question' ? CommunityQuestion : CommunityAnswer;
    
    const target = await Model.findOne({ id: targetId });
    if (!target) return res.status(404).json({ success: false, message: "Target not found" });

    // Toggle logic
    const upIdx = target.upvotes.indexOf(studentEmail);
    const downIdx = target.downvotes.indexOf(studentEmail);

    if (voteType === 'up') {
      if (upIdx > -1) {
        target.upvotes.splice(upIdx, 1);
      } else {
        target.upvotes.push(studentEmail);
        if (downIdx > -1) target.downvotes.splice(downIdx, 1);
      }
    } else {
      if (downIdx > -1) {
        target.downvotes.splice(downIdx, 1);
      } else {
        target.downvotes.push(studentEmail);
        if (upIdx > -1) target.upvotes.splice(upIdx, 1);
      }
    }

    await target.save();
    res.json({ success: true, upvotes: target.upvotes.length, downvotes: target.downvotes.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET top contributor stats
router.get("/stats/top-contributor", async (req, res) => {
  try {
    // Count questions per student
    const questionStats = await CommunityQuestion.aggregate([
      { $group: { _id: "$studentEmail", count: { $sum: 1 }, name: { $first: "$studentName" }, college: { $first: "$collegeName" } } }
    ]);

    // Count answers per student
    const answerStats = await CommunityAnswer.aggregate([
      { $group: { _id: "$studentEmail", count: { $sum: 1 }, name: { $first: "$studentName" }, college: { $first: "$collegeName" } } }
    ]);

    // Merge stats
    const combined = {};
    questionStats.forEach(s => {
      combined[s._id] = { count: s.count, name: s.name, college: s.college };
    });
    answerStats.forEach(s => {
      if (combined[s._id]) {
        combined[s._id].count += s.count;
      } else {
        combined[s._id] = { count: s.count, name: s.name, college: s.college };
      }
    });

    const list = Object.entries(combined).map(([email, data]) => ({
      email,
      ...data
    })).sort((a, b) => b.count - a.count);

    if (list.length === 0) {
      return res.json({ success: true, data: null });
    }

    const top = list[0];
    res.json({
      success: true,
      data: {
        name: top.name,
        college: top.college,
        postCount: top.count,
        initials: top.name.split(' ').map(n => n[0]).join('').toUpperCase()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE question
router.delete("/questions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await CommunityQuestion.findOneAndDelete({ id: parseInt(id) });
    // Also delete associated answers
    await CommunityAnswer.deleteMany({ questionId: parseInt(id) });
    res.json({ success: true, message: "Question deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
