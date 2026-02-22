#!/usr/bin/env node
const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const os = require('os');
const archiver = require('archiver');
const FormData = require('form-data');
const axios = require('axios');
const prompts = require('prompts');

const CONFIG_PATH = path.join(os.homedir(), '.sugunabase-config.json');
const SERVER_URL = 'https://api.suguna.co/functions'; // Functions backend
const HOSTING_URL = 'https://api.suguna.co/v1/hosting'; // Hosting backend

program
    .name('sugunabase')
    .description('SugunaBase CLI for Cloud Functions & Hosting Deployment')
    .version('1.0.0');

// ============== 1. LOGIN COMMAND ==============
program
    .command('login')
    .description('Log in to SugunaBase and get security token')
    .action(async () => {
        if (fs.existsSync(CONFIG_PATH)) {
            try {
                const existingConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
                if (existingConfig.token && existingConfig.projectId) {
                    console.log(' You are already logged in to SugunaBase (Project ID: ' + existingConfig.projectId + ').');
                    const reloginRes = await prompts({ type: 'confirm', name: 'relogin', message: 'Do you want to login to a different account or project?', initial: false });
                    if (!reloginRes.relogin) { return process.exit(0); }
                }
            } catch (e) { }
        }

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
                message: 'Select a project to manage:',
                choices: choices
            });

            if (!selectRes.projectId) {
                console.log('❌ Project selection cancelled.');
                process.exit(1);
            }

            fs.writeFileSync(CONFIG_PATH, JSON.stringify({ token, projectId: selectRes.projectId }));
            console.log(`\n✅ Successfully logged in and linked to Project ID: ${selectRes.projectId}`);

        } catch (e) {
            console.error('\n❌ Authentication failed:', e.response?.data?.error || e.message);
            process.exit(1);
        }
    });

// ============== 2. INIT COMMAND ==============
program
    .command('init [service] [siteId]')
    .description('Initialize a new service: "functions" or "hosting"')
    .action((service, siteId) => {
        if (!service) {
            console.log('❌ Please specify what to initialize: "functions" or "hosting".');
            console.log('   Example: sugunabase init functions');
            console.log('   Example: sugunabase init hosting');
            process.exit(1);
        }

        const cwd = process.cwd();

        if (service === 'functions') {
            const funcDir = path.join(cwd, 'functions');
            if (fs.existsSync(funcDir)) {
                console.log('❌ "functions" directory already exists.');
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
            console.log(' 3. Run: sugunabase deploy functions');

        } else if (service === 'hosting') {
            const finalSiteId = siteId || 'main'; // default to main
            const publicDir = path.join(cwd, 'public_' + finalSiteId);
            if (fs.existsSync(publicDir)) {
                console.log(`❌ "${publicDir}" directory already exists.`);
                process.exit(1);
            }
            fs.mkdirSync(publicDir);

            const indexHtmlContent = `<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <title>SugunaBase Hosting</title>\n  <style>\n    body { font-family: -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #fafafa; }\n    .box { text-align: center; background: white; padding: 3rem; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }\n    h1 { color: #6c2bd9; font-weight: 900; }\n    p { color: #888; }\n  </style>\n</head>\n<body>\n  <div class="box">\n    <svg width="60" fill="none" stroke="#6c2bd9" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>\n    <h1>Welcome to SugunaBase Hosting!</h1>\n    <p>Your web app (${finalSiteId}) is now ready to be deployed globally.</p>\n  </div>\n</body>\n</html>`;

            fs.writeFileSync(path.join(publicDir, 'index.html'), indexHtmlContent);

            console.log(`✅ Hosting initialized successfully in "public_${finalSiteId}"!`);
            console.log('Next steps:');
            console.log(` 1. Add your website files to the "public_${finalSiteId}" folder`);
            console.log(` 2. Run: sugunabase deploy hosting ${finalSiteId}`);
        } else {
            console.log('❌ Invalid service. Use "functions" or "hosting".');
            process.exit(1);
        }
    });

// ============== 3. DEPLOY COMMAND ==============
program
    .command('deploy [service] [siteId]')
    .description('Deploy your service ("functions" or "hosting") to SugunaBase Servers')
    .action(async (service, siteId) => {
        if (!fs.existsSync(CONFIG_PATH)) {
            console.log('❌ You are not logged in. Please run "sugunabase login" first.');
            process.exit(1);
        }

        if (!service) {
            console.log('❌ Please specify what to deploy: "functions" or "hosting".');
            console.log('   Example: sugunabase deploy functions');
            process.exit(1);
        }

        const { token, projectId } = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));

        if (!projectId) {
            console.log('❌ Project ID is missing. Please run "sugunabase login" again.');
            process.exit(1);
        }

        if (service === 'functions') {
            const funcDir = path.join(process.cwd(), 'functions');
            if (!fs.existsSync(funcDir)) {
                console.log('❌ "functions" directory not found.');
                process.exit(1);
            }

            console.log(`📦 Packaging functions for project: ${projectId}...`);
            const zipPath = path.join(process.cwd(), '.functions.zip');
            const output = fs.createWriteStream(zipPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', async () => {
                console.log('🚀 Zip created. Uploading to Suguna Cloud...');
                try {
                    const formData = new FormData();
                    formData.append('project_code', fs.createReadStream(zipPath));

                    const pkgPath = path.join(funcDir, 'package.json');
                    let funcName = 'default-func';
                    if (fs.existsSync(pkgPath)) {
                        funcName = require(pkgPath).name || 'default-func';
                    }

                    console.log(`📡 Deploying function: ${funcName}...`);
                    const deployUrl = SERVER_URL + '/deploy-zip/' + projectId + '/' + funcName;
                    const response = await axios.post(deployUrl, formData, {
                        headers: {
                            ...formData.getHeaders(),
                            'Authorization': 'Bearer ' + token
                        }
                    });

                    console.log('✅ Function Deploy Success!');
                    console.log(response.data);
                } catch (error) {
                    console.log('❌ Deploy Failed:', error.response ? error.response.data : error.message);
                } finally {
                    fs.unlinkSync(zipPath);
                }
            });

            archive.on('error', (err) => { throw err; });
            archive.pipe(output);
            archive.directory(funcDir, false);
            archive.finalize();

        } else if (service === 'hosting') {
            const finalSiteId = siteId || 'main'; // default to main
            const publicDir = path.join(process.cwd(), 'public_' + finalSiteId);

            // Backwards compatibility with just 'public' if they didn't specify a siteId
            const deployDir = (!siteId && fs.existsSync(path.join(process.cwd(), 'public')))
                ? path.join(process.cwd(), 'public')
                : publicDir;

            if (!fs.existsSync(deployDir)) {
                console.log(`❌ "${path.basename(deployDir)}" directory not found. Please create it or run "sugunabase init hosting ${finalSiteId}".`);
                process.exit(1);
            }

            console.log(`📦 Packaging website (${finalSiteId}) for project: ${projectId}...`);
            const zipPath = path.join(process.cwd(), `.hosting_${finalSiteId}.zip`);
            const output = fs.createWriteStream(zipPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', async () => {
                console.log('🚀 Zip created. Uploading to Suguna CDN...');
                try {
                    const formData = new FormData();
                    formData.append('hosting_files', fs.createReadStream(zipPath));

                    console.log(`📡 Deploying hosting site: ${finalSiteId}...`);
                    const deployUrl = HOSTING_URL + '/deploy/' + projectId + '/' + finalSiteId;
                    const response = await axios.post(deployUrl, formData, {
                        headers: {
                            ...formData.getHeaders(),
                            'Authorization': 'Bearer ' + token
                        }
                    });

                    console.log('✅ Hosting Deploy Success!');
                    console.log(`🌍 Live URL: ${response.data.live_url}`);
                } catch (error) {
                    console.log('❌ Deploy Failed:', error.response ? error.response.data : error.message);
                } finally {
                    fs.unlinkSync(zipPath);
                }
            });

            archive.on('error', (err) => { throw err; });
            archive.pipe(output);
            archive.directory(deployDir, false);
            archive.finalize();

        } else {
            console.log('❌ Invalid service. Use "functions" or "hosting".');
            process.exit(1);
        }
    });

program.parse(process.argv);
