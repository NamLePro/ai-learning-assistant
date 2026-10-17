import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BASE_URL } from '../api/config';

const API_URL = `${BASE_URL}/auth`;

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

export default function AuthScreen({ navigation, onLoginSuccess, onForgotPassword, onRegisterSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Field mở rộng cho đăng ký
  const [dateOfBirth, setDateOfBirth] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [studentId, setStudentId] = useState('');
  const [major, setMajor] = useState('');
  const [showMajorModal, setShowMajorModal] = useState(false);

  const resetAllFields = () => {
    setFullname('');
    setEmail('');
    setPassword('');
    setDateOfBirth(null);
    setGender('');
    setPhone('');
    setStudentId('');
    setMajor('');
  };

  const onChangeDate = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate) setDateOfBirth(selectedDate);
    } else {
      // iOS: giữ picker mở, cập nhật giá trị tạm, đóng khi bấm "Xong"
      if (selectedDate) setDateOfBirth(selectedDate);
    }
  };

  const handleSubmit = async () => {
    if (!email || !password || (!isLogin && !fullname)) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }

    setLoading(true);
    const endpoint = isLogin ? '/login' : '/register';
    const payload = isLogin
      ? { email, password }
      : {
          fullname,
          email,
          password,
          dateOfBirth: dateOfBirth ? dateOfBirth.toISOString() : null,
          gender: gender || null,
          phone,
          studentId,
          major,
        };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        if (isLogin) {
          onLoginSuccess(data.user, data.token);
        } else {
          onRegisterSuccess(email);
        }
      } else {
        if (data.needVerify) {
          Alert.alert('Chưa xác thực', data.message || 'Tài khoản chưa xác thực email!');
          onRegisterSuccess(data.email);
        } else {
          Alert.alert('Lỗi', data.message || 'Thất bại');
        }
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
        <>
          <TextInput
            style={styles.input}
            placeholder="Họ và tên *"
            value={fullname}
            onChangeText={setFullname}
          />

          {/* Ngày sinh */}
          <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
            <Text style={dateOfBirth ? styles.inputText : styles.placeholderText}>
              {dateOfBirth ? formatDate(dateOfBirth) : 'Ngày sinh'}
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
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.doneBtnText}>Xong</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Giới tính */}
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

          <TextInput
            style={styles.input}
            placeholder="Số điện thoại"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <TextInput
            style={styles.input}
            placeholder="Mã số sinh viên (MSSV)"
            value={studentId}
            onChangeText={setStudentId}
          />

          {/* Ngành học */}
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
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setShowMajorModal(false)}
                >
                  <Text style={styles.modalCloseText}>Đóng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      )}

      <TextInput
        style={styles.input}
        placeholder="Email *"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Mật khẩu *"
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
          resetAllFields();
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
  container: { flexGrow: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 24, color: '#333' },
  label: { fontSize: 13, color: '#666', marginBottom: 6, marginTop: 2 },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
  },
  inputText: { color: '#333', fontSize: 15 },
  placeholderText: { color: '#999', fontSize: 15 },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  switchBtn: { marginTop: 20, alignItems: 'center' },
  switchText: { color: '#007AFF', fontSize: 14 },
  linkButton: { marginTop: 10, alignItems: 'center' },
  linkText: { color: '#888', fontSize: 13 },
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
});