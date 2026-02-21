#!/usr/bin/env node
const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const archiver = require('archiver');
const FormData = require('form-data');
const axios = require('axios');
const prompts = require('prompts');

const CONFIG_PATH = path.join(os.homedir(), '.sugunabase-config.json');
const SERVER_URL = 'https://api.suguna.co/functions'; // Live backend address

program
    .name('sugunabase')
    .description('SugunaBase CLI for Cloud Functions Deployment')
    .version('1.0.0');

// ============== 1. LOGIN COMMAND ==============
program
    .command('login')
    .description('Log in to SugunaBase and get security token')
    .action(async () => {
        console.log('--- SugunaBase Developer Login ---');
        const authResponse = await prompts([
            { type: 'text', name: 'email', message: 'Email Address:' },
            { type: 'password', name: 'password', message: 'Password:' }
        ]);

        if (!authResponse.email || !authResponse.password) {
            console.log('❌ Login cancelled.');
            process.exit(1);
        }

        try {
            console.log('Authenticating...');
            // Call the main backend for REAL authentication
            const loginReq = await axios.post('https://api.suguna.co/v1/auth/login', {
                email: authResponse.email,
                password: authResponse.password
            });
            const token = loginReq.data.token;

            console.log('Fetching your projects...');
            const projReq = await axios.get('https://api.suguna.co/v1/projects', {
                headers: { Authorization: `Bearer ${token}` }
            });

            const projects = projReq.data.projects;
            if (!projects || projects.length === 0) {
                console.log('❌ You don\'t have any projects in SugunaBase yet.');
                process.exit(1);
            }

            const choices = projects.map(p => ({ title: p.name, value: p.id }));

            const selectRes = await prompts({
                type: 'select',
                name: 'projectId',
                message: 'Select a project to build functions for:',
                choices: choices
            });

            if (!selectRes.projectId) {
                console.log('❌ Project selection cancelled.');
                process.exit(1);
            }

            // Save Real JWT token and projectId
            fs.writeFileSync(CONFIG_PATH, JSON.stringify({ token, projectId: selectRes.projectId }));
            console.log(`\n✅ Successfully logged in and linked to Project ID: ${selectRes.projectId}`);

        } catch (e) {
            console.error('\n❌ Authentication failed:', e.response?.data?.error || e.message);
            process.exit(1);
        }
    });

// ============== 2. INIT COMMAND ==============
program
    .command('init')
    .description('Initialize a new Cloud Functions project')
    .action(() => {
        const cwd = process.cwd();
        const funcDir = path.join(cwd, 'functions');

        if (fs.existsSync(funcDir)) {
            console.log('❌ "functions" directory already exists. Cannot initialize again.');
            process.exit(1);
        }

        fs.mkdirSync(funcDir);

        const indexJsContent = `// Write your SugunaBase Cloud Function here\nmodule.exports = async (event) => {\n    console.log("Function requested by:", event.user);\n    \n    return { \n        status: "success", \n        message: "Hello from SugunaBase Cloud Functions!" \n    };\n};`;

        const packageJsonContent = `{\n  "name": "my-suguna-function",\n  "version": "1.0.0",\n  "description": "My first SugunaBase Cloud Function",\n  "dependencies": {}\n}`;

        fs.writeFileSync(path.join(funcDir, 'index.js'), indexJsContent);
        fs.writeFileSync(path.join(funcDir, 'package.json'), packageJsonContent);

        console.log('✅ Functions directory initialized successfully!');
        console.log('Next steps:');
        console.log(' 1. cd functions');
        console.log(' 2. Write your code in index.js');
        console.log(' 3. Run: sugunabase deploy');
    });

// ============== 3. DEPLOY COMMAND ==============
program
    .command('deploy')
    .description('Deploy your functions to SugunaBase Servers')
    .action(async () => {
        // 1. Verify Authentication
        if (!fs.existsSync(CONFIG_PATH)) {
            console.log('❌ You are not logged in. Please run "sugunabase login" first.');
            process.exit(1);
        }

        const { token, projectId } = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));

        if (!projectId) {
            console.log('❌ Project ID is missing. Please run "sugunabase login" again.');
            process.exit(1);
        }

        const funcDir = path.join(process.cwd(), 'functions');
        if (!fs.existsSync(funcDir)) {
            console.log('❌ "functions" directory not found. Did you run "sugunabase init" and navigate to the project root?');
            process.exit(1);
        }

        console.log(`📦 Packaging functions for project: ${projectId}...`);

        const zipPath = path.join(process.cwd(), '.functions.zip');
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', async () => {
            console.log('🚀 Zip created. Uploading to SugunaBase...');

            try {
                const formData = new FormData();
                formData.append('project_code', fs.createReadStream(zipPath));

                // In our system, let's pass a functionName based on the folder name inside functions, or package.json
                const pkgPath = path.join(funcDir, 'package.json');
                let funcName = 'default-func';
                if (fs.existsSync(pkgPath)) {
                    funcName = require(pkgPath).name || 'default-func';
                }

                console.log(`📡 Deploying function: ${funcName}...`);

                // Updated url to include projectId
                const deployUrl = SERVER_URL + '/deploy-zip/' + projectId + '/' + funcName;
                const response = await axios.post(deployUrl, formData, {
                    headers: {
                        ...formData.getHeaders(),
                        'Authorization': 'Bearer ' + token
                    }
                });

                console.log('✅ Deploy Success!');
                console.log(response.data);
            } catch (error) {
                console.log('❌ Deploy Failed:', error.response ? error.response.data : error.message);
            } finally {
                // Clean up zip
                fs.unlinkSync(zipPath);
            }
        });

        archive.on('error', (err) => { throw err; });
        archive.pipe(output);
        archive.directory(funcDir, false); // false means 'do not include the root directory name'
        archive.finalize();
    });

program.parse(process.argv);
