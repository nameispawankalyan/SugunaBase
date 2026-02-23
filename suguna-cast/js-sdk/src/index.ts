import { io, Socket } from 'socket.io-client';
import { Device } from 'mediasoup-client';

export interface SugunaCastOptions {
    serverUrl: string;
    roomId: string;
}

export class SugunaCast {
    private socket: Socket;
    private device: Device;
    private sendTransport: any = null;
    private recvTransport: any = null;
    private producers: Map<string, any> = new Map();
    private consumers: Map<string, any> = new Map();
    private roomId: string;

    constructor(options: SugunaCastOptions) {
        this.socket = io(options.serverUrl);
        this.device = new Device();
        this.roomId = options.roomId;

        this.socket.on('newProducer', async ({ producerId }) => {
            await this.consume(producerId);
        });
    }

    async join() {
        return new Promise((resolve, reject) => {
            this.socket.emit('joinRoom', { roomId: this.roomId }, async (data: { rtpCapabilities: any, error?: string }) => {
                if (data.error) {
                    reject(new Error(data.error));
                    return;
                }
                try {
                    await this.device.load({ routerRtpCapabilities: data.rtpCapabilities });
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    async produce(track: MediaStreamTrack) {
        if (!this.sendTransport) {
            this.sendTransport = await this.createTransport('send');
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
                    ? this.device.createSendTransport(params)
                    : this.device.createRecvTransport(params);

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
        if (!this.recvTransport) {
            this.recvTransport = await this.createTransport('recv');
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
                // Trigger an event for the UI to attach the track
                console.log('Consumer resumed, track ready:', consumer.track);
            });
        });
    }
}
