import mongoose from "mongoose";

export const connectToDatabase = async () => {
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/eduaccess";

  mongoose.set("strictQuery", true);

  await mongoose.connect(mongoUri);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
};
