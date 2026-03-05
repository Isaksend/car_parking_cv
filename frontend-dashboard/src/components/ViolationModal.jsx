import { useEffect, useRef } from 'react'
import { X, Car, Gauge, Tag, Clock, Camera } from 'lucide-react'

function DetailRow({ icon: Icon, label, value, valueStyle = {} }) {
    return (
        <div
            className="flex items-start gap-3 py-3"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
            <div
                className="rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                    width: '34px', height: '34px',
                    background: 'rgba(99,102,241,0.12)',
                    border: '1px solid rgba(99,102,241,0.2)',
                }}
            >
                <Icon size={15} color="var(--accent-primary)" />
            </div>
            <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', ...valueStyle }}>
                    {value}
                </p>
            </div>
        </div>
    )
}

export default function ViolationModal({ violation, onClose }) {
    const overlayRef = useRef(null)

    // Close on Escape key
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose])

    if (!violation) return null

    const speedOver = violation.speed > 60
    const formattedDate = new Date(violation.created_at).toLocaleString('en-US', {
        dateStyle: 'long', timeStyle: 'medium',
    })

    return (
        <div
            ref={overlayRef}
            id="violation-modal-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
        >
            <div
                id="violation-modal-panel"
                className="rounded-2xl glass-card modal-enter w-full max-w-lg overflow-hidden"
                style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-6 py-4"
                    style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.08))',
                    }}
                >
                    <div>
                        <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                            Violation Details
                        </h2>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            ID: {violation.id.slice(0, 8)}…
                        </p>
                    </div>
                    <button
                        id="modal-close-btn"
                        onClick={onClose}
                        className="rounded-lg p-1.5 transition-colors"
                        style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Vehicle Photo */}
                <div className="px-6 pt-5">
                    <p className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                        <Camera size={13} />
                        CAPTURED IMAGE
                    </p>
                    <div
                        className="rounded-xl overflow-hidden flex items-center justify-center"
                        style={{
                            height: '180px',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-subtle)',
                        }}
                    >
                        {violation.photo_base64 ? (
                            <img
                                src={`data:image/png;base64,${violation.photo_base64}`}
                                alt="Vehicle capture"
                                className="w-full h-full object-contain"
                                style={{ imageRendering: 'pixelated' }}
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <Camera size={32} style={{ color: 'var(--text-muted)' }} />
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No image available</span>
                            </div>
                        )}
                    </div>
                    <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                        * In production this will show the cropped vehicle frame from the CCTV feed
                    </p>
                </div>

                {/* Details */}
                <div className="px-6 pb-2 mt-4">
                    <DetailRow icon={Car} label="Plate Number" value={violation.plate_number} />
                    <DetailRow
                        icon={Gauge}
                        label="Measured Speed"
                        value={`${violation.speed} km/h`}
                        valueStyle={speedOver ? { color: 'var(--accent-danger)' } : { color: 'var(--accent-success)' }}
                    />
                    <DetailRow icon={Tag} label="Violation Type" value={violation.violation_type} />
                    <DetailRow icon={Clock} label="Date & Time" value={formattedDate} />
                </div>

                {/* Footer CTA */}
                <div className="px-6 py-4">
                    <button
                        id="modal-dismiss-btn"
                        onClick={onClose}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                        style={{
                            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                            color: '#fff',
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
