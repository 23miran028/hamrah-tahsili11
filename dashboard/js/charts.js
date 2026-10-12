'use strict';

function canvasSetup(id){
  const c=$(id),ctx=c.getContext('2d'),d=window.devicePixelRatio||1;
  const w=c.clientWidth||280,h=c.clientHeight||200;
  c.width=w*d;c.height=h*d;
  ctx.setTransform(d,0,0,d,0,0);
  ctx.clearRect(0,0,w,h);
  ctx.font='12px '+CHART_FONT;
  return{c,ctx,w,h};
}
function cssColor(name){
  return getComputedStyle(document.documentElement).getPropertyValue(name.replace('var(','').replace(')','')).trim()||'#268fe5';
}
function renderLegend(id,labels,vals,colors){
  $(id).innerHTML=labels.map((l,i)=>`<span><i class="dot" style="background:${colors[i%colors.length]}"></i>${esc(l)}: ${fmt(vals[i])}</span>`).join('');
}
function drawDonut(id,vals,labels,colorList,legendId){
  const{ctx,w,h}=canvasSetup(id),total=vals.reduce((s,v)=>s+v,0),cx=w/2,cy=h/2-3;
  const r=Math.min(66,h*.36,w*.29),inner=r*.66;
  let a=-Math.PI/2;
  if(total){
    vals.forEach((v,i)=>{
      if(!v)return;
      const b=a+v/total*Math.PI*2;
      ctx.beginPath();ctx.arc(cx,cy,r,a,b);ctx.arc(cx,cy,inner,b,a,true);ctx.closePath();
      ctx.fillStyle=colorList[i%colorList.length];ctx.fill();
      a=b;
    });
  }else{
    ctx.strokeStyle=cssColor('var(--line2)');
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
  }
  ctx.textAlign='center';
  ctx.fillStyle=cssColor('var(--text)');
  ctx.font='bold 22px '+CHART_FONT;
  ctx.fillText(fmt(total),cx,cy+3);
  ctx.font='11px '+CHART_FONT;
  ctx.fillStyle=cssColor('var(--muted)');
  ctx.fillText('درس',cx,cy+21);
  renderLegend(legendId,labels,vals,colorList);
}
function drawBars(id,labels,vals,legendId){
  const{ctx,w,h}=canvasSetup(id),max=Math.max(1,...vals);
  const left=Math.min(120,w*.43),right=36,top=10;
  const row=Math.min(31,(h-20)/Math.max(1,labels.length)),bw=w-left-right;
  labels.forEach((label,i)=>{
    const y=top+i*row;
    ctx.textAlign='right';ctx.fillStyle=cssColor('var(--muted)');
    ctx.font='11px '+CHART_FONT;ctx.fillText(label,left-7,y+row*.63);
    ctx.fillStyle=cssColor('var(--panel2)');ctx.fillRect(left,y+4,bw,row-8);
    ctx.fillStyle=cssColor(PALETTE_COLORS[i%PALETTE_COLORS.length]);
    ctx.fillRect(left,y+4,bw*(vals[i]||0)/max,row-8);
    ctx.textAlign='left';ctx.fillStyle=cssColor('var(--text)');
    ctx.fillText(fmt(vals[i]),left+bw+5,y+row*.63);
  });
  renderLegend(legendId,labels,vals,PALETTE_COLORS);
}
function drawCharts(){
  const x=computed();
  drawDonut('statusChart',[x.passed.length,x.remaining.length],['پاس‌شده','باقی‌مانده'],[cssColor('var(--success)'),cssColor('var(--warning)')],'statusLegend');
  const cats=TYPE_NAMES.filter(t=>x.remaining.some(c=>normalizeType(c.type)===t));
  const vals=cats.map(t=>x.remaining.filter(c=>normalizeType(c.type)===t).length);
  drawBars('typeChart',cats,vals,'typeLegend');
  drawDonut('creditChart',[x.passedUnits,x.remainingUnits],['پاس‌شده','باقی‌مانده'],[cssColor('var(--success)'),cssColor('var(--warning)')],'creditLegend');
}
function drawTermLoadChart(){
  const c=$('termLoadChart');if(!c)return;
  const{ctx,w,h}=canvasSetup('termLoadChart');
  const data=dashboardTerms;
  const max=Math.max(1,...data.map(d=>d.units));
  const bw=(w-60)/data.length;
  data.forEach((d,i)=>{
    const x=40+i*bw;
    const bh=(d.units/max)*(h-60);
    const y=h-30-bh;
    const grad=ctx.createLinearGradient(0,y,0,h-30);
    grad.addColorStop(0,cssColor('var(--accent2)'));
    grad.addColorStop(1,cssColor('var(--accent)'));
    ctx.fillStyle=grad;ctx.fillRect(x+6,y,bw-12,bh);
    ctx.fillStyle=cssColor('var(--text)');ctx.font='bold 12px '+CHART_FONT;
    ctx.textAlign='center';ctx.fillText(fmt(d.units),x+bw/2,y-6);
    ctx.fillStyle=cssColor('var(--muted)');ctx.font='10px '+CHART_FONT;
    ctx.fillText(d.term,x+bw/2,h-12);
  });
  ctx.strokeStyle=cssColor('var(--line)');
  ctx.beginPath();ctx.moveTo(30,h-30);ctx.lineTo(w-10,h-30);ctx.stroke();
}
function drawUnitDistChart(){
  const c=$('unitDistChart');if(!c)return;
  const{ctx,w,h}=canvasSetup('unitDistChart');
  const byType={};
  courses.forEach(c=>{
    const t=normalizeType(c.type);
    if(!byType[t])byType[t]={passed:0,remaining:0};
    byType[t][c.status==='پاس شده'?'passed':'remaining']+=n(c.units);
  });
  const types=Object.keys(byType);
  const max=Math.max(1,...types.map(t=>byType[t].passed+byType[t].remaining));
  const barH=26,gap=10;
  types.forEach((t,i)=>{
    const y=20+i*(barH+gap);
    const total=byType[t].passed+byType[t].remaining;
    const wP=(byType[t].passed/max)*(w-140);
    const wR=(byType[t].remaining/max)*(w-140);
    ctx.fillStyle=cssColor('var(--muted)');ctx.font='11px '+CHART_FONT;
    ctx.textAlign='right';ctx.fillText(t,120,y+barH/2+4);
    ctx.fillStyle=cssColor('var(--success)');ctx.fillRect(130,y,wP,barH);
    ctx.fillStyle=cssColor('var(--warning)');ctx.fillRect(130+wP,y,wR,barH);
    ctx.fillStyle=cssColor('var(--text)');ctx.font='bold 11px '+CHART_FONT;
    ctx.textAlign='left';ctx.fillText(fmt(total)+' واحد',135+wP+wR+6,y+barH/2+4);
  });
}
function redrawAllCharts(){drawCharts();drawTermLoadChart();drawUnitDistChart()}