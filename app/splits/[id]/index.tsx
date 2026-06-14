import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  Image,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FONTS } from '../../../constants/theme';
import { P } from '../../../constants/homeTheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import { useToast } from '../../../contexts/ToastContext';
import { API_URL } from '../../../utils/api';
import { getToken } from '../../../utils/tokenStorage';
import SplitRating from '../../../components/ui/SplitRating';
import ActionModal from '../../../components/ui/ActionModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function RenameModal({ visible, title, currentName, onSave, onClose, colors, isDark }: any) {
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => { setName(currentName); }, [currentName]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave(name.trim());
    setSaving(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={rStyles.overlay}>
        <View style={[rStyles.modal, { backgroundColor: colors.card }]}>
          <Text style={[rStyles.title, { color: colors.text }]}>{title}</Text>
          <TextInput
            style={[rStyles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            value={name}
            onChangeText={setName}
            placeholder="Enter name"
            placeholderTextColor={colors.textDim}
            autoFocus
          />
          <View style={rStyles.actions}>
            <TouchableOpacity style={[rStyles.cancelBtn, isDark && { backgroundColor: colors.inputBg }]} onPress={onClose}>
              <Text style={{ color: colors.textMuted, fontFamily: FONTS.bodyBold }}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={rStyles.saveBtn} onPress={handleSave} disabled={saving || !name.trim()}>
              <LinearGradient colors={isDark ? [colors.primary, colors.primaryDark || colors.primary] : [P.cta, P.ctaDark]} style={rStyles.saveGrad}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontFamily: FONTS.bodyBold }}>SAVE</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const rStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 40 },
  modal: { width: '100%', borderRadius: 24, padding: 24 },
  title: { fontFamily: FONTS.heading, fontSize: 22, marginBottom: 20 },
  input: { height: 52, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, fontFamily: FONTS.bodyBold, fontSize: 16, marginBottom: 24 },
  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, height: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)' },
  saveBtn: { flex: 2, borderRadius: 14, overflow: 'hidden' },
  saveGrad: { height: 50, justifyContent: 'center', alignItems: 'center' },
});

export default function SplitSessionsScreen() {
  const router = useRouter();
  const { id, shared, creatorName, creatorPic, splitName: initialSplitName } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState(false);
  const [alreadyAdded, setAlreadyAdded] = useState(false);
  const [splitDetail, setSplitDetail] = useState<any>(null);
  const [showSplitRename, setShowSplitRename] = useState(false);
  const [renameSession, setRenameSession] = useState<any>(null);
  const [deleteSessionId, setDeleteSessionId] = useState<number | null>(null);

  const isShared = shared === '1';
  const clonedFromId = splitDetail?.cloned_from_id;

  const fetchData = useCallback(async () => {
    const token = await getToken();
    try {
      if (isShared) {
        const [sessRes, detailRes] = await Promise.all([
          axios.get(`${API_URL}/workouts/splits/${id}/sessions`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API_URL}/workouts/shared-splits/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        setSessions(sessRes.data);
        setAlreadyAdded(detailRes.data.is_already_added || false);
        setSplitDetail(detailRes.data);
      } else {
        const [sessRes, splitRes] = await Promise.all([
          axios.get(`${API_URL}/workouts/splits/${id}/sessions`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API_URL}/workouts/splits/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        setSessions(sessRes.data);
        setSplitDetail(splitRes.data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [id, isShared]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleDelete = async (sessionId: number) => {
    setDeleteSessionId(sessionId);
  };

  const confirmDeleteSession = async () => {
    if (!deleteSessionId) return;
    try {
      const token = await getToken();
      await axios.delete(`${API_URL}/workouts/sessions/${deleteSessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions((prev: any[]) => prev.filter(s => s.id !== deleteSessionId));
      setDeleteSessionId(null);
    } catch (err) {
      console.error('Error deleting session:', err);
      setDeleteSessionId(null);
    }
  };

  const handleRenameSplit = async (newName: string) => {
    try {
      const token = await getToken();
      await axios.put(`${API_URL}/workouts/splits/${id}`, { name: newName }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSplitDetail((prev: any) => ({ ...prev, name: newName }));
      showToast('Program renamed!');
      setShowSplitRename(false);
    } catch (err) {
      showToast('Failed to rename', 'error');
    }
  };

  const handleRenameSession = async (sessionId: number, newName: string) => {
    try {
      const token = await getToken();
      await axios.put(`${API_URL}/workouts/sessions/${sessionId}`, { name: newName }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions((prev: any[]) => prev.map(s => s.id === sessionId ? { ...s, name: newName } : s));
      showToast('Session renamed!');
      setRenameSession(null);
    } catch (err) {
      showToast('Failed to rename', 'error');
    }
  };

  const handleRate = async (rating: number) => {
    try {
      const token = await getToken();
      const res = await axios.post(`${API_URL}/workouts/splits/${id}/rate`,
        { rating },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSplitDetail((prev: any) => ({
        ...prev,
        avg_rating: res.data.avg_rating,
        rating_count: res.data.rating_count,
        user_rating: rating,
      }));
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to rate', 'error');
      throw err;
    }
  };

  const handleClone = async () => {
    setCloning(true);
    try {
      const token = await getToken();
      const res = await axios.post(`${API_URL}/workouts/shared-splits/${id}/clone`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(res.data.message || 'Program added to your collection!');
      router.back();
    } catch (err) {
      console.error('Error cloning split:', err);
      showToast('Failed to add program', 'error');
    } finally {
      setCloning(false);
    }
  };

  const renderSession = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.sessionCard,
        isDark ? {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1
        } : {
          backgroundColor: P.cta,
          borderColor: P.cta,
          borderWidth: 1
        }
      ]}
      activeOpacity={0.8}
      onPress={() => router.push({
        pathname: `/splits/session/${item.id}`,
        params: isShared ? { shared: '1' } : { clonedFromId: clonedFromId || undefined }
      })}
    >
      <View style={styles.cardMain}>
        <View style={styles.sessionImageContainer}>
          <Image
            source={{ uri: item.sample_image || 'https://images.unsplash.com/photo-1517836357463-d25dfeac00ad?q=80&w=200&auto=format&fit=crop' }}
            style={styles.sessionImage}
          />
          <View style={styles.sessionOverlay} />
        </View>
        <View style={styles.titleArea}>
          <Text style={[styles.sessionName, { color: isDark ? colors.text : '#FFF' }]}>{item.name}</Text>
          <Text style={[styles.sessionMeta, { color: isDark ? colors.textMuted : '#FFF' }]}>
            <Ionicons name="barbell-outline" size={12} color={isDark ? colors.textMuted : '#FFF'} /> {item.exercise_count} Exercises
          </Text>
        </View>
        {!isShared && !clonedFromId && (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity
              style={[styles.editIconBtn, { backgroundColor: isDark ? 'rgba(37,150,190,0.15)' : 'rgba(255,255,255,0.12)', borderColor: isDark ? 'rgba(37,150,190,0.3)' : 'rgba(255,255,255,0.22)', borderWidth: 1 }]}
              onPress={() => setRenameSession(item)}
            >
              <Ionicons name="create-outline" size={16} color={isDark ? '#2596BE' : '#FFF'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.12)', borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.22)', borderWidth: 1 }]}
              onPress={() => handleDelete(item.id)}
            >
              <Ionicons name="trash-outline" size={18} color={isDark ? '#EF4444' : '#FFF'} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View
        style={[
          styles.cardFooter,
          {
            backgroundColor: isDark ? colors.inputBg : 'rgba(255, 255, 255, 0.12)',
            borderColor: isDark ? colors.border : 'rgba(255, 255, 255, 0.16)',
            borderWidth: 1,
          }
        ]}
      >
        <Text style={[styles.actionText, { color: isDark ? colors.primary : '#FFF' }]}>
          {isShared ? 'View Routine' : 'Manage Routine'}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={isDark ? colors.primary : '#FFF'} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            {isShared ? (
              <>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  {initialSplitName || splitDetail?.name || 'Program'}
                </Text>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}
                  activeOpacity={0.7}
                  onPress={() => {
                    const cid = splitDetail?.creator_id;
                    if (cid) router.push(`/profile/${cid}`);
                  }}
                >
                  {splitDetail?.creator_pic || creatorPic ? (
                    <Image
                      source={{ uri: splitDetail?.creator_pic || (creatorPic as string) }}
                      style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.inputBg }}
                    />
                  ) : (
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.inputBg, justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="person" size={10} color={colors.textMuted} />
                    </View>
                  )}
                  <Text style={[styles.headerSub, { color: colors.textMuted, fontSize: 12 }]}>
                    @{splitDetail?.creator_name || creatorName || 'user'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.headerTitle, { color: colors.text, flexShrink: 1 }]} numberOfLines={1}>
                    {splitDetail?.name || 'Program'}
                  </Text>
                  {!clonedFromId && (
                    <TouchableOpacity onPress={() => setShowSplitRename(true)}>
                      <Ionicons name="create-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={[styles.headerSub, { color: colors.textMuted }]}>{sessions.length} session{sessions.length !== 1 ? 's' : ''}</Text>
                {clonedFromId && splitDetail?.original_creator_name && (
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}
                    activeOpacity={0.7}
                    onPress={() => {
                      const cid = splitDetail?.original_creator_id;
                      if (cid) router.push(`/profile/${cid}`);
                    }}
                  >
                    {splitDetail?.original_creator_pic ? (
                      <Image
                        source={{ uri: splitDetail.original_creator_pic }}
                        style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.inputBg }}
                      />
                    ) : (
                      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.inputBg, justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="person" size={10} color={colors.textMuted} />
                      </View>
                    )}
                    <Text style={[styles.headerSub, { color: colors.textMuted, fontSize: 11 }]}>
                      by @{splitDetail.original_creator_name}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
          {!isShared && !clonedFromId && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push({ pathname: `/splits/${id}/create-session` })}
            >
              <LinearGradient
                colors={isDark ? [colors.primary, colors.primaryDark || colors.primary] : [P.cta, P.ctaDark]}
                style={styles.addBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="add" size={24} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.centered}>
            <View style={styles.emptyIconWrap}>
              <MaterialCommunityIcons name="calendar-plus" size={72} color={colors.border} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Sessions Yet</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              {isShared ? 'This program has no sessions yet.' : 'Create your first session (e.g. Push Day, Upper Body) within this program.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderSession}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: isShared ? 100 + Math.max(insets.bottom, 12) : 32 + Math.max(insets.bottom, 12) }
            ]}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              splitDetail ? (
                <View style={[styles.ratingSection, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
                  <Text style={[styles.ratingLabel, { color: colors.text }]}>Rate this Program</Text>
                  <SplitRating
                    avgRating={splitDetail.avg_rating}
                    ratingCount={splitDetail.rating_count}
                    userRating={splitDetail.user_rating}
                    canRate={splitDetail.can_rate}
                    onRate={handleRate}
                    size="md"
                  />
                </View>
              ) : null
            }
          />
        )}

        {!loading && sessions.length === 0 && splitDetail && (
          <View style={[styles.ratingSectionStandalone, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
            <Text style={[styles.ratingLabel, { color: colors.text }]}>Rate this Program</Text>
            <SplitRating
              avgRating={splitDetail.avg_rating}
              ratingCount={splitDetail.rating_count}
              userRating={splitDetail.user_rating}
              canRate={splitDetail.can_rate}
              onRate={handleRate}
              size="md"
            />
          </View>
        )}

        {isShared && (
          <View
            style={[
              styles.bottomBar,
              {
                backgroundColor: colors.bg,
                paddingBottom: Math.max(insets.bottom, 12) + 12,
                borderTopColor: colors.border,
              }
            ]}
          >
            {alreadyAdded ? (
              <View style={[styles.alreadyAddedBar, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                <Text style={[styles.alreadyAddedText, { color: colors.textMuted }]}>Already Added</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.cloneBtnBottom}
                onPress={handleClone}
                disabled={cloning}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark || colors.primary]}
                  style={styles.cloneBtnBottomGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {cloning ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="add-circle-outline" size={20} color="#FFF" />
                      <Text style={styles.cloneBtnBottomText}>Add to My Programs</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Split Rename Modal */}
      <RenameModal
        visible={showSplitRename}
        title="Rename Program"
        currentName={splitDetail?.name || ''}
        onSave={handleRenameSplit}
        onClose={() => setShowSplitRename(false)}
        colors={colors}
        isDark={isDark}
      />

      {/* Session Rename Modal */}
      <RenameModal
        visible={!!renameSession}
        title="Rename Session"
        currentName={renameSession?.name || ''}
        onSave={(name: string) => handleRenameSession(renameSession.id, name)}
        onClose={() => setRenameSession(null)}
        colors={colors}
        isDark={isDark}
      />

      <ActionModal
        visible={deleteSessionId !== null}
        type="delete"
        title="Delete Session"
        message="Are you sure you want to delete this session?"
        confirmText="DELETE"
        onConfirm={confirmDeleteSession}
        onCancel={() => setDeleteSessionId(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 8,
  },
  backBtn: { marginLeft: -8 },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 26 },
  headerSub: { fontFamily: FONTS.body, fontSize: 13, marginTop: 2 },
  addBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addBtnGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: { paddingBottom: 40 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  cloneBtnBottom: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cloneBtnBottomGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  cloneBtnBottomText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: '#FFF',
    letterSpacing: 0.5,
  },
  alreadyAddedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  alreadyAddedText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    letterSpacing: 0.3,
  },

  // Session Card
  sessionCard: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sessionImageContainer: {
    width: 54,
    height: 54,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sessionImage: {
    width: '100%',
    height: '100%',
  },
  sessionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  titleArea: { flex: 1 },
  sessionName: { fontFamily: FONTS.bodyBold, fontSize: 17, marginBottom: 4, flexShrink: 1 },
  sessionMeta: { fontFamily: FONTS.body, fontSize: 12, flexDirection: 'row', alignItems: 'center', gap: 4 },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
  },
  actionText: { fontFamily: FONTS.bodyBold, fontSize: 12 },

  // States
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIconWrap: { marginBottom: 20 },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 24, marginBottom: 8 },
  emptySub: { fontFamily: FONTS.body, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 },

  // Rating
  ratingSection: {
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginTop: 8,
  },
  ratingSectionStandalone: {
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginHorizontal: 0,
  },
  ratingLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    marginBottom: 10,
  },
});
