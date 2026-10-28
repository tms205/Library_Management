import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  getBooksApi,
  createBookApi,
  updateBookApi,
  deleteBookApi,
} from '../api/bookApi';
import { borrowBooksApi } from '../api/borrowApi';

export default function BooksScreen() {
  const { userInfo } = useAuth();
  const canManageBooks =
    Boolean(
      userInfo?.isAdminOrStaff ||
      userInfo?.role === 'ADMIN' ||
      (Array.isArray(userInfo?.permissions) && userInfo?.permissions.includes('BOOK_CREATE')),
    );

  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [borrowingId, setBorrowingId] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);

  // Add/Edit Book Modal State
  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [bookId, setBookId] = useState(null);
  const [bookTitle, setBookTitle] = useState('');
  const [bookIsbn, setBookIsbn] = useState('');
  const [bookQuantity, setBookQuantity] = useState('');
  const [bookPublishedDate, setBookPublishedDate] = useState('');
  const [bookImage, setBookImage] = useState('');
  const [savingBook, setSavingBook] = useState(false);

  // Filter Modal State
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterAuthor, setFilterAuthor] = useState('');
  const [filterIsbn, setFilterIsbn] = useState('');
  const [filterStock, setFilterStock] = useState('ALL'); // 'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK'
  const [filterSortBy, setFilterSortBy] = useState('id'); // 'id' | 'title' | 'quantity' | 'publishedDate'
  const [filterDirection, setFilterDirection] = useState('desc'); // 'desc' | 'asc'

  const [appliedFilters, setAppliedFilters] = useState({
    author: '',
    isbn: '',
    stock: 'ALL',
    sortBy: 'id',
    direction: 'desc',
  });

  const hasActiveFilters = Boolean(
    appliedFilters.author ||
    appliedFilters.isbn ||
    appliedFilters.stock !== 'ALL' ||
    appliedFilters.sortBy !== 'id' ||
    appliedFilters.direction !== 'desc',
  );

  // =========================================================================
  // HÀM LẤY DANH SÁCH SÁCH TỪ BACKEND (HỖ TRỢ PHÂN TRANG INFINITE SCROLL & BỘ LỌC)
  // - pageIndex = 0: tải trang đầu tiên (khi mở màn hình, tìm kiếm, hoặc pull-to-refresh)
  // - pageIndex > 0: tải trang tiếp theo khi người dùng cuộn xuống đáy FlatList (load more)
  // =========================================================================
  const fetchBooks = useCallback(
    async (pageIndex = 0, isRefresh = false, activeFilters = appliedFilters) => {
      try {
        if (isRefresh) setRefreshing(true);
        else if (pageIndex === 0) setLoading(true);

        // Map các tiêu chí lọc sang params cho Spring Boot Criteria API (/api/books/search)
        const params = {
          title: search.trim() || undefined,
          isbn: activeFilters.isbn?.trim() || undefined,
          author: activeFilters.author?.trim() || undefined,
          page: pageIndex,
          size: 10,
          sortBy: activeFilters.sortBy || 'id',
          direction: activeFilters.direction || 'desc',
        };

        // Chuyển đổi trạng thái kho hàng sang boolean inStock cho backend xử lý
        if (activeFilters.stock === 'IN_STOCK') params.inStock = true;
        if (activeFilters.stock === 'OUT_OF_STOCK') params.inStock = false;

        const data = await getBooksApi(params);

        const items = data.content || [];
        // Nếu trang 0 thì ghi đè danh sách mới, nếu trang > 0 thì nối thêm vào danh sách cũ
        if (pageIndex === 0) setBooks(items);
        else setBooks((prev) => [...prev, ...items]);

        setPage(pageIndex);
        // data.last = true tức là backend báo đã hết trang, dừng không gọi fetch tiếp khi cuộn
        setHasMore(!data.last && items.length > 0);
      } catch (err) {
        console.log('Error fetching books:', err);
        Alert.alert(
          'Lỗi tải sách',
          err.response?.data?.message || err.message || 'Không thể tải danh sách sách!',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, appliedFilters],
  );

  useEffect(() => {
    fetchBooks(0);
  }, [fetchBooks]);

  // Áp dụng bộ lọc từ Modal: gom giá trị state tạm thành appliedFilters rồi gọi lại API từ trang 0
  const handleApplyFilter = () => {
    const nextFilters = {
      author: filterAuthor.trim(),
      isbn: filterIsbn.trim(),
      stock: filterStock,
      sortBy: filterSortBy,
      direction: filterDirection,
    };
    setAppliedFilters(nextFilters);
    setFilterModalVisible(false);
    fetchBooks(0, true, nextFilters);
  };

  // Đặt lại toàn bộ bộ lọc về mặc định (hiển thị tất cả, sort theo ID mới nhất)
  const handleResetFilter = () => {
    setFilterAuthor('');
    setFilterIsbn('');
    setFilterStock('ALL');
    setFilterSortBy('id');
    setFilterDirection('desc');

    const defaultFilters = {
      author: '',
      isbn: '',
      stock: 'ALL',
      sortBy: 'id',
      direction: 'desc',
    };
    setAppliedFilters(defaultFilters);
    setFilterModalVisible(false);
    fetchBooks(0, true, defaultFilters);
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setBookId(null);
    setBookTitle('');
    setBookIsbn('');
    setBookQuantity('');
    setBookPublishedDate(new Date().toISOString().split('T')[0]);
    setBookImage('');
    setBookModalVisible(true);
  };

  const handleOpenEdit = (book) => {
    setIsEditing(true);
    setBookId(book.id);
    setBookTitle(book.title || '');
    setBookIsbn(book.isbn || '');
    setBookQuantity(String(book.quantity ?? ''));
    setBookPublishedDate(book.publishedDate || '');
    setBookImage(book.image || '');
    setSelectedBook(null);
    setBookModalVisible(true);
  };

  const handleSaveBook = async () => {
    if (!bookTitle.trim() || !bookIsbn.trim() || !bookQuantity || !bookPublishedDate) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ các thông tin của cuốn sách!');
      return;
    }

    const qty = parseInt(bookQuantity, 10);
    if (isNaN(qty) || qty < 0) {
      Alert.alert('Lỗi', 'Số lượng sách phải là số nguyên lớn hơn hoặc bằng 0!');
      return;
    }

    try {
      setSavingBook(true);
      const payload = {
        title: bookTitle.trim(),
        isbn: bookIsbn.trim(),
        quantity: qty,
        publishedDate: bookPublishedDate.trim(),
        image: bookImage.trim() || null,
      };

      if (isEditing) {
        await updateBookApi(bookId, payload);
        Alert.alert('Thành công', 'Đã cập nhật thông tin sách!');
      } else {
        await createBookApi(payload);
        Alert.alert('Thành công', 'Đã thêm sách mới vào thư viện!');
      }

      setBookModalVisible(false);
      fetchBooks(0, true);
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể lưu cuốn sách!');
    } finally {
      setSavingBook(false);
    }
  };

  const handleDeleteBook = (book) => {
    Alert.alert(
      'Xóa cuốn sách',
      `Bạn có chắc chắn muốn xóa cuốn sách:\n"${book.title}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBookApi(book.id);
              Alert.alert('Thành công', 'Đã xóa cuốn sách khỏi hệ thống!');
              setSelectedBook(null);
              fetchBooks(0, true);
            } catch (err) {
              Alert.alert('Lỗi', err.response?.data?.message || 'Không thể xóa sách này!');
            }
          },
        },
      ],
    );
  };

  const handleBorrow = (book) => {
    if (book.quantity <= 0) {
      Alert.alert('Hết sách', 'Hiện cuốn sách này đã hết trong kho.');
      return;
    }

    Alert.alert(
      'Xác nhận mượn sách',
      `Bạn có muốn gửi yêu cầu mượn cuốn sách:\n"${book.title}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Mượn ngay',
          onPress: async () => {
            try {
              setBorrowingId(book.id);
              const res = await borrowBooksApi(book.id);
              Alert.alert(
                'Thành công',
                res.message || 'Đã gửi yêu cầu mượn thành công! Vui lòng chờ thủ thư xác nhận.',
              );
              setSelectedBook(null);
              fetchBooks(0, true);
            } catch (err) {
              const msg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                'Mượn sách không thành công!';
              Alert.alert('Không thể mượn sách', msg);
            } finally {
              setBorrowingId(null);
            }
          },
        },
      ],
    );
  };

  // =========================================================================
  // GIAO DIỆN MỖI CUỐN SÁCH TRONG DANH SÁCH (CARD VIEW)
  // - Bên trái: Ảnh bìa sách (hoặc icon 📚 nếu chưa có ảnh)
  // - Bên phải: Tiêu đề, badge trạng thái kho, tác giả, ISBN, năm xuất bản
  // - Dưới cùng: Nút thao tác (Sửa/Xóa cho thủ thư/admin, Mượn ngay cho bạn đọc)
  // =========================================================================
  const renderBookItem = ({ item }) => {
    const isAvailable = item.quantity > 0;
    const authors =
      item.authorNames && item.authorNames.length > 0
        ? Array.from(item.authorNames).join(', ')
        : 'Chưa cập nhật';
    const isThisBorrowing = borrowingId === item.id;

    return (
      <TouchableOpacity
        style={styles.bookCard}
        activeOpacity={0.8}
        onPress={() => setSelectedBook(item)}
      >
        <View style={styles.cardContentRow}>
          {/* Ảnh bìa sách: tải từ URL cơ sở dữ liệu, nếu không có URL thì hiển thị emoji mặc định */}
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              style={styles.bookThumb}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.bookThumbFallback}>
              <Text style={styles.bookThumbFallbackText}>📚</Text>
            </View>
          )}

          <View style={styles.cardInfoCol}>
            <View style={styles.cardHeader}>
              <Text style={styles.bookTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <View
                style={[
                  styles.badge,
                  isAvailable ? styles.badgeSuccess : styles.badgeDanger,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    isAvailable ? styles.badgeTextSuccess : styles.badgeTextDanger,
                  ]}
                >
                  {isAvailable ? `Còn ${item.quantity}` : 'Hết hàng'}
                </Text>
              </View>
            </View>

            <Text style={styles.metaText} numberOfLines={1}>✍️ {authors}</Text>
            <Text style={styles.metaText} numberOfLines={1}>🏷️ ISBN: {item.isbn || 'N/A'}</Text>
            {item.publishedDate && (
              <Text style={styles.metaText} numberOfLines={1}>📅 {item.publishedDate}</Text>
            )}
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.detailLink}>Xem chi tiết ➔</Text>

          <View style={styles.btnRow}>
            {canManageBooks && (
              <>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => handleOpenEdit(item)}
                >
                  <Text style={styles.editBtnText}>✏️ Sửa</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteBook(item)}
                >
                  <Text style={styles.deleteBtnText}>🗑️</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={[
                styles.borrowBtn,
                (!isAvailable || isThisBorrowing) && styles.borrowBtnDisabled,
              ]}
              onPress={() => handleBorrow(item)}
              disabled={!isAvailable || isThisBorrowing}
            >
              {isThisBorrowing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.borrowBtnText}>
                  {isAvailable ? '📖 Mượn' : 'Hết'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tiêu đề sách..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => fetchBooks(0)}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={() => fetchBooks(0)}>
          <Text style={styles.searchBtnText}>Tìm</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterToggleBtn, hasActiveFilters && styles.filterToggleBtnActive]}
          onPress={() => setFilterModalVisible(true)}
        >
          <Text
            style={[
              styles.filterToggleBtnText,
              hasActiveFilters && styles.filterToggleBtnTextActive,
            ]}
          >
            ⚙️ {hasActiveFilters ? 'Lọc ●' : 'Lọc'}
          </Text>
        </TouchableOpacity>

        {canManageBooks && (
          <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
            <Text style={styles.addBtnText}>+ Thêm</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Active Filter Strip */}
      {hasActiveFilters && (
        <View style={styles.activeFilterStrip}>
          <Text style={styles.activeFilterStripText} numberOfLines={1}>
            Đang lọc: {appliedFilters.author ? `Tác giả: "${appliedFilters.author}" ` : ''}
            {appliedFilters.isbn ? `ISBN: "${appliedFilters.isbn}" ` : ''}
            {appliedFilters.stock !== 'ALL'
              ? appliedFilters.stock === 'IN_STOCK'
                ? '• Còn hàng '
                : '• Hết hàng '
              : ''}
            {appliedFilters.sortBy === 'title' ? '• Tên A-Z ' : ''}
            {appliedFilters.sortBy === 'quantity' ? '• SL nhiều ' : ''}
          </Text>
          <TouchableOpacity onPress={handleResetFilter}>
            <Text style={styles.clearFilterBtnText}>✕ Xóa lọc</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Book List */}
      {loading && books.length === 0 ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Đang tải danh mục sách...</Text>
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderBookItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchBooks(0, true)}
              tintColor="#818cf8"
            />
          }
          onEndReached={() => {
            if (hasMore && !loading && !refreshing) {
              fetchBooks(page + 1);
            }
          }}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>Không tìm thấy cuốn sách nào!</Text>
            </View>
          }
        />
      )}

      {/* Book Detail Modal */}
      {selectedBook && (
        <Modal
          visible={!!selectedBook}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedBook(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderTitle}>Chi tiết sách</Text>
                <TouchableOpacity onPress={() => setSelectedBook(null)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {selectedBook.image ? (
                <View style={styles.modalCoverWrap}>
                  <Image
                    source={{ uri: selectedBook.image }}
                    style={styles.modalBookCover}
                    resizeMode="cover"
                  />
                </View>
              ) : null}

              <Text style={styles.modalBookTitle}>{selectedBook.title}</Text>

              <View style={styles.modalMetaRow}>
                <Text style={styles.modalLabel}>Tác giả:</Text>
                <Text style={styles.modalValue}>
                  {selectedBook.authorNames && selectedBook.authorNames.length > 0
                    ? Array.from(selectedBook.authorNames).join(', ')
                    : 'Chưa cập nhật'}
                </Text>
              </View>

              <View style={styles.modalMetaRow}>
                <Text style={styles.modalLabel}>Mã ISBN:</Text>
                <Text style={styles.modalValue}>{selectedBook.isbn || 'N/A'}</Text>
              </View>

              <View style={styles.modalMetaRow}>
                <Text style={styles.modalLabel}>Ngày xuất bản:</Text>
                <Text style={styles.modalValue}>
                  {selectedBook.publishedDate || 'Chưa cập nhật'}
                </Text>
              </View>

              <View style={styles.modalMetaRow}>
                <Text style={styles.modalLabel}>Số lượng trong kho:</Text>
                <Text
                  style={[
                    styles.modalValue,
                    selectedBook.quantity > 0 ? styles.inStock : styles.outOfStock,
                  ]}
                >
                  {selectedBook.quantity > 0
                    ? `${selectedBook.quantity} cuốn sẵn sàng`
                    : 'Đã hết sách'}
                </Text>
              </View>

              <View style={styles.modalActionRow}>
                {canManageBooks && (
                  <TouchableOpacity
                    style={styles.modalEditBtn}
                    onPress={() => handleOpenEdit(selectedBook)}
                  >
                    <Text style={styles.modalEditBtnText}>✏️ Sửa sách</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.modalBorrowBtn,
                    selectedBook.quantity <= 0 && styles.borrowBtnDisabled,
                  ]}
                  disabled={selectedBook.quantity <= 0}
                  onPress={() => handleBorrow(selectedBook)}
                >
                  <Text style={styles.modalBorrowBtnText}>
                    {selectedBook.quantity > 0 ? '📖 Mượn sách' : 'Tạm hết'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Add / Edit Book Modal */}
      <Modal
        visible={bookModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBookModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderTitle}>
                  {isEditing ? '✏️ Sửa thông tin sách' : '📚 Thêm sách mới'}
                </Text>
                <TouchableOpacity onPress={() => setBookModalVisible(false)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.formLabel}>Tiêu đề sách *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Nhập tên sách..."
                placeholderTextColor="#94a3b8"
                value={bookTitle}
                onChangeText={setBookTitle}
              />

              <Text style={styles.formLabel}>Mã ISBN *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="978-3-16-148410-0"
                placeholderTextColor="#94a3b8"
                value={bookIsbn}
                onChangeText={setBookIsbn}
              />

              <Text style={styles.formLabel}>Link ảnh bìa (URL)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="https://images.unsplash.com/..."
                placeholderTextColor="#94a3b8"
                value={bookImage}
                onChangeText={setBookImage}
                autoCapitalize="none"
              />
              {bookImage.trim().length > 0 && (
                <View style={styles.previewContainer}>
                  <Image
                    source={{ uri: bookImage.trim() }}
                    style={styles.previewImg}
                    resizeMode="cover"
                  />
                  <Text style={styles.previewHint}>Xem trước ảnh bìa</Text>
                </View>
              )}

              <Text style={styles.formLabel}>Số lượng trong kho *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="10"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                value={bookQuantity}
                onChangeText={setBookQuantity}
              />

              <Text style={styles.formLabel}>Ngày xuất bản (YYYY-MM-DD) *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="2024-01-01"
                placeholderTextColor="#94a3b8"
                value={bookPublishedDate}
                onChangeText={setBookPublishedDate}
              />

              <TouchableOpacity
                style={[styles.saveBookBtn, savingBook && styles.borrowBtnDisabled]}
                onPress={handleSaveBook}
                disabled={savingBook}
              >
                {savingBook ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBookBtnText}>
                    {isEditing ? 'Lưu thay đổi' : 'Thêm sách vào kho'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderTitle}>⚙️ Bộ lọc tìm kiếm sách</Text>
                <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.formLabel}>Tác giả</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Nhập tên tác giả..."
                placeholderTextColor="#94a3b8"
                value={filterAuthor}
                onChangeText={setFilterAuthor}
              />

              <Text style={styles.formLabel}>Mã ISBN</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Nhập mã ISBN..."
                placeholderTextColor="#94a3b8"
                value={filterIsbn}
                onChangeText={setFilterIsbn}
              />

              <Text style={styles.formLabel}>Tình trạng sách trong kho</Text>
              <View style={styles.chipRow}>
                {[
                  { key: 'ALL', label: 'Tất cả' },
                  { key: 'IN_STOCK', label: 'Còn sách' },
                  { key: 'OUT_OF_STOCK', label: 'Hết hàng' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.chip,
                      filterStock === item.key && styles.chipActive,
                    ]}
                    onPress={() => setFilterStock(item.key)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        filterStock === item.key && styles.chipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>Sắp xếp danh sách</Text>
              <View style={styles.chipRow}>
                {[
                  { key: 'id-desc', label: 'Mới nhất', sortBy: 'id', dir: 'desc' },
                  { key: 'title-asc', label: 'Tên A → Z', sortBy: 'title', dir: 'asc' },
                  { key: 'title-desc', label: 'Tên Z → A', sortBy: 'title', dir: 'desc' },
                  { key: 'quantity-desc', label: 'SL nhiều nhất', sortBy: 'quantity', dir: 'desc' },
                ].map((item) => {
                  const isActive = filterSortBy === item.sortBy && filterDirection === item.dir;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[styles.chip, isActive && styles.chipActive]}
                      onPress={() => {
                        setFilterSortBy(item.sortBy);
                        setFilterDirection(item.dir);
                      }}
                    >
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.filterModalBtnRow}>
                <TouchableOpacity style={styles.resetFilterBtn} onPress={handleResetFilter}>
                  <Text style={styles.resetFilterBtnText}>✕ Đặt lại</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.applyFilterBtn} onPress={handleApplyFilter}>
                  <Text style={styles.applyFilterBtnText}>✓ Áp dụng</Text>
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
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  addBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  filterToggleBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 11,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterToggleBtnActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  filterToggleBtnText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 13,
  },
  filterToggleBtnTextActive: {
    color: '#a5b4fc',
    fontWeight: '700',
  },
  activeFilterStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1b4b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#312e81',
  },
  activeFilterStripText: {
    color: '#c7d2fe',
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  clearFilterBtnText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#6366f1',
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  filterModalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  resetFilterBtn: {
    flex: 1,
    paddingVertical: 13,
    backgroundColor: '#334155',
    borderRadius: 8,
    alignItems: 'center',
  },
  resetFilterBtnText: {
    color: '#cbd5e1',
    fontWeight: '600',
    fontSize: 14,
  },
  applyFilterBtn: {
    flex: 1,
    paddingVertical: 13,
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    alignItems: 'center',
  },
  applyFilterBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  listContent: {
    padding: 12,
    gap: 12,
  },
  bookCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardContentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bookThumb: {
    width: 70,
    height: 98,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  bookThumbFallback: {
    width: 70,
    height: 98,
    borderRadius: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookThumbFallbackText: {
    fontSize: 28,
  },
  cardInfoCol: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  bookTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  badgeDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextSuccess: {
    color: '#4ade80',
  },
  badgeTextDanger: {
    color: '#f87171',
  },
  metaText: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 4,
  },
  cardFooter: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLink: {
    color: '#818cf8',
    fontSize: 13,
    fontWeight: '500',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
  },
  editBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteBtnText: {
    fontSize: 14,
  },
  borrowBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
  },
  borrowBtnDisabled: {
    backgroundColor: '#475569',
    opacity: 0.6,
  },
  borrowBtnText: {
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalHeaderTitle: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '600',
  },
  modalCloseText: {
    fontSize: 20,
    color: '#cbd5e1',
    padding: 4,
  },
  modalBookTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 16,
  },
  modalMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  modalValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '500',
    maxWidth: '65%',
    textAlign: 'right',
  },
  inStock: {
    color: '#4ade80',
    fontWeight: '600',
  },
  outOfStock: {
    color: '#f87171',
    fontWeight: '600',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalEditBtn: {
    flex: 1,
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalEditBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  modalBorrowBtn: {
    flex: 1,
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBorrowBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  formLabel: {
    fontSize: 13,
    color: '#cbd5e1',
    marginBottom: 6,
    fontWeight: '500',
  },
  formInput: {
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
  modalCoverWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalBookCover: {
    width: 130,
    height: 180,
    borderRadius: 10,
    backgroundColor: '#334155',
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewImg: {
    width: 45,
    height: 60,
    borderRadius: 4,
    backgroundColor: '#334155',
  },
  previewHint: {
    color: '#94a3b8',
    fontSize: 12,
  },
  saveBookBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBookBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
