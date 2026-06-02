"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "../ThemeToggle";

export default function ContactPage() {
    const router = useRouter();

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
                    <span className="support-kicker">Support</span>
                    <h1>Contact Admin</h1>
                    <p className="support-message">
                        For account access, meeting issues, or SovaMeet support, contact the administrator below.
                    </p>

                    <div className="contact-grid">
                        <div className="contact-item">
                            <span>Name</span>
                            <strong>Shawn Bruno</strong>
                        </div>
                        <div className="contact-item">
                            <span>Email</span>
                            <strong>sauravraymondal6@gmail.com</strong>
                        </div>
                        <div className="contact-item">
                            <span>Organization</span>
                            <strong>Trusnetix</strong>
                        </div>
                        <div className="contact-item">
                            <span>Campus</span>
                            <strong>Azara Campus, Assam, India</strong>
                        </div>
                        <div className="contact-item">
                            <span>Role</span>
                            <strong>Developer of SovaMeet</strong>
                        </div>
                    </div>

                    <div className="support-actions">
                        <a className="support-btn" href="mailto:sauravraymondal6@gmail.com">
                            <i className="fa-solid fa-envelope"></i>
                            Email Admin
                        </a>
                        <button className="support-btn secondary" type="button" onClick={goBackSmart}>
                            <i className="fa-solid fa-arrow-left"></i>
                            Back to Home
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
}
