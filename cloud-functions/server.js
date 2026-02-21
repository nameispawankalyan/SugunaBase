const express = require('express');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);
const multer = require('multer');
const unzipper = require('unzipper');

const app = express();
app.use(express.json());

const FUNCS_DIR = path.join(__dirname, 'functions');
const TEMPLATES_DIR = path.join(__dirname, 'templates');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure directories exist
if (!fs.existsSync(FUNCS_DIR)) fs.mkdirSync(FUNCS_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({ dest: 'uploads/' });

// ==========================================
// 1. LOGIN API (Returns a secure token)
// ==========================================
app.get('/login', (req, res) => {
    const redirectUrl = req.query.redirect;
    // Generate a dummy secure token representing a user login
    const token = 'suguna-sec-' + Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);

    if (redirectUrl) {
        res.redirect(`${redirectUrl}?token=${token}`);
    } else {
        res.send(`<h1>Logged In Successfully!</h1><p>Your Token: ${token}</p>`);
    }
});

// ==========================================
// 1.5 PROJECTS API (Returns User Projects)
// ==========================================
app.get('/projects', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer suguna-sec-')) {
        return res.status(401).send({ error: 'Unauthorized access. Invalid or missing token.' });
    }

    // Dummy data representing projects from a database
    const userProjects = [
        { id: "proj_15", name: "SugunaAuth", isActive: true },
        { id: "proj_16", name: "SugunaChat", isActive: false },
        { id: "proj_17", name: "SugunaEcom", isActive: true }
    ];

    res.json(userProjects);
});

// ==========================================
// 2. DEPLOY API (Receives ZIP via CLI)
// ==========================================
app.post('/deploy-zip/:projectId/:name', upload.single('project_code'), async (req, res) => {
    const projectId = req.params.projectId;
    const funcName = req.params.name;
    const authHeader = req.headers.authorization;

    // Check if the CLI sent a valid token (Simulation)
    if (!authHeader || !authHeader.startsWith('Bearer suguna-sec-')) {
        return res.status(401).send({ error: 'Unauthorized access. Invalid or missing token.' });
    }

    if (!req.file) {
        return res.status(400).send({ error: 'No zip file provided' });
    }

    // Include projectId in the directory structure
    const funcDir = path.join(FUNCS_DIR, projectId, funcName);

    try {
        // Create clean directory for function
        if (fs.existsSync(funcDir)) {
            fs.rmSync(funcDir, { recursive: true, force: true });
        }
        fs.mkdirSync(funcDir, { recursive: true });

        // Extract ZIP
        await fs.createReadStream(req.file.path)
            .pipe(unzipper.Extract({ path: funcDir }))
            .promise();

        // Delete the temporary zip upload
        fs.unlinkSync(req.file.path);

        // Copy Sandbox Templates (Dockerfile & wrapper.js)
        fs.copyFileSync(path.join(TEMPLATES_DIR, 'wrapper.js'), path.join(funcDir, 'wrapper.js'));
        fs.copyFileSync(path.join(TEMPLATES_DIR, 'Dockerfile'), path.join(funcDir, 'Dockerfile'));

        // Respond fast, build in background
        res.send({ status: 'Success', message: `Deploying function '${funcName}' started...` });

        console.log(`[DEPLOY] Building docker image for ${funcName} in project ${projectId}...`);

        // Build the docker image locally
        const buildCmd = `docker build -t sgfn-${projectId}-${funcName} .`;
        await execPromise(buildCmd, { cwd: funcDir });

        console.log(`[DEPLOY] Successfully built & ready: sgfn-${projectId}-${funcName}`);
    } catch (e) {
        console.error(`[DEPLOY] Build failed for ${funcName}:`, e);
    }
});

// ==========================================
// 3. RUN API (Executes the Function)
// ==========================================
app.post('/run/:projectId/:name', (req, res) => {
    const projectId = req.params.projectId;
    const funcName = req.params.name;
    const eventData = JSON.stringify(req.body);

    const imageName = `sgfn-${projectId}-${funcName}`;

    // Spawn docker container temporarily
    const dockerProcess = spawn('docker', ['run', '--rm', '-i', imageName]);

    let output = '';
    let errOutput = '';

    dockerProcess.stdout.on('data', (data) => { output += data.toString(); });
    dockerProcess.stderr.on('data', (data) => { errOutput += data.toString(); });

    dockerProcess.on('close', (code) => {
        if (code !== 0) {
            console.error(`[RUN] Execution failed for ${funcName}. Exit:`, code);
            return res.status(500).send({ error: "Execution Failed", logs: errOutput });
        }

        try {
            // Find valid JSON at the end
            const lines = output.trim().split('\n');
            let jsonResponse = lines[lines.length - 1];
            for (let i = lines.length - 1; i >= 0; i--) {
                if (lines[i].startsWith('{"success":')) {
                    jsonResponse = lines[i]; break;
                }
            }

            res.send(JSON.parse(jsonResponse));
        } catch (e) {
            res.status(500).send({ error: "Invalid Output Format", logs: output });
        }
    });

    dockerProcess.stdin.write(eventData);
    dockerProcess.stdin.end();
});

const PORT = 3005;
app.listen(PORT, () => {
    console.log(`=== SugunaBase Cloud Functions Hub ===`);
    console.log(`> Server running on http://localhost:${PORT}`);
    console.log(`> Ready to accept CLI connections!`);
});
