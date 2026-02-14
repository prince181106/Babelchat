import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import axios from "axios";
import "./App.css";
import Landing from "./Landing";

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
];

// Helper: Speak text (TTS)
const speakText = (text, lang = "en") => {
  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    speechSynthesis.speak(utterance);
  } else {
    alert("Text-to-Speech not supported in this browser.");
  }
};

const API_URL = import.meta.env.DEV
  ? "http://localhost:5000"
  : (import.meta.env.VITE_API_URL || "http://localhost:5000");

// Navigation Rail Component
const RailIcon = ({ name }) => {
  switch (name) {
    case 'chats':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 6.5C5 5.12 6.12 4 7.5 4h9C17.88 4 19 5.12 19 6.5v6A2.5 2.5 0 0 1 16.5 15H10l-4.2 3.5c-.33.27-.8.03-.8-.4V15.5A2.5 2.5 0 0 1 3 13v-6A2.5 2.5 0 0 1 5.5 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'calls-audio':
    case 'calls':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7.7 4.8c.3-.5 1-.7 1.6-.5l2 1a1.2 1.2 0 0 1 .6 1.5l-.8 2a1.2 1.2 0 0 1-1.4.7l-1-.2a13 13 0 0 0 6 6l.2-1a1.2 1.2 0 0 1 .7-1.4l2-.8a1.2 1.2 0 0 1 1.5.6l1 2c.2.6 0 1.3-.5 1.6l-1.4.9a2.6 2.6 0 0 1-2.5.1A17.5 17.5 0 0 1 6 7.8a2.6 2.6 0 0 1 .1-2.5l1-1.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'calls-video':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.5" y="6.5" width="12" height="11" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M15.5 10.2l4.4-2.5c.5-.3 1.1.1 1.1.7v7.2c0 .6-.6 1-1.1.7l-4.4-2.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'status':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 8v4l3 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'communities':
    case 'groups':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="9" cy="9" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="16.5" cy="10" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4.8 18.2c0-2.2 2.1-4 4.7-4s4.7 1.8 4.7 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M14.4 18.2c.2-1.5 1.5-2.7 3.1-2.7 1.7 0 3.1 1.3 3.1 2.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="2.1" />
          <path
            d="M19.6 15a1 1 0 0 0 .2 1.1l.1.1a1.2 1.2 0 0 1 0 1.7l-1 1a1.2 1.2 0 0 1-1.7 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1.2 1.2 0 0 1-1.2 1.2h-1.4A1.2 1.2 0 0 1 11.6 20v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.2 1.2 0 0 1-1.7 0l-1-1a1.2 1.2 0 0 1 0-1.7l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H6A1.2 1.2 0 0 1 4.8 13v-1.4A1.2 1.2 0 0 1 6 10.4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1.2 1.2 0 0 1 0-1.7l1-1a1.2 1.2 0 0 1 1.7 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4A1.2 1.2 0 0 1 12.4 2.8h1.4A1.2 1.2 0 0 1 15 4v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1.2 1.2 0 0 1 1.7 0l1 1a1.2 1.2 0 0 1 0 1.7l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2A1.2 1.2 0 0 1 21.2 11.6V13a1.2 1.2 0 0 1-1.2 1.2h-.2a1 1 0 0 0-.9.8Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return null;
  }
};

const NavigationRail = ({ activeSection, onSectionChange, user, onSettingsClick, onProfileClick }) => {
  const [showTooltip, setShowTooltip] = useState(null);

  const sections = [
    { id: 'chats', icon: 'chats', label: 'Chats' },
    { id: 'status', icon: 'status', label: 'Status' },
    { id: 'calls', icon: 'calls', label: 'Calls' },
    { id: 'communities', icon: 'communities', label: 'Communities' },
  ];

  return (
    <div className="nav-rail">
      <div className="nav-rail-top">
        <div className="nav-rail-logo" title="BabelChat" aria-hidden="true">
          <svg viewBox="0 0 64 64" role="img">
            <path
              fill="currentColor"
              d="M32 6c13.255 0 24 8.954 24 20s-10.745 20-24 20h-5.645L14 56v-10.88C8.919 41.44 6 34.104 6 26 6 14.954 16.745 6 30 6h2z"
            />
            <path fill="#d7f4fb" d="M18 30a2 2 0 0 1 2-2h24a2 2 0 0 1 0 4h-24a2 2 0 0 1-2-2z" />
            <path fill="#d7f4fb" d="M23 38a2 2 0 0 1 2-2h14a2 2 0 0 1 0 4h-14a2 2 0 0 1-2-2z" />
            <path fill="#b5e8f5" d="M23 36h3v4h-3zm7 0h4v4h-4zm8 0h3v4h-3z" />
          </svg>
        </div>

        <nav className="nav-rail-icons">
          {sections.map((section) => (
            <div
              key={section.id}
              className="nav-rail-item-wrapper"
              onMouseEnter={() => setShowTooltip(section.id)}
              onMouseLeave={() => setShowTooltip(null)}
            >
              <button
                className={`nav-rail-btn ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => onSectionChange(section.id)}
                title={section.label}
                aria-label={section.label}
              >
                <span className="nav-rail-icon"><RailIcon name={section.icon} /></span>
              </button>
              {showTooltip === section.id && (
                <div className="nav-rail-tooltip">{section.label}</div>
              )}
            </div>
          ))}
        </nav>
      </div>

      <div className="nav-rail-bottom">
        <div
          className="nav-rail-item-wrapper"
          onMouseEnter={() => setShowTooltip('settings')}
          onMouseLeave={() => setShowTooltip(null)}
        >
          <button
            className="nav-rail-btn"
            onClick={onSettingsClick}
            title="Settings"
            aria-label="Settings"
          >
            <span className="nav-rail-icon"><RailIcon name="settings" /></span>
          </button>
          {showTooltip === 'settings' && (
            <div className="nav-rail-tooltip">Settings</div>
          )}
        </div>

        <div
          className="nav-rail-item-wrapper"
          onMouseEnter={() => setShowTooltip('profile')}
          onMouseLeave={() => setShowTooltip(null)}
        >
          <button
            className={`nav-rail-btn profile-btn ${activeSection === "profile" ? "active" : ""}`}
            onClick={onProfileClick}
            title="Profile"
            aria-label="Profile"
          >
            <span className="nav-rail-avatar">
              {user?.avatarUrl ? (
                <img src={`${API_URL}${user.avatarUrl}`} alt="Profile" className="nav-rail-avatar-img" />
              ) : (
                user?.username?.charAt(0).toUpperCase() || "?"
              )}
            </span>
          </button>
          {showTooltip === 'profile' && (
            <div className="nav-rail-tooltip">Profile</div>
          )}
        </div>
      </div>
    </div>
  );
};

// Homepage Component
const Homepage = ({ onLoginClick }) => (
  <div className="homepage">
    <div className="homepage-hero">
      <div className="hero-content">
        <h1>BabelChat</h1>
        <p>Break language barriers with real-time translation. Connect globally, chat seamlessly.</p>
        <button className="cta-btn" onClick={onLoginClick}>
          Start Translating Now
        </button>
      </div>
      <div className="hero-features">
        <div className="feature-card">
          <span className="feature-icon">Loop</span>
          <h3>Real-Time Translation</h3>
          <p>Instantly translate messages in 12+ languages.</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">Speak</span>
          <h3>Text-to-Speech</h3>
          <p>Hear translations aloud for better understanding.</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">Shield</span>
          <h3>Safe & Private</h3>
          <p>Open-source, ad-free, and secure.</p>
        </div>
      </div>
      <div className="testimonials">
        <p>"BabelChat made my international team meetings effortless!" - Alex, Developer</p>
      </div>
    </div>
  </div>
);

function App() {
  const [currentView, setCurrentView] = useState("homepage");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);

  // Login/Signup states
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  // Chat states
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatType, setChatType] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [language, setLanguage] = useState("en");
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [showOriginal, setShowOriginal] = useState(true);

  // Navigation Rail state
  const [activeTab, setActiveTab] = useState("chats");
  const [activeNavSection, setActiveNavSection] = useState("chats");

  // Sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(320); // Default 320px
  const [searchChat, setSearchChat] = useState("");
  const [chatFilter, setChatFilter] = useState("all");
  const [isDraggingResize, setIsDraggingResize] = useState(false);

  // UI states
  const [showSettings, setShowSettings] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileForm, setProfileForm] = useState({ username: "", phoneNumber: "" });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [dialogStage, setDialogStage] = useState("selection"); // selection | add_contact | add_group
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [callStatus, setCallStatus] = useState(null); // null | 'connecting'
  const [statusItems, setStatusItems] = useState([]);
  const [viewedStatusIds, setViewedStatusIds] = useState([]);
  const [statusPlayer, setStatusPlayer] = useState({
    open: false,
    ownerId: null,
    ownerName: "",
    items: [],
    index: 0,
    progress: 0,
  });

  // Call modal state
  const [callType, setCallType] = useState(null); // null | 'incoming' | 'outgoing' | 'active'
  const [callerInfo, setCallerInfo] = useState(null); // { id, username, phoneNumber, avatar }
  const [callMediaType, setCallMediaType] = useState("voice"); // voice | video
  const [callStartTime, setCallStartTime] = useState(null);
  const [callDuration, setCallDuration] = useState(0); // in seconds
  const [callHistory, setCallHistory] = useState([]);

  // Drag state
  const [position, setPosition] = useState({ x: null, y: null });
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, initialLeft: 0, initialTop: 0 });

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");
  const audioSendLockRef = useRef(false);
  const statusInputRef = useRef(null);
  const emojiContainerRef = useRef(null);
  const messageInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setProfileForm({
        username: user.username || "",
        phoneNumber: user.phoneNumber || "",
      });
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated || currentView !== "chat") {
      setShowSettings(false);
    }
  }, [isAuthenticated, currentView]);

  const handleDragStart = (e) => {
    // Only allow left click
    if (e.button !== 0) return;

    // Check if clicking the drag handle
    const handle = e.target.closest('.call-drag-handle');
    if (!handle) return;

    const modal = e.target.closest('.call-modal');
    if (!modal) return;

    const rect = modal.getBoundingClientRect();

    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialLeft: rect.left,
      initialTop: rect.top,
    };

    // Prevent default to avoid text selection etc
    e.preventDefault();
  };

  const handleDrag = (e) => {
    if (!dragRef.current.isDragging) return;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    setPosition({
      x: dragRef.current.initialLeft + dx,
      y: dragRef.current.initialTop + dy,
    });
  };

  const handleDragEnd = () => {
    dragRef.current.isDragging = false;
  };

  // Add global event listeners for drag
  useEffect(() => {
    if (callType) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [callType]);

  // Sidebar resize handler
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingResize) return;
      const newWidth = Math.max(240, Math.min(450, e.clientX - 70)); // Min 240px, Max 450px
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDraggingResize(false);
    };

    if (isDraggingResize) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingResize]);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const callTimerRef = useRef(null);
  const connectionRef = useRef(null);
  const localStreamRef = useRef(null);

  // Timer for active calls
  useEffect(() => {
    if (callType === 'active' && callStartTime) {
      callTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
        setCallDuration(elapsed);
      }, 1000);
      return () => {
        if (callTimerRef.current) {
          clearInterval(callTimerRef.current);
        }
      };
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      setCallDuration(0);
    }
  }, [callType, callStartTime]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiContainerRef.current && !emojiContainerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showEmojiPicker]);

  // Cleanup recognition and timers on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
        recognitionRef.current = null;
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const STATUS_TTL_MS = 24 * 60 * 60 * 1000;
  const STATUS_IMAGE_DURATION_MS = 5000;
  const STATUS_VIDEO_DURATION_MS = 8000;

  // Expire status updates older than 24 hours.
  useEffect(() => {
    const pruneExpired = () => {
      const cutoff = Date.now() - STATUS_TTL_MS;
      setStatusItems((prev) => prev.filter((item) => item.createdAt >= cutoff));
    };
    pruneExpired();
    const timer = setInterval(pruneExpired, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-advance status player and close at 100% of last item.
  useEffect(() => {
    if (!statusPlayer.open || statusPlayer.items.length === 0) return;

    const current = statusPlayer.items[statusPlayer.index];
    const duration = current?.mediaType?.startsWith("video/") ? STATUS_VIDEO_DURATION_MS : STATUS_IMAGE_DURATION_MS;
    const tick = 100;
    const step = (tick / duration) * 100;

    const timer = setInterval(() => {
      setStatusPlayer((prev) => {
        if (!prev.open) return prev;
        const nextProgress = prev.progress + step;
        if (nextProgress < 100) return { ...prev, progress: nextProgress };

        const nextIndex = prev.index + 1;
        if (nextIndex >= prev.items.length) {
          return { open: false, ownerId: null, ownerName: "", items: [], index: 0, progress: 0 };
        }

        const nextItem = prev.items[nextIndex];
        setViewedStatusIds((old) => (old.includes(nextItem.id) ? old : [...old, nextItem.id]));
        return { ...prev, index: nextIndex, progress: 0 };
      });
    }, tick);

    return () => clearInterval(timer);
  }, [statusPlayer.open, statusPlayer.index, statusPlayer.items]);

  const handleNavSectionChange = (sectionId) => {
    setActiveTab(sectionId);
    setActiveNavSection(sectionId);
    if (sectionId !== "chats") {
      setSelectedChat(null);
      setChatType(null);
    }
  };

  const handleAddStatusClick = () => {
    statusInputRef.current?.click();
  };

  const handleStatusFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !user) return;
    const uploadStatuses = async () => {
      try {
        const uploads = await Promise.all(
          files.map(async (file) => {
            const formData = new FormData();
            formData.append("statusMedia", file);
            const response = await fetch(`${API_URL}/api/status/${user.id}`, {
              method: "POST",
              body: formData,
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
              throw new Error(data.error || "Failed to upload status");
            }
            return data.status;
          })
        );

        if (uploads.length > 0) {
          setStatusItems((prev) => {
            const prevWithoutNew = prev.filter((item) => !uploads.some((u) => u.id === item.id));
            return [...uploads, ...prevWithoutNew];
          });
        }
      } catch (error) {
        console.error("Status upload error:", error);
        alert("Failed to upload status");
      } finally {
        e.target.value = "";
      }
    };

    uploadStatuses();
  };

  const handleDeleteStatus = async (statusId) => {
    try {
      const response = await fetch(`${API_URL}/api/status/${user.id}/${statusId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to delete status");
      }

      setStatusItems((prev) => prev.filter((s) => s.id !== statusId));
      setViewedStatusIds((prev) => prev.filter((id) => id !== statusId));
      setStatusPlayer((prev) => {
        if (!prev.open) return prev;
        if (!prev.items.some((s) => s.id === statusId)) return prev;
        return { open: false, ownerId: null, ownerName: "", items: [], index: 0, progress: 0 };
      });
    } catch (error) {
      console.error("Delete status error:", error);
      alert("Failed to delete status");
    }
  };

  const openStatusPlayer = (ownerId) => {
    const items = statusItems
      .filter((s) => s.ownerId === ownerId)
      .sort((a, b) => a.createdAt - b.createdAt);
    if (items.length === 0) return;

    setViewedStatusIds((old) => (old.includes(items[0].id) ? old : [...old, items[0].id]));
    setStatusPlayer({
      open: true,
      ownerId,
      ownerName: items[0].ownerName,
      items,
      index: 0,
      progress: 0,
    });
  };

  const closeStatusPlayer = () => {
    setStatusPlayer({ open: false, ownerId: null, ownerName: "", items: [], index: 0, progress: 0 });
  };

  const resolveStatusMediaUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:")) return url;
    return `${API_URL}${url}`;
  };

  const formatCallTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getCallHistoryStorageKey = (userId) => `babelchat_call_history_${userId}`;

  const logCallHistory = ({ username, phoneNumber, direction, status, mediaType, durationSec = 0 }) => {
    setCallHistory((prev) => [
      {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        username: username || "Unknown",
        phoneNumber: phoneNumber || "",
        direction,
        status,
        mediaType: mediaType === "video" ? "Video" : "Voice",
        durationSec,
        timestamp: Date.now(),
      },
      ...prev,
    ]);
  };

  const handleDeleteCallLog = (logId) => {
    setCallHistory((prev) => prev.filter((item) => item.id !== logId));
  };

  useEffect(() => {
    if (!user?.id) {
      setCallHistory([]);
      return;
    }
    try {
      const saved = localStorage.getItem(getCallHistoryStorageKey(user.id));
      if (!saved) {
        setCallHistory([]);
        return;
      }
      const parsed = JSON.parse(saved);
      setCallHistory(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.error("Failed to load call history:", error);
      setCallHistory([]);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    try {
      localStorage.setItem(
        getCallHistoryStorageKey(user.id),
        JSON.stringify(callHistory.slice(0, 200))
      );
    } catch (error) {
      console.error("Failed to save call history:", error);
    }
  }, [callHistory, user?.id]);

  // --- WebRTC Functions ---

  const startCall = (type) => {
    if (!selectedChat || chatType === "group" || !socketRef.current) return;
    const contact = contacts.find((c) => c.id === selectedChat);
    if (!contact) return;

    setCallStatus("connecting");
    setCallMediaType(type === "video" ? "video" : "voice");
    setCallerInfo({
      id: contact.id,
      username: contact.username,
      phoneNumber: contact.phoneNumber,
      avatar: contact.username.charAt(0).toUpperCase(),
    });
    setCallType("outgoing");
    logCallHistory({
      username: contact.username,
      phoneNumber: contact.phoneNumber,
      direction: "Outgoing",
      status: "Dialing",
      mediaType: type,
    });

    navigator.mediaDevices.getUserMedia({ video: type === 'video', audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
        if (type === "video" && localVideoRef.current) localVideoRef.current.srcObject = stream;

        const peer = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:global.stun.twilio.com:3478" }
          ]
        });

        peer.onicecandidate = (event) => {
          if (event.candidate) {
            socketRef.current.emit("ice-candidate", {
              to: String(contact.id),
              candidate: event.candidate,
            });
          }
        };

        peer.ontrack = (event) => {
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = event.streams[0];
            remoteAudioRef.current.play().catch(e => console.error("Error playing remote audio stream:", e));
          }
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
            remoteVideoRef.current.play().catch(e => console.error("Error playing remote stream:", e));
          }
        };

        stream.getTracks().forEach((track) => peer.addTrack(track, stream));

        peer.createOffer().then((offer) => {
          peer.setLocalDescription(offer);
          socketRef.current.emit("callUser", {
            to: String(contact.id),
            from: String(user.id),
            type,
            signal: offer,
          });
        });

        connectionRef.current = peer;
      })
      .catch((err) => {
        console.error("Error accessing media devices:", err);
        alert("Could not access microphone/camera. Please check permissions.");
        setCallStatus(null);
        setCallType(null);
      });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!selectedChat || !chatType) {
      alert("Select a chat first");
      e.target.value = "";
      return;
    }
    if (!socketRef.current || !isConnected) {
      alert("Not connected. Please wait and try again.");
      e.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    formData.append("sourceLanguage", sourceLanguage); // Pass selected source language for OCR

    setIsTranslating(true); // Reuse translating state for loading UI
    try {
      const res = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { imageUrl, extractedText } = res.data;

      // Send via socket
      socketRef.current.emit("sendMessage", {
        message: extractedText || "", // Send OCR text as message content
        chatId: selectedChat,
        chatType,
        sourceLanguage,
        targetLanguage: language,
        imageUrl,
        type: 'image'
      });

    } catch (error) {
      console.error("Image upload failed:", error);
      alert(`Failed to upload image: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsTranslating(false);
      e.target.value = "";
    }
  };

  const handleVoiceCall = () => startCall("voice");
  const handleVideoCall = () => startCall("video");

  const handleAcceptCall = () => {
    setCallStatus("connecting");
    const type = callerInfo?.callMediaType || callMediaType || "voice";
    setCallMediaType(type);
    logCallHistory({
      username: callerInfo?.username || "Unknown",
      phoneNumber: callerInfo?.phoneNumber || "",
      direction: "Incoming",
      status: "Accepted",
      mediaType: type,
    });
    navigator.mediaDevices.getUserMedia({ video: type === "video", audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
        if (type === "video" && localVideoRef.current) localVideoRef.current.srcObject = stream;

        const peer = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:global.stun.twilio.com:3478" }
          ]
        });

        peer.onicecandidate = (event) => {
          if (event.candidate) {
            socketRef.current.emit("ice-candidate", {
              to: String(callerInfo.id),
              candidate: event.candidate,
            });
          }
        };

        peer.ontrack = (event) => {
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = event.streams[0];
            remoteAudioRef.current.play().catch(e => console.error("Error playing remote audio stream:", e));
          }
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
            remoteVideoRef.current.play().catch(e => console.error("Error playing remote stream:", e));
          }
        };

        stream.getTracks().forEach((track) => peer.addTrack(track, stream));

        // We need the signal from the incoming call event to set remote desc
        // But we didn't save it in state. We should have. 
        // Let's assume we saved it in callerInfo or a separate ref.
        // MODIFYING this block to assume we stored it.
        if (callerInfo && callerInfo.signal) {
          peer.setRemoteDescription(new RTCSessionDescription(callerInfo.signal));

          peer.createAnswer().then((answer) => {
            peer.setLocalDescription(answer);
            socketRef.current.emit("answerCall", {
              to: String(callerInfo.id),
              from: String(user.id),
              signal: answer
            });
          });
        }

        connectionRef.current = peer;
        setCallType("active");
        setCallStatus(null);
        setCallStartTime(Date.now());
      })
      .catch((err) => {
        console.error("Error answering call:", err);
        alert("Error accessing media devices.");
        handleEndCall();
      });
  };

  const handleDeclineCall = () => {
    if (socketRef.current && callerInfo) {
      socketRef.current.emit("declineCall", {
        to: callerInfo.id,
        from: user.id,
      });
    }
    setCallType(null);
    setCallerInfo(null);
    setCallStatus(null);
    setCallMediaType("voice");
    logCallHistory({
      username: callerInfo?.username || "Unknown",
      phoneNumber: callerInfo?.phoneNumber || "",
      direction: "Incoming",
      status: "Declined",
      mediaType: callMediaType,
    });
  };

  const handleEndCall = () => {
    const endedUser = callerInfo?.username || "Unknown";
    const endedPhone = callerInfo?.phoneNumber || "";
    const endedType = callMediaType;
    const endedDuration = callDuration;
    // Stop tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close peer connection
    if (connectionRef.current) {
      connectionRef.current.close();
      connectionRef.current = null;
    }

    // Notify other user
    // (Existing setup doesn't explicitly have an "endCall" event, but disconnect or decline serves similar purpose relative to UI)
    // We can emit 'declineCall' as a way to say "hang up" if we are in active call
    if (socketRef.current && callerInfo) {
      // Ideally we'd have a 'endCall' event, but let's re-use decline/end logic
      socketRef.current.emit("declineCall", { to: String(callerInfo.id), from: String(user.id) });
    }

    setCallType(null);
    setCallerInfo(null);
    setCallStatus(null);
    setCallMediaType("voice");
    setCallStartTime(null);
    setCallDuration(0);
    logCallHistory({
      username: endedUser,
      phoneNumber: endedPhone,
      direction: "Outgoing",
      status: "Ended",
      mediaType: endedType,
      durationSec: endedDuration,
    });
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("chatUser");
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      setIsAuthenticated(true);
      setShowSettings(false);
      setCurrentView("chat");
      initializeSocket(userData);
      loadContacts(userData.id);
      loadGroups(userData.id);
      loadStatuses(userData.id);
    }
  }, []);

  // Update preferences when language changes
  // Update preferences when language changes
  useEffect(() => {
    if (isAuthenticated && user) {
      // 1. Tell the backend to save this language to the database (database.json)
      fetch(`${API_URL}/api/user/update-language`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, language: language }),
      }).catch(err => console.error("Failed to save language pref:", err));

      // 2. Update the current active socket session
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("authenticate", {
          userId: user.id,
          phoneNumber: user.phoneNumber,
          username: user.username,
          language,
        });
      }

      // 3. Refresh the current chat history so it translates to the NEW language immediately
      if (selectedChat) {
        loadMessages(selectedChat, chatType);
      }
    }
  }, [language, isAuthenticated]);

  const initializeSocket = (userData) => {
    socketRef.current = io(API_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);
      socket.emit("authenticate", {
        userId: userData.id,
        phoneNumber: userData.phoneNumber,
        username: userData.username,
        language,
      });
    });

    socket.on("authenticated", () => {
      console.log("Authenticated with server");
    });

    socket.on("receiveMessage", (data) => {
      setMessages((prev) => [...prev, data]);
    });
    socket.on("messageDeleted", ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });
    socket.on("statusCreated", (status) => {
      setStatusItems((prev) => [status, ...prev.filter((item) => item.id !== status.id)]);
    });
    socket.on("statusDeleted", ({ statusId }) => {
      setStatusItems((prev) => prev.filter((item) => item.id !== statusId));
      setViewedStatusIds((prev) => prev.filter((id) => id !== statusId));
      setStatusPlayer((prev) => {
        if (!prev.open) return prev;
        if (!prev.items.some((s) => s.id === statusId)) return prev;
        return { open: false, ownerId: null, ownerName: "", items: [], index: 0, progress: 0 };
      });
    });

    socket.on("incomingCall", ({ from, fromUsername, type, signal }) => {
      console.log(`[CLIENT] Incoming call from ${fromUsername} (${from})`);
      const incomingType = type === "video" ? "video" : "voice";
      logCallHistory({
        username: fromUsername || "Unknown",
        phoneNumber: "",
        direction: "Incoming",
        status: "Ringing",
        mediaType: incomingType,
      });
      setCallMediaType(incomingType);
      setCallerInfo({
        id: from,
        username: fromUsername || "Unknown",
        phoneNumber: "",
        avatar: (fromUsername || "?").charAt(0).toUpperCase(),
        callMediaType: incomingType,
        signal: signal, // Store the offer
      });
      setCallType("incoming");
      setCallStatus(null);
    });

    socket.on("callAccepted", ({ from, signal }) => {
      console.log(`[CLIENT] Call accepted by ${from}`);
      setCallType("active");
      setCallStatus(null);
      setCallStartTime(Date.now());
      if (signal && connectionRef.current) {
        connectionRef.current.setRemoteDescription(new RTCSessionDescription(signal))
          .catch(e => console.error("Error setting remote description:", e));
      }
    });

    socket.on("callDeclined", () => {
      console.log("[CLIENT] Call declined");
      // If they declined, end everything locally
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (connectionRef.current) {
        connectionRef.current.close();
        connectionRef.current = null;
      }
      setCallType(null);
      setCallerInfo(null);
      setCallStatus(null);
      setCallMediaType("voice");
    });

    socket.on("ice-candidate", (data) => {
      if (connectionRef.current && data.candidate) {
        connectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate))
          .catch(e => console.error("Error adding ice candidate", e));
      }
    });

    socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setIsConnected(false);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });
  };

  const syncUserSession = (nextUser) => {
    setUser(nextUser);
    localStorage.setItem("chatUser", JSON.stringify(nextUser));

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("authenticate", {
        userId: nextUser.id,
        phoneNumber: nextUser.phoneNumber,
        username: nextUser.username,
        language,
      });
    }
  };

  const handleProfileSave = async () => {
    const username = profileForm.username.trim();
    const phoneNumber = profileForm.phoneNumber.trim();

    if (!username || !phoneNumber) {
      alert("Full name and phone number are required.");
      return;
    }

    try {
      setProfileSaving(true);
      const response = await fetch(`${API_URL}/api/user/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, phoneNumber }),
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to update profile");
        return;
      }

      syncUserSession(data.user);
      setIsEditingProfile(false);
    } catch (error) {
      console.error("Profile update error:", error);
      alert("Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setAvatarUploading(true);
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch(`${API_URL}/api/user/${user.id}/avatar`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to upload profile photo");
        return;
      }

      syncUserSession(data.user);
    } catch (error) {
      console.error("Avatar upload error:", error);
      alert("Failed to upload profile photo");
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  };

  const loadContacts = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/api/contacts/${userId}`);
      const data = await response.json();
      setContacts(data);
    } catch (error) {
      console.error("Error loading contacts:", error);
    }
  };

  const loadGroups = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/api/groups/${userId}`);
      const data = await response.json();
      setGroups(data);
    } catch (error) {
      console.error("Error loading groups:", error);
    }
  };

  const loadStatuses = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/api/status/${userId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load statuses");
      }
      setStatusItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading statuses:", error);
      setStatusItems([]);
    }
  };

  const loadMessages = async (chatId, type) => {
    try {
      let messageKey = chatId;
      if (type === "group") {
        messageKey = `group_${chatId}`;
      }
      const response = await fetch(`${API_URL}/api/messages/${user.id}/${messageKey}`);
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error("Error loading messages:", error);
      setMessages([]);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: signupPhone,
          username: signupUsername,
          password: signupPassword,
        }),
      });
      const data = await response.json();
      if (data.success) {
        alert("Account created! Please login.");
        setShowLogin(true);
        setSignupPhone("");
        setSignupUsername("");
        setSignupPassword("");
        setUser(data.user);
        setLanguage(data.user.language || "en"); // Sync UI language with user profile
        setIsAuthenticated(true);
      } else {
        alert(data.error || "Signup failed");
      }
    } catch (error) {
      console.error("Signup error:", error);
      alert("Signup failed. Please try again.");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: loginPhone,
          password: loginPassword,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        setIsAuthenticated(true);
        setShowSettings(false);
        localStorage.setItem("chatUser", JSON.stringify(data.user));
        setCurrentView("chat");
        initializeSocket(data.user);
        loadContacts(data.user.id);
        loadGroups(data.user.id);
        loadStatuses(data.user.id);
        setLoginPhone("");
        setLoginPassword("");
      } else {
        alert(data.error || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed. Please try again.");
    }
  };

  const handleLogout = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    localStorage.removeItem("chatUser");
    setUser(null);
    setIsAuthenticated(false);
    setSelectedChat(null);
    setMessages([]);
    setContacts([]);
    setGroups([]);
    setCallHistory([]);
    setCurrentView("homepage");
    setShowSettings(false);
  };

  const openAddDialog = () => {
    setDialogStage("selection");
    setShowAddDialog(true);
  };

  const handleDialogBack = () => {
    setDialogStage("selection");
  };

  const closeAddDialog = () => {
    setShowAddDialog(false);
    setDialogStage("selection");
    setNewContactName("");
    setNewContactPhone("");
    setGroupName("");
    setSelectedGroupMembers([]);
  };

  const handleSaveContact = async (e) => {
    e.preventDefault();
    const normalizedPhone = String(newContactPhone || "").replace(/\D/g, "");
    const phoneForLookup = normalizedPhone.length > 10
      ? normalizedPhone.slice(-10)
      : normalizedPhone;

    if (!phoneForLookup) {
      alert("Enter a valid phone number");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/contacts/${user.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phoneForLookup,
          username: newContactName,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setContacts([...contacts, data.contact]);
        loadStatuses(user.id);
        setNewContactName("");
        setNewContactPhone("");
        closeAddDialog();
      } else {
        console.error("Add contact failed", { apiUrl: API_URL, phoneForLookup, response: data });
        alert(data.error || "Failed to add contact");
      }
    } catch (error) {
      console.error("Add contact error:", error);
      alert("Failed to add contact");
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (selectedGroupMembers.length === 0) {
      alert("Please select at least one member");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName,
          userId: user.id,
          memberIds: selectedGroupMembers,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setGroups([...groups, data.group]);
        setGroupName("");
        setSelectedGroupMembers([]);
        closeAddDialog();
      } else {
        alert(data.error || "Failed to create group");
      }
    } catch (error) {
      console.error("Create group error:", error);
      alert("Failed to create group");
    }
  };

  const selectChat = (chatId, type) => {
    setSelectedChat(chatId);
    setChatType(type);
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("joinChat", { chatId, chatType: type });
    }
    loadMessages(chatId, type);
  };

  // ... after selectChat function ...

  const deleteMessage = async (messageId) => {
    try {
      const response = await fetch(`${API_URL}/api/messages/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          chatId: selectedChat,
          chatType,
          messageId
        }),
      });

      if (response.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };
  const handleEmojiSelect = (emoji) => {
    setMessage((prev) => `${prev}${emoji}`);
    setShowEmojiPicker(false);
    messageInputRef.current?.focus();
  };

  // Audio recording functions (prefer Web Speech API for live transcription)
  const startAudioRecording = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    transcriptRef.current = "";
    audioSendLockRef.current = false;
    try {
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.interimResults = false;
        recognition.lang = sourceLanguage === 'auto' ? 'en-US' : sourceLanguage;
        recognitionRef.current = recognition;

        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map((r) => r[0].transcript)
            .join(" ");
          transcriptRef.current = transcript;
        };

        recognition.onerror = (e) => {
          console.error('SpeechRecognition error', e);
        };

        recognition.onend = async () => {
          setIsRecording(false);
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
          const finalText = transcriptRef.current || "[Audio message]";
          await translateAndSendAudio(finalText);
        };

        recognition.start();
        setIsRecording(true);
        setRecordingTime(0);
        recordingTimerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);
        return;
      }

      // Fallback: record audio blob via MediaRecorder
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // can't transcribe locally reliably; send placeholder
        await translateAndSendAudio("[Audio message]");
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Microphone access denied");
    }
  };

  const stopAudioRecording = () => {
    const transcriptSnapshot = transcriptRef.current;

    // Stop SpeechRecognition if active
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('Recognition stop failed', e);
      }

      // Ensure UI stops immediately even if onend is delayed
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      // Failsafe: if onend doesn't fire, send what we have after a short delay
      setTimeout(() => {
        if (transcriptSnapshot) {
          translateAndSendAudio(transcriptSnapshot);
          setRecordingTime(0);
        }
      }, 400);

      recognitionRef.current = null;
      return;
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      try {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  // Send transcribed text immediately; backend handles per-user translation.
  const translateAndSendAudio = async (transcribedText) => {
    if (!selectedChat || !socketRef.current) return;
    if (audioSendLockRef.current) return;
    audioSendLockRef.current = true;
    try {
      setIsTranslating(true);

      socketRef.current.emit('sendMessage', {
        message: transcribedText,
        chatId: selectedChat,
        chatType,
        sourceLanguage,
        targetLanguage: language,
        isAudioMessage: true,
        originalText: transcribedText,
      });

      setRecordingTime(0);
    } catch (error) {
      console.error('Error translating audio:', error);
      alert('Error translating audio');
    } finally {
      setIsTranslating(false);
    }
  };

  // ... before sendMessage function ...
  const sendMessage = async () => {
    if (!message.trim() || !selectedChat || !socketRef.current) return;

    socketRef.current.emit("sendMessage", {
      message: message.trim(),
      chatId: selectedChat,
      chatType,
      sourceLanguage,
      targetLanguage: language,
    });

    setMessage("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Render Auth (check this first so users can navigate to login from landing)
  if (currentView === "auth") {
    return (
      <div className="auth-container">
        <div className="auth-box">
          {showLogin ? (
            <form onSubmit={handleLogin} className="auth-form">
              <h2>Login</h2>
              <input
                type="tel"
                placeholder="Phone Number"
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value)}
                required
                aria-label="Phone Number"
              />
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                aria-label="Password"
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
                aria-label="Phone Number"
              />
              <input
                type="text"
                placeholder="Username"
                value={signupUsername}
                onChange={(e) => setSignupUsername(e.target.value)}
                required
                aria-label="Username"
              />
              <input
                type="password"
                placeholder="Password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                required
                aria-label="Password"
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
    );
  }

  // Render Landing Page (is shown when not authenticated)
  if (!isAuthenticated) {
    return <Landing onStartChat={() => setCurrentView("auth")} />;
  }

  const activeStatusItems = statusItems
    .filter((item) => Date.now() - item.createdAt < STATUS_TTL_MS)
    .sort((a, b) => b.createdAt - a.createdAt);

  const statusByOwner = activeStatusItems.reduce((acc, item) => {
    if (!acc[item.ownerId]) {
      acc[item.ownerId] = {
        ownerId: item.ownerId,
        ownerName: item.ownerName,
        ownerAvatar: item.ownerAvatar,
        items: [],
      };
    }
    acc[item.ownerId].items.push(item);
    return acc;
  }, {});

  const statusGroups = Object.values(statusByOwner).sort(
    (a, b) => b.items[0].createdAt - a.items[0].createdAt
  );

  const myStatus = statusGroups.find((g) => g.ownerId === user?.id);
  const myStatusItems = activeStatusItems
    .filter((item) => item.ownerId === user?.id)
    .sort((a, b) => b.createdAt - a.createdAt);
  const contactStatusGroups = statusGroups.filter((g) => g.ownerId !== user?.id);
  const recentStatusGroups = contactStatusGroups.filter((g) =>
    g.items.some((item) => !viewedStatusIds.includes(item.id))
  );
  const viewedStatusGroups = contactStatusGroups.filter((g) =>
    g.items.every((item) => viewedStatusIds.includes(item.id))
  );
  const sectionForContent = activeNavSection === "profile" ? "profile" : activeTab;

  // Render Main Chat Interface
  return (
    <div className={`babelchat-container ${selectedChat ? "has-selected-chat" : ""}`}>
      {/* Navigation Rail */}
      <NavigationRail
        activeSection={activeNavSection}
        onSectionChange={handleNavSectionChange}
        user={user}
        onSettingsClick={() => setShowSettings(true)}
        onProfileClick={() => {
          setShowSettings(false);
          setActiveNavSection("profile");
        }}
      />

      {/* Sidebar Settings */}
      <div className={`settings-sidebar ${showSettings ? "open" : ""}`}>
        <div className="sidebar-header">
          <h3>Settings</h3>
          <button className="close-sidebar" onClick={() => setShowSettings(false)}>x</button>
        </div>
        <div className="sidebar-content">
          <div className="user-profile">
            <div className="profile-avatar-large">
              {user?.avatarUrl ? (
                <img src={`${API_URL}${user.avatarUrl}`} alt="Profile" className="profile-avatar-image" />
              ) : (
                user?.username?.charAt(0).toUpperCase() || "?"
              )}
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
            <label>
              <input
                type="checkbox"
                checked={showOriginal}
                onChange={(e) => setShowOriginal(e.target.checked)}
              />
              Show original text
            </label>
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

      {/* Contacts Sidebar - Dynamic based on Navigation */}
      <div className="contacts-sidebar" style={{ width: `${sidebarWidth}px` }}>
        <div className="sidebar-header-section">
          <div className="sidebar-header sidebar-brand-row">
            <div className="sidebar-section-label sidebar-section-label--inline">
              {sectionForContent === "chats" && "Chats"}
              {sectionForContent === "calls" && "Calls"}
              {sectionForContent === "status" && "Status"}
              {sectionForContent === "communities" && "Communities"}
              {sectionForContent === "profile" && "Profile"}
            </div>
            {sectionForContent === "chats" && (
              <button
                type="button"
                className="sidebar-add-btn"
                onClick={openAddDialog}
                aria-label="Add"
                title="Add"
              >
                +
              </button>
            )}
          </div>

            {/* Search Bar */}
            {(sectionForContent === "chats" || sectionForContent === "communities") && (
              <div className="search-container">
                <input
                  type="text"
                  className="search-input"
                  placeholder={sectionForContent === "chats" ? "Search chats..." : "Search communities..."}
                  value={searchChat}
                  onChange={(e) => setSearchChat(e.target.value)}
                  aria-label="Search"
                />
                <span className="search-icon">S</span>
              </div>
            )}

            {/* Filter Tabs - Only show for chats */}
            {sectionForContent === "chats" && (
              <div className="filter-tabs">
                <button
                  className={`filter-tab ${chatFilter === "all" ? "active" : ""}`}
                  onClick={() => setChatFilter("all")}
                >
                  All
                </button>
                <button
                  className={`filter-tab ${chatFilter === "unread" ? "active" : ""}`}
                  onClick={() => setChatFilter("unread")}
                >
                  Unread
                </button>
                <button
                  className={`filter-tab ${chatFilter === "favourites" ? "active" : ""}`}
                  onClick={() => setChatFilter("favourites")}
                >
                  Favourites
                </button>
                <button
                  className={`filter-tab ${chatFilter === "groups" ? "active" : ""}`}
                  onClick={() => setChatFilter("groups")}
                >
                  Groups
                </button>
              </div>
            )}
        </div>

        {/* Content based on active section */}
        {sectionForContent === "profile" && (
          <div className="contacts-list profile-panel">
            <div className="profile-card">
              <div className="profile-avatar-wrap">
                <div className="profile-avatar-large profile-avatar-large--panel">
                  {user?.avatarUrl ? (
                    <img src={`${API_URL}${user.avatarUrl}`} alt="Profile" className="profile-avatar-image" />
                  ) : (
                    user?.username?.charAt(0).toUpperCase()
                  )}
                </div>
                <label className={`profile-photo-btn ${avatarUploading ? "disabled" : ""}`}>
                  {avatarUploading ? "Uploading..." : "Edit Photo"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={avatarUploading}
                    hidden
                  />
                </label>
              </div>

              <div className="profile-info-grid">
                <div className="profile-info-row">
                  <span className="profile-info-label">Full Name</span>
                  <span className="profile-info-value">{user?.username || "-"}</span>
                </div>
                <div className="profile-info-row">
                  <span className="profile-info-label">Phone</span>
                  <span className="profile-info-value">{user?.phoneNumber || "-"}</span>
                </div>
                <div className="profile-info-row">
                  <span className="profile-info-label">User ID</span>
                  <span className="profile-info-value">{user?.id || "-"}</span>
                </div>
                <div className="profile-info-row">
                  <span className="profile-info-label">Member Since</span>
                  <span className="profile-info-value">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}
                  </span>
                </div>
                <div className="profile-info-row">
                  <span className="profile-info-label">Current Language</span>
                  <span className="profile-info-value">
                    {languages.find((lang) => lang.code === language)?.name || language}
                  </span>
                </div>
              </div>

              {isEditingProfile ? (
                <div className="profile-edit-form">
                  <label>
                    Full Name
                    <input
                      type="text"
                      value={profileForm.username}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, username: e.target.value }))}
                      placeholder="Enter full name"
                    />
                  </label>
                  <label>
                    Phone Number
                    <input
                      type="tel"
                      value={profileForm.phoneNumber}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                      placeholder="Enter phone number"
                    />
                  </label>
                  <div className="profile-edit-actions">
                    <button
                      type="button"
                      className="profile-save-btn"
                      onClick={handleProfileSave}
                      disabled={profileSaving}
                    >
                      {profileSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      className="profile-cancel-btn"
                      onClick={() => {
                        setProfileForm({
                          username: user?.username || "",
                          phoneNumber: user?.phoneNumber || "",
                        });
                        setIsEditingProfile(false);
                      }}
                      disabled={profileSaving}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="profile-edit-btn"
                  onClick={() => setIsEditingProfile(true)}
                >
                  Edit Profile Details
                </button>
              )}
            </div>
          </div>
        )}

        {sectionForContent === "chats" && (
          <div className="contacts-list">
            {groups.filter(g => 
              g.name.toLowerCase().includes(searchChat.toLowerCase()) &&
              (chatFilter === "all" || chatFilter === "groups")
            ).map((group) => (
              <div
                key={`group-${group.id}`}
                className={`contact-item ${selectedChat === group.id && chatType === "group" ? "active" : ""}`}
                onClick={() => selectChat(group.id, "group")}
              >
                <div className="contact-avatar group-avatar">G</div>
                <div className="contact-info">
                  <div className="contact-name">{group.name}</div>
                  <div className="contact-status">{group.lastMessage || "Group - " + group.members.length + " members"}</div>
                </div>
                {group.unreadCount > 0 && (
                  <div className="unread-badge">{group.unreadCount > 99 ? "99+" : group.unreadCount}</div>
                )}
              </div>
            ))}
            {contacts.filter(c => 
              c.username.toLowerCase().includes(searchChat.toLowerCase()) &&
              (chatFilter === "all")
            ).map((contact) => (
              <div
                key={`user-${contact.id}`}
                className={`contact-item ${selectedChat === contact.id && chatType === "user" ? "active" : ""}`}
                onClick={() => selectChat(contact.id, "user")}
              >
                <div className="contact-avatar">
                  {contact.username.charAt(0).toUpperCase()}
                </div>
                <div className="contact-info">
                  <div className="contact-name">{contact.username}</div>
                  <div className="contact-status">{contact.lastMessage || contact.phoneNumber}</div>
                </div>
                {contact.unreadCount > 0 && (
                  <div className="unread-badge">{contact.unreadCount > 99 ? "99+" : contact.unreadCount}</div>
                )}
                <button
                  className="delete-contact-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete contact ${contact.username}?`)) {
                      fetch(`${API_URL}/api/contacts/${user.id}/${contact.id}`, { method: 'DELETE' })
                        .then(() => {
                          setContacts(prev => prev.filter(c => c.id !== contact.id));
                          loadStatuses(user.id);
                          if (selectedChat === contact.id) setSelectedChat(null);
                        })
                        .catch(err => console.error("Error deleting contact:", err));
                    }
                  }}
                  title="Delete Contact"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}

        {sectionForContent === "calls" && (
          <div className="contacts-list">
            {callHistory.length === 0 ? (
              <div className="empty-state">
                <p className="empty-message">No call history yet</p>
              </div>
            ) : (
              callHistory.map((item) => (
                <div key={item.id} className="contact-item">
                  <div className="contact-avatar">{item.username?.charAt(0)?.toUpperCase() || "?"}</div>
                  <div className="contact-info">
                    <div className="contact-name">{item.username}</div>
                    <div className="contact-status">
                      {item.direction} {item.mediaType} - {item.status}
                      {item.durationSec > 0 ? ` (${formatCallTime(item.durationSec)})` : ""}
                    </div>
                    <div className="contact-status">
                      {new Date(item.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <button
                    className="delete-call-log-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCallLog(item.id);
                    }}
                    title="Delete call log"
                    aria-label="Delete call log"
                  >
                    x
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {sectionForContent === "status" && (
          <div className="contacts-list">
            <div className="status-section">
              <input
                ref={statusInputRef}
                type="file"
                accept="image/*,video/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={handleStatusFileChange}
              />

              <button className="status-my-btn" type="button" onClick={handleAddStatusClick}>
                <span className="status-my-avatar">
                  {user?.username?.charAt(0)?.toUpperCase() || "U"}
                </span>
                <span className="status-my-text">
                  <strong>My Status</strong>
                  <small>{myStatus ? "Tap to add another update" : "Tap to add status update"}</small>
                </span>
                <span className="status-my-plus">+</span>
              </button>

              {myStatusItems.length > 0 && (
                <>
                  <div className="status-group-label">My Updates</div>
                  {myStatusItems.map((item) => (
                    <div key={item.id} className="status-item my-status-item">
                      <button
                        className="status-item-main"
                        type="button"
                        onClick={() => openStatusPlayer(user.id)}
                      >
                        <span className="status-avatar">{user?.username?.charAt(0)?.toUpperCase() || "U"}</span>
                        <span className="status-item-meta">
                          <strong>{item.mediaType?.startsWith("video/") ? "Video update" : "Image update"}</strong>
                          <small>{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="status-delete-btn"
                        onClick={() => handleDeleteStatus(item.id)}
                        aria-label="Delete status"
                        title="Delete status"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </>
              )}

              <div className="status-group-label">Recent Updates</div>
              {recentStatusGroups.length === 0 ? (
                <p className="empty-message">No recent updates</p>
              ) : (
                recentStatusGroups.map((group) => (
                  <button
                    key={`status-recent-${group.ownerId}`}
                    className="status-item"
                    type="button"
                    onClick={() => openStatusPlayer(group.ownerId)}
                  >
                    <span className="status-avatar">{group.ownerAvatar || "U"}</span>
                    <span className="status-item-meta">
                      <strong>{group.ownerName}</strong>
                      <small>{new Date(group.items[0].createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>
                    </span>
                  </button>
                ))
              )}

              <div className="status-group-label">Viewed Updates</div>
              {viewedStatusGroups.length === 0 ? (
                <p className="empty-message">No viewed updates</p>
              ) : (
                viewedStatusGroups.map((group) => (
                  <button
                    key={`status-viewed-${group.ownerId}`}
                    className="status-item viewed"
                    type="button"
                    onClick={() => openStatusPlayer(group.ownerId)}
                  >
                    <span className="status-avatar">{group.ownerAvatar || "U"}</span>
                    <span className="status-item-meta">
                      <strong>{group.ownerName}</strong>
                      <small>{new Date(group.items[0].createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {sectionForContent === "communities" && (
          <div className="contacts-list">
            <div className="empty-state">
              <p className="empty-message">No communities yet</p>
            </div>
          </div>
        )}

        {/* Resize Handle */}
        <div
          className="sidebar-resize-handle"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDraggingResize(true);
          }}
          title="Drag to resize sidebar"
        />
      </div>

      {/* Chat Area */}
      <div className={`chat-area ${selectedChat ? "active" : ""} ${activeTab === "status" ? "status-mode" : ""}`}>
        {!selectedChat ? (
          <div className="empty-chat">
            {activeTab === "status" && (
              <>
                <div className="empty-icon">Status</div>
                <p>Status Updates</p>
                <p className="empty-hint">
                  {recentStatusGroups.length > 0
                    ? `${recentStatusGroups.length} recent update${recentStatusGroups.length > 1 ? "s" : ""}`
                    : "No recent updates"}
                </p>
              </>
            )}
            {activeTab === "calls" && (
              <>
                <div className="empty-icon">Calls</div>
                <p>Call History</p>
                <p className="empty-hint">No recent calls</p>
              </>
            )}
            {activeTab === "communities" && (
              <>
                <div className="empty-icon">Communities</div>
                <p>Communities</p>
                <p className="empty-hint">
                  {groups.length > 0
                    ? `${groups.length} communit${groups.length > 1 ? "ies" : "y"} available`
                    : "No communities available"}
                </p>
              </>
            )}
            {activeTab === "chats" && (
              <>
                <div className="empty-icon">Chat</div>
                <p>Select a contact to start chatting</p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="chat-header">
              <div className="chat-header-info">
                <button
                  type="button"
                  className="chat-back-btn"
                  onClick={() => {
                    setSelectedChat(null);
                    setChatType(null);
                  }}
                  aria-label="Back to chats"
                >
                  Back
                </button>
                <div className="chat-avatar">
                  {chatType === "group"
                    ? "G"
                    : contacts.find(c => c.id === selectedChat)?.username?.charAt(0).toUpperCase() || "?"
                  }
                </div>
                <div className="chat-meta-line">
                  <span className="chat-name">
                    {chatType === "group"
                      ? groups.find(g => g.id === selectedChat)?.name
                      : contacts.find(c => c.id === selectedChat)?.username
                    }
                  </span>
                  <span className="chat-status">
                    {chatType === "group"
                      ? `- Group - ${groups.find(g => g.id === selectedChat)?.members.length || 0} members`
                      : ""
                    }
                  </span>
                </div>
              </div>
              <div className={`call-actions-group ${callStatus === "connecting" ? "is-connecting" : ""}`}>
                <button
                  type="button"
                  className="call-action-btn"
                  onClick={handleVoiceCall}
                  title="Voice call"
                  aria-label="Voice call"
                >
                  <span className="call-action-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M7.7 4.8c.3-.5 1-.7 1.6-.5l2 1a1.2 1.2 0 0 1 .6 1.5l-.8 2a1.2 1.2 0 0 1-1.4.7l-1-.2a13 13 0 0 0 6 6l.2-1a1.2 1.2 0 0 1 .7-1.4l2-.8a1.2 1.2 0 0 1 1.5.6l1 2c.2.6 0 1.3-.5 1.6l-1.4.9a2.6 2.6 0 0 1-2.5.1A17.5 17.5 0 0 1 6 7.8a2.6 2.6 0 0 1 .1-2.5l1-1.5Z" />
                    </svg>
                  </span>
                </button>
                <button
                  type="button"
                  className="call-action-btn"
                  onClick={handleVideoCall}
                  title="Video call"
                  aria-label="Video call"
                >
                  <span className="call-action-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <rect x="3.5" y="6.5" width="12" height="11" rx="2.5" />
                      <path d="M15.5 10.2l4.4-2.5c.5-.3 1.1.1 1.1.7v7.2c0 .6-.6 1-1.1.7l-4.4-2.5" />
                    </svg>
                  </span>
                </button>
              </div>
            </div>

            <div className="messages-area">
              {messages.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">Chat</div>
                  <p>No messages yet</p>
                  <p className="empty-hint">Start the conversation!</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMyMessage = m.from === user.id;
                  return (
                    <div key={m.id} className={`message-wrapper ${isMyMessage ? "sent" : "received"}`}>
                      <div className={`message-bubble ${m.imageUrl ? "ocr-bubble" : ""}`}>
                        <button
                          className="delete-msg-btn"
                          onClick={() => { if (window.confirm("Delete this message?")) deleteMessage(m.id) }}
                          title="Delete"
                        >
                          x
                        </button>
                        {!isMyMessage && chatType === "group" && (
                          <div className="message-sender">{m.fromUsername}</div>
                        )}

                        {/* Image Display */}
                        {m.imageUrl && (
                          <div className="message-image">
                            <img src={`${API_URL}${m.imageUrl}`} alt="Uploaded content" />
                          </div>
                        )}

                        {!(isMyMessage && m.imageUrl) && (
                          <div className="message-text">
                            {/* If audio message, show WhatsApp-style mic + translated text */}
                            {m.isAudioMessage ? (
                              <div className="audio-message">
                                <span className="audio-text">{isMyMessage ? (m.originalText || m.message) : (m.translatedText || m.message)}</span>
                              </div>
                            ) : (
                              // If I sent it, show what I actually typed. If I received it, show the translation.
                              isMyMessage ? (m.originalText || m.message) : (m.translatedText || m.message)
                            )}
                          </div>
                        )}

                        {showOriginal && !isMyMessage && m.originalText && (
                          <div className="original-text-hint">
                            <small>Original: {m.originalText}</small>
                          </div>
                        )}
                        <div className="message-time">
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="input-area">
              <div className="input-wrapper">
                <label className="attach-btn" title="Upload Image for OCR">
                  +
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageUpload}
                  />
                </label>
                <div className="emoji-button-container" ref={emojiContainerRef}>
                  <button
                    className="emoji-btn"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    title="Add emoji"
                    type="button"
                  >
                    🙂
                  </button>
                  {showEmojiPicker && (
                    <div className="emoji-picker-popup">
                      <div className="emoji-grid">
                        {[
                          "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙",
                          "😋","😛","😜","🤪","🤨","🧐","🤓","😎","🥳","😤","😴","🤔","🫡","🙄","😬","😮","😲","😳","🥺","😭",
                          "👍","👎","👌","✌️","🤞","🤟","🤘","👏","🙌","🙏","💪","👋","🤝","🫶","❤️","🧡","💛","💚","💙","💜",
                          "🖤","🤍","🤎","💔","❣️","💕","💞","💖","💯","✅","🔥","✨","⭐","🌟","🎉","🎊","🥇","🏆","🎯","🚀",
                          "📚","💡","🔔","⚡","🎵","🎧","📷","🌍","🌎","🌏","☀️","🌙","☕","🍕","🍔","🍟","🍎","🍓","⚽","🏀"
                        ].map((emoji) => (
                          <button
                            key={emoji}
                            className="emoji-option"
                            onClick={() => handleEmojiSelect(emoji)}
                            title={emoji}
                            type="button"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={messageInputRef}
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message"
                  disabled={!isConnected}
                  className="message-input"
                />
                {isTranslating && <div className="translating-indicator">Translating...</div>}
                {message.trim() ? (
                  <button
                    onClick={sendMessage}
                    disabled={!isConnected || !message.trim()}
                    className="send-button"
                    title="Send message"
                    type="button"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 12h13m0 0-4.5-4.5M17 12l-4.5 4.5" />
                    </svg>
                  </button>
                ) : (
                  <button
                    className={`audio-record-btn ${isRecording ? "recording" : ""}`}
                    onClick={isRecording ? stopAudioRecording : startAudioRecording}
                    title={isRecording ? "Stop recording" : "Record voice message"}
                    type="button"
                    disabled={!isConnected}
                  >
                    {isRecording ? (
                      <span className="recording-indicator">
                        <span className="pulse"></span>
                        {recordingTime}s
                      </span>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 4.5a2.8 2.8 0 0 1 2.8 2.8v5.4a2.8 2.8 0 1 1-5.6 0V7.3A2.8 2.8 0 0 1 12 4.5Z" />
                        <path d="M7 11.8a5 5 0 0 0 10 0M12 16.8v3.2m-3 0h6" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Dialog (Staged) */}
      {showAddDialog && (
        <div className="modal-overlay" onClick={closeAddDialog}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {dialogStage === "selection" && (
              <>
                <h3>Add</h3>
                <div className="modal-actions modal-selection-actions">
                  <button type="button" className="modal-primary-action" onClick={() => setDialogStage("add_contact")}>Add Contact</button>
                  <button type="button" className="modal-secondary-action" onClick={() => setDialogStage("add_group")}>Add Group</button>
                </div>
              </>
            )}

            {dialogStage === "add_contact" && (
              <>
                <h3>Add Contact</h3>
                <form onSubmit={handleSaveContact}>
                  <input
                    type="text"
                    placeholder="Name"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    required
                  />
                  <div className="modal-actions">
                    <button type="button" onClick={handleDialogBack}>Back</button>
                    <button type="submit">Save Contact</button>
                  </div>
                </form>
              </>
            )}

            {dialogStage === "add_group" && (
              <>
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
                              setSelectedGroupMembers([...selectedGroupMembers, contact.id]);
                            } else {
                              setSelectedGroupMembers(selectedGroupMembers.filter(id => id !== contact.id));
                            }
                          }}
                        />
                        {contact.username} ({contact.phoneNumber})
                      </label>
                    ))}
                  </div>
                  <div className="modal-actions">
                    <button type="button" onClick={handleDialogBack}>Back</button>
                    <button type="submit">Create Group</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Status Player */}
      {statusPlayer.open && statusPlayer.items.length > 0 && (
        <div className="status-player-overlay" onClick={closeStatusPlayer}>
          <div className="status-player" onClick={(e) => e.stopPropagation()}>
            <div className="status-player-progress">
              {statusPlayer.items.map((item, idx) => (
                <div key={item.id} className="status-progress-track">
                  <div
                    className="status-progress-fill"
                    style={{
                      width:
                        idx < statusPlayer.index
                          ? "100%"
                          : idx === statusPlayer.index
                          ? `${Math.min(100, statusPlayer.progress)}%`
                          : "0%",
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="status-player-header">
              <strong>{statusPlayer.ownerName}</strong>
              <button type="button" className="status-player-close" onClick={closeStatusPlayer}>
                x
              </button>
            </div>

            <div className="status-player-body">
              {statusPlayer.items[statusPlayer.index]?.mediaType?.startsWith("video/") ? (
                <video
                  src={resolveStatusMediaUrl(statusPlayer.items[statusPlayer.index].mediaUrl)}
                  autoPlay
                  muted
                  playsInline
                  className="status-player-media"
                />
              ) : (
                <img
                  src={resolveStatusMediaUrl(statusPlayer.items[statusPlayer.index].mediaUrl)}
                  alt="Status"
                  className="status-player-media"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Call Modal */}
      {callType && callerInfo && (
        <div className="call-modal-overlay">
          <audio ref={remoteAudioRef} autoPlay playsInline />
          <div
            className="call-modal"
            style={position.x !== null ? { position: 'fixed', left: position.x, top: position.y, margin: 0 } : {}}
            onMouseDown={handleDragStart}
          >
            <div className="call-drag-handle" title="Drag to move"></div>

            {callType === 'incoming' && (
              <div className="call-modal-incoming">
                <div className="caller-avatar-large">
                  {callerInfo.avatar}
                </div>
                <div className="caller-name">{callerInfo.username}</div>
                <div className="caller-status">Incoming call...</div>
                <div className="call-modal-actions">
                  <button
                    className="call-btn call-btn-accept"
                    onClick={handleAcceptCall}
                    aria-label="Accept call"
                    title="Accept"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M7.8 4.7c.3-.5 1-.7 1.5-.5l1.9 1a1.1 1.1 0 0 1 .5 1.4l-.7 1.9a1.1 1.1 0 0 1-1.3.7l-.9-.2a12 12 0 0 0 5.5 5.5l.2-.9a1.1 1.1 0 0 1 .7-1.3l1.9-.7a1.1 1.1 0 0 1 1.4.5l1 1.9c.2.5 0 1.2-.5 1.5l-1.2.8a2.4 2.4 0 0 1-2.3.1A16.2 16.2 0 0 1 6.9 8.3a2.4 2.4 0 0 1 .1-2.3l.8-1.3Z" />
                    </svg>
                  </button>
                  <button
                    className="call-btn call-btn-decline"
                    onClick={handleDeclineCall}
                    aria-label="Decline call"
                    title="Decline"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4.8 15.4c1.8-2.3 4.4-3.4 7.2-3.4s5.4 1.1 7.2 3.4" />
                      <path d="M9.3 15.6l-1.8 3.1M14.7 15.6l1.8 3.1" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {(callType === 'outgoing' || callType === 'active') && (
              <div className={`call-modal-active ${callMediaType === "video" ? "video-mode" : "voice-mode"} ${callType === "outgoing" ? "outgoing-state" : "active-state"}`}>
                {callMediaType === "video" ? (
                  <>
                    <div className="call-video-container">
                      <video
                        ref={remoteVideoRef}
                        className="call-video-remote"
                        autoPlay
                        playsInline
                        muted={false}
                      />

                      <video
                        ref={localVideoRef}
                        className="call-video-local"
                        autoPlay
                        playsInline
                        muted={true}
                      />

                      <div className="call-avatar-background">
                        <div className="call-avatar-blur">{callerInfo.avatar}</div>
                      </div>
                    </div>

                    <div className="call-info-overlay">
                      <div className="caller-name-overlay">{callerInfo.username}</div>
                      {callType === 'active' && (
                        <div className="call-timer">{formatCallTime(callDuration)}</div>
                      )}
                      {callStatus === 'connecting' && (
                        <div className="call-status-text">Connecting...</div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="call-voice-center">
                    <div className="caller-avatar-large">{callerInfo.avatar}</div>
                    <div className="caller-name">{callerInfo.username}</div>
                    {callType === 'active' ? (
                      <div className="call-timer">{formatCallTime(callDuration)}</div>
                    ) : (
                      <div className="call-status-text">Connecting...</div>
                    )}
                  </div>
                )}

                <div className="call-controls">
                  <button
                    className="call-btn-end"
                    onClick={handleEndCall}
                    aria-label="End call"
                    title="End Call"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4.8 15.4c1.8-2.3 4.4-3.4 7.2-3.4s5.4 1.1 7.2 3.4" />
                      <path d="M9.3 15.6l-1.8 3.1M14.7 15.6l1.8 3.1" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;


