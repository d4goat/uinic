import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import Login from './pages/Login';
import Beranda from './pages/Beranda';
import Landing from './pages/Landing';
import SiswaList from './pages/guru/SiswaList';
import Asesmen from './pages/guru/Asesmen';
import PpiEditor from './pages/guru/PpiEditor';
import SesiLog from './pages/guru/SesiLog';
import OrangTuaView from './pages/orangtua/OrangTuaView';
import Transfer from './pages/koordinator/Transfer';
import Audit from './pages/koordinator/Audit';
import MateriAksesibel from './pages/MateriAksesibel';
import ModeSiswa from './pages/ModeSiswa';
import ApiDocs from './pages/ApiDocs';
import { Berjaga, koordinator, penyusun, staf, wali } from './auth/ProtectedRoute';
import { useAuth } from './auth/AuthContext';
import GalatSesi from './components/GalatSesi';

function GerbangUtama() {
  const { profil, siap, galat, segarkan } = useAuth();
  if (!siap) return <main className="wadah"><p className="hint">Memuat…</p></main>;
  if (galat) return <GalatSesi galat={galat} segarkan={segarkan} />;
  if (!profil) return <Landing />;
  return (
    <AppShell>
      <Beranda />
    </AppShell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<GerbangUtama />} />
      <Route path="/login" element={<Login />} />
      <Route element={<AppShell />}>
        <Route path="/siswa" element={<Berjaga peran={staf}><SiswaList /></Berjaga>} />
        <Route path="/siswa/:id/asesmen" element={<Berjaga peran={penyusun}><Asesmen /></Berjaga>} />
        <Route path="/siswa/:id/ppi" element={<Berjaga peran={penyusun}><PpiEditor /></Berjaga>} />
        <Route path="/ppi/:id/sesi" element={<Berjaga peran={penyusun}><SesiLog /></Berjaga>} />
        <Route path="/materi" element={<Berjaga peran={penyusun}><MateriAksesibel /></Berjaga>} />
        <Route path="/mode-siswa/:id" element={<Berjaga peran={penyusun}><ModeSiswa /></Berjaga>} />
        <Route path="/orangtua" element={<Berjaga peran={wali}><OrangTuaView /></Berjaga>} />
        <Route path="/orangtua/:id" element={<Berjaga peran={wali}><OrangTuaView /></Berjaga>} />
        <Route path="/koordinator" element={<Berjaga peran={koordinator}><Transfer /></Berjaga>} />
        <Route path="/audit" element={<Berjaga peran={koordinator}><Audit /></Berjaga>} />
        <Route path="/api-docs" element={<ApiDocs />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
