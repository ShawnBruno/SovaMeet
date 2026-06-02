"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "../ThemeToggle";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";
const REQUEST_TIMEOUT_MS = 8000;

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

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [isSidebarClosed, setIsSidebarClosed] = useState(true);

    // Modal state
    const [activeModalMode, setActiveModalMode] = useState(""); // "", "start", "join", "generate"
    const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
    const [modalMessage, setModalMessage] = useState("");
    const [isModalMessageError, setIsModalMessageError] = useState(false);

    // Inputs
    const [startTitle, setStartTitle] = useState("");
    const [joinId, setJoinId] = useState("");
    const [generateTitle, setGenerateTitle] = useState("");
    const [scheduleTime, setScheduleTime] = useState("");

    // Generated ID details
    const [generatedMeetingId, setGeneratedMeetingId] = useState("");
    const [generatedMeetingTitle, setGeneratedMeetingTitle] = useState("");
    const [countdownText, setCountdownText] = useState("Expires in: 30:00");
    const [generatedNotificationTime, setGeneratedNotificationTime] = useState("");

    // Toast state
    const [toastMessage, setToastMessage] = useState("");
    const [showToast, setShowToast] = useState(false);

    // Suspension state
    const [isSuspended, setIsSuspended] = useState(false);

    // Timer refs
    const countdownIntervalRef = useRef(null);
    const notificationTimeoutRef = useRef(null);
    const toastTimeoutRef = useRef(null);

    // Apply body className dynamically
    useEffect(() => {
        document.body.classList.add("dashboard");
        return () => {
            document.body.classList.remove("dashboard");
        };
    }, []);

    // 1. Session check on mount
    useEffect(() => {
        const storedUser = sessionStorage.getItem("user");
        if (!storedUser) {
            router.push("/");
            return;
        }
        setUser(JSON.parse(storedUser));
    }, [router]);

    // 2. Validate user suspension status every 10 seconds
    useEffect(() => {
        if (!user) return;

        const validateUserStatus = async () => {
            try {
                const res = await fetchWithTimeout(`${API_BASE}/api/auth/status/${user._id}`);
                if (!res.ok) throw new Error();

                const status = await res.json();

                if (status.suspended) {
                    setIsSuspended(true);
                }
            } catch {
                displayToast("Unable to validate account status");
            }
        };

        validateUserStatus(); // Initial call
        const interval = setInterval(validateUserStatus, 10000);

        return () => clearInterval(interval);
    }, [user]);

    // 3. Close modal on ESC and handle Enter submit
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                closeActionModal();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeModalMode, startTitle, joinId, generateTitle, scheduleTime]);

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

    const clearCountdownTimer = () => {
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
    };

    const clearNotificationTimer = () => {
        if (notificationTimeoutRef.current) {
            clearTimeout(notificationTimeoutRef.current);
            notificationTimeoutRef.current = null;
        }
    };

    const formatDateTimeInputValue = (date) => {
        const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return offsetDate.toISOString().slice(0, 16);
    };

    const formatDisplayTime = (dateValue) => {
        if (!dateValue) return "";
        return new Date(dateValue).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const formatCountdown = (msRemaining) => {
        const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    };

    const startCountdown = (expiryTime) => {
        clearCountdownTimer();
        const deadline = expiryTime ? new Date(expiryTime).getTime() : Date.now() + 30 * 60 * 1000;

        const updateCountdown = () => {
            const msRemaining = deadline - Date.now();

            if (msRemaining <= 0) {
                clearCountdownTimer();
                setGeneratedMeetingId("");
                displayToast("Meeting ID expired");
                closeActionModal();
                return;
            }

            setCountdownText(`Expires in: ${formatCountdown(msRemaining)}`);
        };

        updateCountdown();
        countdownIntervalRef.current = setInterval(updateCountdown, 1000);
    };

    const showMeetingNotification = (title, meetingId) => {
        const message = `${title || "Your meeting"} is scheduled now. Meeting ID: ${meetingId}`;
        displayToast(message);

        if (!("Notification" in window)) return;

        if (Notification.permission === "granted") {
            new Notification("SovaMeet meeting reminder", { body: message });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then((permission) => {
                if (permission === "granted") {
                    new Notification("SovaMeet meeting reminder", { body: message });
                }
            });
        }
    };

    const scheduleMeetingNotification = (notificationTime, title, meetingId) => {
        clearNotificationTimer();
        if (!notificationTime) return;

        const delay = new Date(notificationTime).getTime() - Date.now();

        if (delay <= 0) {
            showMeetingNotification(title, meetingId);
            return;
        }

        notificationTimeoutRef.current = setTimeout(() => {
            showMeetingNotification(title, meetingId);
        }, delay);
    };

    const resetModalState = () => {
        setActiveModalMode("");
        setModalMessage("");
        setIsModalMessageError(false);
        setStartTitle("");
        setJoinId("");
        setGenerateTitle("");
        setScheduleTime("");
        setGeneratedMeetingId("");
        setGeneratedMeetingTitle("");
        setGeneratedNotificationTime("");
        setCountdownText("Expires in: 30:00");
        setIsCreatingMeeting(false);
        clearCountdownTimer();
    };

    const openActionModal = (mode) => {
        resetModalState();
        setActiveModalMode(mode);

        if (mode === "start") {
            setModalMessage("Add a title if you want, then start the room immediately.");
        } else if (mode === "join") {
            setModalMessage("Enter the meeting ID to join an existing room.");
        } else if (mode === "generate") {
            setScheduleTime(formatDateTimeInputValue(new Date(Date.now() + 5 * 60 * 1000)));
            setModalMessage("Choose a reminder time, then generate and copy the meeting ID.");
        }
    };

    const closeActionModal = () => {
        if (isCreatingMeeting) return;
        resetModalState();
    };

    const createMeetingRequest = async (meetingTitle, notificationTime = "") => {
            const res = await fetchWithTimeout(`${API_BASE}/api/meeting/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                userId: user._id,
                meetingTitle,
                notificationTime
            })
        });
        return res.json();
    };

    const validateMeetingJoin = async (meetingId) => {
        const res = await fetchWithTimeout(`${API_BASE}/api/meeting/join`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ meetingId })
        });
        return res.json();
    };

    const handleStartMeeting = async () => {
        if (isCreatingMeeting) return;

        setIsCreatingMeeting(true);
        try {
            const data = await createMeetingRequest(startTitle.trim());
            sessionStorage.setItem(`meetingTitle:${data.meetingId}`, data.meetingTitle || "");
            router.push(`/meeting?id=${data.meetingId}`);
        } catch {
            displayToast("Unable to create meeting. Please try again.");
            setIsCreatingMeeting(false);
        }
    };

    const handleJoinMeeting = async () => {
        const id = joinId.trim();
        if (!id) return;

        setIsCreatingMeeting(true);
        setModalMessage("Joining meeting...");
        setIsModalMessageError(false);

        try {
            const data = await validateMeetingJoin(id);

            if (data.message !== "Joined successfully") {
                setModalMessage("Invalid or expired meeting ID");
                setIsModalMessageError(true);
                setIsCreatingMeeting(false);
                return;
            }

            if (data.meetingTitle) {
                sessionStorage.setItem(`meetingTitle:${id}`, data.meetingTitle);
            }

            router.push(`/meeting?id=${id}`);
        } catch {
            setModalMessage("Invalid or expired meeting ID");
            setIsModalMessageError(true);
            setIsCreatingMeeting(false);
        }
    };

    const handleGenerateMeeting = async () => {
        if (!scheduleTime) {
            setModalMessage("Please choose a notification time.");
            setIsModalMessageError(true);
            return;
        }

        setIsCreatingMeeting(true);
        try {
            const data = await createMeetingRequest(generateTitle.trim(), new Date(scheduleTime).toISOString());

            if (data.message) {
                setModalMessage(data.message);
                setIsModalMessageError(true);
                return;
            }

            setGeneratedMeetingId(data.meetingId);
            setGeneratedMeetingTitle(data.meetingTitle || "Untitled meeting");
            setGeneratedNotificationTime(data.notificationTime || "");
            sessionStorage.setItem(`meetingTitle:${data.meetingId}`, data.meetingTitle || "");
            setModalMessage(data.meetingTitle ? `Title: ${data.meetingTitle}` : "Title: Untitled meeting");
            setIsModalMessageError(false);
            if ("Notification" in window && Notification.permission === "default") {
                Notification.requestPermission();
            }
            startCountdown(data.expiryTime);
            scheduleMeetingNotification(data.notificationTime, data.meetingTitle || "Untitled meeting", data.meetingId);
        } catch {
            setModalMessage("Unable to generate meeting ID. Please try again.");
            setIsModalMessageError(true);
        } finally {
            setIsCreatingMeeting(false);
        }
    };

    const handleModalPrimaryAction = () => {
        if (activeModalMode === "start") {
            handleStartMeeting();
        } else if (activeModalMode === "join") {
            handleJoinMeeting();
        } else if (activeModalMode === "generate") {
            handleGenerateMeeting();
        }
    };

    const copyGeneratedMeetingId = () => {
        if (!generatedMeetingId) return;
        navigator.clipboard.writeText(generatedMeetingId);
        displayToast("Copied to clipboard");
    };

    const logout = () => {
        sessionStorage.removeItem("user");
        router.push("/");
    };

    const logoutSuspendedUser = () => {
        sessionStorage.clear();
        router.push("/");
    };

    const toggleSidebar = () => {
        setIsSidebarClosed(!isSidebarClosed);
    };

    // Form submit listener for modals
    const handleFormSubmit = (e) => {
        e.preventDefault();
        handleModalPrimaryAction();
    };

    return (
        <div className="layout-body-wrapper">
            <div className="layout">
                {/* TOP NAV */}
                <div className="top-nav">
                    <div className="app-logo">
                        <div className="app-logo-mark">SM</div>
                        <span className="app-logo-text">SovaMeet</span>
                    </div>

                    <div className="top-actions">
                        <ThemeToggle />
                        <button onClick={logout} title="Logout" aria-label="Logout">
                            <i className="fa-solid fa-right-from-bracket"></i>
                        </button>
                    </div>
                </div>

                {/* MAIN BODY */}
                <div className="body">
                    {/* SIDEBAR */}
                    <div className={`sidebar ${isSidebarClosed ? "closed" : ""}`}>
                        <div className="menu-toggle" onClick={toggleSidebar}>&#9776;</div>

                        <ul>
                            <li className="active"><i className="fa-solid fa-house"></i> <span>Dashboard</span></li>
                            <li><i className="fa-solid fa-clock"></i> <span>History</span></li>
                            <li onClick={() => router.push("/report")}><i className="fa-solid fa-flag"></i> <span>Report</span></li>
                            <li onClick={() => router.push("/contact")}><i className="fa-solid fa-envelope"></i> <span>Contact Admin</span></li>
                            <li><i className="fa-solid fa-gear"></i> <span>Settings</span></li>
                            <li onClick={logout}><i className="fa-solid fa-right-from-bracket"></i> <span>Logout</span></li>
                        </ul>
                    </div>

                    {/* CONTENT MAIN */}
                    <div className="main">
                        <h1 id="welcomeText">Welcome{user ? `, ${user.name}` : ""}</h1>
                        <p className="page-subtitle">Start now, generate a reusable room ID, or join an existing meeting.</p>

                        <div className="cards">
                            <div id="instantMeetingCard" className="card" onClick={() => openActionModal("start")} disabled={isSuspended}>
                                <i className="fa-solid fa-video"></i>
                                <p>Instant Meeting</p>
                            </div>

                            <div id="generateIdCard" className="card" onClick={() => openActionModal("generate")} disabled={isSuspended}>
                                <i className="fa-solid fa-key"></i>
                                <p>Generate ID</p>
                            </div>

                            <div className="card" onClick={() => openActionModal("join")} disabled={isSuspended}>
                                <i className="fa-solid fa-users"></i>
                                <p>Join Meeting</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ACTION MODAL */}
            {activeModalMode && (
                <div id="actionModal" className="meeting-modal" role="dialog" aria-modal="true">
                    <form className="meeting-modal-card" onSubmit={handleFormSubmit}>
                        <div className="meeting-modal-header">
                            <h3 id="actionModalTitle">
                                {activeModalMode === "start" && "Start Instant Meeting"}
                                {activeModalMode === "join" && "Join Meeting"}
                                {activeModalMode === "generate" && "Generate Meeting ID"}
                            </h3>
                            <button 
                                type="button" 
                                className="meeting-close-btn" 
                                onClick={closeActionModal} 
                                aria-label="Close meeting popup"
                                disabled={isCreatingMeeting}
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <div id="modalMessage" className={`modal-message ${modalMessage ? "" : "hidden"} ${isModalMessageError ? "error" : ""}`}>
                            {modalMessage}
                        </div>

                        {/* Instant Meeting Section */}
                        {activeModalMode === "start" && (
                            <div id="startMeetingSection" className="modal-section">
                                <div className="meeting-form-group">
                                    <label htmlFor="startMeetingTitleInput">Meeting Title</label>
                                    <input 
                                        id="startMeetingTitleInput" 
                                        type="text" 
                                        maxLength={80} 
                                        placeholder="Optional meeting title"
                                        value={startTitle}
                                        onChange={(e) => setStartTitle(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                        )}

                        {/* Join Meeting Section */}
                        {activeModalMode === "join" && (
                            <div id="joinMeetingSection" className="modal-section">
                                <div className="meeting-form-group">
                                    <label htmlFor="joinMeetingIdInput">Meeting ID</label>
                                    <input 
                                        id="joinMeetingIdInput" 
                                        type="text" 
                                        placeholder="Enter meeting ID"
                                        value={joinId}
                                        onChange={(e) => setJoinId(e.target.value)}
                                        autoFocus
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {/* Generate ID Section */}
                        {activeModalMode === "generate" && (
                            <div id="generateIdSection" className="modal-section">
                                <div className="meeting-form-group">
                                    <label htmlFor="generateMeetingTitleInput">Meeting Title</label>
                                    <input 
                                        id="generateMeetingTitleInput" 
                                        type="text" 
                                        maxLength={80} 
                                        placeholder="Optional meeting title"
                                        value={generateTitle}
                                        onChange={(e) => setGenerateTitle(e.target.value)}
                                        disabled={!!generatedMeetingId}
                                        autoFocus
                                    />
                                </div>

                                <div className="meeting-form-group">
                                    <label htmlFor="scheduleTimeInput">Notification Time</label>
                                    <input
                                        id="scheduleTimeInput"
                                        type="datetime-local"
                                        value={scheduleTime}
                                        min={formatDateTimeInputValue(new Date())}
                                        onChange={(e) => setScheduleTime(e.target.value)}
                                        disabled={!!generatedMeetingId}
                                        required
                                    />
                                </div>

                                {generatedMeetingId && (
                                    <div id="generatedIdResult" className="generated-id-box">
                                        <div className="generated-id-label">Generated Meeting ID</div>
                                        <div className="generated-id-row">
                                            <span id="generatedMeetingId">{generatedMeetingId}</span>
                                            <button 
                                                id="copyGeneratedMeetingBtn" 
                                                className="copy-action-btn" 
                                                type="button"
                                                onClick={copyGeneratedMeetingId} 
                                                title="Copy generated meeting ID" 
                                                aria-label="Copy generated meeting ID"
                                            >
                                                <i className="fa-regular fa-copy"></i>
                                            </button>
                                        </div>
                                        {generatedNotificationTime && (
                                            <p className="schedule-note">
                                                Notification: {formatDisplayTime(generatedNotificationTime)}
                                            </p>
                                        )}
                                        <p className="expiry-note">This meeting ID will expire 30 minutes after notification time</p>
                                        <p id="generatedMeetingCountdown" className="countdown-text">{countdownText}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="meeting-actions">
                            {!generatedMeetingId && (
                                <button 
                                    type="button" 
                                    id="modalSecondaryBtn" 
                                    className="meeting-secondary-btn" 
                                    onClick={closeActionModal}
                                    disabled={isCreatingMeeting}
                                >
                                    Cancel
                                </button>
                            )}

                            <button 
                                type="submit" 
                                id="modalPrimaryBtn" 
                                className="meeting-primary-btn" 
                                disabled={isCreatingMeeting || (activeModalMode === "join" && !joinId)}
                            >
                                {isCreatingMeeting ? (
                                    activeModalMode === "start" ? "Creating..." :
                                    activeModalMode === "join" ? "Joining..." : "Generating..."
                                ) : (
                                    activeModalMode === "start" ? "Start Now" :
                                    activeModalMode === "join" ? "Join" : 
                                    generatedMeetingId ? "Generate New" : "Generate"
                                )}
                            </button>

                            {generatedMeetingId && (
                                <button 
                                    type="button" 
                                    id="modalCloseBtn" 
                                    className="meeting-secondary-btn" 
                                    onClick={closeActionModal}
                                >
                                    Close
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            )}

            {/* TOAST NOTIFICATION */}
            <div id="dashboardToast" className={`app-toast ${showToast ? "" : "hidden"}`}>
                {toastMessage}
            </div>

            {/* SUSPENSION MODAL */}
            {isSuspended && (
                <div id="suspensionModal" className="suspension-modal" role="dialog" aria-modal="true" aria-labelledby="suspensionTitle">
                    <div className="suspension-modal-card">
                        <div className="suspension-icon">
                            <i className="fa-solid fa-user-lock"></i>
                        </div>
                        <h2 id="suspensionTitle">Account Suspended</h2>
                        <p>Your account has been suspended by the administrator.</p>
                        <div className="suspension-actions">
                            <button type="button" onClick={() => router.push("/contact")}>
                                <i className="fa-solid fa-envelope"></i>
                                Contact Admin
                            </button>
                            <button type="button" onClick={() => router.push("/report")}>
                                <i className="fa-solid fa-flag"></i>
                                Report Issue
                            </button>
                            <button type="button" className="suspension-logout-btn" onClick={logoutSuspendedUser}>
                                <i className="fa-solid fa-right-from-bracket"></i>
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
