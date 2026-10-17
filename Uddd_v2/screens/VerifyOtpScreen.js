import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BASE_URL } from '../api/config';

export default function VerifyOtpScreen({ email, onVerifySuccess, onBackToLogin }) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Lỗi', 'Vui lòng nhập đủ 6 số OTP!');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await response.json();

      if (response.ok) {
        Alert.alert('Thành công', 'Xác thực tài khoản thành công! Vui lòng đăng nhập.', [
          { text: 'OK', onPress: () => onVerifySuccess() },
        ]);
      } else {
        Alert.alert('Lỗi', data.message || 'Xác thực thất bại');
      }
    } catch (error) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối tới Server Backend!');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const response = await fetch(`${BASE_URL}/auth/resend-verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (response.ok) {
        Alert.alert('Thành công', 'Đã gửi lại mã OTP, vui lòng kiểm tra email!');
      } else {
        Alert.alert('Lỗi', data.message || 'Gửi lại thất bại');
      }
    } catch (error) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối tới Server Backend!');
      console.error(error);
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>XÁC THỰC EMAIL</Text>
      <Text style={styles.subtitle}>
        Mã OTP đã được gửi tới{'\n'}
        <Text style={styles.emailText}>{email}</Text>
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Nhập mã OTP (6 số)"
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        maxLength={6}
        textAlign="center"
      />

      <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Xác Thực</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleResend} disabled={resending} style={styles.resendBtn}>
        <Text style={styles.resendText}>
          {resending ? 'Đang gửi...' : 'Gửi lại mã OTP'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onBackToLogin} style={styles.linkButton}>
        <Text style={styles.linkText}>Quay lại Đăng nhập</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, color: '#333' },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#666', marginBottom: 30 },
  emailText: { fontWeight: 'bold', color: '#007AFF' },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 20,
    letterSpacing: 8,
  },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  resendBtn: { marginTop: 20, alignItems: 'center' },
  resendText: { color: '#34C759', fontSize: 14, fontWeight: 'bold' },
  linkButton: { marginTop: 15, alignItems: 'center' },
  linkText: { color: '#888', fontSize: 13 },
});