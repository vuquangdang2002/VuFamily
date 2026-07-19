import React, { useEffect, useRef } from "react";
import { useTranslation } from "../../shared/hooks/useTranslation";
import { PhoneOff } from "lucide-react";
import { loadJitsiApi } from "./utils/jitsiLoader";

export default function VoiceCall({
  user,
  activeCallRoom,
  onClearActiveCallRoom,
  addToast,
}) {
  const { t } = useTranslation();
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);

  // Keep functions in refs to avoid useEffect dependency triggers on every render
  const addToastRef = useRef(addToast);
  const onClearActiveCallRoomRef = useRef(onClearActiveCallRoom);

  useEffect(() => {
    addToastRef.current = addToast;
    onClearActiveCallRoomRef.current = onClearActiveCallRoom;
  }, [addToast, onClearActiveCallRoom]);

  const handleEndCall = async () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
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
    if (!activeCallRoom || !jitsiContainerRef.current) return;

    let isMounted = true;

    const initJitsi = async () => {
      try {
        // Tải API với cơ chế tự đổi domain nếu bị chặn
        const domain = await loadJitsiApi();
        if (!isMounted) return;

        const roomName = `vufamily-room-${activeCallRoom.roomId}-call-${activeCallRoom.callId}`;
        console.log(`[Jitsi] Starting call in room: ${roomName} via ${domain}`);

        const options = {
          roomName: roomName,
          width: "100%",
          height: "100%",
          parentNode: jitsiContainerRef.current,
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: !activeCallRoom.requestVideo,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            p2p: { enabled: true },
            resolution: 720,
          },
          interfaceConfigOverwrite: {
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            SHOW_CHROME_EXTENSION_BANNER: false,
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            TOOLBAR_BUTTONS: [
              "microphone",
              "camera",
              "desktop",
              "fullscreen",
              "fodeviceselection",
              "hangup",
              "profile",
              "chat",
              "settings",
              "raisehand",
              "videoquality",
              "filmstrip",
              "shortcuts",
              "tileview",
              "select-background",
              "mute-everyone",
              "security",
            ],
          },
          userInfo: {
            displayName: user?.full_name || user?.username || "Thành viên",
            email: user?.email || "",
          },
        };

        if (user?.avatar) {
          options.userInfo.avatarURL = user.avatar.startsWith("http")
            ? user.avatar
            : `${window.location.origin}${user.avatar}`;
        }

        const api = new window.JitsiMeetExternalAPI(domain, options);
        jitsiApiRef.current = api;

        api.addEventListener("videoConferenceLeft", () => {
          console.log("[Jitsi] User left the conference.");
          if (isMounted) handleEndCall();
        });

        api.addEventListener("readyToClose", () => {
          console.log("[Jitsi] Ready to close (redirect/hangup).");
          if (isMounted) handleEndCall();
        });
      } catch (e) {
        console.error("[Jitsi] Init error:", e);
        if (isMounted) {
          addToastRef.current(e.message || "Lỗi khởi tạo cuộc gọi.", "error");
          handleEndCall();
        }
      }
    };

    initJitsi();

    return () => {
      isMounted = false;
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
  }, [activeCallRoom, user]);

  if (!activeCallRoom) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-xl p-0 md:p-6 animate-fade-in">
      <div className="relative w-full h-full md:max-w-5xl md:max-h-[85vh] bg-zinc-950 md:rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-900/80 border-b border-white/5 z-10 shrink-0">
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
                  className={`w-2 h-2 rounded-full bg-emerald-500 animate-pulse`}
                />
                {t("call.connected") || "Đã kết nối"}
              </p>
            </div>
          </div>

          <button
            onClick={handleEndCall}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs md:text-sm flex items-center gap-2 transition-all shadow-lg shadow-rose-600/30 active:scale-95 shrink-0"
          >
            <PhoneOff size={16} />
            {t("call.end_btn") || "Kết thúc cuộc gọi"}
          </button>
        </div>

        {/* ── Main Jitsi Stage ── */}
        <div className="flex-1 relative bg-zinc-950 flex items-center justify-center overflow-hidden">
          <div ref={jitsiContainerRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}
