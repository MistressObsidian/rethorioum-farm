(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let catalogue;
  const showMessage = (element, text, error = false) => { element.textContent = text; element.classList.toggle('error-message', error); };
  function showLogin() { $('loginPanel').hidden = false; $('adminPanel').hidden = true; }
  function showAdmin() { $('loginPanel').hidden = true; $('adminPanel').hidden = false; }
  async function api(path, options = {}) {
    let response;
    try { response = await fetch('/api/admin/' + path, { credentials:'same-origin',cache:'no-store',...options,headers:{'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(12000) }); }
    catch { throw new Error('The service could not be reached. Your entries have been kept. Please try again.'); }
    let body; try { body = await response.json(); } catch { throw Error('The service returned an unexpected response. Please try again.'); }
    if (!response.ok) { const error = Error(body.error || 'The change could not be saved.'); error.status = response.status; throw error; } return body;
  }
  async function submitForm(form, status, task) {
    if (!form.reportValidity()) return;
    const button = form.querySelector('button[type="submit"]'); button.disabled = true; showMessage(status,'Saving…');
    try { await task(); showMessage(status,'Saved. Your public website now uses these details.'); }
    catch (error) { showMessage(status,error.message,true); }
    finally { button.disabled = false; }
  }
  function renderCatalogue() {
    const grid = $('adminProducts'); grid.replaceChildren();
    for (const product of catalogue.products) {
      const meta = window.farmData.products.find(item => item.id === product.id); if (!meta) continue;
      const form = document.createElement('form'); form.className = 'admin-product';
      const title = document.createElement('h3'); title.textContent = meta.name;
      const fields = document.createElement('div'); fields.className = 'form-grid';
      const priceLabel = document.createElement('label'); priceLabel.className = 'field'; priceLabel.textContent = 'Price (NGN)';
      const price = document.createElement('input'); price.type='number'; price.min='0.01'; price.max='10000000'; price.step='0.01'; price.placeholder='Leave blank for quote'; price.inputMode='decimal'; price.name='price'; price.value=product.price ?? ''; priceLabel.append(price);
      const unitLabel = document.createElement('label'); unitLabel.className = 'field'; unitLabel.textContent='Price per'; const unit = document.createElement('select'); unit.name='unit';
      for (const [value,label] of [['kg','Kilogram (kg)'],['bag','Bag'],['crate','Crate'],['box','Box']]) { const option = document.createElement('option'); option.value=value; option.textContent=label; unit.append(option); } unit.value=product.unit; unitLabel.append(unit); fields.append(priceLabel,unitLabel);
      const availabilityLabel = document.createElement('label'); availabilityLabel.className='field'; availabilityLabel.textContent='Availability'; const availability=document.createElement('select'); availability.name='availability';
      for(const [value,label] of [['enquiry','Confirm availability'],['available','Available'],['unavailable','Currently unavailable']]) { const option=document.createElement('option');option.value=value;option.textContent=label;availability.append(option); } availability.value=product.availability;availabilityLabel.append(availability);
      const button=document.createElement('button');button.className='button';button.type='submit';button.textContent='Save product';
      const status=document.createElement('p');status.className='status-message';status.setAttribute('role','status');
      form.append(title,fields,availabilityLabel,button,status);
      form.addEventListener('submit',event=>{event.preventDefault();submitForm(form,status,async()=>{const result=await api('products/'+product.id,{method:'PUT',body:JSON.stringify({price:price.value.trim()===''?null:price.value,unit:unit.value,availability:availability.value,version:product.version})});Object.assign(product,result.product);});});
      grid.append(form);
    }
    $('adminDelivery').value=catalogue.delivery.delivery;$('adminCollection').value=catalogue.delivery.collection;$('adminMinimum').value=catalogue.delivery.minimum;
  }
  async function loadCatalogue(){catalogue=await api('catalog');renderCatalogue();showAdmin();}
  $('loginForm').addEventListener('submit',async event=>{
    event.preventDefault();const button=event.currentTarget.querySelector('button');button.disabled=true;showMessage($('loginMessage'),'Signing in…');
    try {await api('login',{method:'POST',body:JSON.stringify({password:$('adminPassword').value})});$('adminPassword').value='';await loadCatalogue();showMessage($('loginMessage'),'');}
    catch(error){showMessage($('loginMessage'),error.message,true);}finally{button.disabled=false;}
  });
  $('deliveryForm').addEventListener('submit',event=>{event.preventDefault();submitForm(event.currentTarget,$('deliveryMessage'),async()=>{const result=await api('delivery',{method:'PUT',body:JSON.stringify({delivery:$('adminDelivery').value,collection:$('adminCollection').value,minimum:$('adminMinimum').value,version:catalogue.delivery.version})});catalogue.delivery=result.delivery;});});
  $('logoutButton').addEventListener('click',async event=>{event.target.disabled=true;try{await api('logout',{method:'POST',body:'{}'});catalogue=undefined;$('adminProducts').replaceChildren();showLogin();showMessage($('loginMessage'),'You have signed out.');}catch(error){if(error.status===401){showLogin();showMessage($('loginMessage'),'Your session has ended.');}else showMessage($('adminMessage'),error.message,true);}finally{event.target.disabled=false;}});
  api('session').then(loadCatalogue).catch(error=>{showLogin();if(error.status!==401)showMessage($('loginMessage'),error.message,true);});
})();
