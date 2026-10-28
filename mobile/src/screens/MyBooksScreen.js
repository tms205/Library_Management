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
} from 'react-native';
import { getMyBorrowedBooksApi, requestReturnApi } from '../api/borrowApi';

const STATUS_MAP = {
  PENDING: { label: 'Chờ duyệt', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  BORROWED: { label: 'Đang mượn', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  RETURN_PENDING: { label: 'Chờ xác nhận trả', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  RETURNED: { label: 'Đã hoàn trả', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' },
  REJECTED: { label: 'Bị từ chối', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
};

const FILTER_TABS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'BORROWED', label: 'Đang mượn' },
  { key: 'PENDING', label: 'Chờ duyệt' },
  { key: 'RETURNED', label: 'Đã trả' },
];

export default function MyBooksScreen() {
  const [records, setRecords] = useState([]);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [returningId, setReturningId] = useState(null);

  const fetchRecords = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await getMyBorrowedBooksApi();
      setRecords(data || []);
    } catch (err) {
      console.log('Error fetching my borrowed books:', err);
      Alert.alert(
        'Lỗi tải dữ liệu',
        err.response?.data?.message || err.message || 'Không thể tải danh sách sách đang mượn!',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleReturn = (item) => {
    Alert.alert(
      'Yêu cầu trả sách',
      `Bạn muốn gửi yêu cầu trả cuốn sách:\n"${item.bookTitle}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận trả',
          onPress: async () => {
            try {
              setReturningId(item.id);
              await requestReturnApi(item.id);
              Alert.alert(
                'Thành công',
                'Đã gửi yêu cầu trả sách! Vui lòng gửi lại sách cho thủ thư để xác nhận.',
              );
              fetchRecords(true);
            } catch (err) {
              const msg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                'Không thể gửi yêu cầu trả sách!';
              Alert.alert('Lỗi', msg);
            } finally {
              setReturningId(null);
            }
          },
        },
      ],
    );
  };

  const filteredRecords = records.filter((rec) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'BORROWED') return rec.status === 'BORROWED';
    if (activeFilter === 'PENDING') return rec.status === 'PENDING';
    if (activeFilter === 'RETURNED') return rec.status === 'RETURNED' || rec.status === 'RETURN_PENDING';
    return true;
  });

  const renderItem = ({ item }) => {
    const statusInfo = STATUS_MAP[item.status] || {
      label: item.status,
      color: '#94a3b8',
      bg: 'rgba(148, 163, 184, 0.15)',
    };
    const canReturn = item.status === 'BORROWED';
    const isThisReturning = returningId === item.id;

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

        <Text style={styles.dateText}>📅 Ngày mượn: {item.borrowDate || 'N/A'}</Text>
        <Text style={styles.dateText}>
          {item.status === 'RETURNED' ? '✅ Ngày trả: ' : '⏳ Hạn trả: '}
          {item.returnDate || 'Chưa xác định'}
        </Text>

        {canReturn && (
          <View style={styles.cardFooter}>
            <TouchableOpacity
              style={[styles.returnBtn, isThisReturning && styles.btnDisabled]}
              onPress={() => handleReturn(item)}
              disabled={isThisReturning}
            >
              {isThisReturning ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.returnBtnText}>🔄 Yêu cầu trả sách</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => setActiveFilter(tab.key)}
            >
              <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && records.length === 0 ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Đang tải danh sách mượn sách...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
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
              <Text style={styles.emptyIcon}>📖</Text>
              <Text style={styles.emptyText}>
                {activeFilter === 'ALL'
                  ? 'Bạn chưa mượn cuốn sách nào!'
                  : 'Không có sách ở mục này!'}
              </Text>
              <Text style={styles.emptySubText}>
                Hãy qua tab "Sách" để tìm và mượn những cuốn bạn yêu thích nhé.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
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
  dateText: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 4,
  },
  cardFooter: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
    alignItems: 'flex-end',
  },
  returnBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 130,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  returnBtnText: {
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
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubText: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
  },
});
