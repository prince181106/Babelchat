import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import NodeCache from "node-cache";
import { franc } from "franc";
import axios from "axios";
import multer from "multer";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use /tmp for Vercel serverless functions
const DB_FILE = "/tmp/database.json";
const UPLOADS_DIR = "/tmp/uploads";

// Ensure upload directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    }
  } catch (error) {
    console.error("Error loading database:", error);
  }
  return {
    users: [],
    contacts: {},
    messages: {},
    groups: [],
    statuses: [],
  };
}

function saveDatabase(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error saving database:", error);
  }
}

let db = loadDatabase();

if (!Array.isArray(db.statuses)) {
  db.statuses = [];
  saveDatabase(db);
}

const buildPublicUser = (user) => ({
  id: user.id,
  phoneNumber: user.phoneNumber,
  username: user.username,
  language: user.language,
  avatarUrl: user.avatarUrl || null,
  createdAt: user.createdAt,
});

const normalizePhone = (value) => String(value || "").replace(/\D/g, "");
const phonesMatch = (a, b) => {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  return na.slice(-10) === nb.slice(-10);
};

const translationCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
const connectedUsers = new Map();
const userSockets = new Map();
const userPreferences = new Map();

db.users.forEach(user => {
  if (user.language) {
    userPreferences.set(user.id, { language: user.language });
  }
});

const iso6393To1 = {
  eng: "en", hin: "hi", spa: "es", fra: "fr", deu: "de", ita: "it",
  por: "pt", rus: "ru", jpn: "ja", kor: "ko", cmn: "zh", ara: "ar",
  zho: "zh"
};

async function translateText(text, sourceLang, targetLang, retryCount = 0) {
  const cacheKey = `${text}-${sourceLang}-${targetLang}`;
  const cached = translationCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  let detectedSource = sourceLang;
  if (sourceLang === "auto") {
    const detected = franc(text);
    detectedSource = iso6393To1[detected] || "en";
  }

  const langMap = {
    en: "en", hi: "hi", es: "es", fr: "fr", de: "de", it: "it",
    pt: "pt", ru: "ru", ja: "ja", ko: "ko", zh: "zh", ar: "ar",
  };

  const targetCode = langMap[targetLang] || "en";
  const sourceCode = langMap[detectedSource] || "en";

  if (sourceCode === targetCode) {
    translationCache.set(cacheKey, text);
    return text;
  }

  const maxRetries = 2;
  const baseDelay = 1000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.post(
        "https://libretranslate.com/translate",
        {
          q: text,
          source: sourceCode,
          target: targetCode,
          format: "text",
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 3000,
        }
      );

      if (response.data?.translatedText) {
        const translated = response.data.translatedText;
        translationCache.set(cacheKey, translated);
        return translated;
      }
    } catch (error) {
      if (error.response?.status === 429) {
        if (attempt < maxRetries) {
          const delay = baseDelay * (attempt + 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      } else if (error.response?.status === 400) {
        break;
      }
    }
  }

  try {
    const myMemoryRes = await axios.get(`https://api.mymemory.translated.net/get`, {
      params: {
        q: text,
        langpair: `${sourceCode}|${targetCode}`,
      },
      timeout: 3000,
    });

    if (myMemoryRes.data?.responseData?.translatedText) {
      const translated = myMemoryRes.data.responseData.translatedText;
      if (translated && translated !== text) {
        translationCache.set(cacheKey, translated);
        return translated;
      }
    }
  } catch (err) {
    console.log("MyMemory fallback failed:", err.message);
  }

  return text;
}

// API Routes
app.post("/api/signup", async (req, res) => {
  try {
    const { phoneNumber, username, password, language } = req.body;

    if (!phoneNumber || !username || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingUser = db.users.find(
      (u) => phonesMatch(u.phoneNumber, phoneNumber) || u.username === username
    );
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
      id: Date.now().toString(),
      phoneNumber,
      username,
      password: hashedPassword,
      language: language || "en",
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    };

    db.users.push(user);
    db.contacts[user.id] = [];
    db.messages[user.id] = {};
    saveDatabase(db);

    userPreferences.set(user.id, { language: user.language });

    res.json({
      success: true,
      user: buildPublicUser(user),
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password) {
      return res.status(400).json({ error: "Phone number and password are required" });
    }

    const user = db.users.find((u) => phonesMatch(u.phoneNumber, phoneNumber));
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    userPreferences.set(user.id, { language: user.language || "en" });

    res.json({
      success: true,
      user: buildPublicUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/user/update-language", (req, res) => {
  const { userId, language } = req.body;
  const user = db.users.find(u => u.id === userId);
  if (user) {
    user.language = language;
    userPreferences.set(userId, { language });
    saveDatabase(db);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

app.get("/api/contacts/:userId", (req, res) => {
  const { userId } = req.params;
  const contacts = db.contacts[userId] || [];
  res.json(contacts);
});

app.post("/api/contacts/:userId", (req, res) => {
  try {
    const { userId } = req.params;
    const { phoneNumber } = req.body;

    const contactUser = db.users.find((u) => phonesMatch(u.phoneNumber, phoneNumber));
    if (!contactUser) return res.status(404).json({ error: "User not found" });
    if (contactUser.id === userId) return res.status(400).json({ error: "Cannot add yourself" });

    if (!db.contacts[userId]) db.contacts[userId] = [];
    if (db.contacts[userId].find((c) => c.id === contactUser.id)) {
      return res.status(400).json({ error: "Contact already added" });
    }

    db.contacts[userId].push({
      id: contactUser.id,
      phoneNumber: contactUser.phoneNumber,
      username: contactUser.username,
    });

    saveDatabase(db);
    res.json({ success: true, contact: db.contacts[userId][db.contacts[userId].length - 1] });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/messages/:userId/:chatId", async (req, res) => {
  try {
    const { userId, chatId } = req.params;

    let prefs = userPreferences.get(userId);
    if (!prefs) {
      const user = db.users.find(u => u.id === userId);
      prefs = { language: user?.language || "en" };
      userPreferences.set(userId, prefs);
    }

    const targetLang = prefs.language;

    let rawMessages = [];
    if (chatId.startsWith("group_")) {
      rawMessages = db.messages[chatId] || [];
    } else {
      rawMessages = db.messages[userId]?.[chatId] || [];
    }

    const recentMessages = rawMessages.slice(-20);

    const translatedHistory = await Promise.all(
      recentMessages.map(async (m) => {
        if (m.from === userId) {
          return {
            ...m,
            translatedText: m.translatedText || m.message,
            originalText: m.originalText || m.message
          };
        }

        const translated = await translateText(
          m.message,
          m.sourceLanguage || "auto",
          targetLang
        );

        return {
          ...m,
          translatedText: translated,
          originalText: m.originalText || m.message
        };
      })
    );

    res.json(translatedHistory);
  } catch (error) {
    console.error("Error loading messages:", error);
    res.status(500).json({ error: "Failed to load messages" });
  }
});

app.post("/api/translate", async (req, res) => {
  try {
    const { text, sourceLang, targetLang } = req.body;
    const translated = await translateText(text, sourceLang, targetLang);
    res.json({ translatedText: translated });
  } catch (error) {
    res.status(500).json({ error: "Translation failed" });
  }
});

export default app;
