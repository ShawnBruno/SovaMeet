"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import ThemeToggle from "../ThemeToggle";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";
const REQUEST_TIMEOUT_MS = 8000;
const ASL_PHRASES = {
    BJ: "BYE",
    BA: "BYE",
    BZ: "BYE",
    AJ: "COME HERE",
    ZB: "COME HERE",
    AB: "COME HERE",
    BB: "HI",
    HH: "HI",
    HJ: "TURN AROUND",
    AC: "TURN AROUND",
    SC: "TURN AROUND",
    IA: "TURN AROUND",
    IC: "TURN AROUND",
    BC: "TURN AROUND",
    ZJ: "YOU and ME",
    ZX: "YOU and ME",
    ZO: "YOU and ME",
    HX: "YOU and ME",
    LZ: "ME and YOU",
    XZ: "ME and YOU",
    DZ: "ME and YOU",
    LLL: "",
    ZLLL: "",
    ZLL: "",
    ZZ: "",
    ZLZ: "",
    ZL: "",
    ILL: "I Love you",
    IL: "I Love you",
    YI: "I Love you",
    YL: "I Love you",
    II: "I Love you",
    YLL: "I Love you",
    IZZ: "I Love you",
    ZHZ: "I Love you",
    IH: "I Love you",
    HZ: "I Love you",
    ZH: "I Love you",
    IZ: "I Love you",
    LL: "I Love you",
    HR: "look Up",
    ZR: "look Up",
    R: "look Up"
};

async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal
        });
    } finally {
        clearTimeout(timeout);
    }
}

export default function MeetingPage() {
    const router = useRouter();
    const [roomId, setRoomId] = useState("");
    const [meetingTitle, setMeetingTitle] = useState("Meeting Room");
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loaderText, setLoaderText] = useState("Joining meeting...");

    // Control toggles
    const [micOn, setMicOn] = useState(true);
    const [videoOn, setVideoOn] = useState(true);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [aslOn, setAslOn] = useState(false);
    const [aslOutputMode, setAslOutputMode] = useState("word");

    // Dynamic UI states
    const [aslPreviewText, setAslPreviewText] = useState("");
    const [showAslPreview, setShowAslPreview] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [showToast, setShowToast] = useState(false);

    // Refs for streams and connections
    const localStreamRef = useRef(null);
    const peerConnectionsRef = useRef({});
    const userMapRef = useRef({});
    const addedTracksRef = useRef(new Set());
    const localVideoElementRef = useRef(null);
    const socketRef = useRef(null);
    const toastTimeoutRef = useRef(null);

    // Refs for DOM nodes (for direct, fast WebRTC DOM inserts matching the original logic)
    const videoGridRef = useRef(null);
    const chatBoxRef = useRef(null);
    const messageInputRef = useRef(null);

    // Refs for ASL state variables
    const aslOnRef = useRef(false);
    const aslHandsRef = useRef(null);
    const aslFrameIdRef = useRef(null);
    const aslBusyRef = useRef(false);
    const aslPredictBusyRef = useRef(false);
    const aslOutputModeRef = useRef("word");
    const currentAslWordRef = useRef("");
    const lastAslLetterRef = useRef("");
    const lastAslTimeRef = useRef(Date.now());
    const aslLetterDelay = 1000;
    const aslWordPause = 1700;

    // Apply body className dynamically
    useEffect(() => {
        document.body.classList.add("meeting");
        return () => {
            document.body.classList.remove("meeting");
            // Cleanup media tracks on unmount
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
            // Cleanup socket connection
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
            // Cancel animation frame
            if (aslFrameIdRef.current) {
                cancelAnimationFrame(aslFrameIdRef.current);
            }
        };
    }, []);

    // 1. Initial configuration, session check & load details
    useEffect(() => {
        const storedUser = sessionStorage.getItem("user");
        if (!storedUser) {
            router.push("/");
            return;
        }
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        const id = new URLSearchParams(window.location.search).get("id");
        if (!id) {
            alert("No meeting ID provided.");
            router.push("/dashboard");
            return;
        }
        setRoomId(id);

        const storedTitle = sessionStorage.getItem(`meetingTitle:${id}`) || "";
        if (storedTitle) {
            setMeetingTitle(storedTitle);
        }

        // Load details from API
        const loadMeetingDetails = async () => {
            try {
                const res = await fetchWithTimeout(`${API_BASE}/api/meeting/join`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ meetingId: id })
                });

                const data = await res.json();

                if (data.message && data.message !== "Joined successfully") {
                    alert("Invalid or expired meeting ID");
                    router.push("/dashboard");
                    return;
                }

                if (data.meetingTitle) {
                    setMeetingTitle(data.meetingTitle);
                    sessionStorage.setItem(`meetingTitle:${id}`, data.meetingTitle);
                }
            } catch (err) {
                console.error("Unable to load meeting details", err);
            }
        };

        loadMeetingDetails();
    }, [router]);

    // 2. Load MediaPipe Hands script dynamically
    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js";
        script.async = true;
        script.onload = () => {
            console.log("MediaPipe Hands script loaded");
        };
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    // 3. Socket connection, webRTC bootstrap inside Client Effect once roomId & user are ready
    useEffect(() => {
        if (!roomId || !user) return;

        // Initialize Socket.io
        const socket = io(API_BASE);
        socketRef.current = socket;

        // Helper to add remote video element
        const addVideo = (stream, muted, socketId = null) => {
            if (!videoGridRef.current) return;

            const tile = document.createElement("div");
            tile.className = "video-tile";

            const video = document.createElement("video");
            if (stream) {
                video.srcObject = stream;
            }

            if (muted) {
                localVideoElementRef.current = video;
            }

            video.autoplay = true;
            video.muted = muted;
            video.playsInline = true;

            // Force black tile if no video track
            if (!stream || !stream.getVideoTracks || stream.getVideoTracks().length === 0) {
                video.style.background = "black";
            }

            const label = document.createElement("div");
            label.className = "name-label";

            let name;
            if (muted) {
                name = user.name + " (You)";
            } else {
                name = userMapRef.current[socketId] || "Participant";
            }

            if (!muted && (!stream || !stream.getVideoTracks || stream.getVideoTracks().length === 0)) {
                name += " (No Camera)";
            }

            label.innerText = name;

            tile.appendChild(video);
            tile.appendChild(label);
            videoGridRef.current.appendChild(tile);
        };

        // Create Peer Connection
        const createPeerConnection = (socketId) => {
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
            });

            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => {
                    pc.addTrack(track, localStreamRef.current);
                });
            }

            pc.ontrack = (event) => {
                const stream = event.streams[0];
                if (addedTracksRef.current.has(stream.id)) return;
                addedTracksRef.current.add(stream.id);
                addVideo(stream, false, socketId);
            };

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit("ice-candidate", {
                        candidate: event.candidate,
                        target: socketId,
                        roomId
                    });
                }
            };

            peerConnectionsRef.current[socketId] = pc;
            return pc;
        };

        // Socket Event listeners
        socket.on("connect", () => {
            console.log("Socket connected:", socket.id);
        });

        socket.on("existing-users", async (users) => {
            for (let u of users) {
                userMapRef.current[u.socketId] = u.username;

                const pc = createPeerConnection(u.socketId);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                socket.emit("offer", {
                    offer,
                    target: u.socketId,
                    roomId
                });
            }
        });

        socket.on("offer", async (data) => {
            const { offer, sender } = data;
            const pc = createPeerConnection(sender);
            await pc.setRemoteDescription(offer);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit("answer", {
                answer,
                target: sender,
                roomId
            });
        });

        socket.on("answer", async (data) => {
            const { answer, sender } = data;
            const pc = peerConnectionsRef.current[sender];
            if (!pc) return;
            await pc.setRemoteDescription(answer);
        });

        socket.on("ice-candidate", async (data) => {
            const { candidate, sender } = data;
            const pc = peerConnectionsRef.current[sender];
            if (!pc) return;
            try {
                await pc.addIceCandidate(candidate);
            } catch (err) {
                console.error("Error adding ice candidate", err);
            }
        });

        socket.on("receive-message", (data) => {
            addMessage(data.sender, data.message);
        });

        socket.on("user-joined", (data) => {
            userMapRef.current[data.socketId] = data.username;
        });

        // Initialize Media
        const startMedia = async () => {
            let hasMedia = true;

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });
                localStreamRef.current = stream;
                addVideo(stream, true);
            } catch (err) {
                console.log("Media not available or permission denied");
                hasMedia = false;
            }

            setIsLoading(false);

            socket.emit("join-room", {
                roomId,
                username: user.name,
                hasMedia
            });
        };

        startMedia();

        return () => {
            socket.disconnect();
        };
    }, [roomId, user]);

    const addMessage = (sender, msg) => {
        if (!chatBoxRef.current) return;
        const box = chatBoxRef.current;
        const div = document.createElement("div");
        div.innerHTML = `<b>${sender}:</b> ${msg}`;
        box.appendChild(div);
        box.scrollTop = box.scrollHeight;
    };

    const handleSendMessage = () => {
        if (!messageInputRef.current) return;
        const input = messageInputRef.current;
        const msg = input.value.trim();

        if (!msg) return;

        socketRef.current.emit("send-message", {
            message: msg,
            roomId,
            sender: user.name
        });

        input.value = "";
    };

    const handleInputKeyDown = (e) => {
        if (e.key === "Enter") {
            handleSendMessage();
        }
    };

    const toggleMic = () => {
        const nextMicState = !micOn;
        setMicOn(nextMicState);
        if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
            localStreamRef.current.getAudioTracks()[0].enabled = nextMicState;
        }
    };

    const toggleVideo = () => {
        const nextVideoState = !videoOn;
        setVideoOn(nextVideoState);
        if (localStreamRef.current && localStreamRef.current.getVideoTracks().length > 0) {
            localStreamRef.current.getVideoTracks()[0].enabled = nextVideoState;
        }
    };

    const toggleChat = () => {
        setIsChatOpen(!isChatOpen);
    };

    const endCall = () => {
        router.push("/dashboard");
    };

    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId);
        displayToast("Copied to clipboard");
    };

    const displayToast = (message) => {
        setToastMessage(message);
        setShowToast(true);

        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
        }

        toastTimeoutRef.current = setTimeout(() => {
            setShowToast(false);
        }, 1800);
    };

    // ==========================================
    // ASL DETECTION / MEDIAPIPE LOGIC
    // ==========================================
    const setAslPreview = (message) => {
        if (!message) {
            setAslPreviewText("");
            setShowAslPreview(false);
            return;
        }
        setAslPreviewText(`ASL Preview: ${message}`);
        setShowAslPreview(true);
    };

    const getLandmarkList = (landmarks) => {
        const list = [];
        landmarks.forEach(landmark => {
            list.push(landmark.x, landmark.y, landmark.z);
        });
        return list;
    };

    const predictAslLetter = async (landmarks) => {
        const res = await fetchWithTimeout(`${API_BASE}/api/asl/predict`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                landmarks: getLandmarkList(landmarks)
            })
        });

        if (!res.ok) return "";
        const data = await res.json();
        return data.letter || "";
    };

    const sendAslWord = (word) => {
        socketRef.current.emit("send-message", {
            message: word,
            roomId,
            sender: user.name
        });
    };

    const getAslOutputText = (word) => {
        const normalizedWord = String(word || "").trim().toUpperCase();

        if (aslOutputModeRef.current === "letter") {
            return normalizedWord;
        }

        if (Object.prototype.hasOwnProperty.call(ASL_PHRASES, normalizedWord)) {
            return ASL_PHRASES[normalizedWord];
        }

        const firstTwoLetters = normalizedWord.slice(0, 2);

        if (Object.prototype.hasOwnProperty.call(ASL_PHRASES, firstTwoLetters)) {
            return ASL_PHRASES[firstTwoLetters];
        }

        return "";
    };

    const finishAslWordIfPaused = () => {
        if (currentAslWordRef.current !== "" && Date.now() - lastAslTimeRef.current > aslWordPause) {
            const translatedWord = getAslOutputText(currentAslWordRef.current);

            if (translatedWord) {
                sendAslWord(translatedWord);
            }

            currentAslWordRef.current = "";
            setAslPreview("");
        }
    };

    const handleAslLetter = (letter) => {
        const now = Date.now();

        if (letter !== "") {
            if (letter === lastAslLetterRef.current && now - lastAslTimeRef.current > aslLetterDelay) {
                currentAslWordRef.current += letter;
                setAslPreview(getAslOutputText(currentAslWordRef.current));
                lastAslTimeRef.current = now;
            }
            lastAslLetterRef.current = letter;
        } else {
            lastAslLetterRef.current = "";
        }

        finishAslWordIfPaused();
    };

    const setupAslHands = async () => {
        if (aslHandsRef.current) return;

        if (!window.Hands) {
            throw new Error("MediaPipe Hands not loaded");
        }

        const handsInstance = new window.Hands({
            locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        handsInstance.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7
        });

        handsInstance.onResults(async (results) => {
            if (!aslOnRef.current) return;

            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                if (!aslPredictBusyRef.current) {
                    aslPredictBusyRef.current = true;

                    try {
                        const letter = await predictAslLetter(results.multiHandLandmarks[0]);
                        handleAslLetter(letter);
                    } catch {
                        setAslPreview("ASL detection unavailable");
                    }

                    aslPredictBusyRef.current = false;
                }
                return;
            }

            handleAslLetter("");
        });

        aslHandsRef.current = handsInstance;
    };

    const runAslFrame = async () => {
        if (!aslOnRef.current) return;

        const localVideo = localVideoElementRef.current;
        if (!localVideo || localVideo.readyState < 2) {
            aslFrameIdRef.current = requestAnimationFrame(runAslFrame);
            return;
        }

        if (!aslBusyRef.current) {
            aslBusyRef.current = true;

            try {
                await aslHandsRef.current.send({ image: localVideo });
            } catch {
                setAslPreview("ASL detection unavailable");
            }

            aslBusyRef.current = false;
        }

        aslFrameIdRef.current = requestAnimationFrame(runAslFrame);
    };

    const startAslMode = async () => {
        if (!localStreamRef.current || localStreamRef.current.getVideoTracks().length === 0) {
            displayToast("Camera is required for ASL");
            return;
        }

        try {
            await setupAslHands();
            aslOnRef.current = true;
            setAslOn(true);
            currentAslWordRef.current = "";
            lastAslLetterRef.current = "";
            lastAslTimeRef.current = Date.now();
            setAslPreview("");
            runAslFrame();
        } catch {
            displayToast("ASL detection unavailable");
        }
    };

    const stopAslMode = () => {
        aslOnRef.current = false;
        setAslOn(false);
        currentAslWordRef.current = "";
        lastAslLetterRef.current = "";
        aslPredictBusyRef.current = false;
        setAslPreview("");

        if (aslFrameIdRef.current) {
            cancelAnimationFrame(aslFrameIdRef.current);
            aslFrameIdRef.current = null;
        }
    };

    const handleAslBtnClick = () => {
        if (aslOn) {
            stopAslMode();
        } else {
            startAslMode();
        }
    };

    const toggleAslOutputMode = () => {
        const nextMode = aslOutputModeRef.current === "letter" ? "word" : "letter";
        aslOutputModeRef.current = nextMode;
        setAslOutputMode(nextMode);
        currentAslWordRef.current = "";
        lastAslLetterRef.current = "";
        setAslPreview("");
    };

    return (
        <div className="meeting-body-wrapper">
            {/* LOADER */}
            {isLoading && (
                <div id="meetingLoader" className="meeting-loader">
                    <div className="meeting-loader-card">
                        <div className="meeting-spinner"></div>
                        <p id="meetingLoaderText">{loaderText}</p>
                    </div>
                </div>
            )}

            {/* TOP BAR */}
            <div className="topbar">
                <div className="app-logo">
                    <div className="app-logo-mark">SM</div>
                    <span className="app-logo-text">SovaMeet</span>
                </div>

                <div id="meetingTitle" className="meeting-title">{meetingTitle}</div>

                <div className="meeting-info">
                    <div className="meeting-meta">
                        <span className="meeting-label">Meeting ID</span>
                        <span id="roomId">{roomId}</span>
                    </div>

                    <button className="copy-btn" onClick={copyRoomId} title="Copy meeting ID" aria-label="Copy meeting ID">
                        <i className="fa-regular fa-copy"></i>
                    </button>

                    <ThemeToggle />
                </div>
            </div>

            {/* MAIN PORTAL AREA */}
            <div className="main">
                {/* VIDEO TILES */}
                <div id="videoGrid" ref={videoGridRef} className="video-grid"></div>

                {/* CHAT/ASL SIDEBAR */}
                <div id="chatPanel" className={`asl-panel ${isChatOpen ? "" : "hidden"}`}>
                    <div className="panel-header">
                        <div>
                            <h3>Conversation Hub</h3>
                            <p>Chat and ASL support in one place.</p>
                        </div>
                    </div>

                    <div id="chatBox" ref={chatBoxRef}></div>

                    {showAslPreview && (
                        <div id="aslLivePreview" className="asl-live-preview">
                            {aslPreviewText}
                        </div>
                    )}

                    <div className="chat-input">
                        <input 
                            id="messageInput" 
                            ref={messageInputRef}
                            placeholder="Type message" 
                            onKeyDown={handleInputKeyDown}
                        />
                        <button onClick={handleSendMessage} title="Send message" aria-label="Send message">
                            <i className="fa-solid fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* CONTROL BAR */}
            <div className="controls">
                <div className="controls-bar">
                    <button 
                        id="aslBtn" 
                        className={`control-btn ${aslOn ? "active" : ""}`} 
                        onClick={handleAslBtnClick}
                        title="Enable ASL Translation" 
                        aria-label="Enable ASL Translation"
                    >
                        <i className="fa-solid fa-hands"></i>
                        <span className="tooltip-label">Enable ASL Translation</span>
                    </button>

                    <button
                        id="aslModeBtn"
                        className={`control-btn asl-mode-btn ${aslOutputMode === "word" ? "word" : "letter"}`}
                        onClick={toggleAslOutputMode}
                        title={aslOutputMode === "word" ? "ASL word mode" : "ASL letter mode"}
                        aria-label={aslOutputMode === "word" ? "Switch ASL to letter mode" : "Switch ASL to word mode"}
                    >
                        <span>{aslOutputMode === "word" ? "W" : "A"}</span>
                        <span className="tooltip-label">{aslOutputMode === "word" ? "Word Mode" : "Letter Mode"}</span>
                    </button>

                    <button 
                        id="chatBtn" 
                        className={`control-btn ${isChatOpen ? "active" : ""}`} 
                        onClick={toggleChat}
                        title="Open Chat" 
                        aria-label="Open Chat"
                    >
                        <i className="fa-regular fa-message"></i>
                        <span className="tooltip-label">Open Chat</span>
                    </button>

                    <button 
                        id="micBtn" 
                        className={`control-btn ${micOn ? "active" : "off"}`} 
                        onClick={toggleMic}
                        title="Toggle Microphone" 
                        aria-label="Toggle Microphone"
                    >
                        <i className={`fa-solid ${micOn ? "fa-microphone" : "fa-microphone-slash"}`}></i>
                        <span className="tooltip-label">Toggle Microphone</span>
                    </button>

                    <button 
                        id="videoBtn" 
                        className={`control-btn ${videoOn ? "active" : "off"}`} 
                        onClick={toggleVideo}
                        title="Toggle Camera" 
                        aria-label="Toggle Camera"
                    >
                        <i className={`fa-solid ${videoOn ? "fa-video" : "fa-video-slash"}`}></i>
                        <span className="tooltip-label">Toggle Camera</span>
                    </button>

                    <button 
                        className="control-btn end" 
                        onClick={endCall} 
                        title="End Call" 
                        aria-label="End Call"
                    >
                        <i className="fa-solid fa-phone-slash"></i>
                        <span className="tooltip-label">End Call</span>
                    </button>
                </div>
            </div>

            {/* TOAST */}
            <div id="meetingToast" className={`meeting-toast ${showToast ? "" : "hidden"}`}>
                {toastMessage}
            </div>
        </div>
    );
}
