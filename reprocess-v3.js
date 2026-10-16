(function(){
function beautify(){
 const checks=document.getElementById('reprocessProcessChecks'); if(!checks)return;
 const field=checks.closest('.field')||checks.parentElement;
 if(field){
  field.classList.add('cp-reprocess-stage-box');
  const lab=[...field.children].find(x=>x.tagName==='LABEL');
  if(lab){lab.textContent='Etapas del reproceso';lab.classList.add('cp-reprocess-stage-title');}
  const small=[...field.children].find(x=>x.tagName==='SMALL');
  if(small){small.textContent='Selecciona una o varias etapas que necesita repetir esta pieza. El valor del reproceso se calcula una sola vez por pieza.';small.classList.add('cp-reprocess-stage-help');}
 }
 checks.querySelectorAll('label').forEach(card=>{
  const input=card.querySelector('input[type="checkbox"]'); if(!input)return;
  const sync=()=>card.classList.toggle('cp-selected',input.checked);
  sync();
  if(!input.dataset.cpPrettyBound){input.dataset.cpPrettyBound='1';input.addEventListener('change',sync);}
 });
}
function run(){beautify();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});
})();