// XNoll — App shell: bottom tabs, modal, theme tweaks
const { useState, useEffect, useRef } = React;

const SEED_TX = [
  { id: 't1', category: 'groceries', title: 'Продукты · Перекрёсток', amount: -3200, when: 'Сегодня · 14:32' },
  { id: 't2', category: 'salary',    title: 'Зарплата',               amount: 85000, when: 'Вчера · 09:00' },
  { id: 't3', category: 'taxi',      title: 'Такси Яндекс',           amount: -450,  when: '23 мая · 22:15' },
  { id: 't4', category: 'cafe',      title: 'Кофейня "Зерно"',        amount: -380,  when: '23 мая · 11:04' },
  { id: 't5', category: 'rent',      title: 'Аренда квартиры',        amount: -42000,when: '22 мая · 12:00' },
  { id: 't6', category: 'freelance', title: 'Заказ · Дизайн',         amount: 24000, when: '20 мая · 17:30' },
  { id: 't7', category: 'fun',       title: 'Кино — Дюна',            amount: -1200, when: '19 мая · 20:45' },
  { id: 't8', category: 'health',    title: 'Аптека Ригла',           amount: -890,  when: '18 мая · 09:20' },
];

const SEED_ACCOUNTS = [
  { id: 'a1', bank: 'Сбербанк',     balance: 120000,  currency: 'RUB', kind: 'savings',  tagColor: '#60a5fa', delta: +12500 },
  { id: 'a2', bank: 'Тинькофф',     balance: 500000,  currency: 'RUB', kind: 'deposit',  tagColor: '#ec4899', rate: 8.0, endsAt: '12.2026', delta: +3400 },
  { id: 'a3', bank: 'Альфа-Банк',   balance: 12400,   currency: 'USD', kind: 'savings',  tagColor: '#34d399', delta: +200 },
  { id: 'a4', bank: 'Райффайзен',   balance: 3200,    currency: 'EUR', kind: 'savings',  tagColor: '#a78bfa', delta: 0 },
  { id: 'a5', bank: 'ВТБ',          balance: 200000,  currency: 'RUB', kind: 'deposit',  tagColor: '#fb923c', rate: 7.2, endsAt: '06.2027', delta: +1200 },
];

const THEMES = {
  violet: {
    name: 'Violet',
    swatches: ['#6366f1', '#8b5cf6', '#a855f7'],
    accent: '#6366f1', accent2: '#8b5cf6', accent3: '#a855f7',
    glow: 'rgba(99,102,241,0.20)',
    shadow: 'rgba(99,102,241,0.45)',
  },
  teal: {
    name: 'Teal',
    swatches: ['#0f766e', '#14b8a6', '#06b6d4'],
    accent: '#14b8a6', accent2: '#0d9488', accent3: '#06b6d4',
    glow: 'rgba(20,184,166,0.18)',
    shadow: 'rgba(20,184,166,0.45)',
  },
  amber: {
    name: 'Amber',
    swatches: ['#f59e0b', '#f97316', '#fbbf24'],
    accent: '#f59e0b', accent2: '#f97316', accent3: '#fbbf24',
    glow: 'rgba(245,158,11,0.18)',
    shadow: 'rgba(245,158,11,0.45)',
  },
  rose: {
    name: 'Rose',
    swatches: ['#e11d48', '#ec4899', '#f43f5e'],
    accent: '#e11d48', accent2: '#ec4899', accent3: '#f43f5e',
    glow: 'rgba(236,72,153,0.18)',
    shadow: 'rgba(236,72,153,0.45)',
  },
};

// ─── Tabs ───
function BottomTabs({ active, onChange, onCenter }) {
  const tabs = [
    { id: 'home',      label: 'Главная',   icon: I.home },
    { id: 'accounts',  label: 'Счета',     icon: I.bank },
    { id: 'add',       label: '',          icon: I.plus,  center: true },
    { id: 'analytics', label: 'Аналитика', icon: I.chart },
    { id: 'profile',   label: 'Профиль',   icon: I.user },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      paddingBottom: 28, paddingTop: 10,
      background: 'linear-gradient(to top, rgba(8,10,20,0.96) 60%, rgba(8,10,20,0))',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      display: 'grid', gridTemplateColumns: 'repeat(5,1fr)',
      borderTop: '1px solid rgba(255,255,255,0.05)',
      zIndex: 30,
    }}>
      {tabs.map(t => {
        if (t.center) {
          return (
            <div key={t.id} style={{ display: 'grid', placeItems: 'center' }}>
              <button onClick={onCenter} style={{
                width: 50, height: 50, borderRadius: 18,
                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                border: 0, color: '#fff', cursor: 'pointer',
                display: 'grid', placeItems: 'center',
                boxShadow: '0 10px 22px var(--accent-shadow)',
                transform: 'translateY(-6px)',
              }}>{t.icon(22)}</button>
            </div>
          );
        }
        const isActive = active === t.id;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            background: 'none', border: 0, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            color: isActive ? 'var(--accent)' : '#4a5168', padding: 0,
          }}>
            <div style={{
              width: 38, height: 28, borderRadius: 9,
              background: isActive ? 'var(--accent-tint)' : 'transparent',
              display: 'grid', placeItems: 'center',
            }}>{t.icon(20)}</div>
            <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: 0.2 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Add transaction modal (3-step wizard) ───
function AddModal({ open, kind, accounts, onClose, onSubmit }) {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(kind === 'income' ? 'salary' : 'groceries');
  const [accountId, setAccountId] = useState(accounts[0]?.id);

  useEffect(() => {
    if (open) {
      setStep(1);
      setAmount('');
      setCategory(kind === 'income' ? 'salary' : 'groceries');
      setAccountId(accounts[0]?.id);
    }
  }, [open, kind]);

  if (!open) return null;

  const incomeCats = ['salary', 'freelance', 'transfer'];
  const expenseCats = ['groceries', 'cafe', 'taxi', 'rent', 'fun', 'health'];
  const cats = kind === 'income' ? incomeCats : expenseCats;
  const account = accounts.find(a => a.id === accountId) || accounts[0];
  const meta = CATS[category];

  const accent = kind === 'income' ? '#34d399' : '#f87171';
  const accentBg = kind === 'income' ? 'rgba(52,211,153,0.16)' : 'rgba(248,113,113,0.16)';

  const keypad = ['1','2','3','4','5','6','7','8','9','.','0','←'];
  const onKey = (k) => {
    if (k === '←') return setAmount(a => a.slice(0, -1));
    if (k === '.' && amount.includes('.')) return;
    if (amount.length > 9) return;
    setAmount(a => (a === '0' && k !== '.') ? k : a + k);
  };

  const submit = () => {
    const n = parseFloat(amount);
    if (!n) return;
    const signed = kind === 'income' ? n : -n;
    onSubmit({
      id: 'n' + Date.now(),
      category, title: meta.name,
      amount: signed,
      when: 'Только что',
      accountId: account?.id,
    });
    onClose();
  };

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => Math.max(1, s - 1));

  // step config
  const stepTitle = step === 1 ? 'Сумма' : step === 2 ? 'Категория' : 'Подтвердите';
  const canNext = step === 1 ? !!parseFloat(amount) : true;

  return (
    <>
      {/* backdrop */}
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, zIndex: 100,
        background: 'rgba(2,4,12,0.6)', backdropFilter: 'blur(8px)',
        animation: 'xn-fade 0.18s ease-out',
      }}/>
      {/* sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 101,
        background: 'linear-gradient(to bottom, #131826, #0a0e1a)',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        border: '1px solid rgba(255,255,255,0.08)',
        borderBottom: 0, paddingBottom: 36,
        animation: 'xn-slide 0.22s cubic-bezier(.2,.9,.3,1)',
      }}>
        {/* handle */}
        <div style={{ display: 'grid', placeItems: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 42, height: 5, background: 'rgba(255,255,255,0.15)', borderRadius: 99 }}/>
        </div>

        {/* header w/ stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 20px 14px' }}>
          {step > 1 ? (
            <button onClick={back} style={{ ...iconBtn, color: '#c8ccd9', transform: 'scaleX(-1)' }}>{I.chev(16)}</button>
          ) : <div style={{ width: 38 }}/>}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 10.5, color: '#6c7488', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              Шаг {step} из 3 · {kind === 'income' ? 'Доход' : 'Расход'}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f0f2f8', marginTop: 2 }}>{stepTitle}</div>
          </div>
          <button onClick={onClose} style={{ ...iconBtn, color: '#c8ccd9' }}>{I.close()}</button>
        </div>

        {/* progress dots */}
        <div style={{ display: 'flex', gap: 6, padding: '0 20px 18px', justifyContent: 'center' }}>
          {[1,2,3].map(n => (
            <div key={n} style={{
              flex: 1, height: 4, borderRadius: 99,
              background: n <= step ? accent : 'rgba(255,255,255,0.08)',
              transition: 'background 0.2s',
            }}/>
          ))}
        </div>

        {/* ── Step 1: amount + keypad ── */}
        {step === 1 && (
          <div>
            <div style={{ padding: '0 20px 18px', textAlign: 'center' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'baseline', gap: 4,
                fontSize: 48, fontWeight: 800, letterSpacing: -2,
                color: amount ? accent : '#3e455a',
              }}>
                <span style={{ fontSize: 26, opacity: 0.7 }}>{kind === 'income' ? '+' : '−'}</span>
                <span>{amount || '0'}</span>
                <span style={{ fontSize: 24, opacity: 0.5, color: '#6c7488', marginLeft: 4 }}>₽</span>
              </div>
              <div style={{ fontSize: 11, color: '#5e667a', marginTop: 4 }}>Введите сумму операции</div>
            </div>
            <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
              {keypad.map(k => (
                <button key={k} onClick={() => onKey(k)} style={{
                  padding: '14px 0', fontSize: 22, fontWeight: 600,
                  background: 'rgba(255,255,255,0.04)',
                  color: k === '←' ? '#6c7488' : '#e6e9f2',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 14, cursor: 'pointer',
                }}>{k}</button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: category + account ── */}
        {step === 2 && (
          <div style={{ padding: '0 20px' }}>
            <div style={{ fontSize: 11, color: '#6c7488', fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 }}>
              {kind === 'income' ? 'Источник' : 'Категория расхода'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 18 }}>
              {cats.map(c => {
                const m = CATS[c];
                const sel = c === category;
                return (
                  <button key={c} onClick={() => setCategory(c)} style={{
                    padding: '14px 8px', borderRadius: 16,
                    background: sel ? accentBg : 'rgba(255,255,255,0.04)',
                    border: sel ? `1.5px solid ${accent}99` : '1.5px solid rgba(255,255,255,0.06)',
                    color: sel ? accent : '#c8ccd9',
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{
                      width: 38, height: 38, borderRadius: 12,
                      background: `${m.tint}22`,
                      display: 'grid', placeItems: 'center', fontSize: 18,
                    }}>{m.glyph}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600 }}>{m.name}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ fontSize: 11, color: '#6c7488', fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 }}>
              {kind === 'income' ? 'Зачислить на счёт' : 'Списать со счёта'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {accounts.slice(0, 4).map(a => {
                const sym = a.currency === 'RUB' ? '₽' : a.currency === 'USD' ? '$' : '€';
                const sel = a.id === accountId;
                return (
                  <button key={a.id} onClick={() => setAccountId(a.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 14,
                    background: sel ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${sel ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}`,
                    color: '#e6e9f2', cursor: 'pointer', textAlign: 'left',
                  }}>
                    <span style={{ width: 28, height: 28, borderRadius: 9, background: `${a.tagColor}22`, color: a.tagColor, display: 'grid', placeItems: 'center' }}>{I.card(14)}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{a.bank}</span>
                    <span style={{ fontSize: 12, color: '#8a92a6', fontWeight: 600 }}>{a.balance.toLocaleString('ru-RU')} {sym}</span>
                    {sel && <span style={{ color: 'var(--accent)' }}>●</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step 3: confirmation flow ── */}
        {step === 3 && (
          <div style={{ padding: '0 20px' }}>
            {/* flow row: from → amount → to */}
            <div style={{
              padding: 18, borderRadius: 22,
              background: `linear-gradient(135deg, ${accent}18, ${accent}06)`,
              border: `1px solid ${accent}33`,
              marginBottom: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* FROM */}
                <FlowNode
                  label={kind === 'income' ? 'От' : 'Со счёта'}
                  title={kind === 'income' ? meta.name : account?.bank}
                  glyph={kind === 'income' ? meta.glyph : null}
                  icon={kind === 'income' ? null : I.card(16)}
                  tint={kind === 'income' ? meta.tint : account?.tagColor}
                />
                {/* arrow + amount */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: accent, letterSpacing: -0.5, whiteSpace: 'nowrap' }}>
                    {kind === 'income' ? '+' : '−'}{fmtAmount(parseFloat(amount) || 0)} ₽
                  </div>
                  <svg width="80" height="10" viewBox="0 0 80 10" style={{ display: 'block' }}>
                    <defs>
                      <linearGradient id="flowArrow" x1="0" x2="1">
                        <stop offset="0" stopColor={accent} stopOpacity="0.2"/>
                        <stop offset="1" stopColor={accent} stopOpacity="1"/>
                      </linearGradient>
                    </defs>
                    <line x1="2" y1="5" x2="70" y2="5" stroke="url(#flowArrow)" strokeWidth="1.5" strokeDasharray="3 3"/>
                    <path d="M68 1 L76 5 L68 9" fill="none" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                {/* TO */}
                <FlowNode
                  label={kind === 'income' ? 'На счёт' : 'Категория'}
                  title={kind === 'income' ? account?.bank : meta.name}
                  glyph={kind === 'income' ? null : meta.glyph}
                  icon={kind === 'income' ? I.card(16) : null}
                  tint={kind === 'income' ? account?.tagColor : meta.tint}
                  align="right"
                />
              </div>
            </div>

            {/* details */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16, overflow: 'hidden',
            }}>
              {[
                ['Тип', kind === 'income' ? 'Доход' : 'Расход'],
                ['Сумма', `${kind === 'income' ? '+' : '−'}${fmtAmount(parseFloat(amount) || 0)} ₽`],
                ['Категория', meta.name],
                [kind === 'income' ? 'Счёт' : 'Счёт списания', account?.bank],
                ['Дата', new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })],
              ].map(([k, v], i, arr) => (
                <div key={k} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '11px 14px',
                  borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  fontSize: 13,
                }}>
                  <span style={{ color: '#6c7488' }}>{k}</span>
                  <span style={{ color: '#e6e9f2', fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── footer button ── */}
        <div style={{ padding: '18px 20px 0' }}>
          {step < 3 ? (
            <button onClick={next} disabled={!canNext} style={{
              width: '100%', padding: '15px',
              background: canNext ? `linear-gradient(135deg, ${accent}, ${accent}cc)` : 'rgba(255,255,255,0.05)',
              color: canNext ? '#0a0e1a' : '#4a5168',
              border: 0, borderRadius: 16,
              fontSize: 14.5, fontWeight: 700, cursor: canNext ? 'pointer' : 'default',
              letterSpacing: -0.2,
              boxShadow: canNext ? `0 10px 22px ${accent}40` : 'none',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>Далее {I.chev(14)}</button>
          ) : (
            <button onClick={submit} style={{
              width: '100%', padding: '15px',
              background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
              color: '#0a0e1a', border: 0, borderRadius: 16,
              fontSize: 14.5, fontWeight: 700, cursor: 'pointer',
              letterSpacing: -0.2, boxShadow: `0 10px 22px ${accent}40`,
            }}>Подтвердить и сохранить</button>
          )}
        </div>
      </div>
    </>
  );
}

function FlowNode({ label, title, glyph, icon, tint, align = 'left' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: align === 'right' ? 'flex-end' : 'flex-start',
      gap: 6, width: 76, flexShrink: 0,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 14,
        background: `${tint || '#94a3b8'}22`,
        border: `1px solid ${tint || '#94a3b8'}44`,
        color: tint || '#94a3b8',
        display: 'grid', placeItems: 'center',
        fontSize: 20,
      }}>{glyph || icon}</div>
      <div style={{ textAlign: align === 'right' ? 'right' : 'left', width: '100%' }}>
        <div style={{ fontSize: 9.5, color: '#6c7488', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 11.5, color: '#e6e9f2', fontWeight: 600, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
      </div>
    </div>
  );
}

// ─── App ───
function App() {
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "theme": "violet",
    "balanceVisible": true,
    "navStyle": "labels"
  }/*EDITMODE-END*/;

  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tab, setTab] = useState('home');
  const [modal, setModal] = useState({ open: false, kind: 'expense' });
  const [transactions, setTransactions] = useState(SEED_TX);
  const [toast, setToast] = useState(null);

  const theme = THEMES[t.theme] || THEMES.violet;

  // expose CSS vars
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty('--accent', theme.accent);
    r.style.setProperty('--accent-2', theme.accent2);
    r.style.setProperty('--accent-3', theme.accent3);
    r.style.setProperty('--accent-glow', theme.glow);
    r.style.setProperty('--accent-shadow', theme.shadow);
    r.style.setProperty('--accent-tint', theme.accent + '22');
  }, [theme]);

  const state = { transactions, accounts: SEED_ACCOUNTS };

  const openAdd = (kind = 'expense') => setModal({ open: true, kind });
  const onSubmitTx = (tx) => {
    setTransactions(s => [tx, ...s]);
    setToast({ msg: `${tx.amount > 0 ? 'Доход' : 'Расход'} ${fmtRub(tx.amount)} добавлен`, color: tx.amount > 0 ? '#34d399' : '#f87171' });
    setTimeout(() => setToast(null), 2400);
  };

  let screen;
  switch (tab) {
    case 'accounts':  screen = <AccountsScreen state={state} />; break;
    case 'analytics': screen = <AnalyticsScreen state={state} />; break;
    case 'profile':   screen = <ProfileScreen state={state} theme={t.theme} onSetTheme={(v) => setTweak('theme', v)} />; break;
    default:          screen = <HomeScreen state={state} onOpenAdd={openAdd} onGoto={setTab} />;
  }

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: 'radial-gradient(ellipse at top, #11162a 0%, #060914 50%, #04060d 100%)',
      color: '#e6e9f2', overflow: 'hidden',
      fontFamily: '-apple-system, "SF Pro Display", "Inter", system-ui, sans-serif',
    }}>
      {/* status bar offset */}
      <div style={{ height: 54 }}/>

      {/* scrollable content */}
      <div style={{ position: 'absolute', top: 54, left: 0, right: 0, bottom: 0, overflowY: 'auto' }}>
        {screen}
      </div>

      <BottomTabs
        active={tab}
        onChange={(id) => setTab(id)}
        onCenter={() => openAdd('expense')}
      />

      <AddModal
        open={modal.open}
        kind={modal.kind}
        accounts={SEED_ACCOUNTS}
        onClose={() => setModal(m => ({ ...m, open: false }))}
        onSubmit={onSubmitTx}
      />

      {/* toast */}
      {toast && (
        <div style={{
          position: 'absolute', bottom: 110, left: '50%', transform: 'translateX(-50%)',
          padding: '10px 16px', borderRadius: 99,
          background: 'rgba(12,16,28,0.95)',
          border: `1px solid ${toast.color}55`,
          color: toast.color, fontSize: 12.5, fontWeight: 600,
          zIndex: 200, whiteSpace: 'nowrap',
          boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
          animation: 'xn-toast 0.3s ease-out',
        }}>{toast.msg}</div>
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Тема">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {Object.entries(THEMES).map(([k, v]) => (
              <button key={k} onClick={() => setTweak('theme', k)} style={{
                padding: 10, borderRadius: 12,
                background: t.theme === k ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${t.theme === k ? v.accent : 'rgba(255,255,255,0.08)'}`,
                cursor: 'pointer', textAlign: 'left', color: '#e6e9f2',
              }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                  {v.swatches.map((c, i) => (
                    <span key={i} style={{ width: 16, height: 16, borderRadius: 6, background: c, border: '1px solid rgba(255,255,255,0.1)' }}/>
                  ))}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{v.name}</div>
              </button>
            ))}
          </div>
        </TweakSection>

        <TweakSection label="Навигация">
          <button onClick={() => setTab('home')} style={tabJump(tab === 'home')}>Главная</button>
          <button onClick={() => setTab('accounts')} style={tabJump(tab === 'accounts')}>Счета</button>
          <button onClick={() => setTab('analytics')} style={tabJump(tab === 'analytics')}>Аналитика</button>
          <button onClick={() => setTab('profile')} style={tabJump(tab === 'profile')}>Профиль</button>
        </TweakSection>

        <TweakSection label="Демо">
          <button onClick={() => openAdd('income')} style={tabJump(false)}>+ Добавить доход</button>
          <button onClick={() => openAdd('expense')} style={tabJump(false)}>− Добавить расход</button>
        </TweakSection>
      </TweaksPanel>

      <style>{`
        @keyframes xn-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes xn-slide { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes xn-toast { from { opacity: 0; transform: translate(-50%, 10px) } to { opacity: 1; transform: translate(-50%, 0) } }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

const tabJump = (active) => ({
  display: 'block', width: '100%', textAlign: 'left',
  padding: '9px 12px', marginBottom: 4,
  background: active ? 'var(--accent-tint)' : 'rgba(255,255,255,0.04)',
  border: `1px solid ${active ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}`,
  borderRadius: 10, color: active ? 'var(--accent)' : '#c8ccd9',
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
});

// ─── Mount ───
function Mount() {
  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      background: 'radial-gradient(ellipse at top, #0b0f1c 0%, #04060d 70%)',
      display: 'grid', placeItems: 'center', padding: '20px 12px',
    }}>
      <IOSDevice dark width={390} height={840}>
        <App />
      </IOSDevice>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Mount />);
