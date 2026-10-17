import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import NotesScreen from './screens/NotesScreen';
import VerifyOtpScreen from './screens/VerifyOtpScreen';
import ProfileScreen from './screens/ProfileScreen';
import DocumentsScreen from './screens/DocumentsScreen';
import SummaryScreen from './screens/SummaryScreen';
import SummariesScreen from './screens/SummariesScreen';
import ChatScreen from './screens/ChatScreen';
import ConversationsScreen from './screens/ConversationsScreen';
import ScanScreen from './screens/ScanScreen';

export default function App() {
  const [user, setUser] = useState(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showSummaries, setShowSummaries] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [summaryDoc, setSummaryDoc] = useState(null);
  const [chatTarget, setChatTarget] = useState(null); // { doc, messages, conversationId }
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState(null);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    setUser(null);
    setShowNotes(false);
    setShowProfile(false);
    setShowDocuments(false);
    setShowSummaries(false);
    setShowConversations(false);
    setShowScan(false);
    setSummaryDoc(null);
    setChatTarget(null);
  };

  const handleLoginSuccess = async (userData, token) => {
    if (token) {
      await AsyncStorage.setItem('userToken', token);
    }
    setUser(userData);
  };

  if (pendingVerifyEmail) {
    return (
      <VerifyOtpScreen
        email={pendingVerifyEmail}
        onVerifySuccess={() => setPendingVerifyEmail(null)}
        onBackToLogin={() => setPendingVerifyEmail(null)}
      />
    );
  }

  if (user) {
    if (chatTarget) {
      return (
        <ChatScreen
          key={chatTarget.conversationId || chatTarget.doc._id}
          doc={chatTarget.doc}
          initialMessages={chatTarget.messages}
          initialConversationId={chatTarget.conversationId}
          onBack={() => setChatTarget(null)}
          onViewSaved={() => {
            setChatTarget(null);
            setShowDocuments(false);
            setShowConversations(true);
          }}
        />
      );
    }
    if (showConversations) {
      return (
        <ConversationsScreen
          onBack={() => setShowConversations(false)}
          onOpen={(c) => {
            setShowConversations(false);
            setChatTarget({
              doc: { _id: c.documentId, displayName: c.documentName },
              messages: c.messages.map((m) => ({ role: m.role, text: m.text })),
              conversationId: c._id,
            });
          }}
        />
      );
    }
    if (showScan) {
      return <ScanScreen onBack={() => setShowScan(false)} />;
    }
    if (summaryDoc) {
      return (
        <SummaryScreen
          doc={summaryDoc}
          onBack={() => setSummaryDoc(null)}
          onViewSaved={() => {
            setSummaryDoc(null);
            setShowDocuments(false);
            setShowSummaries(true);
          }}
        />
      );
    }
    if (showSummaries) {
      return <SummariesScreen onBack={() => setShowSummaries(false)} />;
    }
    if (showProfile) {
      return (
        <ProfileScreen
          user={user}
          onBack={() => setShowProfile(false)}
          onUpdateSuccess={(updatedUser) => {
            setUser(updatedUser);
            setShowProfile(false);
          }}
        />
      );
    }
    if (showNotes) {
      return <NotesScreen onBack={() => setShowNotes(false)} />;
    }
    if (showDocuments) {
      return (
        <DocumentsScreen
          onBack={() => setShowDocuments(false)}
          onSummarize={(d) => setSummaryDoc(d)}
          onChat={(d) => setChatTarget({ doc: d, messages: [], conversationId: null })}
        />
      );
    }
    return (
      <HomeScreen
        userEmail={user.email}
        userFullName={user.fullName}
        onLogout={handleLogout}
        onGoToProfile={() => setShowProfile(true)}
        onGoToNotes={() => setShowNotes(true)}
        onGoToDocuments={() => setShowDocuments(true)}
        onGoToSummaries={() => setShowSummaries(true)}
        onGoToConversations={() => setShowConversations(true)}
        onGoToScan={() => setShowScan(true)}
      />
    );
  }

  if (showForgotPassword) {
    return <ForgotPasswordScreen onBackToLogin={() => setShowForgotPassword(false)} />;
  }

  return (
    <AuthScreen
      onLoginSuccess={handleLoginSuccess}
      onForgotPassword={() => setShowForgotPassword(true)}
      onRegisterSuccess={(email) => setPendingVerifyEmail(email)}
    />
  );
}