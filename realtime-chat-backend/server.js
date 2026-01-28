const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const axios = require("axios")
const cors = require("cors")
const bcrypt = require("bcryptjs")
const fs = require("fs")
const path = require("path")

const app = express()
app.use(cors())
app.use(express.json())

const server = http.createServer(app)
const io = new Server(server, {
  cors: { 
    origin: "*",
    methods: ["GET", "POST"]
  }
})

// Simple file-based database
const DB_FILE = path.join(__dirname, "database.json")

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, "utf8"))
    }
  } catch (error) {
    console.error("Error loading database:", error)
  }
  return {
    users: [],
    contacts: {},
    messages: {},
    groups: []
  }
}

function saveDatabase(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error("Error saving database:", error)
  }
}

let db = loadDatabase()

// Store connected users: socketId -> {userId, phoneNumber, username, language}
const connectedUsers = new Map()
// Store socket by userId: userId -> socket
const userSockets = new Map()
// Store user language preferences: userId -> language
const userLanguages = new Map()

// Translation function
async function translateText(text, sourceLang, targetLang) {
  // Don't translate if languages are the same
  if (sourceLang === targetLang || (sourceLang === "auto" && targetLang === "en")) {
    return text
  }

  // Skip translation if target is auto
  if (targetLang === "auto") {
    return text
  }

  const langMap = {
    "en": "en",
    "hi": "hi",
    "es": "es",
    "fr": "fr",
    "de": "de",
    "it": "it",
    "pt": "pt",
    "ru": "ru",
    "ja": "ja",
    "ko": "ko",
    "zh": "zh",
    "ar": "ar"
  }

  const targetCode = langMap[targetLang] || "en"
  const sourceCode = sourceLang === "auto" ? "en" : (langMap[sourceLang] || "en")

  // Try MyMemory Translation API first
  try {
    const myMemoryRes = await axios.get(
      `https://api.mymemory.translated.net/get`,
      {
        params: {
          q: text,
          langpair: `${sourceCode}|${targetCode}`
        },
        timeout: 5000
      }
    )

    if (myMemoryRes.data && myMemoryRes.data.responseData && myMemoryRes.data.responseData.translatedText) {
      const translated = myMemoryRes.data.responseData.translatedText
      if (translated && translated !== text) {
        return translated
      }
    }
  } catch (err) {
    console.log("MyMemory API failed, trying LibreTranslate...", err.message)
  }

  // Fallback to LibreTranslate
  try {
    const libretranslateRes = await axios.post(
      "https://libretranslate.com/translate",
      {
        q: text,
        source: sourceCode,
        target: targetCode,
        format: "text"
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 5000
      }
    )

    if (libretranslateRes.data && libretranslateRes.data.translatedText) {
      return libretranslateRes.data.translatedText
    }
  } catch (err) {
    console.log("LibreTranslate API failed:", err.message)
  }

  // If both fail, return original
  return text
}

// Authentication Routes
app.post("/api/signup", async (req, res) => {
  try {
    const { phoneNumber, username, password } = req.body

    if (!phoneNumber || !username || !password) {
      return res.status(400).json({ error: "All fields are required" })
    }

    // Check if user already exists
    const existingUser = db.users.find(u => u.phoneNumber === phoneNumber || u.username === username)
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = {
      id: Date.now().toString(),
      phoneNumber,
      username,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    }

    db.users.push(user)
    db.contacts[user.id] = []
    db.messages[user.id] = {}
    saveDatabase(db)

    res.json({ 
      success: true, 
      user: { id: user.id, phoneNumber: user.phoneNumber, username: user.username } 
    })
  } catch (error) {
    console.error("Signup error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

app.post("/api/login", async (req, res) => {
  try {
    const { phoneNumber, password } = req.body

    if (!phoneNumber || !password) {
      return res.status(400).json({ error: "Phone number and password are required" })
    }

    const user = db.users.find(u => u.phoneNumber === phoneNumber)
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    res.json({ 
      success: true, 
      user: { id: user.id, phoneNumber: user.phoneNumber, username: user.username } 
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

app.get("/api/user/:phoneNumber", (req, res) => {
  const { phoneNumber } = req.params
  const user = db.users.find(u => u.phoneNumber === phoneNumber)
  if (!user) {
    return res.status(404).json({ error: "User not found" })
  }
  res.json({ id: user.id, phoneNumber: user.phoneNumber, username: user.username })
})

app.post("/api/contacts/:userId", (req, res) => {
  try {
    const { userId } = req.params
    const { phoneNumber } = req.body

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number is required" })
    }

    const contactUser = db.users.find(u => u.phoneNumber === phoneNumber)
    if (!contactUser) {
      return res.status(404).json({ error: "User not found" })
    }

    if (contactUser.id === userId) {
      return res.status(400).json({ error: "Cannot add yourself as contact" })
    }

    if (!db.contacts[userId]) {
      db.contacts[userId] = []
    }

    // Check if already a contact
    if (db.contacts[userId].find(c => c.id === contactUser.id)) {
      return res.status(400).json({ error: "Contact already added" })
    }

    db.contacts[userId].push({
      id: contactUser.id,
      phoneNumber: contactUser.phoneNumber,
      username: contactUser.username
    })

    saveDatabase(db)
    res.json({ success: true, contact: db.contacts[userId][db.contacts[userId].length - 1] })
  } catch (error) {
    console.error("Add contact error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

app.get("/api/contacts/:userId", (req, res) => {
  const { userId } = req.params
  const contacts = db.contacts[userId] || []
  res.json(contacts)
})

app.get("/api/messages/:userId/:chatId", (req, res) => {
  const { userId, chatId } = req.params
  // Check if it's a group chat
  if (chatId.startsWith("group_")) {
    const messages = db.messages[chatId] || []
    res.json(messages)
  } else {
    // One-on-one chat
    const messages = db.messages[userId]?.[chatId] || []
    res.json(messages)
  }
})

app.post("/api/groups", (req, res) => {
  try {
    const { name, userId, memberIds } = req.body

    if (!name || !userId || !memberIds || !Array.isArray(memberIds)) {
      return res.status(400).json({ error: "Invalid group data" })
    }

    const group = {
      id: Date.now().toString(),
      name,
      createdBy: userId,
      members: [userId, ...memberIds],
      createdAt: new Date().toISOString()
    }

    db.groups.push(group)
    if (!db.messages[`group_${group.id}`]) {
      db.messages[`group_${group.id}`] = []
    }
    saveDatabase(db)

    res.json({ success: true, group })
  } catch (error) {
    console.error("Create group error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

app.get("/api/groups/:userId", (req, res) => {
  const { userId } = req.params
  const groups = db.groups.filter(g => g.members.includes(userId))
  res.json(groups)
})

// Socket.IO Connection Handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id)

  socket.on("authenticate", ({ userId, phoneNumber, username, language }) => {
    socket.userId = userId
    socket.phoneNumber = phoneNumber
    socket.username = username
    socket.language = language || "en"
    
    connectedUsers.set(socket.id, { userId, phoneNumber, username, language: socket.language })
    userSockets.set(userId, socket)
    userLanguages.set(userId, socket.language)
    
    console.log(`${username} (${phoneNumber}) authenticated with language: ${socket.language}`)
    socket.emit("authenticated", { success: true })
  })

  socket.on("joinChat", ({ chatId, chatType }) => {
    if (!socket.userId) return
    
    socket.currentChatId = chatId
    socket.currentChatType = chatType // 'user' or 'group'
    
    if (chatType === "group") {
      socket.join(`group_${chatId}`)
    }
    
    console.log(`${socket.username} joined ${chatType} chat: ${chatId}`)
  })

  socket.on("sendMessage", async ({ message, chatId, chatType, sourceLanguage }) => {
    if (!message || !message.trim() || !socket.userId) return

    const senderLanguage = sourceLanguage || "auto"
    const originalMessage = message.trim()
    const messageId = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    const timestamp = new Date().toISOString()

    const messageData = {
      id: messageId,
      from: socket.userId,
      fromUsername: socket.username,
      fromPhoneNumber: socket.phoneNumber,
      message: originalMessage,
      chatId,
      chatType,
      timestamp,
      sourceLanguage: senderLanguage
    }

    if (chatType === "user") {
      // One-on-one chat - store messages for both users
      const senderKey = socket.userId
      const receiverKey = chatId
      
      // Store in sender's messages
      if (!db.messages[senderKey]) {
        db.messages[senderKey] = {}
      }
      if (!db.messages[senderKey][receiverKey]) {
        db.messages[senderKey][receiverKey] = []
      }
      db.messages[senderKey][receiverKey].push(messageData)
      
      // Store in receiver's messages
      if (!db.messages[receiverKey]) {
        db.messages[receiverKey] = {}
      }
      if (!db.messages[receiverKey][senderKey]) {
        db.messages[receiverKey][senderKey] = []
      }
      db.messages[receiverKey][senderKey].push(messageData)
      
      saveDatabase(db)

      // Send to receiver with translation
      const targetSocket = userSockets.get(chatId)
      if (targetSocket) {
        const receiverLanguage = userLanguages.get(chatId) || "en"
        let translatedText = originalMessage
        
        // Translate if needed
        if (receiverLanguage !== senderLanguage && receiverLanguage !== "auto" && senderLanguage !== "auto") {
          try {
            translatedText = await translateText(originalMessage, senderLanguage, receiverLanguage)
          } catch (error) {
            console.error("Translation error:", error)
            translatedText = originalMessage
          }
        } else if (senderLanguage === "auto" && receiverLanguage !== "en") {
          try {
            translatedText = await translateText(originalMessage, "en", receiverLanguage)
          } catch (error) {
            console.error("Translation error:", error)
            translatedText = originalMessage
          }
        }
        
        targetSocket.emit("receiveMessage", {
          ...messageData,
          translatedText: translatedText,
          originalText: originalMessage
        })
      }
      
      // Also send to sender (for their own chat view) - no translation needed
      socket.emit("receiveMessage", {
        ...messageData,
        translatedText: originalMessage,
        originalText: originalMessage
      })
    } else if (chatType === "group") {
      // Group chat
      const chatKey = `group_${chatId}`
      if (!db.messages[chatKey]) {
        db.messages[chatKey] = []
      }
      db.messages[chatKey].push(messageData)
      saveDatabase(db)

      const group = db.groups.find(g => g.id === chatId)
      if (group) {
        // Send to all group members with translation
        const translationPromises = group.members.map(async (memberId) => {
          const memberSocket = userSockets.get(memberId)
          if (memberSocket) {
            const memberLanguage = userLanguages.get(memberId) || "en"
            let translatedText = originalMessage
            
            // Translate if needed
            if (memberLanguage !== senderLanguage && memberLanguage !== "auto" && senderLanguage !== "auto") {
              try {
                translatedText = await translateText(originalMessage, senderLanguage, memberLanguage)
              } catch (error) {
                console.error("Translation error:", error)
                translatedText = originalMessage
              }
            } else if (senderLanguage === "auto" && memberLanguage !== "en") {
              try {
                translatedText = await translateText(originalMessage, "en", memberLanguage)
              } catch (error) {
                console.error("Translation error:", error)
                translatedText = originalMessage
              }
            }
            
            memberSocket.emit("receiveMessage", {
              ...messageData,
              translatedText: translatedText,
              originalText: originalMessage
            })
          }
        })
        await Promise.all(translationPromises)
      }
    }
  })

  socket.on("disconnect", () => {
    const user = connectedUsers.get(socket.id)
    if (user) {
      console.log(`${user.username} disconnected`)
      userSockets.delete(user.userId)
      connectedUsers.delete(socket.id)
    }
  })
})

const PORT = process.env.PORT || 5000
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on http://localhost:${PORT}`)
  console.log(`Server is accessible on your network.`)
})
