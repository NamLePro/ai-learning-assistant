import React from 'react';
import { StyleSheet, Text, ScrollView, TouchableOpacity } from 'react-native';

export default function HomeScreen({
  userEmail,
  userFullName,
  onLogout,
  onGoToProfile,
  onGoToNotes,
  onGoToDocuments,
  onGoToSummaries,
  onGoToConversations,
  onGoToScan,
}) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.welcomeText}>CHÀO MỪNG BẠN!</Text>
      <Text style={styles.userText}>
        {userFullName ? userFullName : userEmail || 'Người dùng'}
      </Text>

      <TouchableOpacity style={styles.menuButton} onPress={onGoToProfile}>
        <Text style={styles.menuButtonText}>👤 Thông Tin Cá Nhân</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuButton} onPress={onGoToDocuments}>
        <Text style={styles.menuButtonText}>📚 Tài Liệu Học Tập</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuButton} onPress={onGoToSummaries}>
        <Text style={styles.menuButtonText}>🧠 Bản Tóm Tắt Đã Lưu</Text>
      </TouchableOpacity>
        <TouchableOpacity style={styles.menuButton} onPress={onGoToConversations}>
        <Text style={styles.menuButtonText}>💬 Lịch Sử Hỏi Đáp</Text>
      </TouchableOpacity>

       <TouchableOpacity style={styles.menuButton} onPress={onGoToScan}>
        <Text style={styles.menuButtonText}>📷 Quét Đề Bài</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuButton} onPress={onGoToNotes}>
        <Text style={styles.menuButtonText}>📝 Ghi Chú Học Tập</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutButtonText}>Đăng Xuất</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 60,
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#f5f5f5',
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  userText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 30,
  },
  menuButton: {
    width: '100%',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  menuButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 10,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});