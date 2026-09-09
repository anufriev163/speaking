import React, { useState, useEffect } from 'react';
import { FloatingHud } from './components/hud/FloatingHud';
import { SettingsView } from './components/settings/SettingsView';

export const App: React.FC = () => {
  const [route, setRoute] = useState<string>(() => {
    return window.location.hash.includes('settings') ? 'settings' : 'hud';
  });

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash.includes('settings') ? 'settings' : 'hud');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  if (route === 'settings') {
    return <SettingsView />;
  }

  return <FloatingHud />;
};

export default App;
