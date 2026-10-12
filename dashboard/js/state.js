'use strict';
const KEY='choiceUnitDashboard.v2', UIKEY='choiceUnitDashboard.ui.v2';

let state = loadState();
let courses = state.courses;
let plan = state.plan;
let termSummary = state.termSummary;
let dashboardTerms = state.dashboardTerms;
let originalSummary = state.sourceSummary;
let sortKey='sourceRow', sortDir=1;
let filters={query:'',status:'',type:'',term:'',ready:''};
let lastDeleted=null;
let cmdkIndex=0, cmdkItems=[];
let gpaRows = [];
let plannerOutput = null;

function loadState(){
  try{
    const v=JSON.parse(localStorage.getItem(KEY)||'null');
    if(v&&Array.isArray(v.courses)){
      const merged = {...clone(SOURCE),...v,courses:v.courses};
      return merged;
    }
  }catch(e){}
  return clone(SOURCE);
}
function persist(){
  try{
    localStorage.setItem(KEY,JSON.stringify({
      courses,plan,termSummary,dashboardTerms,
      sourceSummary:originalSummary,
      gpaRows                                // ← جدید
    }));
  }catch(e){toast('ذخیره ممکن نشد','error')}
}

function computed(){
  const total=courses.length;
  const passed=courses.filter(c=>c.status==='پاس شده');
  const remaining=courses.filter(c=>c.status!=='پاس شده');
  const totalUnits=courses.reduce((s,c)=>s+n(c.units),0);
  const passedUnits=passed.reduce((s,c)=>s+n(c.units),0);
  const remainingUnits=remaining.reduce((s,c)=>s+n(c.units),0);
  const special=remaining.filter(c=>normalizeType(c.type)==='تخصصی');
  const grades=courses.filter(c=>c.grade!=null&&c.grade!=='');
  const avgGrade=grades.length?grades.reduce((s,c)=>s+n(c.grade),0)/grades.length:null;
  return {total,passed,remaining,totalUnits,passedUnits,remainingUnits,progress:totalUnits?passedUnits/totalUnits*100:0,special,specialUnits:special.reduce((s,c)=>s+n(c.units),0),grades:grades.length,avgGrade};
}