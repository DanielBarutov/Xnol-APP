// XNoll — screens (Home / Accounts / Analytics / Profile)
// All exports attach to window so app.jsx can use them.

const { useState, useEffect, useMemo } = React;

// ─── icons (line, monochrome, currentColor) ──────────────────────
const I = {
  home: (s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg>
  ),
  bank: (s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10l9-6 9 6"/><path d="M5 10v9"/><path d="M9 10v9"/><path d="M15 10v9"/><path d="M19 10v9"/><path d="M3 21h18"/></svg>
  ),
  chart: (s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></svg>
  ),
  user: (s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>
  ),
  plus: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
  ),
  minus: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14"/></svg>
  ),
  arrowUp: (s = 14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
  ),
  arrowDown: (s = 14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
  ),
  bell: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
  ),
  search: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
  ),
  chev: (s = 14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6"/></svg>
  ),
  close: (s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
  ),
  card: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 11h20"/></svg>
  ),
  shield: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 5v7c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5l-8-3z"/></svg>
  ),
  gear: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>
  ),
  moon: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
  ),
  help: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
  ),
  logout: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>
  ),
  eye: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
  ),
  eyeOff: (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.5 19.5 0 0 1 5.06-5.94"/><path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.7 19.7 0 0 1-3.17 4.41"/><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M1 1l22 22"/></svg>
  ),
};

// ─── category meta ───────────────────────────────────────────────
const CATS = {
  groceries: { name: 'Продукты',   glyph: '🛒', tint: '#fb7185' },
  salary:    { name: 'Зарплата',   glyph: '💼', tint: '#34d399' },
  taxi:      { name: 'Такси',      glyph: '🚕', tint: '#fbbf24' },
  cafe:      { name: 'Кафе',       glyph: '☕', tint: '#f97316' },
  rent:      { name: 'Аренда',     glyph: '🏠', tint: '#60a5fa' },
  freelance: { name: 'Подработка', glyph: '💻', tint: '#a78bfa' },
  health:    { name: 'Здоровье',   glyph: '💊', tint: '#f472b6' },
  fun:       { name: 'Развлечения',glyph: '🎬', tint: '#22d3ee' },
  transfer:  { name: 'Перевод',    glyph: '↔️', tint: '#94a3b8' },
};

const fmtRub = (n) => {
  const sign = n < 0 ? '−' : n > 0 ? '+' : '';
  return sign + Math.abs(n).toLocaleString('ru-RU') + ' ₽';
};
const fmtAmount = (n) => Math.abs(n).toLocaleString('ru-RU');

// ─── shared primitives ──────────────────────────────────────────
function SectionHeader({ title, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 20px', marginTop: 24, marginBottom: 12 }}>
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#7a8294' }}>{title}</span>
      {action && (
        <button onClick={onAction} style={{ background: 'none', border: 0, color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
          {action} →
        </button>
      )}
    </div>
  );
}

function TxRow({ tx, onClick }) {
  const c = CATS[tx.category] || CATS.transfer;
  const pos = tx.amount > 0;
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px',
      background: 'rgba(30,34,52,0.55)',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: 16, cursor: 'pointer',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 12,
        background: `linear-gradient(135deg, ${c.tint}22, ${c.tint}11)`,
        border: `1px solid ${c.tint}33`,
        display: 'grid', placeItems: 'center', fontSize: 17,
      }}>{c.glyph}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#e6e9f2' }}>{tx.title || c.name}</div>
        <div style={{ fontSize: 10.5, color: '#5e667a', marginTop: 2, letterSpacing: 0.2 }}>{tx.when}</div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.3, color: pos ? '#4ade80' : '#f87171' }}>
        {fmtRub(tx.amount)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOME
// ═══════════════════════════════════════════════════════════════
function HomeScreen({ state, onOpenAdd, onGoto, onTx }) {
  const { transactions, accounts } = state;
  const totalRub = accounts.filter(a => a.currency === 'RUB').reduce((s, a) => s + a.balance, 0);
  const income = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0);

  const [hidden, setHidden] = useState(false);
  const [slide, setSlide] = useState(0);
  const sliderRef = React.useRef(null);

  const mask = (txt) => hidden ? '•'.repeat(Math.min(String(txt).replace(/\s/g, '').length, 7)) : txt;

  // sync slide index from scroll
  const onSliderScroll = () => {
    const el = sliderRef.current;
    if (!el) return;
    const card = el.firstElementChild;
    if (!card) return;
    const cardW = card.offsetWidth + 12; // include gap
    const idx = Math.round(el.scrollLeft / cardW);
    if (idx !== slide) setSlide(idx);
  };

  const goToSlide = (i) => {
    const el = sliderRef.current;
    if (!el) return;
    const card = el.firstElementChild;
    if (!card) return;
    el.scrollTo({ left: (card.offsetWidth + 12) * i, behavior: 'smooth' });
  };

  return (
    <div style={{ paddingBottom: 110 }}>
      {/* Ambient glow */}
      <div aria-hidden style={{
        position: 'absolute', top: 50, left: '50%', transform: 'translateX(-50%)',
        width: 320, height: 320, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 65%)',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 0', position: 'relative', zIndex: 1 }}>
        <div>
          <div style={{ fontSize: 11, color: '#5e667a', fontWeight: 500 }}>Добро пожаловать</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#f0f2f8', letterSpacing: -0.3, marginTop: 1 }}>Май 2026</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={iconBtn}><span style={{ color: '#c8ccd9' }}>{I.search()}</span></button>
          <button style={{ ...iconBtn, position: 'relative' }}>
            <span style={{ color: '#c8ccd9' }}>{I.bell()}</span>
            <span style={{ position: 'absolute', top: 9, right: 9, width: 7, height: 7, background: 'var(--accent)', borderRadius: '50%', border: '2px solid #0a0e1a' }} />
          </button>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            display: 'grid', placeItems: 'center', color: '#fff',
            fontSize: 14, fontWeight: 700,
            boxShadow: '0 0 0 2px rgba(255,255,255,0.06), 0 6px 14px var(--accent-shadow)',
          }}>Д</div>
        </div>
      </div>

      {/* Balance card — tap to hide */}
      <div style={{ padding: '18px 20px 0', position: 'relative', zIndex: 1 }}>
        <div
          onClick={() => setHidden(h => !h)}
          style={{
            borderRadius: 24, padding: 22, position: 'relative', overflow: 'hidden', color: '#fff',
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 55%, var(--accent-3) 100%)',
            boxShadow: '0 18px 40px var(--accent-shadow), inset 0 1px 0 rgba(255,255,255,0.18)',
            cursor: 'pointer', userSelect: 'none',
            transition: 'transform 0.18s ease',
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.985)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {/* decorative orbs */}
          <div style={{ position: 'absolute', top: -50, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }}/>
          <div style={{ position: 'absolute', bottom: -70, left: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}/>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Общий баланс</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 10, padding: '3px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.18)', fontWeight: 600, letterSpacing: 0.3 }}>RUB</div>
              <span style={{
                width: 28, height: 28, borderRadius: 9,
                background: 'rgba(255,255,255,0.15)',
                display: 'grid', placeItems: 'center', color: '#fff',
                transition: 'background 0.18s',
              }}>{hidden ? I.eyeOff(14) : I.eye(14)}</span>
            </div>
          </div>

          <div style={{
            position: 'relative', display: 'flex', alignItems: 'baseline', gap: 4,
            margin: '8px 0 4px',
            filter: hidden ? 'blur(0px)' : 'none',
            transition: 'filter 0.2s ease, opacity 0.2s ease',
          }}>
            <span style={{ fontSize: 18, fontWeight: 600, opacity: 0.8 }}>₽</span>
            <span style={{
              fontSize: 36, fontWeight: 800, letterSpacing: hidden ? 2 : -1.6, lineHeight: 1,
              transition: 'letter-spacing 0.2s ease',
              fontVariantNumeric: 'tabular-nums',
            }}>{hidden ? '• • • • • • •' : fmtAmount(totalRub)}</span>
          </div>
          <div style={{ position: 'relative', fontSize: 11, color: 'rgba(255,255,255,0.55)', opacity: hidden ? 0.3 : 1, transition: 'opacity 0.2s' }}>
            {hidden ? 'Баланс скрыт · нажмите чтобы показать' : '+ $12 400 · €3 200 на других счетах'}
          </div>

          <div style={{ position: 'relative', display: 'flex', gap: 20, paddingTop: 14, marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
            <Stat dir="up" label="Доходы" value={hidden ? '+• • •' : `+${fmtAmount(income)}`} />
            <Stat dir="down" label="Расходы" value={hidden ? '−• • •' : `−${fmtAmount(expense)}`} />
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ padding: '14px 20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, position: 'relative', zIndex: 1 }}>
        <QuickAction kind="income" onClick={() => onOpenAdd('income')} />
        <QuickAction kind="expense" onClick={() => onOpenAdd('expense')} />
      </div>

      {/* Accounts — snap-scroll carousel */}
      <SectionHeader title="Счета" action="Все" onAction={() => onGoto('accounts')} />
      <div
        ref={sliderRef}
        onScroll={onSliderScroll}
        style={{
          display: 'flex', gap: 12,
          overflowX: 'auto', padding: '0 20px 4px',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          scrollbarWidth: 'none',
        }}
      >
        {accounts.map((a, i) => {
          const sym = a.currency === 'RUB' ? '₽' : a.currency === 'USD' ? '$' : '€';
          const active = i === slide;
          return (
            <div key={a.id} style={{
              flexShrink: 0,
              width: 'calc(100% - 24px)',
              scrollSnapAlign: 'start',
              background: 'rgba(30,34,52,0.55)',
              border: `1px solid ${active ? a.tagColor + '55' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 18, padding: 16,
              backdropFilter: 'blur(12px)',
              position: 'relative', overflow: 'hidden',
              transform: active ? 'scale(1)' : 'scale(0.95)',
              opacity: active ? 1 : 0.7,
              transition: 'transform 0.3s cubic-bezier(.2,.9,.3,1), opacity 0.3s, border-color 0.3s',
            }}>
              {/* tinted blob */}
              <div style={{
                position: 'absolute', top: -40, right: -30,
                width: 140, height: 140, borderRadius: '50%',
                background: `radial-gradient(circle, ${a.tagColor}44, transparent 65%)`,
                pointerEvents: 'none',
              }}/>

              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#8a92a6', fontWeight: 600 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: a.tagColor }}/>
                    {a.bank}
                  </div>
                  <div style={{ fontSize: 10, color: '#5e667a', marginTop: 4, fontWeight: 500 }}>
                    {a.kind === 'deposit' ? `Вклад · ${a.rate}% · до ${a.endsAt}` : 'Накопления'}
                  </div>
                </div>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${a.tagColor}22`, color: a.tagColor, display: 'grid', placeItems: 'center' }}>{I.card(16)}</div>
              </div>

              <div style={{
                position: 'relative',
                fontSize: 26, fontWeight: 800, color: '#f0f2f8',
                letterSpacing: hidden ? 2 : -0.8, marginTop: 14,
                fontVariantNumeric: 'tabular-nums',
                transition: 'letter-spacing 0.2s',
              }}>
                {hidden ? '• • • • •' : a.balance.toLocaleString('ru-RU')} <span style={{ fontSize: 18, color: '#8a92a6', fontWeight: 600 }}>{sym}</span>
              </div>

              {a.delta != null && !hidden && (
                <div style={{ position: 'relative', fontSize: 11, color: a.delta >= 0 ? '#4ade80' : '#f87171', marginTop: 4, fontWeight: 600 }}>
                  {a.delta >= 0 ? '↑' : '↓'} {Math.abs(a.delta).toLocaleString('ru-RU')} {sym} за месяц
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Dots indicator */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12, position: 'relative', zIndex: 1 }}>
        {accounts.map((_, i) => (
          <button key={i} onClick={() => goToSlide(i)} style={{
            width: i === slide ? 22 : 6, height: 6, borderRadius: 99,
            background: i === slide ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
            border: 0, cursor: 'pointer', padding: 0,
            transition: 'width 0.3s cubic-bezier(.2,.9,.3,1), background 0.3s',
          }}/>
        ))}
      </div>

      {/* Recent transactions */}
      <SectionHeader title="Последние" action="Все" onAction={() => onGoto('analytics')} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 20px', position: 'relative', zIndex: 1 }}>
        {transactions.slice(0, 4).map(t => (
          <TxRow key={t.id} tx={t} onClick={() => onTx?.(t)} />
        ))}
      </div>
    </div>
  );
}

function Stat({ dir, label, value }) {
  const up = dir === 'up';
  const color = up ? '#86efac' : '#fca5a5';
  const bg = up ? 'rgba(74,222,128,0.18)' : 'rgba(248,113,113,0.18)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 26, height: 26, borderRadius: 9, background: bg, display: 'grid', placeItems: 'center', color }}>
        {up ? I.arrowUp() : I.arrowDown()}
      </div>
      <div>
        <div style={{ fontSize: 9, letterSpacing: 0.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 13.5, fontWeight: 700, color, letterSpacing: -0.3, marginTop: 1 }}>{value}</div>
      </div>
    </div>
  );
}

function QuickAction({ kind, onClick }) {
  const income = kind === 'income';
  const color = income ? '#34d399' : '#f87171';
  const bgGrad = income
    ? 'linear-gradient(135deg, rgba(52,211,153,0.18), rgba(16,185,129,0.08))'
    : 'linear-gradient(135deg, rgba(248,113,113,0.18), rgba(220,38,38,0.08))';
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '14px 14px', borderRadius: 18,
      background: bgGrad,
      border: '1px solid rgba(255,255,255,0.06)',
      color: '#e6e9f2', cursor: 'pointer', textAlign: 'left',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 12,
        background: income ? 'rgba(52,211,153,0.22)' : 'rgba(248,113,113,0.22)',
        color, display: 'grid', placeItems: 'center',
      }}>{income ? I.plus(20) : I.minus(20)}</div>
      <div style={{ lineHeight: 1.15 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{income ? 'Доход' : 'Расход'}</div>
        <div style={{ fontSize: 10.5, color: '#6c7488', marginTop: 2 }}>Добавить</div>
      </div>
    </button>
  );
}

const iconBtn = {
  width: 38, height: 38, borderRadius: 12,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.06)',
  display: 'grid', placeItems: 'center', cursor: 'pointer',
};

// ═══════════════════════════════════════════════════════════════
// ACCOUNTS
// ═══════════════════════════════════════════════════════════════
function AccountsScreen({ state }) {
  const { accounts } = state;
  const savings = accounts.filter(a => a.kind === 'savings');
  const deposits = accounts.filter(a => a.kind === 'deposit');
  const total = accounts.filter(a => a.currency === 'RUB').reduce((s, a) => s + a.balance, 0);

  return (
    <div style={{ paddingBottom: 110 }}>
      <div style={{ padding: '8px 20px 0' }}>
        <div style={{ fontSize: 11, color: '#5e667a', fontWeight: 500 }}>Все счета</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#f0f2f8', letterSpacing: -1.2 }}>{fmtAmount(total)} ₽</span>
        </div>
        <div style={{ fontSize: 11, color: '#5e667a', marginTop: 2 }}>{accounts.length} счетов · 3 валюты</div>
      </div>

      <SectionHeader title="Накопления" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 20px' }}>
        {savings.map(a => <AccountCard key={a.id} a={a} />)}
      </div>

      <SectionHeader title="Вклады" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 20px' }}>
        {deposits.map(a => <AccountCard key={a.id} a={a} />)}
      </div>

      <div style={{ padding: '20px' }}>
        <button style={{
          width: '100%', padding: '14px',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
          color: '#fff', border: 0, borderRadius: 16,
          fontSize: 14, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 10px 22px var(--accent-shadow)',
        }}>+ Добавить счёт</button>
      </div>
    </div>
  );
}

function AccountCard({ a }) {
  const sym = a.currency === 'RUB' ? '₽' : a.currency === 'USD' ? '$' : '€';
  return (
    <div style={{
      background: 'rgba(30,34,52,0.55)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 18, padding: 14,
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: `${a.tagColor}22`, color: a.tagColor, display: 'grid', placeItems: 'center' }}>{I.card()}</div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#e6e9f2' }}>{a.bank}</div>
            <div style={{ fontSize: 10.5, color: '#6c7488', marginTop: 2 }}>
              {a.kind === 'deposit' ? `Вклад · ${a.rate}% · до ${a.endsAt}` : 'Накопления'}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f2f8', letterSpacing: -0.3 }}>
            {a.balance.toLocaleString('ru-RU')} {sym}
          </div>
          {a.delta != null && (
            <div style={{ fontSize: 10.5, color: a.delta >= 0 ? '#4ade80' : '#f87171', marginTop: 2, fontWeight: 600 }}>
              {a.delta >= 0 ? '+' : ''}{a.delta.toLocaleString('ru-RU')} за месяц
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════
function AnalyticsScreen({ state }) {
  const [range, setRange] = useState('week');
  const days = range === 'week' ? 7 : range === 'month' ? 30 : 12;
  const bars = useMemo(() => {
    // deterministic pseudo-random bars
    const out = [];
    let seed = 17;
    for (let i = 0; i < days; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      const v = 0.25 + (seed / 233280) * 0.75;
      out.push(v);
    }
    return out;
  }, [days]);

  const categories = [
    { k: 'groceries', v: 18400, pct: 38 },
    { k: 'cafe',      v: 7200,  pct: 15 },
    { k: 'taxi',      v: 5400,  pct: 11 },
    { k: 'fun',       v: 4800,  pct: 10 },
    { k: 'rent',      v: 12000, pct: 25 },
  ];

  return (
    <div style={{ paddingBottom: 110 }}>
      <div style={{ padding: '8px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, color: '#5e667a', fontWeight: 500 }}>Расходы · Май</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f0f2f8', letterSpacing: -1.2, marginTop: 4 }}>47 800 ₽</div>
          <div style={{ fontSize: 11, color: '#f87171', marginTop: 2, fontWeight: 600 }}>−8% к прошлому месяцу</div>
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 3 }}>
          {[['week','Нед'],['month','Мес'],['year','Год']].map(([k,l]) => (
            <button key={k} onClick={() => setRange(k)} style={{
              padding: '6px 10px', borderRadius: 9, border: 0,
              background: range === k ? 'var(--accent)' : 'transparent',
              color: range === k ? '#fff' : '#7a8294',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Bar chart */}
      <div style={{ margin: '18px 20px 0', padding: 18, borderRadius: 22,
        background: 'rgba(30,34,52,0.55)', border: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: range === 'year' ? 6 : 8, height: 140 }}>
          {bars.map((v, i) => (
            <div key={i} style={{
              flex: 1,
              height: `${v * 140}px`,
              borderRadius: 6,
              background: `linear-gradient(to top, var(--accent), var(--accent-2))`,
              opacity: i === bars.length - 1 ? 1 : 0.55,
              boxShadow: i === bars.length - 1 ? '0 0 14px var(--accent-shadow)' : 'none',
            }}/>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 10, color: '#5e667a' }}>
          {range === 'week' && ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => <span key={d}>{d}</span>)}
          {range === 'month' && <><span>1</span><span>8</span><span>15</span><span>22</span><span>30</span></>}
          {range === 'year' && ['Я','Ф','М','А','М','И','И','А','С','О','Н','Д'].map((d,i) => <span key={i}>{d}</span>)}
        </div>
      </div>

      <SectionHeader title="По категориям" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 20px' }}>
        {categories.map(c => {
          const meta = CATS[c.k];
          return (
            <div key={c.k}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 9, background: `${meta.tint}22`, display: 'grid', placeItems: 'center', fontSize: 15 }}>{meta.glyph}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e6e9f2' }}>{meta.name}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f2f8' }}>{c.v.toLocaleString('ru-RU')} ₽</div>
                  <div style={{ fontSize: 10, color: '#5e667a' }}>{c.pct}%</div>
                </div>
              </div>
              <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{ width: `${c.pct * 2}%`, height: '100%', background: meta.tint, borderRadius: 99 }}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════════
function ProfileScreen({ state, theme, onSetTheme }) {
  const rows = [
    { icon: I.user(),   label: 'Личные данные', detail: 'Даниэль' },
    { icon: I.card(),   label: 'Способы оплаты', detail: '3 карты' },
    { icon: I.bell(),   label: 'Уведомления', detail: 'Вкл' },
    { icon: I.shield(), label: 'Безопасность', detail: 'Face ID' },
    { icon: I.moon(),   label: 'Тёмная тема', detail: 'Авто' },
    { icon: I.gear(),   label: 'Настройки' },
    { icon: I.help(),   label: 'Поддержка' },
  ];

  return (
    <div style={{ paddingBottom: 110 }}>
      <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
          display: 'grid', placeItems: 'center', color: '#fff', fontSize: 32, fontWeight: 700,
          boxShadow: '0 12px 30px var(--accent-shadow), 0 0 0 4px rgba(255,255,255,0.04)',
        }}>Д</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#f0f2f8', marginTop: 12, letterSpacing: -0.3 }}>Даниэль К.</div>
        <div style={{ fontSize: 12, color: '#6c7488', marginTop: 2 }}>daniel@xnoll.app · Premium</div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16, width: '100%' }}>
          {[
            { label: 'Счёта', value: state.accounts.length },
            { label: 'Операции', value: state.transactions.length },
            { label: 'Дней', value: 142 },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, padding: 12, borderRadius: 14,
              background: 'rgba(30,34,52,0.55)',
              border: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#f0f2f8', letterSpacing: -0.5 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#6c7488', marginTop: 2, letterSpacing: 0.3, textTransform: 'uppercase', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <SectionHeader title="Настройки" />
      <div style={{
        margin: '0 20px',
        background: 'rgba(30,34,52,0.55)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 18, overflow: 'hidden',
        backdropFilter: 'blur(12px)',
      }}>
        {rows.map((r, i) => (
          <div key={r.label} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
            borderTop: i ? '1px solid rgba(255,255,255,0.04)' : 'none',
            cursor: 'pointer',
          }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,0.04)', display: 'grid', placeItems: 'center', color: 'var(--accent)' }}>{r.icon}</span>
            <span style={{ flex: 1, fontSize: 13.5, color: '#e6e9f2', fontWeight: 500 }}>{r.label}</span>
            {r.detail && <span style={{ fontSize: 12, color: '#6c7488' }}>{r.detail}</span>}
            <span style={{ color: '#3e455a' }}>{I.chev()}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: '14px 20px' }}>
        <button style={{
          width: '100%', padding: '13px',
          background: 'rgba(248,113,113,0.1)',
          color: '#f87171', border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: 14, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>{I.logout()} Выйти</button>
      </div>
    </div>
  );
}

Object.assign(window, {
  HomeScreen, AccountsScreen, AnalyticsScreen, ProfileScreen,
  TxRow, CATS, I, fmtRub, fmtAmount, SectionHeader, iconBtn,
});
