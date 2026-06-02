"use client";

import React from "react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function LandingPage() {
    React.useEffect(() => {
        document.body.classList.add("landing");
        return () => {
            document.body.classList.remove("landing");
        };
    }, []);

    return (
        <div className="landing-body-wrapper">
            <div className="navbar">
                <div className="app-logo">
                    <div className="app-logo-mark">SM</div>
                    <span className="app-logo-text">SovaMeet</span>
                </div>

                <div className="nav-links">
                    <Link href="/">Home</Link>
                    <Link href="/contact">Contact</Link>
                    <Link href="/report">Report</Link>
                    <Link href="/login">Log-In</Link>
                    <ThemeToggle />
                </div>
            </div>

            <div className="hero">
                <h1>Welcome to Sova Meet</h1>
                <p>
                    We bring you the first video conferencing with{" "}
                    <span className="highlight">AI power</span> Sign Language translator.
                </p>

                <Link href="/signup">
                    <button type="button">Start Now</button>
                </Link>
            </div>

            <div className="footer">
                <span>SovaMeet</span>

                <div className="social">
                    <i className="fab fa-x-twitter"></i>
                    <i className="fab fa-facebook"></i>
                    <i className="fab fa-instagram"></i>
                </div>
            </div>
        </div>
    );
}
