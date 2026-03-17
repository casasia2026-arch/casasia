import { useState, useEffect, useRef, useCallback } from "react";

// ══════════════════════════════════════════════════════════════════
//  casAsia — Web App
//  PROD_MODE = false  →  demo (window.storage, artifact Claude)
//  PROD_MODE = true   →  produzione (Google Apps Script)
// ══════════════════════════════════════════════════════════════════

const PROD_MODE = false;
const API_URL   = "INCOLLA_QUI_URL_APPS_SCRIPT";

// ── TIPI AGEVOLAZIONE ─────────────────────────────────────────────
const TIPI_DET = [
  { id:"ristr_50", nome:"Bonus Ristrutturazione 50%", short:"Ristr.50%",
    desc:"Abitazione principale • max €96.000", aliquota:0.50, massimale:96000, rate:10,
    color:"#1e40af", bg:"#dbeafe", emoji:"🏠",
    causale:"Pagamento ex art. 16-bis DPR 917/86 – CF {CF} – P.IVA {PIVA}", bparlante:true },
  { id:"ristr_36", nome:"Bonus Ristrutturazione 36%", short:"Ristr.36%",
    desc:"Altre abitazioni • max €96.000", aliquota:0.36, massimale:96000, rate:10,
    color:"#1d4ed8", bg:"#eff6ff", emoji:"🏡",
    causale:"Pagamento ex art. 16-bis DPR 917/86 – CF {CF} – P.IVA {PIVA}", bparlante:true },
  { id:"eco_50", nome:"Ecobonus 50%", short:"Eco 50%",
    desc:"Ab. principale • max €60.000 • ENEA", aliquota:0.50, massimale:60000, rate:10,
    color:"#166534", bg:"#dcfce7", emoji:"🌿",
    causale:"Pagamento ai sensi D.M. 19/02/2007 – CF {CF} – P.IVA {PIVA}", bparlante:true },
  { id:"eco_36", nome:"Ecobonus 36%", short:"Eco 36%",
    desc:"Altre abitazioni • max €60.000 • ENEA", aliquota:0.36, massimale:60000, rate:10,
    color:"#15803d", bg:"#f0fdf4", emoji:"🌱",
    causale:"Pagamento ai sensi D.M. 19/02/2007 – CF {CF} – P.IVA {PIVA}", bparlante:true },
  { id:"sisma", nome:"Sismabonus", short:"Sisma",
    desc:"Lavori strutturali • zone sismiche • max €96.000", aliquota:0.50, massimale:96000, rate:5,
    color:"#6d28d9", bg:"#ede9fe", emoji:"🏗️",
    causale:"Pagamento ex art. 16-bis DPR 917/86 (Sismabonus) – CF {CF} – P.IVA {PIVA}", bparlante:true },
  { id:"fvg_manu", nome:"Contributo FVG — Manut.", short:"FVG Manut.",
    desc:"DOMANDA PRIMA DEI LAVORI • max €60.000", aliquota:0.50, massimale:60000, rate:1,
    color:"#b91c1c", bg:"#fee2e2", emoji:"🔴", causale:null, bparlante:false,
    alert:"⚠️ DOMANDA PRIMA DEI LAVORI — portale IOL Regione FVG con SPID/CIE" },
  { id:"fvg_ener", nome:"Contributo FVG — Energetico", short:"FVG Energ.",
    desc:"Lavori post 1/1/2025 • max €12.000", aliquota:0.50, massimale:12000, rate:1,
    color:"#c2410c", bg:"#ffedd5", emoji:"🟠", causale:null, bparlante:false },
  { id:"nessuna", nome:"Nessuna agevolazione", short:"Nessuna",
    desc:"Spesa non agevolata", aliquota:0, massimale:null, rate:null,
    color:"#374151", bg:"#f3f4f6", emoji:"📄", causale:null, bparlante:false },
];

const EMAIL_TPLS = [
  { id:"tpl_ristr", nome:"Bonus Ristrutturazione", emoji:"🏠",
    oggetto:"Istruzioni emissione fattura – Bonus Ristrutturazione",
    corpo:`Gentile {IMPRESA},\n\nLe trasmettiamo le istruzioni per la corretta emissione della fattura relativa ai lavori presso {INDIRIZZO}.\n\nDESCRIZIONE IN FATTURA\n"Intervento di {TIPO_INTERVENTO} su unità abitativa sita in {INDIRIZZO} – {DESCRIZIONE_LAVORI}"\n\nCommittente: {COMMITTENTE} – C.F. {CF}\nRif. normativo: art. 16-bis DPR 917/86\n\nMODALITÀ DI PAGAMENTO – Bonifico parlante obbligatorio:\n"{CAUSALE}"\n\nCordiali saluti\n{COMMITTENTE}` },
  { id:"tpl_eco", nome:"Ecobonus", emoji:"🌿",
    oggetto:"Istruzioni emissione fattura – Ecobonus",
    corpo:`Gentile {IMPRESA},\n\nPer i lavori di riqualificazione energetica presso {INDIRIZZO}:\n\nFATTURA: "Fornitura e posa di {DESCRIZIONE_LAVORI} conformi D.M. 19/02/2007 – unità abitativa sita in {INDIRIZZO}"\n\nCommittente: {COMMITTENTE} – C.F. {CF}\n\nBonifico parlante: "{CAUSALE}"\n\nCordiali saluti\n{COMMITTENTE}` },
  { id:"tpl_fvg", nome:"Contributo FVG", emoji:"🔴",
    oggetto:"Istruzioni fatturazione – Contributo FVG L.R. 8/2025",
    corpo:`Gentile {IMPRESA},\n\nIndicazioni per la documentazione ai fini del contributo regionale FVG (L.R. 8/2025).\n\nImmobile: {INDIRIZZO}\nCommittente: {COMMITTENTE} – C.F. {CF}\n\nLA FATTURA DEVE:\n- Descrivere dettagliatamente i lavori distinguendo le lavorazioni ammesse da quelle non ammesse\n- Indicare chiaramente l'immobile oggetto di intervento\n- Riportare la data di esecuzione\n\nNOTA: Bando Manutenzione (Art.2) → domanda PRIMA dei lavori\n      Bando Energetico (Art.3) → domanda a lavori ultimati\n\nCordiali saluti\n{COMMITTENTE}` },
];

const AVATARS = ["🏠","🔨","⚒️","🪚","🧱","🪟","🚿","🛠️","⚡","🔥"];
const TIPI_DOC = [
  { id:"fattura",   label:"Fattura",   emoji:"🧾", prefix:"FAT", color:"#1e40af", bg:"#dbeafe" },
  { id:"bonifico",  label:"Bonifico",  emoji:"💸", prefix:"BON", color:"#166534", bg:"#dcfce7" },
  { id:"contratto", label:"Contratto", emoji:"📋", prefix:"CTR", color:"#6d28d9", bg:"#ede9fe" },
  { id:"altro",     label:"Altro",     emoji:"📁", prefix:"DOC", color:"#374151", bg:"#f3f4f6" },
];

// ── HELPERS ───────────────────────────────────────────────────────
const fmt  = n => new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(n||0);
const mkid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const slug = s  => s.trim().toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");
const today= () => new Date().toISOString().slice(0,10);
const mkCausale = (det,cf,piva) => det?.causale ? det.causale.replace("{CF}",cf||"[CF]").replace("{PIVA}",piva||"[PIVA]") : "";
const compile   = (tpl,vars) => { let s=tpl; Object.entries(vars).forEach(([k,v])=>{ s=s.split(`{${k}}`).join(v||`[${k}]`); }); return s; };

// ── API (demo ↔ produzione) ───────────────────────────────────────
const D = { users:"casasia_users_v2", data: id=>`casasia_data_v2_${id}` };
const EMPTY = { settings:{committente:{nome:"",cognome:"",cf:"",iban:""},immobile:{indirizzo:"",comune:"",cap:"",foglio:"",particella:"",sub:""}}, imprese:[], fatture:[], pagamenti:[], email_log:[], documenti:[] };

async function api(action, payload={}) {
  if (!PROD_MODE) return demoApi(action, payload);
  const r = await fetch(API_URL, { method:"POST", body:JSON.stringify({action,...payload}), headers:{"Content-Type":"application/json"} });
  return r.json();
}
async function demoApi(action, p) {
  const get = async k => { try{ const r=await window.storage.get(k); return r?JSON.parse(r.value):null; }catch{ return null; } };
  const set = async (k,v) => { try{ await window.storage.set(k,JSON.stringify(v)); }catch{} };
  const del = async k => { try{ await window.storage.delete(k); }catch{} };
  switch(action) {
    case "getUsers": { const u=await get(D.users); return {ok:true,users:u||[]}; }
    case "saveUser": { const u=await get(D.users)||[]; const i=u.findIndex(x=>x.id===p.user.id); i>=0?u[i]=p.user:u.push(p.user); await set(D.users,u); return {ok:true}; }
    case "deleteUser": { await set(D.users,(await get(D.users)||[]).filter(x=>x.id!==p.userId)); await del(D.data(p.userId)); return {ok:true}; }
    case "getData": { const d=await get(D.data(p.userId)); return {ok:true,...(d||EMPTY)}; }
    case "saveAll": { await set(D.data(p.userId),p.data); return {ok:true}; }
    case "uploadFile": {
      const d=await get(D.data(p.userId))||{...EMPTY};
      const doc={...p.docMeta,id:mkid(),created_at:new Date().toISOString(),driveUrl:"#demo",demo:true};
      d.documenti=[...(d.documenti||[]),doc];
      await set(D.data(p.userId),d);
      return {ok:true,doc};
    }
    default: return {ok:false,error:"n/a: "+action};
  }
}

// ── STILI ─────────────────────────────────────────────────────────
const S = {
  i:  { width:"100%", padding:"10px 13px", borderRadius:"10px", border:"1.5px solid #e2dbd0", fontSize:"15px", outline:"none", fontFamily:"Nunito,sans-serif", boxSizing:"border-box", background:"#fdfaf6", color:"#1c2b4a" },
  l:  { display:"block", fontSize:"11px", fontWeight:800, color:"#8a7d6e", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px", fontFamily:"Nunito,sans-serif" },
  c:  { background:"#fff", borderRadius:"14px", border:"1px solid #ede8e0", boxShadow:"0 1px 6px rgba(0,0,0,0.06)" },
  b:  d => ({ width:"100%", padding:"13px", background:d?"#d1cec8":"#c8701a", color:"#fff", border:"none", borderRadius:"10px", fontSize:"15px", fontWeight:800, fontFamily:"Nunito,sans-serif", cursor:d?"not-allowed":"pointer" }),
  s:  { padding:"9px 16px", background:"none", border:"1.5px solid #d1cec8", borderRadius:"10px", fontSize:"14px", fontWeight:700, fontFamily:"Nunito,sans-serif", cursor:"pointer", color:"#666" },
};

// ── MODALE ────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#fff",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:"480px",maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 18px 14px",position:"sticky",top:0,background:"#fff",borderBottom:"1px solid #f0ebe3",zIndex:1}}>
          <span style={{fontFamily:"Syne,sans-serif",fontSize:"16px",fontWeight:800,color:"#1c2b4a"}}>{title}</span>
          <button onClick={onClose} style={{background:"#f0ebe3",border:"none",width:"28px",height:"28px",borderRadius:"50%",fontSize:"15px",cursor:"pointer",color:"#555"}}>✕</button>
        </div>
        <div style={{padding:"18px"}}>{children}</div>
      </div>
    </div>
  );
}

// ── LOGIN ─────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [users,  setUsers]  = useState([]);
  const [mode,   setMode]   = useState("list");
  const [nome,   setNome]   = useState("");
  const [av,     setAv]     = useState("🏠");
  const [loading,setLoading]= useState(true);
  const [del,    setDel]    = useState(null);

  useEffect(() => { api("getUsers").then(r => { setUsers(r.users||[]); setLoading(false); }); }, []);

  async function crea() {
    if (!nome.trim()) return;
    const u = { id: slug(nome)+"_"+mkid(), nome: nome.trim(), avatar: av, created: new Date().toISOString() };
    await api("saveUser", { user: u });
    onLogin(u);
  }
  async function rimuovi(u) {
    await api("deleteUser", { userId: u.id });
    setUsers(prev => prev.filter(x => x.id !== u.id));
    setDel(null);
  }

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#1c2b4a"}}>
      <span style={{fontFamily:"Syne,sans-serif",fontSize:"26px",fontWeight:900,color:"#fff"}}>cas<span style={{color:"#c8701a"}}>A</span>sia</span>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(155deg,#1c2b4a 0%,#2d4272 50%,#1a3828 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=Nunito:wght@400;600;700;800;900&display=swap');*{box-sizing:border-box}`}</style>
      <div style={{width:"100%",maxWidth:"380px"}}>
        <div style={{textAlign:"center",marginBottom:"28px"}}>
          <div style={{fontSize:"50px",marginBottom:"6px"}}>🏠</div>
          <div style={{fontFamily:"Syne,sans-serif",fontSize:"32px",fontWeight:900,color:"#fff",letterSpacing:"-0.02em"}}>cas<span style={{color:"#c8701a"}}>A</span>sia</div>
          <div style={{fontSize:"12px",color:"rgba(255,255,255,0.4)",marginTop:"4px",fontFamily:"Nunito,sans-serif"}}>Gestione lavori casa • Friuli Venezia Giulia</div>
        </div>
        <div style={{background:"rgba(255,255,255,0.07)",backdropFilter:"blur(16px)",borderRadius:"20px",border:"1px solid rgba(255,255,255,0.13)",padding:"22px",boxShadow:"0 24px 64px rgba(0,0,0,0.4)"}}>
          {mode === "list" ? (
            <>
              <div style={{fontFamily:"Syne,sans-serif",fontSize:"14px",fontWeight:800,color:"rgba(255,255,255,0.85)",marginBottom:"13px",textAlign:"center"}}>
                {users.length === 0 ? "Crea il tuo profilo per iniziare" : "Chi sei?"}
              </div>
              {users.length > 0 && (
                <div style={{display:"grid",gap:"8px",marginBottom:"12px"}}>
                  {users.map(u => (
                    <div key={u.id}
                      style={{display:"flex",alignItems:"center",gap:"11px",background:"rgba(255,255,255,0.09)",borderRadius:"12px",padding:"12px 14px",border:"1px solid rgba(255,255,255,0.12)",cursor:"pointer"}}
                      onClick={() => onLogin(u)}
                      onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.17)"}
                      onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.09)"}>
                      <span style={{fontSize:"26px",flexShrink:0}}>{u.avatar||"🏠"}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:800,color:"#fff",fontFamily:"Nunito,sans-serif",fontSize:"15px"}}>{u.nome}</div>
                        <div style={{fontSize:"11px",color:"rgba(255,255,255,0.4)",fontFamily:"Nunito,sans-serif"}}>Tocca per accedere →</div>
                      </div>
                      <button onClick={e=>{e.stopPropagation();setDel(u);}} style={{background:"rgba(220,38,38,0.2)",border:"1px solid rgba(220,38,38,0.3)",borderRadius:"7px",padding:"5px 8px",color:"#fca5a5",cursor:"pointer",fontSize:"12px",flexShrink:0}}>🗑</button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setMode("new")} style={{width:"100%",padding:"12px",background:"#c8701a",color:"#fff",border:"none",borderRadius:"10px",fontSize:"14px",fontWeight:800,fontFamily:"Nunito,sans-serif",cursor:"pointer"}}>+ Nuovo profilo</button>
            </>
          ) : (
            <>
              <div style={{fontFamily:"Syne,sans-serif",fontSize:"14px",fontWeight:800,color:"rgba(255,255,255,0.85)",marginBottom:"14px",textAlign:"center"}}>Crea profilo</div>
              <div style={{marginBottom:"12px"}}>
                <label style={{...S.l,color:"rgba(255,255,255,0.55)"}}>Il tuo nome</label>
                <input value={nome} onChange={e=>setNome(e.target.value)} onKeyDown={e=>e.key==="Enter"&&crea()} placeholder="Es: Maria Rossi" autoFocus style={{...S.i,background:"rgba(255,255,255,0.1)",border:"1.5px solid rgba(255,255,255,0.18)",color:"#fff"}} />
              </div>
              <div style={{marginBottom:"16px"}}>
                <label style={{...S.l,color:"rgba(255,255,255,0.55)"}}>Icona profilo</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
                  {AVATARS.map(a => <button key={a} onClick={()=>setAv(a)} style={{width:"40px",height:"40px",fontSize:"19px",borderRadius:"9px",border:`2px solid ${av===a?"#c8701a":"rgba(255,255,255,0.18)"}`,background:av===a?"rgba(200,112,26,0.28)":"rgba(255,255,255,0.07)",cursor:"pointer"}}>{a}</button>)}
                </div>
              </div>
              <div style={{display:"flex",gap:"8px"}}>
                <button onClick={()=>setMode("list")} style={{...S.s,border:"1.5px solid rgba(255,255,255,0.2)",color:"rgba(255,255,255,0.65)"}}>← Indietro</button>
                <button onClick={crea} disabled={!nome.trim()} style={{flex:1,padding:"12px",background:nome.trim()?"#c8701a":"rgba(255,255,255,0.08)",color:nome.trim()?"#fff":"rgba(255,255,255,0.3)",border:"none",borderRadius:"10px",fontSize:"14px",fontWeight:800,fontFamily:"Nunito,sans-serif",cursor:nome.trim()?"pointer":"not-allowed"}}>Inizia →</button>
              </div>
            </>
          )}
        </div>
      </div>

      {del && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
          <div style={{background:"#fff",borderRadius:"16px",padding:"22px",maxWidth:"300px",width:"100%",textAlign:"center"}}>
            <div style={{fontSize:"32px",marginBottom:"8px"}}>⚠️</div>
            <div style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"15px",color:"#1c2b4a",marginBottom:"8px"}}>Eliminare il profilo?</div>
            <div style={{fontFamily:"Nunito,sans-serif",fontSize:"13px",color:"#888",marginBottom:"16px",lineHeight:1.6}}>Tutti i dati di <strong>{del.nome}</strong> verranno eliminati definitivamente.</div>
            <div style={{display:"flex",gap:"8px"}}>
              <button onClick={()=>setDel(null)} style={{flex:1,padding:"10px",background:"#f0ebe3",color:"#444",border:"none",borderRadius:"9px",fontWeight:700,fontFamily:"Nunito,sans-serif",cursor:"pointer"}}>Annulla</button>
              <button onClick={()=>rimuovi(del)} style={{flex:1,padding:"10px",background:"#dc2626",color:"#fff",border:"none",borderRadius:"9px",fontWeight:800,fontFamily:"Nunito,sans-serif",cursor:"pointer"}}>Elimina</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── WIZARD FATTURA (3 step) ───────────────────────────────────────
//  Step 0 — Tipo agevolazione
//  Step 1 — Dati fattura (impresa, numero, data, descrizione, stato)
//  Step 2 — Importi (TOTALE CON IVA obbligatorio + netto opzionale)
//  Step 3 — Riepilogo + causale
// ─────────────────────────────────────────────────────────────────
const EMPTY_F = { tipo_det:"", id_impresa:"", numero:"", data:today(), descrizione:"", totale_ivato:"", netto:"", stato:"da_pagare" };

function WizardFattura({ imprese, settings, onSave, onClose }) {
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ ...EMPTY_F });
  const upd = (k, v) => setF(x => ({ ...x, [k]: v }));

  const det  = TIPI_DET.find(t => t.id === f.tipo_det);
  const imp  = imprese.find(i => i.id === f.id_impresa);
  const tot  = Number(f.totale_ivato) || 0;
  const netto= Number(f.netto) || 0;
  const iva  = netto > 0 && tot > 0 ? tot - netto : null;
  const benef= det && tot > 0 ? tot * det.aliquota : 0;
  const caus = mkCausale(det, settings?.committente?.cf, imp?.piva);

  const Dots = () => (
    <div style={{display:"flex",gap:"5px",marginBottom:"12px"}}>
      {[0,1,2,3].map(n => <div key={n} style={{width:"7px",height:"7px",borderRadius:"50%",background:step>=n?"#c8701a":"#e2dbd0",transition:"background .2s"}} />)}
    </div>
  );
  const Badge = () => det ? (
    <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"9px 13px",background:det.bg,borderRadius:"9px",marginBottom:"14px"}}>
      <span style={{fontSize:"17px"}}>{det.emoji}</span>
      <span style={{fontSize:"13px",fontWeight:800,color:det.color,fontFamily:"Nunito,sans-serif"}}>{det.nome}</span>
    </div>
  ) : null;
  const Btns = ({ back, next, label = "Continua →", dis = false }) => (
    <div style={{display:"flex",gap:"9px",marginTop:"20px"}}>
      {back && <button onClick={back} style={S.s}>← Indietro</button>}
      <button onClick={next} disabled={dis} style={{...S.b(dis), flex:1}}>{label}</button>
    </div>
  );

  // ── STEP 0 — Agevolazione ────────────────────────────────────
  if (step === 0) return (
    <div>
      <Dots />
      <h3 style={{margin:"0 0 4px",fontFamily:"Syne,sans-serif",fontSize:"17px",fontWeight:800,color:"#1c2b4a"}}>Agevolazione fiscale</h3>
      <p style={{margin:"0 0 14px",fontSize:"13px",color:"#888",fontFamily:"Nunito,sans-serif"}}>A quale regime appartiene questa fattura?</p>
      <div style={{display:"grid",gap:"7px"}}>
        {TIPI_DET.map(t => (
          <div key={t.id} onClick={() => upd("tipo_det", t.id)}
            style={{padding:"11px 13px",borderRadius:"11px",cursor:"pointer",border:`2px solid ${f.tipo_det===t.id?t.color:"#e2dbd0"}`,background:f.tipo_det===t.id?t.bg:"#fdfaf6",display:"flex",alignItems:"center",gap:"10px",transition:"all .15s"}}>
            <span style={{fontSize:"18px",flexShrink:0}}>{t.emoji}</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:"12px",color:f.tipo_det===t.id?t.color:"#1c2b4a",fontFamily:"Nunito,sans-serif"}}>{t.nome}</div>
              <div style={{fontSize:"11px",color:"#888",marginTop:"1px",fontFamily:"Nunito,sans-serif"}}>{t.desc}</div>
            </div>
            {f.tipo_det === t.id && <span style={{color:t.color,fontWeight:900,flexShrink:0}}>✓</span>}
          </div>
        ))}
      </div>
      {det?.alert && <div style={{marginTop:"11px",padding:"10px 12px",background:"#fee2e2",borderRadius:"9px",fontSize:"13px",color:"#991b1b",fontFamily:"Nunito,sans-serif",fontWeight:700}}>{det.alert}</div>}
      <Btns next={() => setStep(1)} dis={!f.tipo_det} />
    </div>
  );

  // ── STEP 1 — Dati fattura ────────────────────────────────────
  if (step === 1) return (
    <div>
      <Dots />
      <h3 style={{margin:"0 0 13px",fontFamily:"Syne,sans-serif",fontSize:"17px",fontWeight:800,color:"#1c2b4a"}}>Dati fattura</h3>
      <Badge />
      <div style={{display:"grid",gap:"13px"}}>
        <div>
          <label style={S.l}>Impresa / Fornitore *</label>
          <select value={f.id_impresa} onChange={e => upd("id_impresa", e.target.value)} style={S.i}>
            <option value="">— Seleziona —</option>
            {imprese.map(i => <option key={i.id} value={i.id}>{i.ragione_sociale}{i.piva ? ` (${i.piva})` : ""}</option>)}
            <option value="__altra__">Altra (non in rubrica)</option>
          </select>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
          <div>
            <label style={S.l}>N° Fattura *</label>
            <input value={f.numero} onChange={e => upd("numero", e.target.value)} placeholder="2025/042" style={S.i} />
          </div>
          <div>
            <label style={S.l}>Data</label>
            <input type="date" value={f.data} onChange={e => upd("data", e.target.value)} style={S.i} />
          </div>
        </div>
        <div>
          <label style={S.l}>Descrizione lavori</label>
          <textarea value={f.descrizione} onChange={e => upd("descrizione", e.target.value)} rows={3} placeholder="Es: Manutenzione straordinaria — sostituzione serramenti..." style={{...S.i,resize:"vertical",lineHeight:1.55}} />
        </div>
        <div>
          <label style={S.l}>Stato pagamento</label>
          <select value={f.stato} onChange={e => upd("stato", e.target.value)} style={S.i}>
            <option value="da_pagare">⏳ Da pagare</option>
            <option value="pagata">✅ Pagata con bonifico</option>
            <option value="parziale">⚠️ Parzialmente pagata</option>
          </select>
        </div>
      </div>
      <Btns back={() => setStep(0)} next={() => setStep(2)} dis={!f.numero || !f.id_impresa} />
    </div>
  );

  // ── STEP 2 — Importi ─────────────────────────────────────────
  if (step === 2) return (
    <div>
      <Dots />
      <h3 style={{margin:"0 0 5px",fontFamily:"Syne,sans-serif",fontSize:"17px",fontWeight:800,color:"#1c2b4a"}}>Importi</h3>
      <p style={{margin:"0 0 13px",fontSize:"13px",color:"#888",fontFamily:"Nunito,sans-serif"}}>Inserisci gli importi come riportati in fattura.</p>
      <Badge />
      <div style={{display:"grid",gap:"14px"}}>

        {/* Totale con IVA — campo principale obbligatorio */}
        <div>
          <label style={S.l}>
            Totale fattura con IVA *
          </label>
          <div style={{position:"relative"}}>
            <input
              type="number" value={f.totale_ivato}
              onChange={e => upd("totale_ivato", e.target.value)}
              placeholder="Es: 12.200,00"
              style={{...S.i, fontSize:"18px", fontWeight:800, paddingRight:"44px"}}
              min="0" step="0.01" autoFocus
            />
            <span style={{position:"absolute",right:"13px",top:"50%",transform:"translateY(-50%)",fontSize:"14px",fontWeight:800,color:"#b0a898",fontFamily:"Nunito,sans-serif",pointerEvents:"none"}}>€</span>
          </div>
          <div style={{fontSize:"11px",color:"#b0a898",marginTop:"4px",fontFamily:"Nunito,sans-serif"}}>Il totale da pagare come indicato in fattura (IVA inclusa)</div>
        </div>

        {/* Imponibile netto — opzionale */}
        <div>
          <label style={S.l}>
            Imponibile netto (senza IVA) — <span style={{fontWeight:600,color:"#b0a898"}}>opzionale</span>
          </label>
          <div style={{position:"relative"}}>
            <input
              type="number" value={f.netto}
              onChange={e => upd("netto", e.target.value)}
              placeholder="Es: 10.000,00"
              style={{...S.i, paddingRight:"44px"}}
              min="0" step="0.01"
            />
            <span style={{position:"absolute",right:"13px",top:"50%",transform:"translateY(-50%)",fontSize:"14px",fontWeight:800,color:"#b0a898",fontFamily:"Nunito,sans-serif",pointerEvents:"none"}}>€</span>
          </div>
          <div style={{fontSize:"11px",color:"#b0a898",marginTop:"4px",fontFamily:"Nunito,sans-serif"}}>Compilalo se vuoi tracciare anche la quota IVA separatamente</div>
        </div>

        {/* Riepilogo live */}
        {tot > 0 && (
          <div style={{background:"#f0fdf4",borderRadius:"12px",padding:"14px 15px",border:"1px solid #bbf7d0"}}>
            <div style={{display:"grid",gap:"6px"}}>
              {netto > 0 && (
                <div style={{display:"flex",justifyContent:"space-between",fontSize:"13px",fontFamily:"Nunito,sans-serif",color:"#555"}}>
                  <span>Imponibile netto</span>
                  <span style={{fontWeight:700}}>{fmt(netto)}</span>
                </div>
              )}
              {iva !== null && iva > 0 && (
                <div style={{display:"flex",justifyContent:"space-between",fontSize:"13px",fontFamily:"Nunito,sans-serif",color:"#555"}}>
                  <span>IVA (differenza)</span>
                  <span style={{fontWeight:700}}>{fmt(iva)}</span>
                </div>
              )}
              <div style={{display:"flex",justifyContent:"space-between",paddingTop: netto>0?"8px":"0",borderTop:netto>0?"1px solid #bbf7d0":"none"}}>
                <span style={{fontSize:"15px",fontWeight:800,color:"#166534",fontFamily:"Nunito,sans-serif"}}>Totale con IVA</span>
                <span style={{fontSize:"18px",fontWeight:900,color:"#166534",fontFamily:"Syne,sans-serif"}}>{fmt(tot)}</span>
              </div>
              {det?.aliquota > 0 && (
                <div style={{display:"flex",justifyContent:"space-between",marginTop:"4px",paddingTop:"8px",borderTop:"1px solid #bbf7d0"}}>
                  <span style={{fontSize:"13px",color:"#166534",fontFamily:"Nunito,sans-serif"}}>Beneficio stimato ({(det.aliquota*100).toFixed(0)}% del totale)</span>
                  <span style={{fontSize:"15px",fontWeight:800,color:"#166534",fontFamily:"Syne,sans-serif"}}>{fmt(benef)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <Btns back={() => setStep(1)} next={() => setStep(3)} dis={!f.totale_ivato || tot <= 0} />
    </div>
  );

  // ── STEP 3 — Riepilogo ───────────────────────────────────────
  const RR = ({ label, val, col, bold }) => (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #f0ebe3"}}>
      <span style={{fontSize:"12px",color:"#888",fontFamily:"Nunito,sans-serif"}}>{label}</span>
      <span style={{fontSize:"13px",fontFamily:"Nunito,sans-serif",fontWeight:bold||col?800:600,color:col||"#1c2b4a"}}>{val}</span>
    </div>
  );
  return (
    <div>
      <Dots />
      <h3 style={{margin:"0 0 13px",fontFamily:"Syne,sans-serif",fontSize:"17px",fontWeight:800,color:"#1c2b4a"}}>Riepilogo</h3>
      <Badge />
      <div style={{marginBottom:"14px"}}>
        <RR label="Impresa"          val={imp?.ragione_sociale || "—"} />
        <RR label="N° Fattura"       val={f.numero} />
        <RR label="Data"             val={f.data} />
        {f.descrizione && <RR label="Descrizione" val={f.descrizione.slice(0,50)+(f.descrizione.length>50?"…":"")} />}
        {netto > 0 && <RR label="Imponibile netto" val={fmt(netto)} />}
        {iva !== null && iva > 0 && <RR label="IVA" val={fmt(iva)} />}
        <RR label="Totale con IVA"   val={fmt(tot)} bold />
        {det?.aliquota > 0 && <RR label={`Beneficio stimato (${(det.aliquota*100).toFixed(0)}%)`} val={fmt(benef)} col="#15803d" />}
        {det?.rate && <RR label="Rate annuali" val={`${det.rate} × ${fmt(benef/det.rate)}`} />}
        <RR label="Stato" val={f.stato==="pagata"?"✅ Pagata":f.stato==="parziale"?"⚠️ Parziale":"⏳ Da pagare"} />
      </div>

      {caus && (
        <div style={{padding:"12px 13px",background:"#eff6ff",borderRadius:"10px",marginBottom:"13px"}}>
          <div style={{fontSize:"10px",fontWeight:900,color:"#1e40af",marginBottom:"5px",letterSpacing:"0.08em",fontFamily:"Nunito,sans-serif"}}>CAUSALE BONIFICO PARLANTE</div>
          <div style={{fontSize:"12px",color:"#1e3a8a",fontFamily:"Nunito,sans-serif",lineHeight:1.6,fontStyle:"italic"}}>{caus}</div>
          <button onClick={()=>navigator.clipboard?.writeText(caus)} style={{marginTop:"7px",fontSize:"11px",padding:"4px 9px",background:"#1e40af",color:"#fff",border:"none",borderRadius:"6px",cursor:"pointer",fontFamily:"Nunito,sans-serif",fontWeight:700}}>📋 Copia causale</button>
        </div>
      )}

      <div style={{display:"flex",gap:"9px"}}>
        <button onClick={() => setStep(2)} style={S.s}>← Modifica</button>
        <button onClick={() => onSave({
          id: mkid(), ...f,
          totale_ivato: tot, netto: netto||null, iva: iva||null,
          beneficio_stimato: benef,
          causale_bonifico: caus,
          created_at: new Date().toISOString()
        })} style={{...S.b(false), flex:2}}>✓ Salva Fattura</button>
      </div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────
function Dashboard({ data }) {
  const fs = data.fatture || [];
  const totIvato  = fs.reduce((s,f) => s + (f.totale_ivato || 0), 0);
  const totNetto  = fs.filter(f=>f.netto).reduce((s,f) => s + (f.netto || 0), 0);
  const totIva    = fs.filter(f=>f.iva).reduce((s,f) => s + (f.iva || 0), 0);
  const totBenef  = fs.reduce((s,f) => s + (f.beneficio_stimato || 0), 0);

  const perTipo = TIPI_DET.map(t => {
    const tf  = fs.filter(f => f.tipo_det === t.id);
    const sp  = tf.reduce((s,f) => s+(f.totale_ivato||0), 0);
    const bn  = tf.reduce((s,f) => s+(f.beneficio_stimato||0), 0);
    return { ...t, spesa: sp, benef: bn, perc: t.massimale ? Math.min(100, sp/t.massimale*100) : 0, count: tf.length };
  }).filter(t => t.count > 0);

  const cards = [
    { label:"Spesa totale (IVA incl.)",   val: fmt(totIvato),       sub:`${fs.length} fatture`,              col:"#1c2b4a" },
    { label:"Beneficio stimato",           val: fmt(totBenef),       sub:"detrazioni + contributi",            col:"#15803d" },
    ...(totNetto>0 ? [{ label:"Totale netto (senza IVA)", val: fmt(totNetto), sub:"dove indicato", col:"#555" }] : []),
    { label:"Netto a tuo carico",          val: fmt(totIvato-totBenef), sub:"spesa – beneficio",             col:"#c8701a" },
  ];

  return (
    <div style={{padding:"16px",paddingBottom:"90px"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"18px"}}>
        {cards.map(c => (
          <div key={c.label} style={{...S.c,padding:"12px"}}>
            <div style={{fontSize:"10px",fontWeight:800,color:"#b0a898",textTransform:"uppercase",letterSpacing:"0.07em",fontFamily:"Nunito,sans-serif",marginBottom:"3px"}}>{c.label}</div>
            <div style={{fontSize:"18px",fontWeight:800,color:c.col,fontFamily:"Syne,sans-serif",lineHeight:1.1}}>{c.val}</div>
            <div style={{fontSize:"10px",color:"#b0a898",marginTop:"1px",fontFamily:"Nunito,sans-serif"}}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{fontSize:"11px",fontWeight:900,color:"#b0a898",textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:"Syne,sans-serif",marginBottom:"10px"}}>Agevolazioni utilizzate</div>
      {perTipo.length === 0 ? (
        <div style={{...S.c,padding:"36px 20px",textAlign:"center"}}>
          <div style={{fontSize:"40px",marginBottom:"8px"}}>📊</div>
          <div style={{fontWeight:700,color:"#888",fontFamily:"Nunito,sans-serif"}}>Nessuna fattura ancora</div>
          <div style={{fontSize:"13px",color:"#b0a898",marginTop:"5px",fontFamily:"Nunito,sans-serif"}}>Aggiungi fatture per vedere i totali</div>
        </div>
      ) : (
        <div style={{display:"grid",gap:"9px"}}>
          {perTipo.map(t => (
            <div key={t.id} style={{...S.c,padding:"14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"10px"}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                    <span style={{fontSize:"16px"}}>{t.emoji}</span>
                    <span style={{fontWeight:800,fontSize:"13px",color:t.color,fontFamily:"Nunito,sans-serif"}}>{t.nome}</span>
                  </div>
                  <div style={{fontSize:"11px",color:"#b0a898",marginTop:"1px",fontFamily:"Nunito,sans-serif"}}>{t.count} fattura{t.count!==1?"e":"a"}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:"16px",fontWeight:900,color:"#1c2b4a",fontFamily:"Syne,sans-serif"}}>{fmt(t.spesa)}</div>
                  {t.aliquota>0 && <div style={{fontSize:"11px",color:"#15803d",fontWeight:700,fontFamily:"Nunito,sans-serif"}}>→ {fmt(t.benef)}</div>}
                </div>
              </div>
              {t.massimale && (
                <>
                  <div style={{background:"#f0ebe3",borderRadius:"100px",height:"6px",overflow:"hidden",marginBottom:"4px"}}>
                    <div style={{height:"100%",background:t.perc>=98?"#dc2626":t.perc>=80?"#f59e0b":t.color,borderRadius:"100px",width:`${t.perc}%`,transition:"width .6s"}} />
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px",color:"#b0a898",fontFamily:"Nunito,sans-serif"}}>
                    <span>{fmt(t.spesa)}</span>
                    <span style={{color:t.spesa>=t.massimale?"#dc2626":"#b0a898",fontWeight:t.spesa>=t.massimale?800:400}}>
                      {t.spesa>=t.massimale?"⚠️ MASSIMALE RAGGIUNTO":`Residuo: ${fmt(t.massimale-t.spesa)}`}
                    </span>
                    <span>max {fmt(t.massimale)}</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── FATTURE TAB ───────────────────────────────────────────────────
function FattureTab({ data, onUpdate }) {
  const [showAdd, setShowAdd] = useState(false);
  const [exp, setExp] = useState(null);
  const sorted = [...(data.fatture||[])].sort((a,b) => (b.data||"").localeCompare(a.data||""));
  const ST = {
    pagata:    { bg:"#dcfce7", col:"#166534", lbl:"✅ Pagata" },
    da_pagare: { bg:"#fff7ed", col:"#c2410c", lbl:"⏳ Da pagare" },
    parziale:  { bg:"#fef9c3", col:"#854d0e", lbl:"⚠️ Parziale" },
  };
  const ciclo = ft => {
    const stati = ["da_pagare","pagata","parziale"];
    const nx = stati[(stati.indexOf(ft.stato)+1) % stati.length];
    onUpdate({ ...data, fatture:(data.fatture||[]).map(f=>f.id===ft.id?{...f,stato:nx}:f) });
  };
  const del = id => { if (window.confirm("Eliminare questa fattura?")) onUpdate({ ...data, fatture:(data.fatture||[]).filter(f=>f.id!==id) }); setExp(null); };

  return (
    <div style={{padding:"16px",paddingBottom:"90px"}}>
      {sorted.length === 0 ? (
        <div style={{...S.c,padding:"44px 20px",textAlign:"center"}}>
          <div style={{fontSize:"42px",marginBottom:"8px"}}>🧾</div>
          <div style={{fontWeight:700,color:"#888",fontFamily:"Nunito,sans-serif"}}>Nessuna fattura</div>
          <div style={{fontSize:"13px",color:"#b0a898",marginTop:"5px",fontFamily:"Nunito,sans-serif"}}>Premi + per aggiungere</div>
        </div>
      ) : (
        <div style={{display:"grid",gap:"8px"}}>
          {sorted.map(f => {
            const tp = TIPI_DET.find(t => t.id === f.tipo_det);
            const im = (data.imprese||[]).find(i => i.id === f.id_impresa);
            const st = ST[f.stato] || ST.da_pagare;
            const isE = exp === f.id;
            return (
              <div key={f.id} style={S.c}>
                <div onClick={() => setExp(isE ? null : f.id)} style={{padding:"12px 14px",cursor:"pointer"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"8px"}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:"5px",flexWrap:"wrap",marginBottom:"4px"}}>
                        <span style={{fontSize:"11px",fontWeight:800,background:tp?.bg,color:tp?.color,padding:"2px 7px",borderRadius:"100px",fontFamily:"Nunito,sans-serif"}}>{tp?.emoji} {tp?.short}</span>
                        <span style={{fontSize:"11px",background:st.bg,color:st.col,padding:"2px 7px",borderRadius:"100px",fontWeight:700,fontFamily:"Nunito,sans-serif"}}>{st.lbl}</span>
                      </div>
                      <div style={{fontWeight:800,fontSize:"13px",color:"#1c2b4a",fontFamily:"Nunito,sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        Ft.{f.numero} — {im?.ragione_sociale||"—"}
                      </div>
                      <div style={{fontSize:"11px",color:"#b0a898",fontFamily:"Nunito,sans-serif"}}>{f.data}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:"16px",fontWeight:900,color:"#1c2b4a",fontFamily:"Syne,sans-serif"}}>{fmt(f.totale_ivato)}</div>
                      {f.beneficio_stimato>0 && <div style={{fontSize:"11px",color:"#15803d",fontWeight:700,fontFamily:"Nunito,sans-serif"}}>→ {fmt(f.beneficio_stimato)}</div>}
                      <div style={{fontSize:"10px",color:"#b0a898"}}>{isE?"▲":"▼"}</div>
                    </div>
                  </div>
                </div>
                {isE && (
                  <div style={{borderTop:"1px solid #f0ebe3",padding:"12px 14px",background:"#fdfaf6"}}>
                    {f.descrizione && <div style={{fontSize:"12px",color:"#666",marginBottom:"10px",fontFamily:"Nunito,sans-serif",fontStyle:"italic",lineHeight:1.55}}>"{f.descrizione}"</div>}
                    {/* Dettaglio importi */}
                    <div style={{fontSize:"12px",fontFamily:"Nunito,sans-serif",padding:"9px",background:"#f5f2ec",borderRadius:"8px",marginBottom:"10px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}>
                        <span style={{color:"#888"}}>Totale con IVA</span>
                        <span style={{fontWeight:800,color:"#1c2b4a"}}>{fmt(f.totale_ivato)}</span>
                      </div>
                      {f.netto>0 && <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}>
                        <span style={{color:"#888"}}>Imponibile netto</span><span style={{fontWeight:700}}>{fmt(f.netto)}</span></div>}
                      {f.iva>0 && <div style={{display:"flex",justifyContent:"space-between"}}>
                        <span style={{color:"#888"}}>IVA</span><span style={{fontWeight:700}}>{fmt(f.iva)}</span></div>}
                    </div>
                    {f.causale_bonifico && (
                      <div style={{padding:"8px 10px",background:"#eff6ff",borderRadius:"8px",marginBottom:"10px"}}>
                        <div style={{fontSize:"10px",fontWeight:900,color:"#1e40af",marginBottom:"3px",fontFamily:"Nunito,sans-serif"}}>CAUSALE BONIFICO PARLANTE</div>
                        <div style={{fontSize:"11px",color:"#1e3a8a",fontFamily:"Nunito,sans-serif",lineHeight:1.5}}>{f.causale_bonifico}</div>
                        <button onClick={() => navigator.clipboard?.writeText(f.causale_bonifico)} style={{marginTop:"6px",fontSize:"10px",padding:"3px 8px",background:"#1e40af",color:"#fff",border:"none",borderRadius:"5px",cursor:"pointer",fontFamily:"Nunito,sans-serif",fontWeight:700}}>📋 Copia</button>
                      </div>
                    )}
                    <div style={{display:"flex",gap:"7px"}}>
                      <button onClick={() => ciclo(f)} style={{flex:1,padding:"7px",background:"#f0fdf4",color:"#15803d",border:"1px solid #bbf7d0",borderRadius:"7px",fontSize:"12px",fontWeight:800,fontFamily:"Nunito,sans-serif",cursor:"pointer"}}>↻ Cambia stato</button>
                      <button onClick={() => del(f.id)} style={{padding:"7px 12px",background:"#fee2e2",color:"#dc2626",border:"1px solid #fecaca",borderRadius:"7px",fontSize:"12px",cursor:"pointer"}}>🗑</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <button onClick={() => setShowAdd(true)} style={{position:"fixed",bottom:"76px",right:"20px",width:"54px",height:"54px",borderRadius:"50%",background:"#c8701a",color:"#fff",border:"none",fontSize:"26px",boxShadow:"0 4px 18px rgba(200,112,26,0.45)",cursor:"pointer",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
      {showAdd && (
        <Modal title="Nuova Fattura" onClose={() => setShowAdd(false)}>
          <WizardFattura
            imprese={data.imprese||[]}
            settings={data.settings}
            onClose={() => setShowAdd(false)}
            onSave={ft => { onUpdate({ ...data, fatture:[...(data.fatture||[]),ft] }); setShowAdd(false); }}
          />
        </Modal>
      )}
    </div>
  );
}

// ── PAGAMENTI TAB ─────────────────────────────────────────────────
function PagamentiTab({ data, onUpdate }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ id_fattura:"", data:today(), importo:"", banca:"", note:"" });
  const upd = (k,v) => setForm(f => ({...f,[k]:v}));
  const fat  = (data.fatture||[]).find(f => f.id === form.id_fattura);
  const imp  = (data.imprese||[]).find(i => i.id === fat?.id_impresa);
  const caus = fat?.causale_bonifico || "";
  const pags = [...(data.pagamenti||[])].sort((a,b) => (b.data||"").localeCompare(a.data||""));
  const tot  = pags.reduce((s,p) => s+(p.importo||0), 0);

  function salva() {
    const p = { id:mkid(), ...form, importo:Number(form.importo), causale_usata:caus, nome_impresa:imp?.ragione_sociale||"—", num_fattura:fat?.numero||"—", created_at:new Date().toISOString() };
    onUpdate({ ...data, pagamenti:[...(data.pagamenti||[]),p], fatture:(data.fatture||[]).map(f=>f.id===form.id_fattura?{...f,stato:"pagata"}:f) });
    setForm({ id_fattura:"", data:today(), importo:"", banca:"", note:"" });
    setShowAdd(false);
  }

  return (
    <div style={{padding:"16px",paddingBottom:"90px"}}>
      <div style={{...S.c,padding:"14px",marginBottom:"14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:"10px",fontWeight:800,color:"#b0a898",textTransform:"uppercase",letterSpacing:"0.07em",fontFamily:"Nunito,sans-serif"}}>Totale bonifici registrati</div>
          <div style={{fontSize:"21px",fontWeight:900,color:"#1c2b4a",fontFamily:"Syne,sans-serif"}}>{fmt(tot)}</div>
          <div style={{fontSize:"11px",color:"#b0a898",fontFamily:"Nunito,sans-serif"}}>{pags.length} operazioni</div>
        </div>
        <span style={{fontSize:"32px"}}>🏦</span>
      </div>
      {pags.length === 0 ? (
        <div style={{...S.c,padding:"36px 20px",textAlign:"center"}}>
          <div style={{fontSize:"38px",marginBottom:"8px"}}>💸</div>
          <div style={{fontWeight:700,color:"#888",fontFamily:"Nunito,sans-serif"}}>Nessun pagamento registrato</div>
        </div>
      ) : (
        <div style={{display:"grid",gap:"8px"}}>
          {pags.map(p => (
            <div key={p.id} style={{...S.c,padding:"13px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"8px"}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:"13px",color:"#1c2b4a",fontFamily:"Nunito,sans-serif"}}>{p.nome_impresa}</div>
                  <div style={{fontSize:"11px",color:"#888",marginTop:"1px",fontFamily:"Nunito,sans-serif"}}>Ft.{p.num_fattura} • {p.data}</div>
                  {p.banca && <div style={{fontSize:"11px",color:"#b0a898",fontFamily:"Nunito,sans-serif"}}>🏦 {p.banca}</div>}
                  {p.causale_usata && (
                    <div style={{marginTop:"6px",padding:"6px 8px",background:"#eff6ff",borderRadius:"6px"}}>
                      <div style={{fontSize:"10px",fontWeight:900,color:"#1e40af",marginBottom:"1px",fontFamily:"Nunito,sans-serif"}}>CAUSALE</div>
                      <div style={{fontSize:"11px",color:"#1e3a8a",fontFamily:"Nunito,sans-serif",lineHeight:1.5}}>{p.causale_usata}</div>
                    </div>
                  )}
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:"16px",fontWeight:900,color:"#166534",fontFamily:"Syne,sans-serif"}}>{fmt(p.importo)}</div>
                  <button onClick={() => { if(window.confirm("Eliminare?")) onUpdate({...data,pagamenti:(data.pagamenti||[]).filter(x=>x.id!==p.id)}); }} style={{marginTop:"3px",background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:"5px",padding:"3px 7px",cursor:"pointer",fontSize:"11px"}}>🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <button onClick={() => setShowAdd(true)} style={{position:"fixed",bottom:"76px",right:"20px",width:"54px",height:"54px",borderRadius:"50%",background:"#166534",color:"#fff",border:"none",fontSize:"24px",boxShadow:"0 4px 18px rgba(22,101,52,0.4)",cursor:"pointer",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
      {showAdd && (
        <Modal title="Registra Bonifico" onClose={() => setShowAdd(false)}>
          <div style={{display:"grid",gap:"12px"}}>
            <div>
              <label style={S.l}>Collega a fattura</label>
              <select value={form.id_fattura} onChange={e => { upd("id_fattura",e.target.value); const ft=(data.fatture||[]).find(f=>f.id===e.target.value); if(ft) upd("importo",String(ft.totale_ivato)); }} style={S.i}>
                <option value="">— Seleziona —</option>
                {(data.fatture||[]).map(f => { const i=(data.imprese||[]).find(x=>x.id===f.id_impresa); return <option key={f.id} value={f.id}>Ft.{f.numero} – {i?.ragione_sociale||"—"} – {fmt(f.totale_ivato)}</option>; })}
              </select>
            </div>
            {caus && (
              <div style={{padding:"8px 10px",background:"#eff6ff",borderRadius:"8px"}}>
                <div style={{fontSize:"10px",fontWeight:900,color:"#1e40af",marginBottom:"3px",fontFamily:"Nunito,sans-serif"}}>CAUSALE (copia in home banking)</div>
                <div style={{fontSize:"12px",color:"#1e3a8a",fontFamily:"Nunito,sans-serif",lineHeight:1.5}}>{caus}</div>
                <button onClick={() => navigator.clipboard?.writeText(caus)} style={{marginTop:"6px",fontSize:"10px",padding:"3px 8px",background:"#1e40af",color:"#fff",border:"none",borderRadius:"5px",cursor:"pointer",fontFamily:"Nunito,sans-serif",fontWeight:700}}>📋 Copia</button>
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"9px"}}>
              <div><label style={S.l}>Data</label><input type="date" value={form.data} onChange={e=>upd("data",e.target.value)} style={S.i}/></div>
              <div><label style={S.l}>Importo (€)</label><input type="number" value={form.importo} onChange={e=>upd("importo",e.target.value)} placeholder="0.00" style={S.i} min="0" step="0.01"/></div>
            </div>
            <div><label style={S.l}>Banca / conto</label><input value={form.banca} onChange={e=>upd("banca",e.target.value)} placeholder="BancaIntesa c/c..." style={S.i}/></div>
            <button onClick={salva} disabled={!form.id_fattura||!form.importo} style={S.b(!form.id_fattura||!form.importo)}>✓ Registra Bonifico</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── EMAIL TAB ─────────────────────────────────────────────────────
function EmailTab({ data, onUpdate }) {
  const [showGen,setShowGen]=useState(false);
  const [sel,setSel]=useState({tpl:"",impresa:"",fattura:""});
  const [prev,setPrev]=useState({oggetto:"",corpo:""});
  const [done,setDone]=useState(false);
  const tpl = EMAIL_TPLS.find(t=>t.id===sel.tpl);
  const imp = (data.imprese||[]).find(i=>i.id===sel.impresa);
  const fat = (data.fatture||[]).find(f=>f.id===sel.fattura);
  const det = TIPI_DET.find(t=>t.id===fat?.tipo_det);
  const caus= mkCausale(det,data.settings?.committente?.cf,imp?.piva);
  const {committente,immobile}=data.settings||{committente:{},immobile:{}};
  const logs=[...(data.email_log||[])].sort((a,b)=>(b.created_at||"").localeCompare(a.created_at||""));

  function genera(){
    if(!tpl)return;
    const vars={IMPRESA:imp?.ragione_sociale||"",INDIRIZZO:`${immobile?.indirizzo||""}${immobile?.comune?", "+immobile.comune:""}`,COMMITTENTE:`${committente?.nome||""} ${committente?.cognome||""}`.trim(),CF:committente?.cf||"",TIPO_INTERVENTO:fat?.descrizione?.slice(0,40)||"",DESCRIZIONE_LAVORI:fat?.descrizione||"[descrivere i lavori]",CAUSALE:caus||"[causale specifica]"};
    setPrev({oggetto:compile(tpl.oggetto,vars),corpo:compile(tpl.corpo,vars)});
    setDone(true);
  }
  function salvaLog(){
    const l={id:mkid(),template:tpl?.nome,impresa:imp?.ragione_sociale,oggetto:prev.oggetto,corpo:prev.corpo,created_at:new Date().toISOString()};
    onUpdate({...data,email_log:[...(data.email_log||[]),l]});
  }

  return (
    <div style={{padding:"16px",paddingBottom:"90px"}}>
      {!showGen ? (
        <>
          <div style={{...S.c,padding:"14px",marginBottom:"14px",background:"linear-gradient(135deg,#1c2b4a,#2d4272)",border:"none"}}>
            <div style={{fontSize:"12px",color:"rgba(255,255,255,0.65)",fontFamily:"Nunito,sans-serif",lineHeight:1.7,marginBottom:"10px"}}>Genera email con istruzioni di fatturazione da inviare alle imprese del cantiere.</div>
            <button onClick={()=>{setShowGen(true);setDone(false);setSel({tpl:"",impresa:"",fattura:""});setPrev({oggetto:"",corpo:""});}} style={{padding:"9px 16px",background:"#c8701a",color:"#fff",border:"none",borderRadius:"8px",fontSize:"13px",fontWeight:800,fontFamily:"Nunito,sans-serif",cursor:"pointer"}}>✉️ Nuova email</button>
          </div>
          <div style={{fontSize:"11px",fontWeight:900,color:"#b0a898",textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:"Syne,sans-serif",marginBottom:"10px"}}>Storico email</div>
          {logs.length===0 ? <div style={{...S.c,padding:"32px 20px",textAlign:"center"}}><div style={{fontSize:"36px",marginBottom:"7px"}}>✉️</div><div style={{fontWeight:700,color:"#888",fontFamily:"Nunito,sans-serif"}}>Nessuna email</div></div> : (
            <div style={{display:"grid",gap:"8px"}}>
              {logs.map(l=>(
                <div key={l.id} style={{...S.c,padding:"12px 14px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"7px"}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:"11px",fontWeight:800,color:"#c8701a",fontFamily:"Nunito,sans-serif"}}>{l.template}</div>
                      <div style={{fontWeight:700,fontSize:"12px",color:"#1c2b4a",fontFamily:"Nunito,sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.oggetto}</div>
                      <div style={{fontSize:"10px",color:"#b0a898",fontFamily:"Nunito,sans-serif"}}>{l.impresa} • {new Date(l.created_at).toLocaleDateString("it-IT")}</div>
                    </div>
                    <div style={{display:"flex",gap:"5px",flexShrink:0}}>
                      <button onClick={()=>navigator.clipboard?.writeText(`Oggetto: ${l.oggetto}\n\n${l.corpo}`)} style={{padding:"4px 8px",background:"#eff6ff",color:"#1e40af",border:"none",borderRadius:"5px",fontSize:"12px",cursor:"pointer"}}>📋</button>
                      <button onClick={()=>{if(window.confirm("Eliminare?"))onUpdate({...data,email_log:(data.email_log||[]).filter(x=>x.id!==l.id)});}} style={{padding:"4px 8px",background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:"5px",fontSize:"12px",cursor:"pointer"}}>🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div>
          <button onClick={()=>setShowGen(false)} style={{display:"flex",alignItems:"center",gap:"5px",background:"none",border:"none",color:"#888",fontFamily:"Nunito,sans-serif",fontSize:"13px",cursor:"pointer",marginBottom:"14px",padding:0}}>← Storico</button>
          {!done ? (
            <div style={{display:"grid",gap:"12px"}}>
              <div style={{fontFamily:"Syne,sans-serif",fontSize:"16px",fontWeight:800,color:"#1c2b4a"}}>Configura email</div>
              <div>
                <label style={S.l}>Template *</label>
                <div style={{display:"grid",gap:"6px"}}>
                  {EMAIL_TPLS.map(t=>(
                    <div key={t.id} onClick={()=>setSel(s=>({...s,tpl:t.id}))} style={{padding:"10px 12px",borderRadius:"9px",cursor:"pointer",border:`2px solid ${sel.tpl===t.id?"#c8701a":"#e2dbd0"}`,background:sel.tpl===t.id?"#fff7ed":"#fdfaf6",display:"flex",alignItems:"center",gap:"8px"}}>
                      <span style={{fontSize:"17px"}}>{t.emoji}</span>
                      <span style={{fontWeight:800,fontSize:"12px",color:sel.tpl===t.id?"#c8701a":"#1c2b4a",fontFamily:"Nunito,sans-serif"}}>{t.nome}</span>
                      {sel.tpl===t.id&&<span style={{marginLeft:"auto",color:"#c8701a"}}>✓</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div><label style={S.l}>Impresa *</label><select value={sel.impresa} onChange={e=>setSel(s=>({...s,impresa:e.target.value}))} style={S.i}><option value="">— Seleziona —</option>{(data.imprese||[]).map(i=><option key={i.id} value={i.id}>{i.ragione_sociale}</option>)}</select></div>
              <div><label style={S.l}>Collega fattura (opz.)</label><select value={sel.fattura} onChange={e=>setSel(s=>({...s,fattura:e.target.value}))} style={S.i}><option value="">— Nessuna —</option>{(data.fatture||[]).map(f=>{const i=(data.imprese||[]).find(x=>x.id===f.id_impresa);return<option key={f.id} value={f.id}>Ft.{f.numero} – {i?.ragione_sociale||"—"}</option>;})}</select></div>
              <button onClick={genera} disabled={!sel.tpl||!sel.impresa} style={S.b(!sel.tpl||!sel.impresa)}>Genera →</button>
            </div>
          ) : (
            <div style={{display:"grid",gap:"12px"}}>
              <div style={{fontFamily:"Syne,sans-serif",fontSize:"16px",fontWeight:800,color:"#1c2b4a"}}>✉️ Email pronta</div>
              <div style={S.c}>
                <div style={{padding:"10px 12px 8px",borderBottom:"1px solid #f0ebe3"}}><div style={S.l}>OGGETTO</div><div style={{fontFamily:"Nunito,sans-serif",fontSize:"13px",fontWeight:700,color:"#1c2b4a"}}>{prev.oggetto}</div></div>
                <div style={{padding:"12px"}}><div style={S.l}>CORPO</div><pre style={{fontFamily:"Nunito,sans-serif",fontSize:"12px",color:"#444",lineHeight:1.75,whiteSpace:"pre-wrap",wordBreak:"break-word",margin:0}}>{prev.corpo}</pre></div>
              </div>
              <div style={{display:"grid",gap:"6px"}}>
                <button onClick={()=>{navigator.clipboard?.writeText(`Oggetto: ${prev.oggetto}\n\n${prev.corpo}`);salvaLog();}} style={{padding:"12px",background:"#1c2b4a",color:"#fff",border:"none",borderRadius:"9px",fontSize:"13px",fontWeight:800,fontFamily:"Nunito,sans-serif",cursor:"pointer"}}>📋 Copia e salva nello storico</button>
                <button onClick={()=>{window.open(`mailto:${imp?.email||""}?subject=${encodeURIComponent(prev.oggetto)}&body=${encodeURIComponent(prev.corpo)}`);salvaLog();}} style={{padding:"12px",background:"#c8701a",color:"#fff",border:"none",borderRadius:"9px",fontSize:"13px",fontWeight:800,fontFamily:"Nunito,sans-serif",cursor:"pointer"}}>✉️ Apri in client email</button>
                <button onClick={()=>{setDone(false);setSel({tpl:"",impresa:"",fattura:""}); }} style={S.s}>← Modifica</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ARCHIVIO DOCUMENTI ────────────────────────────────────────────
function ArchivioTab({ data, user, onUpdate }) {
  const [showUp,  setShowUp]  = useState(false);
  const [filter,  setFilter]  = useState("tutti");
  const [form,    setForm]    = useState({ tipo:"fattura", impresa:"", numero:"", data:today(), nota:"" });
  const [file,    setFile]    = useState(null);
  const [dragging,setDragging]= useState(false);
  const [uploading,setUploading]=useState(false);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef();
  const upd = (k,v) => setForm(f => ({...f,[k]:v}));

  const docs = (data.documenti||[]).filter(d => filter==="tutti" || d.tipo===filter)
    .sort((a,b) => (b.created_at||"").localeCompare(a.created_at||""));

  const genNome = useCallback(() => {
    const td  = TIPI_DOC.find(t => t.id === form.tipo);
    const imp = (form.impresa||"impresa").replace(/\s+/g,"_").slice(0,20);
    const num = (form.numero||"000").replace(/[^a-zA-Z0-9]/g,"");
    const d   = (form.data||today()).replace(/-/g,"");
    const ext = file ? "."+file.name.split(".").pop().toLowerCase() : "";
    return `${d}_${td?.prefix||"DOC"}_${imp}_${num}_${user.nome.replace(/\s+/g,"_")}${ext}`;
  }, [form, file, user.nome]);

  function onDrop(e) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (f) { setFile(f); if (f.type.startsWith("image/")||f.type==="application/pdf") { setPreview({ url:URL.createObjectURL(f), type:f.type }); } }
  }
  async function upload() {
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async ev => {
        const base64 = ev.target.result.split(",")[1];
        const docMeta = { tipo:form.tipo, fileName:genNome(), mimeType:file.type, impresa:form.impresa, numero:form.numero, data:form.data, nota:form.nota, userId:user.id, userName:user.nome };
        const r = await api("uploadFile", { userId:user.id, userName:user.nome, base64Data:base64, fileName:genNome(), mimeType:file.type, meta:docMeta, docMeta });
        if (r.ok) {
          onUpdate({ ...data, documenti:[...(data.documenti||[]),r.doc] });
          setShowUp(false); setFile(null); setPreview(null);
          setForm({ tipo:"fattura", impresa:"", numero:"", data:today(), nota:"" });
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch { setUploading(false); }
  }

  const tipoDef = t => TIPI_DOC.find(x => x.id === t) || TIPI_DOC[3];

  return (
    <div style={{padding:"16px",paddingBottom:"90px"}}>
      <div style={{display:"flex",gap:"7px",marginBottom:"14px",overflowX:"auto",paddingBottom:"2px"}}>
        {[{id:"tutti",label:"Tutti",emoji:"📁"},...TIPI_DOC].map(t => (
          <button key={t.id} onClick={()=>setFilter(t.id)} style={{flexShrink:0,padding:"6px 12px",borderRadius:"100px",border:"none",background:filter===t.id?"#1c2b4a":"#f0ebe3",color:filter===t.id?"#fff":"#666",fontSize:"12px",fontWeight:700,fontFamily:"Nunito,sans-serif",cursor:"pointer"}}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>
      {docs.length === 0 ? (
        <div style={{...S.c,padding:"44px 20px",textAlign:"center"}}>
          <div style={{fontSize:"42px",marginBottom:"10px"}}>📂</div>
          <div style={{fontWeight:700,color:"#888",fontFamily:"Nunito,sans-serif"}}>Nessun documento</div>
          <div style={{fontSize:"13px",color:"#b0a898",marginTop:"6px",fontFamily:"Nunito,sans-serif"}}>Premi + per caricare fatture, bonifici, contratti</div>
        </div>
      ) : (
        <div style={{display:"grid",gap:"9px"}}>
          {docs.map(d => {
            const td = tipoDef(d.tipo);
            return (
              <div key={d.id} style={{...S.c,padding:"13px 15px"}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:"10px"}}>
                  <div style={{width:"36px",height:"36px",borderRadius:"9px",background:td.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"17px",flexShrink:0}}>{td.emoji}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:800,fontSize:"13px",color:"#1c2b4a",fontFamily:"Nunito,sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.fileName}</div>
                    <div style={{fontSize:"11px",color:"#888",marginTop:"1px",fontFamily:"Nunito,sans-serif"}}>{d.impresa||"—"}{d.numero?` • N.${d.numero}`:""} • {d.data}</div>
                    {d.nota && <div style={{fontSize:"11px",color:"#b0a898",marginTop:"1px",fontFamily:"Nunito,sans-serif",fontStyle:"italic"}}>{d.nota}</div>}
                    <div style={{display:"flex",gap:"6px",marginTop:"7px"}}>
                      {d.demo ? (
                        <span style={{fontSize:"11px",color:"#b0a898",fontFamily:"Nunito,sans-serif",fontStyle:"italic"}}>Demo — in produzione → Google Drive</span>
                      ) : (
                        <a href={d.driveViewUrl} target="_blank" rel="noreferrer" style={{fontSize:"11px",padding:"4px 9px",background:"#f0fdf4",color:"#166534",borderRadius:"6px",textDecoration:"none",fontWeight:700,fontFamily:"Nunito,sans-serif"}}>📂 Apri in Drive</a>
                      )}
                      <button onClick={()=>{ if(window.confirm("Eliminare?")) onUpdate({...data,documenti:(data.documenti||[]).filter(x=>x.id!==d.id)}); }} style={{fontSize:"11px",padding:"4px 9px",background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:"6px",cursor:"pointer"}}>🗑</button>
                    </div>
                  </div>
                  <span style={{fontSize:"10px",fontWeight:800,padding:"3px 7px",borderRadius:"100px",background:td.bg,color:td.color,fontFamily:"Nunito,sans-serif",flexShrink:0}}>{td.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button onClick={()=>setShowUp(true)} style={{position:"fixed",bottom:"76px",right:"20px",width:"54px",height:"54px",borderRadius:"50%",background:"#6d28d9",color:"#fff",border:"none",fontSize:"26px",boxShadow:"0 4px 18px rgba(109,40,217,0.4)",cursor:"pointer",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>

      {showUp && (
        <Modal title="Carica documento" onClose={()=>{ setShowUp(false); setFile(null); setPreview(null); }}>
          <div style={{display:"grid",gap:"13px"}}>
            <div>
              <label style={S.l}>Tipo documento *</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"7px"}}>
                {TIPI_DOC.map(t => (
                  <div key={t.id} onClick={()=>upd("tipo",t.id)} style={{padding:"10px 12px",borderRadius:"10px",cursor:"pointer",border:`2px solid ${form.tipo===t.id?t.color:"#e2dbd0"}`,background:form.tipo===t.id?t.bg:"#fdfaf6",display:"flex",alignItems:"center",gap:"7px"}}>
                    <span style={{fontSize:"18px"}}>{t.emoji}</span>
                    <span style={{fontWeight:800,fontSize:"13px",color:form.tipo===t.id?t.color:"#1c2b4a",fontFamily:"Nunito,sans-serif"}}>{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label style={S.l}>File (PDF, immagine, foto) *</label>
              <div
                onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={onDrop}
                onClick={()=>fileRef.current?.click()}
                style={{border:`2px dashed ${dragging?"#c8701a":file?"#166534":"#d1cec8"}`,borderRadius:"12px",padding:"20px",textAlign:"center",cursor:"pointer",background:dragging?"#fff7ed":file?"#f0fdf4":"#fdfaf6",transition:"all .15s"}}>
                <input ref={fileRef} type="file" accept="image/*,application/pdf,.pdf" onChange={onDrop} style={{display:"none"}} capture="environment" />
                {file ? (
                  <>
                    {preview?.type.startsWith("image/") && <img src={preview.url} alt="" style={{maxHeight:"90px",maxWidth:"100%",borderRadius:"8px",marginBottom:"8px",objectFit:"contain"}} />}
                    <div style={{fontWeight:800,fontSize:"13px",color:"#166534",fontFamily:"Nunito,sans-serif"}}>{file.name}</div>
                    <div style={{fontSize:"11px",color:"#b0a898",fontFamily:"Nunito,sans-serif",marginTop:"2px"}}>{(file.size/1024).toFixed(0)} KB</div>
                    <button onClick={e=>{e.stopPropagation();setFile(null);setPreview(null);}} style={{marginTop:"6px",fontSize:"11px",padding:"3px 8px",background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:"5px",cursor:"pointer"}}>✕ Rimuovi</button>
                  </>
                ) : (
                  <><div style={{fontSize:"30px",marginBottom:"6px"}}>📎</div><div style={{fontWeight:700,fontSize:"13px",color:"#666",fontFamily:"Nunito,sans-serif"}}>Trascina qui il file</div><div style={{fontSize:"11px",color:"#b0a898",fontFamily:"Nunito,sans-serif",marginTop:"2px"}}>oppure tocca per scegliere o fotografare</div></>
                )}
              </div>
            </div>
            <div style={{display:"grid",gap:"10px"}}>
              <div>
                <label style={S.l}>Impresa / fonte</label>
                <select value={form.impresa} onChange={e=>upd("impresa",e.target.value)} style={S.i}>
                  <option value="">— Seleziona —</option>
                  {(data.imprese||[]).map(i=><option key={i.id} value={i.ragione_sociale}>{i.ragione_sociale}</option>)}
                </select>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"9px"}}>
                <div><label style={S.l}>Numero</label><input value={form.numero} onChange={e=>upd("numero",e.target.value)} placeholder="042/2025" style={S.i}/></div>
                <div><label style={S.l}>Data documento</label><input type="date" value={form.data} onChange={e=>upd("data",e.target.value)} style={S.i}/></div>
              </div>
              <div><label style={S.l}>Nota</label><input value={form.nota} onChange={e=>upd("nota",e.target.value)} placeholder="Descrizione breve..." style={S.i}/></div>
            </div>
            {file && (
              <div style={{padding:"10px 12px",background:"#eff6ff",borderRadius:"9px"}}>
                <div style={{fontSize:"10px",fontWeight:900,color:"#1e40af",marginBottom:"4px",fontFamily:"Nunito,sans-serif",letterSpacing:"0.07em"}}>NOME FILE CHE VERRÀ SALVATO</div>
                <div style={{fontFamily:"'Courier New',monospace",fontSize:"12px",color:"#1e3a8a",wordBreak:"break-all"}}>{genNome()}</div>
                <div style={{fontSize:"10px",color:"#6b9ed2",marginTop:"3px",fontFamily:"Nunito,sans-serif"}}>Salvato su Google Drive nella tua cartella personale</div>
              </div>
            )}
            <button onClick={upload} disabled={!file||uploading} style={S.b(!file||uploading)}>
              {uploading ? "⏳ Caricamento..." : "📤 Carica su Drive"}
            </button>
            {!PROD_MODE && <div style={{fontSize:"11px",color:"#b0a898",textAlign:"center",fontFamily:"Nunito,sans-serif"}}>Modalità demo — in produzione il file va su Google Drive</div>}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── IMPRESE TAB ───────────────────────────────────────────────────
function ImpreseTab({ data, onUpdate }) {
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({ragione_sociale:"",piva:"",email:"",telefono:"",tipo_lavorazione:""});
  const upd=(k,v)=>setForm(f=>({...f,[k]:v}));
  return (
    <div style={{padding:"16px",paddingBottom:"90px"}}>
      {(data.imprese||[]).length===0 ? (
        <div style={{...S.c,padding:"44px 20px",textAlign:"center"}}>
          <div style={{fontSize:"42px",marginBottom:"8px"}}>🏢</div>
          <div style={{fontWeight:700,color:"#888",fontFamily:"Nunito,sans-serif"}}>Nessuna impresa</div>
          <div style={{fontSize:"13px",color:"#b0a898",marginTop:"5px",fontFamily:"Nunito,sans-serif"}}>Premi + per aggiungere le imprese del cantiere</div>
        </div>
      ) : (
        <div style={{display:"grid",gap:"8px"}}>
          {(data.imprese||[]).map(i=>(
            <div key={i.id} style={{...S.c,padding:"13px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontWeight:800,fontSize:"14px",color:"#1c2b4a",fontFamily:"Nunito,sans-serif"}}>{i.ragione_sociale}</div>
                  {i.piva&&<div style={{fontSize:"11px",color:"#888",marginTop:"1px",fontFamily:"Nunito,sans-serif"}}>P.IVA {i.piva}</div>}
                  {i.tipo_lavorazione&&<span style={{display:"inline-block",marginTop:"4px",fontSize:"10px",fontWeight:800,background:"#fff7ed",color:"#c8701a",padding:"2px 7px",borderRadius:"100px",fontFamily:"Nunito,sans-serif"}}>{i.tipo_lavorazione}</span>}
                  {i.email&&<div style={{fontSize:"11px",color:"#666",marginTop:"4px",fontFamily:"Nunito,sans-serif"}}>✉ {i.email}</div>}
                  {i.telefono&&<div style={{fontSize:"11px",color:"#666",fontFamily:"Nunito,sans-serif"}}>📞 {i.telefono}</div>}
                </div>
                <button onClick={()=>{if(window.confirm("Eliminare?"))onUpdate({...data,imprese:(data.imprese||[]).filter(x=>x.id!==i.id)});}} style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:"7px",padding:"5px 8px",cursor:"pointer",fontSize:"12px"}}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button onClick={()=>setShowAdd(true)} style={{position:"fixed",bottom:"76px",right:"20px",width:"54px",height:"54px",borderRadius:"50%",background:"#1c2b4a",color:"#fff",border:"none",fontSize:"24px",boxShadow:"0 4px 18px rgba(28,43,74,0.35)",cursor:"pointer",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
      {showAdd && (
        <Modal title="Aggiungi Impresa" onClose={()=>setShowAdd(false)}>
          <div style={{display:"grid",gap:"11px"}}>
            {[["Ragione sociale *","ragione_sociale","text","Rossi Serramenti Srl"],["P.IVA","piva","text","12345678901"],["Tipo lavorazione","tipo_lavorazione","text","Serramentista, Impiantista..."],["Email","email","email",""],["Telefono","telefono","tel",""]].map(([l,k,t,p])=>(
              <div key={k}><label style={S.l}>{l}</label><input type={t} value={form[k]} onChange={e=>upd(k,e.target.value)} placeholder={p} style={S.i}/></div>
            ))}
            <button onClick={()=>{if(!form.ragione_sociale)return;onUpdate({...data,imprese:[...(data.imprese||[]),{id:mkid(),...form}]});setForm({ragione_sociale:"",piva:"",email:"",telefono:"",tipo_lavorazione:""});setShowAdd(false);}} disabled={!form.ragione_sociale} style={S.b(!form.ragione_sociale)}>Aggiungi</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── SETUP TAB ─────────────────────────────────────────────────────
function SetupTab({ data, onUpdate, user, onLogout }) {
  const [c,  setC]  = useState({...(data.settings?.committente||{})});
  const [imm,setImm]= useState({...(data.settings?.immobile||{})});
  const [ok, setOk] = useState(false);
  function salva() { onUpdate({...data,settings:{committente:c,immobile:imm}}); setOk(true); setTimeout(()=>setOk(false),2500); }
  return (
    <div style={{padding:"16px",paddingBottom:"120px"}}>
      <div style={{...S.c,padding:"14px",marginBottom:"8px",display:"flex",alignItems:"center",gap:"12px"}}>
        <span style={{fontSize:"32px"}}>{user.avatar||"🏠"}</span>
        <div style={{flex:1}}>
          <div style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"15px",color:"#1c2b4a"}}>{user.nome}</div>
          <div style={{fontSize:"11px",color:"#b0a898",fontFamily:"Nunito,sans-serif"}}>Profilo attivo</div>
        </div>
        <button onClick={onLogout} style={{padding:"7px 12px",background:"#f0ebe3",color:"#555",border:"none",borderRadius:"7px",fontFamily:"Nunito,sans-serif",fontSize:"12px",fontWeight:700,cursor:"pointer"}}>Esci</button>
      </div>
      {[["Dati Committente", () => (
        <div style={{...S.c,padding:"14px",display:"grid",gap:"11px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"9px"}}>
            <div><label style={S.l}>Nome</label><input value={c.nome||""} onChange={e=>setC(x=>({...x,nome:e.target.value}))} style={S.i}/></div>
            <div><label style={S.l}>Cognome</label><input value={c.cognome||""} onChange={e=>setC(x=>({...x,cognome:e.target.value}))} style={S.i}/></div>
          </div>
          <div><label style={S.l}>Codice Fiscale</label><input value={c.cf||""} onChange={e=>setC(x=>({...x,cf:e.target.value.toUpperCase()}))} placeholder="RSSMRA80A01L219X" maxLength={16} style={S.i}/></div>
          <div><label style={S.l}>IBAN</label><input value={c.iban||""} onChange={e=>setC(x=>({...x,iban:e.target.value.toUpperCase()}))} placeholder="IT60X054281110100000123456" style={S.i}/></div>
        </div>
      )], ["Dati Immobile", () => (
        <div style={{...S.c,padding:"14px",display:"grid",gap:"11px"}}>
          <div><label style={S.l}>Indirizzo</label><input value={imm.indirizzo||""} onChange={e=>setImm(x=>({...x,indirizzo:e.target.value}))} placeholder="Via Roma 1" style={S.i}/></div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:"9px"}}>
            <div><label style={S.l}>Comune</label><input value={imm.comune||""} onChange={e=>setImm(x=>({...x,comune:e.target.value}))} style={S.i}/></div>
            <div><label style={S.l}>CAP</label><input value={imm.cap||""} onChange={e=>setImm(x=>({...x,cap:e.target.value}))} maxLength={5} style={S.i}/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"7px"}}>
            {[["Foglio","foglio"],["Particella","particella"],["Sub","sub"]].map(([l,k])=>(
              <div key={k}><label style={S.l}>{l}</label><input value={imm[k]||""} onChange={e=>setImm(x=>({...x,[k]:e.target.value}))} style={S.i}/></div>
            ))}
          </div>
        </div>
      )]].map(([title, Content]) => (
        <div key={title}>
          <div style={{fontSize:"11px",fontWeight:900,color:"#b0a898",textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:"Syne,sans-serif",margin:"18px 0 10px"}}>{title}</div>
          <Content />
        </div>
      ))}
      <button onClick={salva} style={{...S.b(false),marginTop:"16px",background:ok?"#15803d":"#c8701a"}}>{ok?"✓ Salvato!":"Salva impostazioni"}</button>
      <div style={{marginTop:"16px",padding:"12px 14px",background:"#fff7ed",borderRadius:"11px",border:"1px solid #fed7aa"}}>
        <div style={{fontSize:"11px",fontWeight:900,color:"#9a3412",marginBottom:"5px",fontFamily:"Syne,sans-serif"}}>⚠️ ATTENZIONE — Bando FVG Manutenzione</div>
        <div style={{fontSize:"12px",color:"#9a3412",fontFamily:"Nunito,sans-serif",lineHeight:1.7}}>La domanda per il contributo FVG manutenzione/ristrutturazione deve essere presentata <strong>PRIMA dei lavori</strong> sul portale <strong>IOL Regione FVG</strong> con SPID/CIE.</div>
      </div>
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────────
const TABS = [
  { id:"dashboard", l:"Totali",   e:"📊" },
  { id:"fatture",   l:"Fatture",  e:"🧾" },
  { id:"pagamenti", l:"Bonifici", e:"🏦" },
  { id:"email",     l:"Email",    e:"✉️"  },
  { id:"archivio",  l:"Archivio", e:"📂" },
  { id:"imprese",   l:"Imprese",  e:"🏢" },
  { id:"setup",     l:"Setup",    e:"⚙️"  },
];

export default function App() {
  const [user,  setUser]  = useState(null);
  const [tab,   setTab]   = useState("dashboard");
  const [data,  setData]  = useState(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  async function handleLogin(u) {
    const r = await api("getData", { userId: u.id });
    if (r.ok) { const {ok:_,...d}=r; setData({...EMPTY,...d}); }
    setUser(u); setTab("dashboard");
  }
  function handleLogout() { setUser(null); setData(EMPTY); }
  async function handleUpdate(nd) {
    setData(nd);
    if (user) await api("saveAll", { userId: user.id, data: nd });
  }

  if (!ready) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#1c2b4a"}}>
      <span style={{fontFamily:"Syne,sans-serif",fontSize:"26px",fontWeight:900,color:"#fff"}}>cas<span style={{color:"#c8701a"}}>A</span>sia</span>
    </div>
  );
  if (!user) return <LoginScreen onLogin={handleLogin} />;

  const cur = TABS.find(t => t.id === tab);
  return (
    <div style={{minHeight:"100vh",background:"#f8f4ef",maxWidth:"480px",margin:"0 auto",position:"relative"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=Nunito:wght@400;500;600;700;800;900&display=swap');*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}input:focus,select:focus,textarea:focus{border-color:#c8701a!important;box-shadow:0 0 0 3px rgba(200,112,26,.12)}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#e2dbd0;border-radius:4px}`}</style>

      {/* Header */}
      <div style={{position:"sticky",top:0,zIndex:50,background:"#1c2b4a",padding:"10px 14px",display:"flex",alignItems:"center",gap:"8px"}}>
        <span style={{fontSize:"18px"}}>{user.avatar}</span>
        <div style={{flex:1}}>
          <div style={{fontFamily:"Syne,sans-serif",fontSize:"18px",fontWeight:900,color:"#fff",lineHeight:1}}>cas<span style={{color:"#c8701a"}}>A</span>sia</div>
          <div style={{fontSize:"9px",color:"rgba(255,255,255,0.4)",fontFamily:"Nunito,sans-serif",letterSpacing:"0.05em"}}>{user.nome} • FVG</div>
        </div>
        <div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",fontFamily:"Nunito,sans-serif",textAlign:"right",lineHeight:1.6}}>
          <div>{(data.fatture||[]).length} fatture</div>
          <div>{(data.documenti||[]).length} doc.</div>
        </div>
      </div>

      {/* Titolo pagina */}
      <div style={{padding:"12px 16px 2px"}}>
        <div style={{fontFamily:"Syne,sans-serif",fontSize:"18px",fontWeight:900,color:"#1c2b4a"}}>{cur?.e} {cur?.l}</div>
      </div>

      {/* Contenuto */}
      {tab==="dashboard" && <Dashboard data={data} />}
      {tab==="fatture"   && <FattureTab data={data} onUpdate={handleUpdate} />}
      {tab==="pagamenti" && <PagamentiTab data={data} onUpdate={handleUpdate} />}
      {tab==="email"     && <EmailTab data={data} onUpdate={handleUpdate} />}
      {tab==="archivio"  && <ArchivioTab data={data} user={user} onUpdate={handleUpdate} />}
      {tab==="imprese"   && <ImpreseTab data={data} onUpdate={handleUpdate} />}
      {tab==="setup"     && <SetupTab data={data} onUpdate={handleUpdate} user={user} onLogout={handleLogout} />}

      {/* Bottom nav */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:"480px",background:"#fff",borderTop:"1px solid #ede8e0",display:"flex",boxShadow:"0 -3px 16px rgba(0,0,0,0.08)",zIndex:50,overflowX:"auto"}}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{flex:"1 0 auto",minWidth:"46px",padding:"6px 2px 9px",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:"2px"}}>
            <span style={{fontSize:"17px",filter:tab!==t.id?"grayscale(0.6) opacity(0.5)":"none",transition:"filter .15s"}}>{t.e}</span>
            <span style={{fontSize:"8px",fontWeight:tab===t.id?900:600,color:tab===t.id?"#c8701a":"#b0a898",fontFamily:"Nunito,sans-serif",whiteSpace:"nowrap"}}>{t.l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
