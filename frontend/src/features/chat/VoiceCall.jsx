import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "../../shared/hooks/useTranslation";
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  Wand2,
  User,
} from "lucide-react";
import { WebRTCManager } from "../../shared/services/webrtcManager";
import { syncCoordinator } from "../../shared/services/syncCoordinator";
import { myLog } from "../../shared/services/logger";

export default function VoiceCall({
  user,
  activeCallRoom,
  onClearActiveCallRoom,
  addToast,
}) {
  const { t } = useTranslation();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const webrtcManagerRef = useRef(null);

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isBeautyEnabled, setIsBeautyEnabled] = useState(false);

  // Status tracking
  const [callStatus, setCallStatus] = useState("Đang kết nối...");
  const [remoteStreams, setRemoteStreams] = useState([]);

  // Refs for handlers to prevent unnecessary re-renders in useEffects
  const addToastRef = useRef(addToast);
  const onClearActiveCallRoomRef = useRef(onClearActiveCallRoom);

  useEffect(() => {
    addToastRef.current = addToast;
    onClearActiveCallRoomRef.current = onClearActiveCallRoom;
  }, [addToast, onClearActiveCallRoom]);

  const handleEndCall = async () => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.destroy();
      webrtcManagerRef.current = null;
    }

    // Notify backend that we ended the call
    if (activeCallRoom?.callId) {
      try {
        const token = localStorage.getItem("vuFamilyToken");
        await fetch("/api/calls/end", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": token,
          },
          body: JSON.stringify({ callId: activeCallRoom.callId }),
        });
      } catch (e) {
        console.error("[VoiceCall] Failed to end call on backend", e);
      }
    }

    addToastRef.current(t("call.ended") || "Cuộc gọi kết thúc.", "info");
    onClearActiveCallRoomRef.current();
  };

  useEffect(() => {
    if (!activeCallRoom) return;
    let isMounted = true;

    const initWebRTC = async () => {
      try {
        // Determine target user IDs
        let targetUserIds = [];
        if (activeCallRoom.targetUserIds) {
          targetUserIds = activeCallRoom.targetUserIds;
        } else if (
          activeCallRoom.callerId &&
          activeCallRoom.callerId !== user.id
        ) {
          targetUserIds = [activeCallRoom.callerId];
        }

        if (targetUserIds.length === 0) {
          throw new Error("Không tìm thấy người dùng để kết nối.");
        }

        const manager = new WebRTCManager(
          user.id,
          targetUserIds,
          activeCallRoom.roomId,
        );
        webrtcManagerRef.current = manager;

        manager.onRemoteStreamAdd = (targetId, stream) => {
          myLog("VoiceCall", "Remote stream added from", targetId);
          if (!isMounted) return;
          setRemoteStreams((prev) => {
            const exists = prev.find((s) => s.id === targetId);
            if (exists) return prev;
            return [...prev, { id: targetId, stream }];
          });
          setCallStatus("Đã kết nối");
        };

        manager.onRemoteStreamRemove = (targetId) => {
          myLog("VoiceCall", "Remote stream removed from", targetId);
          if (!isMounted) return;
          setRemoteStreams((prev) => prev.filter((s) => s.id !== targetId));
          // Check if all left
          if (manager.peers.size === 0) {
            addToastRef.current(
              "Người dùng bên kia đã kết thúc cuộc gọi.",
              "info",
            );
            handleEndCall();
          }
        };

        manager.onConnectionStateChange = (targetId, state) => {
          if (!isMounted) return;
          if (state === "connected") {
            setCallStatus("Đã kết nối");
          } else if (state === "disconnected" || state === "failed") {
            // handled by stream remove
          }
        };

        const stream = await manager.initializeLocalStream(
          activeCallRoom.requestVideo,
        );

        if (isMounted && localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // If caller, initiate offers
        if (activeCallRoom.callerId === user.id) {
          setCallStatus("Đang gọi...");
          await manager.startCall();
        } else {
          setCallStatus("Đang đợi kết nối...");
        }
      } catch (e) {
        console.error("[VoiceCall] Init error:", e);
        if (isMounted) {
          addToastRef.current(e.message || "Lỗi khởi tạo cuộc gọi.", "error");
          handleEndCall();
        }
      }
    };

    initWebRTC();

    return () => {
      isMounted = false;
      if (webrtcManagerRef.current) {
        webrtcManagerRef.current.destroy();
        webrtcManagerRef.current = null;
      }
    };
  }, [activeCallRoom, user]);

  // Handle incoming stream updates for remote video tag
  useEffect(() => {
    if (remoteVideoRef.current && remoteStreams.length > 0) {
      // Pick the first remote stream for now (1-1 call)
      remoteVideoRef.current.srcObject = remoteStreams[0].stream;
    }
  }, [remoteStreams]);

  // --- Toolbar Actions ---

  const toggleAudio = () => {
    if (webrtcManagerRef.current) {
      const muted = webrtcManagerRef.current.toggleAudio();
      setIsAudioMuted(muted);
    }
  };

  const toggleVideo = () => {
    if (webrtcManagerRef.current) {
      const muted = webrtcManagerRef.current.toggleVideo();
      setIsVideoMuted(muted);
    }
  };

  const toggleScreenShare = async () => {
    if (webrtcManagerRef.current) {
      const sharing = await webrtcManagerRef.current.toggleScreenShare();
      setIsScreenSharing(sharing);
      // Re-assign local video ref if we started sharing
      if (localVideoRef.current) {
        localVideoRef.current.srcObject =
          webrtcManagerRef.current.displayStream ||
          webrtcManagerRef.current.processedStream;
      }
    }
  };

  const toggleBeautyFilter = () => {
    // Placeholder for future WebGL integration
    const newState = !isBeautyEnabled;
    setIsBeautyEnabled(newState);
    if (newState) {
      addToastRef.current("Đã bật tính năng Làm đẹp", "success");
    } else {
      addToastRef.current("Đã tắt tính năng Làm đẹp", "info");
    }
  };

  if (!activeCallRoom) return null;

  const hasRemoteStream = remoteStreams.length > 0;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-xl p-0 md:p-6 animate-fade-in">
      <div className="relative w-full h-full md:max-w-6xl md:max-h-[90vh] bg-zinc-950 md:rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-900/80 border-b border-white/5 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xl">
              {activeCallRoom.requestVideo ? "📹" : "📞"}
            </span>
            <div>
              <h3 className="m-0 text-base font-bold text-white tracking-tight">
                {activeCallRoom.display_name || t("call.call_label")}
              </h3>
              <p className="m-0 text-xs text-zinc-400 font-medium flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${callStatus === "Đã kết nối" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}
                />
                {callStatus}
              </p>
            </div>
          </div>
        </div>

        {/* ── Main Stage (Native Video Elements) ── */}
        <div className="flex-1 relative bg-zinc-950 flex items-center justify-center overflow-hidden p-4 gap-4">
          {/* Remote Video Container */}
          <div
            className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-zinc-900 transition-all duration-500 ${hasRemoteStream ? "w-full h-full" : "hidden"}`}
          >
            {hasRemoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-500 gap-4">
                <User size={48} className="opacity-50" />
                <p>Đang chờ hình ảnh...</p>
              </div>
            )}
          </div>

          {/* Local Video Container (Picture-in-Picture or Half-split) */}
          <div
            className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-zinc-800 border border-white/10 shadow-2xl transition-all duration-500 ${hasRemoteStream ? "absolute bottom-6 right-6 w-48 h-64 z-30 shadow-black/50" : "w-full h-full"}`}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted // Always mute local video to prevent echo
              className={`w-full h-full object-cover ${!isScreenSharing && "scale-x-[-1]"}`}
            />
            {isVideoMuted && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/90 backdrop-blur-sm z-10">
                <VideoOff size={32} className="text-zinc-500" />
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] text-white/80 font-medium z-20 backdrop-blur-md">
              Bạn
            </div>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="flex items-center justify-center gap-4 px-6 py-6 bg-zinc-900/80 border-t border-white/5 z-20 shrink-0">
          {/* Microphone Toggle */}
          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 ${isAudioMuted ? "bg-rose-500/20 text-rose-500 hover:bg-rose-500/30" : "bg-white/10 text-white hover:bg-white/20"}`}
            title={isAudioMuted ? "Bật Mic" : "Tắt Mic"}
          >
            {isAudioMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>

          {/* Camera Toggle */}
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 ${isVideoMuted ? "bg-rose-500/20 text-rose-500 hover:bg-rose-500/30" : "bg-white/10 text-white hover:bg-white/20"}`}
            title={isVideoMuted ? "Bật Camera" : "Tắt Camera"}
          >
            {isVideoMuted ? <VideoOff size={24} /> : <Video size={24} />}
          </button>

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            className={`p-4 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 ${isScreenSharing ? "bg-blue-500 text-white hover:bg-blue-600 shadow-blue-500/30" : "bg-white/10 text-white hover:bg-white/20"}`}
            title="Chia sẻ màn hình"
          >
            <MonitorUp size={24} />
          </button>

          {/* Beauty Filter Toggle */}
          <button
            onClick={toggleBeautyFilter}
            className={`p-4 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 ${isBeautyEnabled ? "bg-pink-500 text-white hover:bg-pink-600 shadow-pink-500/30" : "bg-white/10 text-white hover:bg-white/20"}`}
            title="Làm đẹp (Beta)"
          >
            <Wand2 size={24} />
          </button>

          <div className="w-px h-10 bg-white/10 mx-2" />

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            className="px-8 py-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm flex items-center gap-2 transition-all shadow-xl shadow-rose-600/30 active:scale-95 shrink-0"
          >
            <PhoneOff size={24} />
            <span className="hidden sm:inline">Cúp máy</span>
          </button>
        </div>
      </div>
    </div>
  );
}
