/**
 * NativeAnimePlayer
 * Professional React Native Video Player for HindiAnime.
 *
 * Features:
 *  • expo-video HLS playback with contentType:'hls'
 *  • Real audio track switching (auto-selects Hindi audio on load)
 *  • Quality display & Playback speed selector (0.5× – 2×)
 *  • Center Controls: Big Play/Pause button + Rewind 10s + Forward 10s
 *  • Double-tap Left/Right to Seek ±10s with animated visual ripple HUD
 *  • Horizontal Slide/Swipe gesture across screen to Seek with preview HUD
 *  • Rock-solid smooth progress bar scrubber (hit area with child pointerEvents="none")
 *  • Prominent Back button in Fullscreen that restores portrait/short-screen
 *  • Android hardware back button exits fullscreen
 *  • Fullscreen via ScreenOrientation lock (single shared player instance)
 *  • Polished Error overlay with Retry & no LogBox popups
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  Animated,
  ActivityIndicator,
  useWindowDimensions,
  BackHandler,
  StatusBar,
  Platform,
  LogBox,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

LogBox.ignoreLogs([
  '[HindiAnimePlayer]',
  'A playback exception has occurred',
  'Source error Response code',
  'Response code: 520',
  'Response code: 502',
]);

import {
  useVideoPlayer,
  VideoView,
  VideoSource,
  AudioTrack,
  VideoTrack,
} from 'expo-video';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as ScreenOrientation from 'expo-screen-orientation';
import { NavigationBar } from 'expo-navigation-bar';
import { HardwareControl } from '../../utils/hardwareControl';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Volume1,
  VolumeX,
  Sun,
  Maximize,
  Minimize,
  Languages,
  Sliders,
  Check,
  ChevronLeft,
  Scan,
} from 'lucide-react-native';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NativeAnimePlayerProps {
  src: string;
  fallbackSrc?: string;
  isFullscreen?: boolean;
  title?: string;
  subtitle?: string;
  poster?: string;
  season?: number;
  episode?: number;
  isMovie?: boolean;
  initialTime?: number;
  autoPlay?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  onBack?: () => void;
  onEnded?: () => void;
  onError?: (err: string) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const GREEN = '#22c55e';
const DARK_BG = '#0a0f0c';
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

// ─── Immersive mode helpers ───────────────────────────────────────────────────

function enterImmersiveMode(): Promise<void> {
  try {
    StatusBar.setHidden(true, 'fade');
    if (Platform.OS === 'android') {
      NavigationBar.setHidden(true);
    }
  } catch { /* ignore */ }
  return Promise.resolve();
}

function exitImmersiveMode(): Promise<void> {
  try {
    StatusBar.setHidden(false, 'fade');
    if (Platform.OS === 'android') {
      NavigationBar.setHidden(false);
    }
  } catch { /* ignore */ }
  return Promise.resolve();
}

function fmt(secs: number): string {
  if (!secs || isNaN(secs) || secs < 0) return '00:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function isHindiTrack(t: AudioTrack): boolean {
  const lang = (t.language || '').toLowerCase();
  const label = (t.label || '').toLowerCase();
  const name = ((t as any).name || '').toLowerCase();
  return lang === 'hi' || lang.includes('hin') || label.includes('hindi') || name.includes('hindi');
}

// ─── Component ───────────────────────────────────────────────────────────────

export const NativeAnimePlayer: React.FC<NativeAnimePlayerProps> = ({
  src,
  fallbackSrc,
  isFullscreen: propIsFullscreen,
  title = 'Hindi Anime',
  season,
  episode,
  isMovie = false,
  initialTime = 0,
  autoPlay = true,
  onTimeUpdate,
  onFullscreenChange,
  onBack,
  onEnded,
  onError,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // ── Playback state ──────────────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isBuffering, setIsBuffering] = useState(true);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [screenSizeMode, setScreenSizeMode] = useState<'fit' | 'fill' | 'stretch'>('fit');

  const contentFitValue = useMemo<'contain' | 'cover' | 'fill'>(() => {
    if (screenSizeMode === 'fill') return 'cover';
    if (screenSizeMode === 'stretch') return 'fill';
    return 'contain';
  }, [screenSizeMode]);

  // ── Volume & Brightness Gesture states ──────────────────────────────────
  const originalBrightnessRef = useRef<number | null>(null);
  const originalVolumeRef = useRef<number | null>(null);
  const [brightness, setBrightness] = useState(0.7);
  const brightnessAnim = useRef(new Animated.Value(0.7)).current;
  const [volume, setVolume] = useState(0.7);
  const volumeRef = useRef(0.7);
  const brightnessRef = useRef(0.7);
  const currentTimeRef = useRef(initialTime);
  const durationRef = useRef(0);
  const playerLayoutRef = useRef<{ width: number; height: number }>({
    width: windowWidth,
    height: windowWidth * (9 / 16),
  });
  const lastHudUpdateRef = useRef(0);

  // ── Continuous gesture tracking refs (persists smoothly across re-renders with zero stutter)
  const dragZoneRef = useRef<'brightness' | 'volume' | 'none'>('none');
  const startValueRef = useRef<number>(0);
  const currentValueRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  const [feedbackHud, setFeedbackHud] = useState<{ type: 'volume' | 'brightness'; value: number } | null>(null);
  const hudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Interactive Scrubbing & Gestures ────────────────────────────────────
  const [scrubbingTime, setScrubbingTime] = useState<number | null>(null);
  const isScrubbingRef = useRef(false);
  const barWidth = useRef(0);

  // Slide to seek HUD
  const [slideSeek, setSlideSeek] = useState<{ deltaSec: number; targetTime: number } | null>(null);

  // Double tap feedback HUD
  const [doubleTapSide, setDoubleTapSide] = useState<'left' | 'right' | null>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doubleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Track state ─────────────────────────────────────────────────────────
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [currentAudio, setCurrentAudio] = useState<AudioTrack | null>(null);
  const [videoTracks, setVideoTracks] = useState<VideoTrack[]>([]);
  const [currentVideo, setCurrentVideo] = useState<VideoTrack | null>(null);
  const [selectedQualityId, setSelectedQualityId] = useState<string>('auto');

  // ── UI state ────────────────────────────────────────────────────────────
  const [activeMenu, setActiveMenu] = useState<'none' | 'audio' | 'quality' | 'speed' | 'screensize'>('none');
  const [isControlsVisible, setIsControlsVisible] = useState(true);

  // ── Animated values ─────────────────────────────────────────────────────
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const controlsVisible = useRef(true);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoViewRef = useRef<VideoView>(null);

  // ── Active video source & Fallback support ───────────────────────────────
  const [currentSrc, setCurrentSrc] = useState(src);
  useEffect(() => {
    setCurrentSrc(src);
    setPlayerError(null);
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
  }, [src]);

  const videoSource: VideoSource = useMemo(() => {
    if (!currentSrc) return null;
    return {
      uri: currentSrc,
      contentType: 'hls',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: '*/*',
        Origin: 'https://ravok.buzz',
        Referer: 'https://ravok.buzz/',
      },
    };
  }, [currentSrc]);

  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.25; // 250ms interval for smooth continuous progress updates
    try {
      p.bufferOptions = {
        preferredForwardBufferDuration: 45, // Buffer ahead 45 seconds of video
        minBufferForPlayback: 2,           // Only 2s required to resume when network is slow
        prioritizeTimeOverSizeThreshold: true,
      };
    } catch {}
    if (initialTime > 0) p.currentTime = initialTime;
    if (autoPlay) p.play();
  });

  const playerRef = useRef(player);
  playerRef.current = player;

  // Ensure timeUpdate interval and buffering options are configured on player instance
  useEffect(() => {
    if (!player) return;
    try {
      player.timeUpdateEventInterval = 0.25;
      player.bufferOptions = {
        preferredForwardBufferDuration: 45,
        minBufferForPlayback: 2,
        prioritizeTimeOverSizeThreshold: true,
      };
    } catch { /* ignore */ }
  }, [player]);

  // Synchronize actual hardware device brightness and media volume
  useEffect(() => {
    let isMounted = true;
    HardwareControl.getBrightness().then((b) => {
      if (isMounted && typeof b === 'number' && b > 0) {
        if (originalBrightnessRef.current === null) {
          originalBrightnessRef.current = b;
        }
        setBrightness(b);
        brightnessRef.current = b;
        brightnessAnim.setValue(b);
      }
    });
    HardwareControl.getVolume().then((v) => {
      if (isMounted && typeof v === 'number') {
        if (originalVolumeRef.current === null) {
          originalVolumeRef.current = v;
        }
        setVolume(v);
        volumeRef.current = v;
        if (player) {
          player.volume = v;
        }
      }
    });

    // Sync physical hardware volume button presses directly
    const unsubscribeVol = HardwareControl.addVolumeListener((newVol) => {
      if (!isMounted) return;
      if (!isDraggingRef.current) {
        volumeRef.current = newVol;
        // Only update React state from hardware buttons — not during gesture drags
        setVolume(newVol);
        if (player) {
          player.volume = newVol;
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribeVol();
    };
  }, [player, brightnessAnim]);

  // ── Controls show/hide (5 second auto-hide) ─────────────────────────────
  const hideControls = useCallback(() => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    Animated.timing(controlsOpacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
      setIsControlsVisible(false);
    });
    controlsVisible.current = false;
  }, [controlsOpacity]);

  const showControls = useCallback(() => {
    controlsVisible.current = true;
    setIsControlsVisible(true);
    Animated.timing(controlsOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      hideControls();
    }, 5000); // Stays visible for 5 full seconds before disappearing
  }, [controlsOpacity, hideControls]);

  const scheduleHide = useCallback(() => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      hideControls();
    }, 5000);
  }, [hideControls]);

  const toggleControls = useCallback(() => {
    if (activeMenu !== 'none') {
      setActiveMenu('none');
      return;
    }
    if (!controlsVisible.current) {
      showControls();
    } else {
      hideControls();
    }
  }, [activeMenu, showControls, hideControls]);

  // ── Player event listeners ──────────────────────────────────────────────
  useEffect(() => {
    if (!player) return;

    const s1 = player.addListener('statusChange', (p) => {
      if (p.status === 'error') {
        const msg = p.error?.message || 'Stream connection error';
        console.warn('[HindiAnimePlayer] Playback warning:', msg);
        setPlayerError(msg);
        setIsBuffering(false);
        if (onError) onError(msg);
      } else if (p.status === 'readyToPlay') {
        setIsBuffering(false);
        setDuration(player.duration || 0);
      } else if (p.status === 'loading') {
        setIsBuffering(true);
      }
    });

    const s2 = player.addListener('playingChange', (p) => {
      setIsPlaying(p.isPlaying);
      if (p.isPlaying) {
        setIsBuffering(false);
        scheduleHide();
      } else {
        showControls();
        if (controlsTimer.current) clearTimeout(controlsTimer.current);
      }
    });

    const s3 = player.addListener('timeUpdate', (p) => {
      if (!isScrubbingRef.current) {
        setCurrentTime(p.currentTime);
        currentTimeRef.current = p.currentTime;
        if (p.bufferedPosition > 0) setBuffered(p.bufferedPosition);
      }
      const dur = player.duration || 0;
      if (dur > 0 && dur !== durationRef.current) {
        setDuration(dur);
        durationRef.current = dur;
      }
      if (p.currentTime > 0) setIsBuffering(false);
      if (onTimeUpdate) onTimeUpdate(p.currentTime, durationRef.current || dur);
    });

    const s4 = player.addListener('playToEnd', () => {
      setIsPlaying(false);
      showControls();
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
      if (onEnded) onEnded();
    });

    const s5 = player.addListener('sourceLoad', (p) => {
      const tracks = p.availableAudioTracks || [];
      setAudioTracks(tracks);
      setVideoTracks(p.availableVideoTracks || []);
      setDuration(p.duration || 0);

      if (tracks.length > 0) {
        const hindiTrack = tracks.find(isHindiTrack);
        const target = hindiTrack || tracks[0];
        try {
          player.audioTrack = target;
          setCurrentAudio(target);
        } catch { /* ignore */ }
      }
    });

    const s6 = player.addListener('availableAudioTracksChange', (p) => {
      const tracks = p.availableAudioTracks || [];
      setAudioTracks(tracks);
      if (tracks.length > 0 && !currentAudio) {
        const hindiTrack = tracks.find(isHindiTrack);
        const target = hindiTrack || tracks[0];
        try {
          player.audioTrack = target;
          setCurrentAudio(target);
        } catch { /* ignore */ }
      }
    });

    const s7 = player.addListener('audioTrackChange', (p) => {
      setCurrentAudio(p.audioTrack);
    });

    const s8 = player.addListener('videoTrackChange', (p) => {
      setCurrentVideo(p.videoTrack);
    });

    return () => {
      s1.remove(); s2.remove(); s3.remove(); s4.remove();
      s5.remove(); s6.remove(); s7.remove(); s8.remove();
    };
  }, [player, onError, onTimeUpdate, onEnded, currentAudio, showControls, scheduleHide]);

  // Continuous playback position synchronization while playing
  // NOTE: timeUpdate listener above (every 250ms) handles this — no extra interval needed.
  // Keeping this removed to avoid double renders every 250ms.

  // Show controls on mount
  useEffect(() => {
    showControls();
    return () => {
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
    };
  }, []);

  // Re-schedule hide when menu closes
  useEffect(() => {
    if (activeMenu === 'none' && isPlaying) scheduleHide();
    else if (activeMenu !== 'none') {
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
    }
  }, [activeMenu, isPlaying, scheduleHide]);

  // ── Playback controls ───────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    if (!player) return;
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
    showControls();
    scheduleHide();
  }, [player, showControls, scheduleHide]);

  const seekDelta = useCallback((delta: number) => {
    if (!player) return;
    const dur = player.duration || duration || 0;
    const next = Math.max(0, Math.min(dur, (player.currentTime || currentTime) + delta));
    player.currentTime = next;
    setCurrentTime(next);
    showControls();
    scheduleHide();
  }, [player, duration, currentTime, showControls, scheduleHide]);

  const toggleMute = useCallback(() => {
    if (!player) return;
    const next = !isMuted;
    player.muted = next;
    setIsMuted(next);
    showControls();
    scheduleHide();
  }, [player, isMuted, showControls, scheduleHide]);

  const changeSpeed = useCallback((rate: number) => {
    if (!player) return;
    player.playbackRate = rate;
    setPlaybackRate(rate);
    setActiveMenu('none');
  }, [player]);

  const changeAudio = useCallback((track: AudioTrack) => {
    if (!player) return;
    try {
      player.audioTrack = track;
      setCurrentAudio(track);
    } catch { /* ignore */ }
    setActiveMenu('none');
  }, [player]);

  // Reset orientation, clear pending timers, and restore original device brightness and volume on unmount
  useEffect(() => {
    return () => {
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
      if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
      if (doubleTapTimerRef.current) clearTimeout(doubleTapTimerRef.current);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => null);
      exitImmersiveMode();
      HardwareControl.restoreBrightness(originalBrightnessRef.current);
      if (originalVolumeRef.current !== null) {
        HardwareControl.restoreVolume(originalVolumeRef.current);
      }
    };
  }, []);

  // Synchronize with external isFullscreen prop (e.g. mobile back button from WatchPage)
  useEffect(() => {
    if (propIsFullscreen !== undefined && propIsFullscreen !== isFullscreen) {
      if (propIsFullscreen) {
        setIsFullscreen(true);
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => null);
        enterImmersiveMode();
      } else {
        setIsFullscreen(false);
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => null);
        exitImmersiveMode();
      }
      showControls();
      scheduleHide();
    }
  }, [propIsFullscreen, isFullscreen, showControls, scheduleHide]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (isFullscreen) {
        setIsFullscreen(false);
        onFullscreenChange?.(false);
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => null);
        exitImmersiveMode();
      } else {
        setIsFullscreen(true);
        onFullscreenChange?.(true);
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => null);
        enterImmersiveMode();
      }
    } catch (e) {
      console.warn('[HindiAnimePlayer] Fullscreen toggle error:', e);
    }
    showControls();
    scheduleHide();
  }, [isFullscreen, onFullscreenChange, showControls, scheduleHide]);

  // ── Android Hardware Back Button: exit fullscreen first, then propagate ──
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      toggleFullscreen();
      return true; // consumed — do NOT navigate back to previous screen
    });
    return () => handler.remove();
  }, [isFullscreen, toggleFullscreen]);

  // Listen to device orientation changes
  useEffect(() => {
    const sub = ScreenOrientation.addOrientationChangeListener((evt) => {
      const orientation = evt.orientationInfo.orientation;
      const isLandscapeOrientation =
        orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
        orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
      if (isLandscapeOrientation && !isFullscreen) {
        setIsFullscreen(true);
        onFullscreenChange?.(true);
        enterImmersiveMode();
      } else if (!isLandscapeOrientation && isFullscreen) {
        setIsFullscreen(false);
        onFullscreenChange?.(false);
        exitImmersiveMode();
      }
    });
    return () => {
      ScreenOrientation.removeOrientationChangeListener(sub);
    };
  }, [isFullscreen, onFullscreenChange]);

  // ─── Continuous Gestures via react-native-gesture-handler ──────────────────
  // Left side vertical pan = Brightness
  // Right side vertical pan = Volume
  // Single tap = Toggle player controls
  // Double tap = ±10s seek ripple
  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .runOnJS(true)
      .activeOffsetY([-10, 10]) // Prevents accidental trigger on taps
      .onStart((e) => {
        const curLayout = playerLayoutRef.current;
        const screenWidth = curLayout.width || windowWidth;
        const startX = e.x;
        const isLeft = startX < screenWidth / 2;
        const zone = isLeft ? 'brightness' : 'volume';
        dragZoneRef.current = zone;
        isDraggingRef.current = true;

        // Anchor on touch start directly from live values
        const startVal = zone === 'brightness' ? brightnessRef.current : volumeRef.current;
        startValueRef.current = startVal;
        currentValueRef.current = startVal;

        if (hudTimerRef.current) {
          clearTimeout(hudTimerRef.current);
          hudTimerRef.current = null;
        }
        setFeedbackHud({ type: zone, value: startVal });
      })
      .onUpdate((e) => {
        if (!isDraggingRef.current) return;
        const zone = dragZoneRef.current;
        if (zone === 'none') return;

        const curLayout = playerLayoutRef.current;
        const screenHeight = curLayout.height || windowHeight;
        const dragFactor = screenHeight * 0.6; // screenHeight * 0.6 per instructions

        // newValue = clamp(startValue - (event.translationY / (screenHeight * 0.6)), 0, 1)
        const rawValue = startValueRef.current - (e.translationY / dragFactor);
        const clampedValue = Math.max(0, Math.min(1, rawValue));
        currentValueRef.current = clampedValue;

        if (zone === 'brightness') {
          brightnessRef.current = clampedValue;
          brightnessAnim.setValue(clampedValue); // Smooth 60fps dimming layer
          HardwareControl.setBrightnessThrottled(clampedValue); // Throttled bridge call (~35ms)
        } else {
          volumeRef.current = clampedValue;
          if (playerRef.current) {
            playerRef.current.volume = clampedValue;
            playerRef.current.muted = clampedValue === 0;
          }
          HardwareControl.setVolumeThrottled(clampedValue); // Throttled bridge call (~35ms)
        }

        // Smooth on-screen HUD update — throttled to ~50ms (~20fps) to avoid excessive React renders
        const now = Date.now();
        if (now - lastHudUpdateRef.current >= 50) {
          lastHudUpdateRef.current = now;
          setFeedbackHud({ type: zone, value: clampedValue });
        }
      })
      .onEnd(() => {
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          const zone = dragZoneRef.current;
          dragZoneRef.current = 'none';

          HardwareControl.flushSync();

          if (zone !== 'none') {
            const finalVal = currentValueRef.current;
            setFeedbackHud({ type: zone, value: finalVal });
            if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
            hudTimerRef.current = setTimeout(() => {
              setFeedbackHud(null);
            }, 850);
          }
        }
      })
      .onFinalize(() => {
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          dragZoneRef.current = 'none';
          HardwareControl.flushSync();
          if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
          hudTimerRef.current = setTimeout(() => {
            setFeedbackHud(null);
          }, 850);
        }
      });
  }, [windowWidth, windowHeight, brightnessAnim]);

  const doubleTapGesture = useMemo(() => {
    return Gesture.Tap()
      .runOnJS(true)
      .numberOfTaps(2)
      .maxDuration(280)
      .onEnd((e) => {
        const curLayout = playerLayoutRef.current;
        const boxWidth = curLayout.width || windowWidth;
        const touchX = e.x;

        if (touchX < boxWidth * 0.4) {
          seekDelta(-10);
          setDoubleTapSide('left');
        } else if (touchX > boxWidth * 0.6) {
          seekDelta(10);
          setDoubleTapSide('right');
        } else {
          togglePlay();
        }

        if (doubleTapTimerRef.current) clearTimeout(doubleTapTimerRef.current);
        doubleTapTimerRef.current = setTimeout(() => {
          setDoubleTapSide(null);
        }, 700);
      });
  }, [seekDelta, togglePlay, windowWidth]);

  const singleTapGesture = useMemo(() => {
    return Gesture.Tap()
      .runOnJS(true)
      .numberOfTaps(1)
      .maxDuration(250)
      .onEnd(() => {
        toggleControls();
      });
  }, [toggleControls]);

  const composedGesture = useMemo(() => {
    const taps = Gesture.Exclusive(doubleTapGesture, singleTapGesture);
    return Gesture.Race(panGesture, taps);
  }, [panGesture, doubleTapGesture, singleTapGesture]);

  // ── Dedicated Progress Bar Scrubber ─────────────────────────────────────
  const seekScrubberTo = useCallback((touchLocationX: number, commit = false) => {
    const p = playerRef.current;
    if (!p) return;
    const dur = p.duration || durationRef.current || 0;
    if (dur <= 0) return;
    const w = barWidth.current || 1;
    const fraction = Math.max(0, Math.min(1, touchLocationX / w));
    const target = fraction * dur;

    if (commit) {
      p.currentTime = target;
      setCurrentTime(target);
      currentTimeRef.current = target;
      setScrubbingTime(null);
      showControls();
      scheduleHide();
    } else {
      setScrubbingTime(target);
    }
  }, [showControls, scheduleHide]);

  const barPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      isScrubbingRef.current = true;
      seekScrubberTo(e.nativeEvent.locationX, false);
    },
    onPanResponderMove: (e) => {
      seekScrubberTo(e.nativeEvent.locationX, false);
    },
    onPanResponderRelease: (e) => {
      seekScrubberTo(e.nativeEvent.locationX, true);
      isScrubbingRef.current = false;
    },
    onPanResponderTerminate: (e) => {
      seekScrubberTo(e.nativeEvent.locationX, true);
      isScrubbingRef.current = false;
    },
  }), [seekScrubberTo]);

  // ── Derived values ──────────────────────────────────────────────────────
  const activeTime = scrubbingTime !== null ? scrubbingTime : currentTime;
  const played = duration > 0 ? Math.min(1, activeTime / duration) : 0;
  const bufferedPct = duration > 0 ? Math.min(100, (buffered / duration) * 100) : 0;

  const badge = isMovie
    ? 'Movie'
    : `S${String(season ?? 1).padStart(2, '0')} E${String(episode ?? 1).padStart(2, '0')}`;

  const audioLabel = currentAudio
    ? (currentAudio.label || currentAudio.language || 'Default')
    : 'Audio';

  const changeQuality = useCallback((trackId: string, track: VideoTrack | null) => {
    if (!player) return;
    try {
      if (trackId === 'auto' || !track || !track.size || (track.size.height ?? 0) <= 0) {
        player.maxResolution = null;
        setSelectedQualityId('auto');
      } else {
        player.maxResolution = {
          width: track.size.width || Math.round(((track.size.height ?? 720) * 16) / 9),
          height: track.size.height,
        };
        setSelectedQualityId(trackId);
      }
    } catch { /* ignore */ }
    setActiveMenu('none');
    showControls();
    scheduleHide();
  }, [player, showControls, scheduleHide]);

  const qualityLabel = selectedQualityId === 'auto'
    ? 'Auto'
    : currentVideo && (currentVideo.size?.height ?? 0) > 0
    ? `${currentVideo.size?.height}p`
    : 'Quality';

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, isFullscreen && styles.rootFullscreen]}>
      {/* ── Video + controls ────────────────────────────────────────────── */}
      <View
        style={[styles.videoBox, isFullscreen ? styles.videoBoxFullscreen : { height: windowWidth * (9 / 16) }]}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width > 0 && height > 0) {
            playerLayoutRef.current = { width, height };
          }
        }}
      >
        {/* Video view */}
        <VideoView
          ref={videoViewRef}
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit={contentFitValue}
          nativeControls={false}
        />

        {/* Software Brightness Dimming Layer (Animated for 60fps responsive gestures without re-renders) */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: '#000000',
              opacity: brightnessAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.92, 0],
                extrapolate: 'clamp',
              }),
            },
          ]}
          pointerEvents="none"
        />

        {/* Full surface continuous gesture detector for volume, brightness, and taps */}
        <GestureDetector gesture={composedGesture}>
          <View style={StyleSheet.absoluteFill} collapsable={false} />
        </GestureDetector>

        {/* Volume & Brightness Gesture HUD Indicator */}
        {feedbackHud && (
          <View
            style={[
              styles.feedbackHudContainer,
              feedbackHud.type === 'brightness' ? styles.feedbackHudLeft : styles.feedbackHudRight,
            ]}
            pointerEvents="none"
          >
            <View style={styles.feedbackHudCard}>
              <View style={styles.feedbackHudIconBox}>
                {feedbackHud.type === 'volume' ? (
                  feedbackHud.value === 0 ? (
                    <VolumeX size={20} color="#ffffff" />
                  ) : feedbackHud.value < 0.5 ? (
                    <Volume1 size={20} color="#ffffff" />
                  ) : (
                    <Volume2 size={20} color="#ffffff" />
                  )
                ) : (
                  <Sun size={20} color="#facc15" />
                )}
              </View>

              <View style={styles.feedbackHudBarTrack}>
                <View
                  style={[
                    styles.feedbackHudBarFill,
                    {
                      height: `${Math.round(feedbackHud.value * 100)}%`,
                      backgroundColor: feedbackHud.type === 'volume' ? '#22c55e' : '#facc15',
                    },
                  ]}
                />
              </View>

              <Text style={styles.feedbackHudText}>
                {Math.round(feedbackHud.value * 100)}%
              </Text>
            </View>
          </View>
        )}

        {/* Buffering Indicator */}
        {isBuffering && !playerError && (
          <View style={styles.overlay} pointerEvents="none">
            <ActivityIndicator size={44} color={GREEN} />
            <Text style={styles.bufText}>Buffering…</Text>
          </View>
        )}

        {/* Double-Tap Rewind/Forward Visual Ripple Indicator */}
        {doubleTapSide && (
          <View
            style={[
              styles.doubleTapOverlay,
              doubleTapSide === 'left' ? styles.doubleTapLeft : styles.doubleTapRight,
            ]}
            pointerEvents="none"
          >
            <View style={styles.doubleTapPill}>
              {doubleTapSide === 'left' ? (
                <>
                  <RotateCcw size={22} color="#ffffff" />
                  <Text style={styles.doubleTapText}>-10s</Text>
                </>
              ) : (
                <>
                  <RotateCw size={22} color="#ffffff" />
                  <Text style={styles.doubleTapText}>+10s</Text>
                </>
              )}
            </View>
          </View>
        )}

        {/* Horizontal Slide to Seek HUD Overlay */}
        {slideSeek && (
          <View style={styles.slideHudOverlay} pointerEvents="none">
            <View style={styles.slideHudBox}>
              {slideSeek.deltaSec >= 0 ? (
                <RotateCw size={26} color={GREEN} />
              ) : (
                <RotateCcw size={26} color="#fbbf24" />
              )}
              <Text style={[styles.slideHudDelta, slideSeek.deltaSec >= 0 ? styles.greenText : styles.amberText]}>
                {slideSeek.deltaSec >= 0 ? `+${slideSeek.deltaSec}s` : `${slideSeek.deltaSec}s`}
              </Text>
              <Text style={styles.slideHudTime}>
                {fmt(slideSeek.targetTime)} / {fmt(duration)}
              </Text>
            </View>
          </View>
        )}

        {/* Playback Error Overlay */}
        {playerError && (
          <View style={styles.overlay}>
            <View style={styles.errBox}>
              <Text style={styles.errTitle}>Check your internet connection</Text>
              <Text style={styles.errMsg} numberOfLines={3}>
                {playerError.includes('520') || playerError.includes('502') || playerError.includes('Source error') || playerError.includes('network') || playerError.includes('connection') || playerError.includes('offline')
                  ? 'Please check your internet connection and tap Retry.'
                  : 'Check your internet connection and tap Retry to reconnect.'}
              </Text>
              <View style={styles.errBtnRow}>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => {
                    setPlayerError(null);
                    setIsBuffering(true);
                    player?.replay();
                    player?.play();
                  }}
                >
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ── Controls Overlay ─────────────────────────────────────────── */}
        <Animated.View
          style={[styles.controls, { opacity: controlsOpacity }]}
          pointerEvents={isControlsVisible ? 'box-none' : 'none'}
        >

          {/* TOP BAR */}
          <View style={[styles.topBar, isFullscreen && { paddingTop: Math.max(8, insets.top) }]}>
            <View style={styles.topLeft}>
              {/* Back Button: Exits fullscreen if in fullscreen, or triggers onBack in portrait */}
              {(isFullscreen || onBack) && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    if (isFullscreen) {
                      toggleFullscreen();
                    } else if (onBack) {
                      onBack();
                    }
                  }}
                  style={styles.backBtn}
                >
                  <ChevronLeft size={24} color="#ffffff" />
                </TouchableOpacity>
              )}

              {(season !== undefined || episode !== undefined || isMovie) && (
                <View style={styles.pill}>
                  <View style={styles.greenDot} />
                  <Text style={styles.pillText}>{badge}</Text>
                </View>
              )}
            </View>
            <Text style={styles.topTitle} numberOfLines={1}>{title}</Text>
          </View>

          {/* CENTER CONTROLS: -10s Rewind, Big Play/Pause, +10s Forward */}
          <View style={styles.centerControlsRow} pointerEvents="box-none">
            {/* Rewind 10s */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
                seekDelta(-10);
                scheduleHide();
              }}
              style={styles.centerSkipBtn}
            >
              <View style={styles.centerSkipInner}>
                <RotateCcw size={32} color="#ffffff" />
                <View style={styles.centerSkipTextWrapper} pointerEvents="none">
                  <Text style={styles.centerSkipText}>10</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Big Play / Pause */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
                togglePlay();
                scheduleHide();
              }}
              style={styles.centerPlayBtn}
            >
              {isPlaying ? (
                <Pause size={36} color="#ffffff" fill="#ffffff" />
              ) : (
                <Play size={36} color="#ffffff" fill="#ffffff" style={{ marginLeft: 3 }} />
              )}
            </TouchableOpacity>

            {/* Forward 10s */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
                seekDelta(10);
                scheduleHide();
              }}
              style={styles.centerSkipBtn}
            >
              <View style={styles.centerSkipInner}>
                <RotateCw size={32} color="#ffffff" />
                <View style={styles.centerSkipTextWrapper} pointerEvents="none">
                  <Text style={styles.centerSkipText}>10</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* POP-UP MENUS */}
          {activeMenu === 'audio' && audioTracks.length > 0 && (
            <View style={styles.popup}>
              <Text style={styles.popupTitle}>Audio Language</Text>
              <ScrollView style={styles.popupScroll} nestedScrollEnabled={true}>
                {audioTracks.map((t, i) => {
                  const active = currentAudio?.language === t.language && currentAudio?.label === t.label;
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => changeAudio(t)}
                      style={[styles.popupItem, active && styles.popupItemActive]}
                    >
                      <Text style={[styles.popupItemText, active && styles.popupItemTextActive]} numberOfLines={1}>
                        {t.label || t.language || `Track ${i + 1}`}
                      </Text>
                      {active && <Check size={14} color={GREEN} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {activeMenu === 'quality' && (
            <View style={styles.popup}>
              <Text style={styles.popupTitle}>Quality</Text>
              <ScrollView style={styles.popupScroll} nestedScrollEnabled={true}>
                {/* Auto (Adaptive based on internet connection) */}
                <TouchableOpacity
                  onPress={() => changeQuality('auto', null)}
                  style={[styles.popupItem, selectedQualityId === 'auto' && styles.popupItemActive]}
                >
                  <Text style={[styles.popupItemText, selectedQualityId === 'auto' && styles.popupItemTextActive]}>
                    Auto (Adaptive)
                  </Text>
                  {selectedQualityId === 'auto' && <Check size={14} color={GREEN} />}
                </TouchableOpacity>

                {/* Available resolution tracks */}
                {videoTracks
                  .filter((t) => (t.size?.height ?? 0) > 0)
                  .sort((a, b) => (b.size?.height || 0) - (a.size?.height || 0))
                  .map((t) => {
                    const active = selectedQualityId === t.id;
                    const label = `${t.size?.height}p`;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        onPress={() => changeQuality(t.id, t)}
                        style={[styles.popupItem, active && styles.popupItemActive]}
                      >
                        <Text style={[styles.popupItemText, active && styles.popupItemTextActive]}>{label}</Text>
                        {active && <Check size={14} color={GREEN} />}
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
            </View>
          )}

          {activeMenu === 'speed' && (
            <View style={styles.popup}>
              <Text style={styles.popupTitle}>Speed</Text>
              <ScrollView style={styles.popupScroll} nestedScrollEnabled={true}>
                {SPEED_OPTIONS.map((rate) => (
                  <TouchableOpacity
                    key={rate}
                    onPress={() => changeSpeed(rate)}
                    style={[styles.popupItem, playbackRate === rate && styles.popupItemActive]}
                  >
                    <Text style={[styles.popupItemText, playbackRate === rate && styles.popupItemTextActive]}>
                      {rate === 1 ? '1× (Normal)' : `${rate}×`}
                    </Text>
                    {playbackRate === rate && <Check size={14} color={GREEN} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* SCREEN SIZE POPUP */}
          {activeMenu === 'screensize' && (
            <View style={styles.popup}>
              <Text style={styles.popupTitle}>Screen Size</Text>
              <ScrollView style={styles.popupScroll} nestedScrollEnabled={true}>
                {[
                  { mode: 'fit' as const, label: 'Fit (Complete video)' },
                  { mode: 'fill' as const, label: 'Fill (Crop to screen)' },
                  { mode: 'stretch' as const, label: 'Stretch (Fill screen)' },
                ].map(({ mode, label }) => {
                  const active = screenSizeMode === mode;
                  return (
                    <TouchableOpacity
                      key={mode}
                      onPress={() => {
                        setScreenSizeMode(mode);
                        setActiveMenu('none');
                        scheduleHide();
                      }}
                      style={[styles.popupItem, active && styles.popupItemActive]}
                    >
                      <Text
                        style={[
                          styles.popupItemText,
                          active && styles.popupItemTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                      {active && <Check size={14} color={GREEN} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* BOTTOM CONTROLS & SCRUBBER */}
          <View style={[styles.bottom, {
            paddingBottom: isFullscreen
              ? Math.max(8, insets.bottom)
              : 4,
          }]}>
            {/* Rock-solid progress bar hit box (child elements have pointerEvents="none") */}
            <View
              style={styles.barHit}
              onLayout={(e) => {
                barWidth.current = e.nativeEvent.layout.width;
              }}
              {...barPanResponder.panHandlers}
            >
              <View style={styles.barTrack} pointerEvents="none">
                <View style={[styles.barBuf, { width: `${bufferedPct}%` }]} pointerEvents="none" />
                <View style={[styles.barPlayed, { width: `${played * 100}%` }]} pointerEvents="none" />
              </View>
              <View
                style={[
                  styles.thumb,
                  { left: `${played * 100}%` as any },
                  isScrubbingRef.current && styles.thumbActive,
                ]}
                pointerEvents="none"
              />
            </View>

            {/* Bottom Row Controls */}
            <View style={styles.row}>
              {/* Left group */}
              <View style={styles.rowLeft}>
                <TouchableOpacity onPress={togglePlay} style={styles.ctrlBtn}>
                  {isPlaying ? (
                    <Pause size={17} color="#fff" fill="#fff" />
                  ) : (
                    <Play size={17} color="#fff" fill="#fff" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={toggleMute} style={styles.ctrlBtn}>
                  {isMuted ? (
                    <VolumeX size={16} color="#f87171" />
                  ) : (
                    <Volume2 size={16} color="rgba(255,255,255,0.85)" />
                  )}
                </TouchableOpacity>

                <Text style={styles.timeText}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{fmt(activeTime)}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)' }}> / {fmt(duration)}</Text>
                  {duration > 0 && (
                    <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>
                      {' '}(-{fmt(Math.max(0, duration - activeTime))})
                    </Text>
                  )}
                </Text>
              </View>

              {/* Right group: In portrait/short player, show ONLY Fullscreen button. In fullscreen, show all features + Screen-size selector */}
              <View style={styles.rowRight}>
                {isFullscreen && audioTracks.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setActiveMenu((m) => (m === 'audio' ? 'none' : 'audio'));
                      scheduleHide();
                    }}
                    style={[styles.menuBtn, activeMenu === 'audio' && styles.menuBtnActive]}
                  >
                    <Languages size={12} color={activeMenu === 'audio' ? DARK_BG : '#e2e8f0'} />
                    <Text
                      style={[styles.menuBtnText, activeMenu === 'audio' && styles.menuBtnTextActive]}
                      numberOfLines={1}
                    >
                      {audioLabel.length > 7 ? audioLabel.slice(0, 7) + '…' : audioLabel}
                    </Text>
                  </TouchableOpacity>
                )}

                {isFullscreen && videoTracks.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setActiveMenu((m) => (m === 'quality' ? 'none' : 'quality'));
                      scheduleHide();
                    }}
                    style={[styles.menuBtn, activeMenu === 'quality' && styles.menuBtnActive]}
                  >
                    <Sliders size={12} color={activeMenu === 'quality' ? DARK_BG : '#e2e8f0'} />
                    <Text style={[styles.menuBtnText, activeMenu === 'quality' && styles.menuBtnTextActive]}>
                      {qualityLabel}
                    </Text>
                  </TouchableOpacity>
                )}

                {isFullscreen && (
                  <TouchableOpacity
                    onPress={() => {
                      setActiveMenu((m) => (m === 'speed' ? 'none' : 'speed'));
                      scheduleHide();
                    }}
                    style={[styles.menuBtn, activeMenu === 'speed' && styles.menuBtnActive]}
                  >
                    <Text style={[styles.menuBtnText, activeMenu === 'speed' && styles.menuBtnTextActive]}>
                      {playbackRate}×
                    </Text>
                  </TouchableOpacity>
                )}

                {isFullscreen && (
                  <TouchableOpacity
                    onPress={() => {
                      setActiveMenu((m) => (m === 'screensize' ? 'none' : 'screensize'));
                      scheduleHide();
                    }}
                    style={[styles.menuBtn, activeMenu === 'screensize' && styles.menuBtnActive]}
                  >
                    <Scan size={12} color={activeMenu === 'screensize' ? DARK_BG : '#e2e8f0'} />
                    <Text style={[styles.menuBtnText, activeMenu === 'screensize' && styles.menuBtnTextActive]}>
                      {screenSizeMode === 'fit' ? 'Fit' : screenSizeMode === 'fill' ? 'Fill' : 'Stretch'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity onPress={toggleFullscreen} style={styles.ctrlBtn}>
                  {isFullscreen ? (
                    <Minimize size={16} color="#ffffff" />
                  ) : (
                    <Maximize size={16} color="#ffffff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

export default NativeAnimePlayer;

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#000',
    width: '100%',
  },
  rootFullscreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 999999,
    // elevation needed on Android to draw over other views including nav bar region
    elevation: 999999,
  },
  videoBox: {
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  videoBoxFullscreen: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },

  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    gap: 10,
  },
  bufText: {
    color: '#d1d5db',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Double tap ripple overlay
  doubleTapOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '40%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  doubleTapLeft: { left: 0 },
  doubleTapRight: { right: 0 },
  doubleTapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.4)',
  },
  doubleTapText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Slide to seek HUD
  slideHudOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  slideHudBox: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(8, 14, 10, 0.88)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#1d3025',
    paddingHorizontal: 22,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 20,
  },
  slideHudDelta: {
    fontSize: 18,
    fontWeight: '800',
  },
  slideHudTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d1d5db',
  },
  greenText: { color: '#22c55e' },
  amberText: { color: '#fbbf24' },

  errBox: {
    maxWidth: 300,
    backgroundColor: 'rgba(20, 10, 10, 0.92)',
    borderColor: '#7f1d1d',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  errTitle: { color: '#fca5a5', fontWeight: '700', fontSize: 14 },
  errMsg: { color: '#e2e8f0', fontSize: 12, textAlign: 'center' },
  errBtnRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  retryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: '#22c55e',
  },
  fallbackBtn: {
    backgroundColor: '#2563eb',
  },
  retryText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },

  controls: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  backBtn: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  pillText: {
    color: '#fff',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  topTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    maxWidth: 180,
    flexShrink: 1,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Volume & Brightness Gesture HUD
  feedbackHudContainer: {
    position: 'absolute',
    top: '30%',
    zIndex: 90,
  },
  feedbackHudLeft: {
    left: 20,
  },
  feedbackHudRight: {
    right: 20,
  },
  feedbackHudCard: {
    backgroundColor: 'rgba(5, 10, 7, 0.88)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 10,
  },
  feedbackHudIconBox: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackHudBarTrack: {
    width: 6,
    height: 70,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  feedbackHudBarFill: {
    width: '100%',
    borderRadius: 3,
  },
  feedbackHudText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    minWidth: 28,
    textAlign: 'center',
  },

  // Center Controls
  centerControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  centerSkipBtn: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  centerSkipInner: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSkipTextWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSkipText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 12,
    marginTop: 0.5,
  },
  centerPlayBtn: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },

  // Bottom section & Scrubber
  bottom: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  barHit: {
    width: '100%',
    height: 32,
    justifyContent: 'center',
  },
  barTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    position: 'relative',
  },
  barBuf: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 2,
  },
  barPlayed: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#22c55e',
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    top: '50%',
    marginTop: -8,
    marginLeft: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 5,
  },
  thumbActive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginTop: -10,
    marginLeft: -10,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  ctrlBtn: {
    padding: 6,
    borderRadius: 7,
  },
  timeText: {
    color: 'rgba(200,210,200,0.9)',
    fontSize: 10.5,
    marginLeft: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  menuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  menuBtnActive: { backgroundColor: '#22c55e' },
  menuBtnText: { color: '#e2e8f0', fontSize: 10, fontWeight: '600' },
  menuBtnTextActive: { color: '#000', fontWeight: '700' },

  // Pop-up menus
  popup: {
    position: 'absolute',
    bottom: 60,
    right: 12,
    backgroundColor: 'rgba(8, 14, 10, 0.96)',
    borderWidth: 1.5,
    borderColor: '#1d3025',
    borderRadius: 12,
    minWidth: 150,
    maxWidth: 210,
    maxHeight: 140,
    paddingVertical: 5,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 25,
    zIndex: 999,
  },
  popupTitle: {
    color: 'rgba(150,160,150,0.85)',
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1d3025',
    marginBottom: 2,
  },
  popupScroll: {
    maxHeight: 100,
  },
  popupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 7,
    marginVertical: 1,
  },
  popupItemActive: { backgroundColor: 'rgba(34,197,94,0.18)' },
  popupItemText: { color: '#94a3b8', fontSize: 11, fontWeight: '500' },
  popupItemTextActive: { color: '#22c55e', fontWeight: '700' },
});
