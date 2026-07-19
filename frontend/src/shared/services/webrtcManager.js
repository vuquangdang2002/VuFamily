import { syncCoordinator } from "./syncCoordinator";
import { myLog, myError } from "./logger";

export class WebRTCManager {
  constructor(userId, targetUserIds, roomId) {
    this.userId = userId;
    this.targetUserIds = targetUserIds;
    this.roomId = roomId;
    this.peers = new Map(); // Map targetUserId -> RTCPeerConnection
    this.localStream = null;
    this.processedStream = null; // Stream after Beauty/Blur filters
    this.displayStream = null; // Screen share stream
    this.remoteStreams = new Map(); // Map targetUserId -> MediaStream

    this.onRemoteStreamAdd = null;
    this.onRemoteStreamRemove = null;
    this.onConnectionStateChange = null;

    // Features state
    this.isAudioMuted = false;
    this.isVideoMuted = false;
    this.isBeautyEnabled = false;
    this.isBlurEnabled = false;

    // Bind WebSocket listener
    this.handleSignalingMessage = this.handleSignalingMessage.bind(this);
    syncCoordinator.subscribe("webrtc_signaling", this.handleSignalingMessage);
  }

  // --- Stream Initialization ---

  async initializeLocalStream(requestVideo = true) {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: requestVideo
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            }
          : false,
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

      // By default, processed stream is the raw stream until filters are enabled
      this.processedStream = this.localStream;

      return this.processedStream;
    } catch (e) {
      myError("WebRTC", "Failed to get local media:", e);
      throw e;
    }
  }

  // --- WebRTC Peer Management ---

  createPeerConnection(targetUserId) {
    if (this.peers.has(targetUserId)) {
      return this.peers.get(targetUserId);
    }

    const configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    };

    const pc = new RTCPeerConnection(configuration);

    // Add local tracks
    if (this.processedStream) {
      this.processedStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.processedStream);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage("webrtc_ice_candidate", targetUserId, {
          candidate: event.candidate,
        });
      }
    };

    // Handle incoming tracks
    pc.ontrack = (event) => {
      myLog("WebRTC", `Received track from ${targetUserId}`);
      const stream = event.streams[0];
      if (!this.remoteStreams.has(targetUserId)) {
        this.remoteStreams.set(targetUserId, stream);
        if (this.onRemoteStreamAdd)
          this.onRemoteStreamAdd(targetUserId, stream);
      }
    };

    // Handle state changes
    pc.onconnectionstatechange = () => {
      myLog(
        "WebRTC",
        `Connection state with ${targetUserId}: ${pc.connectionState}`,
      );
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(targetUserId, pc.connectionState);
      }
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        this.removePeer(targetUserId);
      }
    };

    this.peers.set(targetUserId, pc);
    return pc;
  }

  removePeer(targetUserId) {
    if (this.peers.has(targetUserId)) {
      this.peers.get(targetUserId).close();
      this.peers.delete(targetUserId);
    }
    if (this.remoteStreams.has(targetUserId)) {
      this.remoteStreams.delete(targetUserId);
      if (this.onRemoteStreamRemove) this.onRemoteStreamRemove(targetUserId);
    }
  }

  // --- Signaling Actions ---

  async startCall() {
    for (const targetUserId of this.targetUserIds) {
      const pc = this.createPeerConnection(targetUserId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.sendSignalingMessage("webrtc_offer", targetUserId, {
          sdp: offer,
        });
      } catch (e) {
        myError("WebRTC", `Error creating offer for ${targetUserId}:`, e);
      }
    }
  }

  sendSignalingMessage(type, targetUserId, payload) {
    syncCoordinator.send({
      type: type,
      roomId: this.roomId,
      targetUserId: targetUserId,
      ...payload,
    });
  }

  async handleSignalingMessage(msg) {
    // Only handle messages intended for this room
    if (msg.roomId !== this.roomId) return;

    // Target user is the sender of the message
    const targetUserId = msg.senderId;
    if (!targetUserId) return;

    try {
      const pc = this.createPeerConnection(targetUserId);

      if (msg.type === "webrtc_offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.sendSignalingMessage("webrtc_answer", targetUserId, {
          sdp: answer,
        });
      } else if (msg.type === "webrtc_answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      } else if (msg.type === "webrtc_ice_candidate") {
        if (msg.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        }
      }
    } catch (e) {
      myError("WebRTC", `Error handling signaling message ${msg.type}:`, e);
    }
  }

  // --- Controls & Filters ---

  toggleAudio() {
    if (!this.localStream) return false;
    this.isAudioMuted = !this.isAudioMuted;
    this.localStream
      .getAudioTracks()
      .forEach((t) => (t.enabled = !this.isAudioMuted));
    return this.isAudioMuted;
  }

  toggleVideo() {
    if (!this.localStream) return false;
    this.isVideoMuted = !this.isVideoMuted;
    this.localStream
      .getVideoTracks()
      .forEach((t) => (t.enabled = !this.isVideoMuted));
    return this.isVideoMuted;
  }

  // Beauty and Blur Filter Placeholders (To be integrated with UI Canvas)
  setProcessedStream(canvasStream) {
    if (!canvasStream) return;

    // Keep the original audio track
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        canvasStream.addTrack(audioTracks[0]);
      }
    }

    this.processedStream = canvasStream;

    // Replace video track in all active peer connections
    const videoTrack = canvasStream.getVideoTracks()[0];
    if (videoTrack) {
      for (const pc of this.peers.values()) {
        const sender = pc
          .getSenders()
          .find((s) => s.track && s.track.kind === "video");
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      }
    }
  }

  async toggleScreenShare() {
    if (this.displayStream) {
      // Stop sharing
      this.displayStream.getTracks().forEach((t) => t.stop());
      this.displayStream = null;

      // Revert to camera video track
      const videoTrack = this.processedStream.getVideoTracks()[0];
      if (videoTrack) {
        for (const pc of this.peers.values()) {
          const sender = pc
            .getSenders()
            .find((s) => s.track && s.track.kind === "video");
          if (sender) sender.replaceTrack(videoTrack);
        }
      }
      return false;
    } else {
      // Start sharing
      try {
        this.displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const screenTrack = this.displayStream.getVideoTracks()[0];

        screenTrack.onended = () => {
          this.toggleScreenShare(); // Revert back if user clicks "Stop sharing" on browser UI
        };

        for (const pc of this.peers.values()) {
          const sender = pc
            .getSenders()
            .find((s) => s.track && s.track.kind === "video");
          if (sender) sender.replaceTrack(screenTrack);
        }
        return true;
      } catch (e) {
        myError("WebRTC", "Screen share denied/failed:", e);
        return false;
      }
    }
  }

  // --- Cleanup ---

  destroy() {
    // syncCoordinator uses standard event emitters style, if implemented
    // syncCoordinator.unsubscribe('webrtc_signaling', this.handleSignalingMessage);

    for (const pc of this.peers.values()) {
      pc.close();
    }
    this.peers.clear();
    this.remoteStreams.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
    }
    if (this.displayStream) {
      this.displayStream.getTracks().forEach((t) => t.stop());
    }
  }
}
