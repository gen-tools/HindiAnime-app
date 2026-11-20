import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Linking,
  Switch,
  StyleSheet,
  BackHandler,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import {
  User,
  ShieldCheck,
  History,
  Heart,
  Bookmark,
  Settings,
  ChevronRight,
  X,
  ArrowLeft,
  Instagram,
  Twitter,
  Facebook,
  Download,
  Edit3,
  Check,
  Save,
  Zap,
  Wifi,
  Database,
  Play,
  Volume2,
  Star,
  Mail,
} from 'lucide-react-native';
import { Anime } from '../types/anime';
import { HindiAnimeLogo } from './HindiAnimeLogo';
import { AnimeCard } from './AnimeCard';
import { PlayCircleButton } from './PlayCircleButton';
import { getImageSource } from '../utils/imageHelper';
import { LocalStorageService, WatchHistoryItem, UserProfile } from '../services/storage';
import { useAppDispatch, useAppSelector } from '../store';
import { removeWatchHistory, clearWatchHistory } from '../store/animeSlice';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtSecs(secs: number): string {
  if (!secs || isNaN(secs) || secs < 0) return '00:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function timeAgo(timestamp: number): string {
  if (!timestamp) return 'Recently';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

const AVATAR_EMOJIS = ['🎌', '🐉', '⚔️', '🌸', '🌊', '🔥', '⚡', '🎭', '🦊', '🌙', '🎋', '🏯'];

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProfileViewProps {
  animeList: Anime[];
  onSelectAnime: (anime: Anime) => void;
  savedAnimeIds: string[];
  onToggleSave: (animeId: string) => void;
  favoriteAnimeIds: string[];
  onToggleFavorite: (animeId: string) => void;
}

type SubViewType = 'mylist' | 'favorites' | 'settings' | 'downloads' | null;

// ─── Edit Profile Modal ───────────────────────────────────────────────────────

interface EditProfileModalProps {
  visible: boolean;
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onClose: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ visible, profile, onSave, onClose }) => {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [handle, setHandle] = useState(profile.handle);
  const [bio, setBio] = useState(profile.bio);
  const [avatarEmoji, setAvatarEmoji] = useState(profile.avatarEmoji);

  // Sync when modal opens
  useEffect(() => {
    if (visible) {
      setDisplayName(profile.displayName);
      setHandle(profile.handle);
      setBio(profile.bio);
      setAvatarEmoji(profile.avatarEmoji);
    }
  }, [visible, profile]);

  const handleSave = () => {
    const trimmedName = displayName.trim();
    const trimmedHandle = handle.trim().replace(/[^a-zA-Z0-9_]/g, '');
    if (!trimmedName) return;
    onSave({
      displayName: trimmedName,
      handle: trimmedHandle || 'hindianime_user',
      bio: bio.trim(),
      avatarEmoji,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalSheet}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <X size={18} color="#7e8b83" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            {/* Avatar Emoji Picker */}
            <Text style={styles.modalLabel}>Avatar</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiScroll}>
              {AVATAR_EMOJIS.map((e) => (
                <TouchableOpacity
                  key={e}
                  onPress={() => setAvatarEmoji(e)}
                  style={[styles.emojiOption, avatarEmoji === e && styles.emojiOptionActive]}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                  {avatarEmoji === e && (
                    <View style={styles.emojiCheckDot}>
                      <Check size={9} color="#000" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Display Name */}
            <Text style={styles.modalLabel}>Display Name</Text>
            <TextInput
              style={styles.modalInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor="#4b5563"
              maxLength={30}
              selectionColor="#22c55e"
            />
            <Text style={styles.modalInputHint}>{displayName.length}/30 characters</Text>

            {/* Handle */}
            <Text style={styles.modalLabel}>Username</Text>
            <View style={styles.modalInputRow}>
              <Text style={styles.modalInputPrefix}>@</Text>
              <TextInput
                style={[styles.modalInput, styles.modalInputFlex]}
                value={handle}
                onChangeText={(t) => setHandle(t.replace(/[^a-zA-Z0-9_]/g, ''))}
                placeholder="your_handle"
                placeholderTextColor="#4b5563"
                maxLength={20}
                autoCapitalize="none"
                selectionColor="#22c55e"
              />
            </View>
            <Text style={styles.modalInputHint}>Letters, numbers and underscores only</Text>

            {/* Bio */}
            <Text style={styles.modalLabel}>Bio</Text>
            <TextInput
              style={[styles.modalInput, styles.modalInputMultiline]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself…"
              placeholderTextColor="#4b5563"
              maxLength={80}
              multiline
              numberOfLines={3}
              selectionColor="#22c55e"
            />
            <Text style={styles.modalInputHint}>{bio.length}/80 characters</Text>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveBtn, !displayName.trim() && styles.saveBtnDisabled]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={!displayName.trim()}
            >
              <Save size={16} color={displayName.trim() ? '#000' : '#4b5563'} />
              <Text style={[styles.saveBtnText, !displayName.trim() && styles.saveBtnTextDisabled]}>
                Save Changes
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const ProfileView_: React.FC<ProfileViewProps> = ({
  animeList,
  onSelectAnime,
  savedAnimeIds,
  onToggleSave,
  favoriteAnimeIds,
  onToggleFavorite,
}) => {
  const [activeSubView, setActiveSubView] = useState<SubViewType>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Profile
  const [profile, setProfile] = useState<UserProfile>(() => LocalStorageService.getProfile());

  // Settings states (all persisted)
  const [autoSkipIntro, setAutoSkipIntro] = useState(true);
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [downloadWifiOnly, setDownloadWifiOnly] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);
  const [defaultQuality, setDefaultQuality] = useState<'auto' | '1080p' | '720p' | '480p' | '360p'>('auto');
  const [defaultAudio, setDefaultAudio] = useState<'Hindi' | 'Japanese' | 'English'>('Hindi');

  const dispatch = useAppDispatch();
  const reduxWatchHistory = useAppSelector((state) => state.anime.watchHistory);
  const watchHistory = reduxWatchHistory;

  // Load everything from storage on mount
  useEffect(() => {
    const prefs = LocalStorageService.getPreferences();
    setAutoSkipIntro(prefs.skipIntroEnabled);
    setAutoPlayNext(prefs.autoPlayNext);
    setDownloadWifiOnly(prefs.downloadWifiOnly ?? true);
    setDataSaver(prefs.dataSaver ?? false);
    setDefaultQuality((prefs.defaultQuality as any) ?? 'auto');
    setDefaultAudio((prefs.defaultAudio as any) ?? 'Hindi');
    setProfile(LocalStorageService.getProfile());
  }, []);

  // Android back handler for subviews
  useEffect(() => {
    if (!activeSubView && !showEditModal) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showEditModal) { setShowEditModal(false); return true; }
      setActiveSubView(null);
      return true;
    });
    return () => sub.remove();
  }, [activeSubView, showEditModal]);

  // Persisted preference toggles
  const handleToggleAutoSkipIntro = (val: boolean) => {
    setAutoSkipIntro(val);
    LocalStorageService.setPreferences({ skipIntroEnabled: val });
  };
  const handleToggleAutoPlayNext = (val: boolean) => {
    setAutoPlayNext(val);
    LocalStorageService.setPreferences({ autoPlayNext: val });
  };
  const handleToggleDownloadWifiOnly = (val: boolean) => {
    setDownloadWifiOnly(val);
    LocalStorageService.setPreferences({ downloadWifiOnly: val });
  };
  const handleToggleDataSaver = (val: boolean) => {
    setDataSaver(val);
    LocalStorageService.setPreferences({ dataSaver: val });
  };
  const handleQualityChange = (q: 'auto' | '1080p' | '720p' | '480p' | '360p') => {
    setDefaultQuality(q);
    LocalStorageService.setPreferences({ defaultQuality: q });
  };
  const handleAudioChange = (a: 'Hindi' | 'Japanese' | 'English') => {
    setDefaultAudio(a);
    LocalStorageService.setPreferences({ defaultAudio: a });
  };

  const handleSaveProfile = useCallback((updated: UserProfile) => {
    const saved = LocalStorageService.setProfile(updated);
    setProfile(saved);
    setShowEditModal(false);
  }, []);

  const handleRemoveHistoryItem = (animeId: string) => {
    LocalStorageService.removeWatchHistoryItem(animeId);
    dispatch(removeWatchHistory(animeId));
  };
  const handleClearAllHistory = () => {
    LocalStorageService.clearWatchHistory();
    dispatch(clearWatchHistory());
  };
  const handleWatchHistoryClick = (animeId: string) => {
    const target = animeList.find((a) => a.id === animeId);
    if (target) { onSelectAnime(target); return; }
    const fallback = animeList.find((a) => a.id.includes(animeId) || animeId.includes(a.id)) || animeList[0];
    if (fallback) onSelectAnime(fallback);
  };

  const savedAnime = useMemo(
    () => animeList.filter((a) => savedAnimeIds.includes(a.id)),
    [animeList, savedAnimeIds]
  );
  const favoriteAnime = useMemo(
    () => animeList.filter((a) => favoriteAnimeIds.includes(a.id)),
    [animeList, favoriteAnimeIds]
  );

  // ── SUB-VIEWS ──────────────────────────────────────────────────────────────

  if (activeSubView === 'mylist') {
    return (
      <View style={styles.container}>
        <View style={styles.subviewHeader}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => setActiveSubView(null)} style={styles.subviewBackButton}>
            <ArrowLeft size={18} color="#ffffff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.subviewTitle}>My List</Text>
            <Text style={styles.subviewSubtitle}>{savedAnime.length} Titles saved</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.subviewScroll}>
          {savedAnime.length > 0 ? (
            <View style={styles.subviewGrid}>
              {savedAnime.map((anime) => (
                <View key={anime.id} style={styles.subviewCardCol}>
                  <AnimeCard anime={anime} onSelect={onSelectAnime} size="fill" />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyStateBox}>
              <Bookmark size={36} color="#1d3025" />
              <Text style={styles.emptyStateTitle}>No saved anime yet</Text>
              <Text style={styles.emptyStateDesc}>Tap the bookmark icon on any anime to save it here.</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  if (activeSubView === 'favorites') {
    return (
      <View style={styles.container}>
        <View style={styles.subviewHeader}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => setActiveSubView(null)} style={styles.subviewBackButton}>
            <ArrowLeft size={18} color="#ffffff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.subviewTitle}>Favorites</Text>
            <Text style={styles.subviewSubtitle}>{favoriteAnime.length} Titles favorited</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.subviewScroll}>
          {favoriteAnime.length > 0 ? (
            <View style={styles.subviewGrid}>
              {favoriteAnime.map((anime) => (
                <View key={anime.id} style={styles.subviewCardCol}>
                  <AnimeCard anime={anime} onSelect={onSelectAnime} size="fill" />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyStateBox}>
              <Heart size={36} color="#2a1216" />
              <Text style={styles.emptyStateTitle}>No favorites yet</Text>
              <Text style={styles.emptyStateDesc}>Tap the heart icon on any anime to add it here.</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  if (activeSubView === 'downloads') {
    return (
      <View style={styles.container}>
        <View style={styles.subviewHeader}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => setActiveSubView(null)} style={styles.subviewBackButton}>
            <ArrowLeft size={18} color="#ffffff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.subviewTitle}>Downloads</Text>
            <Text style={styles.subviewSubtitle}>Offline episodes</Text>
          </View>
        </View>
        {/* Coming Soon Page */}
        <View style={styles.comingSoonContainer}>
          <View style={styles.comingSoonIconRing}>
            <Download size={40} color="#22c55e" />
          </View>
          <Text style={styles.comingSoonBadge}>COMING SOON</Text>
          <Text style={styles.comingSoonTitle}>Offline Downloads</Text>
          <Text style={styles.comingSoonDesc}>
            Download your favourite Hindi-dubbed episodes and watch them anytime — even without internet.
          </Text>
          <View style={styles.comingSoonFeatureList}>
            {[
              { icon: '📥', text: 'Download up to 1080p quality' },
              { icon: '📱', text: 'Store on device or SD card' },
              { icon: '📡', text: 'Wi-Fi only download option' },
              { icon: '🔒', text: 'DRM-protected offline playback' },
            ].map((f) => (
              <View key={f.text} style={styles.comingSoonFeatureRow}>
                <Text style={styles.comingSoonFeatureEmoji}>{f.icon}</Text>
                <Text style={styles.comingSoonFeatureText}>{f.text}</Text>
              </View>
            ))}
          </View>
          <View style={styles.comingSoonPill}>
            <Zap size={12} color="#fbbf24" />
            <Text style={styles.comingSoonPillText}>Feature in development — stay tuned!</Text>
          </View>
        </View>
      </View>
    );
  }

  if (activeSubView === 'settings') {
    const qualityOptions: Array<'auto' | '1080p' | '720p' | '480p' | '360p'> = ['auto', '1080p', '720p', '480p', '360p'];
    const audioOptions: Array<'Hindi' | 'Japanese' | 'English'> = ['Hindi', 'Japanese', 'English'];

    return (
      <View style={styles.container}>
        <View style={styles.subviewHeader}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => setActiveSubView(null)} style={styles.subviewBackButton}>
            <ArrowLeft size={18} color="#ffffff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.subviewTitle}>Settings & Preferences</Text>
            <Text style={styles.subviewSubtitle}>Player, audio & data options</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.subviewScroll}>

          {/* ── Playback Section ── */}
          <View style={styles.settingsSection}>
            <View style={styles.settingsSectionHeader}>
              <Play size={13} color="#22c55e" />
              <Text style={styles.settingsSectionHeading}>Playback</Text>
            </View>

            <View style={styles.settingCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingLabelGroup}>
                  <Text style={styles.settingLabel}>Auto-Skip Intro (+85s)</Text>
                  <Text style={styles.settingHint}>Automatically skip opening songs</Text>
                </View>
                <Switch
                  value={autoSkipIntro}
                  onValueChange={handleToggleAutoSkipIntro}
                  trackColor={{ false: '#1d3025', true: '#22c55e' }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={[styles.settingRow, styles.settingRowLast]}>
                <View style={styles.settingLabelGroup}>
                  <Text style={styles.settingLabel}>Auto-Play Next Episode</Text>
                  <Text style={styles.settingHint}>Start next episode continuously</Text>
                </View>
                <Switch
                  value={autoPlayNext}
                  onValueChange={handleToggleAutoPlayNext}
                  trackColor={{ false: '#1d3025', true: '#22c55e' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
          </View>

          {/* ── Default Audio Section ── */}
          <View style={styles.settingsSection}>
            <View style={styles.settingsSectionHeader}>
              <Volume2 size={13} color="#22c55e" />
              <Text style={styles.settingsSectionHeading}>Default Audio Track</Text>
            </View>
            <View style={styles.chipRow}>
              {audioOptions.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, defaultAudio === opt && styles.chipActive]}
                  onPress={() => handleAudioChange(opt)}
                >
                  <Text style={[styles.chipText, defaultAudio === opt && styles.chipTextActive]}>{opt}</Text>
                  {defaultAudio === opt && <Check size={11} color="#000" />}
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.settingHintLoose}>
              Auto-selects this audio track when available on new episodes.
            </Text>
          </View>

          {/* ── Video Quality Section ── */}
          <View style={styles.settingsSection}>
            <View style={styles.settingsSectionHeader}>
              <Star size={13} color="#22c55e" />
              <Text style={styles.settingsSectionHeading}>Default Video Quality</Text>
            </View>
            <View style={styles.chipRow}>
              {qualityOptions.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, defaultQuality === opt && styles.chipActive]}
                  onPress={() => handleQualityChange(opt)}
                >
                  <Text style={[styles.chipText, defaultQuality === opt && styles.chipTextActive]}>
                    {opt === 'auto' ? 'Auto' : opt}
                  </Text>
                  {defaultQuality === opt && <Check size={11} color="#000" />}
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.settingHintLoose}>
              HLS streams auto-adapt — this sets the initial preferred quality.
            </Text>
          </View>

          {/* ── Data & Downloads Section ── */}
          <View style={styles.settingsSection}>
            <View style={styles.settingsSectionHeader}>
              <Wifi size={13} color="#22c55e" />
              <Text style={styles.settingsSectionHeading}>Data & Downloads</Text>
            </View>

            <View style={styles.settingCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingLabelGroup}>
                  <Text style={styles.settingLabel}>Download Over Wi-Fi Only</Text>
                  <Text style={styles.settingHint}>Protect mobile data usage</Text>
                </View>
                <Switch
                  value={downloadWifiOnly}
                  onValueChange={handleToggleDownloadWifiOnly}
                  trackColor={{ false: '#1d3025', true: '#22c55e' }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={[styles.settingRow, styles.settingRowLast]}>
                <View style={styles.settingLabelGroup}>
                  <Text style={styles.settingLabel}>Data Saver Mode</Text>
                  <Text style={styles.settingHint}>Save up to 45% bandwidth on cellular</Text>
                </View>
                <Switch
                  value={dataSaver}
                  onValueChange={handleToggleDataSaver}
                  trackColor={{ false: '#1d3025', true: '#22c55e' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
          </View>

          {/* ── Storage Info ── */}
          <View style={styles.settingsSection}>
            <View style={styles.settingsSectionHeader}>
              <Database size={13} color="#22c55e" />
              <Text style={styles.settingsSectionHeading}>Storage</Text>
            </View>
            <View style={styles.storageInfoCard}>
              <View style={styles.storageRow}>
                <Text style={styles.storageLabel}>Watch History</Text>
                <Text style={styles.storageValue}>{watchHistory.length} items</Text>
              </View>
              <View style={styles.storageRow}>
                <Text style={styles.storageLabel}>Saved to My List</Text>
                <Text style={styles.storageValue}>{savedAnimeIds.length} titles</Text>
              </View>
              <View style={styles.storageRow}>
                <Text style={styles.storageLabel}>Favourites</Text>
                <Text style={styles.storageValue}>{favoriteAnimeIds.length} titles</Text>
              </View>
              <View style={[styles.storageRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.storageLabel}>Downloads</Text>
                <View style={styles.comingSoonInlinePill}>
                  <Text style={styles.comingSoonInlineText}>Coming Soon</Text>
                </View>
              </View>
            </View>
          </View>

        </ScrollView>
      </View>
    );
  }

  // ── MAIN PROFILE SCREEN ──────────────────────────────────────────────────

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.mainScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. USER PROFILE HEADER */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.userRow}>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarEmoji}>{profile.avatarEmoji}</Text>
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            </View>

            <View style={styles.userInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{profile.displayName}</Text>
                <ShieldCheck size={16} color="#22c55e" />
              </View>
              <Text style={styles.userHandle}>@{profile.handle} • {profile.bio || 'Otaku Streamer'}</Text>

              <View style={styles.statsRow}>
                <View style={styles.statPill}>
                  <Text style={styles.statPillValue}>{watchHistory.length * 1} Episodes</Text>
                  <Text style={styles.statPillLabel}>Watched</Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.statPillValue}>{savedAnimeIds.length} Saved</Text>
                  <Text style={styles.statPillLabel}>My List</Text>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.editButton}
            onPress={() => setShowEditModal(true)}
          >
            <Edit3 size={12} color="#86efac" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* 2. WATCH HISTORY */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <View style={styles.historyTitleRow}>
              <History size={16} color="#22c55e" />
              <Text style={styles.historyTitle}>Watch History</Text>
              <Text style={styles.historyCount}>({watchHistory.length})</Text>
            </View>
            {watchHistory.length > 0 && (
              <TouchableOpacity onPress={handleClearAllHistory}>
                <Text style={styles.clearAllText}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>

          {watchHistory.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyScroll}>
              {watchHistory.map((item) => {
                const progressPercent = item.durationSeconds > 0
                  ? Math.min(100, Math.round((item.progressSeconds / item.durationSeconds) * 100))
                  : 0;
                const currentTime = fmtSecs(item.progressSeconds);
                const duration = fmtSecs(item.durationSeconds);
                const watchedAt = timeAgo(item.updatedAt);
                const epTitle = item.episodeTitle || `Episode ${item.episodeNumber}`;

                return (
                  <TouchableOpacity
                    key={`wh-${item.animeId}-${item.episodeNumber}`}
                    activeOpacity={0.85}
                    onPress={() => handleWatchHistoryClick(item.animeId)}
                    style={styles.historyCard}
                  >
                    <View style={styles.historyThumbBox}>
                      <Image source={getImageSource(item.poster)} style={styles.historyThumbImage} />
                      <View style={styles.historyPlayOverlay}>
                        <PlayCircleButton size={32} iconSize={14} />
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveHistoryItem(item.animeId)}
                        style={styles.historyRemoveButton}
                      >
                        <X size={12} color="#ffffff" />
                      </TouchableOpacity>
                      <View style={styles.historyDurationStamp}>
                        <Text style={styles.historyDurationStampText}>{currentTime} / {duration}</Text>
                      </View>
                      <View style={styles.historyProgressBarBg}>
                        <View style={[styles.historyProgressBarFill, { width: `${progressPercent}%` }]} />
                      </View>
                    </View>
                    <Text numberOfLines={1} style={styles.historyEpisodeTitle}>
                      S{String(item.seasonNumber || 1).padStart(2, '0')} E{String(item.episodeNumber).padStart(2, '0')}: {epTitle}
                    </Text>
                    <Text numberOfLines={1} style={styles.historyAnimeTitle}>{item.animeTitle}</Text>
                    <Text style={styles.historyWatchedAt}>
                      <Text style={{ color: '#86efac', fontWeight: '600' }}>{progressPercent}% watched</Text>
                      {' '}• {watchedAt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.emptyHistoryBox}>
              <Text style={styles.emptyHistoryText}>No watch history yet</Text>
            </View>
          )}
        </View>

        {/* 3. LIBRARY & PREFERENCES */}
        <View style={styles.librarySection}>
          <Text style={styles.sectionHeading}>LIBRARY & PREFERENCES</Text>

          <View style={styles.groupedCard}>
            {/* My List */}
            <TouchableOpacity activeOpacity={0.7} onPress={() => setActiveSubView('mylist')} style={styles.groupedRow}>
              <View style={styles.groupedRowLeft}>
                <View style={[styles.groupedIconBox, { backgroundColor: '#142019', borderColor: 'rgba(34,197,94,0.3)' }]}>
                  <Bookmark size={18} color="#22c55e" />
                </View>
                <View>
                  <Text style={styles.groupedRowTitle}>My List</Text>
                  <Text style={styles.groupedRowDesc}>Your saved watchlist for binge streaming</Text>
                </View>
              </View>
              <View style={styles.groupedRowRight}>
                <View style={[styles.countBadge, { backgroundColor: '#142019', borderColor: 'rgba(34,197,94,0.3)' }]}>
                  <Text style={[styles.countBadgeText, { color: '#86efac' }]}>{savedAnime.length} Titles</Text>
                </View>
                <ChevronRight size={16} color="#7e8b83" />
              </View>
            </TouchableOpacity>

            {/* Downloads — NEW */}
            <TouchableOpacity activeOpacity={0.7} onPress={() => setActiveSubView('downloads')} style={styles.groupedRow}>
              <View style={styles.groupedRowLeft}>
                <View style={[styles.groupedIconBox, { backgroundColor: '#141a20', borderColor: 'rgba(59,130,246,0.3)' }]}>
                  <Download size={18} color="#60a5fa" />
                </View>
                <View>
                  <Text style={styles.groupedRowTitle}>Downloads</Text>
                  <Text style={styles.groupedRowDesc}>Offline episodes for watching anywhere</Text>
                </View>
              </View>
              <View style={styles.groupedRowRight}>
                <View style={styles.comingSoonInlinePill}>
                  <Text style={styles.comingSoonInlineText}>Soon</Text>
                </View>
                <ChevronRight size={16} color="#7e8b83" />
              </View>
            </TouchableOpacity>

            {/* Favorites */}
            <TouchableOpacity activeOpacity={0.7} onPress={() => setActiveSubView('favorites')} style={styles.groupedRow}>
              <View style={styles.groupedRowLeft}>
                <View style={[styles.groupedIconBox, { backgroundColor: '#201416', borderColor: 'rgba(239,68,68,0.3)' }]}>
                  <Heart size={18} color="#ef4444" fill="rgba(239,68,68,0.2)" />
                </View>
                <View>
                  <Text style={styles.groupedRowTitle}>Favorites</Text>
                  <Text style={styles.groupedRowDesc}>Your all-time favorite anime & movies</Text>
                </View>
              </View>
              <View style={styles.groupedRowRight}>
                <View style={[styles.countBadge, { backgroundColor: '#201416', borderColor: 'rgba(239,68,68,0.3)' }]}>
                  <Text style={[styles.countBadgeText, { color: '#fca5a5' }]}>{favoriteAnime.length} Titles</Text>
                </View>
                <ChevronRight size={16} color="#7e8b83" />
              </View>
            </TouchableOpacity>

            {/* Settings */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActiveSubView('settings')}
              style={[styles.groupedRow, { borderBottomWidth: 0 }]}
            >
              <View style={styles.groupedRowLeft}>
                <View style={[styles.groupedIconBox, { backgroundColor: '#142019', borderColor: 'rgba(34,197,94,0.3)' }]}>
                  <Settings size={18} color="#22c55e" />
                </View>
                <View>
                  <Text style={styles.groupedRowTitle}>Settings & Preferences</Text>
                  <Text style={styles.groupedRowDesc}>Audio track, player, downloads & storage</Text>
                </View>
              </View>
              <ChevronRight size={16} color="#7e8b83" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 3.5. CONTACT */}
        <View style={styles.followSection}>
          <View style={styles.followHeader}>
            <View style={styles.followDot} />
            <Text style={styles.followTitle}>CONTACT</Text>
            <View style={{ flex: 1 }} />
            <Text style={styles.followHandle}>Support & Inquiries</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => Linking.openURL('mailto:contact@hindi-anime.com?subject=HindiAnime%20Support').catch(() => {})}
            style={styles.contactCardRow}
          >
            <View style={[styles.socialIconCircle, { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)' }]}>
              <Mail size={18} color="#22c55e" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.contactCardTitle}>Email Support</Text>
              <Text style={styles.contactEmailText}>contact@hindi-anime.com</Text>
              <Text style={styles.contactDescText}>Queries, feedback, and stream requests</Text>
            </View>
            <ChevronRight size={16} color="#7e8b83" />
          </TouchableOpacity>
        </View>

        {/* 4. FOLLOW US */}
        <View style={styles.followSection}>
          <View style={styles.followHeader}>
            <View style={styles.followDot} />
            <Text style={styles.followTitle}>FOLLOW US</Text>
            <View style={{ flex: 1 }} />
            <Text style={styles.followHandle}>@HindiAnime</Text>
          </View>

          <View style={styles.socialGrid}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => Linking.openURL('https://www.instagram.com/hindi_animecom').catch(() => {})}
              style={styles.socialBox}
            >
              <View style={[styles.socialIconCircle, { backgroundColor: 'rgba(236,72,153,0.15)', borderColor: 'rgba(236,72,153,0.3)' }]}>
                <Instagram size={18} color="#f472b6" />
              </View>
              <Text style={styles.socialName}>Instagram</Text>
              <Text numberOfLines={1} style={styles.socialSub}>@hindi_animecom</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => Linking.openURL('https://x.com/HindiAnimecom').catch(() => {})}
              style={styles.socialBox}
            >
              <View style={[styles.socialIconCircle, { backgroundColor: 'rgba(14,165,233,0.15)', borderColor: 'rgba(14,165,233,0.3)' }]}>
                <Twitter size={18} color="#38bdf8" />
              </View>
              <Text style={styles.socialName}>X / Twitter</Text>
              <Text numberOfLines={1} style={styles.socialSub}>@HindiAnimecom</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => Linking.openURL('https://www.facebook.com/people/HindiAnime/61595551320116/').catch(() => {})}
              style={styles.socialBox}
            >
              <View style={[styles.socialIconCircle, { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.3)' }]}>
                <Facebook size={18} color="#60a5fa" />
              </View>
              <Text style={styles.socialName}>Facebook</Text>
              <Text numberOfLines={1} style={styles.socialSub}>HindiAnime</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. Footer Branding */}
        <View style={styles.footerBranding}>
          <HindiAnimeLogo size="sm" showTagline={true} />
          <Text style={styles.footerEngineText}>Hindi-Anime.com Engine • Multi-Audio HD</Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={showEditModal}
        profile={profile}
        onSave={handleSaveProfile}
        onClose={() => setShowEditModal(false)}
      />
    </>
  );
};

export const ProfileView = React.memo(ProfileView_);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050807',
  },
  mainScrollContent: {
    padding: 16,
    paddingBottom: 90,
    gap: 20,
  },

  // ── Profile Header ──
  profileHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#142019',
    borderWidth: 1.5,
    borderColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarEmoji: {
    fontSize: 26,
  },
  proBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#22c55e',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  proBadgeText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#000000',
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  userHandle: {
    fontSize: 10.5,
    color: '#7e8b83',
    marginTop: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  statPill: {
    backgroundColor: '#142019',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statPillValue: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#86efac',
  },
  statPillLabel: {
    fontSize: 8,
    color: '#7e8b83',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#142019',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  editButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#86efac',
  },

  // ── History ──
  historySection: { gap: 10 },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyTitle: { fontSize: 14, fontWeight: '800', color: '#ffffff' },
  historyCount: { fontSize: 12, fontWeight: '700', color: '#22c55e' },
  clearAllText: { fontSize: 11, color: '#7e8b83' },
  historyScroll: { gap: 12, paddingVertical: 2 },
  historyCard: { width: 200 },
  historyThumbBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0d1611',
    borderWidth: 1,
    borderColor: '#1d3025',
    position: 'relative',
  },
  historyThumbImage: { width: '100%', height: '100%' },
  historyPlayOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  historyRemoveButton: {
    position: 'absolute',
    top: 4, right: 4,
    width: 22, height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyDurationStamp: {
    position: 'absolute',
    bottom: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  historyDurationStampText: { fontSize: 8.5, fontFamily: 'monospace', color: '#ffffff' },
  historyProgressBarBg: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  historyProgressBarFill: { height: '100%', backgroundColor: '#22c55e' },
  historyEpisodeTitle: { fontSize: 11.5, fontWeight: '700', color: '#ffffff', marginTop: 6 },
  historyAnimeTitle: { fontSize: 10.5, color: '#7e8b83', marginTop: 1 },
  historyWatchedAt: { fontSize: 9.5, color: '#7e8b83', marginTop: 2 },
  emptyHistoryBox: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
    alignItems: 'center',
  },
  emptyHistoryText: { fontSize: 12, color: '#7e8b83' },

  // ── Library Section ──
  librarySection: { gap: 8 },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7e8b83',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  groupedCard: {
    borderRadius: 16,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
    overflow: 'hidden',
  },
  groupedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  groupedRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  groupedIconBox: {
    width: 36, height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupedRowTitle: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  groupedRowDesc: { fontSize: 10.5, color: '#7e8b83', marginTop: 2 },
  groupedRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countBadgeText: { fontSize: 10, fontWeight: '700' },

  // ── Coming Soon Inline Pill ──
  comingSoonInlinePill: {
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.4)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  comingSoonInlineText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fbbf24',
    letterSpacing: 0.3,
  },

  // ── Contact ──
  contactCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#142019',
    borderWidth: 1,
    borderColor: '#1d3025',
    gap: 12,
  },
  contactCardTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  contactEmailText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22c55e',
  },
  contactDescText: {
    fontSize: 10,
    color: '#7e8b83',
  },

  // ── Follow ──
  followSection: {
    borderRadius: 16,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
    padding: 14,
    gap: 12,
  },
  followHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  followDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  followTitle: { fontSize: 11.5, fontWeight: '800', color: '#ffffff', letterSpacing: 0.5 },
  followHandle: { fontSize: 10.5, color: '#22c55e', fontWeight: '700' },
  socialGrid: { flexDirection: 'row', gap: 8 },
  socialBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#142019',
    borderWidth: 1,
    borderColor: '#1d3025',
    gap: 4,
  },
  socialIconCircle: {
    width: 32, height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialName: { fontSize: 10.5, fontWeight: '700', color: '#ffffff' },
  socialSub: { fontSize: 8.5, color: '#7e8b83' },

  // ── Footer ──
  footerBranding: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 4 },
  footerEngineText: { fontSize: 9.5, fontFamily: 'monospace', color: '#7e8b83' },

  // ── Subview common ──
  subviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1d3025',
  },
  subviewBackButton: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subviewTitle: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
  subviewSubtitle: { fontSize: 11, color: '#7e8b83' },
  subviewScroll: { padding: 16, paddingBottom: 90 },
  subviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  subviewCardCol: { width: '31.5%', marginBottom: 10 },
  emptyStateBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyStateTitle: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  emptyStateDesc: { fontSize: 12, color: '#7e8b83', textAlign: 'center', paddingHorizontal: 24 },

  // ── Settings ──
  settingsSection: { marginBottom: 20, gap: 10 },
  settingsSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settingsSectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#22c55e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingCard: {
    borderRadius: 12,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  settingRowLast: { borderBottomWidth: 0 },
  settingLabelGroup: { flex: 1, paddingRight: 12 },
  settingLabel: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  settingHint: { fontSize: 10.5, color: '#7e8b83', marginTop: 2 },
  settingHintLoose: { fontSize: 10.5, color: '#7e8b83', marginTop: 4, paddingHorizontal: 2 },

  // Chip selectors
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
  },
  chipActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  chipText: { fontSize: 12, fontWeight: '600', color: '#7e8b83' },
  chipTextActive: { color: '#000000', fontWeight: '800' },

  // Storage Info
  storageInfoCard: {
    borderRadius: 12,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
    overflow: 'hidden',
  },
  storageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  storageLabel: { fontSize: 12, color: '#94a3b8' },
  storageValue: { fontSize: 12, fontWeight: '700', color: '#86efac' },

  // ── Coming Soon Full Page ──
  comingSoonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  comingSoonIconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#0f1f14',
    borderWidth: 2,
    borderColor: 'rgba(34,197,94,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  comingSoonBadge: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fbbf24',
    letterSpacing: 2,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    overflow: 'hidden',
  },
  comingSoonTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
  },
  comingSoonDesc: {
    fontSize: 13,
    color: '#7e8b83',
    textAlign: 'center',
    lineHeight: 20,
  },
  comingSoonFeatureList: {
    width: '100%',
    gap: 10,
    marginTop: 4,
    backgroundColor: '#0f1713',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1d3025',
    padding: 14,
  },
  comingSoonFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  comingSoonFeatureEmoji: { fontSize: 16 },
  comingSoonFeatureText: { fontSize: 12.5, color: '#d1d5db', flex: 1 },
  comingSoonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251,191,36,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  comingSoonPillText: {
    fontSize: 11.5,
    color: '#fbbf24',
    fontWeight: '600',
  },

  // ── Edit Profile Modal ──
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: '#0a0f0c',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: '#1d3025',
    maxHeight: '90%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1d3025',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#ffffff' },
  modalCloseBtn: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: { padding: 18 },
  modalLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7e8b83',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  modalInput: {
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#ffffff',
  },
  modalInputFlex: { flex: 1 },
  modalInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalInputPrefix: {
    fontSize: 16,
    color: '#22c55e',
    fontWeight: '700',
    paddingBottom: 2,
  },
  modalInputMultiline: { minHeight: 70, textAlignVertical: 'top', paddingTop: 11 },
  modalInputHint: { fontSize: 10, color: '#4b5563', marginTop: 4, marginLeft: 2 },

  // Avatar emoji picker
  emojiScroll: { marginBottom: 4 },
  emojiOption: {
    width: 46, height: 46,
    borderRadius: 14,
    backgroundColor: '#0f1713',
    borderWidth: 1.5,
    borderColor: '#1d3025',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    position: 'relative',
  },
  emojiOptionActive: {
    borderColor: '#22c55e',
    backgroundColor: '#142019',
  },
  emojiText: { fontSize: 22 },
  emojiCheckDot: {
    position: 'absolute',
    bottom: -4, right: -4,
    width: 16, height: 16,
    borderRadius: 8,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Save button
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 24,
    marginBottom: 8,
  },
  saveBtnDisabled: { backgroundColor: '#1a2520' },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: '#000000' },
  saveBtnTextDisabled: { color: '#4b5563' },
});
