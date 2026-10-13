import { useState, type ReactNode } from "react";

type IconName = "home" | "clipboard" | "chart" | "settings" | "plus" | "arrow" | "wifi" | "refresh" | "check" | "clock" | "boat" | "chevron" | "close" | "camera" | "mic";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4.5h6M9 10h6M9 14h6M9 18h3" /><path d="M9 2h6v4H9z" /></>,
    chart: <><path d="M3 20h18M6 16v-5M12 16V5M18 16V9" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.1.9-1 1.8-1.4-.4a8 8 0 0 1-1.4.8l-.3 1.5h-2.1l-.4-1.4a8 8 0 0 1-1.6-.1l-1 1.1-1.8-1 .4-1.4a8 8 0 0 1-.8-1.4l-1.5-.3v-2.1l1.4-.4a8 8 0 0 1 .1-1.6l-1.1-1 1-1.8 1.4.4a8 8 0 0 1 1.4-.8l.3-1.5h2.1l.4 1.4a8 8 0 0 1 1.6.1l1-1.1 1.8 1-.4 1.4a8 8 0 0 1 .8 1.4l1.5.3v2.1l-1.4.4a8 8 0 0 1-.2 1.5Z" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    wifi: <><path d="M5 9a11 11 0 0 1 14 0M8 12a6.5 6.5 0 0 1 8 0M11 15a2 2 0 0 1 2 0M12 19h.01" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9A7 7 0 0 1 18 6l2 2M4 16l2 2a7 7 0 0 0 12.5-3" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    boat: <><path d="M3 15h18l-2 4H6l-3-4Z" /><path d="M12 4v11M12 5l5 4h-5M3 20c2 1 3 1 5 0s3-1 5 0 3 1 5 0 2-1 3-1" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    camera: <><path d="M4 7h3l2-2h6l2 2h3v12H4z" /><circle cx="12" cy="13" r="3" /></>,
    mic: <><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

const queue = [
  { boat: "Demo Boat 07", detail: "Tafi · 7.4 kg", id: "LM-017", time: "08:42" },
  { boat: "Demo Boat 09", detail: "Mchanganyiko · 6.8 kg", id: "LM-018", time: "08:16" },
];

export default function MoaiDockside() {
  const [active, setActive] = useState("Today");
  const [showCapture, setShowCapture] = useState(false);
  const [expandedDraft, setExpandedDraft] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState("");

  const syncNow = () => {
    setSyncing(true);
    window.setTimeout(() => {
      setSyncing(false);
      setNotice("Local queue checked · demo only");
      window.setTimeout(() => setNotice(""), 2800);
    }, 700);
  };

  return (
    <main className="dockside">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        .dockside { --ink:#173536; --deep:#123f42; --teal:#087c79; --foam:#dcebe6; --mist:#f3f7f4; --paper:#fbfcf8; --line:#d8e2dc; --muted:#647773; --amber:#a75a16; min-height:100dvh; width:100%; background:var(--mist); color:var(--ink); font-family:'DM Sans',sans-serif; position:relative; overflow:hidden; padding-bottom:82px; }
        .dockside button { font:inherit; cursor:pointer; }
        .dock-header { padding:22px 22px 18px; background:var(--paper); border-bottom:1px solid var(--line); }
        .dock-topline { display:flex; align-items:center; justify-content:space-between; }
        .brand-mark { display:flex; align-items:center; gap:10px; }
        .brand-seal { width:35px; height:35px; display:grid; place-items:center; border-radius:12px 12px 12px 4px; background:var(--deep); color:#dcebe6; }
        .brand-name { font:800 12px/1 'Manrope',sans-serif; letter-spacing:.13em; text-transform:uppercase; }
        .brand-place { color:var(--muted); font-size:10px; margin-top:4px; }
        .sync-pill { display:flex; align-items:center; gap:6px; border:1px solid #c8dfd3; background:#edf6ee; color:#216e4c; padding:7px 10px; border-radius:30px; font-size:10px; font-weight:700; letter-spacing:.02em; }
        .welcome { margin-top:22px; display:flex; justify-content:space-between; align-items:flex-end; }
        .welcome-kicker { color:var(--teal); font-weight:700; text-transform:uppercase; letter-spacing:.13em; font-size:9px; }
        .welcome h1 { font:700 25px/1.15 'Manrope',sans-serif; letter-spacing:-.045em; margin:6px 0 4px; }
        .welcome p { margin:0; font-size:11px; color:var(--muted); }
        .date-stamp { color:var(--muted); font-size:9px; text-align:right; line-height:1.55; }
        .date-stamp strong { display:block; color:var(--ink); font-size:11px; font-weight:700; }
        .dock-main { padding:18px 18px 0; }
        .feature-panel { position:relative; overflow:hidden; min-height:190px; border-radius:20px; padding:19px 20px; color:#f6fbf7; background:var(--deep); }
        .feature-panel:after { content:''; position:absolute; width:190px; height:190px; right:-46px; top:-62px; border:1px solid rgba(220,235,230,.19); border-radius:50%; box-shadow:0 0 0 19px rgba(220,235,230,.035),0 0 0 42px rgba(220,235,230,.025); }
        .feature-panel:before { content:''; position:absolute; width:160px; height:1px; right:5px; top:99px; transform:rotate(-28deg); background:rgba(220,235,230,.24); }
        .feature-label { color:#b7d9cb; font-size:9px; font-weight:700; letter-spacing:.15em; text-transform:uppercase; }
        .feature-stat { display:flex; gap:10px; align-items:baseline; margin-top:14px; }
        .feature-number { font:700 48px/.95 'Manrope',sans-serif; letter-spacing:-.07em; }
        .feature-unit { font-size:11px; color:#b7d9cb; }
        .feature-title { margin-top:7px; font:600 13px 'Manrope',sans-serif; }
        .feature-meta { margin-top:4px; font-size:10px; color:#b7d9cb; }
        .feature-badge { position:absolute; right:16px; bottom:16px; z-index:1; display:flex; align-items:center; gap:6px; background:#dcebe6; color:var(--deep); border-radius:8px; padding:8px 10px; font-size:9px; font-weight:700; }
        .sparkline { position:absolute; right:20px; top:64px; width:104px; height:48px; z-index:1; opacity:.9; }
        .metric-strip { margin:13px 0 18px; display:grid; grid-template-columns:repeat(3,1fr); background:#e8f0eb; border-radius:14px; padding:13px 4px; }
        .metric { text-align:center; border-right:1px solid #d0ded6; }
        .metric:last-child { border:0; }
        .metric strong { display:block; font:700 20px/1.1 'Manrope',sans-serif; letter-spacing:-.04em; }
        .metric span { display:block; margin-top:5px; font-size:9px; color:var(--muted); }
        .section-head { display:flex; align-items:center; justify-content:space-between; margin:0 2px 10px; }
        .section-head h2 { margin:0; font:700 14px 'Manrope',sans-serif; letter-spacing:-.02em; }
        .section-link { border:0; background:transparent; color:var(--teal); font-size:10px; font-weight:700; padding:5px 0 5px 8px; }
        .queue-card { overflow:hidden; background:var(--paper); border:1px solid var(--line); border-radius:15px; }
        .queue-item { width:100%; display:flex; align-items:center; text-align:left; gap:11px; padding:12px 13px; border:0; background:transparent; color:inherit; }
        .queue-item + .queue-item { border-top:1px solid #edf1ed; }
        .queue-icon { flex:none; width:34px; height:34px; display:grid; place-items:center; border-radius:11px; color:var(--amber); background:#fff1d9; }
        .queue-copy { min-width:0; flex:1; }
        .queue-copy strong { display:block; font-size:11px; font-weight:700; }
        .queue-copy span { display:block; color:var(--muted); font-size:9px; margin-top:4px; }
        .queue-trail { align-self:stretch; display:flex; align-items:center; gap:6px; color:var(--muted); font-size:9px; }
        .draft-expanded { margin:-4px 13px 12px 58px; padding:9px 10px; background:#f2f6f2; border-radius:9px; color:var(--muted); font-size:9px; line-height:1.5; }
        .section-row { margin-top:18px; display:flex; align-items:center; justify-content:space-between; }
        .sync-card { display:flex; align-items:center; gap:11px; padding:12px 13px; border-radius:14px; border:1px solid var(--line); background:var(--paper); }
        .sync-icon { width:34px; height:34px; border-radius:11px; background:#e2efec; color:var(--teal); display:grid; place-items:center; flex:none; }
        .sync-copy { min-width:0; flex:1; }
        .sync-copy strong { display:block; font-size:10px; }
        .sync-copy span { display:block; margin-top:4px; color:var(--muted); font-size:9px; }
        .retry { border:0; color:var(--teal); background:#e7f2ed; border-radius:9px; width:34px; height:34px; display:grid; place-items:center; }
        .disclaimer { margin:8px 4px 15px; color:#778781; font-size:8px; line-height:1.4; }
        .record-button { width:100%; display:flex; align-items:center; gap:11px; padding:14px; border:0; border-radius:15px; background:var(--teal); color:#f7fbf8; text-align:left; box-shadow:0 7px 16px rgba(8,124,121,.17); }
        .record-plus { width:33px; height:33px; display:grid; place-items:center; border-radius:50%; background:#dcebe6; color:var(--deep); }
        .record-label { flex:1; font:700 12px 'Manrope',sans-serif; }
        .record-label small { display:block; margin-top:3px; color:#d5e9df; font:400 9px 'DM Sans',sans-serif; }
        .bottom-nav { position:fixed; z-index:3; bottom:0; left:0; width:100%; display:grid; grid-template-columns:repeat(4,1fr); padding:9px 6px max(10px,env(safe-area-inset-bottom)); background:rgba(251,252,248,.96); border-top:1px solid var(--line); backdrop-filter:blur(12px); }
        .nav-item { border:0; background:transparent; color:#7d8d86; display:flex; flex-direction:column; align-items:center; gap:4px; font-size:8px; font-weight:600; padding:2px 0; }
        .nav-item.active { color:var(--teal); }
        .nav-item.active:before { content:''; width:18px; height:2px; border-radius:2px; background:var(--teal); position:absolute; margin-top:-9px; }
        .notice { position:fixed; z-index:8; left:50%; bottom:88px; transform:translateX(-50%); background:var(--deep); color:#f7fbf8; border-radius:30px; white-space:nowrap; padding:10px 15px; font-size:10px; box-shadow:0 6px 22px #123f4233; }
        .capture-backdrop { position:fixed; inset:0; z-index:10; display:flex; align-items:flex-end; background:rgba(13,38,38,.4); }
        .capture-sheet { width:100%; padding:21px 20px max(24px,env(safe-area-inset-bottom)); background:var(--paper); border-radius:23px 23px 0 0; box-shadow:0 -10px 40px #17353622; }
        .sheet-top { display:flex; justify-content:space-between; align-items:center; }
        .sheet-top h2 { margin:0; font:700 19px 'Manrope',sans-serif; }
        .close-button { border:0; background:#edf2ed; color:var(--ink); border-radius:50%; width:34px; height:34px; display:grid; place-items:center; }
        .sheet-note { margin:7px 0 17px; font-size:11px; color:var(--muted); }
        .capture-choice { width:100%; display:flex; gap:12px; align-items:center; text-align:left; border:1px solid var(--line); color:var(--ink); background:var(--paper); border-radius:13px; padding:13px; margin-top:9px; }
        .capture-choice b { display:block; font-size:11px; }
        .capture-choice small { display:block; color:var(--muted); margin-top:3px; font-size:9px; }
        @media(min-width:600px) { .dockside { max-width:450px; margin:0 auto; box-shadow:0 0 0 1px #d8e2dc; } }
      `}</style>
      <header className="dock-header">
        <div className="dock-topline">
          <div className="brand-mark">
            <div className="brand-seal"><Icon name="boat" size={20} /></div>
            <div><div className="brand-name">MOAI BMU</div><div className="brand-place">Kilifi · Landing A</div></div>
          </div>
          <div className="sync-pill"><Icon name="wifi" size={13} /> Device online</div>
        </div>
        <div className="welcome">
          <div><div className="welcome-kicker">Field desk / Wednesday</div><h1>Good morning, Mariam.</h1><p>Here’s the shape of today’s landings.</p></div>
          <div className="date-stamp"><strong>12 Jun</strong>EAT · 09:18</div>
        </div>
      </header>

      <div className="dock-main">
        {active === "Today" ? (
          <>
            <section className="feature-panel" aria-label="Today's catch total">
              <div className="feature-label">Approved catch · today</div>
              <div className="feature-stat"><span className="feature-number">38.6</span><span className="feature-unit">kilograms</span></div>
              <div className="feature-title">A steady morning on the water.</div>
              <div className="feature-meta">Across 4 approved landings</div>
              <svg className="sparkline" viewBox="0 0 110 48" fill="none" aria-hidden="true"><path d="M2 39 19 31 33 34 48 17 63 24 77 9 91 15 108 3" stroke="#b7d9cb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M2 39 19 31 33 34 48 17 63 24 77 9 91 15 108 3V48H2Z" fill="#dcebe6" fillOpacity=".09" /></svg>
              <div className="feature-badge"><Icon name="check" size={12} /> All approved</div>
            </section>

            <div className="metric-strip" aria-label="Daily workflow counts">
              <div className="metric"><strong>4</strong><span>Approved</span></div>
              <div className="metric"><strong>2</strong><span>Need review</span></div>
              <div className="metric"><strong>1</strong><span>Waiting sync</span></div>
            </div>

            <div className="section-head"><h2>Needs a look</h2><button className="section-link" onClick={() => setActive("Review")}>Review queue <Icon name="arrow" size={12} /></button></div>
            <section className="queue-card" aria-label="Drafts awaiting review">
              {queue.map((item) => (
                <div key={item.id}>
                  <button className="queue-item" onClick={() => setExpandedDraft(expandedDraft === item.id ? null : item.id)} aria-expanded={expandedDraft === item.id}>
                    <span className="queue-icon"><Icon name="clock" size={17} /></span>
                    <span className="queue-copy"><strong>{item.boat}</strong><span>{item.detail} · {item.id}</span></span>
                    <span className="queue-trail">{item.time}<Icon name="chevron" size={15} /></span>
                  </button>
                  {expandedDraft === item.id && <div className="draft-expanded">Awaiting official review. Captured on this device and saved locally. <button className="section-link" onClick={() => setActive("Review")}>Open draft</button></div>}
                </div>
              ))}
            </section>

            <div className="section-row"><div className="section-head" style={{ margin: 0 }}><h2>On this device</h2></div></div>
            <section className="sync-card">
              <span className="sync-icon"><Icon name="refresh" size={17} /></span>
              <span className="sync-copy"><strong>{syncing ? "Checking local queue…" : "Saved safely on this phone"}</strong><span>1 approved record waiting to sync</span></span>
              <button className="retry" aria-label="Check sync queue" onClick={syncNow} disabled={syncing}><Icon name="refresh" size={16} /></button>
            </section>
            <p className="disclaimer">Demo sync only · no server upload or multi-device sync.</p>

            <button className="record-button" onClick={() => setShowCapture(true)}>
              <span className="record-plus"><Icon name="plus" size={19} /></span>
              <span className="record-label">Record a landing<small>One boat return · add each catch line</small></span>
              <Icon name="arrow" size={18} />
            </button>
          </>
        ) : (
          <section style={{ padding: "18px 3px" }}>
            <div className="welcome-kicker">MOAI BMU · Kilifi</div>
            <h1 style={{ font: "700 26px Manrope, sans-serif", letterSpacing: "-.04em", margin: "8px 0" }}>{active}</h1>
            <p style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.6 }}>{active === "Review" ? "Two draft landings are waiting for your review." : active === "Records" ? "Approved and saved landings from your site." : "Your device is saving records locally. Demo sync is on."}</p>
            <div className="queue-card" style={{ marginTop: 20 }}>
              {queue.map((item) => <button className="queue-item" key={item.id} onClick={() => setExpandedDraft(expandedDraft === item.id ? null : item.id)}><span className="queue-icon"><Icon name={active === "Review" ? "clock" : "boat"} size={17} /></span><span className="queue-copy"><strong>{item.boat}</strong><span>{item.detail} · {item.id}</span></span><Icon name="chevron" size={15} /></button>)}
            </div>
            {active === "Settings" && <p className="disclaimer" style={{ fontSize: 10, marginTop: 15 }}>Language: English · Site: Demo Landing A · Connectivity: simulated</p>}
          </section>
        )}
      </div>

      <nav className="bottom-nav" aria-label="Main navigation">
        {[["Today", "home"], ["Review", "clipboard"], ["Records", "chart"], ["Settings", "settings"]].map(([label, icon]) => (
          <button key={label} className={`nav-item ${active === label ? "active" : ""}`} onClick={() => setActive(label)} aria-current={active === label ? "page" : undefined}>
            <Icon name={icon as IconName} size={18} />{label}
          </button>
        ))}
      </nav>
      {notice && <div className="notice" role="status">{notice}</div>}
      {showCapture && <div className="capture-backdrop" onClick={() => setShowCapture(false)}>
        <section className="capture-sheet" role="dialog" aria-modal="true" aria-labelledby="capture-title" onClick={(event) => event.stopPropagation()}>
          <div className="sheet-top"><h2 id="capture-title">Record a landing</h2><button className="close-button" aria-label="Close" onClick={() => setShowCapture(false)}><Icon name="close" size={17} /></button></div>
          <p className="sheet-note">Choose how to capture this boat’s return.</p>
          <button className="capture-choice" onClick={() => { setShowCapture(false); setNotice("Manual landing form opened"); window.setTimeout(() => setNotice(""), 2400); }}><span className="sync-icon"><Icon name="clipboard" size={17} /></span><span><b>Enter landing details</b><small>Vessel, time, and catch items</small></span><Icon name="chevron" size={16} /></button>
          <button className="capture-choice" onClick={() => { setShowCapture(false); setNotice("Voice capture is ready"); window.setTimeout(() => setNotice(""), 2400); }}><span className="sync-icon"><Icon name="mic" size={17} /></span><span><b>Voice report</b><small>Speak the landing details</small></span><Icon name="chevron" size={16} /></button>
          <button className="capture-choice" onClick={() => { setShowCapture(false); setNotice("Photo capture is ready"); window.setTimeout(() => setNotice(""), 2400); }}><span className="sync-icon"><Icon name="camera" size={17} /></span><span><b>Photo catch</b><small>Start with a catch photo</small></span><Icon name="chevron" size={16} /></button>
        </section>
      </div>}
    </main>
  );
}
