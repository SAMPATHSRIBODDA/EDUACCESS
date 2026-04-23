import { Router } from "express";
import mongoose from "mongoose";
import { User } from "../models/User.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const users = await User.find().sort({ id: 1 }).select("-__v");
    res.json({ data: users, total: users.length });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const param = req.params.id;
    const numericId = Number(param);

    const query = Number.isNaN(numericId)
      ? mongoose.Types.ObjectId.isValid(param)
        ? { _id: param }
        : null
      : { id: numericId };

    if (!query) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findOne(query).select("-__v");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ data: user });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

export default router;
