import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SERVER_URL = process.env.REACT_APP_SERVER_URL || "http://localhost:4000";
export const socket = io(SERVER_URL, {
  transports: ["websocket", "polling"],
});

const CODE_TTL_MS = 10 * 60 * 1000;

const KIOSK_SPEECH_LANG_MAP = { ko: "ko-KR", en: "en-US", zh: "zh-CN", ja: "ja-JP", vi: "vi-VN" };

const stripEmoji = (text) =>
  text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

export function useKioskConnection() {
  const [translationsData, setTranslationsData] = useState(null);

  const [kioskCode, setKioskCode] = useState(null);
  const [codeCreatedAt, setCodeCreatedAt] = useState(Date.now());
  const [remainingSec, setRemainingSec] = useState(CODE_TTL_MS / 1000);

  const [kioskLang, setKioskLang] = useState("ko");
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  const [voiceGuideOn, setVoiceGuideOn] = useState(true);
  const [remoteConnected, setRemoteConnected] = useState(false);

  const kioskCodeRef = useRef(null);
  const kioskLangRef = useRef("ko");
  const voiceGuideRef = useRef(true);
  const remoteConnectedRef = useRef(false);

  const t = translationsData ? translationsData[kioskLang] || translationsData.ko : null;

  useEffect(() => {
    fetch(`${SERVER_URL}/translations/app`)
      .then((res) => res.json())
      .then((data) => setTranslationsData(data))
      .catch(() => setTranslationsData(null));
  }, []);

  useEffect(() => {
    kioskLangRef.current = kioskLang;
  }, [kioskLang]);

  useEffect(() => {
    voiceGuideRef.current = voiceGuideOn;
  }, [voiceGuideOn]);

  useEffect(() => {
    remoteConnectedRef.current = remoteConnected;
  }, [remoteConnected]);

  const resetKioskDefaults = () => {
    setKioskLang("ko");
    setLargeText(false);
    setHighContrast(false);
    setVoiceGuideOn(true);
  };

  const notify = (message) => {
    if (!voiceGuideRef.current) return;
    const cleanMessage = stripEmoji(message);
    if (!cleanMessage) return;

    if (remoteConnectedRef.current) {
      socket.emit("kiosk-activity", { code: kioskCodeRef.current, message: cleanMessage, langId: kioskLangRef.current });
      return;
    }

    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(cleanMessage);
      utterance.lang = KIOSK_SPEECH_LANG_MAP[kioskLangRef.current] || "ko-KR";
      window.speechSynthesis.speak(utterance);
    }, 50);
  };

  const requestNewCode = () => {
    socket.emit("request-kiosk-code", kioskCodeRef.current);
  };

  useEffect(() => {
    const onCodeAssigned = ({ code }) => {
      kioskCodeRef.current = code;
      setKioskCode(code);
      setCodeCreatedAt(Date.now());
    };

    const onConnect = () => {
      if (kioskCodeRef.current && !socket.recovered) {
        requestNewCode();
      }
    };

    socket.on("kiosk-code-assigned", onCodeAssigned);
    socket.on("connect", onConnect);
    requestNewCode();

    return () => {
      socket.off("kiosk-code-assigned", onCodeAssigned);
      socket.off("connect", onConnect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 10초마다 "내 코드가 서버에 아직 살아있는지" 직접 확인 — 유예 시간을 넘겨 코드가 사라진 경우를 빨리 감지
  useEffect(() => {
    const onCheckResult = ({ valid }) => {
      if (!valid && kioskCodeRef.current) {
        console.log("서버에 내 코드가 없음 → 새 코드 요청");
        requestNewCode();
      }
    };

    socket.on("kiosk-code-check-result", onCheckResult);

    const interval = setInterval(() => {
      if (kioskCodeRef.current) {
        socket.emit("check-kiosk-code", kioskCodeRef.current);
      }
    }, 10000);

    return () => {
      socket.off("kiosk-code-check-result", onCheckResult);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const onRemoteJoined = () => setRemoteConnected(true);
    const onRemoteLeft = () => {
      setRemoteConnected(false);
      resetKioskDefaults();
    };
    const onKioskLeft = () => {
      setRemoteConnected(false);
      resetKioskDefaults();
    };
    const onLanguageChanged = ({ lang }) => {
      if (translationsData?.[lang]) setKioskLang(lang);
    };
    const onFeatureToggled = ({ featureId, on }) => {
      if (featureId === "large-text") setLargeText(on);
      if (featureId === "high-contrast") setHighContrast(on);
      if (featureId === "voice-guide") setVoiceGuideOn(on);
    };

    socket.on("remote-joined", onRemoteJoined);
    socket.on("remote-left", onRemoteLeft);
    socket.on("kiosk-left", onKioskLeft);
    socket.on("language-changed", onLanguageChanged);
    socket.on("feature-toggled", onFeatureToggled);

    return () => {
      socket.off("remote-joined", onRemoteJoined);
      socket.off("remote-left", onRemoteLeft);
      socket.off("kiosk-left", onKioskLeft);
      socket.off("language-changed", onLanguageChanged);
      socket.off("feature-toggled", onFeatureToggled);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translationsData]);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - codeCreatedAt;
      const remaining = Math.max(0, Math.floor((CODE_TTL_MS - elapsed) / 1000));
      setRemainingSec(remaining);
      if (remaining <= 0) requestNewCode();
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeCreatedAt]);

  const handleRegenerateCode = () => {
    if (kioskCodeRef.current) {
      socket.emit("kiosk-manual-refresh", kioskCodeRef.current);
    }
    resetKioskDefaults();
    setRemoteConnected(false);
    requestNewCode();
  };

  const finishAndResetKiosk = () => {
    socket.emit("kiosk-reset", kioskCodeRef.current);
    resetKioskDefaults();
    setRemoteConnected(false);
    handleRegenerateCode();
  };

  return {
    t,
    kioskLang,
    kioskLangRef,
    largeText,
    highContrast,
    voiceGuideOn,
    remoteConnected,
    kioskCode,
    kioskCodeRef,
    remainingSec,
    notify,
    handleRegenerateCode,
    finishAndResetKiosk,
  };
}
