import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SERVER_URL = process.env.REACT_APP_SERVER_URL || "http://localhost:4000";
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

  const [voiceGuideOn, setVoiceGuideOn] = useState(true);

  // 직접 연결자/공유 참가자 각각의 존재 여부 (음성 안내는 클라이언트에서 최종 판단)
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
    setVoiceGuideOn(true);
    setHasDirect(false);
    setHasShared(false);
  };

  // 서버가 라우팅을 시도하되, 대상이 없어서 되돌려보내면(kiosk-activity-self) 여기서 직접 말함
  const speakLocally = (message) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = KIOSK_SPEECH_LANG_MAP[kioskLangRef.current] || "ko-KR";
      window.speechSynthesis.speak(utterance);
    }, 50);
  };

  const notify = (message) => {
    if (!voiceGuideRef.current) return;
    const cleanMessage = stripEmoji(message);
    if (!cleanMessage) return;

    if (hasDirectRef.current || hasSharedRef.current) {
      // 리모컨(직접이든 공유든)이 있으면 서버가 알아서 올바른 대상에게 보내줌
      socket.emit("kiosk-activity", { code: kioskCodeRef.current, message: cleanMessage, langId: kioskLangRef.current });
      return;
    }

    // 아무도 연결 안 되어 있으면 키오스크가 직접 말함
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
    // 대상이 없어서 서버가 되돌려보낸 안내 메시지 — 키오스크가 직접 말함
    const onActivitySelf = ({ message }) => {
      speakLocally(stripEmoji(message));
    };

    // 리모컨 참가/구성 변경 시, 존재 여부만 갱신 (음성 대상은 notify 호출 시점에 판단)
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

  // 장바구니 요약 텍스트를 리모컨(들)에게 실시간으로 전달
  const broadcastCartSummary = (summaryText) => {
    if (!kioskCodeRef.current) return;
    socket.emit("cart-updated", { code: kioskCodeRef.current, summaryText });
  };

  return {
    t,
    kioskLang,
    kioskLangRef,
    largeText,
    highContrast,
    voiceGuideOn,
    hasDirect,
    hasShared,
    kioskCode,
    kioskCodeRef,
    remainingSec,
    notify,
    handleRegenerateCode,
    finishAndResetKiosk,
    broadcastCartSummary,
  };
}
