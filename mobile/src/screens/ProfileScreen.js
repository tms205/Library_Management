import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getBaseUrl, setBaseUrl, DEFAULT_BASE_URL } from '../config';
import {
  changePasswordApi,
  requestChangeEmailApi,
  confirmChangeEmailApi,
} from '../api/authApi';
import {
  getSystemConfigApi,
  updateMaintenanceApi,
} from '../api/systemConfigApi';
import {
  getPermissionGroupsApi,
  getAllPermissionsApi,
  createPermissionGroupApi,
  updatePermissionGroupApi,
  deletePermissionGroupApi,
  searchAccountsForRolesApi,
  updateAccountRoleApi,
} from '../api/roleApi';

export default function ProfileScreen() {
  const { userInfo, logout } = useAuth();
  const [serverUrl, setServerUrl] = useState(DEFAULT_BASE_URL);
  const [isEditingIp, setIsEditingIp] = useState(false);

  // Check Admin / Maintenance permission
  const canManageMaintenance =
    userInfo?.role === 'ADMIN' ||
    (Array.isArray(userInfo?.permissions) && userInfo?.permissions.includes('SYSTEM_MAINTENANCE'));

  // Maintenance state
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [updatingMaintenance, setUpdatingMaintenance] = useState(false);

  // Modal đổi mật khẩu
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  // Modal đổi email
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [emailStep, setEmailStep] = useState(1); // 1: input new email, 2: input otp code
  const [newEmail, setNewEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);

  // Modal quản lý phân quyền (Admin)
  const [rolesModalVisible, setRolesModalVisible] = useState(false);
  const [roleTab, setRoleTab] = useState('accounts'); // 'accounts' | 'groups'
  const [roleGroups, setRoleGroups] = useState([]);
  const [roleAccounts, setRoleAccounts] = useState([]);
  const [roleSearch, setRoleSearch] = useState('');
  const [roleLoading, setRoleLoading] = useState(false);
  const [selectedRoleAccount, setSelectedRoleAccount] = useState(null);
  const [editRoleModalVisible, setEditRoleModalVisible] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [roleSaving, setRoleSaving] = useState(false);

  // Modal Tạo / Chỉnh sửa nhóm quyền (Dynamic RBAC)
  const [allPermissions, setAllPermissions] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [createGroupModalVisible, setCreateGroupModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState([]);
  const [savingGroup, setSavingGroup] = useState(false);

  useEffect(() => {
    getBaseUrl().then(setServerUrl);

    if (canManageMaintenance) {
      getSystemConfigApi()
        .then((config) => {
          if (config && typeof config.maintenanceMode === 'boolean') {
            setMaintenanceMode(config.maintenanceMode);
          }
        })
        .catch((err) => console.log('Error fetching system config:', err));
    }
  }, [canManageMaintenance]);

  const handleSaveIp = async () => {
    await setBaseUrl(serverUrl);
    Alert.alert('Thành công', 'Đã cập nhật IP máy chủ Backend!');
    setIsEditingIp(false);
  };

  const handleResetIp = async () => {
    await setBaseUrl(DEFAULT_BASE_URL);
    setServerUrl(DEFAULT_BASE_URL);
    Alert.alert('Thành công', 'Đã đặt lại IP mặc định!');
    setIsEditingIp(false);
  };

  // ==========================
  // XỬ LÝ ĐỔI MẬT KHẨU
  // ==========================
  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ thông tin mật khẩu!');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }
    if (oldPassword === newPassword) {
      Alert.alert('Lỗi', 'Mật khẩu mới không được trùng với mật khẩu hiện tại!');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp!');
      return;
    }

    try {
      setChangingPass(true);
      await changePasswordApi(oldPassword, newPassword);
      Alert.alert('Thành công', 'Đổi mật khẩu thành công!');
      setPasswordModalVisible(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Không thể đổi mật khẩu!';
      Alert.alert('Lỗi', msg);
    } finally {
      setChangingPass(false);
    }
  };

  // ==========================
  // XỬ LÝ ĐỔI EMAIL
  // ==========================
  const handleRequestEmailCode = async () => {
    const trimmed = newEmail.trim();
    if (!trimmed) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ email mới!');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      Alert.alert('Lỗi định dạng', 'Email không đúng định dạng (Ví dụ: user@example.com)!');
      return;
    }

    if (userInfo?.email && trimmed.toLowerCase() === userInfo.email.toLowerCase()) {
      Alert.alert('Lỗi', 'Email mới không được trùng với email hiện tại!');
      return;
    }

    try {
      setChangingEmail(true);
      await requestChangeEmailApi(trimmed);
      Alert.alert(
        'Thành công',
        `Mã xác nhận bảo mật 6 chữ số đã được gửi tới email hiện tại của bạn (${userInfo?.email || 'email hiện tại'}).`,
      );
      setEmailStep(2);
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể gửi mã xác nhận đổi email!');
    } finally {
      setChangingEmail(false);
    }
  };

  const handleConfirmChangeEmail = async () => {
    const trimmedCode = emailCode.trim();
    if (!trimmedCode || !/^\d{6}$/.test(trimmedCode)) {
      Alert.alert('Lỗi', 'Mã xác nhận phải gồm đúng 6 chữ số!');
      return;
    }

    try {
      setChangingEmail(true);
      await confirmChangeEmailApi(emailCode.trim());
      Alert.alert(
        'Đổi Email thành công 🎉',
        'Email của bạn đã được thay đổi. Vui lòng đăng nhập lại bằng email mới!',
        [
          {
            text: 'Đăng nhập lại',
            onPress: () => {
              setEmailModalVisible(false);
              logout();
            },
          },
        ],
      );
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Xác nhận đổi email thất bại!');
    } finally {
      setChangingEmail(false);
    }
  };

  // ==========================
  // XỬ LÝ BẬT/TẮT BẢO TRÌ
  // ==========================
  const handleToggleMaintenance = async (value) => {
    Alert.alert(
      value ? 'Bật chế độ bảo trì?' : 'Tắt chế độ bảo trì?',
      value
        ? 'Khi bật bảo trì, tất cả người dùng không phải Quản trị viên sẽ bị chặn gọi API vào hệ thống.'
        : 'Hệ thống sẽ mở lại bình thường cho toàn bộ người dùng.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            try {
              setUpdatingMaintenance(true);
              const res = await updateMaintenanceApi(value);
              setMaintenanceMode(res.maintenanceMode ?? value);
              Alert.alert('Thành công', value ? 'Đã BẬT bảo trì hệ thống!' : 'Đã TẮT bảo trì hệ thống!');
            } catch (err) {
              Alert.alert('Lỗi', err.response?.data?.message || 'Không thể cập nhật trạng thái bảo trì!');
            } finally {
              setUpdatingMaintenance(false);
            }
          },
        },
      ],
    );
  };

  // ==========================
  // XỬ LÝ PHÂN QUYỀN TÀI KHOẢN (ADMIN)
  // ==========================
  const fetchRoleAccounts = async (keyword = roleSearch) => {
    try {
      setRoleLoading(true);
      const data = await searchAccountsForRolesApi({
        search: keyword.trim() || undefined,
        page: 0,
        size: 50,
      });
      setRoleAccounts(data.content || []);
    } catch (err) {
      console.log('Error loading accounts for role:', err);
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể tải danh sách tài khoản!');
    } finally {
      setRoleLoading(false);
    }
  };

  const fetchAllPermissions = async () => {
    try {
      setLoadingPermissions(true);
      const perms = await getAllPermissionsApi();
      setAllPermissions(perms || []);
      return perms || [];
    } catch (err) {
      console.log('Error fetching permissions:', err);
      return [];
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleOpenRolesModal = async (initialTab = 'accounts') => {
    setRoleTab(initialTab);
    setRolesModalVisible(true);
    try {
      const [groups, perms] = await Promise.all([
        getPermissionGroupsApi(),
        allPermissions.length > 0 ? Promise.resolve(allPermissions) : getAllPermissionsApi(),
      ]);
      setRoleGroups(groups || []);
      if (allPermissions.length === 0 && perms) {
        setAllPermissions(perms);
      }
    } catch (err) {
      console.log('Error loading groups or permissions:', err);
    }
    fetchRoleAccounts('');
  };

  const handleOpenCreateGroup = async () => {
    setEditingGroup(null);
    setGroupName('');
    setGroupDesc('');
    setSelectedPermissionIds([]);
    setCreateGroupModalVisible(true);
    if (allPermissions.length === 0) {
      await fetchAllPermissions();
    }
  };

  const handleOpenEditGroup = async (group) => {
    setEditingGroup(group);
    setGroupName(group.name || '');
    setGroupDesc(group.description || '');

    let currentPerms = allPermissions;
    if (currentPerms.length === 0) {
      currentPerms = await fetchAllPermissions();
    }

    const ids = (currentPerms || [])
      .filter((p) => group.permissions?.includes(p.name))
      .map((p) => p.id);
    setSelectedPermissionIds(ids);
    setCreateGroupModalVisible(true);
  };

  const handleTogglePermission = (permId) => {
    setSelectedPermissionIds((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  const handleSelectAllPermissions = () => {
    setSelectedPermissionIds(allPermissions.map((p) => p.id));
  };

  const handleDeselectAllPermissions = () => {
    setSelectedPermissionIds([]);
  };

  const handleSaveGroup = async () => {
    const trimmedName = groupName.trim();
    if (!trimmedName) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên nhóm quyền!');
      return;
    }
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      Alert.alert('Lỗi', 'Tên nhóm quyền phải từ 2 đến 100 ký tự!');
      return;
    }

    try {
      setSavingGroup(true);
      if (editingGroup) {
        await updatePermissionGroupApi(editingGroup.id, {
          name: trimmedName,
          description: groupDesc.trim(),
          permissionIds: selectedPermissionIds,
        });
        Alert.alert('Thành công', `Đã cập nhật nhóm quyền "${trimmedName}" thành công!`);
      } else {
        await createPermissionGroupApi({
          name: trimmedName,
          description: groupDesc.trim(),
          permissionIds: selectedPermissionIds,
        });
        Alert.alert('Thành công', `Đã tạo mới nhóm quyền "${trimmedName}" thành công!`);
      }
      setCreateGroupModalVisible(false);
      const updatedGroups = await getPermissionGroupsApi();
      setRoleGroups(updatedGroups || []);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Không thể lưu nhóm quyền!';
      Alert.alert('Lỗi', msg);
    } finally {
      setSavingGroup(false);
    }
  };

  const handleDeleteGroup = (group) => {
    if (group.isDefault) {
      Alert.alert('Thông báo', 'Không thể xóa các nhóm quyền mặc định của hệ thống!');
      return;
    }
    if (group.accountCount > 0) {
      Alert.alert(
        'Không thể xóa',
        `Nhóm này đang được gán cho ${group.accountCount} tài khoản. Vui lòng chuyển các tài khoản sang nhóm khác trước khi xóa!`,
      );
      return;
    }

    Alert.alert(
      'Xác nhận xóa nhóm quyền',
      `Bạn có chắc chắn muốn xóa nhóm quyền "${group.name}" không? Hành động này không thể hoàn tác.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa ngay',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePermissionGroupApi(group.id);
              Alert.alert('Thành công', `Đã xóa nhóm quyền "${group.name}"!`);
              const updatedGroups = await getPermissionGroupsApi();
              setRoleGroups(updatedGroups || []);
            } catch (err) {
              Alert.alert('Lỗi', err.response?.data?.message || 'Không thể xóa nhóm quyền!');
            }
          },
        },
      ],
    );
  };

  const handleSelectAccountForRole = (acc) => {
    if (acc.accountId === 1 || acc.email?.toLowerCase() === 'admin') {
      Alert.alert('Thông báo', 'Không thể thay đổi quyền của tài khoản Quản trị viên tối cao (Admin)!');
      return;
    }
    if (userInfo?.email && acc.email?.toLowerCase() === userInfo.email.toLowerCase()) {
      Alert.alert('Thông báo', 'Bạn không thể tự thay đổi quyền của chính tài khoản mình đang đăng nhập!');
      return;
    }

    setSelectedRoleAccount(acc);
    setSelectedGroupId(acc.groupId || (roleGroups[0]?.id ?? null));
    setEditRoleModalVisible(true);
  };

  const handleSaveRoleChange = async () => {
    if (!selectedRoleAccount || !selectedGroupId) return;

    try {
      setRoleSaving(true);
      await updateAccountRoleApi(selectedRoleAccount.accountId, selectedGroupId);
      const targetGroup = roleGroups.find((g) => g.id === selectedGroupId);
      Alert.alert('Thành công', `Đã cập nhật nhóm quyền cho "${selectedRoleAccount.email}" thành "${targetGroup?.name || 'Nhóm mới'}"!`);
      setEditRoleModalVisible(false);
      fetchRoleAccounts(roleSearch);
    } catch (err) {
      console.log('Error updating role:', err);
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể cập nhật quyền cho tài khoản này!');
    } finally {
      setRoleSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Xác nhận đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  const email = userInfo?.sub || userInfo?.email || 'Người dùng';
  const role = userInfo?.role || 'USER';
  const initial = email.charAt(0).toUpperCase();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={true}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.userEmail}>{email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {role === 'ADMIN' ? '👑 Quản trị viên' : role === 'STAFF' ? '📋 Thủ thư' : '📖 Độc giả'}
          </Text>
        </View>
      </View>

      {/* Security Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tài khoản & Bảo mật</Text>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => setPasswordModalVisible(true)}
        >
          <View style={styles.actionRowLeft}>
            <Text style={styles.actionIcon}>🔑</Text>
            <Text style={styles.actionLabel}>Đổi mật khẩu</Text>
          </View>
          <Text style={styles.arrowText}>➔</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => {
            setEmailStep(1);
            setNewEmail('');
            setEmailCode('');
            setEmailModalVisible(true);
          }}
        >
          <View style={styles.actionRowLeft}>
            <Text style={styles.actionIcon}>✉️</Text>
            <Text style={styles.actionLabel}>Đổi địa chỉ Email</Text>
          </View>
          <Text style={styles.arrowText}>➔</Text>
        </TouchableOpacity>
      </View>

      {/* Admin Maintenance Section */}
      {canManageMaintenance && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Quản trị Hệ thống (Admin)</Text>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => handleOpenRolesModal('accounts')}
          >
            <View style={styles.actionRowLeft}>
              <Text style={styles.actionIcon}>👥</Text>
              <Text style={styles.actionLabel}>Phân quyền tài khoản</Text>
            </View>
            <Text style={styles.arrowText}>➔</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => handleOpenRolesModal('groups')}
          >
            <View style={styles.actionRowLeft}>
              <Text style={styles.actionIcon}>🛡️</Text>
              <Text style={styles.actionLabel}>Quản lý & Tạo nhóm quyền</Text>
            </View>
            <Text style={styles.arrowText}>➔</Text>
          </TouchableOpacity>
          <View style={styles.maintenanceRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.actionLabel}>Chế độ bảo trì hệ thống</Text>
              <Text style={styles.maintenanceSubtext}>
                {maintenanceMode
                  ? '⚠️ ĐANG BẬT BẢO TRÌ (Chỉ Admin mới có thể truy cập)'
                  : 'Hệ thống đang hoạt động bình thường'}
              </Text>
            </View>
            {updatingMaintenance ? (
              <ActivityIndicator size="small" color="#4f46e5" />
            ) : (
              <Switch
                value={maintenanceMode}
                onValueChange={handleToggleMaintenance}
                trackColor={{ false: '#334155', true: '#ef4444' }}
                thumbColor={maintenanceMode ? '#f8fafc' : '#94a3b8'}
              />
            )}
          </View>
        </View>
      )}

      {/* App Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin ứng dụng</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Phiên bản</Text>
          <Text style={styles.rowValue}>1.0.0 (Full Mobile Suite)</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Nền tảng</Text>
          <Text style={styles.rowValue}>React Native / Expo</Text>
        </View>
      </View>

      {/* Server IP Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Cấu hình Máy chủ Backend</Text>
          <TouchableOpacity onPress={() => setIsEditingIp(!isEditingIp)}>
            <Text style={styles.editBtnText}>{isEditingIp ? 'Đóng' : 'Thay đổi'}</Text>
          </TouchableOpacity>
        </View>

        {isEditingIp ? (
          <View style={styles.editIpBox}>
            <Text style={styles.editIpHint}>
              Nhập IP máy tính đang chạy Spring Boot (cùng Wi-Fi):
            </Text>
            <TextInput
              style={styles.ipInput}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://192.168.x.x:8080"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
            />
            <View style={styles.ipBtnRow}>
              <TouchableOpacity style={styles.saveIpBtn} onPress={handleSaveIp}>
                <Text style={styles.saveIpText}>Lưu IP</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resetIpBtn} onPress={handleResetIp}>
                <Text style={styles.resetIpText}>Mặc định</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>API Base URL</Text>
            <Text style={styles.rowValue} numberOfLines={1}>
              {serverUrl}
            </Text>
          </View>
        )}
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 Đăng xuất</Text>
      </TouchableOpacity>

      {/* Modal Change Password */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPasswordModalVisible(false)}
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
                contentContainerStyle={{ paddingBottom: 40 }}
                automaticallyAdjustKeyboardInsets={true}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>🔑 Đổi mật khẩu</Text>
                  <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Mật khẩu hiện tại</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  value={oldPassword}
                  onChangeText={setOldPassword}
                />

                <Text style={styles.inputLabel}>Mật khẩu mới (tối thiểu 6 ký tự)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />

                <Text style={styles.inputLabel}>Xác nhận mật khẩu mới</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, changingPass && styles.btnDisabled]}
                  onPress={handleChangePassword}
                  disabled={changingPass}
                >
                  {changingPass ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Lưu mật khẩu mới</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Change Email */}
      <Modal
        visible={emailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEmailModalVisible(false)}
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
                contentContainerStyle={{ paddingBottom: 40 }}
                automaticallyAdjustKeyboardInsets={true}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>✉️ Đổi địa chỉ Email</Text>
                  <TouchableOpacity onPress={() => setEmailModalVisible(false)}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>

                {emailStep === 1 ? (
                  <>
                    <Text style={styles.inputLabel}>Địa chỉ Email mới *</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="newemail@gmail.com"
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={newEmail}
                      onChangeText={setNewEmail}
                    />

                    <TouchableOpacity
                      style={[styles.modalSubmitBtn, changingEmail && styles.btnDisabled]}
                      onPress={handleRequestEmailCode}
                      disabled={changingEmail}
                    >
                      {changingEmail ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.modalSubmitText}>Gửi mã xác nhận về Email hiện tại</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.stepHint}>
                      Mã 6 chữ số đã được gửi tới email hiện tại <Text style={{ color: '#818cf8' }}>{userInfo?.email}</Text>. Vui lòng kiểm tra hộp thư để xác nhận đổi sang <Text style={{ color: '#38bdf8' }}>{newEmail}</Text>.
                    </Text>

                    <Text style={styles.inputLabel}>Mã xác nhận (6 chữ số) *</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="123456"
                      placeholderTextColor="#94a3b8"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={emailCode}
                      onChangeText={setEmailCode}
                    />

                    <TouchableOpacity
                      style={[styles.modalSubmitBtn, changingEmail && styles.btnDisabled]}
                      onPress={handleConfirmChangeEmail}
                      disabled={changingEmail}
                    >
                      {changingEmail ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.modalSubmitText}>Xác nhận đổi Email</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ marginTop: 12, alignItems: 'center' }}
                      onPress={() => setEmailStep(1)}
                    >
                      <Text style={{ color: '#38bdf8', fontSize: 13 }}>← Đổi lại Email khác</Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Quản lý phân quyền (Admin) */}
      <Modal
        visible={rolesModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRolesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '92%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🛡️ Quản lý phân quyền</Text>
              <TouchableOpacity onPress={() => setRolesModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Segmented Tab Row */}
            <View style={styles.segmentTabRow}>
              <TouchableOpacity
                style={[styles.segmentTabBtn, roleTab === 'accounts' && styles.segmentTabBtnActive]}
                onPress={() => setRoleTab('accounts')}
              >
                <Text style={[styles.segmentTabBtnText, roleTab === 'accounts' && styles.segmentTabBtnTextActive]}>
                  👥 Tài khoản
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentTabBtn, roleTab === 'groups' && styles.segmentTabBtnActive]}
                onPress={() => {
                  setRoleTab('groups');
                  if (allPermissions.length === 0) fetchAllPermissions();
                }}
              >
                <Text style={[styles.segmentTabBtnText, roleTab === 'groups' && styles.segmentTabBtnTextActive]}>
                  🛡️ Nhóm quyền ({roleGroups.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* TAB 1: PHÂN QUYỀN TÀI KHOẢN */}
            {roleTab === 'accounts' && (
              <>
                {/* Tìm kiếm tài khoản */}
                <View style={styles.roleSearchRow}>
                  <TextInput
                    style={styles.roleSearchInput}
                    placeholder="Tìm email..."
                    placeholderTextColor="#94a3b8"
                    value={roleSearch}
                    onChangeText={setRoleSearch}
                    onSubmitEditing={() => fetchRoleAccounts(roleSearch)}
                  />
                  <TouchableOpacity
                    style={styles.roleSearchBtn}
                    onPress={() => fetchRoleAccounts(roleSearch)}
                  >
                    <Text style={styles.roleSearchBtnText}>Tìm</Text>
                  </TouchableOpacity>
                </View>

                {roleLoading ? (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#4f46e5" />
                    <Text style={{ color: '#94a3b8', marginTop: 8 }}>Đang tải tài khoản...</Text>
                  </View>
                ) : (
                  <ScrollView style={{ maxHeight: 380 }}>
                    {roleAccounts.length === 0 ? (
                      <Text style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>
                        Không tìm thấy tài khoản nào.
                      </Text>
                    ) : (
                      roleAccounts.map((acc) => {
                        const isRootAdmin = acc.accountId === 1 || acc.email?.toLowerCase() === 'admin';
                        const isSelf = userInfo?.email && acc.email?.toLowerCase() === userInfo.email.toLowerCase();

                        return (
                          <View key={acc.accountId} style={styles.roleAccountCard}>
                            <View style={styles.roleAccountHeader}>
                              <View style={{ flex: 1, paddingRight: 8 }}>
                                <Text style={styles.roleAccountEmail}>{acc.email}</Text>
                                <Text style={styles.roleAccountName}>
                                  👤 {acc.fullName || 'Chưa liên kết hồ sơ'}
                                </Text>
                              </View>
                              <View>
                                {acc.groupName === 'ADMIN_GROUP' && (
                                  <View style={[styles.groupBadge, styles.groupBadgeAdmin]}>
                                    <Text style={styles.groupBadgeAdminText}>👑 Admin</Text>
                                  </View>
                                )}
                                {acc.groupName === 'STAFF_GROUP' && (
                                  <View style={[styles.groupBadge, styles.groupBadgeStaff]}>
                                    <Text style={styles.groupBadgeStaffText}>🧑‍💼 Thủ thư</Text>
                                  </View>
                                )}
                                {acc.groupName === 'USER_GROUP' && (
                                  <View style={[styles.groupBadge, styles.groupBadgeUser]}>
                                    <Text style={styles.groupBadgeUserText}>📖 Độc giả</Text>
                                  </View>
                                )}
                                {acc.groupName !== 'ADMIN_GROUP' &&
                                  acc.groupName !== 'STAFF_GROUP' &&
                                  acc.groupName !== 'USER_GROUP' && (
                                    <View style={[styles.groupBadge, styles.groupBadgeOther]}>
                                      <Text style={styles.groupBadgeOtherText}>{acc.groupName}</Text>
                                    </View>
                                  )}
                              </View>
                            </View>

                            <View style={styles.roleAccountFooter}>
                              {isRootAdmin ? (
                                <Text style={styles.protectedText}>🔒 Quản trị tối cao</Text>
                              ) : isSelf ? (
                                <Text style={styles.protectedText}>🔒 Tài khoản của bạn</Text>
                              ) : (
                                <TouchableOpacity
                                  style={styles.changeRoleBtn}
                                  onPress={() => handleSelectAccountForRole(acc)}
                                >
                                  <Text style={styles.changeRoleBtnText}>⚙️ Đổi vai trò</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        );
                      })
                    )}
                  </ScrollView>
                )}
              </>
            )}

            {/* TAB 2: QUẢN LÝ NHÓM QUYỀN (DYNAMIC RBAC) */}
            {roleTab === 'groups' && (
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {/* Nút Tạo nhóm quyền mới */}
                <TouchableOpacity
                  style={styles.createGroupBtn}
                  onPress={handleOpenCreateGroup}
                >
                  <Text style={styles.createGroupBtnText}>➕ Tạo nhóm quyền mới</Text>
                </TouchableOpacity>

                {roleGroups.length === 0 ? (
                  <Text style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>
                    Chưa có nhóm quyền nào.
                  </Text>
                ) : (
                  roleGroups.map((group) => (
                    <View key={group.id} style={styles.groupCard}>
                      <View style={styles.groupCardHeader}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.groupCardName}>{group.name}</Text>
                          <Text style={styles.groupCardDesc}>
                            {group.description || 'Chưa có mô tả cho nhóm này'}
                          </Text>
                        </View>
                        <View style={[styles.groupDefaultBadge, group.isDefault ? styles.badgeDefault : styles.badgeCustom]}>
                          <Text style={[styles.groupDefaultBadgeText, group.isDefault ? styles.badgeDefaultText : styles.badgeCustomText]}>
                            {group.isDefault ? 'Mặc định' : 'Tùy chỉnh'}
                          </Text>
                        </View>
                      </View>

                      {/* Thông tin số lượng */}
                      <View style={styles.groupStatsRow}>
                        <Text style={styles.groupStatItem}>
                          👥 {group.accountCount || 0} tài khoản đang gán
                        </Text>
                        <Text style={styles.groupStatItem}>
                          🔑 {(group.permissions || []).length} quyền hạn
                        </Text>
                      </View>

                      {/* Danh sách quyền tóm tắt */}
                      <View style={styles.groupPermPillsWrapper}>
                        {(group.permissions || []).slice(0, 5).map((pName) => (
                          <View key={pName} style={styles.permChip}>
                            <Text style={styles.permChipText}>{pName}</Text>
                          </View>
                        ))}
                        {(group.permissions || []).length > 5 && (
                          <View style={[styles.permChip, { backgroundColor: '#334155' }]}>
                            <Text style={styles.permChipText}>+{(group.permissions.length - 5)} quyền nữa</Text>
                          </View>
                        )}
                      </View>

                      {/* Các nút thao tác */}
                      <View style={styles.groupCardActions}>
                        <TouchableOpacity
                          style={styles.editGroupBtn}
                          onPress={() => handleOpenEditGroup(group)}
                        >
                          <Text style={styles.editGroupBtnText}>✏️ Chỉnh sửa quyền</Text>
                        </TouchableOpacity>

                        {!group.isDefault && (
                          <TouchableOpacity
                            style={[
                              styles.deleteGroupBtn,
                              (group.accountCount > 0) && { opacity: 0.4 },
                            ]}
                            onPress={() => handleDeleteGroup(group)}
                          >
                            <Text style={styles.deleteGroupBtnText}>🗑️ Xóa</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Chọn nhóm quyền mới */}
      <Modal
        visible={editRoleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditRoleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚙️ Đổi vai trò</Text>
              <TouchableOpacity onPress={() => setEditRoleModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedRoleAccount && (
              <View style={styles.selectedAccountBox}>
                <Text style={styles.selectedAccountEmail}>{selectedRoleAccount.email}</Text>
                <Text style={styles.selectedAccountName}>
                  Độc giả: {selectedRoleAccount.fullName}
                </Text>
              </View>
            )}

            <Text style={[styles.inputLabel, { marginTop: 6 }]}>Chọn vai trò mới:</Text>

            {roleGroups.map((g) => {
              const isSelected = selectedGroupId === g.id;
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.roleOptionCard, isSelected && styles.roleOptionCardSelected]}
                  onPress={() => setSelectedGroupId(g.id)}
                >
                  <Text style={[styles.roleOptionTitle, isSelected && styles.roleOptionTitleSelected]}>
                    {g.name === 'ADMIN_GROUP' && '👑 Quản trị viên (Admin)'}
                    {g.name === 'STAFF_GROUP' && '🧑‍💼 Thủ thư (Staff)'}
                    {g.name === 'USER_GROUP' && '📖 Độc giả (User)'}
                    {g.name !== 'ADMIN_GROUP' &&
                      g.name !== 'STAFF_GROUP' &&
                      g.name !== 'USER_GROUP' &&
                      g.name}
                  </Text>
                  <Text style={styles.roleOptionDesc}>{g.description || g.name}</Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.modalSubmitBtn, roleSaving && styles.btnDisabled]}
              onPress={handleSaveRoleChange}
              disabled={roleSaving}
            >
              {roleSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalSubmitText}>Lưu thay đổi</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Tạo mới hoặc Chỉnh sửa Nhóm quyền (Dynamic RBAC) */}
      <Modal
        visible={createGroupModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateGroupModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingOverlay}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '92%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingGroup ? '✏️ Sửa nhóm quyền' : '➕ Tạo nhóm quyền mới'}
                </Text>
                <TouchableOpacity onPress={() => setCreateGroupModalVisible(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
              >
                {/* Tên nhóm */}
                <Text style={styles.inputLabel}>Tên nhóm quyền *</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    editingGroup?.isDefault && { backgroundColor: '#1e293b', opacity: 0.7 },
                  ]}
                  placeholder="VD: THU_THU_KHO, QUAN_LY_DOC_GIA..."
                  placeholderTextColor="#94a3b8"
                  value={groupName}
                  onChangeText={setGroupName}
                  editable={!editingGroup?.isDefault}
                  autoCapitalize="characters"
                />
                {editingGroup?.isDefault && (
                  <Text style={{ fontSize: 11, color: '#f59e0b', marginTop: -8, marginBottom: 10 }}>
                    🔒 Không thể đổi tên nhóm quyền mặc định của hệ thống.
                  </Text>
                )}

                {/* Mô tả nhóm */}
                <Text style={styles.inputLabel}>Mô tả trách nhiệm & chức năng</Text>
                <TextInput
                  style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]}
                  placeholder="Mô tả chức năng phân quyền của nhóm này..."
                  placeholderTextColor="#94a3b8"
                  value={groupDesc}
                  onChangeText={setGroupDesc}
                  multiline
                />

                {/* Danh sách phân quyền */}
                <View style={styles.permListHeaderRow}>
                  <Text style={styles.inputLabel}>
                    Chọn các quyền được phép ({selectedPermissionIds.length}/{allPermissions.length}):
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={handleSelectAllPermissions}>
                      <Text style={styles.permQuickBtn}>Tất cả</Text>
                    </TouchableOpacity>
                    <Text style={{ color: '#64748b' }}>|</Text>
                    <TouchableOpacity onPress={handleDeselectAllPermissions}>
                      <Text style={styles.permQuickBtn}>Bỏ chọn</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {loadingPermissions ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#4f46e5" />
                    <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 6 }}>
                      Đang tải danh sách quyền...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.permChecklistContainer}>
                    {allPermissions.map((perm) => {
                      const isChecked = selectedPermissionIds.includes(perm.id);
                      return (
                        <TouchableOpacity
                          key={perm.id}
                          style={[styles.permCheckItem, isChecked && styles.permCheckItemSelected]}
                          onPress={() => handleTogglePermission(perm.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={{ fontSize: 16 }}>{isChecked ? '☑️' : '⬜'}</Text>
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={[styles.permCodeText, isChecked && styles.permCodeTextSelected]}>
                              {perm.name}
                            </Text>
                            <Text style={styles.permDescText}>
                              {perm.description || perm.name}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Nút Submit */}
                <TouchableOpacity
                  style={[styles.modalSubmitBtn, savingGroup && styles.btnDisabled]}
                  onPress={handleSaveGroup}
                  disabled={savingGroup}
                >
                  {savingGroup ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalSubmitText}>
                      {editingGroup ? 'Lưu thay đổi nhóm quyền' : 'Tạo nhóm quyền ngay'}
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 16,
    gap: 14,
  },
  profileCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
  },
  userEmail: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 6,
  },
  roleBadge: {
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: '#818cf8',
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionIcon: {
    fontSize: 18,
  },
  actionLabel: {
    fontSize: 14,
    color: '#f8fafc',
    fontWeight: '500',
  },
  arrowText: {
    color: '#64748b',
    fontSize: 14,
  },
  maintenanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  maintenanceSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  editBtnText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  rowLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  rowValue: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '500',
    maxWidth: '60%',
  },
  editIpBox: {
    marginTop: 6,
  },
  editIpHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  ipInput: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#475569',
    marginBottom: 10,
  },
  ipBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  saveIpBtn: {
    flex: 1,
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveIpText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  resetIpBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  resetIpText: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  logoutText: {
    color: '#f87171',
    fontSize: 15,
    fontWeight: '600',
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
  stepHint: {
    fontSize: 13,
    color: '#cbd5e1',
    marginBottom: 14,
  },
  inputLabel: {
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
  modalSubmitBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  modalSubmitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Role Management Styles
  roleSearchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  roleSearchInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#334155',
  },
  roleSearchBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleSearchBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  roleAccountCard: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  roleAccountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  roleAccountEmail: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  roleAccountName: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  groupBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  groupBadgeAdmin: {
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
  },
  groupBadgeAdminText: {
    color: '#c084fc',
    fontSize: 11,
    fontWeight: '700',
  },
  groupBadgeStaff: {
    backgroundColor: 'rgba(217, 119, 6, 0.25)',
  },
  groupBadgeStaffText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
  },
  groupBadgeUser: {
    backgroundColor: 'rgba(5, 150, 105, 0.25)',
  },
  groupBadgeUserText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
  },
  groupBadgeOther: {
    backgroundColor: '#334155',
  },
  groupBadgeOtherText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  roleAccountFooter: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 8,
  },
  protectedText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  changeRoleBtn: {
    backgroundColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  changeRoleBtnText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedAccountBox: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  selectedAccountEmail: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  selectedAccountName: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  roleOptionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  roleOptionCardSelected: {
    borderColor: '#4f46e5',
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
  },
  roleOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  roleOptionTitleSelected: {
    color: '#818cf8',
  },
  roleOptionDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  // Segmented Tabs
  segmentTabRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 3,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  segmentTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentTabBtnActive: {
    backgroundColor: '#4f46e5',
  },
  segmentTabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  segmentTabBtnTextActive: {
    color: '#fff',
  },
  // Permission Group Management
  createGroupBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  createGroupBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  groupCard: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  groupCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  groupCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
  groupCardDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 16,
  },
  groupDefaultBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeDefault: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  badgeDefaultText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeCustom: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  badgeCustomText: {
    color: '#c084fc',
    fontSize: 11,
    fontWeight: '700',
  },
  groupStatsRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  groupStatItem: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  groupPermPillsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 8,
  },
  permChip: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  permChipText: {
    fontSize: 10.5,
    color: '#a5b4fc',
    fontWeight: '600',
  },
  groupCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  editGroupBtn: {
    backgroundColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editGroupBtnText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteGroupBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  deleteGroupBtnText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
  },
  // Checklist permissions
  permListHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 6,
  },
  permQuickBtn: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: '600',
  },
  permChecklistContainer: {
    gap: 6,
    marginBottom: 14,
  },
  permCheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  permCheckItemSelected: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  permCodeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  permCodeTextSelected: {
    color: '#a5b4fc',
  },
  permDescText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
});
