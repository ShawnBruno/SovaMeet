"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "../ThemeToggle";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

export default function SignupPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Apply body className dynamically
    React.useEffect(() => {
        document.body.classList.add("auth");
        return () => {
            document.body.classList.remove("auth");
        };
    }, []);

    const handleSignup = async (e) => {
        e.preventDefault();

        const trimmedName = name.trim();
        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();

        if (!trimmedName || !trimmedEmail || !trimmedPassword) {
            alert("Please fill in all fields.");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch(`${API_BASE}/api/auth/signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ 
                    name: trimmedName, 
                    email: trimmedEmail, 
                    password: trimmedPassword 
                })
            });

            const data = await res.json();
            alert(data.message);

            if (res.ok) {
                router.push("/login");
            }
        } catch (err) {
            alert("Unable to reach sign-up server. Please try again later.");
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

                <form onSubmit={handleSignup}>
                    <input 
                        id="name" 
                        type="text"
                        placeholder="Name" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
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
                        {isLoading ? "Signing up..." : "Sign Up"}
                    </button>
                </form>

                <p>
                    Already have account? <Link href="/login">Log In</Link>
                </p>
            </div>
        </div>
    );
}
