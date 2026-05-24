import express from "express";
import cors from "cors";
import path from "path";
import { spawn } from "child_process";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let isSimulationRunning = false;
let droppedPackages: number[] = [];

app.get("/", (req, res) => {
    res.json({ status: "ok" });
});

app.get("/health", (req, res) => {
    res.json({ status: "healthy" });
});

app.get("/api/status", (req, res) => {
    res.json({ isRunning: isSimulationRunning });
});

app.get("/api/dropped-packages", (req, res) => {
    res.json({ droppedPackages });
});

app.get("/api/run", (req, res) => {
    if (isSimulationRunning) {
        res.status(409).json({ error: "Simulation already running" });
        return;
    }

    isSimulationRunning = true;
    droppedPackages = []; // Reset on new run
    
    const simsDir = path.resolve(__dirname, "..", "sims");
    const jarPath = path.join(simsDir, "DroneDeliverySim.jar");

    const child = spawn('java', ['-jar', jarPath], { cwd: simsDir });

    let stdoutData = "";
    let stderrData = "";

    child.stdout.on('data', (data) => {
        stdoutData += data.toString();
    });

    child.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderrData += chunk;
        
        // Split chunk into lines and search for dropped packages
        const lines = chunk.split('\n');
        for (const line of lines) {
            const match = line.match(/Package (\d+) has been dropped\./);
            if (match) {
                droppedPackages.push(parseInt(match[1], 10));
            }
        }
    });

    child.on('close', (code) => {
        isSimulationRunning = false;
        res.json({
            exitCode: code ?? 0,
            stdout: stdoutData,
            stderr: stderrData,
        });
    });
    
    child.on('error', (error) => {
        isSimulationRunning = false;
        res.status(500).json({
            exitCode: 1,
            stdout: stdoutData,
            stderr: stderrData + "\n" + error.message,
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on address http://localhost:${PORT}`);
});