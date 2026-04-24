import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Analyze from './pages/Analyze';
import Chat from './pages/Chat';
import Report from './pages/Report';
import Flowchart from './pages/Flowchart';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #1e3a5f',
            borderRadius: '10px',
            fontSize: '0.875rem',
          },
        }}
      />
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Topbar />
          <main style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/analyze" element={<Analyze />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/report" element={<Report />} />
              <Route path="/flowchart" element={<Flowchart />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
