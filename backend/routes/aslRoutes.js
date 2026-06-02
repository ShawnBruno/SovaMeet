const express = require("express");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { spawn } = require("child_process");

const router = express.Router();

let predictor = null;
let nextRequestId = 1;
const waitingRequests = new Map();
const REQUEST_TIMEOUT_MS = 5000;

function getPythonCommand(aslDir) {
    const localPythonPath = path.join(aslDir, "asl_live_env", "Scripts", "python.exe");
    const configuredPythonPath = process.env.ASL_PYTHON_PATH;

    if (configuredPythonPath && fs.existsSync(configuredPythonPath)) {
        return { command: configuredPythonPath, args: [] };
    }

    if (fs.existsSync(localPythonPath)) {
        return { command: localPythonPath, args: [] };
    }

    return { command: "py", args: ["-3.11"] };
}

function startPredictor() {
    if (predictor) return predictor;

    const projectRoot = path.join(__dirname, "../..");
    const aslDir = path.join(projectRoot, "ASL_Model");
    const scriptPath = path.join(aslDir, "asl_predict_rf.py");

    if (!fs.existsSync(scriptPath)) {
        throw new Error("ASL prediction script not found");
    }

    const python = getPythonCommand(aslDir);

    predictor = spawn(python.command, [...python.args, "-u", scriptPath], {
        cwd: aslDir,
        env: {
            ...process.env,
            PYTHONUNBUFFERED: "1"
        }
    });

    const output = readline.createInterface({ input: predictor.stdout });

    output.on("line", line => {
        try {
            const data = JSON.parse(line);
            const pending = waitingRequests.get(data.id);

            if (!pending) return;

            waitingRequests.delete(data.id);
            clearTimeout(pending.timeout);
            pending.resolve(data.letter || "");
        } catch {}
    });

    predictor.stderr.on("data", data => {
        console.error(`ASL predictor error: ${data}`);
    });

    predictor.on("close", () => {
        predictor = null;

        waitingRequests.forEach(pending => {
            clearTimeout(pending.timeout);
            pending.reject(new Error("ASL predictor stopped"));
        });

        waitingRequests.clear();
    });

    predictor.on("error", error => {
        console.error("ASL predictor failed:", error);
        predictor = null;
    });

    return predictor;
}

router.post("/predict", async (req, res) => {
    const landmarks = req.body.landmarks;

    if (!Array.isArray(landmarks) || landmarks.length !== 63) {
        return res.status(400).json({ message: "63 landmarks are required" });
    }

    try {
        const predictorProcess = startPredictor();
        const id = nextRequestId;
        nextRequestId += 1;

        const letterPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                waitingRequests.delete(id);
                reject(new Error("ASL prediction timed out"));
            }, REQUEST_TIMEOUT_MS);

            waitingRequests.set(id, { resolve, reject, timeout });
        });

        predictorProcess.stdin.write(`${JSON.stringify({ id, landmarks })}\n`);

        const letter = await letterPromise;
        res.json({ letter });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
