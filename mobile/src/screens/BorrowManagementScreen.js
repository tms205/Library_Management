import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import {
  getBorrowManagementApi,
  approveBorrowApi,
  rejectBorrowApi,
  confirmReturnApi,
} from '../api/borrowApi';

const STATUS_MAP = {
  PENDING: { label: 'Chờ duyệt mượn', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  BORROWED: { label: 'Đang mượn', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  RETURN_PENDING: { label: 'Chờ xác nhận trả', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  RETURNED: { label: 'Đã hoàn trả', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' },
  REJECTED: { label: 'Đã từ chối', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
};

const FILTER_TABS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ duyệt' },
  { key: 'RETURN_PENDING', label: 'Chờ nhận trả' },
  { key: 'BORROWED', label: 'Đang mượn' },
  { key: 'RETURNED', label: 'Đã xong' },
];

export default function BorrowManagementScreen() {
  const [records, setRecords] = useState([]);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);

  // =========================================================================
  // STATE TÌM KIẾM & BỘ LỌC CHO MOBILE
  // - searchKeyword: từ khóa tìm nhanh ở thanh search (khớp tên độc giả hoặc tên sách)
  // - filterModalVisible: đóng/mở popup lọc chi tiết theo ngày và tên
  // =========================================================================
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterMemberName, setFilterMemberName] = useState('');
  const [filterBookTitle, setFilterBookTitle] = useState('');
  const [filterDate, setFilterDate] = useState(''); // Định dạng: YYYY-MM-DD
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');

  const [appliedFilters, setAppliedFilters] = useState({
    memberName: '',
    bookTitle: '',
    date: '',
    fromDate: '',
    toDate: '',
  });

  const hasActiveFilters = Boolean(
    appliedFilters.memberName ||
    appliedFilters.bookTitle ||
    appliedFilters.date ||
    appliedFilters.fromDate ||
    appliedFilters.toDate,
  );

  const fetchRecords = useCallback(
    async (isRefresh = false, activeF = appliedFilters) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const params = {};
        if (activeF.memberName?.trim()) params.memberName = activeF.memberName.trim();
        if (activeF.bookTitle?.trim()) params.bookTitle = activeF.bookTitle.trim();
        if (activeF.date?.trim()) params.date = activeF.date.trim();
        if (activeF.fromDate?.trim()) params.fromDate = activeF.fromDate.trim();
        if (activeF.toDate?.trim()) params.toDate = activeF.toDate.trim();

        const data = await getBorrowManagementApi(params);
        setRecords(data || []);
      } catch (err) {
        console.log('Error fetching borrow management:', err);
        Alert.alert(
          'Lỗi',
          err.response?.data?.message || err.message || 'Không thể tải danh sách mượn trả!',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [appliedFilters],
  );

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Xử lý áp dụng bộ lọc nâng cao từ Modal
  const handleApplyFilter = () => {
    const nextFilters = {
      memberName: filterMemberName.trim(),
      bookTitle: filterBookTitle.trim(),
      date: filterDate.trim(),
      fromDate: filterFromDate.trim(),
      toDate: filterToDate.trim(),
    };
    setAppliedFilters(nextFilters);
    setFilterModalVisible(false);
    fetchRecords(true, nextFilters);
  };

  // Đặt lại bộ lọc nâng cao
  const handleResetFilter = () => {
    setFilterMemberName('');
    setFilterBookTitle('');
    setFilterDate('');
    setFilterFromDate('');
    setFilterToDate('');

    const defaultFilters = {
      memberName: '',
      bookTitle: '',
      date: '',
      fromDate: '',
      toDate: '',
    };
    setAppliedFilters(defaultFilters);
    setFilterModalVisible(false);
    fetchRecords(true, defaultFilters);
  };

  const handleApprove = (record) => {
    Alert.alert('Duyệt mượn sách', `Xác nhận duyệt cho độc giả "${record.memberName || 'Độc giả'}" mượn cuốn:\n"${record.bookTitle}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Duyệt mượn',
        onPress: async () => {
          try {
            setActionId(record.id);
            await approveBorrowApi(record.id);
            Alert.alert('Thành công', 'Đã duyệt yêu cầu mượn sách thành công!');
            fetchRecords(true);
          } catch (err) {
            Alert.alert('Lỗi', err.response?.data?.message || 'Không thể duyệt mượn!');
          } finally {
            setActionId(null);
          }
        },
      },
    ]);
  };

  const handleReject = (record) => {
    Alert.alert('Từ chối yêu cầu', `Bạn có chắc muốn TỪ CHỐI yêu cầu mượn cuốn:\n"${record.bookTitle}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Từ chối',
        style: 'destructive',
        onPress: async () => {
          try {
            setActionId(record.id);
            await rejectBorrowApi(record.id);
            Alert.alert('Thành công', 'Đã từ chối yêu cầu mượn sách!');
            fetchRecords(true);
          } catch (err) {
            Alert.alert('Lỗi', err.response?.data?.message || 'Không thể từ chối mượn!');
          } finally {
            setActionId(null);
          }
        },
      },
    ]);
  };

  const handleConfirmReturn = (record) => {
    Alert.alert('Xác nhận nhận sách', `Xác nhận đã nhận lại cuốn sách:\n"${record.bookTitle}" từ độc giả "${record.memberName || 'Độc giả'}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xác nhận đã trả',
        onPress: async () => {
          try {
            setActionId(record.id);
            await confirmReturnApi(record.id);
            Alert.alert('Thành công', 'Đã ghi nhận trả sách thành công! Sách đã được cộng lại kho.');
            fetchRecords(true);
          } catch (err) {
            Alert.alert('Lỗi', err.response?.data?.message || 'Không thể xác nhận trả sách!');
          } finally {
            setActionId(null);
          }
        },
      },
    ]);
  };

  // =========================================================================
  // LOGIC LỌC KẾT HỢP GIỮA TABS TRẠNG THÁI VÀ TỪ KHÓA TÌM KIẾM
  // =========================================================================
  const filtered = records.filter((r) => {
    // 1. Lọc theo tab trạng thái
    if (activeFilter === 'PENDING' && r.status !== 'PENDING') return false;
    if (activeFilter === 'RETURN_PENDING' && r.status !== 'RETURN_PENDING') return false;
    if (activeFilter === 'BORROWED' && r.status !== 'BORROWED') return false;
    if (activeFilter === 'RETURNED' && r.status !== 'RETURNED' && r.status !== 'REJECTED') return false;

    // 2. Tìm kiếm nhanh theo từ khóa (khớp tên sách hoặc tên độc giả)
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase().trim();
      const matchBook = (r.bookTitle || '').toLowerCase().includes(kw);
      const matchMember = (r.memberName || '').toLowerCase().includes(kw);
      if (!matchBook && !matchMember) return false;
    }

    return true;
  });

  const renderItem = ({ item }) => {
    const statusInfo = STATUS_MAP[item.status] || {
      label: item.status,
      color: '#94a3b8',
      bg: 'rgba(148, 163, 184, 0.15)',
    };
    const isBusy = actionId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.bookTitle} numberOfLines={2}>
            {item.bookTitle}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        <Text style={styles.infoText}>👤 Độc giả: <Text style={styles.infoVal}>{item.memberName || 'Chưa cập nhật'}</Text></Text>
        <Text style={styles.infoText}>📅 Ngày mượn: <Text style={styles.infoVal}>{item.borrowDate || 'N/A'}</Text></Text>
        <Text style={styles.infoText}>⏳ Hạn trả: <Text style={styles.infoVal}>{item.returnDate || 'N/A'}</Text></Text>

        {/* Action Buttons for Staff/Admin */}
        {item.status === 'PENDING' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn, isBusy && styles.btnDisabled]}
              onPress={() => handleApprove(item)}
              disabled={isBusy}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.actionBtnText}>✅ Duyệt mượn</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn, isBusy && styles.btnDisabled]}
              onPress={() => handleReject(item)}
              disabled={isBusy}
            >
              <Text style={styles.actionBtnText}>❌ Từ chối</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'RETURN_PENDING' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.confirmReturnBtn, isBusy && styles.btnDisabled]}
              onPress={() => handleConfirmReturn(item)}
              disabled={isBusy}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.actionBtnText}>📥 Xác nhận đã nhận lại sách</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* THANH TÌM KIẾM NHANH & NÚT MỞ BỘ LỌC NGÀY NÂNG CAO */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm tên độc giả hoặc tên sách..."
            placeholderTextColor="#94a3b8"
            value={searchKeyword}
            onChangeText={setSearchKeyword}
          />
          {searchKeyword.length > 0 && (
            <TouchableOpacity onPress={() => setSearchKeyword('')} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.filterToggleBtn, hasActiveFilters && styles.filterToggleBtnActive]}
          onPress={() => setFilterModalVisible(true)}
        >
          <Text style={styles.filterToggleIcon}>🗓️ Lọc</Text>
          {hasActiveFilters && <View style={styles.filterActiveDot} />}
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        <FlatList
          data={FILTER_TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(t) => t.key}
          renderItem={({ item: tab }) => {
            const isActive = activeFilter === tab.key;
            return (
              <TouchableOpacity
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => setActiveFilter(tab.key)}
              >
                <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {loading && records.length === 0 ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Đang tải danh sách mượn trả...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchRecords(true)}
              tintColor="#818cf8"
            />
          }
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>
                {hasActiveFilters || searchKeyword.trim()
                  ? 'Không tìm thấy phiếu mượn nào khớp với điều kiện tìm kiếm!'
                  : 'Không có yêu cầu nào ở mục này!'}
              </Text>
            </View>
          }
        />
      )}

      {/* MODAL BỘ LỌC TÌM KIẾM CHI TIẾT (TÊN ĐỘC GIẢ, TÊN SÁCH, THEO NGÀY) */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔍 Bộ lọc mượn trả</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Tên độc giả</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Nhập tên độc giả..."
                placeholderTextColor="#64748b"
                value={filterMemberName}
                onChangeText={setFilterMemberName}
              />

              <Text style={styles.fieldLabel}>Tên sách</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Nhập tên sách..."
                placeholderTextColor="#64748b"
                value={filterBookTitle}
                onChangeText={setFilterBookTitle}
              />

              <Text style={styles.fieldLabel}>Ngày cụ thể (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ví dụ: 2026-10-28"
                placeholderTextColor="#64748b"
                value={filterDate}
                onChangeText={setFilterDate}
              />

              <View style={styles.dateRow}>
                <View style={styles.dateCol}>
                  <Text style={styles.fieldLabel}>Từ ngày</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#64748b"
                    value={filterFromDate}
                    onChangeText={setFilterFromDate}
                  />
                </View>
                <View style={styles.dateCol}>
                  <Text style={styles.fieldLabel}>Đến ngày</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#64748b"
                    value={filterToDate}
                    onChangeText={setFilterToDate}
                  />
                </View>
              </View>

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.modalResetBtn}
                  onPress={handleResetFilter}
                >
                  <Text style={styles.modalResetBtnText}>↺ Đặt lại</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalApplyBtn}
                  onPress={handleApplyFilter}
                >
                  <Text style={styles.modalApplyBtnText}>Áp dụng</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  filterBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  filterTabTextActive: {
    color: '#fff',
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
    gap: 8,
  },
  bookTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
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
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveBtn: {
    backgroundColor: '#10b981',
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
  },
  confirmReturnBtn: {
    backgroundColor: '#8b5cf6',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
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
    textAlign: 'center',
  },

  // =========================================================================
  // STYLES CHO THANH TÌM KIẾM & BỘ LỌC MODAL
  // =========================================================================
  searchBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: '#1e293b',
    gap: 10,
    alignItems: 'center',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155',
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 14,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  filterToggleBtn: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    position: 'relative',
  },
  filterToggleBtnActive: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  filterToggleIcon: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
  },
  filterActiveDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  closeBtn: {
    fontSize: 18,
    color: '#94a3b8',
    padding: 4,
  },
  fieldLabel: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 14,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateCol: {
    flex: 1,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  modalResetBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  modalResetBtnText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  modalApplyBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalApplyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
