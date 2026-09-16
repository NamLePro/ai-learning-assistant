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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../api/config';

export default function HomeScreen({ userEmail, userFullName, onLogout, onUpdateSuccess, onGoToNotes }) {
  const [newFullName, setNewFullName] = useState(userFullName || '');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!newFullName.trim()) {
      Alert.alert('Lỗi', 'Họ tên không được để trống!');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');

      const response = await fetch(`${BASE_URL}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fullName: newFullName }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Thành công', 'Cập nhật thông tin thành công!');
        onUpdateSuccess(data.user);
      } else {
        Alert.alert('Lỗi', data.message || 'Cập nhật thất bại');
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
      <Text style={styles.welcomeText}>CHÀO MỪNG BẠN!</Text>
      <Text style={styles.userText}>Tài khoản: {userEmail || 'Người dùng'}</Text>

      <TextInput
        style={styles.input}
        placeholder="Họ và tên"
        value={newFullName}
        onChangeText={setNewFullName}
      />

      <TouchableOpacity style={styles.updateButton} onPress={handleUpdate} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.updateButtonText}>Cập Nhật Thông Tin</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.notesButton} onPress={onGoToNotes}>
        <Text style={styles.notesButtonText}>📝 Ghi Chú Học Tập</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutButtonText}>Đăng Xuất</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#f5f5f5',
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 12,
  },
  userText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  updateButton: {
    width: '100%',
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  notesButton: {
    width: '100%',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  notesButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});