import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Health check route
app.get("/", (req, res) => {
  res.send("🌍 EnviroTrack API is running...");
});

// Temporary route (test only)
app.get("/api/airquality/lagos", (req, res) => {
  res.json({ message: "This will return Lagos air quality data soon 🚀" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
