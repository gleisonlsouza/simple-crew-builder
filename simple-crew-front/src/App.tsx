import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Builder from './pages/Builder';
import SettingsPage from './pages/Settings';
import { useStore } from './store/index';
import { WorkspaceExplorer } from './components/WorkspaceExplorer';

function App() {
  const theme = useStore((state) => state.theme);

  const fetchModels = useStore((state) => state.fetchModels);
  const fetchCredentials = useStore((state) => state.fetchCredentials);
  const fetchMCPServers = useStore((state) => state.fetchMCPServers);
  const fetchCustomTools = useStore((state) => state.fetchCustomTools);
  const fetchWorkspaces = useStore((state) => state.fetchWorkspaces);
  const fetchSettings = useStore((state) => state.fetchSettings);

  useEffect(() => {
    fetchModels();
    fetchCredentials();
    fetchMCPServers();
    fetchCustomTools();
    fetchWorkspaces();
    fetchSettings();
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme, fetchModels, fetchCredentials, fetchMCPServers, fetchWorkspaces, fetchSettings]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/workflow/:id" element={<Builder />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <WorkspaceExplorer />
    </BrowserRouter>
  );
}

export default App;
