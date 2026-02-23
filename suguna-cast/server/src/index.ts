import express from 'express';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { generate } from 'selfsigned';
import { Server as SocketServer } from 'socket.io';
import * as mediasoup from 'mediasoup';
import cors from 'cors';
import { config } from './config';
import { Room } from './Room';
import { TokenService } from './services/TokenService';
import { AnalyticsService } from './services/AnalyticsService';

const app = express();
app.use(cors());

// Initialize Services
new AnalyticsService();

// Dashboard API Routes for SugunaBase Console
app.get('/api/stats/:appId', (req, res) => {
    const { appId } = req.params;
    // Current live stats + aggregate
    const liveRooms = AnalyticsService.getLiveRooms(appId);
    const totalParticipants = liveRooms.reduce((acc, room) => acc + room.participantCount, 0);

    res.json({
        totalCalls: 128, // Mocked total
        activeRooms: liveRooms.length,
        activeParticipants: totalParticipants,
        successRate: '99.9%'
    });
});

app.get('/api/rooms/:appId', (req, res) => {
    const { appId } = req.params;
    res.json(AnalyticsService.getLiveRooms(appId));
});

app.get('/api/history/:appId', (req, res) => {
    const { appId } = req.params;
    // In production, this would query DatabaseService
    res.json([
        { id: 'h-1', user: 'user-raj3d', type: 'Video', duration: '25m 12s', network: '5G', location: 'Hyderabad, TS', time: '2h ago' },
        { id: 'h-2', user: 'user-pav45', type: 'Audio', duration: '12m 05s', network: 'WiFi', location: 'Vizag, AP', time: '5h ago' }
    ]);
});

let workers: mediasoup.types.Worker[] = [];
let nextWorkerIdx = 0;
const rooms: Map<string, Room> = new Map();

// Initialize MediaSoup Workers
const createWorkers = async () => {
    const { numWorkers } = config.mediasoup;

    for (let i = 0; i < numWorkers; i++) {
        const worker = await mediasoup.createWorker({
            logLevel: config.mediasoup.worker.logLevel,
            logTags: config.mediasoup.worker.logTags,
            rtcMinPort: config.mediasoup.worker.rtcMinPort,
            rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
        });

        worker.on('died', () => {
            console.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', worker.pid);
            setTimeout(() => process.exit(1), 2000);
        });

        workers.push(worker);
        console.log(`Created mediasoup worker [pid:${worker.pid}]`);
    }
};

const getNextWorker = () => {
    const worker = workers[nextWorkerIdx];
    if (++nextWorkerIdx === workers.length) nextWorkerIdx = 0;
    return worker;
};

const setupSocketHandlers = (io: SocketServer) => {
    io.on('connection', (socket: any) => {
        console.log('New client connected:', socket.id);

        socket.on('joinRoom', async ({ roomId, token, metrics }: { roomId: string, token: string, metrics: any }, callback: (data: any) => void) => {
            console.log(`Socket ${socket.id} joining room ${roomId} with token`);

            try {
                // 1. Verify Token (Async for DB lookup)
                const payload = await TokenService.verifyToken(token);

                // 2. Room Management
                let room = rooms.get(roomId);
                if (!room) {
                    console.log(`Creating new room: ${roomId}`);
                    room = new Room(roomId);
                    await room.init(getNextWorker());
                    rooms.set(roomId, room);

                    // Start Analytics Session
                    AnalyticsService.startSession(roomId, payload.appId, payload.type);
                }

                room.addPeer(socket.id);
                socket.join(roomId);

                // 3. Store Role & Identity
                socket.role = payload.role;
                socket.uid = metrics?.uid || payload.uid; // Prioritize metrics UID for demo

                // 4. Log Analytics
                AnalyticsService.logParticipantJoin(roomId, {
                    uid: socket.uid,
                    network: metrics?.network || 'unknown',
                    device: metrics?.device || 'unknown',
                    location: metrics?.location || 'unknown',
                    timestamp: Date.now(),
                    name: metrics?.name,
                    image: metrics?.image
                });

                callback({
                    rtpCapabilities: room.router.rtpCapabilities,
                    producers: room.getProducers()
                });

            } catch (error: any) {
                console.error('Join Error:', error.message);
                callback({ error: 'Authentication Failed: ' + error.message });
            }
        });

        socket.on('createWebRtcTransport', async ({ roomId }: { roomId: string }, callback: (data: any) => void) => {
            console.log(`Socket ${socket.id} creating transport in room ${roomId}`);
            const room = rooms.get(roomId);
            if (!room) return;

            try {
                const { params } = await room.createTransport(socket.id);
                callback({ params });
            } catch (error: any) {
                console.error('Create transport error:', error);
                callback({ error: error.message });
            }
        });

        socket.on('connectWebRtcTransport', async ({ roomId, transportId, dtlsParameters }: { roomId: string, transportId: string, dtlsParameters: any }, callback: (data: any) => void) => {
            console.log(`Socket ${socket.id} connecting transport ${transportId}`);
            const room = rooms.get(roomId);
            const peer = room?.getPeer(socket.id);
            const transport = peer?.transports.get(transportId);

            if (transport) {
                await transport.connect({ dtlsParameters });
                callback({ success: true });
            }
        });

        socket.on('produce', async ({ roomId, transportId, kind, rtpParameters }: { roomId: string, transportId: string, kind: any, rtpParameters: any }, callback: (data: any) => void) => {
            console.log(`Socket ${socket.id} producing ${kind}`);

            // ROLE CHECK
            if (socket.role === 'audience') {
                return callback({ error: 'Permission Denied: Audience cannot produce' });
            }

            const room = rooms.get(roomId);
            const peer = room?.getPeer(socket.id);
            const transport = peer?.transports.get(transportId);

            if (transport) {
                const producer = await transport.produce({ kind, rtpParameters });
                peer?.producers.set(producer.id, producer);

                // Notify others about new producer
                room?.broadcast(socket.id, 'newProducer', { producerId: producer.id }, io);

                callback({ id: producer.id });
            }
        });

        socket.on('consume', async ({ roomId, transportId, producerId, rtpCapabilities }: { roomId: string, transportId: string, producerId: string, rtpCapabilities: any }, callback: (data: any) => void) => {
            console.log(`Socket ${socket.id} consuming producer ${producerId}`);
            const room = rooms.get(roomId);
            const peer = room?.getPeer(socket.id);
            const transport = peer?.transports.get(transportId);

            if (room && room.router.canConsume({ producerId, rtpCapabilities })) {
                const consumer = await transport?.consume({
                    producerId,
                    rtpCapabilities,
                    paused: true,
                });

                if (consumer) {
                    peer?.consumers.set(consumer.id, consumer);

                    consumer.on('transportclose', () => {
                        peer?.consumers.delete(consumer.id);
                    });

                    callback({
                        id: consumer.id,
                        producerId,
                        kind: consumer.kind,
                        rtpParameters: consumer.rtpParameters,
                    });
                }
            }
        });

        socket.on('resumeConsumer', async ({ roomId, consumerId }: { roomId: string, consumerId: string }, callback: (data: any) => void) => {
            const room = rooms.get(roomId);
            const peer = room?.getPeer(socket.id);
            const consumer = peer?.consumers.get(consumerId);
            if (consumer) {
                await consumer.resume();
                callback({ success: true });
            }
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
            rooms.forEach(room => {
                const peer = room.getPeer(socket.id);
                if (peer) {
                    // Notify others about all producers this peer had
                    peer.producers.forEach(producer => {
                        room.broadcast(socket.id, 'producerClosed', { producerId: producer.id }, io);
                    });

                    // If room will be empty after this person leaves, end session now to capture data
                    if (room.getPeers().length === 1) {
                        AnalyticsService.endSession(room.id);
                        rooms.delete(room.id);
                    } else {
                        AnalyticsService.logParticipantLeave(room.id, socket.uid);
                    }

                    room.removePeer(socket.id);
                    room.broadcast(socket.id, 'peerLeft', { peerId: socket.id }, io);
                }
            });
        });
    });
};

// Start Server
const startServer = async () => {
    await createWorkers();

    let server: any;
    const isProd = config.isProduction || process.env.PORT === '3100';

    if (isProd) {
        // In Production, Nginx handles SSL at https://cast.suguna.co
        // The app runs as HTTP internally on Port 3100 for better performance.
        console.log('Production mode: Starting HTTP server for Nginx proxy...');
        server = http.createServer(app);
    } else {
        // Local Development: Use self-signed HTTPS
        let options: any;
        const keyPath = config.ssl.key;
        const certPath = config.ssl.cert;

        if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
            console.log(`Using existing SSL certificates from: ${keyPath}`);
            options = {
                key: fs.readFileSync(keyPath),
                cert: fs.readFileSync(certPath)
            };
        } else {
            console.log('SSL Certificates not found. Generating self-signed for development...');
            const attrs = [{ name: 'commonName', value: process.env.ANNOUNCED_IP || '10.219.241.101' }];
            // @ts-ignore
            const pems: any = await generate(attrs, { dataDays: 365 });
            fs.writeFileSync(keyPath, pems.private);
            fs.writeFileSync(certPath, pems.cert);
            options = {
                key: pems.private,
                cert: pems.cert
            };
        }
        server = https.createServer(options, app);
        console.log('Development mode: Starting HTTPS server with self-signed certs...');
    }

    const io = new SocketServer(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    console.log(`[MediaSoup] Announced IP: ${config.mediasoup.webRtcTransport.listenIps[0].announcedIp}`);

    setupSocketHandlers(io);

    server.listen(config.http.port, () => {
        console.log(`Suguna Cast Media Server listening on port ${config.http.port}`);
    });
};

startServer().catch(err => {
    console.error('Failed to start server:', err);
});
