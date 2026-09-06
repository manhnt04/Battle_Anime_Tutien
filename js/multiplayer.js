import { Player } from './player.js';
import { MeleeAttack } from './weapon.js';

/**
 * WebRTC P2P Network Manager using PeerJS
 * Enables real-time browser-to-browser multiplayer without dedicated backend servers.
 */
export class NetworkManager {
    constructor(game) {
        this.game = game;
        this.peer = null;
        this.connections = []; // For Host: list of client DataConnections
        this.hostConn = null;  // For Guest: connection to Host
        this.isHost = false;
        this.isConnected = false;
        this.roomCode = null;
        this.myId = 'player_' + Math.random().toString(36).substring(2, 8);
        this.updateInterval = null;
        this.lastBroadcast = 0;
    }

    /**
     * Check if PeerJS library is available in global scope
     */
    isPeerAvailable() {
        return typeof window !== 'undefined' && typeof window.Peer === 'function';
    }

    /**
     * Format a safe, consistent peer ID from Room Code
     */
    getPeerRoomId(code) {
        const clean = (code || '6868').toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        return `vlst-room-${clean}`;
    }

    /**
     * Host creates an online room
     */
    createRoom(roomCode, onReady, onError) {
        if (!this.isPeerAvailable()) {
            if (onError) onError('Thư viện WebRTC (PeerJS) chưa sẵn sàng. Đang chạy chế độ Thí Luyện.');
            return;
        }

        this.disconnect();
        this.isHost = true;
        this.roomCode = (roomCode || '6868').trim().toUpperCase();
        const peerId = this.getPeerRoomId(this.roomCode);

        try {
            this.peer = new window.Peer(peerId, {
                debug: 1,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                }
            });

            this.peer.on('open', (id) => {
                this.isConnected = true;
                this.startHeartbeat();
                if (onReady) onReady(this.roomCode, id);
                if (this.game && window.ui) {
                    window.ui.addNotification(`🏛️ Phòng Online [${this.roomCode}] đã mở! Chờ bạn bè gia nhập...`, 'gold');
                }
            });

            this.peer.on('connection', (conn) => {
                this.handleIncomingConnection(conn);
            });

            this.peer.on('error', (err) => {
                console.warn('PeerJS Host Error:', err);
                if (err.type === 'unavailable-id') {
                    // Room ID already occupied, try appending random suffix
                    const altCode = `${this.roomCode}-${Math.floor(Math.random() * 90 + 10)}`;
                    console.log('Room ID taken, retrying with alternative:', altCode);
                    this.createRoom(altCode, onReady, onError);
                } else if (onError) {
                    onError(err.message || 'Không thể tạo phòng online.');
                }
            });
        } catch (e) {
            console.error('PeerJS init failed:', e);
            if (onError) onError(e.message);
        }
    }

    /**
     * Guest joins an online room by Code
     */
    joinRoom(roomCode, onConnected, onError) {
        if (!this.isPeerAvailable()) {
            if (onError) onError('Thư viện WebRTC chưa sẵn sàng.');
            return;
        }

        this.disconnect();
        this.isHost = false;
        this.roomCode = (roomCode || '').trim().toUpperCase();
        const hostPeerId = this.getPeerRoomId(this.roomCode);
        const myGuestId = `vlst-guest-${this.myId}`;

        try {
            this.peer = new window.Peer(myGuestId, {
                debug: 1,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                }
            });

            this.peer.on('open', () => {
                const conn = this.peer.connect(hostPeerId, { reliable: false });
                this.hostConn = conn;

                conn.on('open', () => {
                    this.isConnected = true;
                    this.startHeartbeat();
                    // Send join packet
                    conn.send({
                        type: 'join',
                        id: this.myId,
                        name: 'Hiệp Khách',
                        x: this.game.player ? this.game.player.x : 500,
                        y: this.game.player ? this.game.player.y : 500,
                        color: '#ffd700'
                    });

                    if (onConnected) onConnected(this.roomCode);
                    if (window.ui) {
                        window.ui.addNotification(`⚔️ Đã kết nối vào phòng [${this.roomCode}] của Chủ Phòng!`, 'gold');
                    }
                });

                conn.on('data', (data) => {
                    this.handleDataFromHost(data);
                });

                conn.on('close', () => {
                    this.isConnected = false;
                    if (window.ui) window.ui.addNotification('Chủ phòng đã rời đi hoặc phòng đã đóng.', 'error');
                });

                conn.on('error', (err) => {
                    console.warn('Guest Connection error:', err);
                    if (onError) onError(err);
                });
            });

            this.peer.on('error', (err) => {
                console.warn('PeerJS Guest error:', err);
                if (onError) onError(err.message || 'Không tìm thấy phòng.');
            });
        } catch (e) {
            console.error('Peer join error:', e);
            if (onError) onError(e.message);
        }
    }

    /**
     * Host accepts connection from guest
     */
    handleIncomingConnection(conn) {
        conn.on('open', () => {
            this.connections.push(conn);
            if (window.ui) {
                window.ui.addNotification(`🎉 Một hiệp khách mới đã tiến nhập thế giới võ lâm!`, 'gold');
            }
        });

        conn.on('data', (data) => {
            this.handleDataFromGuest(conn, data);
        });

        conn.on('close', () => {
            const idx = this.connections.indexOf(conn);
            if (idx !== -1) this.connections.splice(idx, 1);
            if (conn.peerPlayerId && this.game.remotePlayers) {
                const rp = this.game.remotePlayers.get(conn.peerPlayerId);
                if (rp) {
                    if (rp.destroyPixi) rp.destroyPixi();
                    this.game.remotePlayers.delete(conn.peerPlayerId);
                }
            }
            if (window.ui) window.ui.addNotification(`Một hiệp khách đã rời phòng.`, 'info');
        });
    }

    /**
     * Process data sent from Guest to Host
     */
    handleDataFromGuest(conn, data) {
        if (!data || !data.type) return;

        if (data.type === 'join') {
            conn.peerPlayerId = data.id;
            this.createOrUpdateRemotePlayer(data.id, data.x, data.y, data.color, data.name);
            return;
        }

        if (data.type === 'update') {
            this.createOrUpdateRemotePlayer(data.id, data.x, data.y, data.color, data.name, data.angle, data.health, data.weaponKey);
            // Re-broadcast to all other guests
            this.broadcastToGuests(data, conn);
            return;
        }

        if (data.type === 'action') {
            this.executeRemoteAction(data);
            this.broadcastToGuests(data, conn);
            return;
        }

        if (data.type === 'chat') {
            if (window.ui) window.ui.addNotification(`💬 ${data.sender}: ${data.text}`, 'gold');
            this.broadcastToGuests(data, conn);
        }
    }

    /**
     * Process data sent from Host to Guest
     */
    handleDataFromHost(data) {
        if (!data || !data.type) return;

        if (data.type === 'state_sync') {
            // Update host's avatar
            if (data.host) {
                this.createOrUpdateRemotePlayer(data.host.id, data.host.x, data.host.y, '#00e5ff', 'Chủ Phòng', data.host.angle, data.host.health, data.host.weaponKey);
            }
            // Update other remote players
            if (Array.isArray(data.peers)) {
                for (const p of data.peers) {
                    if (p.id !== this.myId) {
                        this.createOrUpdateRemotePlayer(p.id, p.x, p.y, p.color, p.name, p.angle, p.health, p.weaponKey);
                    }
                }
            }
            return;
        }

        if (data.type === 'action') {
            if (data.id !== this.myId) {
                this.executeRemoteAction(data);
            }
            return;
        }

        if (data.type === 'notification' && window.ui) {
            window.ui.addNotification(data.text, data.level || 'info');
        }
    }

    /**
     * Create or smoothly update a RemotePlayer entity in the game
     */
    createOrUpdateRemotePlayer(id, x, y, color = '#ffd700', name = 'Hiệp Khách', angle = 0, health = 100, weaponKey = 'QUYEN_CUOC') {
        if (!this.game) return;
        if (!this.game.remotePlayers) this.game.remotePlayers = new Map();

        let rp = this.game.remotePlayers.get(id);
        if (!rp) {
            rp = new Player(x, y, false);
            rp.id = id;
            rp.name = name;
            rp.color = color || '#ffd700';
            if (this.game.pixiApp && this.game.characterLayer) {
                rp.initPixi(this.game.characterLayer);
            }
            this.game.remotePlayers.set(id, rp);
        }

        // Smooth interpolation towards received position
        rp.targetX = x;
        rp.targetY = y;
        rp.x += (x - rp.x) * 0.45;
        rp.y += (y - rp.y) * 0.45;
        rp.angle = angle;
        rp.health = health;
        rp.alive = health > 0;

        if (weaponKey && rp.inventory && rp.currentWeaponKey !== weaponKey) {
            rp.currentWeaponKey = weaponKey;
            rp.inventory.setSingleWeapon(weaponKey);
        }

        if (rp.updatePixiView) {
            rp.updatePixiView(true);
        }
    }

    /**
     * Execute attack / skill animation triggered by remote peer
     */
    executeRemoteAction(data) {
        if (!this.game) return;
        const rp = this.game.remotePlayers ? this.game.remotePlayers.get(data.id) : null;
        if (!rp) return;

        if (data.angle !== undefined) rp.angle = data.angle;

        if (data.action === 'shoot' || data.action === 'space_attack') {
            const weapon = rp.inventory ? rp.inventory.getCurrentWeapon() : null;
            if (this.game.particles) {
                this.game.particles.slash(rp.x, rp.y, rp.angle, weapon ? weapon.color : '#ffd700');
            }
            if (weapon && weapon.type === 'projectile') {
                this.game.projectilePool.spawn(
                    rp.x + Math.cos(rp.angle) * 20,
                    rp.y + Math.sin(rp.angle) * 20,
                    rp.angle,
                    {
                        speed: weapon.bulletSpeed || 12,
                        range: weapon.range || 420,
                        damage: weapon.damage || 20,
                        radius: 5,
                        color: weapon.color || '#00e5ff'
                    },
                    rp
                );
            }
        } else if (data.action === 'melee') {
            const weapon = rp.inventory ? rp.inventory.getCurrentWeapon() : null;
            const attack = new MeleeAttack(
                rp.x + Math.cos(rp.angle) * rp.radius,
                rp.y + Math.sin(rp.angle) * rp.radius,
                rp.angle,
                weapon ? weapon.range : 70,
                Math.PI / 1.4,
                weapon ? weapon.damage : 25,
                rp
            );
            rp.meleeAttacks.push(attack);
            if (this.game.particles) {
                this.game.particles.slash(rp.x, rp.y, rp.angle, weapon ? weapon.color : '#ffd700');
            }
        } else if (data.action === 'skill') {
            const targetPoint = data.targetPoint || {
                x: rp.x + Math.cos(rp.angle) * 200,
                y: rp.y + Math.sin(rp.angle) * 200
            };
            if (typeof rp.useSkill === 'function') {
                rp.useSkill(data.index, targetPoint, this.game);
            }
            if (this.game.particles) {
                this.game.particles.burst(rp.x, rp.y, '#00e5ff', 25);
            }
            if (data.index === 2 && this.game.vfxManager) {
                this.game.vfxManager.triggerShockwave(rp.x, rp.y);
            }
        }
    }

    /**
     * Broadcast packet from Host to all connected Guests
     */
    broadcastToGuests(data, excludeConn = null) {
        for (const c of this.connections) {
            if (c !== excludeConn && c.open) {
                try {
                    c.send(data);
                } catch (e) {
                    console.warn('Broadcast send error:', e);
                }
            }
        }
    }

    /**
     * Send my local player action (Space attack, J, K, L skills) to peers
     */
    sendLocalAction(actionName, extra = {}) {
        if (!this.isConnected || !this.game || !this.game.player) return;
        const p = this.game.player;
        const packet = {
            type: 'action',
            id: this.myId,
            action: actionName,
            x: p.x,
            y: p.y,
            angle: p.angle,
            ...extra
        };

        if (this.isHost) {
            this.broadcastToGuests(packet);
        } else if (this.hostConn && this.hostConn.open) {
            this.hostConn.send(packet);
        }
    }

    /**
     * Periodic position synchronization tick (25Hz)
     */
    startHeartbeat() {
        this.stopHeartbeat();
        this.updateInterval = setInterval(() => {
            if (!this.isConnected || !this.game || !this.game.player) return;
            const myPlayer = this.game.player;
            const curWeapon = myPlayer.inventory ? myPlayer.inventory.getCurrentWeapon() : null;

            if (this.isHost) {
                // Host bundles everyone's state and sends to all clients
                const peersData = [];
                if (this.game.remotePlayers) {
                    this.game.remotePlayers.forEach((rp, id) => {
                        peersData.push({
                            id,
                            x: rp.x,
                            y: rp.y,
                            angle: rp.angle,
                            health: rp.health,
                            color: rp.color,
                            name: rp.name
                        });
                    });
                }

                this.broadcastToGuests({
                    type: 'state_sync',
                    host: {
                        id: this.myId,
                        x: myPlayer.x,
                        y: myPlayer.y,
                        angle: myPlayer.angle,
                        health: myPlayer.health,
                        weaponKey: curWeapon ? curWeapon.rawKey : 'QUYEN_CUOC'
                    },
                    peers: peersData
                });
            } else if (this.hostConn && this.hostConn.open) {
                // Client sends its own position to Host
                this.hostConn.send({
                    type: 'update',
                    id: this.myId,
                    x: myPlayer.x,
                    y: myPlayer.y,
                    angle: myPlayer.angle,
                    health: myPlayer.health,
                    weaponKey: curWeapon ? curWeapon.rawKey : 'QUYEN_CUOC',
                    color: '#ffd700'
                });
            }
        }, 40); // 25 times per second (40ms)
    }

    stopHeartbeat() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Clean disconnect and reset
     */
    disconnect() {
        this.stopHeartbeat();
        this.isConnected = false;
        if (this.hostConn) {
            try { this.hostConn.close(); } catch (e) {}
            this.hostConn = null;
        }
        for (const c of this.connections) {
            try { c.close(); } catch (e) {}
        }
        this.connections = [];
        if (this.peer) {
            try { this.peer.destroy(); } catch (e) {}
            this.peer = null;
        }
    }
}
