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
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = `${BASE_URL}/auth`;

export default function AuthScreen({ navigation, onLoginSuccess, onForgotPassword }) {
  const [isLogin, setIsLogin] = useState(true);
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password || (!isLogin && !fullname)) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin!');
      return;
    }

    setLoading(true);
    const endpoint = isLogin ? '/login' : '/register';
    const payload = isLogin
      ? { email, password }
      : { fullname, email, password };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        if (isLogin) {
            // Lưu token vào bộ nhớ máy để dùng cho các API cần xác thực sau này
          await AsyncStorage.setItem('userToken', data.token);
            // Đăng nhập thành công -> chuyển qua HomeScreen
          onLoginSuccess(data.user);
}
        else {
          // Đăng ký thành công -> quay về form Đăng nhập
          Alert.alert('Thành công', 'Đăng ký thành công! Vui lòng đăng nhập.');
          setIsLogin(true);
            setFullname('');
            setEmail('');
            setPassword('');
        }
      } else {
        Alert.alert('Lỗi', data.message || 'Thất bại');
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
      <Text style={styles.title}>{isLogin ? 'ĐĂNG NHẬP' : 'ĐĂNG KÝ'}</Text>

      {!isLogin && (
        <TextInput
          style={styles.input}
          placeholder="Họ và tên"
          value={fullname}
          onChangeText={setFullname}
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{isLogin ? 'Đăng Nhập' : 'Tạo Tài Khoản'}</Text>
        )}
      </TouchableOpacity>

            <TouchableOpacity
        onPress={() => {
          setIsLogin(!isLogin);
          setFullname('');
          setEmail('');
          setPassword('');
        }}
        style={styles.switchBtn}
      >
        <Text style={styles.switchText}>
          {isLogin ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
        </Text>
      </TouchableOpacity>
      {isLogin && (
        <TouchableOpacity onPress={onForgotPassword} style={styles.linkButton}>
          <Text style={styles.linkText}>Quên mật khẩu?</Text>
        </TouchableOpacity>
)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, color: '#333' },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  switchBtn: { marginTop: 20, alignItems: 'center' },
  switchText: { color: '#007AFF', fontSize: 14 },
  linkButton: { marginTop: 10, alignItems: 'center' },
  linkText: { color: '#888', fontSize: 13 },
});