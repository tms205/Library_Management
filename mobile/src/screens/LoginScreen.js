import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getBaseUrl, setBaseUrl, DEFAULT_BASE_URL } from '../config';
import { pingServer } from '../api/authApi';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [serverUrl, setServerUrl] = useState(DEFAULT_BASE_URL);
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState(null);

  useEffect(() => {
    getBaseUrl().then(setServerUrl);
  }, []);

  const handleTestConnection = async () => {
    setPinging(true);
    setPingResult(null);
    try {
      const ok = await pingServer(serverUrl.trim());
      if (ok) {
        setPingResult({ success: true, message: 'Kết nối máy chủ thành công!' });
      } else {
        setPingResult({
          success: false,
          message: 'Không phản hồi. Kiểm tra lại IP hoặc cùng Wi-Fi.',
        });
      }
    } catch {
      setPingResult({ success: false, message: 'Lỗi kết nối tới máy chủ.' });
    } finally {
      setPinging(false);
    }
  };

  // =========================================================================
  // XỬ LÝ LƯU CẤU HÌNH IP MÁY CHỦ (TỰ ĐỘNG BẮT VÀ SỬA LỖI NHẦM CỔNG)
  // Trong quá trình phát triển, dev hoặc người dùng hay copy nhầm:
  // - Cổng :5173 (của Vite React Web) -> Gọi vào sẽ bị 404 hoặc HTML rác
  // - Cổng :8081 (của Metro Bundler React Native) -> Gọi vào sẽ bị 404
  // Logic này tự động phát hiện và chuyển về cổng chuẩn :8080 của Spring Boot!
  // =========================================================================
  const handleSaveIp = async () => {
    let clean = serverUrl.trim();
    if (clean.includes(':5173')) {
      Alert.alert(
        'Sai cổng kết nối (:5173)',
        'Cổng 5173 là của Web Frontend Vite, không phải Backend API!\nCổng của Spring Boot là :8080. Ứng dụng sẽ tự đổi sang cổng :8080 cho bạn.',
      );
      clean = clean.replace(':5173', ':8080');
      setServerUrl(clean);
    } else if (clean.includes(':8081')) {
      Alert.alert(
        'Sai cổng kết nối (:8081)',
        'Cổng 8081 là của Expo Metro packager, không phải Backend!\nCổng của Spring Boot là :8080. Ứng dụng sẽ tự đổi sang cổng :8080 cho bạn.',
      );
      clean = clean.replace(':8081', ':8080');
      setServerUrl(clean);
    }

    await setBaseUrl(clean);
    Alert.alert('Thành công', `Đã lưu địa chỉ máy chủ: ${clean}`);
    setShowConfig(false);
  };

  // =========================================================================
  // ĐĂNG NHẬP VÀ PHÂN LOẠI MÃ LỖI HTTP RÕ RÀNG CHO NGƯỜI DÙNG MOBILE
  // - 404: Kết nối nhầm cổng/IP hoặc sai endpoint (/auth vs /api/auth)
  // - 401: Sai thông tin tài khoản hoặc mật khẩu
  // - 403: Tài khoản bị khóa / chưa kích hoạt email
  // =========================================================================
  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ Email và Mật khẩu');
      return;
    }

    try {
      setLoading(true);
      await login(email.trim(), password);
    } catch (err) {
      let msg = err.response?.data?.message || err.response?.data?.error;
      if (!msg) {
        if (err.response?.status === 404) {
          msg =
            'Lỗi 404: Không tìm thấy đường dẫn máy chủ!\nNguyên nhân có thể do cấu hình IP máy chủ chưa đúng hoặc đang kết nối nhầm cổng (Cần dùng cổng :8080 của Spring Boot, không phải :5173 của Web). Vui lòng nhấn "Cấu hình IP máy chủ" bên dưới để kiểm tra lại.';
        } else if (err.response?.status === 401) {
          msg = 'Email hoặc mật khẩu không chính xác!';
        } else if (err.response?.status === 403) {
          msg = 'Tài khoản chưa được kích hoạt hoặc không có quyền truy cập!';
        } else {
          msg = err.message || 'Không thể kết nối đến máy chủ!';
        }
      }
      Alert.alert('Đăng nhập thất bại', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.appIcon}>📚</Text>
          <Text style={styles.title}>Library Management</Text>
          <Text style={styles.subtitle}>Ứng dụng Di Động Quản Lý Thư Viện</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Đăng nhập</Text>

          <Text style={styles.label}>Email / Tên đăng nhập</Text>
          <TextInput
            style={styles.input}
            placeholder="admin hoặc member10@gmail.com"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Mật khẩu</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeBtnText}>{showPassword ? '👁️' : '🔒'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginBtnText}>Đăng nhập</Text>
            )}
          </TouchableOpacity>

          {/* Quick Fill Demo */}
          <View style={styles.quickFillContainer}>
            <Text style={styles.quickFillLabel}>Tài khoản có sẵn trong CSDL:</Text>
            <View style={styles.quickFillBtnGroup}>
              <TouchableOpacity
                onPress={() => {
                  setEmail('admin');
                  setPassword('admin');
                }}
                style={styles.quickFillPill}
              >
                <Text style={styles.quickFillText}>👑 Admin: admin / admin</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setEmail('member10@gmail.com');
                  setPassword('admin');
                }}
                style={styles.quickFillPill}
              >
                <Text style={styles.quickFillText}>📖 Độc giả: member10 / admin</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Links for Register & Forgot Password */}
          <View style={styles.authLinksRow}>
            <TouchableOpacity onPress={() => navigation?.navigate('ForgotPassword')}>
              <Text style={styles.authLinkText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation?.navigate('Register')}>
              <Text style={styles.authLinkHighlight}>Đăng ký tài khoản</Text>
            </TouchableOpacity>
          </View>

          {/* Server Config Toggle */}
          <TouchableOpacity
            style={styles.configToggle}
            onPress={() => setShowConfig(!showConfig)}
          >
            <Text style={styles.configToggleText}>
              ⚙️ {showConfig ? 'Ẩn cấu hình máy chủ' : 'Cấu hình IP Backend & Kiểm tra kết nối'}
            </Text>
          </TouchableOpacity>

          {showConfig && (
            <View style={styles.configBox}>
              <Text style={styles.configLabel}>Địa chỉ IP Backend Spring Boot:</Text>
              <TextInput
                style={styles.configInput}
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="http://192.168.x.x:8080"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />

              {pingResult && (
                <View
                  style={[
                    styles.pingResultBox,
                    pingResult.success ? styles.pingSuccess : styles.pingError,
                  ]}
                >
                  <Text
                    style={[
                      styles.pingResultText,
                      pingResult.success ? styles.pingSuccessText : styles.pingErrorText,
                    ]}
                  >
                    {pingResult.success ? '✅ ' : '❌ '}
                    {pingResult.message}
                  </Text>
                </View>
              )}

              <View style={styles.configBtnRow}>
                <TouchableOpacity
                  style={[styles.testPingBtn, pinging && styles.btnDisabled]}
                  onPress={handleTestConnection}
                  disabled={pinging}
                >
                  {pinging ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.testPingBtnText}>⚡ Kiểm tra IP</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.saveIpBtn} onPress={handleSaveIp}>
                  <Text style={styles.saveIpBtnText}>💾 Lưu IP</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  appIcon: {
    fontSize: 52,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  passwordContainer: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#f8fafc',
  },
  eyeBtn: {
    paddingHorizontal: 12,
  },
  eyeBtnText: {
    fontSize: 18,
  },
  loginBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  quickFillContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  quickFillLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  quickFillBtnGroup: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  quickFillPill: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: '#4f46e5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quickFillText: {
    color: '#a5b4fc',
    fontSize: 12,
    fontWeight: '500',
  },
  authLinksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  authLinkText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  authLinkHighlight: {
    color: '#818cf8',
    fontSize: 13,
    fontWeight: '600',
  },
  configToggle: {
    marginTop: 18,
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  configToggleText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  configBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#0f172a',
    borderRadius: 10,
  },
  configLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 6,
  },
  configInput: {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#475569',
    marginBottom: 10,
  },
  pingResultBox: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  pingSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  pingError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  pingResultText: {
    fontSize: 12,
    fontWeight: '500',
  },
  pingSuccessText: {
    color: '#4ade80',
  },
  pingErrorText: {
    color: '#f87171',
  },
  configBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  testPingBtn: {
    flex: 1,
    backgroundColor: '#0284c7',
    borderRadius: 6,
    paddingVertical: 9,
    alignItems: 'center',
  },
  testPingBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  saveIpBtn: {
    flex: 1,
    backgroundColor: '#4f46e5',
    borderRadius: 6,
    paddingVertical: 9,
    alignItems: 'center',
  },
  saveIpBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
