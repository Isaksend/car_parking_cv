import { useState } from 'react'
import Sidebar from './components/Sidebar'
import ViolationsTable from './components/ViolationsTable'
import {
  LayoutDashboard,
  ShieldAlert,
  TrendingUp,
  Car,
  Activity,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'

// ─── Stat Card (used in Dashboard view) ────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, glow }) {
  return (
    <div
      className="glass-card rounded-2xl flex items-center gap-4 transition-transform duration-200"
      style={{
        padding: '20px',
        ...(glow ? { boxShadow: `0 0 24px ${glow}` } : {})
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div
        className="flex items-center justify-center rounded-xl flex-shrink-0"
        style={{ width: '48px', height: '48px', background: `${color}20`, border: `1px solid ${color}40` }}
      >
        <Icon size={22} color={color} />
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      </div>
    </div>
  )
}

// ─── Page: Dashboard Overview ───────────────────────────────────────────────
function DashboardPage({ onNavigate }) {
  return (
    <div className="flex-1 overflow-auto flex flex-col gap-6" style={{ padding: '24px' }}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Traffic Control Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Real-time overview of violations and system health
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <StatCard icon={ShieldAlert} label="Total Violations" value="Live" color="#ef4444" glow="rgba(239,68,68,0.18)" />
        <StatCard icon={TrendingUp} label="Speed Limit (km/h)" value="60" color="#f59e0b" />
        <StatCard icon={Car} label="Detection Mode" value="Mock" color="#6366f1" glow="rgba(99,102,241,0.18)" />
        <StatCard icon={Activity} label="System Status" value="Online" color="#10b981" />
      </div>

      {/* Banner linking to violations */}
      <div
        id="dashboard-goto-violations"
        className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200"
        style={{ minHeight: '220px', border: '1px dashed var(--border-subtle)' }}
        onClick={() => onNavigate('violations')}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
      >
        <div
          className="rounded-2xl p-5"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.10))' }}
        >
          <LayoutDashboard size={40} style={{ color: 'var(--accent-primary)' }} />
        </div>
        <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Open Violations Log →
        </p>
        <p className="text-sm text-center max-w-sm" style={{ color: 'var(--text-muted)' }}>
          View all recorded traffic violations and click any row to inspect full details including the vehicle capture photo.
        </p>
      </div>
    </div>
  )
}

// ─── Page: Process (File Upload) ───────────────────────────────────────────
function ProcessPage() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return

    setLoading(true)
    setResult(null)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const resp = await fetch('http://127.0.0.1:8001/process-file', {
        method: 'POST',
        body: formData,
      })

      const data = await resp.json()
      if (data.status === 'success') {
        setResult(data)
      } else {
        setError(data.message || 'No detection found in this file.')
      }
    } catch (err) {
      setError('Communication with ML Service failed. Make sure it is running on port 8001.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 overflow-auto flex flex-col gap-6" style={{ padding: '24px' }}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Process Media
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Upload car images or videos to detect license plates and record violations
        </p>
      </div>

      <div className="glass-card rounded-2xl flex flex-col items-center gap-6" style={{ padding: '32px' }}>
        <div
          className="w-full max-w-md border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 transition-all"
          style={{
            padding: '40px',
            borderColor: file ? 'var(--accent-success)' : 'var(--border-subtle)',
            background: file ? 'rgba(16,185,129,0.05)' : 'transparent'
          }}
        >
          <div className="p-4 rounded-full" style={{ background: 'rgba(99,102,241,0.1)' }}>
            <UploadCloud size={32} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {file ? file.name : 'Select or drop file'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Support JPG, PNG, MP4, AVI
            </p>
          </div>
          <input
            type="file"
            className="hidden"
            id="file-upload"
            accept="image/*,video/*"
            onChange={(e) => setFile(e.target.files[0])}
          />
          <label
            htmlFor="file-upload"
            className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          >
            Browse Files
          </label>
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed grow-on-hover"
          style={{
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
          }}
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Processing...
            </>
          ) : (
            'Analyze & Record'
          )}
        </button>

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl w-full max-w-md" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertCircle size={20} color="#ef4444" />
            <p className="text-xs font-medium text-red-400">{error}</p>
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-6 rounded-2xl w-full max-w-md" style={{ padding: '24px', background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(10px)' }}>
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="text-emerald-500" />
              <div>
                <p className="text-sm font-bold text-white uppercase tracking-widest">Detection Successful</p>
                <p className="text-[10px] text-emerald-400 font-medium">Recorded {result.count || 1} unique vehicle(s)</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Detected Plates</p>
              <div className="flex flex-col gap-2">
                {(result.detections || [{ plate: result.plate }]).map((det, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl transition-all hover:bg-white/5 group border border-transparent hover:border-white/10"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-indigo-400 border border-indigo-500/20 bg-indigo-500/5">
                        #{idx + 1}
                      </div>
                      <span className="font-mono text-lg font-bold text-white tracking-widest group-hover:text-indigo-400 transition-colors">
                        {det.plate}
                      </span>
                    </div>
                    {det.backend_id && (
                      <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20 uppercase">
                        Recorded
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 mt-2">
              <p className="text-[9px] text-center text-muted-foreground italic">
                All unique detections have been automatically pushed to the Violations Log.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
function ViolationsPage() {
  return (
    <div className="flex-1 overflow-auto flex flex-col gap-6" style={{ padding: '24px' }}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Violations Log
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          All detected traffic violations — click a row to view full details
        </p>
      </div>
      <ViolationsTable />
    </div>
  )
}

// ─── Page: Settings ─────────────────────────────────────────────────────────
function SettingsPage() {
  const settings = [
    { label: 'Backend API URL', value: 'http://127.0.0.1:8000' },
    { label: 'ML Service URL', value: 'http://127.0.0.1:8001' },
    { label: 'Speed Violation Limit', value: '60 km/h' },
    { label: 'Dashboard Auto-refresh', value: '8 seconds' },
    { label: 'Detection Engine', value: 'Mock → YOLOv8 ONNX (pending)' },
    { label: 'OCR Engine', value: 'Mock → EasyOCR (pending)' },
    { label: 'Database', value: 'SQLite (dev) / PostgreSQL (prod)' },
  ]
  return (
    <div className="flex-1 overflow-auto flex flex-col gap-6" style={{ padding: '24px' }}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          System configuration and ML pipeline parameters
        </p>
      </div>
      <div className="glass-card rounded-2xl overflow-hidden">
        {settings.map(({ label, value }, i) => (
          <div
            key={label}
            className="flex items-center justify-between px-6 py-4"
            style={{
              borderBottom: i < settings.length - 1 ? '1px solid var(--border-subtle)' : 'none',
            }}
          >
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
            <span
              className="font-mono text-xs px-3 py-1.5 rounded-lg"
              style={{
                background: 'var(--bg-primary)',
                color: 'var(--accent-primary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── App Root ───────────────────────────────────────────────────────────────
export default function App() {
  const [activePage, setActivePage] = useState('dashboard')

  return (
    <div className="flex" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      {/* Main content area */}
      <main className="flex-1 flex flex-col" style={{ minHeight: '100vh' }}>
        {/* Top bar */}
        <header
          className="flex items-center justify-between"
          style={{
            height: '64px',
            paddingLeft: '24px',
            paddingRight: '24px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(15,23,42,0.8)',
            backdropFilter: 'blur(8px)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {activePage === 'dashboard' && '🏠 Overview'}
            {activePage === 'process' && '☁️ Process Media'}
            {activePage === 'violations' && '🚨 Violations Log'}
            {activePage === 'settings' && '⚙️ Settings'}
          </p>
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--accent-success)', boxShadow: '0 0 6px var(--accent-success)' }}
            />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>All Systems Operational</span>
          </div>
        </header>

        {/* Page router */}
        {activePage === 'dashboard' && <DashboardPage onNavigate={setActivePage} />}
        {activePage === 'process' && <ProcessPage />}
        {activePage === 'violations' && <ViolationsPage />}
        {activePage === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}
