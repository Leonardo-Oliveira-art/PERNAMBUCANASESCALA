/* ================= Estado (localStorage) ================= */
const PREFIX = "escala:";
const uid = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_SECTORS = [
  { id:"apoio", name:"APOIO" },
  { id:"caixa", name:"CAIXA" },
  { id:"moda", name:"MODA" },
  { id:"lar-operacao", name:"LAR OPERAÇÃO" },
  { id:"lar-vendas", name:"LAR VENDAS" },
  { id:"beleza", name:"BELEZA" },
  { id:"apoio-loja", name:"APOIO LOJA" }
];
const DEFAULT_SHIFTS = [
  { id:uid(), label:"08:00 às 17:50" },
  { id:uid(), label:"09:00 às 18:50" },
  { id:uid(), label:"10:00 às 19:50" }
];
const DEFAULT_SETTINGS = {
  companyName:"MINHA EMPRESA",
  logoUrl:"",
  colorPrimary:"#1f2a58",
  colorAccent:"#f5c518",
  journeyLine1:"7h20 de trabalho + 1h30 de intervalo para almoço",
  journeyLine2:"(total de 8h50 de permanência na loja)",
  lunch:{ duration:90, step:30, from:180, to:270 }, // minutos: duração, intervalo entre opções, janela após a entrada
  sectors: DEFAULT_SECTORS
};

function load(key, fallback){
  try{ const raw = localStorage.getItem(PREFIX+key); return raw ? JSON.parse(raw) : fallback; }
  catch(e){ return fallback; }
}
function save(key, value){ try{ localStorage.setItem(PREFIX+key, JSON.stringify(value)); }catch(e){} }

let employees = load("employees", []);
let shifts    = load("shifts", DEFAULT_SHIFTS);
let settings  = Object.assign({}, DEFAULT_SETTINGS, load("settings", {}));
let schedules = load("schedules", []);
let current   = load("current", { id:uid(), name:"Nova escala", date:"", entries:emptyEntries(settings.sectors), updatedAt:Date.now() });
let tab = "escala";
let undoSnap = null;

function emptyEntries(sectors){ const o={}; sectors.forEach(s=>o[s.id]=[]); return o; }
function persist(){ save("employees",employees); save("shifts",shifts); save("settings",settings); save("schedules",schedules); save("current",current); }
function formatDate(iso){ if(!iso) return ""; const [y,m,d]=iso.split("-"); return (y&&m&&d)?`${d}/${m}/${y}`:""; }
function esc(s){ return String(s??"").replace(/[&<>"']/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }
function toast(msg, ms=2200){
  const t=document.createElement("div"); t.className="toast no-print"; t.textContent=msg;
  document.body.appendChild(t); setTimeout(()=>t.remove(),ms);
}
function render(){ persist(); applyTheme(); renderTabs(); renderPanel(); renderPrint(); renderHeaderLogo(); }
function applyTheme(){
  document.documentElement.style.setProperty("--navy", settings.colorPrimary || DEFAULT_SETTINGS.colorPrimary);
  document.documentElement.style.setProperty("--yellow", settings.colorAccent || DEFAULT_SETTINGS.colorAccent);
}

/* ================= Ícones (SVG inline) ================= */
const I = {
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>',
  cart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2 3h2l2.6 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 7H6"/></svg>',
  shirt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.4 5.6 16 3a4 4 0 0 1-8 0L3.6 5.6a1 1 0 0 0-.4 1.3l1.7 3.4a1 1 0 0 0 1.3.4L8 10v10a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V10l1.8.7a1 1 0 0 0 1.3-.4l1.7-3.4a1 1 0 0 0-.4-1.3z"/></svg>',
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
  tag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12.6 2.6 21 11a2 2 0 0 1 0 2.8l-7.2 7.2a2 2 0 0 1-2.8 0L2.6 12.6A2 2 0 0 1 2 11.2V4a2 2 0 0 1 2-2h7.2a2 2 0 0 1 1.4.6z"/><circle cx="7" cy="7" r="1.4"/></svg>',
  spray:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="8" width="9" height="13" rx="2"/><path d="M9 8V4h4v4"/><path d="M19 5h.01M19 9h.01M19 13h.01"/></svg>',
  bag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7h14l1 14H4z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  dice:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01"/></svg>',
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>'
};
const SECTOR_ICON = { "APOIO":I.users, "CAIXA":I.cart, "MODA":I.shirt, "LAR OPERAÇÃO":I.home, "LAR VENDAS":I.tag, "BELEZA":I.spray, "APOIO LOJA":I.bag };

/* ================= Folha A4 ================= */
const MIN_ROWS = 3;
function sheetHTML(printTarget){
  const s = settings, sectors = s.sectors;
  const left  = sectors.filter((_,i)=>i%2===0);
  const right = sectors.filter((_,i)=>i%2===1);
  const pretty = formatDate(current.date);
  const logo = s.logoUrl
    ? `<img class="sheet-logo" src="${esc(s.logoUrl)}" alt="${esc(s.companyName)}">`
    : `<p class="sheet-word">${esc(s.companyName)}</p>`;

  const block = sec => {
    const rows = current.entries[sec.id] || [];
    const icon = SECTOR_ICON[sec.name] || I.users;
    let body = rows.map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.time)}</td><td>${esc(r.lunch||"—")}</td></tr>`).join("");
    for(let i=rows.length;i<MIN_ROWS;i++) body += "<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>";
    return `<div class="sheet-block">
      <div class="sheet-block-head"><span class="sheet-block-icon">${icon}</span><span class="sheet-block-title">${esc(sec.name)}</span></div>
      <table class="sheet-table"><thead><tr><th>COLABORADOR(A)</th><th>HORÁRIO</th><th>ALMOÇO</th></tr></thead><tbody>${body}</tbody></table>
    </div>`;
  };

  return `<div class="sheet${printTarget?'':' no-print'}"${printTarget?' id="escala-sheet"':''}>
    <header class="sheet-header">
      <span class="sheet-dots"></span>
      ${logo}
      <h1 class="sheet-title">ESCALA DE TRABALHO</h1>
      ${pretty?`<p class="sheet-date">${esc(pretty)}</p>`:""}
      <span class="sheet-rule"></span>
    </header>
    <div class="sheet-body">
      <div class="sheet-col">${left.map(block).join("")}</div>
      <div class="sheet-col">${right.map(block).join("")}</div>
    </div>
    <footer class="sheet-footer">
      <span class="sheet-block-icon">${I.clock}</span>
      <span class="sheet-footer-label">JORNADA:</span>
      <span class="sheet-footer-text">${esc(s.journeyLine1)}<br>${esc(s.journeyLine2)}</span>
      <span class="sheet-dots sheet-dots-footer"></span>
    </footer>
  </div>`;
}
function renderPrint(){ document.getElementById("printRoot").innerHTML = sheetHTML(true); }
function renderHeaderLogo(){
  const img=document.getElementById("hdrLogo"), word=document.getElementById("hdrWord");
  if(settings.logoUrl){ img.src=settings.logoUrl; img.style.display="block"; word.style.display="none"; }
  else { img.style.display="none"; word.style.display="inline"; word.textContent=settings.companyName; }
}

/* ================= Abas ================= */
const TABS = [
  ["escala","Montar escala"],["previa","Prévia"],["funcionarios","Funcionários"],
  ["horarios","Horários"],["salvas","Escalas salvas"],["config","Configurações"]
];
function renderTabs(){
  document.getElementById("tabs").innerHTML = TABS.map(([id,label])=>
    `<button class="tab${tab===id?" active":""}" data-tab="${id}">${label}</button>`).join("");
}
document.getElementById("tabs").addEventListener("click", e=>{
  const b=e.target.closest("[data-tab]"); if(!b) return; tab=b.dataset.tab; render();
});

function renderPanel(){
  const el = document.getElementById("panel");
  if(tab==="escala") el.innerHTML = builderHTML();
  else if(tab==="previa") el.innerHTML = `
    <div class="row" style="margin-bottom:16px">
      <button class="btn" onclick="window.print()">IMPRIMIR ESCALA</button>
      <button class="btn outline" onclick="copyScheduleText()">${I.copy} Copiar para WhatsApp</button>
      <span class="muted">A folha abaixo é exatamente o que será impresso (A4 retrato).</span>
    </div>
    <div class="preview-shell"><div class="sheet-scaler">${sheetHTML(false).replace(' no-print','')}</div></div>`;
  else if(tab==="funcionarios") el.innerHTML = employeesHTML();
  else if(tab==="horarios") el.innerHTML = shiftsHTML();
  else if(tab==="salvas") el.innerHTML = savedHTML();
  else el.innerHTML = settingsHTML();
}

/* ================= Montar escala ================= */
function builderHTML(){
  const dups = dupNames();
  const sectors = settings.sectors.map(sec=>{
    const list = current.entries[sec.id] || [];
    const items = list.length ? list.map((it,i)=>`
      <div class="assign${dups.has(norm(it.name))?" dup":""}">
        <div class="info"><b>${esc(it.name)}</b><small>${esc(it.time||"sem horário")}${it.lunch?` · Almoço ${esc(it.lunch)}`:""}</small>${dups.has(norm(it.name))?`<small class="dupmsg">Nome repetido na escala</small>`:""}</div>
        <button class="btn icon" onclick="moveItem('${sec.id}',${i},-1)" title="Subir">↑</button>
        <button class="btn icon" onclick="moveItem('${sec.id}',${i},1)" title="Descer">↓</button>
        <button class="btn icon" onclick="openAssign('${sec.id}','${it.id}')" title="Editar">Editar</button>
        <button class="btn icon" onclick="removeItem('${sec.id}','${it.id}')" title="Excluir">✕</button>
      </div>`).join("") : `<p class="muted">Nenhum colaborador.</p>`;
    return `<div class="sector-card">
      <div class="head">${esc(sec.name)}</div>
      <div class="body">${items}
        <button class="btn secondary" onclick="openAssign('${sec.id}',null)">＋ Adicionar colaborador</button>
      </div></div>`;
  }).join("");

  return `<div class="card"><div class="pad row">
      <div><label class="f">Nome da escala</label><input type="text" id="schName" value="${esc(current.name)}" style="width:220px" oninput="current.name=this.value;current.updatedAt=Date.now();persist()"></div>
      <div><label class="f">Data da escala (opcional)</label><input type="date" id="schDate" value="${esc(current.date)}" style="width:180px" onchange="current.date=this.value;current.updatedAt=Date.now();render()"></div>
      <div class="spacer row">
        <button class="btn secondary" onclick="openRandom()">${I.dice} Sorteio aleatório</button>
        ${undoSnap?`<button class="btn ghost" onclick="undoRandom()">↶ Desfazer sorteio</button>`:""}
        <button class="btn outline" onclick="tab='previa';render()">Pré-visualizar</button>
        <button class="btn outline" onclick="copyScheduleText()">${I.copy} Copiar para WhatsApp</button>
        <button class="btn outline" onclick="saveSchedule()">Salvar escala</button>
        <button class="btn ghost" onclick="clearSchedule()">✕ Limpar</button>
      </div>
    </div></div>
    ${summaryHTML()}
    ${dupAlertHTML(dups)}
    <div class="grid2">${sectors}</div>`;
}
function moveItem(sectorId,index,dir){
  const list = current.entries[sectorId] || []; const t=index+dir;
  if(t<0||t>=list.length) return;
  [list[index],list[t]]=[list[t],list[index]]; current.updatedAt=Date.now(); render();
}
function removeItem(sectorId,id){
  current.entries[sectorId]=(current.entries[sectorId]||[]).filter(x=>x.id!==id);
  current.updatedAt=Date.now(); render();
}
function saveSchedule(){
  const snap = JSON.parse(JSON.stringify(current)); snap.updatedAt=Date.now();
  const i = schedules.findIndex(s=>s.id===snap.id);
  if(i>=0) schedules[i]=snap; else schedules.unshift(snap);
  render(); toast("Escala salva no navegador");
}
function clearSchedule(){
  current = { id:uid(), name:"Nova escala", date:"", entries:emptyEntries(settings.sectors), updatedAt:Date.now() };
  undoSnap = null;
  render(); toast("Escala limpa");
}

/* ---- Diálogo de colaborador ---- */
let dlgState = null;
function openAssign(sectorId, itemId){
  const list = current.entries[sectorId] || [];
  const item = itemId ? list.find(x=>x.id===itemId) : null;
  dlgState = { sectorId, id:item?item.id:uid(), editing:!!item, name:item?item.name:"", time:item?item.time:"", lunch:item?item.lunch:"" };
  drawDialog(); document.getElementById("dlg").showModal();
}
function drawDialog(){
  const st=dlgState;
  const emp = employees.length
    ? `<div class="chips box">${employees.map(e=>`<button class="chip${st.name===e.name?" on":""}" onclick="dlgState.name='${esc(e.name).replace(/'/g,"\\'")}';drawDialog()">${esc(e.name)}</button>`).join("")}</div>`
    : `<p class="muted">Nenhum funcionário cadastrado — digite o nome abaixo.</p>`;
  const sh = shifts.length
    ? `<div class="chips">${shifts.map(s=>`<button class="chip${st.time===s.label?" on":""}" onclick="dlgState.time='${esc(s.label).replace(/'/g,"\\'")}';drawDialog()">${esc(s.label)}</button>`).join("")}</div>` : "";
  document.getElementById("dlgBody").innerHTML = `
    <h3>${st.editing?"Editar colaborador":"Adicionar colaborador"}</h3>
    <div><label class="f">Funcionário</label>${emp}
      <input type="text" style="margin-top:8px" placeholder="Nome do colaborador" value="${esc(st.name)}" oninput="dlgState.name=this.value"></div>
    <div><label class="f">Horário</label>${sh}
      <input type="text" style="margin-top:8px" placeholder="Ex.: 08:00 às 17:50" value="${esc(st.time)}" oninput="dlgState.time=this.value"></div>
    <div><label class="f">Horário de almoço (opcional)</label>
      <input type="text" placeholder="Ex.: 12:00 às 13:00" value="${esc(st.lunch)}" oninput="dlgState.lunch=this.value"></div>
    <div class="row" style="justify-content:flex-end">
      <button class="btn ghost" onclick="document.getElementById('dlg').close()">Cancelar</button>
      <button class="btn" onclick="saveAssign()">Salvar</button>
    </div>`;
}
function saveAssign(){
  const st=dlgState; const name=(st.name||"").trim();
  if(!name){ toast("Informe o nome"); return; }
  const item = { id:st.id, name, time:(st.time||"").trim(), lunch:(st.lunch||"").trim() };
  const jaExiste = allEntries().some(e=>e.id!==item.id && norm(e.name)===norm(name));
  const list = current.entries[st.sectorId] || (current.entries[st.sectorId]=[]);
  const i = list.findIndex(x=>x.id===item.id);
  if(i>=0) list[i]=item; else list.push(item);
  current.updatedAt=Date.now();
  document.getElementById("dlg").close(); render();
  if(jaExiste) toast("Atenção: esse nome já está na escala", 3200);
}

/* ================= Funcionários ================= */
let empQuery="", empEditing=null, empDraft="";
function employeesHTML(){
  const filtered = employees.filter(e=>e.name.toLowerCase().includes(empQuery.toLowerCase()));
  const rows = filtered.length ? filtered.map(e=>`<li><span class="name">${esc(e.name)}</span>
      <button class="btn icon" onclick="empEditing='${e.id}';empDraft='${esc(e.name).replace(/'/g,"\\'")}';render()">Editar</button>
      <button class="btn icon" onclick="employees=employees.filter(x=>x.id!=='${e.id}');render()">✕</button></li>`).join("")
    : `<li class="muted">Nenhum funcionário encontrado.</li>`;
  return `<div class="card"><h2>Funcionários</h2><div class="pad">
      <div class="row" style="margin-bottom:12px">
        <input type="text" id="empInput" placeholder="Nome completo" value="${esc(empDraft)}" style="max-width:290px"
          oninput="empDraft=this.value" onkeydown="if(event.key==='Enter')submitEmployee()">
        <button class="btn" onclick="submitEmployee()">＋ ${empEditing?"Salvar alteração":"Novo funcionário"}</button>
        ${empEditing?`<button class="btn ghost" onclick="empEditing=null;empDraft='';render()">Cancelar</button>`:""}
      </div>
      <input type="text" placeholder="Pesquisar funcionário" value="${esc(empQuery)}" style="margin-bottom:12px"
        oninput="empQuery=this.value;render();const i=document.querySelectorAll('#panel input')[1];i.focus();i.setSelectionRange(i.value.length,i.value.length)">
      <ul class="list">${rows}</ul>
      <details class="outside" style="margin-top:16px;padding-top:12px">
        <summary>Cadastrar vários de uma vez</summary>
        <p class="hint" style="margin:0 0 8px">Cole uma lista com um nome por linha. Nomes que já existem são ignorados.</p>
        <textarea id="bulkEmp" placeholder="Maria Silva&#10;João Souza&#10;Ana Lima"></textarea>
        <button class="btn" style="margin-top:8px" onclick="bulkAddEmployees()">＋ Cadastrar lista</button>
      </details></div></div>`;
}
function bulkAddEmployees(){
  const area=document.getElementById("bulkEmp"); if(!area) return;
  const known=new Set(employees.map(e=>norm(e.name)));
  let added=0, skipped=0;
  area.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).forEach(n=>{
    const k=norm(n); if(known.has(k)){ skipped++; return; }
    known.add(k); employees.push({id:uid(),name:n}); added++;
  });
  render();
  toast(added?`${added} funcionário(s) cadastrado(s)${skipped?` · ${skipped} já existiam`:""}`:"Nenhum nome novo para cadastrar");
}
function submitEmployee(){
  const v=(empDraft||"").trim(); if(!v) return;
  if(empEditing){ employees=employees.map(e=>e.id===empEditing?{...e,name:v}:e); empEditing=null; }
  else employees.push({id:uid(),name:v});
  empDraft=""; render();
}

/* ================= Horários ================= */
let shiftEditing=null, shiftDraft="";
function shiftsHTML(){
  const rows = shifts.length ? shifts.map(s=>`<li><span class="name">${esc(s.label)}</span>
      <button class="btn icon" onclick="shiftEditing='${s.id}';shiftDraft='${esc(s.label).replace(/'/g,"\\'")}';render()">Editar</button>
      <button class="btn icon" onclick="shifts=shifts.filter(x=>x.id!=='${s.id}');render()">✕</button></li>`).join("")
    : `<li class="muted">Nenhum horário cadastrado.</li>`;
  return `<div class="card"><h2>Horários</h2><div class="pad">
    <div class="row" style="margin-bottom:12px">
      <input type="text" placeholder="Ex.: 08:00 às 17:50" value="${esc(shiftDraft)}" style="max-width:290px"
        oninput="shiftDraft=this.value" onkeydown="if(event.key==='Enter')submitShift()">
      <button class="btn" onclick="submitShift()">＋ ${shiftEditing?"Salvar alteração":"Novo horário"}</button>
    </div><ul class="list">${rows}</ul></div></div>`;
}
function submitShift(){
  const v=(shiftDraft||"").trim(); if(!v) return;
  if(shiftEditing){ shifts=shifts.map(s=>s.id===shiftEditing?{...s,label:v}:s); shiftEditing=null; }
  else shifts.push({id:uid(),label:v});
  shiftDraft=""; render();
}

/* ================= Escalas salvas ================= */
function savedHTML(){
  const rows = schedules.length ? schedules.map(s=>`<li>
      <div style="margin-right:auto"><p style="margin:0;font-size:14px;font-weight:600">${esc(s.name)}</p>
        <p class="muted" style="margin:2px 0 0">${s.date?formatDate(s.date):"sem data"} · ${new Date(s.updatedAt).toLocaleString("pt-BR")}</p></div>
      <button class="btn sm outline" onclick="openSchedule('${s.id}')">Abrir / editar</button>
      <button class="btn sm ghost" onclick="duplicateSchedule('${s.id}')">Duplicar</button>
      <button class="btn sm ghost" onclick="printSchedule('${s.id}')">Imprimir</button>
      <button class="btn sm ghost" onclick="schedules=schedules.filter(x=>x.id!=='${s.id}');render()">✕</button>
    </li>`).join("") : `<li class="muted">Nenhuma escala salva ainda.</li>`;
  return `<div class="card"><h2>Escalas salvas</h2><div class="pad"><ul class="list">${rows}</ul></div></div>`;
}
function openSchedule(id){ const s=schedules.find(x=>x.id===id); if(!s) return; current=JSON.parse(JSON.stringify(s)); undoSnap=null; tab="escala"; render(); }
function duplicateSchedule(id){
  const s=schedules.find(x=>x.id===id); if(!s) return;
  const copy=JSON.parse(JSON.stringify(s)); copy.id=uid(); copy.name=s.name+" (cópia)"; copy.updatedAt=Date.now();
  schedules.unshift(copy); render(); toast("Escala duplicada");
}
function printSchedule(id){ const s=schedules.find(x=>x.id===id); if(!s) return; current=JSON.parse(JSON.stringify(s)); render(); setTimeout(()=>window.print(),250); }

/* ================= Configurações ================= */
let sectorDraft="";
function settingsHTML(){
  return `<div class="grid2">
    <div class="card"><h2>Empresa e rodapé</h2><div class="pad">
      <div style="margin-bottom:12px"><label class="f">Nome da empresa</label>
        <input type="text" value="${esc(settings.companyName)}" oninput="settings.companyName=this.value;persist();renderPrint();renderHeaderLogo()"></div>
      <div style="margin-bottom:12px"><label class="f">Logo (opcional)</label>
        <input type="file" accept="image/*" onchange="uploadLogo(this)">
        ${settings.logoUrl?`<button class="btn ghost sm" style="margin-top:6px" onclick="settings.logoUrl='';render()">Remover logo</button>`:""}</div>
      <div style="margin-bottom:12px"><label class="f">Jornada — linha 1</label>
        <input type="text" value="${esc(settings.journeyLine1)}" oninput="settings.journeyLine1=this.value;persist();renderPrint()"></div>
      <div><label class="f">Jornada — linha 2</label>
        <input type="text" value="${esc(settings.journeyLine2)}" oninput="settings.journeyLine2=this.value;persist();renderPrint()"></div>
    </div></div>
    <div class="card"><h2>Cores da plataforma</h2><div class="pad">
      <div class="row">
        <div><label class="f">Cor principal</label>
          <input type="color" value="${esc(settings.colorPrimary)}" style="width:60px;height:38px;padding:2px" oninput="settings.colorPrimary=this.value;render()"></div>
        <div><label class="f">Cor de destaque</label>
          <input type="color" value="${esc(settings.colorAccent)}" style="width:60px;height:38px;padding:2px" oninput="settings.colorAccent=this.value;render()"></div>
        <div class="spacer">
          <button class="btn ghost sm" onclick="settings.colorPrimary=DEFAULT_SETTINGS.colorPrimary;settings.colorAccent=DEFAULT_SETTINGS.colorAccent;render()">Restaurar cores padrão</button>
        </div>
      </div>
    </div></div>
    <div class="card"><h2>Setores</h2><div class="pad">
      <div class="row" style="margin-bottom:12px">
        <input type="text" placeholder="Novo setor" value="${esc(sectorDraft)}" style="max-width:250px"
          oninput="sectorDraft=this.value" onkeydown="if(event.key==='Enter')addSector()">
        <button class="btn" onclick="addSector()">＋</button>
      </div>
      <ul class="list">${settings.sectors.map(s=>`<li><span class="name">${esc(s.name)}</span>
        <button class="btn icon" onclick="removeSector('${s.id}')">✕</button></li>`).join("")}</ul>
      <button class="btn outline" style="margin-top:12px" onclick="settings.sectors=JSON.parse(JSON.stringify(DEFAULT_SECTORS));syncEntries();render();toast('Setores padrão restaurados')">Restaurar setores padrão</button>
    </div></div>
    <div class="card"><h2>Backup dos dados</h2><div class="pad">
      <p class="muted" style="margin:0 0 12px">Tudo fica salvo só neste navegador. Baixe um arquivo de backup de vez em quando para não perder nada ao trocar de computador ou limpar o histórico.</p>
      <div class="row">
        <button class="btn" onclick="exportBackup()">Baixar backup</button>
      </div>
      <div style="margin-top:12px"><label class="f">Restaurar de um backup</label>
        <input type="file" accept=".json,application/json" onchange="importBackup(this)"></div>
    </div></div></div>`;
}
function uploadLogo(input){
  const file = input.files && input.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{ settings.logoUrl = String(reader.result); render(); };
  reader.readAsDataURL(file);
}
function addSector(){
  const v=(sectorDraft||"").trim().toUpperCase(); if(!v) return;
  const sec={id:uid(),name:v}; settings.sectors.push(sec); current.entries[sec.id]=[]; sectorDraft=""; render();
}
function removeSector(id){ settings.sectors=settings.sectors.filter(s=>s.id!==id); render(); }
function syncEntries(){ settings.sectors.forEach(s=>{ if(!current.entries[s.id]) current.entries[s.id]=[]; }); }

/* ================= Utilidades ================= */
const norm = s => String(s||"").trim().toLowerCase().replace(/\s+/g," ");
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
function shuffle(arr){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function allEntries(){ const out=[]; settings.sectors.forEach(s=>(current.entries[s.id]||[]).forEach(e=>out.push(e))); return out; }
function parseStart(label){
  const m=String(label||"").match(/(\d{1,2})\s*[:hH]\s*(\d{2})?/); if(!m) return null;
  const h=+m[1], mi=+(m[2]||0); return (h>23||mi>59) ? null : h*60+mi;
}
const fmtMin = m => String(Math.floor(m/60)%24).padStart(2,"0")+":"+String(m%60).padStart(2,"0");

/* ================= Resumo e avisos ================= */
function dupNames(){
  const seen=new Set(), dups=new Set();
  allEntries().forEach(e=>{ const k=norm(e.name); if(seen.has(k)) dups.add(k); seen.add(k); });
  return dups;
}
function dupAlertHTML(dups){
  if(!dups.size) return "";
  const nomes=[]; const done=new Set();
  allEntries().forEach(e=>{ const k=norm(e.name); if(dups.has(k)&&!done.has(k)){ done.add(k); nomes.push(e.name); } });
  return `<div class="alert"><span>⚠</span><span><b>${dups.size===1?"1 nome aparece":dups.size+" nomes aparecem"} mais de uma vez na escala:</b> ${nomes.map(esc).join(", ")}.</span></div>`;
}
function summaryHTML(){
  const all=allEntries(), names=new Set(all.map(e=>norm(e.name)));
  const noTime=all.filter(e=>!e.time).length, noLunch=all.filter(e=>!e.lunch).length;
  const outside=employees.filter(e=>!names.has(norm(e.name)));
  return `<div class="card"><div class="pad stats">
      <div class="stat"><b>${all.length}</b><span>na escala</span></div>
      <div class="stat${noTime?" warn":""}"><b>${noTime}</b><span>sem horário</span></div>
      <div class="stat${noLunch?" warn":""}"><b>${noLunch}</b><span>sem almoço</span></div>
      <div class="stat"><b>${outside.length}</b><span>cadastrados fora da escala</span></div>
    </div>
    ${outside.length?`<details class="pad outside"><summary>Ver quem ficou de fora</summary><div class="chips">${outside.map(e=>`<span class="chip">${esc(e.name)}</span>`).join("")}</div></details>`:""}
  </div>`;
}

/* ================= Sorteio aleatório ================= */
let gen=null;
function openRandom(){
  syncEntries();
  const L=Object.assign({}, DEFAULT_SETTINGS.lunch, settings.lunch||{});
  gen={ sectors:settings.sectors.map(s=>s.id), distribute:true, shift:true, lunch:true, shuffle:true, overwrite:false,
        duration:L.duration, step:L.step, from:L.from/60, to:L.to/60 };
  drawRandom(); document.getElementById("dlg").showModal();
}
function toggleGenSector(id){
  gen.sectors = gen.sectors.includes(id) ? gen.sectors.filter(x=>x!==id) : gen.sectors.concat(id);
  drawRandom();
}
function drawRandom(){
  const names=new Set(allEntries().map(e=>norm(e.name)));
  const free=employees.filter(e=>!names.has(norm(e.name))).length;
  const chk=(k,label,hint)=>`<label class="check"><input type="checkbox" ${gen[k]?"checked":""} onchange="gen.${k}=this.checked"><span><b>${label}</b><small>${hint}</small></span></label>`;
  document.getElementById("dlgBody").innerHTML = `
    <h3>Sorteio aleatório</h3>
    <p class="muted" style="margin:0">Cada pessoa entra uma única vez. Use “Desfazer sorteio” se não gostar do resultado.</p>
    <div><label class="f">Setores no sorteio</label>
      <div class="chips">${settings.sectors.map(s=>`<button class="chip${gen.sectors.includes(s.id)?" on":""}" onclick="toggleGenSector('${s.id}')">${esc(s.name)}</button>`).join("")}</div></div>
    <div class="checks">
      ${chk("distribute","Distribuir funcionários nos setores",`${free} cadastrado(s) ainda fora da escala`)}
      ${chk("shift","Sortear horário de trabalho","Usa os horários da aba Horários, de forma equilibrada em cada setor")}
      ${chk("lunch","Sortear horário de almoço","Evita colocar o mesmo horário para pessoas do mesmo setor")}
      ${chk("shuffle","Embaralhar a ordem dos nomes","Em cada setor")}
      ${chk("overwrite","Refazer também quem já tem horário e almoço","Desmarcado: mantém tudo que você já preencheu")}
    </div>
    <div><label class="f">Regras do almoço</label>
      <div class="row">
        <div><label class="f">Duração (min)</label><input type="number" min="15" max="240" step="5" value="${esc(gen.duration)}" oninput="gen.duration=this.value"></div>
        <div><label class="f">Intervalo (min)</label><input type="number" min="5" max="120" step="5" value="${esc(gen.step)}" oninput="gen.step=this.value"></div>
        <div><label class="f">Começa após (h)</label><input type="number" min="0" max="10" step="0.5" value="${esc(gen.from)}" oninput="gen.from=this.value"></div>
        <div><label class="f">Até (h)</label><input type="number" min="0" max="10" step="0.5" value="${esc(gen.to)}" oninput="gen.to=this.value"></div>
      </div>
      <p class="hint">Exemplo: entrada 08:00, começa após 3 h até 4,5 h → almoço sai entre 11:00 e 12:30.</p></div>
    <div class="row" style="justify-content:flex-end">
      <button class="btn ghost" onclick="document.getElementById('dlg').close()">Cancelar</button>
      <button class="btn" onclick="runRandom()">${I.dice} Sortear agora</button>
    </div>`;
}
function runRandom(){
  const o=gen;
  const dur=+o.duration, step=+o.step, from=Math.round(+o.from*60), to=Math.round(+o.to*60);
  if(!o.sectors.length){ toast("Marque pelo menos um setor"); return; }
  if(!(o.distribute||o.shift||o.lunch||o.shuffle)){ toast("Marque pelo menos uma opção"); return; }
  if(o.distribute && !employees.length){ toast("Cadastre funcionários na aba Funcionários primeiro", 3200); return; }
  if(o.lunch && !(dur>=15 && dur<=240 && step>=5 && step<=120 && from>=0 && to>=from && to<=600)){ toast("Confira os valores do almoço"); return; }

  syncEntries();
  undoSnap = JSON.parse(JSON.stringify(current));
  const secs = settings.sectors.filter(s=>o.sectors.includes(s.id));
  const stat = { added:0, shift:0, lunch:0, noStart:0 };

  // 1) Distribui quem ainda não está na escala (ninguém repete)
  if(o.distribute){
    const used=new Set(allEntries().map(e=>norm(e.name)));
    const pool=[]; employees.forEach(e=>{ const k=norm(e.name); if(k && !used.has(k)){ used.add(k); pool.push(e); } });
    shuffle(pool).forEach(e=>{
      const min=Math.min(...secs.map(s=>current.entries[s.id].length));
      const sec=pick(secs.filter(s=>current.entries[s.id].length===min));
      current.entries[sec.id].push({ id:uid(), name:e.name, time:"", lunch:"" });
      stat.added++;
    });
  }

  // 2) Horário de trabalho, equilibrado por setor
  if(o.shift && shifts.length){
    secs.forEach(sec=>{
      const list=current.entries[sec.id];
      const targets=shuffle(list.filter(e=>o.overwrite || !e.time));
      targets.forEach(e=>{ e.time=""; });
      targets.forEach(e=>{
        const cnt=shifts.map(s=>({ s, n:list.filter(x=>x.time===s.label).length }));
        const min=Math.min(...cnt.map(c=>c.n));
        e.time=pick(cnt.filter(c=>c.n===min)).s.label; stat.shift++;
      });
    });
  }

  // 3) Almoço: espalha os horários (prioriza não repetir dentro do setor e depois na loja toda)
  if(o.lunch){
    const targets=[];
    secs.forEach(sec=>current.entries[sec.id].forEach(e=>{ if(o.overwrite || !e.lunch){ e.lunch=""; targets.push([sec,e]); } }));
    const gUse={}, sUse={};
    settings.sectors.forEach(sec=>current.entries[sec.id].forEach(e=>{
      const m=parseStart(e.lunch); if(!e.lunch || m==null) return;
      gUse[m]=(gUse[m]||0)+1; const su=sUse[sec.id]=sUse[sec.id]||{}; su[m]=(su[m]||0)+1;
    }));
    shuffle(targets).forEach(([sec,e])=>{
      const st=parseStart(e.time); if(st==null){ stat.noStart++; return; }
      const slots=[]; for(let m=st+from; m<=st+to; m+=step) slots.push(m);
      if(!slots.length){ stat.noStart++; return; }
      const su=sUse[sec.id]=sUse[sec.id]||{};
      const scored=slots.map(m=>({ m, c:(su[m]||0)*100+(gUse[m]||0) }));
      const min=Math.min(...scored.map(x=>x.c));
      const m=pick(scored.filter(x=>x.c===min)).m;
      e.lunch=`${fmtMin(m)} às ${fmtMin(m+dur)}`;
      su[m]=(su[m]||0)+1; gUse[m]=(gUse[m]||0)+1; stat.lunch++;
    });
    settings.lunch={ duration:dur, step, from, to };
  }

  // 4) Embaralha a ordem dos nomes
  if(o.shuffle) secs.forEach(sec=>{ current.entries[sec.id]=shuffle(current.entries[sec.id]); });

  current.updatedAt=Date.now();
  document.getElementById("dlg").close(); render();
  const parts=[];
  if(stat.added) parts.push(`${stat.added} colaborador(es) distribuído(s)`);
  if(stat.shift) parts.push(`${stat.shift} horário(s)`);
  if(stat.lunch) parts.push(`${stat.lunch} almoço(s)`);
  let msg = parts.length ? "Sorteio pronto: "+parts.join(", ") : "Sorteio feito";
  if(stat.noStart) msg += ` · ${stat.noStart} sem almoço por falta de horário de entrada válido`;
  toast(msg, 4200);
}
function undoRandom(){
  if(!undoSnap) return;
  current=undoSnap; undoSnap=null; render(); toast("Sorteio desfeito");
}

/* ================= Copiar para WhatsApp ================= */
function scheduleText(){
  const d=formatDate(current.date);
  let t=`*ESCALA DE TRABALHO*${d?" - "+d:""}\n`;
  settings.sectors.forEach(sec=>{
    const rows=current.entries[sec.id]||[]; if(!rows.length) return;
    t+=`\n*${sec.name}*\n`;
    rows.forEach(r=>{ t+=`• ${r.name}${r.time?` - ${r.time}`:""}${r.lunch?` | Almoço ${r.lunch}`:""}\n`; });
  });
  if(settings.journeyLine1) t+=`\n${settings.journeyLine1}`;
  return t;
}
function copyScheduleText(){
  const text=scheduleText();
  const fallback=()=>{
    const ta=document.createElement("textarea"); ta.value=text; ta.style.position="fixed"; ta.style.opacity="0";
    document.body.appendChild(ta); ta.select();
    let ok=false; try{ ok=document.execCommand("copy"); }catch(e){}
    ta.remove(); toast(ok?"Escala copiada. É só colar no WhatsApp":"Não foi possível copiar", 3000);
  };
  if(navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(text).then(()=>toast("Escala copiada. É só colar no WhatsApp",3000)).catch(fallback);
  } else fallback();
}

/* ================= Backup ================= */
function exportBackup(){
  const data={ app:"escala", version:1, exportedAt:new Date().toISOString(), employees, shifts, settings, schedules, current };
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download=`backup-escala-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  toast("Backup baixado");
}
function importBackup(input){
  const f=input.files && input.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const d=JSON.parse(r.result);
      if(!d || !Array.isArray(d.employees) || !Array.isArray(d.shifts) || !Array.isArray(d.schedules) || !d.settings || !d.current || !d.current.entries) throw new Error("formato");
      if(!confirm("Isso substitui tudo que está salvo agora neste navegador. Continuar?")){ input.value=""; return; }
      employees=d.employees; shifts=d.shifts; schedules=d.schedules; current=d.current;
      settings=Object.assign({}, DEFAULT_SETTINGS, d.settings);
      undoSnap=null; syncEntries(); render(); toast("Backup restaurado");
    }catch(e){ toast("Arquivo de backup inválido"); input.value=""; }
  };
  r.readAsText(f);
}

/* ================= WhatsApp (upgrade) ================= */
const WA_NUMBER="5511932063181";
const WA_MSG="Olá QUERO DÁ UM UPGRADE NO MEU SISTEMA!!";
const WA_URL=`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MSG)}`;
document.querySelectorAll("[data-wa]").forEach(a=>{ a.href=WA_URL; });

/* ================= Novidades (newsletter) ================= */
const NEWS_VERSION="2026-09-19";
const NEWS = [
  ["Horário de almoço","Informe o almoço de cada colaborador. Ele sai na folha impressa."],
  ["Ordem aleatória","Sorteie setor, horário de trabalho e almoço dos funcionários cadastrados, sem repetir ninguém."],
  ["Aviso de nomes repetidos","O sistema destaca quem aparece mais de uma vez na escala."],
  ["Resumo da escala","Veja quantos estão escalados e quem está sem horário, sem almoço ou fora da escala."],
  ["Copiar para WhatsApp","Envie a escala como texto para o grupo da equipe, com um clique."],
  ["Backup dos dados","Baixe um arquivo com tudo e restaure em outro computador quando precisar."],
  ["Cadastro em lote","Cole uma lista de nomes e cadastre todos os funcionários de uma vez."]
];
function updateNewsDot(){ document.getElementById("newsDot").hidden = load("newsSeen","")===NEWS_VERSION; }
function openNews(){
  document.getElementById("newsBody").innerHTML = `
    <div class="news-head"><h3>Seja bem-vindo!!</h3><p>Confira nossas novas atualizações</p></div>
    <ul class="news-list">${NEWS.map(([t,d])=>`<li><b>${esc(t)}</b><span>${esc(d)}</span></li>`).join("")}</ul>
    <div class="row" style="justify-content:space-between;align-items:center">
      <a class="btn wa" href="${WA_URL}" target="_blank" rel="noopener" style="text-decoration:none">Preciso de um upgrade, tive uma ideia!</a>
      <button class="btn" onclick="document.getElementById('news').close()">Entendi</button>
    </div>`;
  document.getElementById("news").showModal();
}
document.getElementById("news").addEventListener("close", ()=>{ save("newsSeen", NEWS_VERSION); updateNewsDot(); });

syncEntries();
applyTheme();
render();
updateNewsDot();
if(load("newsSeen","")!==NEWS_VERSION) openNews();
