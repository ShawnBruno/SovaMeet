require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const meetingRoutes = require("./routes/meetingRoutes");
const aslRoutes = require("./routes/aslRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "SovaMeet API server is running" });
});

// ROUTES
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);
app.use("/api/meeting", meetingRoutes);
app.use("/api/asl", aslRoutes);
app.use("/api/report", reportRoutes);

// SOCKET LOGIC
let users = {};

io.on("connection", (socket) => {

    socket.on("join-room", ({ roomId, username }) => {
        socket.join(roomId);

        users[socket.id] = {
            username,
            roomId
        };

        // Get all users already in the room
        const roomUsers = Object.keys(users)
            .filter(id => users[id].roomId === roomId && id !== socket.id)
            .map(id => ({
                socketId: id,
                username: users[id].username
            }));

        // Send existing users to the newly joined user
        socket.emit("existing-users", roomUsers);

        // Notify others that a new user joined
        socket.to(roomId).emit("user-joined", {
            socketId: socket.id,
            username
        });
    });

    socket.on("offer", (data) => {
        const targetSocket = data.target;

        socket.to(targetSocket).emit("offer", {
            offer: data.offer,
            sender: socket.id,
            username: users[socket.id].username
        });
    });

    socket.on("answer", (data) => {
        const targetSocket = data.target;

        socket.to(targetSocket).emit("answer", {
            answer: data.answer,
            sender: socket.id
        });
    });

    socket.on("ice-candidate", (data) => {
        const targetSocket = data.target;

        socket.to(targetSocket).emit("ice-candidate", {
            candidate: data.candidate,
            sender: socket.id
        });
    });

    socket.on("send-message", (data) => {
        io.to(data.roomId).emit("receive-message", data);
    });

    socket.on("disconnect", () => {
        delete users[socket.id];
    });
});

// DB
mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 8000
})
.then(() => console.log("MongoDB Connected"))
.catch(err => console.error("Mongo Error:", err));

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
