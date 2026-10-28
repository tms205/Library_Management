import React, { useState } from 'react';
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
import { registerApi } from '../api/authApi';

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !password || !dateOfBirth || !phone || !address) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ tất cả các trường thông tin!');
      return;
    }

    if (!/^0\d{9}$/.test(phone.trim())) {
      Alert.alert('Lỗi', 'Số điện thoại phải gồm 10 số và bắt đầu bằng số 0!');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth.trim())) {
      Alert.alert('Lỗi', 'Ngày sinh phải có định dạng YYYY-MM-DD (Ví dụ: 2000-01-15)!');
      return;
    }

    try {
      setLoading(true);
      await registerApi({
        fullName: fullName.trim(),
        email: email.trim(),
        password: password,
        dateOfBirth: dateOfBirth.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });

      Alert.alert(
        'Đăng ký thành công 🎉',
        'Vui lòng kiểm tra hộp thư email của bạn và click vào link xác minh trước khi đăng nhập.',
        [{ text: 'Đến Đăng nhập', onPress: () => navigation.navigate('Login') }],
      );
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Đăng ký không thành công!';
      Alert.alert('Đăng ký thất bại', msg);
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
          <Text style={styles.title}>Tạo tài khoản mới</Text>
          <Text style={styles.subtitle}>Đăng ký làm độc giả của Library Management</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Họ và tên *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nguyễn Văn A"
            placeholderTextColor="#94a3b8"
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="example@gmail.com"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Mật khẩu *</Text>
          <TextInput
            style={styles.input}
            placeholder="Tối thiểu 4 ký tự"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Text style={styles.label}>Ngày sinh (YYYY-MM-DD) *</Text>
          <TextInput
            style={styles.input}
            placeholder="2000-01-15"
            placeholderTextColor="#94a3b8"
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
          />

          <Text style={styles.label}>Số điện thoại *</Text>
          <TextInput
            style={styles.input}
            placeholder="0912345678 (10 số)"
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Text style={styles.label}>Địa chỉ *</Text>
          <TextInput
            style={styles.input}
            placeholder="Hà Nội, Việt Nam"
            placeholderTextColor="#94a3b8"
            value={address}
            onChangeText={setAddress}
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Đăng ký ngay</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.backLinkText}>Đã có tài khoản? <Text style={styles.highlight}>Đăng nhập</Text></Text>
          </TouchableOpacity>
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
    padding: 20,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
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
  },
  label: {
    fontSize: 13,
    color: '#cbd5e1',
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
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
  btn: {
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  backLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  backLinkText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  highlight: {
    color: '#818cf8',
    fontWeight: '600',
  },
});
