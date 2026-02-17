/* Projeto 121 — PWA (offline + salvamento local) */
const STORAGE_KEY = "projeto121_pwa_v1";
const TARGET_DATE_DEFAULT = "2026-06-16";
const RANKS = [
  { name: "Bronze", threshold: 0 },
  { name: "Prata", threshold: 400 },
  { name: "Ouro", threshold: 900 },
  { name: "Lendário", threshold: 1600 },
];
const ACTIONS_GAIN = [
  { label: "+5  Ficar", name: "Ficar comigo (tempo de qualidade)", points: 5 },
  { label: "+15 Ativa", name: "Atividade diferente/ativa comigo", points: 15 },
  { label: "+20 Date", name: "Sair comigo (date)", points: 20 },
  { label: "+25 Planejar", name: "Planejar um date do zero", points: 25 },
  { label: "+1  Tratar bem", name: "Me tratar bem (1 dia)", points: 1 },
  { label: "+12 Conversa", name: "Conversa profunda / planejamento do futuro", points: 12 },
  { label: "+15 Maturidade", name: "Resolver conflito com maturidade", points: 15 },
  { label: "+10 Surpresa", name: "Surpresa pequena espontânea", points: 10 },
  { label: "+8  Prático", name: "Algo prático pra facilitar minha rotina", points: 8 },
  { label: "+10 Eu gosto", name: "Fazer algo que eu gosto (mesmo não sendo o favorito)", points: 10 },
];
const ACTIONS_LOSS = [
  { label: "-5  Ignorar", name: "Ignorar mensagem importante", points: -5 },
  { label: "-8  Atraso", name: "Atraso recorrente", points: -8 },
  { label: "-20 Cancelar", name: "Cancelar plano sem justificativa", points: -20 },
  { label: "-15 7 dias", name: "7 dias sem iniciativa", points: -15 },
  { label: "-25 Briga", name: "Brigar por motivo evitável", points: -25 },
  { label: "-20 Frieza", name: "Frieza proposital", points: -20 },
  { label: "-15 Não assume", name: "Não assumir erro (quando evidente)", points: -15 },
  { label: "-40 Xingar", name: "Xingar", points: -40 },
  { label: "-50 Gritar", name: "Gritar agressivamente", points: -50 },
  { label: "-60 Maltratar", name: "Maltratar emocionalmente", points: -60 },
  { label: "-70 Humilhar", name: "Humilhar / desmerecer", points: -70 },
  { label: "-150 Respeito", name: "Falta de respeito grave", points: -150 },
  { label: "-200 Confiança", name: "Quebra de confiança", points: -200 },
];
const DEFAULT_REWARDS = [
  { name: "🍜 Miojo", cost: 40 },
  { name: "🍫 Barra de chocolate", cost: 60 },
  { name: "🧦 Pack 3 meias", cost: 120 },
  { name: "🩲 Pack 3 cuecas", cost: 180 },
  { name: "👕 Camiseta Alternazero", cost: 420 },
  { name: "🧴 Kit Granado", cost: 450 },
  { name: "🕶 Óculos de sol polarizado", cost: 480 },
  { name: "🎧 Fone bluetooth sem fio", cost: 900 },
  { name: "🌫 Perfume", cost: 1000 },
  { name: "🥾 Coturno Doc Martens", cost: 1600 },
  { name: "🪙 Coinslot (mod corporal)", cost: 1800 },
];
function nowTime(){const d=new Date();return d.toTimeString().slice(0,5);}
function todayISO(){const d=new Date();return d.toISOString().slice(0,10);}
function parseISO(s){const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d);}
function fmtMonth(d){const months=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];return `${months[d.getMonth()]} ${d.getFullYear()}`;}
function computeRank(points){let cur="Bronze";for(const r of RANKS) if(points>=r.threshold) cur=r.name;return cur;}
function uid(){return (crypto?.randomUUID)?crypto.randomUUID():(Math.random().toString(16).slice(2)+Date.now().toString(16));}
function loadState(){
  const raw=localStorage.getItem(STORAGE_KEY);
  if(!raw){const init={version:1,target_date:TARGET_DATE_DEFAULT,rewards:DEFAULT_REWARDS,events:[]};localStorage.setItem(STORAGE_KEY,JSON.stringify(init));return init;}
  try{const st=JSON.parse(raw);st.version??=1;st.target_date??=TARGET_DATE_DEFAULT;st.rewards??=DEFAULT_REWARDS;st.events??=[];return st;}
  catch{const init={version:1,target_date:TARGET_DATE_DEFAULT,rewards:DEFAULT_REWARDS,events:[]};localStorage.setItem(STORAGE_KEY,JSON.stringify(init));return init;}
}
function saveState(st){localStorage.setItem(STORAGE_KEY,JSON.stringify(st));}
let state=loadState();
let selectedDate=todayISO();
let viewMonth=parseISO(selectedDate);viewMonth.setDate(1);
let selectedReward=null;
const $=(id)=>document.getElementById(id);
const calGrid=$("calGrid");
const monthLabel=$("monthLabel");
const selectedDatePill=$("selectedDatePill");
const totalPointsEl=$("totalPoints");
const rankEl=$("rank");
const countdownEl=$("countdown");
const daySummaryEl=$("daySummary");
const dayTableBody=$("dayTable").querySelector("tbody");
const allWrap=$("allWrap");
const allTableBody=$("allTable").querySelector("tbody");
const rewardsList=$("rewardsList");
const showAll=$("showAll");
const fileInput=$("fileInput");
$("prevMonth").addEventListener("click",()=>{viewMonth.setMonth(viewMonth.getMonth()-1);render();});
$("nextMonth").addEventListener("click",()=>{viewMonth.setMonth(viewMonth.getMonth()+1);render();});
$("btnManual").addEventListener("click",()=>{
  const ptsStr=prompt("Pontos (ex: 10 ou -25):");
  if(ptsStr===null) return;
  const pts=parseInt(ptsStr,10);
  if(!Number.isFinite(pts)) return alert("Digite um número inteiro.");
  const note=prompt("Descrição (opcional):")||"";
  addEvent("✍️ Ajuste manual",pts,note);
});
$("btnResetDay").addEventListener("click",()=>{
  const dayEvents=eventsByDate(selectedDate);
  if(!dayEvents.length) return alert("Não há registros neste dia.");
  if(!confirm(`Resetar TODOS os registros de ${selectedDate}?`)) return;
  state.events=state.events.filter(e=>e.date!==selectedDate);
  saveState(state);render();
});
$("btnTarget").addEventListener("click",()=>{
  const cur=state.target_date||TARGET_DATE_DEFAULT;
  const v=prompt("Digite a data alvo (AAAA-MM-DD):",cur);
  if(!v) return;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(v)) return alert("Formato inválido. Ex: 2026-06-16");
  state.target_date=v;saveState(state);render();
});
$("btnExport").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download="projeto121_backup.json";a.click();URL.revokeObjectURL(url);
});
$("btnImport").addEventListener("click",()=>fileInput.click());
fileInput.addEventListener("change",async()=>{
  const file=fileInput.files?.[0]; if(!file) return;
  try{
    const text=await file.text();
    const data=JSON.parse(text);
    if(!data||typeof data!=="object"||!Array.isArray(data.events)) throw new Error("Arquivo inválido.");
    state=data; state.target_date??=TARGET_DATE_DEFAULT; state.rewards??=DEFAULT_REWARDS;
    saveState(state); alert("Importado com sucesso!"); render();
  }catch(e){ alert("Falha ao importar: "+(e?.message||e)); }
  finally{ fileInput.value=""; }
});
showAll.addEventListener("change",()=>renderHistory());
$("btnRedeem").addEventListener("click",()=>{
  if(!selectedReward) return alert("Selecione um prêmio.");
  const reward=state.rewards.find(r=>r.name===selectedReward); if(!reward) return;
  const total=totalPoints(); if(total<reward.cost) return alert(`Ainda não dá. Faltam ${reward.cost-total} pontos.`);
  if(!confirm(`Resgatar '${reward.name}' por ${reward.cost} pontos?`)) return;
  addEvent(`🎁 Resgate: ${reward.name}`,-reward.cost,"Resgate de prêmio");
});
$("btnAddReward").addEventListener("click",()=>{
  const name=prompt("Nome do prêmio:"); if(!name) return;
  const costStr=prompt("Custo em pontos (ex: 450):"); if(!costStr) return;
  const cost=parseInt(costStr,10); if(!Number.isFinite(cost)||cost<=0) return alert("Custo inválido.");
  state.rewards.push({name,cost}); saveState(state); renderRewards();
});
$("btnDelReward").addEventListener("click",()=>{
  if(!selectedReward) return alert("Selecione um prêmio.");
  if(!confirm(`Excluir o prêmio '${selectedReward}'?`)) return;
  state.rewards=state.rewards.filter(r=>r.name!==selectedReward);
  selectedReward=null; saveState(state); renderRewards();
});
function addEvent(name,points,note=""){
  state.events.push({id:uid(),date:selectedDate,time:nowTime(),name,points,note,ts:new Date().toISOString()});
  saveState(state); render();
}
function totalPoints(){return state.events.reduce((a,e)=>a+(Number(e.points)||0),0);}
function eventsByDate(d){return state.events.filter(e=>e.date===d).sort((a,b)=>(a.ts||"").localeCompare(b.ts||""));}
function dayAggForMonth(year,month0){
  const m={};
  for(const e of state.events){
    if(!e.date) continue;
    const dt=parseISO(e.date);
    if(dt.getFullYear()!==year||dt.getMonth()!==month0) continue;
    const rec=m[e.date] ||= {gain:false,loss:false};
    const pts=Number(e.points)||0;
    if(pts>0) rec.gain=true;
    if(pts<0) rec.loss=true;
  }
  return m;
}
function renderHeader(){
  const total=totalPoints();
  totalPointsEl.textContent=String(total);
  rankEl.textContent=computeRank(total);
  const target=state.target_date||TARGET_DATE_DEFAULT;
  try{
    const tgt=parseISO(target);
    const today=new Date(); today.setHours(0,0,0,0);
    const diffDays=Math.round((tgt-today)/(1000*60*60*24));
    countdownEl.textContent=diffDays>=0?`⏳ Faltam ${diffDays} dias`:`⏳ Já passou (${Math.abs(diffDays)} dias)`;
  }catch{ countdownEl.textContent="⏳ Data alvo inválida"; }
}
function renderCalendar(){
  monthLabel.textContent=fmtMonth(viewMonth);
  selectedDatePill.textContent=selectedDate;
  calGrid.innerHTML="";
  const year=viewMonth.getFullYear();
  const month0=viewMonth.getMonth();
  const firstDay=new Date(year,month0,1);
  const startDow=firstDay.getDay();
  const daysInMonth=new Date(year,month0+1,0).getDate();
  const prevDays=new Date(year,month0,0).getDate();
  const agg=dayAggForMonth(year,month0);
  const totalCells=42;
  for(let i=0;i<totalCells;i++){
    const cell=document.createElement("div");
    cell.className="day";
    let dNum,cellDate,isOther=false;
    if(i<startDow){
      dNum=prevDays-(startDow-1-i);
      const dt=new Date(year,month0-1,dNum);
      isOther=true; cellDate=dt.toISOString().slice(0,10);
    }else if(i>=startDow+daysInMonth){
      dNum=i-(startDow+daysInMonth)+1;
      const dt=new Date(year,month0+1,dNum);
      isOther=true; cellDate=dt.toISOString().slice(0,10);
    }else{
      dNum=i-startDow+1;
      const dt=new Date(year,month0,dNum);
      cellDate=dt.toISOString().slice(0,10);
    }
    if(isOther) cell.classList.add("other");
    if(cellDate===selectedDate) cell.classList.add("selected");
    cell.textContent=dNum;
    const rec=agg[cellDate];
    if(rec){
      const mk=document.createElement("div");
      mk.className="marker "+(rec.gain&&rec.loss?"both":rec.gain?"gain":"loss");
      cell.appendChild(mk);
    }
    cell.addEventListener("click",()=>{
      selectedDate=cellDate;
      const dt=parseISO(cellDate);
      if(dt.getFullYear()!==year||dt.getMonth()!==month0){
        viewMonth=new Date(dt.getFullYear(),dt.getMonth(),1);
      }
      render();
    });
    calGrid.appendChild(cell);
  }
}
function renderButtons(){
  const gainWrap=$("gainButtons");
  const lossWrap=$("lossButtons");
  gainWrap.innerHTML=""; lossWrap.innerHTML="";
  const mkBtn=(item,type)=>{
    const b=document.createElement("button");
    b.className="btn";
    b.textContent=item.label;
    if(type==="loss") b.classList.add("btn-warn");
    b.title=`${item.name} (${item.points>0?"+":""}${item.points})`;
    b.addEventListener("click",()=>addEvent(item.name,item.points,""));
    return b;
  };
  ACTIONS_GAIN.forEach(it=>gainWrap.appendChild(mkBtn(it,"gain")));
  ACTIONS_LOSS.forEach(it=>lossWrap.appendChild(mkBtn(it,"loss")));
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function renderHistory(){
  const evts=eventsByDate(selectedDate);
  dayTableBody.innerHTML="";
  let daySum=0; for(const e of evts) daySum+=Number(e.points)||0;
  daySummaryEl.textContent=`Saldo do dia: ${daySum>=0?"+":""}${daySum} pts`;
  for(const e of evts){
    const tr=document.createElement("tr");
    const pts=Number(e.points)||0;
    tr.innerHTML=`
      <td>${e.time||"--:--"}</td>
      <td>${escapeHtml(e.name||"")}${e.note?`<div class="muted tiny">${escapeHtml(e.note)}</div>`:""}</td>
      <td class="pts ${pts>=0?"pos":"neg"}">${pts>=0?"+":""}${pts}</td>
      <td style="text-align:right;"><button class="btn btn-ghost" data-del="${e.id}" style="padding:8px 10px;">✕</button></td>
    `;
    dayTableBody.appendChild(tr);
  }
  dayTableBody.querySelectorAll("button[data-del]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const id=btn.getAttribute("data-del");
      const evt=state.events.find(x=>x.id===id); if(!evt) return;
      if(!confirm(`Excluir?\n\n${evt.name} | ${evt.points>=0?"+":""}${evt.points}`)) return;
      state.events=state.events.filter(x=>x.id!==id);
      saveState(state); render();
    });
  });
  if(showAll.checked){
    allWrap.classList.remove("hidden");
    allTableBody.innerHTML="";
    const all=[...state.events].sort((a,b)=>(b.ts||"").localeCompare(a.ts||"")).slice(0,200);
    for(const e of all){
      const tr=document.createElement("tr");
      const pts=Number(e.points)||0;
      tr.innerHTML=`
        <td>${e.date||""}</td>
        <td>${e.time||""}</td>
        <td>${escapeHtml(e.name||"")}</td>
        <td class="pts ${pts>=0?"pos":"neg"}">${pts>=0?"+":""}${pts}</td>
      `;
      allTableBody.appendChild(tr);
    }
  }else{
    allWrap.classList.add("hidden");
  }
}
function renderRewards(){
  const total=totalPoints();
  rewardsList.innerHTML="";
  const rewards=[...(state.rewards||[])].sort((a,b)=>(a.cost||0)-(b.cost||0));
  for(const r of rewards){
    const div=document.createElement("div");
    div.className="reward"+(selectedReward===r.name?" selected":"");
    const faltam=(r.cost||0)-total;
    const badge=faltam<=0?`<span class="badge ok">✅ pronto</span>`:`<span class="badge need">faltam ${faltam}</span>`;
    div.innerHTML=`
      <div>
        <div class="reward-name">${escapeHtml(r.name||"")}</div>
        <div class="reward-meta">${badge}</div>
      </div>
      <div class="reward-cost">${r.cost} pts</div>
    `;
    div.addEventListener("click",()=>{selectedReward=r.name; renderRewards();});
    rewardsList.appendChild(div);
  }
}
function render(){renderHeader();renderCalendar();renderButtons();renderHistory();renderRewards();}
render();
