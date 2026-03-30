import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import * as api from './utils/api.js';

/* ═══════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════ */
const CSS = `
:root{--bg:#0e0e0e;--s1:#181818;--s2:#222;--bd:#2a2a2a;--t1:#eee;--t2:#888;--gr:#4ade80;--rd:#ef4444;--or:#f59e0b;--bl:#3b82f6;--vi:#a78bfa}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--t1);min-height:100vh;-webkit-font-smoothing:antialiased}
.app{max-width:480px;margin:0 auto;padding:16px;padding-bottom:90px}
.card{background:var(--s1);border:1px solid var(--bd);border-radius:16px;padding:20px;margin-bottom:12px}
.card-h{font-size:12px;color:var(--t2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px}
.name{font-size:22px;font-weight:700;margin-bottom:4px}
.meta{color:var(--t2);font-size:13px}
.stats{display:flex;gap:8px;margin-bottom:12px}
.stat{flex:1;background:var(--s2);border-radius:12px;padding:14px;text-align:center}
.stat b{display:block;font-size:22px;color:var(--gr)}
.stat small{font-size:11px;color:var(--t2)}
.btn{width:100%;padding:14px;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;transition:transform .1s}
.btn:active{transform:scale(.97)}
.btn-g{background:var(--gr);color:#000}
.btn-r{background:var(--rd);color:#fff}
.btn-b{background:var(--bl);color:#fff}
.btn-o{background:transparent;border:1px solid var(--bd);color:var(--t1)}
.btn-s{padding:10px 16px;font-size:13px;width:auto}
.btn-row{display:flex;gap:8px}
.btn-row .btn{flex:1}
.qr-wrap{display:flex;flex-direction:column;align-items:center;padding:20px}
.qr-box{background:#fff;border-radius:16px;padding:20px;margin-bottom:14px}
.qr-timer{font-size:12px;color:var(--t2);display:flex;align-items:center;gap:6px}
.qr-timer .dot{width:8px;height:8px;border-radius:50%;background:var(--gr);animation:pulse 1.5s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.nav{position:fixed;bottom:0;left:0;right:0;background:var(--s1);border-top:1px solid var(--bd);display:flex;justify-content:center;padding:6px 0;padding-bottom:env(safe-area-inset-bottom,6px);z-index:99}
.nav-in{display:flex;gap:2px;max-width:480px;width:100%;padding:0 6px}
.nav-b{flex:1;background:0;border:0;color:var(--t2);font-size:10px;padding:6px 2px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;border-radius:8px;transition:all .15s}
.nav-b.on{color:var(--gr);background:rgba(74,222,128,.08)}
.nav-b .ic{font-size:18px}
.ev-card{background:var(--s2);border-radius:12px;padding:14px;margin-bottom:8px;cursor:pointer;transition:background .15s}
.ev-card:active{background:var(--bd)}
.ev-t{font-weight:600;margin-bottom:3px}
.ev-m{font-size:12px;color:var(--t2)}
.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
.bg{background:rgba(74,222,128,.12);color:var(--gr)}
.br{background:rgba(239,68,68,.12);color:var(--rd)}
.bo{background:rgba(245,158,11,.12);color:var(--or)}
.scan-r{text-align:center;padding:20px}
.scan-r .em{font-size:44px;margin-bottom:10px}
.scan-r .sn{font-size:20px;font-weight:700;margin-bottom:3px}
.scan-r .si{color:var(--t2);margin-bottom:16px}
.inp{width:100%;padding:14px;background:var(--s2);border:1px solid var(--bd);border-radius:12px;color:var(--t1);font-size:15px;outline:0;margin-bottom:12px}
.inp:focus{border-color:var(--gr)}
.inp::placeholder{color:var(--t2)}
.row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--bd)}
.row:last-child{border:0}
.err{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);color:var(--rd);padding:12px;border-radius:12px;margin-bottom:12px;font-size:13px}
.ok{background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.25);color:var(--gr);padding:12px;border-radius:12px;margin-bottom:12px;font-size:13px}
.load{text-align:center;padding:40px;color:var(--t2)}
.tabs{display:flex;gap:4px;margin-bottom:14px;overflow-x:auto}
textarea.inp{min-height:80px;resize:vertical;font-family:inherit}
`;

const tg = () => window.Telegram?.WebApp;

/* ═══════════════════════════════════════════════════════════════
   APP
   ═══════════════════════════════════════════════════════════════ */
export default function App() {
  const [page, setPage] = useState('loading');
  const [user, setUser] = useState(null);
  const [part, setPart] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
    const t = tg();
    if (t) { t.ready(); t.expand(); t.setHeaderColor('#0e0e0e'); t.setBackgroundColor('#0e0e0e'); }
    init();
  }, []);

  async function init() {
    try {
      const t = tg();
      const initData = t?.initData;
      if (!initData) {
        // Dev mode
        setUser({ firstName: 'Dev', lastName: 'Mode', role: 'SUPERADMIN' });
        setPart({ id: 'dev', cohort: 'Тест', city: 'Астана', totalPoints: 42, events: [] });
        setPage('home');
        return;
      }
      const r = await api.authTelegram(initData);
      api.setToken(r.token);
      setUser(r.user);
      if (r.user.participant) { setPart(r.user.participant); setPage('home'); }
      else if (['ADMIN','SUPERADMIN'].includes(r.user.role)) setPage('admin');
      else setPage('link');
    } catch (e) { setErr(e.message); setPage('link'); }
  }

  async function refresh() {
    try { const d = await api.getProfile(); setUser(d.user); setPart(d.participant); } catch {}
  }

  const isAdmin = ['ADMIN','SUPERADMIN'].includes(user?.role);
  const nav = [
    { id:'home', ic:'🏠', l:'Басты' },
    { id:'qr', ic:'🔲', l:'QR' },
    { id:'history', ic:'📋', l:'Журнал' },
    { id:'points', ic:'⭐', l:'Баллдар' },
    ...(isAdmin ? [{ id:'admin', ic:'⚙️', l:'Админ' }] : []),
  ];

  const P = {
    loading: <div className="load">Жүктелуде...</div>,
    link: <LinkPage onOk={(u,p)=>{setUser(u);setPart(p);setPage('home')}} err={err} />,
    home: <HomePage user={user} part={part} onRefresh={refresh} />,
    qr: <QrPage part={part} />,
    history: <HistoryPage />,
    points: <PointsPage />,
    admin: <AdminPage />,
  };

  return (
    <div className="app">
      {P[page] || <div className="load">?</div>}
      {page !== 'loading' && page !== 'link' && (
        <nav className="nav"><div className="nav-in">
          {nav.map(n => (
            <button key={n.id} className={`nav-b ${page===n.id?'on':''}`} onClick={()=>setPage(n.id)}>
              <span className="ic">{n.ic}</span>{n.l}
            </button>
          ))}
        </div></nav>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LINK PAGE — Аккаунт привязкасы
   ═══════════════════════════════════════════════════════════════ */
function LinkPage({ onOk, err: initErr }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(initErr);

  async function handle() {
    if (!code.trim()) return;
    setLoading(true); setErr(null);
    try {
      const r = await api.linkAccount(tg()?.initData || '', code.trim());
      api.setToken(r.token);
      onOk(r.user, r.participant);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }

  return (
    <div style={{paddingTop:60,textAlign:'center'}}>
      <div style={{fontSize:48,marginBottom:16}}>🎓</div>
      <h2 style={{marginBottom:8}}>Аккаунт привязкасы</h2>
      <p style={{color:'var(--t2)',marginBottom:24,fontSize:13}}>
        Тіркеу кезінде берілген кодты енгізіңіз
      </p>
      {err && <div className="err">{err}</div>}
      <input className="inp" placeholder="Код (мыс. CH-001)" value={code}
        onChange={e=>setCode(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handle()} />
      <button className="btn btn-g" onClick={handle} disabled={loading}>
        {loading ? 'Тексерілуде...' : 'Байланыстыру'}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HOME — Басты бет
   ═══════════════════════════════════════════════════════════════ */
function HomePage({ user, part, onRefresh }) {
  useEffect(() => { onRefresh(); }, []);
  const g = grade(part?.totalPoints);

  return <>
    <div className="card">
      <div className="card-h">Профиль</div>
      <div className="name">{user?.firstName} {user?.lastName || ''}</div>
      <div className="meta">
        {part?.cohort}{part?.city && ` · ${part.city}`}
        {part?.programName && <div>{part.programName}</div>}
      </div>
    </div>
    <div className="stats">
      <div className="stat"><b>{part?.totalPoints||0}</b><small>Баллдар</small></div>
      <div className="stat"><b>{part?.events?.length||0}</b><small>Оқытулар</small></div>
      <div className="stat"><b style={{color:g.c}}>{g.n}</b><small>Грейд</small></div>
    </div>
    {part?.events?.length > 0 && (
      <div className="card">
        <div className="card-h">Мероприятиелерім</div>
        {part.events.map(ev => (
          <div key={ev.id} className="ev-card">
            <div className="ev-t">{ev.title}</div>
            <div className="ev-m">
              {new Date(ev.startAt).toLocaleDateString('kk-KZ',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})}
              {ev.placeName && ` · ${ev.placeName}`}
            </div>
          </div>
        ))}
      </div>
    )}
  </>;
}

function grade(pts = 0) {
  if (pts >= 200) return { n:'Platinum', c:'var(--vi)' };
  if (pts >= 100) return { n:'Gold', c:'var(--or)' };
  if (pts >= 30)  return { n:'Silver', c:'#94a3b8' };
  return { n:'—', c:'var(--t2)' };
}

/* ═══════════════════════════════════════════════════════════════
   QR PAGE — Динамикалық QR
   ═══════════════════════════════════════════════════════════════ */
function QrPage({ part }) {
  const [payload, setPayload] = useState(null);
  const [selEv, setSelEv] = useState(null);
  const [events, setEvents] = useState([]);
  const [err, setErr] = useState(null);
  const [sec, setSec] = useState(0);
  const timer = useRef(null);
  const refresh = useRef(null);

  useEffect(() => {
    api.getMyEvents().then(d => {
      setEvents(d.events || []);
      if (d.events?.length === 1) pickEvent(d.events[0]);
    }).catch(e => setErr(e.message));
    return () => { clearInterval(timer.current); clearTimeout(refresh.current); };
  }, []);

  async function pickEvent(ev) {
    setSelEv(ev);
    await genQr(ev.id);
  }

  async function genQr(eventId) {
    try {
      setErr(null);
      const d = await api.generateQr(eventId);
      setPayload(d.payload);
      const left = d.expiresAt - Math.floor(Date.now()/1000);
      setSec(left);
      clearInterval(timer.current);
      timer.current = setInterval(() => setSec(p => p <= 1 ? (clearInterval(timer.current), 0) : p - 1), 1000);
      clearTimeout(refresh.current);
      refresh.current = setTimeout(() => genQr(eventId), d.refreshInMs || 30000);
    } catch (e) { setErr(e.message); }
  }

  if (!events.length) return (
    <div style={{textAlign:'center',paddingTop:60}}>
      <div style={{fontSize:48,marginBottom:12}}>📋</div>
      <p style={{color:'var(--t2)'}}>Белсенді мероприятие жоқ</p>
    </div>
  );

  if (!selEv) return (
    <div className="card">
      <div className="card-h">Мероприятие таңдаңыз</div>
      {events.map(ev => (
        <div key={ev.id} className="ev-card" onClick={()=>pickEvent(ev)}>
          <div className="ev-t">{ev.title}</div>
          <div className="ev-m">{new Date(ev.startAt).toLocaleDateString('kk-KZ',{day:'numeric',month:'long'})}</div>
        </div>
      ))}
    </div>
  );

  return <>
    <div className="card qr-wrap">
      <div className="card-h" style={{alignSelf:'flex-start'}}>{selEv.title}</div>
      {err && <div className="err">{err}</div>}
      {payload ? <>
        <div className="qr-box">
          <QRCodeSVG value={payload} size={200} level="M" bgColor="#fff" fgColor="#000" />
        </div>
        <div className="qr-timer"><span className="dot"/>{sec} сек кейін жаңарады</div>
      </> : <div className="load">QR құрылуда...</div>}
    </div>
    <p style={{textAlign:'center',color:'var(--t2)',fontSize:12,marginTop:6}}>
      Осы кодты админге көрсетіңіз
    </p>
  </>;
}

/* ═══════════════════════════════════════════════════════════════
   HISTORY — Журнал
   ═══════════════════════════════════════════════════════════════ */
function HistoryPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyAttendance().then(d => setLogs(d.logs||[])).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  if (loading) return <div className="load">Жүктелуде...</div>;

  return (
    <div className="card">
      <div className="card-h">Посещаемость журналы</div>
      {!logs.length ? <p style={{color:'var(--t2)',textAlign:'center',padding:20}}>Жазбалар жоқ</p>
      : logs.map(l => (
        <div key={l.id} className="row">
          <div>
            <div style={{fontWeight:600,fontSize:14}}>{l.event?.title||'Мероприятие'}</div>
            <div style={{fontSize:12,color:'var(--t2)'}}>{new Date(l.scannedAt).toLocaleString('kk-KZ')}</div>
          </div>
          <span className={`badge ${l.action==='CHECK_IN'?'bg':'bo'}`}>
            {l.action==='CHECK_IN'?'Кіру':'Шығу'}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   POINTS — Баллдар
   ═══════════════════════════════════════════════════════════════ */
function PointsPage() {
  const [data, setData] = useState({ total: 0, history: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyPoints().then(setData).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  if (loading) return <div className="load">Жүктелуде...</div>;
  const g = grade(data.total);

  return <>
    <div className="stats">
      <div className="stat"><b>{data.total}</b><small>Жалпы балл</small></div>
      <div className="stat"><b style={{color:g.c}}>{g.n}</b><small>Грейд</small></div>
    </div>
    <div className="card">
      <div className="card-h">Балл тарихы</div>
      {!data.history.length ? <p style={{color:'var(--t2)',textAlign:'center',padding:20}}>Бос</p>
      : data.history.map(e => (
        <div key={e.id} className="row">
          <div>
            <div style={{fontWeight:500,fontSize:14}}>{e.reason}</div>
            <div style={{fontSize:11,color:'var(--t2)'}}>{new Date(e.createdAt).toLocaleString('kk-KZ')}</div>
          </div>
          <span style={{fontWeight:700,color:e.pointsDelta>0?'var(--gr)':'var(--rd)'}}>
            {e.pointsDelta>0?'+':''}{e.pointsDelta}
          </span>
        </div>
      ))}
    </div>
    <div className="card">
      <div className="card-h">Грейд жүйесі</div>
      <div className="row"><span>Silver</span><span style={{color:'#94a3b8'}}>30+ балл</span></div>
      <div className="row"><span>Gold</span><span style={{color:'var(--or)'}}>100+ балл</span></div>
      <div className="row"><span>Platinum</span><span style={{color:'var(--vi)'}}>200+ балл</span></div>
    </div>
  </>;
}

/* ═══════════════════════════════════════════════════════════════
   ADMIN — Сканер + Рассылка + Отчёт
   ═══════════════════════════════════════════════════════════════ */
function AdminPage() {
  const [tab, setTab] = useState('scan');
  const [events, setEvents] = useState([]);
  const [selEv, setSelEv] = useState(null);
  const [scanRes, setScanRes] = useState(null);
  const [scanErr, setScanErr] = useState(null);
  const [dash, setDash] = useState(null);
  const [report, setReport] = useState(null);
  const [msg, setMsg] = useState('');
  const [broadcastOk, setBroadcastOk] = useState(null);

  useEffect(() => {
    api.getAdminEvents().then(d=>setEvents(d.events||[])).catch(()=>{});
    api.getDashboard().then(setDash).catch(()=>{});
  }, []);

  // ─── QR Сканер ──────────────────────────────────
  function startScan() {
    const t = tg();
    if (t?.showScanQrPopup) {
      t.showScanQrPopup({ text: 'QR-ды камераға көрсетіңіз' }, async (data) => {
        if (data) { t.closeScanQrPopup(); await handleQr(data); return true; }
      });
    } else {
      const p = prompt('QR payload (dev):');
      if (p) handleQr(p);
    }
  }

  async function handleQr(payload) {
    setScanErr(null); setScanRes(null);
    try { setScanRes(await api.verifyQr(payload)); }
    catch (e) { setScanErr(e.message); }
  }

  async function confirmScan(action) {
    try {
      await api.scanAttendance({
        participantId: scanRes.participant.id,
        eventId: scanRes.eventId,
        action,
        nonce: scanRes.nonce,
      });
      setScanRes(p => ({ ...p, done: true, doneAction: action }));
      // Вибрация
      tg()?.HapticFeedback?.notificationOccurred('success');
    } catch (e) { setScanErr(e.message); }
  }

  // ─── Отчёт ─────────────────────────────────────
  async function loadReport(eventId) {
    try { setReport(await api.getEventReport(eventId)); }
    catch (e) { setScanErr(e.message); }
  }

  // ─── Рассылка ──────────────────────────────────
  async function sendBroadcast() {
    if (!msg.trim()) return;
    try {
      const r = await api.broadcast({ message: msg, eventId: selEv?.id });
      setBroadcastOk(r.message);
      setMsg('');
    } catch (e) { setScanErr(e.message); }
  }

  const tabs = [
    { id:'scan', l:'📷 Сканер' },
    { id:'report', l:'📊 Отчёт' },
    { id:'broadcast', l:'📢 Рассылка' },
    { id:'dash', l:'📈 Сводка' },
  ];

  return <>
    <div className="tabs">
      {tabs.map(t => (
        <button key={t.id} className={`btn btn-s ${tab===t.id?'btn-g':'btn-o'}`}
          onClick={()=>{setTab(t.id);setScanRes(null);setScanErr(null);setBroadcastOk(null)}}>{t.l}</button>
      ))}
    </div>

    {/* ── Сканер ── */}
    {tab === 'scan' && <>
      {!selEv ? (
        <div className="card">
          <div className="card-h">Мероприятие таңдаңыз</div>
          {events.map(e => (
            <div key={e.id} className="ev-card" onClick={()=>setSelEv(e)}>
              <div className="ev-t">{e.title}</div>
              <div className="ev-m">Жазылған: {e.enrolledCount} · Сканер: {e.scansCount}</div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <div className="card">
            <div className="card-h">{selEv.title}</div>
            <button className="btn btn-g" onClick={startScan} style={{marginBottom:8}}>📷 QR сканерлеу</button>
            <button className="btn btn-o" onClick={()=>{setSelEv(null);setScanRes(null)}}>← Басқа мероприятие</button>
          </div>
          {scanErr && <div className="err">{scanErr}</div>}
          {scanRes && !scanRes.done && (
            <div className="card scan-r">
              <div className="em">👤</div>
              <div className="sn">{scanRes.participant.firstName} {scanRes.participant.lastName}</div>
              <div className="si">{scanRes.participant.cohort} · {scanRes.participant.city}</div>
              {scanRes.lastAction && (
                <p style={{fontSize:12,color:'var(--t2)',marginBottom:12}}>
                  Соңғы: {scanRes.lastAction==='CHECK_IN'?'Кіру':'Шығу'} — {new Date(scanRes.lastActionAt).toLocaleTimeString('kk-KZ')}
                </p>
              )}
              <div className="btn-row">
                <button className="btn btn-g" onClick={()=>confirmScan('CHECK_IN')}>✅ Кіру</button>
                <button className="btn btn-r" onClick={()=>confirmScan('CHECK_OUT')}>🚪 Шығу</button>
              </div>
            </div>
          )}
          {scanRes?.done && (
            <div className="card scan-r">
              <div className="em">{scanRes.doneAction==='CHECK_IN'?'✅':'🚪'}</div>
              <div className="sn">{scanRes.participant.firstName} {scanRes.participant.lastName}</div>
              <div className="ok">{scanRes.doneAction==='CHECK_IN'?'Кіру белгіленді':'Шығу белгіленді'}</div>
              <button className="btn btn-g" onClick={()=>{setScanRes(null);startScan()}}>📷 Келесі</button>
            </div>
          )}
        </div>
      )}
    </>}

    {/* ── Отчёт ── */}
    {tab === 'report' && <>
      {!report ? (
        <div className="card">
          <div className="card-h">Мероприятие таңдаңыз</div>
          {events.map(e => (
            <div key={e.id} className="ev-card" onClick={()=>loadReport(e.id)}>
              <div className="ev-t">{e.title}</div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <div className="card">
            <div className="card-h">{report.event.title}</div>
            <div className="stats">
              <div className="stat"><b>{report.summary.present}</b><small>Келді</small></div>
              <div className="stat"><b style={{color:'var(--rd)'}}>{report.summary.absent}</b><small>Келмеді</small></div>
              <div className="stat"><b style={{color:'var(--bl)'}}>{report.summary.inside}</b><small>Ішінде</small></div>
            </div>
            <button className="btn btn-o btn-s" onClick={()=>setReport(null)}>← Артқа</button>
          </div>
          <div className="card">
            <div className="card-h">Қатысушылар ({report.summary.total})</div>
            {report.participants.map(p => (
              <div key={p.id} className="row">
                <div>
                  <div style={{fontWeight:600,fontSize:14}}>{p.firstName} {p.lastName}</div>
                  <div style={{fontSize:11,color:'var(--t2)'}}>{p.cohort} · {p.city}</div>
                </div>
                <span className={`badge ${p.status==='completed'?'bg':p.status==='inside'?'bo':'br'}`}>
                  {p.status==='completed'?'✓':p.status==='inside'?'Ішінде':'Жоқ'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>}

    {/* ── Рассылка ── */}
    {tab === 'broadcast' && (
      <div className="card">
        <div className="card-h">📢 Бұқаралық хабарлама</div>
        {scanErr && <div className="err">{scanErr}</div>}
        {broadcastOk && <div className="ok">{broadcastOk}</div>}
        <select className="inp" onChange={e=>{
          const ev = events.find(x=>x.id===e.target.value);
          setSelEv(ev||null);
        }} style={{marginBottom:12}}>
          <option value="">Барлығына</option>
          {events.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
        <textarea className="inp" placeholder="Хабарлама мәтіні..." value={msg}
          onChange={e=>setMsg(e.target.value)} />
        <button className="btn btn-b" onClick={sendBroadcast}>Жіберу</button>
      </div>
    )}

    {/* ── Dashboard ── */}
    {tab === 'dash' && dash && (
      <div>
        <div className="stats">
          <div className="stat"><b>{dash.totalParticipants}</b><small>Қатысушылар</small></div>
          <div className="stat"><b>{dash.linkedParticipants}</b><small>Привязка</small></div>
        </div>
        <div className="stats">
          <div className="stat"><b>{dash.activeEvents}</b><small>Оқытулар</small></div>
          <div className="stat"><b>{dash.todayScans}</b><small>Бүгін сканер</small></div>
        </div>
      </div>
    )}
  </>;
}
