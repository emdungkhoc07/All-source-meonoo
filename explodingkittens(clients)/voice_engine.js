/**
 * Real-time WebRTC Voice Engine for Exploding Kittens Web App
 * Supports automatic autoplay unblocking, ICE reconnection, noise suppression, and state persistence.
 */
class VoiceEngineClass {
    constructor() {
        this.socket = null;
        this.localAudioStream = null;
        this.peerConnections = {};
        this.iceCandidateQueues = {};
        this.isMicMuted = true;
        this.isSpeakerMuted = false;

        this.rtcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' }
            ]
        };

        this.setupAudioUnblocker();
    }

    setupAudioUnblocker() {
        const unblock = () => {
            if (window.audioContext && window.audioContext.state === 'suspended') {
                window.audioContext.resume().catch(() => {});
            }
            document.querySelectorAll('.remote-peer-audio').forEach(audioEl => {
                if (audioEl.paused) {
                    audioEl.play().catch(() => {});
                }
            });
        };

        ['click', 'touchstart', 'pointerdown', 'keydown'].forEach(evt => {
            window.addEventListener(evt, unblock, { capture: true, passive: true });
        });
    }

    init(socket) {
        if (!socket) return;
        this.socket = socket;

        // Restore speaker preference
        const savedSpeakerMuted = sessionStorage.getItem('meono_speaker_muted');
        if (savedSpeakerMuted !== null) {
            this.isSpeakerMuted = savedSpeakerMuted === 'true';
            this.updateSpeakerUI();
        }

        // Setup socket signaling listeners
        this.socket.off('webrtc_room_peers');
        this.socket.off('webrtc_peer_joined');
        this.socket.off('webrtc_peer_left');
        this.socket.off('webrtc_leave_all');
        this.socket.off('webrtc_signal');

        this.socket.on('webrtc_room_peers', ({ peers }) => this.handleRoomPeers(peers));
        this.socket.on('webrtc_peer_joined', ({ peerId }) => this.handlePeerJoined(peerId));
        this.socket.on('webrtc_peer_left', ({ peerId }) => this.removePeerConnection(peerId));
        this.socket.on('webrtc_leave_all', () => this.removeAllPeerConnections());
        this.socket.on('webrtc_signal', (data) => this.handleSignal(data));

        console.log('[VoiceEngine] Đã khởi tạo thành công với Socket ID:', socket.id);
    }

    async getLocalAudioStream(userTriggered = false) {
        if (this.localAudioStream) return this.localAudioStream;
        try {
            this.localAudioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });
        } catch (err) {
            try {
                this.localAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            } catch (e) {
                console.warn('[VoiceEngine] Trình duyệt từ chối quyền truy cập Micro:', e);
                if (userTriggered && typeof window.showAlert === 'function') {
                    window.showAlert("THÔNG BÁO MICRO", "Không thể kết nối Micro. Vui lòng cấp quyền micro trên trình duyệt để đàm thoại!", [{ text: "ĐÓNG", type: "neutral" }]);
                }
                return null;
            }
        }

        if (this.localAudioStream) {
            this.localAudioStream.getAudioTracks().forEach(track => {
                track.enabled = !this.isMicMuted;
            });
            for (const peerId in this.peerConnections) {
                this.attachLocalStreamToPeer(peerId);
            }
        }
        return this.localAudioStream;
    }

    attachLocalStreamToPeer(peerId) {
        const pc = this.peerConnections[peerId];
        if (!pc || !this.localAudioStream) return;
        const audioTrack = this.localAudioStream.getAudioTracks()[0];
        if (!audioTrack) return;

        const senders = pc.getSenders();
        const existingSender = senders.find(s => s.track && s.track.kind === 'audio') || senders.find(s => s.track === null);
        if (existingSender) {
            existingSender.replaceTrack(audioTrack).catch(err => console.warn('[VoiceEngine] ReplaceTrack error:', err));
        } else {
            pc.addTrack(audioTrack, this.localAudioStream);
        }
    }

    async sendOfferToPeer(peerId) {
        const pc = this.peerConnections[peerId];
        if (!pc) return;
        if (pc.signalingState !== 'stable') {
            console.warn(`[VoiceEngine] Bỏ qua sendOfferToPeer tới ${peerId} vì signalingState: ${pc.signalingState}`);
            return;
        }
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            if (this.socket && this.socket.connected) {
                this.socket.emit('webrtc_signal', {
                    target: peerId,
                    signal: { type: 'offer', offer: pc.localDescription }
                });
            }
        } catch (err) {
            console.error('[VoiceEngine] Lỗi tạo offer:', err);
        }
    }

    createPeerConnection(peerId, isInitiator) {
        if (this.peerConnections[peerId]) return this.peerConnections[peerId];
        console.log(`[VoiceEngine] Kết nối Peer mới: ${peerId} (Initiator: ${isInitiator})`);

        const pc = new RTCPeerConnection(this.rtcConfig);
        this.peerConnections[peerId] = pc;
        this.iceCandidateQueues[peerId] = [];

        try {
            pc.addTransceiver('audio', { direction: 'sendrecv' });
        } catch (e) {}

        if (this.localAudioStream) {
            this.attachLocalStreamToPeer(peerId);
        }

        pc.onicecandidate = (event) => {
            if (event.candidate && this.socket && this.socket.connected) {
                this.socket.emit('webrtc_signal', {
                    target: peerId,
                    signal: { type: 'candidate', candidate: event.candidate }
                });
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log(`[VoiceEngine] ICE State với ${peerId}: ${pc.iceConnectionState}`);
            if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
                console.warn(`[VoiceEngine] Mất kết nối ICE với ${peerId}, đang thử đàm phán lại...`);
                if (pc.signalingState === 'stable') {
                    this.sendOfferToPeer(peerId);
                }
            }
        };

        pc.ontrack = (event) => {
            console.log(`[VoiceEngine] Nhận được luồng âm thanh thoại từ peer ${peerId}`);
            let remoteAudio = document.getElementById(`audio-${peerId}`);
            if (!remoteAudio) {
                remoteAudio = document.createElement('audio');
                remoteAudio.id = `audio-${peerId}`;
                remoteAudio.className = 'remote-peer-audio';
                remoteAudio.autoplay = true;
                remoteAudio.playsInline = true;
                document.body.appendChild(remoteAudio);
            }

            const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
            remoteAudio.srcObject = stream;
            remoteAudio.muted = this.isSpeakerMuted;
            remoteAudio.volume = 1.0;

            remoteAudio.play().catch(err => {
                console.warn(`[VoiceEngine] Trình duyệt chưa cho phép tự động phát âm thanh đối với ${peerId}:`, err);
            });
        };

        if (isInitiator) {
            setTimeout(() => {
                this.sendOfferToPeer(peerId);
            }, 100);
        }

        return pc;
    }

    removePeerConnection(peerId) {
        if (this.peerConnections[peerId]) {
            console.log(`[VoiceEngine] Đóng kết nối voice với Peer: ${peerId}`);
            try { this.peerConnections[peerId].close(); } catch(e){}
            delete this.peerConnections[peerId];
        }
        delete this.iceCandidateQueues[peerId];
        const remoteAudio = document.getElementById(`audio-${peerId}`);
        if (remoteAudio) remoteAudio.remove();
    }

    removeAllPeerConnections() {
        for (const peerId in this.peerConnections) {
            this.removePeerConnection(peerId);
        }
    }

    handleRoomPeers(peers) {
        console.log('[VoiceEngine] Danh sách peers phòng (Initiator):', peers);
        if (Array.isArray(peers)) {
            peers.forEach(peerId => this.createPeerConnection(peerId, true));
        }
    }

    handlePeerJoined(peerId) {
        console.log('[VoiceEngine] Peer mới tham gia (Receiver):', peerId);
        if (peerId) {
            this.createPeerConnection(peerId, false);
        }
    }

    async handleSignal({ sender, signal }) {
        if (!sender || !signal) return;
        let pc = this.peerConnections[sender];
        if (!pc) {
            pc = this.createPeerConnection(sender, false);
        }

        try {
            if (signal.type === 'offer') {
                if (pc.signalingState === 'have-local-offer') {
                    console.warn(`[VoiceEngine] Nhận Offer xung đột Glare từ ${sender}, thực hiện rollback...`);
                    await pc.setLocalDescription({ type: 'rollback' }).catch(() => {});
                }
                await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
                if (this.localAudioStream) {
                    this.attachLocalStreamToPeer(sender);
                }
                if (this.iceCandidateQueues[sender] && this.iceCandidateQueues[sender].length > 0) {
                    for (const cand of this.iceCandidateQueues[sender]) {
                        await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
                    }
                    this.iceCandidateQueues[sender] = [];
                }
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                this.socket.emit('webrtc_signal', {
                    target: sender,
                    signal: { type: 'answer', answer: pc.localDescription }
                });
            } else if (signal.type === 'answer') {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
                if (this.localAudioStream) {
                    this.attachLocalStreamToPeer(sender);
                }
                if (this.iceCandidateQueues[sender] && this.iceCandidateQueues[sender].length > 0) {
                    for (const cand of this.iceCandidateQueues[sender]) {
                        await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
                    }
                    this.iceCandidateQueues[sender] = [];
                }
            } else if (signal.type === 'candidate') {
                if (pc.remoteDescription && pc.remoteDescription.type) {
                    await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
                } else {
                    if (!this.iceCandidateQueues[sender]) this.iceCandidateQueues[sender] = [];
                    this.iceCandidateQueues[sender].push(signal.candidate);
                }
            }
        } catch (err) {
            console.error(`[VoiceEngine] Lỗi xử lý signaling từ ${sender}:`, err);
        }
    }

    async toggleMic() {
        if (window.audioContext && window.audioContext.state === 'suspended') {
            window.audioContext.resume().catch(() => {});
        }
        this.isMicMuted = !this.isMicMuted;
        this.updateMicUI();

        if (this.isMicMuted) {
            if (this.localAudioStream) {
                this.localAudioStream.getAudioTracks().forEach(track => track.enabled = false);
            }
        } else {
            if (!this.localAudioStream) {
                await this.getLocalAudioStream(true);
            }
            if (this.localAudioStream) {
                this.localAudioStream.getAudioTracks().forEach(track => track.enabled = true);
                for (const peerId in this.peerConnections) {
                    this.attachLocalStreamToPeer(peerId);
                    this.sendOfferToPeer(peerId);
                }
            } else {
                this.isMicMuted = true;
                this.updateMicUI();
            }
        }
    }

    toggleSpeaker() {
        if (window.audioContext && window.audioContext.state === 'suspended') {
            window.audioContext.resume().catch(() => {});
        }
        this.isSpeakerMuted = !this.isSpeakerMuted;
        sessionStorage.setItem('meono_speaker_muted', this.isSpeakerMuted ? 'true' : 'false');
        this.updateSpeakerUI();

        document.querySelectorAll('.remote-peer-audio').forEach(audioEl => {
            audioEl.muted = this.isSpeakerMuted;
        });
    }

    updateMicUI() {
        const iconMicOff = document.getElementById('iconMicOff');
        const iconMicOn = document.getElementById('iconMicOn');
        if (iconMicOff && iconMicOn) {
            if (this.isMicMuted) {
                iconMicOff.classList.remove('hidden');
                iconMicOn.classList.add('hidden');
            } else {
                iconMicOff.classList.add('hidden');
                iconMicOn.classList.remove('hidden');
            }
        }
    }

    updateSpeakerUI() {
        const iconSpeakerOn = document.getElementById('iconSpeakerOn');
        const iconSpeakerOff = document.getElementById('iconSpeakerOff');
        if (iconSpeakerOn && iconSpeakerOff) {
            if (this.isSpeakerMuted) {
                iconSpeakerOn.classList.add('hidden');
                iconSpeakerOff.classList.remove('hidden');
            } else {
                iconSpeakerOn.classList.remove('hidden');
                iconSpeakerOff.classList.add('hidden');
            }
        }
    }
}

window.VoiceEngine = new VoiceEngineClass();
