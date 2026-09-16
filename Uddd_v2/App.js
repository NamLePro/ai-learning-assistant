import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import NotesScreen from './screens/NotesScreen';

export default function App() {
  const [user, setUser] = useState(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    setUser(null);
    setShowNotes(false);
  };

  if (user) {
    if (showNotes) {
      return <NotesScreen onBack={() => setShowNotes(false)} />;
    }
    return (
      <HomeScreen
        userEmail={user.email}
        userFullName={user.fullName}
        onLogout={handleLogout}
        onUpdateSuccess={(updatedUser) => setUser(updatedUser)}
        onGoToNotes={() => setShowNotes(true)}
      />
    );
  }

  if (showForgotPassword) {
    return (
      <ForgotPasswordScreen onBackToLogin={() => setShowForgotPassword(false)} />
    );
  }

  return (
    <AuthScreen
      onLoginSuccess={(userData) => setUser(userData)}
      onForgotPassword={() => setShowForgotPassword(true)}
    />
  );
}