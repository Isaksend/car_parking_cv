import { useState } from 'react'
import {
    LayoutDashboard,
    ClipboardList,
    Settings,
    ShieldAlert,
    ChevronRight,
    Activity,
    UploadCloud,
} from 'lucide-react'

const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'process', icon: UploadCloud, label: 'Process Files' },
    { id: 'violations', icon: ClipboardList, label: 'Violations Log' },
    { id: 'wanted', icon: ShieldAlert, label: 'Wanted List' },
    { id: 'settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar({ activePage, onNavigate }) {
    const [collapsed, setCollapsed] = useState(false)

    return (
        <aside
            className="flex flex-col transition-all duration-300"
            style={{
                width: collapsed ? '72px' : '240px',
                background: 'var(--bg-secondary)',
                borderRight: '1px solid var(--border-subtle)',
                minHeight: '100vh',
                flexShrink: 0,
            }}
        >
            {/* Logo */}
            <div
                className="flex items-center gap-3 px-4 cursor-pointer select-none"
                style={{ height: '64px', borderBottom: '1px solid var(--border-subtle)' }}
                onClick={() => setCollapsed(c => !c)}
            >
                <div
                    className="flex items-center justify-center rounded-xl flex-shrink-0 glow-primary"
                    style={{
                        width: '38px', height: '38px',
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                    }}
                >
                    <ShieldAlert size={20} color="#fff" />
                </div>
                {!collapsed && (
                    <div>
                        <p className="font-bold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>
                            TrafficAI
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Control System</p>
                    </div>
                )}
            </div>

            {/* Live indicator */}
            {!collapsed && (
                <div
                    className="flex items-center gap-2 mx-3 mt-4 mb-2 px-3 py-2 rounded-lg"
                    style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}
                >
                    <Activity size={14} color="var(--accent-success)" />
                    <span className="text-xs font-medium" style={{ color: 'var(--accent-success)' }}>
                        System Online
                    </span>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 px-2 py-3 flex flex-col gap-1">
                {navItems.map(({ id, icon: Icon, label }) => {
                    const isActive = activePage === id
                    return (
                        <button
                            key={id}
                            id={`nav-${id}`}
                            onClick={() => onNavigate(id)}
                            className="flex items-center gap-3 w-full rounded-xl transition-all duration-200"
                            style={{
                                padding: collapsed ? '10px 12px' : '10px 14px',
                                justifyContent: collapsed ? 'center' : 'flex-start',
                                background: isActive
                                    ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))'
                                    : 'transparent',
                                border: isActive
                                    ? '1px solid rgba(99,102,241,0.35)'
                                    : '1px solid transparent',
                                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                            }}
                            onMouseEnter={e => {
                                if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                            }}
                            onMouseLeave={e => {
                                if (!isActive) e.currentTarget.style.background = 'transparent'
                            }}
                        >
                            <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                            {!collapsed && (
                                <span className="text-sm font-medium flex-1 text-left">{label}</span>
                            )}
                            {!collapsed && isActive && (
                                <ChevronRight size={14} style={{ color: 'var(--accent-primary)' }} />
                            )}
                        </button>
                    )
                })}
            </nav>

            {/* Version */}
            {!collapsed && (
                <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>v1.0.0 — Mock Mode</p>
                </div>
            )}
        </aside>
    )
}
