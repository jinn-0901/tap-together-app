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

  // 화면에 보이지 않는 aria-live 영역에 띄울 문구. 음성 안내(TTS) 켜짐/꺼짐과 무관하게
  // 항상 갱신해서, 스크린리더 사용자가 리모컨 쪽에서 일어난 변화(예: 원격으로 메뉴 선택됨)도
  // 놓치지 않게 함
  const [liveMessage, setLiveMessage] = useState("");

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
    // 스크린리더가 올바른 언어 발음 규칙으로 화면을 읽도록 문서 언어도 같이 바꿈
    document.documentElement.lang = KIOSK_SPEECH_LANG_MAP[kioskLang]?.split("-")[0] || kioskLang;
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
    const cleanMessage = stripEmoji(message);
    if (!cleanMessage) return;

    // 스크린리더용 안내는 TTS 켜짐 여부와 무관하게 항상 갱신
    setLiveMessage(cleanMessage);

    if (!voiceGuideRef.current) return;

    if (hasDirectRef.current) {
      // 직접 연결자가 있으면 그쪽에서만 소리나게 서버로 전달
      socket.emit("kiosk-activity", { code: kioskCodeRef.current, message: cleanMessage, langId: kioskLangRef.current });
      return;
    }

    // 직접 연결자가 없으면(공유만 있거나 아무도 없으면) 키오스크가 직접 말함
    speakLocally(cleanMessage);
  };

  const hasConnectedOnceRef = useRef(false);

  const requestNewCode = () => {
    socket.emit("request-kiosk-code", kioskCodeRef.current);
  };

  useEffect(() => {
    const onCodeAssigned = ({ code }) => {
      kioskCodeRef.current = code;
      setKioskCode(code);
      setCodeCreatedAt(Date.now());
    };

    // 와이파이가 잠깐 끊겼다 소켓이 재연결되는 경우: 서버는 연결이 끊기는 순간
    // 이미 이 키오스크의 이전 코드/연결된 리모컨들을 전부 정리해버림(재시도 로직 없이
    // 즉시 초기화하는 지금 방식대로). 그래서 재연결 시 예전 코드는 이미 죽어있는데,
    // 최대 10분(코드 만료 타이머)까지 화면엔 죽은 코드가 그대로 떠 있게 되는 문제가 있어서
    // 재연결되는 즉시 새 코드를 다시 받아오게 함 (최초 연결 때는 건너뜀 — 아래서 한 번만 요청함)
    const onConnect = () => {
      if (hasConnectedOnceRef.current) {
        // 서버는 이미 이전에 연결돼있던 리모컨들도 다 정리한 상태라 화면 상태도 같이 초기화
        resetKioskDefaults();
        requestNewCode();
      }
      hasConnectedOnceRef.current = true;
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

  useEffect(() => {
    const onActivitySelf = ({ message }) => {
      const cleanMessage = stripEmoji(message);
      setLiveMessage(cleanMessage);
      speakLocally(cleanMessage);
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
    // handleRegenerateCode()를 그대로 부르면 "kiosk-reset"(결제 완료로 나감) 바로 뒤에
    // "kiosk-manual-refresh"(수동 새로고침)까지 또 보내서 서버 로그가 두 번 찍히고
    // resetKioskDefaults()도 중복 호출됨 — 여기서는 새 코드만 바로 받아오면 됨
    // (request-kiosk-code 핸들러가 이전 코드의 리모컨 정리까지 알아서 함)
    socket.emit("kiosk-reset", kioskCodeRef.current);
    resetKioskDefaults();
    requestNewCode();
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
    liveMessage,
    notify,
    handleRegenerateCode,
    finishAndResetKiosk,
  };
}
