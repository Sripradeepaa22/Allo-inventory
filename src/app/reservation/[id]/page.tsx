'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ReservationDetail } from '@/lib/schemas';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

function ToastNotification({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const colors = {
    success: { bg: 'var(--success-light)', border: '#A7F3D0', text: 'var(--success)' },
    error: { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B' },
    info: { bg: 'var(--info-light)', border: '#BFDBFE', text: 'var(--info)' },
  };
  const c = colors[toast.type];

  return (
    <div style={{
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: 'var(--radius-sm)',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      boxShadow: 'var(--shadow-md)',
      animation: 'slideInRight 0.3s ease',
    }}>
      <span style={{ fontSize: '14px', fontWeight: 500, color: c.text }}>{toast.message}</span>
      <button onClick={() => onRemove(toast.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, padding: 0, marginLeft: 'auto' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}

export default function ReservationPage({ params }: { params: { id: string } }) {
  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<'confirm' | 'cancel' | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const router = useRouter();

  const addToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const fetchReservation = useCallback(async () => {
    try {
      const res = await fetch(`/api/reservations/${params.id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReservation(data);
    } catch {
      addToast('Failed to load reservation details.', 'error');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchReservation();
  }, [fetchReservation]);

  // Live countdown
  useEffect(() => {
    if (!reservation?.expiresAt || reservation.status !== 'PENDING') return;

    const tick = () => {
      const diff = new Date(reservation.expiresAt).getTime() - Date.now();
      setTimeLeft(Math.max(0, Math.floor(diff / 1000)));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [reservation]);

  const handleConfirm = async () => {
    setActionLoading('confirm');
    try {
      const idempotencyKey = `confirm-${params.id}-${Date.now()}`;
      const res = await fetch(`/api/reservations/${params.id}/confirm`, {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
      });

      if (res.status === 410) {
        const data = await res.json();
        addToast(data.error || 'Reservation expired. Hold released.', 'error');
        await fetchReservation();
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        addToast(data.error || 'Failed to confirm.', 'error');
        return;
      }

      const data = await res.json();
      setReservation(data);
      addToast('🎉 Purchase confirmed! Thank you.', 'success');
    } catch {
      addToast('Network error. Please try again.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    setActionLoading('cancel');
    try {
      const res = await fetch(`/api/reservations/${params.id}/release`, { method: 'POST' });

      if (!res.ok) {
        const data = await res.json();
        addToast(data.error || 'Failed to cancel.', 'error');
        return;
      }

      addToast('Reservation cancelled. Stock has been released.', 'info');
      const data = await res.json();
      setReservation(data);
    } catch {
      addToast('Network error. Please try again.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const isExpired = timeLeft === 0 && reservation?.status === 'PENDING';
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');
  const urgentTime = timeLeft > 0 && timeLeft <= 60;
  const progressPct = reservation?.expiresAt
    ? (timeLeft / 600) * 100
    : 0;

  if (loading) {
    return (
      <div style={{ maxWidth: '560px', margin: '60px auto', padding: '0 24px' }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '32px', border: '1px solid var(--border)' }}>
          {[80, 50, 90, 60, 40].map((w, i) => (
            <div key={i} className="shimmer" style={{ height: '20px', borderRadius: '6px', width: `${w}%`, marginBottom: '16px' }} />
          ))}
        </div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div style={{ maxWidth: '560px', margin: '60px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '16px' }}>Reservation not found.</div>
        <button onClick={() => router.push('/')} style={{
          marginTop: '20px',
          background: 'var(--accent)', color: 'white', border: 'none',
          borderRadius: 'var(--radius-sm)', padding: '12px 24px', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: '14px', fontWeight: 600,
        }}>
          Back to Products
        </button>
      </div>
    );
  }

  const statusConfig = {
    PENDING: { label: isExpired ? 'Expired' : 'Pending', bg: isExpired ? '#FEF2F2' : 'var(--warning-light)', text: isExpired ? '#991B1B' : 'var(--warning)', dot: isExpired ? '#DC2626' : '#D97706' },
    CONFIRMED: { label: 'Confirmed', bg: 'var(--success-light)', text: 'var(--success)', dot: '#059669' },
    RELEASED: { label: 'Released', bg: 'var(--bg-subtle)', text: 'var(--text-muted)', dot: '#9CA3AF' },
  };
  const status = statusConfig[reservation.status];

  return (
    <div className="page-enter" style={{ maxWidth: '560px', margin: '40px auto', padding: '0 24px 60px' }}>
      {/* Toast container */}
      <div style={{ position: 'fixed', top: '80px', right: '24px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '380px' }}>
        {toasts.map(t => <ToastNotification key={t.id} toast={t} onRemove={removeToast} />)}
      </div>

      {/* Back link */}
      <button
        onClick={() => router.push('/')}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
          gap: '6px', color: 'var(--text-secondary)', fontSize: '14px', fontFamily: 'inherit',
          fontWeight: 500, padding: '0', marginBottom: '24px',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Back to products
      </button>

      <h1 className="font-display" style={{ fontSize: '28px', letterSpacing: '-0.3px', marginBottom: '24px', color: 'var(--text-primary)' }}>
        Your Reservation
      </h1>

      {/* Main card */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
        overflow: 'hidden',
      }}>
        {/* Status header */}
        <div style={{
          padding: '20px 24px',
          background: status.bg,
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: status.dot }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: status.text, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {status.label}
            </span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            #{params.id.slice(-8).toUpperCase()}
          </span>
        </div>

        {/* Product details */}
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Product</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{reservation.product?.name}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Warehouse</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{reservation.warehouse?.name}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Quantity</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{reservation.quantity} unit{reservation.quantity !== 1 ? 's' : ''}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Amount</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                ₹{((reservation.product?.price || 0) * reservation.quantity).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Countdown — only for PENDING */}
          {reservation.status === 'PENDING' && (
            <div style={{
              background: isExpired ? '#FEF2F2' : urgentTime ? '#FFF7ED' : 'var(--bg-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '20px',
              border: `1px solid ${isExpired ? '#FECACA' : urgentTime ? '#FED7AA' : 'var(--border)'}`,
              marginBottom: '8px',
            }}>
              {!isExpired && (
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Time remaining to complete purchase</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: urgentTime ? '#C2410C' : 'var(--text-secondary)' }}>{urgentTime ? 'Expiring soon!' : '10 min hold'}</span>
                    </div>
                    <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${progressPct}%`,
                        background: urgentTime ? '#C2410C' : 'var(--accent)',
                        borderRadius: '2px',
                        transition: 'width 1s linear',
                      }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <span
                      className={urgentTime ? 'countdown-urgent' : ''}
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '42px',
                        fontWeight: 700,
                        letterSpacing: '-2px',
                        color: urgentTime ? 'var(--accent)' : 'var(--text-primary)',
                        lineHeight: 1,
                      }}
                    >
                      {mins}:{secs}
                    </span>
                  </div>
                </>
              )}
              {isExpired && (
                <div style={{ textAlign: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px' }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#991B1B', margin: 0 }}>This reservation has expired</p>
                  <p style={{ fontSize: '12px', color: '#DC2626', marginTop: '4px' }}>The units have been released back to inventory.</p>
                </div>
              )}
            </div>
          )}

          {/* Confirmed success state */}
          {reservation.status === 'CONFIRMED' && (
            <div style={{
              background: 'var(--success-light)',
              borderRadius: 'var(--radius-sm)',
              padding: '20px',
              border: '1px solid #A7F3D0',
              textAlign: 'center',
              marginBottom: '8px',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px' }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--success)', margin: 0 }}>Purchase Confirmed!</p>
              <p style={{ fontSize: '13px', color: '#065F46', marginTop: '4px' }}>Your order has been placed successfully.</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {reservation.status === 'PENDING' && !isExpired && (
          <div style={{
            padding: '0 24px 24px',
            display: 'flex',
            gap: '12px',
          }}>
            <button
              onClick={handleConfirm}
              disabled={!!actionLoading}
              style={{
                flex: 1,
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
                fontSize: '15px',
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: actionLoading ? 'wait' : 'pointer',
                opacity: actionLoading && actionLoading !== 'confirm' ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { if (!actionLoading) e.currentTarget.style.background = 'var(--accent-hover)'; }}
              onMouseLeave={e => { if (!actionLoading) e.currentTarget.style.background = 'var(--accent)'; }}
            >
              {actionLoading === 'confirm' ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  Confirm Purchase
                </>
              )}
            </button>

            <button
              onClick={handleCancel}
              disabled={!!actionLoading}
              style={{
                flex: 1,
                background: 'var(--bg-subtle)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
                fontSize: '15px',
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: actionLoading ? 'wait' : 'pointer',
                opacity: actionLoading && actionLoading !== 'cancel' ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { if (!actionLoading) { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.borderColor = 'var(--border-strong)'; } }}
              onMouseLeave={e => { if (!actionLoading) { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.borderColor = 'var(--border)'; } }}
            >
              {actionLoading === 'cancel' ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Cancelling...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Cancel
                </>
              )}
            </button>
          </div>
        )}

        {(reservation.status === 'CONFIRMED' || reservation.status === 'RELEASED' || isExpired) && (
          <div style={{ padding: '0 24px 24px' }}>
            <button
              onClick={() => router.push('/')}
              style={{
                width: '100%',
                background: 'var(--text-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
                fontSize: '15px',
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              ← Return to Products
            </button>
          </div>
        )}
      </div>

      {/* Reservation created time */}
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '16px' }}>
        Reserved on {new Date(reservation.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
      </p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}
