import React, { useState, useEffect } from 'react';
import AdminMobileApp from './AdminMobileApp';
import CitizenMobileApp from './CitizenMobileApp';
import PoliceLoginGate from './PoliceLoginGate';
import { toast } from 'react-hot-toast';

export default function MobileFieldApp() {
  const [isPoliceAuth, setIsPoliceAuth] = useState(() => {
    return localStorage.getItem('mobile_police_auth') === 'true';
  });

  const [activeMode, setActiveMode] = useState(() => {
    const intent = localStorage.getItem('mobile_role_intent');
    const isAuthed = localStorage.getItem('mobile_police_auth') === 'true';
    return (intent === 'officer' && isAuthed) ? 'admin' : 'citizen';
  });

  const [showPoliceGate, setShowPoliceGate] = useState(() => {
    const intent = localStorage.getItem('mobile_role_intent');
    const isAuthed = localStorage.getItem('mobile_police_auth') === 'true';
    return intent === 'officer' && !isAuthed;
  });

  // When Police authentication succeeds
  const handlePoliceAuthenticated = (user) => {
    setIsPoliceAuth(true);
    setActiveMode('admin');
    setShowPoliceGate(false);
    localStorage.setItem('mobile_police_auth', 'true');
    localStorage.setItem('mobile_role_intent', 'officer');
  };

  // When Police signs out
  const handlePoliceSignOut = () => {
    setIsPoliceAuth(false);
    setActiveMode('citizen');
    setShowPoliceGate(false);
    localStorage.removeItem('mobile_police_auth');
    localStorage.setItem('mobile_role_intent', 'citizen');
    toast.success('Officer Duty Session Closed. Switched to Citizen Mode.');
  };

  // When Citizen requests to open Police Login
  const handleOpenPoliceGate = () => {
    if (isPoliceAuth) {
      setActiveMode('admin');
    } else {
      setShowPoliceGate(true);
    }
  };

  return (
    <div className="w-full h-full">
      {showPoliceGate ? (
        <PoliceLoginGate
          onAuthenticated={handlePoliceAuthenticated}
          onCancel={() => {
            setShowPoliceGate(false);
            setActiveMode('citizen');
            localStorage.setItem('mobile_role_intent', 'citizen');
          }}
        />
      ) : activeMode === 'admin' && isPoliceAuth ? (
        <AdminMobileApp onSwitchToCitizen={handlePoliceSignOut} />
      ) : (
        <CitizenMobileApp onSwitchToAdmin={handleOpenPoliceGate} />
      )}
    </div>
  );
}
