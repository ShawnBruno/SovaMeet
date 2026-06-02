

const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// SIGNUP
router.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            name,
            email,
            password: hashedPassword
        });

        await user.save();

        res.json({ message: "Signup successful" });

    } catch (err) {
        res.json({ message: "Error", error: err });
    }
});

// LOGIN
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.json({ message: "All fields required" });
        }

        const user = await User.findOne({ email }).lean();
        if (!user) {
            return res.json({ message: "User not found" });
        }

        if (user.suspended) {
            return res.json({ message: "Your account has been suspended by the administrator." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.json({ message: "Invalid password" });
        }

        res.json({ message: "Login successful", user });

    } catch (err) {
        res.json({ message: "Error", error: err });
    }
});

// GET CURRENT USER STATUS
router.get("/status/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("suspended").lean();

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ suspended: !!user.suspended });
    } catch (err) {
        res.status(500).json({ message: "Error", error: err.message });
    }
});


// GET ALL USERS
router.get("/users", async (req, res) => {
    try {
        const users = await User.find().select("-password").lean();
        res.json(users);
    } catch (err) {
        res.json({ message: "Error", error: err });
    }
});

// DELETE USER
router.delete("/users/:id", async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
});

// SUSPEND USER
router.put("/users/suspend/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.json({ message: "User not found" });
        }

        // TOGGLE
        user.suspended = !user.suspended;

        await user.save();

        res.json({
            message: "User status updated",
            suspended: user.suspended
        });

    } catch (err) {
        res.json({ message: "Error", error: err });
    }
});

module.exports = router;
