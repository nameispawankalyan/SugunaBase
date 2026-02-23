import { io, Socket } from 'socket.io-client';
import { Device } from 'mediasoup-client';

export interface SugunaCastOptions {
    serverUrl: string;
    roomId: string;
    token: string;
    metrics?: {
        name?: string;
        uid?: string;
        image?: string;
        network?: string;
        device?: string;
        location?: string;
    };
}

export class SugunaCast {
    public socket: Socket;
    private device: Device;
    private sendTransport: any = null;
    private recvTransport: any = null;
    private producers: Map<string, any> = new Map();
    private consumers: Map<string, any> = new Map();
    private roomId: string;
    private iceServers: any[] = [];
    private transportInProgress: { [key: string]: Promise<any> | null } = { send: null, recv: null };
    public onTrack?: (track: MediaStreamTrack, peerId: string) => void;
    public onTrackEnded?: (peerId: string) => void;

    private options: SugunaCastOptions;

    constructor(options: SugunaCastOptions) {
        this.options = options;
        this.socket = io(options.serverUrl);
        this.device = new Device();
        this.roomId = options.roomId;

        this.socket.on('newProducer', async ({ producerId }) => {
            await this.consume(producerId);
        });

        this.socket.on('producerClosed', ({ producerId }) => {
            console.log('Producer closed:', producerId);
            // We use producerId as peerId for simplicity in demo
            if (this.onTrackEnded) this.onTrackEnded(producerId);
        });

        this.socket.on('peerLeft', ({ peerId }) => {
            console.log('Peer left:', peerId);
            if (this.onTrackEnded) this.onTrackEnded(peerId);
        });
    }

    async join() {
        return new Promise((resolve, reject) => {
            this.socket.emit('joinRoom', {
                roomId: this.roomId,
                token: this.options.token,
                metrics: this.options.metrics
            }, async (data: { rtpCapabilities: any, producers: any[], iceServers: any[], error?: string }) => {
                if (data.error) {
                    reject(new Error(data.error));
                    return;
                }
                try {
                    this.iceServers = data.iceServers || [];
                    await this.device.load({ routerRtpCapabilities: data.rtpCapabilities });

                    // Consume existing producers
                    if (data.producers) {
                        for (const { producerId } of data.producers) {
                            await this.consume(producerId);
                        }
                    }

                    resolve(true);
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    async produce(track: MediaStreamTrack) {
        if (!this.sendTransport) {
            if (!this.transportInProgress.send) {
                this.transportInProgress.send = this.createTransport('send');
            }
            this.sendTransport = await this.transportInProgress.send;
            this.transportInProgress.send = null;
        }

        const producer = await this.sendTransport.produce({ track });
        this.producers.set(producer.id, producer);
        return producer;
    }

    private async createTransport(direction: 'send' | 'recv'): Promise<any> {
        return new Promise((resolve, reject) => {
            this.socket.emit('createWebRtcTransport', { roomId: this.roomId }, async (data: { params: any, error?: string }) => {
                if (data.error) {
                    reject(new Error(data.error));
                    return;
                }

                const { params } = data;

                const transport = direction === 'send'
                    ? this.device.createSendTransport({ ...params, iceServers: this.iceServers })
                    : this.device.createRecvTransport({ ...params, iceServers: this.iceServers });

                transport.on('connect', ({ dtlsParameters }: any, callback: () => void, errback: (error: any) => void) => {
                    this.socket.emit('connectWebRtcTransport', {
                        roomId: this.roomId,
                        transportId: transport.id,
                        dtlsParameters
                    }, (response: { success?: boolean, error?: string }) => {
                        if (response.error) errback(response.error);
                        else callback();
                    });
                });

                if (direction === 'send') {
                    transport.on('produce', ({ kind, rtpParameters }: any, callback: (options: { id: string }) => void, errback: (error: any) => void) => {
                        this.socket.emit('produce', {
                            roomId: this.roomId,
                            transportId: transport.id,
                            kind,
                            rtpParameters
                        }, (response: { id: string, error?: string }) => {
                            if (response.error) errback(response.error);
                            else callback({ id: response.id });
                        });
                    });
                }

                resolve(transport);
            });
        });
    }

    private async consume(producerId: string) {
        console.log(`[SDK] Consuming producer: ${producerId}`);
        if (!this.recvTransport) {
            if (!this.transportInProgress.recv) {
                this.transportInProgress.recv = this.createTransport('recv');
            }
            this.recvTransport = await this.transportInProgress.recv;
            this.transportInProgress.recv = null;
        }

        this.socket.emit('consume', {
            roomId: this.roomId,
            transportId: this.recvTransport.id,
            producerId,
            rtpCapabilities: this.device.rtpCapabilities
        }, async (params: any) => {
            if (params.error) {
                console.error('Failed to consume:', params.error);
                return;
            }
            const consumer = await this.recvTransport!.consume(params);
            this.consumers.set(consumer.id, consumer);

            this.socket.emit('resumeConsumer', {
                roomId: this.roomId,
                consumerId: consumer.id
            }, () => {
                if (this.onTrack) {
                    this.onTrack(consumer.track, producerId);
                }
            });
        });
    }
}
