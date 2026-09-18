require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const cors = require("cors");
const googleTTS = require("google-tts-api");
const crypto = require("crypto");

const apiRouter = require("./routes/api");
const app = express();

global.rootDir = process.cwd();

// MongoDB Connection
const mongoURI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/artaround";

if (mongoose.connection.readyState === 0) {
  mongoose
    .connect(mongoURI)
    .then(() => {
      console.log(`MongoDB connected successfully`);
    })
    .catch((err) => {
      console.error("MongoDB connection error:", err.message);
    });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// API Routes
app.use("/api", apiRouter);

app.get("/api/config", (req, res) => {
  const configPath = path.join(__dirname, "config.json");
  if (fs.existsSync(configPath)) {
    res.sendFile(configPath);
  } else {
    res
      .status(404)
      .json({ success: false, message: "Museum configuration not found" });
  }
});

// TTS Generation & Cache
const ttsCacheDir = path.join(__dirname, "tts_cache");
if (!fs.existsSync(ttsCacheDir)) {
  fs.mkdirSync(ttsCacheDir);
}

app.get("/api/tts", async (req, res) => {
  const text = req.query.text;
  if (!text) return res.status(400).send("Missing text parameter");

  const hash = crypto.createHash("md5").update(text).digest("hex");
  const fileName = `tts_${hash}.mp3`;
  const cachedFilePath = path.join(ttsCacheDir, fileName);

  if (fs.existsSync(cachedFilePath)) {
    return res.sendFile(cachedFilePath);
  }

  try {
    const base64Audio = await googleTTS.getAudioBase64(text, {
      lang: "it",
      slow: false,
      host: "https://translate.google.com",
      timeout: 10000,
    });

    const buffer = Buffer.from(base64Audio, "base64");
    fs.writeFileSync(cachedFilePath, buffer);

    return res.sendFile(cachedFilePath);
  } catch (err) {
    console.error("Error generating TTS audio:", err);
    return res.status(500).send("Error generating audio on server");
  }
});

// Static files for frontend applications
const navigatorDistPath = path.join(__dirname, "navigator", "dist");
const navigatorSourcePath = path.join(__dirname, "navigator");

app.use(
  "/navigator/audio",
  express.static(path.join(navigatorSourcePath, "public", "audio")),
);
app.use(
  "/navigator/img",
  express.static(path.join(navigatorSourcePath, "public", "img")),
);

app.use("/navigator", express.static(navigatorDistPath));

app.get(/^\/navigator(?:\/.*)?$/, (req, res) => {
  const distIndexPath = path.join(navigatorDistPath, "index.html");
  const sourceIndexPath = path.join(navigatorSourcePath, "index.html");

  if (fs.existsSync(distIndexPath)) {
    return res.sendFile(distIndexPath);
  }
  if (fs.existsSync(sourceIndexPath)) {
    return res.sendFile(sourceIndexPath);
  }
  return res.status(404).send("Mobile app build not found.");
});

// Marketplace static frontend
app.use(
  "/",
  express.static(path.join(__dirname, "marketplace"), {
    extensions: ["html", "htm"],
  }),
);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "marketplace", "index.html"));
});

// 404 Handler
app.use((req, res) => {
  res
    .status(404)
    .send(
      "<h1>404 - Not Found</h1><p>The requested resource was not found.</p>",
    );
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
