import { useEffect, useState, useRef } from "react"
import io from "socket.io-client"
import "./App.css"

const languages = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "ar", name: "Arabic" },
]

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [showLogin, setShowLogin] = useState(true)
  
  // Login/Signup states
  const [loginPhone, setLoginPhone] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [signupPhone, setSignupPhone] = useState("")
  const [signupUsername, setSignupUsername] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  
  // Chat states
  const [contacts, setContacts] = useState([])
  const [groups, setGroups] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [chatType, setChatType] = useState(null) // 'user' or 'group'
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState("")
  const [language, setLanguage] = useState("en")
  const [sourceLanguage, setSourceLanguage] = useState("auto")
  
  // UI states
  const [showSettings, setShowSettings] = useState(false)
  const [showAddContact, setShowAddContact] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [newContactPhone, setNewContactPhone] = useState("")
  const [groupName, setGroupName] = useState("")
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  
  const messagesEndRef = useRef(null)
  const socketRef = useRef(null)

  useEffect(() => {
    const savedUser = localStorage.getItem("chatUser")
    if (savedUser) {
      const userData = JSON.parse(savedUser)
      setUser(userData)
      setIsAuthenticated(true)
      initializeSocket(userData)
      loadContacts(userData.id)
      loadGroups(userData.id)
    }
  }, [])

  // Update language preference when it changes
  useEffect(() => {
    if (isAuthenticated && socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("authenticate", {
        userId: user.id,
        phoneNumber: user.phoneNumber,
        username: user.username,
        language: language
      })
    }
  }, [language, isAuthenticated, user])

  const initializeSocket = (userData) => {
    socketRef.current = io(API_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    })

    const socket = socketRef.current

    socket.on("connect", () => {
      console.log("Connected to server")
      setIsConnected(true)
      socket.emit("authenticate", {
        userId: userData.id,
        phoneNumber: userData.phoneNumber,
        username: userData.username,
        language: language
      })
    })

    socket.on("authenticated", () => {
      console.log("Authenticated with server")
    })

    socket.on("receiveMessage", (data) => {
      setMessages((prev) => [...prev, data])
    })

    socket.on("connect_error", (error) => {
      console.error("Connection error:", error)
      setIsConnected(false)
    })

    socket.on("disconnect", () => {
      setIsConnected(false)
    })
  }

  const loadContacts = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/api/contacts/${userId}`)
      const data = await response.json()
      setContacts(data)
    } catch (error) {
      console.error("Error loading contacts:", error)
    }
  }

  const loadGroups = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/api/groups/${userId}`)
      const data = await response.json()
      setGroups(data)
    } catch (error) {
      console.error("Error loading groups:", error)
    }
  }

  const loadMessages = async (chatId, type) => {
    try {
      let messageKey = chatId
      if (type === "group") {
        messageKey = `group_${chatId}`
      }
      const response = await fetch(`${API_URL}/api/messages/${user.id}/${messageKey}`)
      const data = await response.json()
      setMessages(data)
    } catch (error) {
      console.error("Error loading messages:", error)
      setMessages([])
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch(`${API_URL}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: signupPhone,
          username: signupUsername,
          password: signupPassword
        })
      })
      const data = await response.json()
      if (data.success) {
        alert("Account created! Please login.")
        setShowLogin(true)
        setSignupPhone("")
        setSignupUsername("")
        setSignupPassword("")
      } else {
        alert(data.error || "Signup failed")
      }
    } catch (error) {
      console.error("Signup error:", error)
      alert("Signup failed. Please try again.")
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: loginPhone,
          password: loginPassword
        })
      })
      const data = await response.json()
      if (data.success) {
        setUser(data.user)
        setIsAuthenticated(true)
        localStorage.setItem("chatUser", JSON.stringify(data.user))
        initializeSocket(data.user)
        loadContacts(data.user.id)
        loadGroups(data.user.id)
        setLoginPhone("")
        setLoginPassword("")
      } else {
        alert(data.error || "Login failed")
      }
    } catch (error) {
      console.error("Login error:", error)
      alert("Login failed. Please try again.")
    }
  }

  const handleLogout = () => {
    if (socketRef.current) {
      socketRef.current.disconnect()
    }
    localStorage.removeItem("chatUser")
    setUser(null)
    setIsAuthenticated(false)
    setSelectedChat(null)
    setMessages([])
    setContacts([])
    setGroups([])
  }

  const handleAddContact = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch(`${API_URL}/api/contacts/${user.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: newContactPhone })
      })
      const data = await response.json()
      if (data.success) {
        setContacts([...contacts, data.contact])
        setNewContactPhone("")
        setShowAddContact(false)
      } else {
        alert(data.error || "Failed to add contact")
      }
    } catch (error) {
      console.error("Add contact error:", error)
      alert("Failed to add contact")
    }
  }

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    if (selectedGroupMembers.length === 0) {
      alert("Please select at least one member")
      return
    }
    try {
      const response = await fetch(`${API_URL}/api/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName,
          userId: user.id,
          memberIds: selectedGroupMembers
        })
      })
      const data = await response.json()
      if (data.success) {
        setGroups([...groups, data.group])
        setGroupName("")
        setSelectedGroupMembers([])
        setShowCreateGroup(false)
      } else {
        alert(data.error || "Failed to create group")
      }
    } catch (error) {
      console.error("Create group error:", error)
      alert("Failed to create group")
    }
  }

  const selectChat = (chatId, type) => {
    setSelectedChat(chatId)
    setChatType(type)
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("joinChat", { chatId, chatType: type })
    }
    loadMessages(chatId, type)
  }

  const sendMessage = () => {
    if (!message.trim() || !selectedChat || !socketRef.current) return
    
    socketRef.current.emit("sendMessage", {
      message: message.trim(),
      chatId: selectedChat,
      chatType: chatType,
      sourceLanguage
    })
    
    setMessage("")
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Login/Signup Screen
  if (!isAuthenticated) {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <h1>💬 WhatsApp Chat</h1>
          {showLogin ? (
            <form onSubmit={handleLogin} className="auth-form">
              <h2>Login</h2>
              <input
                type="tel"
                placeholder="Phone Number"
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
              <button type="submit">Login</button>
              <p className="auth-switch">
                Don't have an account?{" "}
                <span onClick={() => setShowLogin(false)}>Sign Up</span>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="auth-form">
              <h2>Sign Up</h2>
              <input
                type="tel"
                placeholder="Phone Number"
                value={signupPhone}
                onChange={(e) => setSignupPhone(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Username"
                value={signupUsername}
                onChange={(e) => setSignupUsername(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                required
              />
              <button type="submit">Sign Up</button>
              <p className="auth-switch">
                Already have an account?{" "}
                <span onClick={() => setShowLogin(true)}>Login</span>
              </p>
            </form>
          )}
        </div>
      </div>
    )
  }

  // Main Chat Interface
  return (
    <div className="whatsapp-container">
      {/* Sidebar Settings */}
      <div className={`settings-sidebar ${showSettings ? "open" : ""}`}>
        <div className="sidebar-header">
          <h3>Settings</h3>
          <button className="close-sidebar" onClick={() => setShowSettings(false)}>✕</button>
        </div>
        <div className="sidebar-content">
          <div className="user-profile">
            <div className="profile-avatar-large">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <h4>{user?.username}</h4>
            <p>{user?.phoneNumber}</p>
          </div>
          <div className="setting-section">
            <label>Receive messages in:</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
          <div className="setting-section">
            <label>Send messages in:</label>
            <select value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value)}>
              <option value="auto">Auto-detect</option>
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
          <div className="setting-section">
            <span className={`status-indicator ${isConnected ? "online" : "offline"}`}></span>
            {isConnected ? "Connected" : "Disconnected"}
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
      {showSettings && <div className="sidebar-overlay" onClick={() => setShowSettings(false)}></div>}

      {/* Contacts Sidebar */}
      <div className="contacts-sidebar">
        <div className="contacts-header">
          <div className="header-profile">
            <div className="profile-avatar">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="header-info">
              <div className="header-title">{user?.username}</div>
              <div className="header-subtitle">
                <span className={`status-dot ${isConnected ? "online" : "offline"}`}></span>
                {isConnected ? "Online" : "Offline"}
              </div>
            </div>
          </div>
          <button className="settings-btn" onClick={() => setShowSettings(true)} title="Settings">
            ⚙️
          </button>
        </div>
        
        <div className="contacts-actions">
          <button className="add-contact-btn" onClick={() => setShowAddContact(true)}>
            + Add Contact
          </button>
          <button className="create-group-btn" onClick={() => setShowCreateGroup(true)}>
            + Create Group
          </button>
        </div>

        <div className="contacts-list">
          {groups.map((group) => (
            <div
              key={group.id}
              className={`contact-item ${selectedChat === group.id && chatType === "group" ? "active" : ""}`}
              onClick={() => selectChat(group.id, "group")}
            >
              <div className="contact-avatar group-avatar">👥</div>
              <div className="contact-info">
                <div className="contact-name">{group.name}</div>
                <div className="contact-status">Group • {group.members.length} members</div>
              </div>
            </div>
          ))}
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className={`contact-item ${selectedChat === contact.id && chatType === "user" ? "active" : ""}`}
              onClick={() => selectChat(contact.id, "user")}
            >
              <div className="contact-avatar">
                {contact.username.charAt(0).toUpperCase()}
              </div>
              <div className="contact-info">
                <div className="contact-name">{contact.username}</div>
                <div className="contact-status">{contact.phoneNumber}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="chat-area">
        {!selectedChat ? (
          <div className="empty-chat">
            <div className="empty-icon">💬</div>
            <p>Select a contact or group to start chatting</p>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <div className="chat-header-info">
                <div className="chat-avatar">
                  {chatType === "group" 
                    ? "👥"
                    : contacts.find(c => c.id === selectedChat)?.username?.charAt(0).toUpperCase() || "?"
                  }
                </div>
                <div>
                  <div className="chat-name">
                    {chatType === "group"
                      ? groups.find(g => g.id === selectedChat)?.name
                      : contacts.find(c => c.id === selectedChat)?.username
                    }
                  </div>
                  <div className="chat-status">
                    {chatType === "group"
                      ? `Group • ${groups.find(g => g.id === selectedChat)?.members.length || 0} members`
                      : contacts.find(c => c.id === selectedChat)?.phoneNumber
                    }
                  </div>
                </div>
              </div>
            </div>

            <div className="messages-area">
              {messages.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">💬</div>
                  <p>No messages yet</p>
                  <p className="empty-hint">Start the conversation!</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMyMessage = m.from === user.id
                  return (
                    <div key={m.id} className={`message-wrapper ${isMyMessage ? "sent" : "received"}`}>
                      <div className="message-bubble">
                        {!isMyMessage && chatType === "group" && (
                          <div className="message-sender">{m.fromUsername}</div>
                        )}
                        <div className="message-text">{m.translatedText || m.message}</div>
                        {!isMyMessage && m.originalText && m.originalText !== m.translatedText && (
                          <div className="original-text-hint">
                            <small>Original: {m.originalText}</small>
                          </div>
                        )}
                        <div className="message-time">
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="input-area">
              <div className="input-wrapper">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message"
                  disabled={!isConnected}
                  className="message-input"
                />
                <button
                  onClick={sendMessage}
                  disabled={!isConnected || !message.trim()}
                  className="send-button"
                  title="Send message"
                >
                  ➤
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="modal-overlay" onClick={() => setShowAddContact(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Contact</h3>
            <form onSubmit={handleAddContact}>
              <input
                type="tel"
                placeholder="Phone Number"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
                required
              />
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddContact(false)}>Cancel</button>
                <button type="submit">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="modal-overlay" onClick={() => setShowCreateGroup(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create Group</h3>
            <form onSubmit={handleCreateGroup}>
              <input
                type="text"
                placeholder="Group Name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
              />
              <div className="group-members-selection">
                <label>Select Members:</label>
                {contacts.map((contact) => (
                  <label key={contact.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedGroupMembers.includes(contact.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedGroupMembers([...selectedGroupMembers, contact.id])
                        } else {
                          setSelectedGroupMembers(selectedGroupMembers.filter(id => id !== contact.id))
                        }
                      }}
                    />
                    {contact.username} ({contact.phoneNumber})
                  </label>
                ))}
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateGroup(false)}>Cancel</button>
                <button type="submit">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
