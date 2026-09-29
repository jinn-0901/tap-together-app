import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

export const SERVER_URL = process.env.REACT_APP_SERVER_URL || "http://localhost:4000";
export const socket = io(SERVER_URL);

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
  const [easyMode, setEasyMode] = useState(false);

  const [voiceGuideOn, setVoiceGuideOn] = useState(true);

  const [hasDirect, setHasDirect] = useState(false);
  const [hasShared, setHasShared] = useState(false);

  const kioskCodeRef = useRef(null);
  const kioskLangRef = useRef("ko");
  const voiceGuideRef = useRef(true);
  const hasDirectRef = useRef(false);
  const hasSharedRef = useRef(false);

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
    hasDirectRef.current = hasDirect;
  }, [hasDirect]);

  useEffect(() => {
    hasSharedRef.current = hasShared;
  }, [hasShared]);

  const resetKioskDefaults = () => {
    setKioskLang("ko");
    setLargeText(false);
    setHighContrast(false);
    setEasyMode(false);
    setVoiceGuideOn(true);
    setHasDirect(false);
    setHasShared(false);
  };

  const speakLocally = (message) => {
    if (!window.speechSynthesis) return;
    // 클릭 직후 바로 재생 — setTimeout으로 지연시키면 일부 모바일 브라우저가
    // 사용자 제스처로 인정하지 않아 조용히 재생을 막을 수 있음
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = KIOSK_SPEECH_LANG_MAP[kioskLangRef.current] || "ko-KR";
    window.speechSynthesis.speak(utterance);
  };

  const notify = (message) => {
    if (!voiceGuideRef.current) return;
    const cleanMessage = stripEmoji(message);
    if (!cleanMessage) return;

    if (hasDirectRef.current) {
      // 직접 연결자가 있으면 그쪽에서만 소리나게 서버로 전달
      socket.emit("kiosk-activity", { code: kioskCodeRef.current, message: cleanMessage, langId: kioskLangRef.current });
      return;
    }

    // 직접 연결자가 없으면(공유만 있거나 아무도 없으면) 키오스크가 직접 말함
    speakLocally(cleanMessage);
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

    socket.on("kiosk-code-assigned", onCodeAssigned);
    requestNewCode();

    return () => {
      socket.off("kiosk-code-assigned", onCodeAssigned);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onActivitySelf = ({ message }) => {
      speakLocally(stripEmoji(message));
    };

    const onRosterChanged = ({ hasDirect: d, hasShared: s }) => {
      setHasDirect(d);
      setHasShared(s);
    };

    const onAllRemotesLeft = () => {
      setHasDirect(false);
      setHasShared(false);
      resetKioskDefaults();
    };

    const onLanguageChanged = ({ lang }) => {
      if (translationsData?.[lang]) setKioskLang(lang);
    };
    const onFeatureToggled = ({ featureId, on }) => {
      if (featureId === "large-text") setLargeText(on);
      if (featureId === "high-contrast") setHighContrast(on);
      if (featureId === "voice-guide") setVoiceGuideOn(on);
      if (featureId === "easy-mode") setEasyMode(on);
    };

    socket.on("kiosk-activity-self", onActivitySelf);
    socket.on("remote-roster-changed-for-kiosk", onRosterChanged);
    socket.on("all-remotes-left", onAllRemotesLeft);
    socket.on("language-changed", onLanguageChanged);
    socket.on("feature-toggled", onFeatureToggled);

    return () => {
      socket.off("kiosk-activity-self", onActivitySelf);
      socket.off("remote-roster-changed-for-kiosk", onRosterChanged);
      socket.off("all-remotes-left", onAllRemotesLeft);
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
    requestNewCode();
  };

  const finishAndResetKiosk = () => {
    socket.emit("kiosk-reset", kioskCodeRef.current);
    resetKioskDefaults();
    handleRegenerateCode();
  };

  return {
    t,
    kioskLang,
    kioskLangRef,
    largeText,
    highContrast,
    easyMode,
    voiceGuideOn,
    hasDirect,
    hasShared,
    kioskCode,
    kioskCodeRef,
    remainingSec,
    notify,
    handleRegenerateCode,
    finishAndResetKiosk,
  };
}
