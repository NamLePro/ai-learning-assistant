import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../api/config';

const MAJORS = [
  'Công nghệ thông tin',
  'Khoa học máy tính',
  'Kỹ thuật phần mềm',
  'Hệ thống thông tin quản lý',
  'Kinh tế',
  'Quản trị kinh doanh',
  'Marketing',
  'Kế toán - Kiểm toán',
  'Ngôn ngữ Anh',
  'Khác',
];

function formatDate(date) {
  if (!date) return '';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export default function ProfileScreen({ user, onBack, onUpdateSuccess }) {
  const [fullName, setFullName] = useState(user.fullName || '');
  const [dateOfBirth, setDateOfBirth] = useState(
    user.dateOfBirth ? new Date(user.dateOfBirth) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState(user.gender || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [studentId, setStudentId] = useState(user.studentId || '');
  const [major, setMajor] = useState(user.major || '');
  const [showMajorModal, setShowMajorModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const onChangeDate = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate) setDateOfBirth(selectedDate);
    } else {
      if (selectedDate) setDateOfBirth(selectedDate);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
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
        body: JSON.stringify({
          fullName,
          dateOfBirth: dateOfBirth ? dateOfBirth.toISOString() : null,
          gender: gender || null,
          phone,
          studentId,
          major,
        }),
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>THÔNG TIN CÁ NHÂN</Text>

      <Text style={styles.label}>Email (không thể thay đổi)</Text>
      <View style={[styles.input, styles.inputDisabled]}>
        <Text style={styles.disabledText}>{user.email}</Text>
      </View>

      <Text style={styles.label}>Họ và tên *</Text>
      <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />

      <Text style={styles.label}>Ngày sinh</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
        <Text style={dateOfBirth ? styles.inputText : styles.placeholderText}>
          {dateOfBirth ? formatDate(dateOfBirth) : 'Chọn ngày sinh'}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <View>
          <DateTimePicker
            value={dateOfBirth || new Date(2000, 0, 1)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={onChangeDate}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.doneBtn} onPress={() => setShowDatePicker(false)}>
              <Text style={styles.doneBtnText}>Xong</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Text style={styles.label}>Giới tính</Text>
      <View style={styles.genderRow}>
        {['Nam', 'Nữ', 'Khác'].map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
            onPress={() => setGender(g)}
          >
            <Text style={[styles.genderBtnText, gender === g && styles.genderBtnTextActive]}>
              {g}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Số điện thoại</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Mã số sinh viên (MSSV)</Text>
      <TextInput style={styles.input} value={studentId} onChangeText={setStudentId} />

      <Text style={styles.label}>Ngành học</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShowMajorModal(true)}>
        <Text style={major ? styles.inputText : styles.placeholderText}>
          {major || 'Chọn ngành học'}
        </Text>
      </TouchableOpacity>

      <Modal visible={showMajorModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chọn ngành học</Text>
            <FlatList
              data={MAJORS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setMajor(item);
                    setShowMajorModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowMajorModal(false)}>
              <Text style={styles.modalCloseText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Lưu Thay Đổi</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>Quay lại</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 60, backgroundColor: '#f5f5f5', flexGrow: 1 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 24, color: '#333' },
  label: { fontSize: 13, color: '#666', marginBottom: 6, marginTop: 2 },
  input: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
  },
  inputDisabled: { backgroundColor: '#eee' },
  disabledText: { color: '#888', fontSize: 15 },
  inputText: { color: '#333', fontSize: 15 },
  placeholderText: { color: '#999', fontSize: 15 },
  genderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  genderBtn: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  genderBtnActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  genderBtnText: { color: '#333', fontSize: 14 },
  genderBtnTextActive: { color: '#fff', fontWeight: 'bold' },
  doneBtn: { backgroundColor: '#007AFF', padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 15 },
  doneBtnText: { color: '#fff', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemText: { fontSize: 15, color: '#333' },
  modalCloseBtn: { marginTop: 10, alignItems: 'center', paddingVertical: 12 },
  modalCloseText: { color: '#FF3B30', fontWeight: 'bold', fontSize: 15 },
  saveButton: { backgroundColor: '#34C759', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  backButton: { marginTop: 15, alignItems: 'center', paddingVertical: 10 },
  backButtonText: { color: '#007AFF', fontSize: 15 },
});