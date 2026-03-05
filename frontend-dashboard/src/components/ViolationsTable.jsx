import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, AlertTriangle, Inbox, Zap } from 'lucide-react'
import ViolationModal from './ViolationModal'

const BACKEND_URL = 'http://127.0.0.1:8000/api/violations'
const POLL_INTERVAL_MS = 8000

function SpeedBadge({ speed }) {
    const danger = speed > 60
    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${danger ? 'speed-danger' : ''}`}
            style={{
                background: danger ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.12)',
                color: danger ? 'var(--accent-danger)' : 'var(--accent-success)',
                border: `1px solid ${danger ? 'rgba(239,68,68,0.35)' : 'rgba(16,185,129,0.3)'}`,
            }}
        >
            {danger && <Zap size={10} />}
            {speed} km/h
        </span>
    )
}

function TypeBadge({ type }) {
    const colorMap = {
        'Speeding': { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
        'Wrong Parking': { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
        'Red Light Jump': { bg: 'rgba(168,85,247,0.12)', color: '#a855f7', border: 'rgba(168,85,247,0.3)' },
    }
    const c = colorMap[type] ?? { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8', border: 'rgba(148,163,184,0.3)' }
    return (
        <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
        >
            {type}
        </span>
    )
}

export default function ViolationsTable() {
    const [violations, setViolations] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selected, setSelected] = useState(null)
    const [lastRefresh, setLastRefresh] = useState(null)
    const [isRefreshing, setIsRefreshing] = useState(false)

    const fetchViolations = useCallback(async (showSpinner = true) => {
        if (showSpinner) setIsRefreshing(true)
        try {
            const res = await fetch(BACKEND_URL)
            if (!res.ok) throw new Error(`Backend responded with ${res.status}`)
            const data = await res.json()
            setViolations(data)
            setError(null)
            setLastRefresh(new Date())
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
            setIsRefreshing(false)
        }
    }, [])

    // Initial load
    useEffect(() => { fetchViolations() }, [fetchViolations])

    // Auto-poll
    useEffect(() => {
        const id = setInterval(() => fetchViolations(false), POLL_INTERVAL_MS)
        return () => clearInterval(id)
    }, [fetchViolations])

    const cols = ['Date & Time', 'Plate Number', 'Speed', 'Type']

    return (
        <>
            <div className="flex flex-col gap-4 h-full">
                {/* Table Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                            Violations Log
                        </h2>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {lastRefresh ? `Last updated ${lastRefresh.toLocaleTimeString()}` : 'Loading…'}
                            &nbsp;·&nbsp;Auto-refreshes every {POLL_INTERVAL_MS / 1000}s
                        </p>
                    </div>
                    <button
                        id="refresh-violations-btn"
                        onClick={() => fetchViolations()}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                        style={{
                            background: 'rgba(99,102,241,0.12)',
                            color: 'var(--accent-primary)',
                            border: '1px solid rgba(99,102,241,0.25)',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.22)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.12)'}
                    >
                        <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

                {/* Table card */}
                <div className="rounded-2xl glass-card overflow-hidden flex-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-3">
                            <div
                                className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                                style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}
                            />
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                Connecting to backend…
                            </p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-3">
                            <AlertTriangle size={36} style={{ color: 'var(--accent-danger)' }} />
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                Could not fetch violations
                            </p>
                            <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-muted)' }}>
                                {error}
                                <br />Make sure the backend is running on port 8000.
                            </p>
                            <button
                                onClick={() => fetchViolations()}
                                className="mt-2 px-4 py-2 rounded-lg text-xs font-semibold"
                                style={{ background: 'rgba(99,102,241,0.2)', color: 'var(--accent-primary)' }}
                            >
                                Retry
                            </button>
                        </div>
                    ) : violations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-3">
                            <Inbox size={36} style={{ color: 'var(--text-muted)' }} />
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                No violations recorded yet
                            </p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                Call <code style={{ color: 'var(--accent-primary)' }}>POST /process-violation</code> on the ML service
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                        {cols.map(col => (
                                            <th
                                                key={col}
                                                className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                                                style={{ color: 'var(--text-muted)' }}
                                            >
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {violations.map((v, i) => (
                                        <tr
                                            key={v.id}
                                            id={`violation-row-${v.id}`}
                                            className="row-animate cursor-pointer transition-colors duration-150"
                                            style={{
                                                borderBottom: '1px solid rgba(30,41,59,0.8)',
                                                animationDelay: `${i * 30}ms`,
                                                animationFillMode: 'both',
                                            }}
                                            onClick={() => setSelected(v)}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td className="px-5 py-3.5" style={{ color: 'var(--text-secondary)' }}>
                                                <div className="text-xs leading-relaxed">
                                                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                                        {new Date(v.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                                                    </div>
                                                    <div>{new Date(v.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span
                                                    className="font-mono font-bold text-sm"
                                                    style={{ color: 'var(--text-primary)', letterSpacing: '0.05em' }}
                                                >
                                                    {v.plate_number}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <SpeedBadge speed={v.speed} />
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <TypeBadge type={v.violation_type} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Row count footer */}
                            <div
                                className="px-5 py-3 text-xs"
                                style={{
                                    color: 'var(--text-muted)',
                                    borderTop: '1px solid var(--border-subtle)',
                                    background: 'rgba(15,23,42,0.5)',
                                }}
                            >
                                Showing {violations.length} violation{violations.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {selected && (
                <ViolationModal violation={selected} onClose={() => setSelected(null)} />
            )}
        </>
    )
}
