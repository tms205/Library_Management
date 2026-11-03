import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { searchMembersApi, updateMemberApi, deleteMemberApi, toggleMemberStatusApi } from '../api/memberApi';

// Không hiển thị tài khoản Quản trị viên (Admin) trong danh sách độc giả
const isMemberAdmin = (m) => {
  if (!m) return false;
  return (
    m.role === 'ADMIN' ||
    m.accountEmail?.toLowerCase() === 'admin' ||
    m.email?.toLowerCase() === 'admin' ||
    m.fullName?.toLowerCase() === 'admin' ||
    m.accountId === 1
  );
};

export default function MemberManagementScreen() {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const flatListRef = useRef(null);

  // Edit Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchMembers = useCallback(async (pageIndex = 0, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const data = await searchMembersApi({
        fullName: search.trim() || undefined,
        page: pageIndex,
        size: 10,
      });

      const allItems = data.content || [];
      // Lọc bỏ tài khoản đã xóa mềm hoặc tài khoản Quản trị viên (Admin không thuộc nhóm độc giả)
      const items = allItems.filter(
        (m) => m.is_delete !== 1 && m.isDelete !== 1 && !isMemberAdmin(m)
      );
      setMembers(items);
      setPage(data.number ?? pageIndex);
      setTotalPages(data.totalPages ?? 0);
      setTotalElements(data.totalElements ?? 0);
    } catch (err) {
      console.log('Error fetching members:', err);
      Alert.alert('Lỗi', err.response?.data?.message || err.message || 'Không thể tải danh sách độc giả!');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  const handleChangePage = (targetPage) => {
    if (targetPage < 0 || (totalPages > 0 && targetPage >= totalPages) || loading) {
      return;
    }
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    fetchMembers(targetPage);
  };

  useEffect(() => {
    fetchMembers(0);
  }, [fetchMembers]);

  const handleOpenEdit = (member) => {
    setEditingMember(member);
    setFullName(member.fullName || '');
    setPhone(member.phone || '');
    setAddress(member.address || '');
    setDateOfBirth(member.dateOfBirth || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!fullName || !phone || !address || !dateOfBirth) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ các trường thông tin!');
      return;
    }

    try {
      setSaving(true);
      await updateMemberApi(editingMember.id, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        dateOfBirth: dateOfBirth.trim(),
      });
      Alert.alert('Thành công', 'Cập nhật thông tin độc giả thành công!');
      setEditModalVisible(false);
      fetchMembers(0, true);
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể cập nhật độc giả!');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (member) => {
    Alert.alert(
      'Xác nhận xóa độc giả',
      `Bạn có chắc chắn muốn xóa độc giả "${member.fullName}"? Hành động này không thể hoàn tác.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMemberApi(member.id);
              Alert.alert('Thành công', 'Đã xóa độc giả!');
              setMembers((prev) => prev.filter((m) => m.id !== member.id));
              fetchMembers(0, true);
            } catch (err) {
              Alert.alert('Lỗi', err.response?.data?.message || 'Không thể xóa độc giả này!');
            }
          },
        },
      ],
    );
  };

  // Khóa hoặc mở khóa tài khoản độc giả - lưu giữ lịch sử mượn trả mà vẫn chặn đăng nhập
  const handleToggleLock = (member) => {
    const isLocked = member.enabled === false;
    const action = isLocked ? 'Mở khóa' : 'Khóa';

    Alert.alert(
      `Xác nhận ${action.toLowerCase()} tài khoản`,
      isLocked
        ? `Bạn có chắc chắn muốn mở khóa tài khoản cho độc giả "${member.fullName}"?`
        : `Bạn có chắc chắn muốn KHÓA tài khoản của độc giả "${member.fullName}"?\n\nĐộc giả sẽ không thể đăng nhập hoặc mượn sách, nhưng toàn bộ lịch sử mượn trả cũ vẫn được bảo lưu an toàn.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: action,
          style: isLocked ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await toggleMemberStatusApi(member.id, isLocked ? true : false);
              Alert.alert('Thành công', `Đã ${action.toLowerCase()} tài khoản độc giả thành công!`);
              fetchMembers(0, true);
            } catch (err) {
              Alert.alert('Lỗi', err.response?.data?.message || `Không thể ${action.toLowerCase()} tài khoản!`);
            }
          },
        },
      ]
    );
  };

  const renderMemberItem = ({ item }) => {
    // Không hiển thị nếu là Admin hoặc đã bị xóa mềm
    if (isMemberAdmin(item) || item.is_delete === 1 || item.isDelete === 1) {
      return null;
    }

    const isLocked = item.enabled === false;
    return (
      <View style={[styles.card, isLocked && styles.cardLocked]}>
        <View style={styles.cardHeader}>
          <View style={styles.nameRow}>
            <View style={styles.nameStatusRow}>
              <Text style={styles.nameText}>{item.fullName}</Text>
              <View style={[styles.statusBadge, isLocked ? styles.statusBadgeLocked : styles.statusBadgeActive]}>
                <Text style={[styles.statusBadgeText, isLocked ? styles.statusTextLocked : styles.statusTextActive]}>
                  {isLocked ? '🔒 Đã khóa' : '🟢 Hoạt động'}
                </Text>
              </View>
            </View>
            <Text style={styles.emailText}>✉️ {item.accountEmail || 'N/A'}</Text>
          </View>
          <Text style={styles.idBadge}>ID: #{item.id}</Text>
        </View>

        <Text style={styles.infoText}>📱 Điện thoại: <Text style={styles.infoVal}>{item.phone || 'Chưa cập nhật'}</Text></Text>
        <Text style={styles.infoText}>📍 Địa chỉ: <Text style={styles.infoVal}>{item.address || 'Chưa cập nhật'}</Text></Text>
        <Text style={styles.infoText}>🎂 Ngày sinh: <Text style={styles.infoVal}>{item.dateOfBirth || 'Chưa cập nhật'}</Text></Text>

        <View style={styles.cardFooter}>
          {/* Nút Khóa / Mở khóa tài khoản */}
          <TouchableOpacity
            style={[styles.lockBtn, isLocked ? styles.unlockBtn : null]}
            onPress={() => handleToggleLock(item)}
          >
            <Text style={[styles.lockBtnText, isLocked ? styles.unlockBtnText : null]}>
              {isLocked ? '🔓 Mở khóa' : '🔒 Khóa'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.editBtn} onPress={() => handleOpenEdit(item)}>
            <Text style={styles.editBtnText}>✏️ Sửa</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
            <Text style={styles.deleteBtnText}>🗑️ Xóa</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm độc giả theo họ tên..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => fetchMembers(0)}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={() => fetchMembers(0)}>
          <Text style={styles.searchBtnText}>Tìm</Text>
        </TouchableOpacity>
      </View>

      {/* Pagination Info Header Strip */}
      <View style={styles.paginationHeaderStrip}>
        <Text style={styles.paginationHeaderInfo}>
          👥 Tổng: <Text style={styles.highlightText}>{totalElements}</Text> độc giả
          {totalPages > 0 && (
            <Text style={styles.pageCountText}>
              {' '}• Trang <Text style={styles.highlightText}>{page + 1}</Text>/{totalPages}
            </Text>
          )}
        </Text>
        {loading && <ActivityIndicator size="small" color="#818cf8" />}
      </View>

      {loading && members.length === 0 ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Đang tải danh sách độc giả...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={members}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMemberItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchMembers(page, true)}
              tintColor="#818cf8"
            />
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.footerPaginationBox}>
                <Text style={styles.footerPaginationTitle}>Chọn số trang nhanh:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.footerPagePillsRow}
                >
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.pagePill,
                        page === idx && styles.pagePillActive,
                      ]}
                      disabled={page === idx || loading}
                      onPress={() => handleChangePage(idx)}
                    >
                      <Text
                        style={[
                          styles.pagePillText,
                          page === idx && styles.pagePillTextActive,
                        ]}
                      >
                        {idx + 1}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={{ height: 75 }} />
              </View>
            ) : (
              <View style={{ height: 75 }} />
            )
          }
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>Không tìm thấy độc giả nào!</Text>
            </View>
          }
        />
      )}

      {/* Sticky Bottom Pagination Bar */}
      {totalPages > 1 && (
        <View style={styles.bottomBarContainer}>
          <TouchableOpacity
            style={[
              styles.navPageBtn,
              (page === 0 || loading) && styles.navPageBtnDisabled,
            ]}
            disabled={page === 0 || loading}
            onPress={() => handleChangePage(page - 1)}
          >
            <Text
              style={[
                styles.navPageBtnText,
                (page === 0 || loading) && styles.navPageBtnTextDisabled,
              ]}
            >
              ◀ Trước
            </Text>
          </TouchableOpacity>

          <View style={styles.navPageCenter}>
            <Text style={styles.navPageCenterText}>
              Trang <Text style={styles.navPageNumberBold}>{page + 1}</Text> / {totalPages}
            </Text>
            <Text style={styles.navPageCenterSub}>
              ({members.length}/{totalElements} độc giả)
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.navPageBtn,
              (page >= totalPages - 1 || loading) && styles.navPageBtnDisabled,
            ]}
            disabled={page >= totalPages - 1 || loading}
            onPress={() => handleChangePage(page + 1)}
          >
            <Text
              style={[
                styles.navPageBtnText,
                (page >= totalPages - 1 || loading) && styles.navPageBtnTextDisabled,
              ]}
            >
              Sau ▶
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Edit Member Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingOverlay}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 60 }}
                automaticallyAdjustKeyboardInsets={true}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Sửa thông tin độc giả</Text>
                  <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalLabel}>Họ và tên *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Nguyễn Văn A"
                  placeholderTextColor="#94a3b8"
                />

                <Text style={styles.modalLabel}>Số điện thoại *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="0912345678"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                />

                <Text style={styles.modalLabel}>Địa chỉ *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Hà Nội"
                  placeholderTextColor="#94a3b8"
                />

                <Text style={styles.modalLabel}>Ngày sinh (YYYY-MM-DD) *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  placeholder="2000-01-15"
                  placeholderTextColor="#94a3b8"
                />

                <TouchableOpacity
                  style={[styles.saveBtn, saving && styles.btnDisabled]}
                  onPress={handleSaveEdit}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  searchBar: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  listContent: {
    padding: 12,
    gap: 12,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  nameRow: {
    flex: 1,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  emailText: {
    fontSize: 12,
    color: '#818cf8',
    marginTop: 2,
  },
  idBadge: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 4,
  },
  infoVal: {
    color: '#f1f5f9',
    fontWeight: '500',
  },
  cardFooter: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#0284c7',
    borderRadius: 6,
  },
  editBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 6,
  },
  deleteBtnText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '600',
  },
  cardLocked: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: '#191f2e',
  },
  nameStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  statusBadgeLocked: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextActive: {
    color: '#34d399',
  },
  statusTextLocked: {
    color: '#f87171',
  },
  lockBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 6,
  },
  lockBtnText: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '600',
  },
  unlockBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  unlockBtnText: {
    color: '#34d399',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 10,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 15,
  },
  keyboardAvoidingOverlay: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  modalClose: {
    fontSize: 20,
    color: '#cbd5e1',
    padding: 4,
  },
  modalLabel: {
    fontSize: 13,
    color: '#cbd5e1',
    marginBottom: 6,
    fontWeight: '500',
  },
  modalInput: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  paginationHeaderStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  paginationHeaderInfo: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '500',
  },
  highlightText: {
    color: '#818cf8',
    fontWeight: '700',
  },
  pageCountText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  footerPaginationBox: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  footerPaginationTitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '600',
  },
  footerPagePillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  pagePill: {
    minWidth: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  pagePillActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#6366f1',
  },
  pagePillText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  pagePillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  bottomBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  navPageBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  navPageBtnDisabled: {
    backgroundColor: '#334155',
    opacity: 0.5,
  },
  navPageBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  navPageBtnTextDisabled: {
    color: '#64748b',
  },
  navPageCenter: {
    alignItems: 'center',
  },
  navPageCenterText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  navPageNumberBold: {
    color: '#818cf8',
    fontWeight: '700',
  },
  navPageCenterSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
});
