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
  Modal,
  ScrollView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../api/config';

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${formatDate(dateStr)} ${time}`;
}

function getFileIcon(fileType) {
  if (fileType === 'pdf') return '📕';
  if (fileType === 'docx') return '📘';
  if (fileType === 'txt') return '📄';
  return '📁';
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function DocumentsScreen({ onBack, onSummarize, onChat }) {
  const [documents, setDocuments] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [subjectInput, setSubjectInput] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  // Modal đổi tên
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renamingDoc, setRenamingDoc] = useState(null);
  const [newName, setNewName] = useState('');
  const [newSubject, setNewSubject] = useState('');

  // Modal chi tiết
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const subjects = [...new Set(documents.map((d) => d.subject).filter(Boolean))];
  const activeSubject = subjects.includes(selectedSubject) ? selectedSubject : '';
  const filteredDocuments = activeSubject
    ? documents.filter((d) => d.subject === activeSubject)
    : documents;

  const fetchDocuments = async () => {
    setFetching(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setDocuments(data.documents);
      } else {
        Alert.alert('Lỗi', data.message || 'Không lấy được danh sách tài liệu');
      }
    } catch (error) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối tới Server Backend!');
      console.error(error);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handlePickAndUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const picked = result.assets[0];
      setUploading(true);

      const token = await AsyncStorage.getItem('userToken');

      // Đọc file thành base64 rồi gửi bằng JSON, không dùng FormData
      const base64 = await new File(picked.uri).base64();

      const response = await fetch(`${BASE_URL}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileName: picked.name,
          base64,
          subject: subjectInput,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubjectInput('');
        fetchDocuments();
      } else {
        Alert.alert('Lỗi', data.message || 'Tải lên thất bại');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải lên tài liệu!');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const openDetail = async (id) => {
    setDetailVisible(true);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/documents/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setDetailData(data);
      } else {
        setDetailVisible(false);
        Alert.alert('Lỗi', data.message || 'Không xem được chi tiết tài liệu');
      }
    } catch (error) {
      setDetailVisible(false);
      Alert.alert('Lỗi kết nối', 'Không thể kết nối tới Server Backend!');
      console.error(error);
    } finally {
      setDetailLoading(false);
    }
  };

  const openRenameModal = (doc) => {
    setRenamingDoc(doc);
    setNewName(doc.displayName);
    setNewSubject(doc.subject || '');
    setRenameModalVisible(true);
  };

  const handleRename = async () => {
    if (!newName.trim()) {
      Alert.alert('Lỗi', 'Tên tài liệu không được để trống!');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/documents/${renamingDoc._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName: newName, subject: newSubject }),
      });
      const data = await response.json();

      if (response.ok) {
        setRenameModalVisible(false);
        fetchDocuments();
      } else {
        Alert.alert('Lỗi', data.message || 'Cập nhật thất bại');
      }
    } catch (error) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối tới Server Backend!');
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/documents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (response.ok) {
        fetchDocuments();
      } else {
        Alert.alert('Lỗi', data.message || 'Xóa thất bại');
      }
    } catch (error) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối tới Server Backend!');
      console.error(error);
    }
  };

  const confirmDelete = (doc) => {
    Alert.alert('Xóa tài liệu', `Bạn chắc chắn muốn xóa "${doc.displayName}"?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => handleDelete(doc._id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TÀI LIỆU HỌC TẬP</Text>

      <TextInput
        style={styles.input}
        placeholder="Môn học/chủ đề (không bắt buộc)"
        value={subjectInput}
        onChangeText={setSubjectInput}
      />

      <TouchableOpacity style={styles.uploadButton} onPress={handlePickAndUpload} disabled={uploading}>
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.uploadButtonText}>📤 Tải Lên Tài Liệu (PDF/DOCX/TXT)</Text>
        )}
      </TouchableOpacity>

      {/* Thanh lọc theo môn học (FR-12) */}
      {subjects.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipRow}
        >
          <TouchableOpacity
            style={[styles.chip, !activeSubject && styles.chipActive]}
            onPress={() => setSelectedSubject('')}
          >
            <Text style={[styles.chipText, !activeSubject && styles.chipTextActive]}>Tất cả</Text>
          </TouchableOpacity>
          {subjects.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, activeSubject === s && styles.chipActive]}
              onPress={() => setSelectedSubject(s)}
            >
              <Text style={[styles.chipText, activeSubject === s && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {fetching ? (
        <ActivityIndicator style={{ marginTop: 20 }} color="#007AFF" />
      ) : (
        <FlatList
          style={{ marginTop: 10 }}
          data={filteredDocuments}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {activeSubject ? 'Không có tài liệu nào trong môn này.' : 'Chưa có tài liệu nào.'}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.docItem}>
              <TouchableOpacity style={styles.docMain} onPress={() => openDetail(item._id)}>
                <Text style={styles.docIcon}>{getFileIcon(item.fileType)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docName}>{item.displayName}</Text>
                  <Text style={styles.docMeta}>
                    {item.subject ? `${item.subject} • ` : ''}
                    {formatFileSize(item.fileSize)} • {formatDate(item.createdAt)}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openRenameModal(item)} style={{ marginHorizontal: 12 }}>
                <Text style={styles.editText}>Sửa</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(item)}>
                <Text style={styles.deleteText}>Xóa</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Modal đổi tên */}
      <Modal visible={renameModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sửa tài liệu</Text>
            <TextInput
              style={styles.input}
              placeholder="Tên tài liệu"
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              style={styles.input}
              placeholder="Môn học/chủ đề"
              value={newSubject}
              onChangeText={setNewSubject}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleRename}>
              <Text style={styles.saveBtnText}>Lưu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setRenameModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal chi tiết tài liệu (FR-09, FR-13) */}
      <Modal visible={detailVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>Chi tiết tài liệu</Text>

            {detailLoading || !detailData ? (
              <ActivityIndicator style={{ marginVertical: 30 }} color="#007AFF" />
            ) : (
              <ScrollView>
                <InfoRow label="Tên hiển thị" value={detailData.document.displayName} />
                <InfoRow label="Tên file gốc" value={detailData.document.originalName} />
                <InfoRow label="Định dạng" value={detailData.document.fileType.toUpperCase()} />
                <InfoRow label="Dung lượng" value={formatFileSize(detailData.document.fileSize)} />
                <InfoRow label="Ngày tải lên" value={formatDateTime(detailData.document.createdAt)} />
                <InfoRow
                  label="Môn học/chủ đề"
                  value={detailData.document.subject || 'Chưa phân loại'}
                />
                <InfoRow
                  label="Nội dung đã trích xuất"
                  value={`${detailData.textLength} ký tự`}
                />

                <Text style={styles.previewTitle}>Xem trước nội dung (dùng cho AI)</Text>
                <View style={styles.previewBox}>
                  {detailData.textLength > 0 ? (
                    <Text style={styles.previewText}>
                      {detailData.textPreview}
                      {detailData.textLength > detailData.textPreview.length ? '\n...' : ''}
                    </Text>
                  ) : (
                    <Text style={styles.warnText}>
                      Chưa trích xuất được nội dung. File có thể trống hoặc là ảnh scan (không có chữ để đọc).
                    </Text>
                  )}
                </View>
              </ScrollView>
            )}

             {!detailLoading && detailData && detailData.textLength > 0 && (
              <TouchableOpacity
                style={styles.summarizeBtn}
                onPress={() => {
                  const target = {
                    _id: detailData.document._id,
                    displayName: detailData.document.displayName,
                  };
                  setDetailVisible(false);
                  // chờ modal đóng xong rồi mới chuyển màn, tránh lỗi treo modal trên iOS
                  setTimeout(() => onSummarize(target), 300);
                }}
              >
                <Text style={styles.summarizeBtnText}>✨ Tóm tắt bằng AI</Text>
              </TouchableOpacity>
            )}
            {!detailLoading && detailData && detailData.textLength > 0 && (
              <TouchableOpacity
                style={styles.chatBtn}
                    onPress={() => {
                const target = {
                  _id: detailData.document._id,
                 displayName: detailData.document.displayName,
           };
                    setDetailVisible(false);
                   setTimeout(() => onChat(target), 300);
             }}
  >
    <Text style={styles.summarizeBtnText}>💬 Hỏi đáp về tài liệu</Text>
  </TouchableOpacity>
)}

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDetailVisible(false)}>
              <Text style={styles.closeText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  uploadButton: { backgroundColor: '#007AFF', padding: 14, borderRadius: 8, alignItems: 'center' },
  uploadButtonText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20 },
  chipRow: { flexGrow: 0, marginTop: 12 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  chipText: { color: '#333', fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },
  docItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  docMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  docIcon: { fontSize: 26, marginRight: 10 },
  docName: { fontWeight: 'bold', fontSize: 14, color: '#333' },
  docMeta: { color: '#888', fontSize: 12, marginTop: 2 },
  editText: { color: '#007AFF', fontWeight: 'bold' },
  deleteText: { color: '#FF3B30', fontWeight: 'bold' },
  backButton: { marginTop: 15, alignItems: 'center', paddingVertical: 10 },
  backButtonText: { color: '#007AFF', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  saveBtn: { backgroundColor: '#34C759', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
  modalCloseBtn: { marginTop: 10, alignItems: 'center', paddingVertical: 10 },
  modalCloseText: { color: '#FF3B30', fontWeight: 'bold' },
  closeText: { color: '#007AFF', fontWeight: 'bold' },
  infoRow: { marginBottom: 10 },
  infoLabel: { fontSize: 12, color: '#888', marginBottom: 2 },
  infoValue: { fontSize: 15, color: '#333' },
  previewTitle: { fontSize: 13, fontWeight: 'bold', color: '#555', marginTop: 6, marginBottom: 6 },
  previewBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  previewText: { fontSize: 13, color: '#333', lineHeight: 19 },
  warnText: { fontSize: 13, color: '#FF9500' },
  summarizeBtn: { backgroundColor: '#AF52DE', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  summarizeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  chatBtn: { backgroundColor: '#FF9500', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
});