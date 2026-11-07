(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const data = window.farmData;
  const byId = id => document.getElementById(id);
  byId('copyrightYear').textContent = new Date().getFullYear();
  const menuButton = byId('menuToggle'), menu = byId('mainNav');
  const setMenu = open => { menuButton.setAttribute('aria-expanded', String(open)); menu.classList.toggle('is-open', open); };
  menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) setMenu(false); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') { setMenu(false); menuButton.focus(); } });
  matchMedia('(max-width: 820px)').addEventListener('change', () => setMenu(false));
  const icons = {
    leaf: '<path d="M44 12C17 8 10 26 20 38c10 12 32 3 24-26Z"/><path d="m18 49 20-26M27 35l-8-3m14-5 1-8"/>',
    grain: '<path d="M32 54V12m0 31c-13 0-17-7-15-14 12 0 15 6 15 14Zm0-12c13 0 17-7 15-14-12 0-15 6-15 14Zm0-12c-10 0-13-6-11-12 9 0 11 5 11 12Z"/>',
    fruit: '<path d="M32 22c-17-13-30 12-16 27 9 10 12 2 16 2s7 8 16-2c14-15 1-40-16-27Zm0 0c0-10 8-14 15-12-1 8-8 12-15 12Zm0-1-5-10"/>',
    herb: '<path d="M18 53 43 12M25 42C8 43 9 28 25 30m7 0c17 0 18-15 3-13m-5 20c16 2 16 16 1 12M37 22c-9-2-12-13-4-16"/>'
  };
  const availabilityLabel = status => ({available:'Available',unavailable:'Currently unavailable',enquiry:'Confirm availability'}[status] || 'Confirm availability');
  const priceLabel = product => product.price == null ? 'Request price' : new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:2}).format(product.price);
  let products = data.products.map(product => ({...product}));
  const dialog = byId('enquiryDialog'); let selectedProduct, trigger;
  function openEnquiry(product, button) {
    selectedProduct=product; trigger=button; byId('enquiryForm').reset(); byId('enquiryQuantity').value='1'; byId('enquiryUnit').value=product.unit;
    byId('enquiryArea').required=true; byId('enquiryAreaLabel').hidden=false; byId('enquiryTitle').textContent=product.name;
    byId('enquiryNote').textContent=product.availability==='unavailable'?'This category is currently unavailable. Ask about a future harvest or alternatives.':'We will confirm price, availability and fulfilment details before you place an order.';
    byId('enquiryDetails').hidden=false; byId('enquiryReview').hidden=true; dialog.showModal();
  }
  function renderProducts() {
    const grid=byId('productsGrid'); grid.replaceChildren();
    products.forEach((product,index)=>{
      const card=document.createElement('article'); card.className='product-card';
      if(product.image){const photo=document.createElement('img'); photo.className='product-image'; photo.src=product.image; photo.alt=product.alt; photo.loading='lazy'; photo.width=810; photo.height=1080; card.append(photo);}
      else{const art=document.createElement('div'); art.className='product-art'; art.setAttribute('aria-hidden','true'); art.innerHTML='<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(icons[product.icon]||icons.leaf)+'</svg><span>Seasonal enquiries</span>'; card.append(art);}
      const content=document.createElement('div'); content.className='product-content';
      const top=document.createElement('div'); top.className='product-topline';
      const badge=document.createElement('span'); badge.className='availability'+(product.availability==='unavailable'?' unavailable':''); badge.textContent=availabilityLabel(product.availability);
      const number=document.createElement('span'); number.className='product-number'; number.textContent=String(index+1).padStart(2,'0'); top.append(badge,number);
      const title=document.createElement('h3'); title.className='product-heading'; title.textContent=product.name;
      const description=document.createElement('p'); description.textContent=product.description;
      const bottom=document.createElement('div'); bottom.className='product-bottom';
      const price=document.createElement('div'); price.className='price'; price.textContent=priceLabel(product);
      const unit=document.createElement('small'); unit.textContent=product.price==null?'Quote from the farm':'per '+product.unit; price.append(unit);
      const button=document.createElement('button'); button.className='button button-light'; button.type='button'; button.textContent=product.availability==='unavailable'?'Ask about next harvest':'Enquire ↗'; button.dataset.productId=product.id; button.setAttribute('aria-label','Enquire about '+product.name); button.addEventListener('click',()=>openEnquiry(product,button)); bottom.append(price,button);
      content.append(top,title,description,bottom); card.append(content); grid.append(card);
    });
  }
  renderProducts();
  async function loadCatalogue(){try{
    const response=await fetch('/api/catalog',{cache:'no-store',signal:AbortSignal.timeout(8000)}); if(!response.ok)throw Error('Catalogue unavailable'); const latest=await response.json();
    if(!Array.isArray(latest.products)||latest.products.length!==data.products.length)throw Error('Invalid catalogue');
    products=data.products.map(product=>{const saved=latest.products.find(item=>item.id===product.id); if(!saved||!['enquiry','available','unavailable'].includes(saved.availability)||!['kg','bag','crate','box'].includes(saved.unit)||(saved.price!==null&&(!Number.isFinite(saved.price)||saved.price<=0)))throw Error('Invalid product'); return {...product,price:saved.price,unit:saved.unit,availability:saved.availability};});
    renderProducts(); for(const [key,id] of [['delivery','deliveryText'],['collection','collectionText'],['minimum','minimumText']]){if(typeof latest.delivery?.[key]==='string'&&latest.delivery[key].trim())byId(id).textContent=latest.delivery[key];} byId('catalogueStatus').hidden=true;
  }catch{byId('catalogueStatus').textContent='Live catalogue details are temporarily unavailable. Please ask the farm to confirm current prices and availability.';byId('catalogueStatus').hidden=false;}}
  loadCatalogue();
  byId('enquiryClose').addEventListener('click',()=>dialog.close()); dialog.addEventListener('close',()=>{const target=trigger?.isConnected?trigger:document.querySelector('[data-product-id="'+selectedProduct?.id+'"]');target?.focus();});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
  byId('enquiryFulfilment').addEventListener('change',event=>{const delivery=event.target.value==='delivery';byId('enquiryAreaLabel').hidden=!delivery;byId('enquiryArea').required=delivery;});
  byId('enquiryForm').addEventListener('submit',event=>{
    event.preventDefault();if(!event.currentTarget.reportValidity())return;const quantity=Number(byId('enquiryQuantity').value);if(!Number.isInteger(quantity)||quantity<1||quantity>100000)return;
    const unit=byId('enquiryUnit').value,collection=byId('enquiryFulfilment').value==='collection',area=byId('enquiryArea').value.trim();
    if(!collection&&!area){byId('enquiryArea').setCustomValidity('Please enter your town or area.');byId('enquiryArea').reportValidity();return;}
    const message=['Hello Rethorium Farm, I would like to make an enquiry.','','Produce: '+selectedProduct.name,'Requested quantity: '+quantity+' '+unit+(quantity!==1&&unit!=='kg'?'s':''),collection?'Preference: Collection — please confirm the pickup location and time.':'Preference: Delivery to '+area,'','Please confirm availability, the current price, minimum quantity and any delivery or collection details.'].join('\n');
    byId('enquirySummary').textContent=message;byId('enquiryWhatsApp').href='https://wa.me/'+data.phone+'?text='+encodeURIComponent(message);byId('enquiryDetails').hidden=true;byId('enquiryReview').hidden=false;byId('enquiryWhatsApp').focus();
  });
  byId('enquiryArea').addEventListener('input',event=>event.target.setCustomValidity(''));
  byId('enquiryEdit').addEventListener('click',()=>{byId('enquiryReview').hidden=true;byId('enquiryDetails').hidden=false;byId('enquiryQuantity').focus();});
  const slides=(window.galleryMedia||[]).filter(item=>item.src&&item.caption);if(!slides.length)return;
  const gallery=byId('gallery'),stage=byId('galleryStage');let current=0,timer,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,hovered=false,focused=false;
  function syncPlayback(){clearInterval(timer);const active=playing&&!hovered&&!focused&&!document.hidden&&slides.length>1;if(active)timer=setInterval(()=>showSlide(current+1,false),6000);byId('galleryToggle').textContent=playing?'Pause slideshow':'Resume slideshow';byId('galleryToggle').setAttribute('aria-pressed',String(!playing));byId('galleryCaption').setAttribute('aria-live',active?'off':'polite');}
  function showSlide(index,manual){current=(index+slides.length)%slides.length;const item=slides[current],video=/\.(mp4|webm|ogg)$/i.test(item.src),media=document.createElement(video?'video':'img');media.className='gallery-media';media.src=item.src;if(video){media.controls=true;media.preload='metadata';media.addEventListener('play',()=>{playing=false;syncPlayback();});}else{media.alt=item.caption;media.width=810;media.height=1080;}stage.replaceChildren(media);byId('galleryCaption').textContent=item.caption;byId('galleryCount').textContent=String(current+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0');if(manual)syncPlayback();}
  byId('galleryControls').hidden=slides.length<2;byId('galleryPrev').addEventListener('click',()=>showSlide(current-1,true));byId('galleryNext').addEventListener('click',()=>showSlide(current+1,true));byId('galleryToggle').addEventListener('click',()=>{playing=!playing;syncPlayback();});
  gallery.addEventListener('mouseenter',()=>{hovered=true;syncPlayback();});gallery.addEventListener('mouseleave',()=>{hovered=false;syncPlayback();});gallery.addEventListener('focusin',()=>{focused=true;syncPlayback();});gallery.addEventListener('focusout',()=>setTimeout(()=>{focused=gallery.contains(document.activeElement);syncPlayback();},0));
  gallery.addEventListener('keydown',event=>{if(event.target.closest('.gallery-controls')&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();showSlide(current+(event.key==='ArrowRight'?1:-1),true);}});
  document.addEventListener('visibilitychange',syncPlayback);matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',event=>{if(event.matches)playing=false;syncPlayback();});showSlide(0,false);syncPlayback();
})();
