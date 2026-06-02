const express = require("express");
const router = express.Router();

let meetings = [];

function generateMeetingId() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let meetingId = "";

    do {
        meetingId = "";

        for (let index = 0; index < 6; index += 1) {
            meetingId += chars[Math.floor(Math.random() * chars.length)];
        }
    } while (meetings.some(meeting => meeting.meetingId === meetingId));

    return meetingId;
}

router.post("/create", (req, res) => {
    const { userId, meetingTitle, notificationTime } = req.body;

    const meetingId = generateMeetingId();
    const createdAt = new Date();
    const scheduledNotificationTime = notificationTime ? new Date(notificationTime) : createdAt;

    if (Number.isNaN(scheduledNotificationTime.getTime())) {
        return res.status(400).json({ message: "Invalid notification time" });
    }

    const expiryTime = new Date(scheduledNotificationTime.getTime() + 30 * 60 * 1000);

    const meeting = {
        meetingId,
        meetingTitle: meetingTitle || "",
        hostId: userId,
        createdAt,
        notificationTime: scheduledNotificationTime,
        expiryTime
    };

    meetings.push(meeting);

    res.json({
        meetingId,
        meetingTitle: meeting.meetingTitle,
        notificationTime: meeting.notificationTime,
        expiryTime: meeting.expiryTime
    });
});

router.post("/join", (req, res) => {
    const { meetingId } = req.body;

    const meeting = meetings.find(m => m.meetingId === meetingId);

    if (!meeting) {
        return res.json({ message: "Meeting not found" });
    }

    if (new Date() > new Date(meeting.expiryTime)) {
        return res.json({ message: "Meeting expired" });
    }

    res.json({
        message: "Joined successfully",
        meetingTitle: meeting.meetingTitle || ""
    });
});

module.exports = router;
