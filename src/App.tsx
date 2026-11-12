import { HashRouter, Route, Routes } from 'react-router-dom'
import Cliente from './pages/Cliente'
import Intranet from './pages/admin/Intranet'

// HashRouter: funciona en Vercel sin configurar reescrituras de rutas.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Cliente />} />
        <Route path="/intranet/*" element={<Intranet />} />
        <Route path="*" element={<Cliente />} />
      </Routes>
    </HashRouter>
  )
}
