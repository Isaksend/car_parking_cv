import { useState } from 'react'
import {
    LayoutDashboard,
    ShieldAlert,
    TrendingUp,
    Car,
    Clock,
    Activity,
} from 'lucide-react'
import ViolationsTable from '../components/ViolationsTable'

function StatCard({ icon: Icon, label, value, color, glow }) {
    return (
        <div
            className="glass-card rounded-2xl p-5 flex items-center gap-4 transition-transform duration-200 hover:scale-[1.02]"
            style={glow ? { boxShadow: `0 0 24px ${glow}` } : {}}
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

export default function Dashboard() {
    const [activePage, setActivePage] = useState('dashboard')

    const isDashboard = activePage === 'dashboard'
    const isViolations = activePage === 'violations'
    const isSettings = activePage === 'settings'

    return (
        <div className="flex-1 overflow-auto p-6 flex flex-col gap-6">
            {/* ── DASHBOARD VIEW ── */}
            {isDashboard && (
                <>
                    {/* Page title */}
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                            Traffic Control Dashboard
                        </h1>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                            Real-time overview of violations and system health
                        </p>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        <StatCard icon={ShieldAlert} label="Total Violations" value="—" color="#ef4444" glow="rgba(239,68,68,0.2)" />
                        <StatCard icon={TrendingUp} label="Avg Speed (km/h)" value="—" color="#f59e0b" />
                        <StatCard icon={Car} label="Plates Identified" value="—" color="#6366f1" glow="rgba(99,102,241,0.2)" />
                        <StatCard icon={Activity} label="System Uptime" value="99%" color="#10b981" />
                    </div>

                    {/* Prompt to navigate */}
                    <div
                        className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center gap-4 flex-1 cursor-pointer transition-all duration-200"
                        style={{ minHeight: '240px', border: '1px dashed var(--border-subtle)' }}
                        onClick={() => setActivePage('violations')}
                    >
                        <div
                            className="rounded-2xl p-5"
                            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))' }}
                        >
                            <LayoutDashboard size={40} style={{ color: 'var(--accent-primary)' }} />
                        </div>
                        <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                            Open Violations Log
                        </p>
                        <p className="text-sm text-center max-w-sm" style={{ color: 'var(--text-muted)' }}>
                            Click here (or use the sidebar) to view all recorded traffic violations and their full details.
                        </p>
                    </div>
                </>
            )}

            {/* ── VIOLATIONS VIEW ── */}
            {isViolations && (
                <>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                            Violations Log
                        </h1>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                            All detected traffic violations — click a row to view details
                        </p>
                    </div>
                    <ViolationsTable />
                </>
            )}

            {/* ── SETTINGS VIEW ── */}
            {isSettings && (
                <>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                            Settings
                        </h1>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                            System configuration and ML pipeline parameters
                        </p>
                    </div>
                    <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
                        {[
                            { label: 'Backend API URL', value: 'http://127.0.0.1:8000' },
                            { label: 'ML Service URL', value: 'http://127.0.0.1:8001' },
                            { label: 'Speed Limit (km/h)', value: '60' },
                            { label: 'Auto-refresh Interval', value: '8 seconds' },
                            { label: 'Detection Mode', value: 'Mock (YOLOv8 pending)' },
                            { label: 'OCR Engine', value: 'Mock (EasyOCR pending)' },
                        ].map(({ label, value }) => (
                            <div
                                key={label}
                                className="flex items-center justify-between py-3"
                                style={{ borderBottom: '1px solid var(--border-subtle)' }}
                            >
                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                                <span
                                    className="font-mono text-xs px-3 py-1 rounded-lg"
                                    style={{ background: 'var(--bg-primary)', color: 'var(--accent-primary)' }}
                                >
                                    {value}
                                </span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

export { Dashboard as default }
// Export setter for Sidebar navigation (lifted to App.jsx)
export { }
