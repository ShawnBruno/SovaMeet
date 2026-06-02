const express = require("express");
const router = express.Router();
const Report = require("../models/Report");

router.post("/create", async (req, res) => {
    try {
        const { name, email, issueType, description } = req.body;

        if (!name || !email || !issueType || !description) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const report = new Report({
            name,
            email,
            issueType,
            description
        });

        await report.save();

        res.json({ message: "Report submitted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Unable to submit report", error: err.message });
    }
});

router.get("/all", async (req, res) => {
    try {
        const reports = await Report.find().sort({ createdAt: -1 });
        res.json(reports);
    } catch (err) {
        res.status(500).json({ message: "Unable to load reports", error: err.message });
    }
});

module.exports = router;
