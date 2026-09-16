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

export default function ForgotPasswordScreen({ onBackToLogin }) {
  const [step, setStep] = useState(1); // 1: nhập email, 2: nhập OTP + mật khẩu mới
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!email) {
      Alert.alert('Lỗi', 'Vui lòng nhập email!');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (response.ok) {
        Alert.alert('Thành công', 'Đã gửi mã OTP! Kiểm tra terminal backend để lấy mã (bản demo).');
        setStep(2);
      } else {
        Alert.alert('Lỗi', data.message || 'Gửi OTP thất bại');
      }
    } catch (error) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối tới Server Backend!');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp || !newPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ mã OTP và mật khẩu mới!');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await response.json();

      if (response.ok) {
        Alert.alert('Thành công', 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.', [
          { text: 'OK', onPress: () => onBackToLogin() },
        ]);
      } else {
        Alert.alert('Lỗi', data.message || 'Đặt lại mật khẩu thất bại');
      }
    } catch (error) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối tới Server Backend!');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>QUÊN MẬT KHẨU</Text>

      {step === 1 ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Nhập email đã đăng ký"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TouchableOpacity style={styles.button} onPress={handleSendOtp} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Gửi Mã OTP</Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Nhập mã OTP (6 số)"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TextInput
            style={styles.input}
            placeholder="Mật khẩu mới"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
          <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Đặt Lại Mật Khẩu</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={onBackToLogin} style={styles.linkButton}>
        <Text style={styles.linkText}>Quay lại Đăng nhập</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, color: '#333' },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  linkButton: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#007AFF', fontSize: 14 },
});