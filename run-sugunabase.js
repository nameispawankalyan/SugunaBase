const { spawn } = require('child_process');
const path = require('path');

const services = [
    { name: 'GATEWAY   ', dir: 'backend', color: '\x1b[32m' }, // Green
    { name: 'AUTH      ', dir: 'suguna-auth', color: '\x1b[36m' }, // Cyan
    { name: 'FIRESTORE ', dir: 'suguna-firestore', color: '\x1b[33m' }, // Yellow
    { name: 'STORAGE   ', dir: 'suguna-storage', color: '\x1b[35m' }, // Magenta
    { name: 'MESSAGING ', dir: 'suguna-messaging', color: '\x1b[34m' }, // Blue
    { name: 'HOSTING   ', dir: 'suguna-hosting', color: '\x1b[31m' }, // Red
    { name: 'LOGS      ', dir: 'suguna-logs', color: '\x1b[90m' }, // Grey
    { name: 'FUNCTIONS ', dir: 'cloud-functions', color: '\x1b[96m', script: 'server.js' }, // Bright Cyan
    { name: 'CAST      ', dir: 'suguna-cast/server', color: '\x1b[92m', cmd: 'npm', args: ['run', 'dev'] } // Bright Green
];

console.log('\x1b[1m\x1b[34m%s\x1b[0m', '---------------------------------------------------');
console.log('\x1b[1m\x1b[34m%s\x1b[0m', '   🚀 SUGUNABASE MASTER RUNNER (Distributed v1)    ');
console.log('\x1b[1m\x1b[34m%s\x1b[0m', '---------------------------------------------------');

services.forEach(service => {
    const cwd = path.join(__dirname, service.dir);
    const command = service.cmd || 'node';
    const args = service.args || [service.script || 'index.js'];

    const child = spawn(command, args, {
        cwd,
        shell: true,
        env: { ...process.env, PORT: getPort(service.name) }
    });

    child.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                console.log(`${service.color}[${service.name}]\x1b[0m ${line.trim()}`);
            }
        });
    });

    child.stderr.on('data', (data) => {
        console.error(`${service.color}[${service.name}] ERROR:\x1b[0m ${data.toString().trim()}`);
    });

    child.on('close', (code) => {
        console.log(`${service.color}[${service.name}]\x1b[0m exited with code ${code}`);
    });
});

function getPort(name) {
    const mapping = {
        'GATEWAY   ': 5000,
        'AUTH      ': 3300,
        'FIRESTORE ': 3400,
        'STORAGE   ': 3500,
        'MESSAGING ': 3200,
        'HOSTING   ': 3600,
        'LOGS      ': 3700,
        'FUNCTIONS ': 3005,
        'CAST      ': 3100
    };
    return mapping[name] || 0;
}

process.on('SIGINT', () => {
    console.log('\nStopping all SugunaBase services...');
    process.exit();
});
