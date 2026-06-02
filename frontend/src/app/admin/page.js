"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "../ThemeToggle";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

export default function AdminPage() {
    const router = useRouter();
    const [isSidebarClosed, setIsSidebarClosed] = useState(true);
    const [activeSection, setActiveSection] = useState("users"); // "users" or "reports"

    // Data lists
    const [usersList, setUsersList] = useState([]);
    const [reportsList, setReportsList] = useState([]);
    const [selectedReportId, setSelectedReportId] = useState(null);

    // Loaders & feedback
    const [isUsersLoading, setIsUsersLoading] = useState(false);
    const [isReportsLoading, setIsReportsLoading] = useState(false);

    // Apply body className dynamically
    useEffect(() => {
        document.body.classList.add("admin");
        return () => {
            document.body.classList.remove("admin");
        };
    }, []);

    // Load initial section data on mount
    useEffect(() => {
        if (activeSection === "users") {
            loadUsers();
        } else if (activeSection === "reports") {
            loadReports();
        }
    }, [activeSection]);

    const toggleSidebar = () => {
        setIsSidebarClosed(!isSidebarClosed);
    };

    const handleSectionSwitch = (section) => {
        setActiveSection(section);
    };

    const loadUsers = async () => {
        setIsUsersLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/auth/users`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setUsersList(data);
        } catch (err) {
            console.error("Unable to load users", err);
        } finally {
            setIsUsersLoading(false);
        }
    };

    const loadReports = async () => {
        setIsReportsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/report/all`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setReportsList(data);
            setSelectedReportId(null);
        } catch (err) {
            console.error("Unable to load reports", err);
        } finally {
            setIsReportsLoading(false);
        }
    };

    const deleteUser = async (id) => {
        if (!confirm("Are you sure you want to delete this user?")) return;

        try {
            const res = await fetch(`${API_BASE}/api/auth/users/${id}`, {
                method: "DELETE"
            });
            if (res.ok) {
                loadUsers();
            }
        } catch (err) {
            alert("Error deleting user");
        }
    };

    const toggleSuspendUser = async (id) => {
        try {
            const res = await fetch(`${API_BASE}/api/auth/users/suspend/${id}`, {
                method: "PUT"
            });
            if (res.ok) {
                loadUsers();
            }
        } catch (err) {
            alert("Error toggling user suspension status");
        }
    };

    const logout = () => {
        sessionStorage.clear();
        router.push("/");
    };

    const getReportId = (report, index) => {
        return report._id || `report-${index}`;
    };

    const getDescriptionPreview = (description) => {
        const text = String(description || "");
        if (text.length <= 120) return text;
        return `${text.slice(0, 120).trim()}...`;
    };

    const selectedReport = reportsList.find((item, index) => getReportId(item, index) === selectedReportId);

    return (
        <div className="admin-body-wrapper">
            <div className="admin-layout">
                {/* TOP BAR */}
                <div className="top-nav">
                    <h2>SovaMeet</h2>

                    <div className="top-actions">
                        <ThemeToggle />
                        <button onClick={logout} title="Logout" aria-label="Logout">
                            <i className="fa-solid fa-right-from-bracket"></i>
                        </button>
                    </div>
                </div>

                {/* BODY */}
                <div className="admin-body">
                    {/* SIDEBAR */}
                    <div className={`sidebar ${isSidebarClosed ? "closed" : ""}`}>
                        <i className="fa-solid fa-bars menu-btn" onClick={toggleSidebar}></i>
                        <ul>
                            <li className={activeSection === "users" ? "active" : ""} onClick={() => handleSectionSwitch("users")}>
                                <i className="fa-solid fa-users"></i>
                                <span>Users</span>
                            </li>
                            <li className={activeSection === "reports" ? "active" : ""} onClick={() => handleSectionSwitch("reports")}>
                                <i className="fa-solid fa-bug"></i>
                                <span>Reports</span>
                            </li>
                        </ul>
                    </div>

                    {/* MAIN */}
                    <div className="main">
                        <h1>Admin Panel</h1>

                        {/* USERS SECTION */}
                        {activeSection === "users" && (
                            <div id="usersSection">
                                <div className="top-bar">
                                    <h2>Users</h2>
                                    <button className="load-btn" onClick={loadUsers} disabled={isUsersLoading}>
                                        {isUsersLoading ? "Loading..." : "Load Users"}
                                    </button>
                                </div>

                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Email</th>
                                                <th>Actions</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {usersList.map((user) => (
                                                <tr key={user._id}>
                                                    <td>{user.name}</td>
                                                    <td>{user.email}</td>
                                                    <td>
                                                        <button className="delete" onClick={() => deleteUser(user._id)}>
                                                            Delete
                                                        </button>
                                                        <button className="suspend" onClick={() => toggleSuspendUser(user._id)}>
                                                            {user.suspended ? "Activate" : "Suspend"}
                                                        </button>
                                                    </td>
                                                    <td>
                                                        {user.suspended ? (
                                                            <span style={{ color: "red" }}>Suspended</span>
                                                        ) : (
                                                            <span style={{ color: "lightgreen" }}>Active</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {usersList.length === 0 && !isUsersLoading && (
                                                <tr>
                                                    <td colSpan="4" style={{ textAlign: "center" }}>No users registered yet.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* REPORTS SECTION */}
                        {activeSection === "reports" && (
                            <div id="reportsSection">
                                <div className="top-bar">
                                    <h2>Reports</h2>
                                    <button className="load-btn" onClick={loadReports} disabled={isReportsLoading}>
                                        {isReportsLoading ? "Refreshing..." : "Refresh Reports"}
                                    </button>
                                </div>

                                <div className="reports-dashboard">
                                    <div id="reportsList" className="reports-list">
                                        {reportsList.map((report, index) => {
                                            const reportId = getReportId(report, index);
                                            const submittedAt = report.createdAt
                                                ? new Date(report.createdAt).toLocaleString()
                                                : "Date unavailable";

                                            return (
                                                <div 
                                                    key={reportId}
                                                    className={`report-card ${selectedReportId === reportId ? "selected" : ""}`}
                                                    onClick={() => setSelectedReportId(reportId)}
                                                >
                                                    <div className="report-card-header">
                                                        <div>
                                                            <h3>{report.name}</h3>
                                                            <div className="report-email">{report.email}</div>
                                                        </div>
                                                        <div>
                                                            <span className="report-type">{report.issueType}</span>
                                                            <div className="report-date">{submittedAt}</div>
                                                        </div>
                                                    </div>
                                                    <p className="report-preview">{getDescriptionPreview(report.description)}</p>
                                                </div>
                                            );
                                        })}
                                        {reportsList.length === 0 && !isReportsLoading && (
                                            <div className="reports-empty">No reports submitted yet.</div>
                                        )}
                                    </div>

                                    <div id="reportDetailPanel" className="report-detail-panel">
                                        {selectedReport ? (
                                            <>
                                                <div className="report-detail-header">
                                                    <div>
                                                        <span className="report-type">{selectedReport.issueType}</span>
                                                        <h3>{selectedReport.name}</h3>
                                                        <p>{selectedReport.email}</p>
                                                    </div>
                                                    <div className="report-date">
                                                        {selectedReport.createdAt 
                                                            ? new Date(selectedReport.createdAt).toLocaleString() 
                                                            : "Date unavailable"}
                                                    </div>
                                                </div>

                                                <div className="report-detail-grid">
                                                    <div>
                                                        <span>Name</span>
                                                        <strong>{selectedReport.name}</strong>
                                                    </div>
                                                    <div>
                                                        <span>Email</span>
                                                        <strong>{selectedReport.email}</strong>
                                                    </div>
                                                    <div>
                                                        <span>Issue Type</span>
                                                        <strong>{selectedReport.issueType}</strong>
                                                    </div>
                                                    <div>
                                                        <span>Date/Time</span>
                                                        <strong>
                                                            {selectedReport.createdAt 
                                                                ? new Date(selectedReport.createdAt).toLocaleString() 
                                                                : "Date unavailable"}
                                                        </strong>
                                                    </div>
                                                </div>

                                                <div className="report-detail-description">
                                                    <span>Full Description</span>
                                                    <p>{selectedReport.description}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="report-detail-placeholder">Select a report to view details.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
