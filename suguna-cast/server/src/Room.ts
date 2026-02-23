import * as mediasoup from 'mediasoup';
import { Router, WebRtcTransport, Producer, Consumer, DtlsState } from 'mediasoup/node/lib/types';
import { config } from './config';

interface Peer {
    id: string;
    transports: Map<string, WebRtcTransport>;
    producers: Map<string, Producer>;
    consumers: Map<string, Consumer>;
}

export class Room {
    public id: string;
    public router!: Router;
    private peers: Map<string, Peer> = new Map();

    constructor(id: string) {
        this.id = id;
    }

    async init(worker: mediasoup.types.Worker) {
        this.router = await worker.createRouter({
            mediaCodecs: config.mediasoup.router.mediaCodecs,
        });
    }

    addPeer(peerId: string) {
        this.peers.set(peerId, {
            id: peerId,
            transports: new Map(),
            producers: new Map(),
            consumers: new Map(),
        });
    }

    removePeer(peerId: string) {
        const peer = this.peers.get(peerId);
        if (!peer) return;

        peer.transports.forEach(t => t.close());
        peer.producers.forEach(p => p.close());
        peer.consumers.forEach(c => c.close());

        this.peers.delete(peerId);
    }

    async createTransport(peerId: string) {
        const peer = this.peers.get(peerId);
        if (!peer) throw new Error('Peer not found');

        const transport = await this.router.createWebRtcTransport(config.mediasoup.webRtcTransport as any);

        transport.on('dtlsstatechange', (dtlsState: DtlsState) => {
            if (dtlsState === 'closed') transport.close();
        });

        peer.transports.set(transport.id, transport);

        return {
            params: {
                id: transport.id,
                iceParameters: transport.iceParameters,
                iceCandidates: transport.iceCandidates,
                dtlsParameters: transport.dtlsParameters,
            },
            transport
        };
    }

    getPeer(peerId: string) {
        return this.peers.get(peerId);
    }

    broadcast(peerId: string, event: string, data: any, io: any) {
        this.peers.forEach((peer, id) => {
            if (id !== peerId) {
                io.to(id).emit(event, data);
            }
        });
    }

    getPeers() {
        return Array.from(this.peers.keys());
    }

    getProducers() {
        const producers: { producerId: string }[] = [];
        this.peers.forEach(peer => {
            peer.producers.forEach(producer => {
                producers.push({ producerId: producer.id });
            });
        });
        return producers;
    }
}
