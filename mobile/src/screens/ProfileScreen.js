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
    if (!newEmail.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ email mới!');
      return;
    }

    try {
      setChangingEmail(true);
      await requestChangeEmailApi(newEmail.trim());
      Alert.alert('Thành công', `Mã xác nhận 6 chữ số đã được gửi tới ${newEmail.trim()}`);
      setEmailStep(2);
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể gửi mã xác nhận đổi email!');
    } finally {
      setChangingEmail(false);
    }
  };

  const handleConfirmChangeEmail = async () => {
    if (!emailCode.trim() || emailCode.trim().length !== 6) {
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
          <Text style={styles.sectionTitle}>⚙️ Cấu hình Hệ thống (Admin)</Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
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
          </View>
        </View>
      </Modal>

      {/* Modal Change Email */}
      <Modal
        visible={emailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEmailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
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
                    <Text style={styles.modalSubmitText}>Gửi mã xác nhận tới Email mới</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.stepHint}>
                  Mã 6 chữ số đã gửi tới <Text style={{ color: '#818cf8' }}>{newEmail}</Text>. Vui lòng kiểm tra hộp thư.
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
          </View>
        </View>
      </Modal>
    </ScrollView>
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
});
