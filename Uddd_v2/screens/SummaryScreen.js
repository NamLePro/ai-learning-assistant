import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../api/config';

export const LEVEL_LABELS = { short: 'Ngắn', medium: 'Vừa', detailed: 'Chi tiết' };
export const MODE_LABELS = { overall: 'Tổng quan', sections: 'Theo từng phần' };

// Hiển thị 1 bản tóm tắt có cấu trúc (FR-20), dùng chung cho màn tóm tắt và màn danh sách đã lưu
export function SummaryView({ summary }) {
  return (
    <View>
      <Text style={styles.sumTitle}>{summary.title}</Text>
      {summary.overview ? <Text style={styles.overview}>{summary.overview}</Text> : null}

      {summary.sections.map((sec, i) => (
        <View key={i} style={styles.section}>
          {sec.heading ? <Text style={styles.heading}>{sec.heading}</Text> : null}
          {sec.points.map((p, j) => (
            <View key={j} style={styles.pointRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.pointText}>{p}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export default function SummaryScreen({ doc, onBack, onViewSaved }) {
  const [level, setLevel] = useState('medium');
  const [mode, setMode] = useState('overall');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState(null);
  const [saved, setSaved] = useState(false);

  const handleSummarize = async () => {
    setLoading(true);
    setSummary(null);
    setSaved(false);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/documents/${doc._id}/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ level, mode }),
      });
      const data = await response.json();

      if (response.ok) {
        setSummary(data.summary);
      } else {
        Alert.alert('Không tóm tắt được', data.message || 'Thất bại');
      }
    } catch (error) {
      Alert.alert(
        'Lỗi kết nối',
        'Không nhận được phản hồi từ server (có thể AI xử lý quá lâu). Thử chọn mức "Ngắn" hoặc thử lại!'
      );
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!summary || saved) return;
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${BASE_URL}/summaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          documentId: summary.documentId,
          documentName: summary.documentName,
          level: summary.level,
          mode: summary.mode,
          title: summary.title,
          overview: summary.overview,
          sections: summary.sections,
        }),
      });
      const data = await response.json();

      if (response.ok) {
        setSaved(true);
      } else {
        Alert.alert('Lỗi', data.message || 'Lưu thất bại');
      }
    } catch (error) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối tới Server Backend!');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>TÓM TẮT BẰNG AI</Text>
      <Text style={styles.docName}>📄 {doc.displayName}</Text>

      <Text style={styles.label}>Mức độ tóm tắt</Text>
      <View style={styles.optionRow}>
        {Object.keys(LEVEL_LABELS).map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.optionBtn, level === key && styles.optionBtnActive]}
            onPress={() => setLevel(key)}
            disabled={loading}
          >
            <Text style={[styles.optionText, level === key && styles.optionTextActive]}>
              {LEVEL_LABELS[key]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Cách tóm tắt</Text>
      <View style={styles.optionRow}>
        {Object.keys(MODE_LABELS).map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.optionBtn, mode === key && styles.optionBtnActive]}
            onPress={() => setMode(key)}
            disabled={loading}
          >
            <Text style={[styles.optionText, mode === key && styles.optionTextActive]}>
              {MODE_LABELS[key]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.runButton} onPress={handleSummarize} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.runButtonText}>✨ {summary ? 'Tóm tắt lại' : 'Tóm tắt'}</Text>
        )}
      </TouchableOpacity>

      {loading && (
        <Text style={styles.loadingText}>
          AI đang đọc và tóm tắt tài liệu... (có thể mất 10-60 giây)
        </Text>
      )}

      {summary && !loading && (
        <View style={styles.resultBox}>
          {summary.truncated && (
            <Text style={styles.warnText}>
              Tài liệu quá dài, AI chỉ tóm tắt phần đầu (khoảng 100.000 ký tự).
            </Text>
          )}

          <SummaryView summary={summary} />

          <TouchableOpacity
            style={[styles.saveButton, saved && styles.saveButtonDone]}
            onPress={handleSave}
            disabled={saving || saved}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>
                {saved ? '✓ Đã lưu bản tóm tắt' : '💾 Lưu bản tóm tắt'}
              </Text>
            )}
          </TouchableOpacity>

          {saved && (
            <TouchableOpacity style={styles.viewSavedBtn} onPress={onViewSaved}>
              <Text style={styles.viewSavedText}>📚 Xem các bản đã lưu</Text>
            </TouchableOpacity>
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
  container: { padding: 20, paddingTop: 60, backgroundColor: '#f5f5f5', flexGrow: 1 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 12, color: '#333' },
  docName: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 20 },
  label: { fontSize: 13, color: '#666', marginBottom: 6, marginTop: 4 },
  optionRow: { flexDirection: 'row', marginBottom: 12 },
  optionBtn: {
    flex: 1,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  optionBtnActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  optionText: { color: '#333', fontSize: 13 },
  optionTextActive: { color: '#fff', fontWeight: 'bold' },
  runButton: { backgroundColor: '#AF52DE', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  runButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  loadingText: { textAlign: 'center', color: '#888', marginTop: 12, fontSize: 13 },
  resultBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#eee',
  },
  warnText: { fontSize: 12, color: '#FF9500', marginBottom: 10 },
  sumTitle: { fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 8 },
  overview: { fontSize: 14, color: '#555', lineHeight: 21, marginBottom: 12, fontStyle: 'italic' },
  section: { marginBottom: 14 },
  heading: { fontSize: 15, fontWeight: 'bold', color: '#007AFF', marginBottom: 6 },
  pointRow: { flexDirection: 'row', marginBottom: 5, paddingRight: 6 },
  bullet: { fontSize: 14, color: '#333', marginRight: 8, lineHeight: 21 },
  pointText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 21 },
  saveButton: { backgroundColor: '#34C759', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  saveButtonDone: { backgroundColor: '#8E8E93' },
  saveButtonText: { color: '#fff', fontWeight: 'bold' },
  viewSavedBtn: { alignItems: 'center', paddingVertical: 12 },
  viewSavedText: { color: '#007AFF', fontWeight: 'bold' },
  backButton: { marginTop: 18, alignItems: 'center', paddingVertical: 10 },
  backButtonText: { color: '#007AFF', fontSize: 15 },
});