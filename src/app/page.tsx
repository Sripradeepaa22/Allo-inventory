'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProductWithStocks } from '@/lib/schemas';

const CATEGORY_COLORS: Record<string, string> = {
  Electronics: '#1D4ED8',
  Wearables: '#7C3AED',
  Footwear: '#B45309',
  Apparel: '#065F46',
};

function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      border: '1px solid var(--border)',
    }}>
      <div className="shimmer" style={{ height: '16px', borderRadius: '6px', width: '60%', marginBottom: '12px' }} />
      <div className="shimmer" style={{ height: '12px', borderRadius: '6px', width: '90%', marginBottom: '8px' }} />
      <div className="shimmer" style={{ height: '12px', borderRadius: '6px', width: '70%', marginBottom: '20px' }} />
      <div className="shimmer" style={{ height: '28px', borderRadius: '6px', width: '40%', marginBottom: '16px' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[1, 2].map(i => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="shimmer" style={{ height: '32px', borderRadius: '8px', width: '55%' }} />
            <div className="shimmer" style={{ height: '32px', borderRadius: '8px', width: '30%' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [products, setProducts] = useState<ProductWithStocks[]>([]);
  const [loading, setLoading] = useState(true);
  const [reservingId, setReservingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data);
    } catch {
      setError('Failed to load products. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleReserve = async (productId: string, warehouseId: string) => {
    setReservingId(`${productId}-${warehouseId}`);
    setError('');

    try {
      const idempotencyKey = `${productId}-${warehouseId}-${Date.now()}`;
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
      });

      if (res.status === 409) {
        const data = await res.json();
        setError(data.error || 'Not enough stock available.');
        return;
      }

      if (res.status === 429) {
        setError('Request in progress — please try again in a moment.');
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Something went wrong.');
        return;
      }

      const reservation = await res.json();
      router.push(`/reservation/${reservation.id}`);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setReservingId(null);
    }
  };

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  return (
    <div className="page-enter" style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <h1 className="font-display" style={{
          fontSize: 'clamp(28px, 4vw, 42px)',
          lineHeight: 1.1,
          color: 'var(--text-primary)',
          marginBottom: '10px',
          letterSpacing: '-0.5px',
        }}>
          Product Catalogue
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
          Reserve items across our warehouses — holds last 10 minutes.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderLeft: '4px solid var(--accent)',
          borderRadius: 'var(--radius-sm)',
          padding: '14px 18px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span style={{ color: '#991B1B', fontSize: '14px', fontWeight: 500 }}>{error}</span>
          </div>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B', padding: '2px', lineHeight: 1 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* Stats bar */}
      {!loading && (
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '32px',
          flexWrap: 'wrap',
        }}>
          {[
            { label: 'Products', value: products.length },
            { label: 'Warehouses', value: 3 },
            { label: 'Categories', value: categories.length },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{stat.value}</span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>{stat.label}</span>
            </div>
          ))}
          <button
            onClick={fetchProducts}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              fontFamily: 'inherit',
              fontWeight: 500,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
        </div>
      )}

      {/* Product Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {products.map((product) => {
            const totalAvailable = product.stocks.reduce((sum, s) => sum + s.available, 0);
            const categoryColor = CATEGORY_COLORS[product.category || ''] || '#6B6560';

            return (
              <div
                key={product.id}
                className="card-hover"
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {/* Card top accent */}
                <div style={{ height: '4px', background: totalAvailable === 0 ? 'var(--border-strong)' : `linear-gradient(90deg, ${categoryColor}, ${categoryColor}88)` }} />

                <div style={{ padding: '22px' }}>
                  {/* Category + availability */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    {product.category && (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: categoryColor,
                        background: `${categoryColor}15`,
                        padding: '3px 10px',
                        borderRadius: '20px',
                      }}>
                        {product.category}
                      </span>
                    )}
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: totalAvailable === 0 ? '#DC2626' : totalAvailable <= 3 ? 'var(--warning)' : 'var(--success)',
                      background: totalAvailable === 0 ? '#FEF2F2' : totalAvailable <= 3 ? 'var(--warning-light)' : 'var(--success-light)',
                      padding: '3px 10px',
                      borderRadius: '20px',
                    }}
                    className={totalAvailable <= 3 && totalAvailable > 0 ? 'stock-low' : ''}>
                      {totalAvailable === 0 ? 'Out of stock' : `${totalAvailable} total available`}
                    </span>
                  </div>

                  {/* Product info */}
                  <h2 style={{
                    fontSize: '17px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '6px',
                    letterSpacing: '-0.2px',
                    lineHeight: 1.3,
                  }}>
                    {product.name}
                  </h2>
                  <p style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    marginBottom: '14px',
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {product.description}
                  </p>

                  {/* Price */}
                  <div style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: '18px',
                    letterSpacing: '-0.5px',
                  }}>
                    ₹{product.price.toLocaleString('en-IN')}
                  </div>

                  {/* Divider */}
                  <div style={{ height: '1px', background: 'var(--border)', marginBottom: '16px' }} />

                  {/* Per-warehouse stock rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {product.stocks.map((stock) => {
                      const isReserving = reservingId === `${product.id}-${stock.warehouseId}`;
                      const isUnavailable = stock.available === 0;

                      return (
                        <div
                          key={stock.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            background: 'var(--bg-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid transparent',
                            transition: 'border-color 0.15s',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                              {stock.warehouse.name}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {isUnavailable ? (
                                <span style={{ color: '#DC2626' }}>Unavailable</span>
                              ) : (
                                <>
                                  <span style={{ color: stock.available <= 2 ? 'var(--warning)' : 'var(--success)', fontWeight: 600 }}>
                                    {stock.available}
                                  </span>
                                  {' '}of {stock.total} units free
                                </>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => handleReserve(product.id, stock.warehouseId)}
                            disabled={isUnavailable || !!reservingId}
                            style={{
                              background: isUnavailable ? 'var(--border)' : isReserving ? 'var(--accent)' : 'var(--accent)',
                              color: isUnavailable ? 'var(--text-muted)' : 'white',
                              border: 'none',
                              borderRadius: 'var(--radius-sm)',
                              padding: '8px 16px',
                              fontSize: '13px',
                              fontWeight: 600,
                              fontFamily: 'inherit',
                              cursor: isUnavailable || !!reservingId ? 'not-allowed' : 'pointer',
                              opacity: !!reservingId && !isReserving ? 0.5 : 1,
                              transition: 'all 0.15s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={e => {
                              if (!isUnavailable && !reservingId) e.currentTarget.style.background = 'var(--accent-hover)';
                            }}
                            onMouseLeave={e => {
                              if (!isUnavailable) e.currentTarget.style.background = 'var(--accent)';
                            }}
                          >
                            {isReserving ? (
                              <>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                                </svg>
                                Holding...
                              </>
                            ) : isUnavailable ? 'Unavailable' : (
                              <>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 5v14M5 12l7 7 7-7"/>
                                </svg>
                                Reserve
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && products.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--text-muted)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', opacity: 0.4 }}>
            <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
          </svg>
          <p style={{ fontSize: '16px' }}>No products available. Check back later.</p>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
