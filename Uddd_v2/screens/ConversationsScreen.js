import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../api/config';

export default function ConversationsScreen({ onBack, onOpen }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setItems(data.conversations);
      else Alert.alert('Lỗi', data.message || 'Không lấy được lịch sử');
    } catch (e) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối tới Server Backend!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = (item) => {
    Alert.alert('Xóa hội thoại', 'Bạn chắc chắn muốn xóa?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('userToken');
            await fetch(`${BASE_URL}/conversations/${item._id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            load();
          } catch (e) {
            Alert.alert('Lỗi kết nối', 'Không thể kết nối tới Server Backend!');
          }
        },
      },
    ]);
  };

  const fmt = (s) => {
    const d = new Date(s);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LỊCH SỬ HỎI ĐÁP</Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color="#007AFF" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i._id}
          ListEmptyComponent={<Text style={styles.emptyText}>Chưa có hội thoại nào được lưu.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => onOpen(item)}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.cardMeta} numberOfLines={1}>📄 {item.documentName}</Text>
                <Text style={styles.cardMeta}>{item.messages.length} tin nhắn • {fmt(item.updatedAt)}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => remove(item)}>
                <Text style={styles.deleteText}>Xóa</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>Quay lại</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#f5f5f5' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#333' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardTitle: { fontWeight: 'bold', fontSize: 15, color: '#333' },
  cardMeta: { color: '#888', fontSize: 12, marginTop: 3 },
  deleteText: { color: '#FF3B30', fontWeight: 'bold', marginLeft: 12 },
  backButton: { marginTop: 15, alignItems: 'center', paddingVertical: 10 },
  backButtonText: { color: '#007AFF', fontSize: 15 },
});