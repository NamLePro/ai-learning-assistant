import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../api/config';

export default function ScanScreen({ onBack }) {
  const [imageUri, setImageUri] = useState(null);
  const [text, setText] = useState('');
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const runOcr = async (asset) => {
    setImageUri(asset.uri);
    setText('');
    setAnalysis(null);
    setScanned(false);
    setScanning(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/scan/ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ base64: asset.base64, mimeType: asset.mimeType || 'image/jpeg' }),
      });
      const data = await response.json();
      if (response.ok) {
        setText(data.text || '');
        setScanned(true);
        if (!data.text) Alert.alert('Không đọc được chữ', 'Ảnh có thể mờ hoặc không có chữ. Thử chụp lại rõ hơn.');
      } else {
        Alert.alert('Không nhận dạng được', data.message || 'Có lỗi xảy ra');
      }
    } catch (e) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối tới Server Backend!');
    } finally {
      setScanning(false);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Cần quyền camera', 'Hãy cho phép dùng camera trong Cài đặt để chụp đề bài.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true });
    if (!result.canceled) runOcr(result.assets[0]);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled) runOcr(result.assets[0]);
  };

  const analyze = async () => {
    if (!text.trim()) {
      Alert.alert('Lỗi', 'Nội dung đề bài đang trống!');
      return;
    }
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/scan/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      if (response.ok) setAnalysis(data.analysis);
      else Alert.alert('Không phân tích được', data.message || 'Có lỗi xảy ra');
    } catch (e) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối tới Server Backend!');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>QUÉT ĐỀ BÀI</Text>

      <View style={styles.row}>
        <TouchableOpacity style={[styles.pickBtn, { backgroundColor: '#007AFF' }]} onPress={takePhoto} disabled={scanning}>
          <Text style={styles.pickText}>📷 Chụp ảnh</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.pickBtn, { backgroundColor: '#34C759' }]} onPress={pickImage} disabled={scanning}>
          <Text style={styles.pickText}>🖼️ Chọn ảnh</Text>
        </TouchableOpacity>
      </View>

      {imageUri && <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />}

      {scanning && (
        <View style={{ alignItems: 'center', marginVertical: 20 }}>
          <ActivityIndicator color="#AF52DE" />
          <Text style={styles.hint}>Đang nhận dạng chữ trong ảnh...</Text>
        </View>
      )}

      {scanned && (
        <View>
          <Text style={styles.label}>Nội dung nhận dạng (kiểm tra và sửa nếu sai)</Text>
          <TextInput
            style={styles.textBox}
            value={text}
            onChangeText={setText}
            multiline
            placeholder="Chưa có nội dung. Bạn có thể tự gõ đề bài vào đây."
            textAlignVertical="top"
          />

          <TouchableOpacity style={styles.analyzeBtn} onPress={analyze} disabled={analyzing}>
            {analyzing ? <ActivityIndicator color="#fff" /> : <Text style={styles.analyzeText}>🤖 Gửi AI phân tích</Text>}
          </TouchableOpacity>
        </View>
      )}

      {analysis && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Kết quả phân tích</Text>
          <Text style={styles.resLabel}>Môn học</Text>
          <Text style={styles.resValue}>{analysis.subject || '—'}</Text>
          <Text style={styles.resLabel}>Chủ đề</Text>
          <Text style={styles.resValue}>{analysis.topic || '—'}</Text>
          <Text style={styles.resLabel}>Dạng bài</Text>
          <Text style={styles.resValue}>{analysis.problemType || '—'}</Text>
          <Text style={styles.resLabel}>Đề yêu cầu</Text>
          <Text style={styles.resValue}>{analysis.summary || '—'}</Text>
          {analysis.keyConcepts.length > 0 && (
            <>
              <Text style={styles.resLabel}>Khái niệm cần biết</Text>
              {analysis.keyConcepts.map((c, i) => (
                <Text key={i} style={styles.resValue}>• {c}</Text>
              ))}
            </>
          )}
        </View>
      )}

      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>Quay lại</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#f5f5f5' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#333' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  pickBtn: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  pickText: { color: '#fff', fontWeight: 'bold' },
  preview: { width: '100%', height: 220, marginTop: 14, borderRadius: 8, backgroundColor: '#eee' },
  hint: { color: '#888', marginTop: 8 },
  label: { fontSize: 13, color: '#555', fontWeight: 'bold', marginTop: 16, marginBottom: 6 },
  textBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 160,
    fontSize: 15,
    lineHeight: 21,
  },
  analyzeBtn: { backgroundColor: '#AF52DE', padding: 13, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  analyzeText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  resultCard: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#eee' },
  resultTitle: { fontSize: 17, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  resLabel: { fontSize: 12, color: '#888', marginTop: 10 },
  resValue: { fontSize: 15, color: '#333', marginTop: 2, lineHeight: 21 },
  backButton: { marginTop: 20, alignItems: 'center', paddingVertical: 10 },
  backButtonText: { color: '#007AFF', fontSize: 15 },
});