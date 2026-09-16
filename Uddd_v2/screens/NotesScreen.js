import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../api/config';

export default function NotesScreen({ onBack }) {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const fetchNotes = async () => {
    setFetching(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/notes`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setNotes(data.notes);
      } else {
        Alert.alert('Lỗi', data.message || 'Không lấy được danh sách ghi chú');
      }
    } catch (error) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối tới Server Backend!');
      console.error(error);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleAddNote = async () => {
    if (!title.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề!');
      return;
    }
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, content }),
      });
      const data = await response.json();

      if (response.ok) {
        setTitle('');
        setContent('');
        fetchNotes();
      } else {
        Alert.alert('Lỗi', data.message || 'Tạo ghi chú thất bại');
      }
    } catch (error) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối tới Server Backend!');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (id) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/notes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (response.ok) {
        fetchNotes();
      } else {
        Alert.alert('Lỗi', data.message || 'Xóa thất bại');
      }
    } catch (error) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối tới Server Backend!');
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GHI CHÚ HỌC TẬP</Text>

      <TextInput
        style={styles.input}
        placeholder="Tiêu đề"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={[styles.input, { height: 80 }]}
        placeholder="Nội dung (không bắt buộc)"
        value={content}
        onChangeText={setContent}
        multiline
      />
      <TouchableOpacity style={styles.addButton} onPress={handleAddNote} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.addButtonText}>Thêm Ghi Chú</Text>
        )}
      </TouchableOpacity>

      {fetching ? (
        <ActivityIndicator style={{ marginTop: 20 }} color="#007AFF" />
      ) : (
        <FlatList
          style={{ marginTop: 20 }}
          data={notes}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={<Text style={styles.emptyText}>Chưa có ghi chú nào.</Text>}
          renderItem={({ item }) => (
            <View style={styles.noteItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.noteTitle}>{item.title}</Text>
                {item.content ? <Text style={styles.noteContent}>{item.content}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => handleDeleteNote(item._id)}>
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
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#ddd' },
  addButton: { backgroundColor: '#34C759', padding: 12, borderRadius: 8, alignItems: 'center' },
  addButtonText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20 },
  noteItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  noteTitle: { fontWeight: 'bold', fontSize: 15, color: '#333' },
  noteContent: { color: '#666', marginTop: 4 },
  deleteText: { color: '#FF3B30', fontWeight: 'bold', marginLeft: 10 },
  backButton: { marginTop: 15, alignItems: 'center', paddingVertical: 10 },
  backButtonText: { color: '#007AFF', fontSize: 15 },
});