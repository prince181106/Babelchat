import express from "express";
import http from "http";
import { Server } from "socket.io";
import axios from "axios";
import cors from "cors";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import NodeCache from "node-cache";
import { franc } from "franc";
import multer from "multer";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple file-based database
const DB_FILE = path.join(__dirname, "database.json");

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
  // Country-code vs local-number compatibility (e.g. +91XXXXXXXXXX vs XXXXXXXXXX)
  return na.slice(-10) === nb.slice(-10);
};

// Cache for translations (TTL: 1 hour, check every 10 min)
const translationCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// Store connected users: socketId -> {userId, phoneNumber, username, language}
const connectedUsers = new Map();
// Store socket by userId: userId -> socket
const userSockets = new Map();
// Store user preferences: userId -> {language}
const userPreferences = new Map();

// Initialize userPreferences from database on startup
// This ensures that even if the server restarts, history translation knows the user's language
db.users.forEach(user => {
  if (user.language) {
    userPreferences.set(user.id, { language: user.language });
  }
});

// Helper to map franc 3-letter codes to 2-letter codes
const iso6393To1 = {
  eng: "en", hin: "hi", spa: "es", fra: "fr", deu: "de", ita: "it",
  por: "pt", rus: "ru", jpn: "ja", kor: "ko", cmn: "zh", ara: "ar",
  zho: "zh"
};

// Translation function with rate limit handling (LibreTranslate primary, retries, backoff, caching)
async function translateText(text, sourceLang, targetLang, retryCount = 0) {
  // Check cache first
  const cacheKey = `${text}-${sourceLang}-${targetLang}`;
  const cached = translationCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // 1. Detect Source if Auto
  let detectedSource = sourceLang;
  if (sourceLang === "auto") {
    const detected = franc(text); // returns 3 char code like 'eng'
    detectedSource = iso6393To1[detected] || "en"; // Default to en if unknown
  }

  const langMap = {
    en: "en", hi: "hi", es: "es", fr: "fr", de: "de", it: "it",
    pt: "pt", ru: "ru", ja: "ja", ko: "ko", zh: "zh", ar: "ar",
  };

  const targetCode = langMap[targetLang] || "en";
  const sourceCode = langMap[detectedSource] || "en";

  // Don't translate if languages are the same
  if (sourceCode === targetCode) {
    translationCache.set(cacheKey, text);
    return text;
  }

  const maxRetries = 2; // Reduced retries to avoid long waits
  const baseDelay = 1000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt === 0) {
        console.log(`[Translate] Sending: source=${sourceCode}, target=${targetCode}, text="${text.substring(0, 50)}..."`);
      }

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
      // Only log errors on first attempt to reduce noise
      if (attempt === 0) {
        console.log(`Translation error (${sourceCode}->${targetCode}):`, error.message);
        if (error.response?.data) {
          console.log("Translation Error Data:", JSON.stringify(error.response.data));
        }
      }

      if (error.response?.status === 429) {
        // If rate limited, just fail fast after 1 retry or fallback
        if (attempt < maxRetries) {
          const delay = baseDelay * (attempt + 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      } else if (error.response?.status === 400) {
        // Bad request (likely language not supported), stop trying LibreTranslate but try fallback
        console.log("LibreTranslate 400 error, falling back to MyMemory");
        break;
      }
    }
  }

  // Fallback: MyMemory
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

  // If all fail, return original text
  return text;
}

// --- API ROUTES ---

// Signup
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
      language: language || "en", // Store preference in DB
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

// Login
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

    // Load language preference into memory on login
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

// Update Language Preference
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

// Update User Profile (name + phone)
app.put("/api/user/:userId", (req, res) => {
  try {
    const { userId } = req.params;
    const { username, phoneNumber } = req.body;

    if (!username || !phoneNumber) {
      return res.status(400).json({ error: "Username and phone number are required" });
    }

    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const usernameTaken = db.users.find((u) => u.id !== userId && u.username === username);
    if (usernameTaken) {
      return res.status(400).json({ error: "Username already in use" });
    }

    const phoneTaken = db.users.find((u) => u.id !== userId && phonesMatch(u.phoneNumber, phoneNumber));
    if (phoneTaken) {
      return res.status(400).json({ error: "Phone number already in use" });
    }

    user.username = username;
    user.phoneNumber = phoneNumber;

    Object.keys(db.contacts).forEach((ownerId) => {
      db.contacts[ownerId] = (db.contacts[ownerId] || []).map((contact) =>
        contact.id === userId
          ? { ...contact, username: user.username, phoneNumber: user.phoneNumber }
          : contact
      );
    });

    saveDatabase(db);
    res.json({ success: true, user: buildPublicUser(user) });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get User by Phone
app.get("/api/user/:phoneNumber", (req, res) => {
  const { phoneNumber } = req.params;
  const user = db.users.find((u) => phonesMatch(u.phoneNumber, phoneNumber));
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json(buildPublicUser(user));
});
// Delete Message Route
app.post("/api/messages/delete", (req, res) => {
  const { userId, chatId, chatType, messageId } = req.body;

  if (chatType === "group") {
    // Current group storage is shared; keep existing behavior for groups.
    const chatKey = `group_${chatId}`;
    db.messages[chatKey] = db.messages[chatKey].filter(m => m.id !== messageId);
  } else {
    // Delete only for requester (local-side delete)
    if (db.messages[userId]?.[chatId]) {
      db.messages[userId][chatId] = db.messages[userId][chatId].filter(m => m.id !== messageId);
    }
  }

  saveDatabase(db);
  res.json({ success: true });
});
// Add Contact
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

// Delete Contact
app.delete("/api/contacts/:userId/:contactId", (req, res) => {
  try {
    const { userId, contactId } = req.params;
    if (db.contacts[userId]) {
      db.contacts[userId] = db.contacts[userId].filter(c => c.id !== contactId);
      saveDatabase(db);
    }
    // We could also delete messages between them if we wanted, but keeping history is safer for now.
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting contact:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get Contacts
app.get("/api/contacts/:userId", (req, res) => {
  const { userId } = req.params;
  const contacts = db.contacts[userId] || [];
  res.json(contacts);
});

// GET MESSAGES (WITH HISTORY TRANSLATION FIX)
app.get("/api/messages/:userId/:chatId", async (req, res) => {
  try {
    const { userId, chatId } = req.params;

    // Get language preference from memory or DB
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

    // LIMIT HISTORY: Only translate last 20 messages to avoid rate limits
    const recentMessages = rawMessages.slice(-20);

    // Translate each history message for the requesting user
    const translatedHistory = await Promise.all(
      recentMessages.map(async (m) => {
        // If I sent it, don't translate
        if (m.from === userId) {
          return {
            ...m,
            translatedText: m.translatedText || m.message,
            originalText: m.originalText || m.message
          };
        }

        // If someone else sent it, translate it to my language
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


// Create Group
app.post("/api/groups", (req, res) => {
  try {
    const { name, userId, memberIds } = req.body;
    if (!name || !userId || !memberIds) return res.status(400).json({ error: "Invalid data" });

    const group = {
      id: Date.now().toString(),
      name,
      createdBy: userId,
      members: [userId, ...memberIds],
      createdAt: new Date().toISOString(),
    };

    db.groups.push(group);
    db.messages[`group_${group.id}`] = [];
    saveDatabase(db);

    res.json({ success: true, group });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get User Groups
app.get("/api/groups/:userId", (req, res) => {
  const { userId } = req.params;
  const groups = db.groups.filter((g) => g.members.includes(userId));
  res.json(groups);
});

// Manual Translate Endpoint
app.post("/api/translate", async (req, res) => {
  try {
    const { text, sourceLang, targetLang } = req.body;
    const translated = await translateText(text, sourceLang, targetLang);
    res.json({ translatedText: translated });
  } catch (error) {
    res.status(500).json({ error: "Translation failed" });
  }
});

// --- SOCKET.IO LOGIC ---

import Tesseract from "tesseract.js";

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure uploads directory exists
    if (!fs.existsSync(path.join(__dirname, "uploads"))) {
      fs.mkdirSync(path.join(__dirname, "uploads"));
    }
    cb(null, path.join(__dirname, "uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Update profile avatar
app.post("/api/user/:userId/avatar", upload.single("avatar"), (req, res) => {
  try {
    const { userId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.avatarUrl = `/uploads/${req.file.filename}`;
    saveDatabase(db);

    res.json({ success: true, user: buildPublicUser(user) });
  } catch (error) {
    console.error("Avatar upload error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Add Status (media upload)
app.post("/api/status/:userId", upload.single("statusMedia"), (req, res) => {
  try {
    const { userId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: "No status media uploaded" });
    }

    const owner = db.users.find((u) => u.id === userId);
    if (!owner) {
      return res.status(404).json({ error: "User not found" });
    }

    const now = Date.now();
    const statusItem = {
      id: `${now}_${Math.random().toString(36).slice(2, 8)}`,
      ownerId: owner.id,
      ownerName: owner.username,
      ownerAvatar: owner.username?.charAt(0)?.toUpperCase() || "U",
      mediaUrl: `/uploads/${req.file.filename}`,
      mediaType: req.file.mimetype || "image/*",
      createdAt: now,
      createdAtIso: new Date(now).toISOString(),
    };

    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    db.statuses = (db.statuses || []).filter((s) => Number(s.createdAt) >= cutoff);
    db.statuses.unshift(statusItem);
    saveDatabase(db);

    const audienceIds = new Set([owner.id, ...(db.contacts[owner.id] || []).map((c) => String(c.id))]);
    Object.entries(db.contacts || {}).forEach(([uid, list]) => {
      if ((list || []).some((c) => String(c.id) === String(owner.id))) {
        audienceIds.add(String(uid));
      }
    });
    audienceIds.forEach((uid) => {
      const targetSocket = userSockets.get(String(uid));
      if (targetSocket) {
        targetSocket.emit("statusCreated", statusItem);
      }
    });

    res.json({ success: true, status: statusItem });
  } catch (error) {
    console.error("Add status error:", error);
    res.status(500).json({ error: "Failed to add status" });
  }
});

// Get statuses visible to a user (own + contacts), auto-pruned to 24h
app.get("/api/status/:userId", (req, res) => {
  try {
    const { userId } = req.params;
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;

    const before = db.statuses || [];
    const pruned = before.filter((s) => Number(s.createdAt) >= cutoff);
    if (pruned.length !== before.length) {
      db.statuses = pruned;
      saveDatabase(db);
    }

    const contactIds = new Set((db.contacts[userId] || []).map((c) => String(c.id)));
    const visible = (db.statuses || []).filter((s) => s.ownerId === userId || contactIds.has(String(s.ownerId)));
    res.json(visible);
  } catch (error) {
    console.error("Load status error:", error);
    res.status(500).json({ error: "Failed to load statuses" });
  }
});

// Delete my status
app.delete("/api/status/:userId/:statusId", (req, res) => {
  try {
    const { userId, statusId } = req.params;
    const existing = db.statuses || [];
    const target = existing.find((s) => s.id === statusId);

    if (!target) {
      return res.status(404).json({ error: "Status not found" });
    }
    if (String(target.ownerId) !== String(userId)) {
      return res.status(403).json({ error: "Not allowed" });
    }

    db.statuses = existing.filter((s) => s.id !== statusId);
    saveDatabase(db);

    const audienceIds = new Set([userId, ...(db.contacts[userId] || []).map((c) => String(c.id))]);
    Object.entries(db.contacts || {}).forEach(([uid, list]) => {
      if ((list || []).some((c) => String(c.id) === String(userId))) {
        audienceIds.add(String(uid));
      }
    });
    audienceIds.forEach((uid) => {
      const targetSocket = userSockets.get(String(uid));
      if (targetSocket) {
        targetSocket.emit("statusDeleted", { statusId });
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Delete status error:", error);
    res.status(500).json({ error: "Failed to delete status" });
  }
});
// OCR Endpoint
// OCR Endpoint
app.post("/api/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const filePath = req.file.path;
    const imageUrl = `/uploads/${req.file.filename}`;
    // Get source language from request body (default to eng)
    const sourceLang = req.body.sourceLanguage || "en";

    // Map common codes to Tesseract codes
    // Tesseract 3-letter codes: eng, chi_sim, chi_tra, hin, spa, fra, deu, etc.
    const tesseractLangMap = {
      en: "eng",
      hi: "hin", // Hindi
      es: "spa", // Spanish
      fr: "fra", // French
      de: "deu", // German
      it: "ita", // Italian
      pt: "por", // Portuguese
      ru: "rus", // Russian
      ja: "jpn", // Japanese
      ko: "kor", // Korean
      zh: "chi_sim", // Chinese Simplified
      ar: "ara", // Arabic
    };

    const ocrLang = tesseractLangMap[sourceLang] || "eng";

    console.log(`[OCR] Processing image: ${filePath} with lang: ${ocrLang}`);

    // Run Tesseract OCR - Using specific language
    const { data: { text } } = await Tesseract.recognize(filePath, ocrLang, {
      logger: m => {
        if (m.status === 'recognizing text') {
          // console.log(`[OCR Progress] ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    // Clean text: Replace newlines with spaces to help translation context
    const cleanedText = text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

    console.log(`[OCR] Extracted text: ${cleanedText.substring(0, 50)}...`);

    res.json({
      imageUrl,
      extractedText: cleanedText,
    });

  } catch (error) {
    console.error("OCR Error:", error);
    // Fallback: still return uploaded image so chat can send image-only message
    if (req.file?.filename) {
      return res.json({
        imageUrl: `/uploads/${req.file.filename}`,
        extractedText: "",
        ocrFailed: true,
      });
    }
    res.status(500).json({ error: "Failed to process image" });
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("authenticate", ({ userId, phoneNumber, username, language }) => {
    const uid = userId != null ? String(userId) : null;
    socket.userId = uid;
    socket.phoneNumber = phoneNumber;
    socket.username = username;
    socket.language = language || "en";

    connectedUsers.set(socket.id, { userId: uid, phoneNumber, username, language: socket.language });
    if (uid) userSockets.set(uid, socket);
    userPreferences.set(uid, { language: socket.language });

    console.log(`${username} authenticated with language: ${socket.language}`);
    socket.emit("authenticated", { success: true });
  });
  socket.on("deleteMessage", ({ messageId, chatId, chatType }) => {
    // Local-only delete UI confirmation.
    socket.emit("messageDeleted", { messageId });
  });

  socket.on("joinChat", ({ chatId, chatType }) => {
    if (!socket.userId) return;
    socket.currentChatId = chatId;
    socket.currentChatType = chatType;
    if (chatType === "group") socket.join(`group_${chatId}`);
    console.log(`${socket.username} joined ${chatType} chat: ${chatId}`);
  });

  socket.on("sendMessage", async ({ message, chatId, chatType, sourceLanguage, imageUrl, type, originalText, isAudioMessage }) => {
    try {
      if ((!message || !message.trim()) && !imageUrl) return;
      if (!socket.userId) return;

      console.log(`[sendMessage] from ${socket.username} to ${chatType}:${chatId}`);

      const incomingMessage = message ? message.trim() : "";
      const originalMessage = (originalText ? String(originalText).trim() : "") || incomingMessage;
      const messageId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const timestamp = new Date().toISOString();

      const messageData = {
        id: messageId,
        from: socket.userId,
        fromUsername: socket.username,
        fromPhoneNumber: socket.phoneNumber,
        message: originalMessage,
        chatId,
        chatType,
        timestamp,
        sourceLanguage: sourceLanguage || "en",
        type: type || "text",
        isAudioMessage: Boolean(isAudioMessage),
        imageUrl: imageUrl || null,
        originalText: originalMessage,
        status: "sent", // sent, seen
      };

      if (chatType === "user") {
        // 1-to-1 Logic

        // Save for sender
        if (!db.messages[socket.userId]) db.messages[socket.userId] = {};
        if (!db.messages[socket.userId][chatId]) db.messages[socket.userId][chatId] = [];
        db.messages[socket.userId][chatId].push(messageData);

        // Emit to sender purely for UI update
        socket.emit("receiveMessage", messageData);

        // Determine Receiver Language
        const targetSocket = userSockets.get(chatId);
        let targetLang = "en";
        // Check online socket first, then DB
        if (targetSocket && targetSocket.language) {
          targetLang = targetSocket.language;
        } else if (db.users[chatId]) {
          targetLang = db.users[chatId].language || "en";
        }

        console.log(`[1-to-1] From: ${socket.username} (${sourceLanguage}) -> To: ${chatId} (${targetLang})`);

        let translatedText = originalMessage;
        if (originalMessage && sourceLanguage !== targetLang) {
          console.log(`[1-to-1] Translating "${originalMessage}"...`);
          translatedText = await translateText(originalMessage, sourceLanguage, targetLang);
          console.log(`[1-to-1] Result: "${translatedText}"`);
        } else {
          console.log(`[1-to-1] No translation needed (same language or empty).`);
        }

        const receiverMessageData = {
          ...messageData,
          message: translatedText,
          translatedText: translatedText,
          originalText: originalMessage
        };

        // Save for receiver
        if (!db.messages[chatId]) db.messages[chatId] = {};
        if (!db.messages[chatId][socket.userId]) db.messages[chatId][socket.userId] = [];
        db.messages[chatId][socket.userId].push(receiverMessageData);
        saveDatabase(db);

        // Emit to receiver
        if (targetSocket) {
          targetSocket.emit("receiveMessage", receiverMessageData);
        }

      } else if (chatType === "group") {
        // Group Logic
        const chatKey = `group_${chatId}`;
        if (!db.messages[chatKey]) db.messages[chatKey] = [];
        db.messages[chatKey].push(messageData);
        saveDatabase(db);

        const group = db.groups.find(g => g.id === chatId);
        if (group && group.members) {
          group.members.forEach(async (memberId) => {
            const memberSocket = userSockets.get(memberId);
            // For valid members (including self? usually self is handled by frontend optimistic or ack? 
            // In this app, everyone listens to receiveMessage. 
            // But usually we don't want to translate for self.

            // If it's the sender, send original
            if (memberId === socket.userId) {
              socket.emit("receiveMessage", messageData);
              return;
            }

            if (memberSocket) {
              const memberLang = memberSocket.language || "en";
              let memberMsg = originalMessage;
              if (originalMessage && sourceLanguage !== memberLang) {
                memberMsg = await translateText(originalMessage, sourceLanguage, memberLang);
              }
              memberSocket.emit("receiveMessage", {
                ...messageData,
                message: memberMsg,
                translatedText: memberMsg
              });
            }
          });
        }
      }
    }
    catch (err) {
      console.error("[sendMessage] Error:", err);
    }
  });



  socket.on("markAsSeen", ({ chatId, chatType }) => {
    if (!socket.userId) return;

    if (chatType === "user") {
      const senderId = chatId; // The person who sent the messages I am now reading
      const myId = socket.userId;

      // 1. Update sender's copy (db.messages[senderId][myId])
      //    We want to mark messages sent BY senderId TO myId as 'seen'
      let updated = false;
      if (db.messages[senderId] && db.messages[senderId][myId]) {
        db.messages[senderId][myId].forEach(m => {
          if (m.from === senderId && m.status !== 'seen') {
            m.status = 'seen';
            updated = true;
          }
        });
      }

      // 2. Update my copy (db.messages[myId][senderId])
      if (db.messages[myId] && db.messages[myId][senderId]) {
        db.messages[myId][senderId].forEach(m => {
          if (m.from === senderId && m.status !== 'seen') {
            m.status = 'seen';
            updated = true;
          }
        });
      }

      if (updated) {
        saveDatabase(db);
        // Notify the sender that I saw their messages
        const senderSocket = userSockets.get(senderId);
        if (senderSocket) {
          senderSocket.emit("messagesSeen", { viewerId: myId });
        }
      }
    }
  });

  socket.on("callUser", (data) => {
    console.log(`[SIGNAL] callUser from ${socket.username} (${socket.userId}) to ${data.to}`);
    const { to, from, type, signal } = data;
    const toId = to != null ? String(to) : null;

    if (!toId) {
      console.log("[SIGNAL] callUser failed: 'to' ID missing");
      return;
    }

    const targetSocket = userSockets.get(toId);
    if (targetSocket) {
      console.log(`[SIGNAL] Forwarding incomingCall to socket ${targetSocket.id}`);
      targetSocket.emit("incomingCall", {
        from: from != null ? String(from) : socket.userId,
        fromUsername: socket.username,
        type: type || "voice",
        signal: data.signal,
      });
    } else {
      console.log(`[SIGNAL] Call target not connected: ${toId}. Available: ${[...userSockets.keys()].join(", ")}`);
    }
  });

  socket.on("answerCall", (data) => {
    console.log(`[SIGNAL] answerCall from ${socket.username} to ${data.to}`);
    const { to, from, signal } = data;
    const toId = to != null ? String(to) : null;
    if (toId) {
      const callerSocket = userSockets.get(toId);
      if (callerSocket) {
        console.log(`[SIGNAL] Forwarding callAccepted to socket ${callerSocket.id}`);
        callerSocket.emit("callAccepted", { from, signal: data.signal });
      } else {
        console.log(`[SIGNAL] Original caller not found: ${toId}`);
      }
    }
  });

  socket.on("declineCall", ({ to, from }) => {
    console.log(`[SIGNAL] declineCall from ${socket.username} to ${to}`);
    const toId = to != null ? String(to) : null;
    if (toId) {
      const callerSocket = userSockets.get(toId);
      if (callerSocket) callerSocket.emit("callDeclined", { from });
    }
  });

  socket.on("ice-candidate", (data) => {
    // console.log(`[SIGNAL] ice-candidate from ${socket.username} to ${data.to}`);
    const { to, candidate } = data || {};
    const toId = to != null ? String(to) : null;
    if (toId && candidate) {
      const targetSocket = userSockets.get(toId);
      if (targetSocket) targetSocket.emit("ice-candidate", { candidate, from: socket.userId });
    }
  });

  socket.on("disconnect", () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      console.log(`${user.username} disconnected`);
      if (user.userId) userSockets.delete(String(user.userId));
      connectedUsers.delete(socket.id);
    }
  });
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});



