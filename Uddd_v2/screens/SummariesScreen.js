import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../api/config';
import { SummaryView, LEVEL_LABELS, MODE_LABELS } from './SummaryScreen';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export default function SummariesScreen({ onBack }) {
  const [summaries, setSummaries] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [selected, setSelected] = useState(null);

  const fetchSummaries = async () => {
    setFetching(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/summaries`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setSummaries(data.summaries);
      } else {
        Alert.alert('Lỗi', data.message || 'Không lấy được danh sách bản tóm tắt');
      }
    } catch (error) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối tới Server Backend!');
      console.error(error);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, []);

  const handleDelete = async (id) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/summaries/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (response.ok) {
        setSelected(null);
        fetchSummaries();
      } else {
        Alert.alert('Lỗi', data.message || 'Xóa thất bại');
      }
    } catch (error) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối tới Server Backend!');
      console.error(error);
    }
  };

  const confirmDelete = (item) => {
    Alert.alert('Xóa bản tóm tắt', `Bạn chắc chắn muốn xóa "${item.title}"?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => handleDelete(item._id) },
    ]);
  };

  // Xem chi tiết 1 bản tóm tắt
  if (selected) {
    return (
      <View style={styles.container}>
        <ScrollView>
          <Text style={styles.docLabel}>📄 {selected.documentName}</Text>
          <Text style={styles.meta}>
            {LEVEL_LABELS[selected.level]} • {MODE_LABELS[selected.mode]} •{' '}
            {formatDate(selected.createdAt)}
          </Text>
          <View style={styles.card}>
            <SummaryView summary={selected} />
          </View>

          <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(selected)}>
            <Text style={styles.deleteBtnText}>Xóa bản tóm tắt này</Text>
          </TouchableOpacity>
        </ScrollView>

        <TouchableOpacity style={styles.backButton} onPress={() => setSelected(null)}>
          <Text style={styles.backButtonText}>Quay lại danh sách</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BẢN TÓM TẮT ĐÃ LƯU</Text>

      {fetching ? (
        <ActivityIndicator style={{ marginTop: 20 }} color="#007AFF" />
      ) : (
        <FlatList
          data={summaries}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={<Text style={styles.emptyText}>Chưa có bản tóm tắt nào.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => setSelected(item)}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDoc}>📄 {item.documentName}</Text>
              <Text style={styles.itemMeta}>
                {LEVEL_LABELS[item.level]} • {MODE_LABELS[item.mode]} • {formatDate(item.createdAt)}
              </Text>
            </TouchableOpacity>
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
  item: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  itemTitle: { fontWeight: 'bold', fontSize: 15, color: '#333', marginBottom: 4 },
  itemDoc: { fontSize: 13, color: '#555', marginBottom: 2 },
  itemMeta: { fontSize: 12, color: '#888' },
  docLabel: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 4 },
  meta: { fontSize: 12, color: '#888', textAlign: 'center', marginBottom: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  deleteBtn: { alignItems: 'center', paddingVertical: 14 },
  deleteBtnText: { color: '#FF3B30', fontWeight: 'bold' },
  backButton: { marginTop: 10, alignItems: 'center', paddingVertical: 10 },
  backButtonText: { color: '#007AFF', fontSize: 15 },
});