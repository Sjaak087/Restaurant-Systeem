// ==================== Username beheer ====================
(function () {
  const listEl = document.getElementById('admin-user-list');
  const emptyEl = document.getElementById('admin-user-empty-msg');
  const badge = document.getElementById('admin-message-badge');
  let USERS = {};
  let RESTAURANTS = {};
  let selectedUserId = null;

  function esc(s) { const d=document.createElement('div'); d.textContent=s==null?'':String(s); return d.innerHTML; }
  function fmt(ts) { return ts ? new Date(Number(ts)).toLocaleString('nl-NL',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'; }
  function userRestaurants(uid, uname) {
    const out=[];
    Object.entries(RESTAURANTS).forEach(([rid,r]) => {
      Object.entries(r.leden||{}).forEach(([mid,lid]) => {
        if ((lid.userId && lid.userId === uid) || (!lid.userId && uname && lid.naam === uname)) {
          if (!out.some(x=>x.id===rid)) out.push({id:rid, naam:r.naam||'Restaurant'});
        }
      });
    });
    return out;
  }
  function render() {
    if (!listEl) return;
    const entries=Object.entries(USERS).sort((a,b)=>(a[1].username||'').localeCompare(b[1].username||'','nl'));
    listEl.innerHTML=''; emptyEl.style.display=entries.length?'none':'block';
    entries.forEach(([uid,u])=>{
      const restaurants=userRestaurants(uid,u.username);
      const locked = !!u.banned || (u.timeoutUntil && Number(u.timeoutUntil)>Date.now());
      const card=document.createElement('div'); card.className='restaurant-card admin-restaurant-card user-admin-card';
      const status = u.online ? '<span class="user-presence online">Online</span>' : '<span class="user-presence offline">Offline</span>';
      const state = u.banned ? '⛔ Verbannen' : (locked ? '⏱ Time out tot '+fmt(u.timeoutUntil) : '✓ Actief');
      card.innerHTML=`<div class="restaurant-card-main"><div class="restaurant-card-name">👤 ${esc(u.username||'Onbekend')}</div><div class="restaurant-card-role">${status}</div><div class="restaurant-card-role">${esc(state)}</div><div class="user-admin-detail"><strong>Restaurants (${restaurants.length})</strong><div class="user-admin-restaurants">${restaurants.length?restaurants.map(r=>`<div class="user-admin-restaurant">${esc(r.naam)}</div>`).join(''):'<span class="restaurant-card-role">Geen restaurants gevonden.</span>'}</div><div class="user-admin-actions"><button type="button" class="mini-btn edit" data-detail>Bekijken</button>${u.banned?'<button type="button" class="mini-btn edit" data-unban>Unbannen</button>':'<button type="button" class="mini-btn danger" data-ban>Verbannen</button>'}${!u.banned?'<button type="button" class="mini-btn edit" data-timeout>Time out</button><button type="button" class="mini-btn edit" data-warning>⚠️ Waarschuwing</button>':''}</div><div class="user-warning-history" data-history></div></div></div>`;
      card.querySelector('[data-detail]').onclick=e=>{e.stopPropagation(); card.querySelector('[data-history]').innerHTML='<div class="restaurant-card-role">Gebruikers-ID: '+esc(uid)+'</div>'+(u.warnings?Object.entries(u.warnings).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0)).map(([id,w])=>`<div class="announcement-item" style="margin-top:8px;"><div class="announcement-item-head"><span class="announcement-item-title">⚠️ Waarschuwing</span><span class="announcement-item-date">${esc(fmt(w.createdAt))}</span></div><div class="announcement-item-info">${esc(window.AutoTranslator && w.textTranslations ? window.AutoTranslator.pickBilingual(w.textTranslations) : w.text)}</div></div>`).join(''):'<div class="restaurant-card-role" style="margin-top:8px;">Geen eerdere waarschuwingen.</div>'); };
      const ban=card.querySelector('[data-ban]'); if(ban) ban.onclick=e=>{e.stopPropagation(); selectedUserId=uid; document.getElementById('admin-user-ban-name').textContent='Voor: '+(u.username||'Onbekend'); document.getElementById('admin-user-ban-input').value=''; document.getElementById('admin-user-ban-error').textContent=''; openModal('modal-admin-user-ban');};
      const unban=card.querySelector('[data-unban]'); if(unban) unban.onclick=e=>{e.stopPropagation(); db.ref('users/'+uid).update({banned:false,timeoutUntil:null});};
      const to=card.querySelector('[data-timeout]'); if(to) to.onclick=e=>{e.stopPropagation(); selectedUserId=uid; document.getElementById('admin-user-timeout-name').textContent='Voor: '+(u.username||'Onbekend'); document.getElementById('admin-user-timeout-input').value=''; document.getElementById('admin-user-timeout-reason-input').value=''; document.getElementById('admin-user-timeout-error').textContent=''; openModal('modal-admin-user-timeout');};
      const warn=card.querySelector('[data-warning]'); if(warn) warn.onclick=e=>{e.stopPropagation(); selectedUserId=uid; document.getElementById('admin-user-warning-name').textContent='Voor: '+(u.username||'Onbekend'); document.getElementById('admin-user-warning-input').value=''; document.getElementById('admin-user-warning-error').textContent=''; openModal('modal-admin-user-warning');};
      listEl.appendChild(card);
    });
  }
  db.ref('users').on('value',snap=>{USERS=snap.val()||{};render();});
  db.ref('restaurants').on('value',snap=>{RESTAURANTS=snap.val()||{};render();});

  document.getElementById('admin-user-timeout-confirm').onclick=async()=>{ const err=document.getElementById('admin-user-timeout-error'); const value=document.getElementById('admin-user-timeout-input').value; const reason=document.getElementById('admin-user-timeout-reason-input').value.trim(); const ts=value?new Date(value).getTime():NaN; if(!selectedUserId||!Number.isFinite(ts)||ts<=Date.now()){err.textContent='Kies een tijdstip in de toekomst.';return;} if(!reason){err.textContent='Vul een reden in.';return;} const b=document.getElementById('admin-user-timeout-confirm');b.disabled=true;try{const sourceLang=window.AutoTranslator?window.AutoTranslator.detectCommunicationLanguage?window.AutoTranslator.detectCommunicationLanguage(reason):(window.AutoTranslator.currentLanguage()):'nl'; const translations=window.AutoTranslator?await window.AutoTranslator.buildBilingual(reason,sourceLang):{nl:reason,en:reason,de:reason,sourceLang}; await db.ref('users/'+selectedUserId).update({timeoutUntil:ts,banned:false,timeoutReason:reason,timeoutReasonTranslations:translations});closeModal('modal-admin-user-timeout');}catch(e){console.error(e);err.textContent='Opslaan mislukt.';}finally{b.disabled=false;}};
  document.getElementById('admin-user-ban-confirm').onclick=async()=>{ const err=document.getElementById('admin-user-ban-error'); const reason=document.getElementById('admin-user-ban-input').value.trim(); if(!selectedUserId||!reason){err.textContent='Vul een reden in.';return;} const b=document.getElementById('admin-user-ban-confirm');b.disabled=true;try{const sourceLang=window.AutoTranslator?window.AutoTranslator.currentLanguage():'nl';const translated=window.AutoTranslator?await window.AutoTranslator.buildBilingual(reason,sourceLang):{nl:reason,en:reason,de:reason,sourceLang};await db.ref('users/'+selectedUserId).update({banned:true,timeoutUntil:null,banReason:reason,banReasonTranslations:translated});closeModal('modal-admin-user-ban');}catch(e){console.error(e);err.textContent='Opslaan mislukt.';}finally{b.disabled=false;}};
  document.getElementById('admin-user-warning-confirm').onclick=async()=>{ const err=document.getElementById('admin-user-warning-error'); const text=document.getElementById('admin-user-warning-input').value.trim(); if(!selectedUserId||!text){err.textContent='Vul een bericht in.';return;} const b=document.getElementById('admin-user-warning-confirm');b.disabled=true;try{const sourceLang=window.AutoTranslator?window.AutoTranslator.currentLanguage():(localStorage.getItem('appLanguage')||'nl');const translated=window.AutoTranslator?await window.AutoTranslator.buildBilingual(text,sourceLang):{nl:text,en:text,sourceLang};await db.ref('users/'+selectedUserId+'/warnings').push().set({text,textTranslations:translated,sourceLang,createdAt:Date.now(),read:false});closeModal('modal-admin-user-warning');}catch(e){console.error(e);err.textContent='Opslaan mislukt.';}finally{b.disabled=false;}};

  const msgList=document.getElementById('admin-user-messages-list'), msgEmpty=document.getElementById('admin-user-messages-empty');
  function renderMessages(data) {
    const entries=Object.entries(data||{}).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0));
    const unread=entries.filter(([,m])=>!m.read).length;
    if(badge){badge.textContent=unread>9?'9+':String(unread);badge.style.display=unread?'inline-flex':'none';}
    msgList.innerHTML=''; msgEmpty.style.display=entries.length?'none':'block';
    entries.forEach(([id,m])=>{
      const item=document.createElement('div'); item.className='user-message-item';
      item.innerHTML=`<div class="user-message-head"><span>👤 ${esc(m.username||'Onbekend')}</span><span>${esc(fmt(m.createdAt))}</span></div><div class="user-message-text">${esc((window.AutoTranslator && m.textTranslations) ? window.AutoTranslator.pickBilingual(m.textTranslations) : m.text)}</div><div class="user-admin-actions"><button class="mini-btn edit" data-read>${m.read?'Gelezen':'Markeer als gelezen'}</button></div>`;
      item.querySelector('[data-read]').onclick=async()=>{
        const writes=[db.ref('userMessages/'+id+'/read').set(true)];
        if(m.userId) writes.push(db.ref('users/'+m.userId+'/ownerMessages/'+id+'/read').set(true));
        await Promise.allSettled(writes);
      };
      msgList.appendChild(item);
    });
  }
  db.ref('userMessages').on('value',snap=>renderMessages(snap.val()||{}));
  // Fallback/bron: berichten die onder de gebruiker zijn opgeslagen.
  db.ref('users').on('value',snap=>{
    const users=snap.val()||{}, merged={};
    Object.values(users).forEach(u=>Object.entries(u.ownerMessages||{}).forEach(([id,m])=>{ merged[id]=m; }));
    db.ref('userMessages').once('value').then(ms=>{ Object.assign(merged,ms.val()||{}); renderMessages(merged); }).catch(()=>renderMessages(merged));
  });
  document.getElementById('btn-admin-messages').onclick=()=>openModal('modal-admin-messages');
})();
