"use client";

import React, { useState } from "react";
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

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMessage, setModalMessage] = useState("");
    const [showSupportActions, setShowSupportActions] = useState(false);

    // Apply body className dynamically
    React.useEffect(() => {
        document.body.classList.add("auth");
        return () => {
            document.body.classList.remove("auth");
        };
    }, []);

    const showLoginModal = (message, support = false) => {
        setModalMessage(message);
        setShowSupportActions(support);
        setModalOpen(true);
    };

    const closeLoginModal = () => {
        setModalOpen(false);
    };

    const handleLogin = async (e) => {
        e.preventDefault();

        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();

        if (!trimmedEmail || !trimmedPassword) {
            showLoginModal("Please enter email and password.");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetchWithTimeout(`${API_BASE}/api/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword })
            });

            const data = await res.json();

            if (data.user) {
                sessionStorage.setItem("user", JSON.stringify(data.user));
                router.push("/dashboard");
            } else {
                const suspendedMessage = "Your account has been suspended by the administrator.";
                const message = data.message || "Unable to sign in. Please try again.";
                const isSuspended = message === suspendedMessage || message.toLowerCase().includes("suspended");
                showLoginModal(isSuspended ? suspendedMessage : message, isSuspended);
            }
        } catch (err) {
            showLoginModal("Unable to reach authentication server. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    };

    const goBack = () => {
        router.push("/");
    };

    return (
        <div className="auth-body-wrapper auth">
            <div className="auth-container">
                <div className="back-icon" onClick={goBack}>
                    <i className="fa-solid fa-arrow-left"></i>
                </div>

                <ThemeToggle className="auth-theme-toggle" />

                <h2>SovaMeet</h2>

                <form onSubmit={handleLogin}>
                    <input 
                        id="email" 
                        type="email"
                        placeholder="Email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input 
                        id="password" 
                        type="password" 
                        placeholder="Password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    <button type="submit" disabled={isLoading}>
                        {isLoading ? "Logging in..." : "Log In"}
                    </button>
                </form>

                <p>
                    Don't have account? <Link href="/signup">Sign Up</Link>
                </p>
            </div>

            {/* ERROR / SUSPENDED MODAL */}
            {modalOpen && (
                <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="loginModalTitle">
                    <div className="auth-modal-card">
                        <button className="auth-modal-close" type="button" onClick={closeLoginModal} aria-label="Close message">
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                        <div className="auth-modal-icon">
                            <i className="fa-solid fa-circle-exclamation"></i>
                        </div>
                        <h3 id="loginModalTitle">Unable to sign in</h3>
                        <p id="loginModalMessage">{modalMessage}</p>
                        
                        <div id="loginModalActions" className={`auth-modal-actions ${showSupportActions ? "" : "hidden"}`}>
                            <Link className="auth-modal-btn" href="/contact">Contact Admin</Link>
                            <Link className="auth-modal-btn secondary" href="/report">Report Issue</Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
