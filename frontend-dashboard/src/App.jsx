import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
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
  Trash2,
  Plus
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
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return

    setLoading(true)
    setElapsedTime(0)
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

        {loading && (
          <div className="w-full max-w-md flex flex-col gap-2 mt-2">
            <div className="flex justify-between items-center text-xs" style={{ color: 'var(--text-muted)' }}>
              <span className="flex items-center gap-1 font-semibold">
                <Loader2 size={12} className="animate-spin" />
                {file?.type?.includes('video') ? "Analyzing video frames (GPU)..." : "Processing image (GPU)..."}
              </span>
              <span className="flex items-center gap-1 font-mono font-bold text-indigo-400">
                <Clock size={12} /> {elapsedTime}s
              </span>
            </div>

            <div className="w-full h-1.5 rounded-full overflow-hidden relative" style={{ background: 'var(--bg-primary)' }}>
              {/* Indeterminate pulsing bar */}
              <div
                className="absolute top-0 left-0 h-full rounded-full animate-pulse transition-all duration-1000 ease-out"
                style={{
                  width: `${Math.min((elapsedTime / (file?.type?.includes('video') ? 25 : 5)) * 100, 95)}%`,
                  background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))'
                }}
              />
            </div>
          </div>
        )}

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
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-emerald-400 font-medium">Recorded {result.count || 1} unique vehicle(s)</p>
                  <span className="text-[10px] text-emerald-500 font-mono italic">in {elapsedTime}s</span>
                </div>
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

// ─── Page: Wanted List ────────────────────────────────────────────────────────
function WantedPage() {
  const [wantedList, setWantedList] = useState([])
  const [loading, setLoading] = useState(true)
  const [newPlate, setNewPlate] = useState('')
  const [newReason, setNewReason] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const fetchWanted = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/wanted')
      const data = await res.json()
      setWantedList(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWanted()
  }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!newPlate.trim() || !newReason.trim()) return

    try {
      const resp = await fetch('http://127.0.0.1:8000/api/wanted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plate_number: newPlate.trim(),
          reason: newReason.trim(),
        })
      })
      if (!resp.ok) {
        const d = await resp.json()
        throw new Error(d.detail || 'Failed to add record')
      }
      setSuccess('Vehicle added to wanted list!')
      setNewPlate('')
      setNewReason('')
      fetchWanted()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRemove = async (plate) => {
    if (!window.confirm(`Remove ${plate} from wanted list?`)) return
    try {
      const resp = await fetch(`http://127.0.0.1:8000/api/wanted/${plate}`, { method: 'DELETE' })
      if (!resp.ok) throw new Error('Delete failed')
      fetchWanted()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="flex-1 overflow-auto flex flex-col gap-6" style={{ padding: '24px' }}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-red-500">
          Wanted List
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Vehicles matching this list will trigger a high-priority alarm and Telegram notification
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="glass-card rounded-2xl p-6 h-fit md:col-span-1">
          <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Add New Target</h2>
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-secondary)' }}>Plate Number</label>
              <input
                type="text"
                placeholder="e.g. A123BC77"
                value={newPlate}
                onChange={e => setNewPlate(e.target.value.toUpperCase())}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors uppercase"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-secondary)' }}>Reason</label>
              <input
                type="text"
                placeholder="e.g. Suspected in hit and run"
                value={newReason}
                onChange={e => setNewReason(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            {success && <p className="text-xs text-emerald-400">{success}</p>}
            <button
              type="submit"
              className="flex justify-center items-center gap-2 w-full mt-2 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-xl transition-colors"
            >
              <Plus size={16} /> Add to Watchlist
            </button>
          </form>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden md:col-span-2">
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>
          ) : wantedList.length === 0 ? (
            <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
              No vehicles currently on the watchlist.
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--text-secondary)' }} className="text-xs uppercase tracking-wider">
                    <th className="py-3 px-6 font-medium">Plate Number</th>
                    <th className="py-3 px-6 font-medium">Reason</th>
                    <th className="py-3 px-6 font-medium">Added On</th>
                    <th className="py-3 px-6 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {wantedList.map((veh) => (
                    <tr key={veh.id} className="border-t border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-6 font-bold text-red-400 tracking-wider font-mono">{veh.plate_number}</td>
                      <td className="py-3 px-6 text-slate-300">{veh.reason}</td>
                      <td className="py-3 px-6 text-slate-400 text-xs">{new Date(veh.created_at).toLocaleString()}</td>
                      <td className="py-3 px-6">
                        <button
                          onClick={() => handleRemove(veh.plate_number)}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                          title="Remove from list"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
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
            {activePage === 'wanted' && '🎯 Wanted List'}
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
        {activePage === 'wanted' && <WantedPage />}
        {activePage === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}
