(function(){
function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn,{once:true});else fn();}
function q(s){return document.querySelector(s)}
function enhance(){
  const ordersCard=q('#orders-tab-pedidos>article.card.top-space');
  if(ordersCard&&!ordersCard.dataset.cpEnhanced){
    ordersCard.dataset.cpEnhanced='1';
    const p=ordersCard.querySelector('.card-heading-row p');
    if(p)p.textContent='Se muestran hasta 10 pedidos en pantalla. Desplázate dentro del recuadro para consultar el historial completo.';
  }
  const rep=q('#orders-tab-reprocesos .reprocess-card');
  if(rep&&!rep.dataset.cpEnhanced){
    rep.dataset.cpEnhanced='1';
    const h=rep.querySelector('h3'); if(h)h.textContent='Crear o actualizar reproceso del pedido';
    const red=rep.querySelector('.red-note'); if(red)red.textContent='Cada pedido tendrá un único reproceso asociado. Las no conformidades nuevas se acumularán en ese mismo reproceso.';
  }
  const repList=q('#orders-tab-reprocesos article.card:not(.reprocess-card)');
  if(repList&&!repList.dataset.cpEnhanced){
    repList.dataset.cpEnhanced='1';
    const h=repList.querySelector('h3');if(h)h.textContent='Reprocesos registrados';
    const note=document.createElement('p');note.className='cp-section-note';note.textContent='Historial compacto con desplazamiento interno.';
    h&&h.insertAdjacentElement('afterend',note);
  }
}
ready(()=>{enhance();const mo=new MutationObserver(enhance);mo.observe(document.body,{childList:true,subtree:true});});
})();