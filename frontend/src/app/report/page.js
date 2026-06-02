"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "../ThemeToggle";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

export default function ReportPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [issueType, setIssueType] = useState("");
    const [description, setDescription] = useState("");
    const [statusMessage, setStatusMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Apply body className dynamically
    useEffect(() => {
        document.body.classList.add("support-page");
        return () => {
            document.body.classList.remove("support-page");
        };
    }, []);

    const goBackSmart = () => {
        const storedUser = sessionStorage.getItem("user");
        if (storedUser) {
            router.push("/dashboard");
        } else {
            router.push("/");
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        const trimmedName = name.trim();
        const trimmedEmail = email.trim();
        const trimmedIssueType = issueType.trim();
        const trimmedDescription = description.trim();

        if (!trimmedName || !trimmedEmail || !trimmedIssueType || !trimmedDescription) {
            setStatusMessage("Please complete all fields before submitting your report.");
            return;
        }

        setIsLoading(true);
        setStatusMessage("");

        try {
            const res = await fetch(`${API_BASE}/api/report/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ 
                    name: trimmedName, 
                    email: trimmedEmail, 
                    issueType: trimmedIssueType, 
                    description: trimmedDescription 
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setStatusMessage(data.message || "Unable to submit report. Please try again.");
                return;
            }

            setStatusMessage(data.message || "Report submitted successfully");
            setName("");
            setEmail("");
            setIssueType("");
            setDescription("");
        } catch (err) {
            setStatusMessage("Unable to submit report. Please check your connection and try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="support-body-wrapper">
            <header className="support-header">
                <div className="app-logo">
                    <div className="app-logo-mark">SM</div>
                    <span className="app-logo-text">SovaMeet</span>
                </div>

                <div className="support-header-actions">
                    <ThemeToggle />
                </div>
            </header>

            <main className="support-shell">
                <section className="support-card">
                    <span className="support-kicker">Report</span>
                    <h1>Report an Issue</h1>
                    <p className="support-message">
                        Share bugs, technical issues, account problems, ASL detection concerns, or meeting issues with the admin team.
                    </p>

                    <form id="reportForm" className="report-form" onSubmit={handleFormSubmit}>
                        <div className="form-row">
                            <div className="form-field">
                                <label htmlFor="name">Name</label>
                                <input 
                                    id="name" 
                                    name="name" 
                                    type="text" 
                                    autoComplete="name" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required 
                                />
                            </div>
                            <div className="form-field">
                                <label htmlFor="email">Email</label>
                                <input 
                                    id="email" 
                                    name="email" 
                                    type="email" 
                                    autoComplete="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required 
                                />
                            </div>
                        </div>

                        <div className="form-field">
                            <label htmlFor="issueType">Issue Type</label>
                            <select 
                                id="issueType" 
                                name="issueType" 
                                value={issueType}
                                onChange={(e) => setIssueType(e.target.value)}
                                required
                            >
                                <option value="">Select issue type</option>
                                <option value="Bug">Bug</option>
                                <option value="Meeting Issue">Meeting Issue</option>
                                <option value="ASL Detection">ASL Detection</option>
                                <option value="Account Problem">Account Problem</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="form-field">
                            <label htmlFor="description">Description</label>
                            <textarea 
                                id="description" 
                                name="description" 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                            />
                        </div>

                        {statusMessage && (
                            <div id="reportStatus" className="report-status visible" role="alert">
                                {statusMessage}
                            </div>
                        )}

                        <div className="support-actions">
                            <button className="support-btn" type="submit" disabled={isLoading}>
                                <i className="fa-solid fa-paper-plane"></i>
                                {isLoading ? "Submitting..." : "Submit Report"}
                            </button>
                            <button className="support-btn secondary" type="button" onClick={goBackSmart}>
                                <i className="fa-solid fa-arrow-left"></i>
                                Back to Home
                            </button>
                        </div>
                    </form>
                </section>
            </main>
        </div>
    );
}
