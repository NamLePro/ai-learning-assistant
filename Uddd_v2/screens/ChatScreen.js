import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../api/config';

export default function ChatScreen({ doc, initialMessages = [], initialConversationId = null, onBack, onViewSaved }) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [savedId, setSavedId] = useState(initialConversationId);
  const listRef = useRef(null);

  const authHeaders = async () => {
    const token = await AsyncStorage.getItem('userToken');
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  };

  const persist = async (msgs, showAlert) => {
    try {
      const headers = await authHeaders();
      const title = (msgs.find((m) => m.role === 'user') || {}).text || 'Hội thoại mới';
      const url = savedId ? `${BASE_URL}/conversations/${savedId}` : `${BASE_URL}/conversations`;
      const response = await fetch(url, {
        method: savedId ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify({
          documentId: doc._id,
          documentName: doc.displayName,
          title: title.slice(0, 50),
          messages: msgs,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        if (!savedId && data.conversation) setSavedId(data.conversation._id);
        if (showAlert) Alert.alert('Đã lưu', 'Hội thoại đã được lưu vào lịch sử.');
      } else if (showAlert) {
        Alert.alert('Lỗi', data.message || 'Không lưu được hội thoại');
      }
    } catch (e) {
      if (showAlert) Alert.alert('Lỗi kết nối', 'Không thể kết nối tới Server Backend!');
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const before = messages;
    const next = [...messages, { role: 'user', text }];
    setMessages(next);
    setInput('');
    setSending(true);

    try {
      const headers = await authHeaders();
      const response = await fetch(`${BASE_URL}/documents/${doc._id}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: text,
          history: before.map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await response.json();

      if (response.ok) {
        const done = [...next, { role: 'model', text: data.reply }];
        setMessages(done);
        if (savedId) persist(done, false); // hội thoại đã lưu thì tự cập nhật
      } else {
        setMessages(before);
        setInput(text);
        Alert.alert('Không trả lời được', data.message || 'Có lỗi xảy ra');
      }
    } catch (e) {
      setMessages(before);
      setInput(text);
      Alert.alert('Lỗi kết nối', 'Không thể kết nối tới Server Backend!');
    } finally {
      setSending(false);
    }
  };

  const newConversation = () => {
    if (messages.length === 0) return;
    Alert.alert(
      'Cuộc hội thoại mới',
      savedId ? 'Bắt đầu cuộc hội thoại mới?' : 'Hội thoại hiện tại chưa lưu sẽ bị xóa. Tiếp tục?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Bắt đầu',
          onPress: () => {
            setMessages([]);
            setSavedId(null);
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>HỎI ĐÁP TÀI LIỆU</Text>
      <Text style={styles.docName} numberOfLines={1}>📄 {doc.displayName}</Text>

      <View style={styles.toolRow}>
        <TouchableOpacity style={styles.toolBtn} onPress={newConversation}>
          <Text style={styles.toolText}>➕ Mới</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolBtn, messages.length === 0 && { opacity: 0.4 }]}
          disabled={messages.length === 0}
          onPress={() => persist(messages, true)}
        >
          <Text style={styles.toolText}>{savedId ? '💾 Đã lưu (cập nhật)' : '💾 Lưu'}</Text>
        </TouchableOpacity>
        {onViewSaved && (
          <TouchableOpacity style={styles.toolBtn} onPress={onViewSaved}>
            <Text style={styles.toolText}>📚 Lịch sử</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        onContentSizeChange={() => listRef.current && listRef.current.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Hãy đặt câu hỏi về nội dung tài liệu, ví dụ: "Tài liệu này nói về điều gì?"
          </Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={item.role === 'user' ? styles.userText : styles.aiText}>{item.text}</Text>
          </View>
        )}
        ListFooterComponent={
          sending ? (
            <View style={[styles.bubble, styles.aiBubble]}>
              <ActivityIndicator color="#007AFF" />
            </View>
          ) : null
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Nhập câu hỏi..."
          value={input}
          onChangeText={setInput}
          multiline
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (sending || !input.trim()) && { opacity: 0.5 }]}
          onPress={send}
          disabled={sending || !input.trim()}
        >
          <Text style={styles.sendText}>Gửi</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>Quay lại</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60, backgroundColor: '#f5f5f5' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: '#333' },
  docName: { textAlign: 'center', color: '#666', marginTop: 4, marginBottom: 10 },
  toolRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 10 },
  toolBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  toolText: { fontSize: 13, color: '#333' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 30, paddingHorizontal: 20 },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: 14, marginBottom: 8 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#007AFF' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee' },
  userText: { color: '#fff', fontSize: 15, lineHeight: 21 },
  aiText: { color: '#333', fontSize: 15, lineHeight: 21 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendBtn: { backgroundColor: '#AF52DE', paddingVertical: 11, paddingHorizontal: 18, borderRadius: 18, marginLeft: 8 },
  sendText: { color: '#fff', fontWeight: 'bold' },
  backButton: { alignItems: 'center', paddingVertical: 12 },
  backButtonText: { color: '#007AFF', fontSize: 15 },
});