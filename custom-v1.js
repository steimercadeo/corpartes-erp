(function(){
function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn,{once:true});else fn();}
function q(s){return document.querySelector(s)}
function qa(s,root){return Array.from((root||document).querySelectorAll(s))}
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
  enhanceReprocessVisuals();
  enhanceLibraryAccordion();
}
function enhanceReprocessVisuals(){
  const box=q('#reprocessProcessChecks');
  if(!box)return;
  const field=box.closest('.field');
  if(field)field.classList.add('cp-reprocess-process-box');
  if(field){
    const topLabel=Array.from(field.children).find(el=>el.tagName==='LABEL');
    if(topLabel)topLabel.textContent='Selecciona las etapas del reproceso';
    const helper=field.querySelector(':scope > small');
    if(helper){
      helper.textContent='Marca una o varias etapas. El sistema calculará una sola vez el valor del reproceso por pieza, aunque repita varios procesos.';
      helper.classList.add('cp-section-note');
    }
  }
  qa('label',box).forEach(label=>{
    const input=label.querySelector('input[type="checkbox"]');
    const chip=label.querySelector('.chip');
    if(chip && !chip.dataset.cpWrapped){
      chip.dataset.cpWrapped='1';
      chip.innerHTML='<span>'+chip.textContent.trim()+'</span>';
    }
    if(input && !input.dataset.cpBound){
      input.dataset.cpBound='1';
      input.addEventListener('change',()=>updateReprocessProcessState(box));
    }
  });
  updateReprocessProcessState(box);
}
function updateReprocessProcessState(box){
  qa('label',box).forEach(label=>{
    const input=label.querySelector('input[type="checkbox"]');
    label.classList.toggle('cp-active',!!(input&&input.checked));
  });
}
function enhanceLibraryAccordion(){
  const body=q('#v801ProductsBody');
  if(!body)return;
  const card=body.closest('article.card');
  if(card && !card.querySelector('.cp-library-guide')){
    const filters=card.querySelector('.v801-filters');
    const guide=document.createElement('div');
    guide.className='cp-library-guide';
    guide.innerHTML='<strong>Vista resumida por producto</strong>Primero verás únicamente los encabezados azules. Haz clic en uno para desplegar sus ítems y revisar la información detallada.';
    if(filters)filters.insertAdjacentElement('afterend',guide);
  }
  qa('.v801-product-group',body).forEach(group=>{
    const header=group.querySelector('.v801-product-group-header');
    const grid=group.querySelector('.v801-product-card-grid');
    if(!header||!grid)return;
    if(!group.dataset.cpAccordion){
      group.dataset.cpAccordion='1';
      header.setAttribute('role','button');
      header.setAttribute('tabindex','0');
      let chev=header.querySelector('.cp-library-chevron');
      if(!chev){
        chev=document.createElement('span');
        chev.className='cp-library-chevron';
        chev.setAttribute('aria-hidden','true');
        chev.textContent='▾';
        header.appendChild(chev);
      }
      header.addEventListener('click',evt=>{
        if(evt.target.closest('input,button,.v801-group-order-controls'))return;
        toggleLibraryGroup(group);
      });
      header.addEventListener('keydown',evt=>{
        if((evt.key==='Enter'||evt.key===' ')&&!evt.target.closest('input,button')){
          evt.preventDefault();
          toggleLibraryGroup(group);
        }
      });
    }
    setLibraryGroupState(group,group.classList.contains('cp-open'));
  });
}
function toggleLibraryGroup(target){
  const body=q('#v801ProductsBody');
  if(!body)return;
  const shouldOpen=!target.classList.contains('cp-open');
  qa('.v801-product-group',body).forEach(group=>setLibraryGroupState(group,false));
  if(shouldOpen)setLibraryGroupState(target,true);
}
function setLibraryGroupState(group,isOpen){
  const header=group.querySelector('.v801-product-group-header');
  const grid=group.querySelector('.v801-product-card-grid');
  if(!header||!grid)return;
  group.classList.toggle('cp-open',!!isOpen);
  header.setAttribute('aria-expanded',isOpen?'true':'false');
  grid.style.display=isOpen?'grid':'none';
}
ready(()=>{enhance();const mo=new MutationObserver(enhance);mo.observe(document.body,{childList:true,subtree:true});});
})();