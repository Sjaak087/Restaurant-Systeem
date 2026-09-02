// ==================== Persoonlijke berichten ====================
(function () {
  const userId = window.BESTELSYSTEEM_USER_ID;
  if (!userId || typeof db === 'undefined') return;

  let ALL_USERS = {};
  let INBOX = {};
  let selectedRecipient = null;
  let selectedMessageId = null;

  const esc = s => { const d=document.createElement('div'); d.textContent=s==null?'':String(s); return d.innerHTML; };
  const fmt = ts => ts ? new Date(ts).toLocaleString('nl-NL',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '';
  const badgeText = n => n > 9 ? '9+' : String(n);

  const list = document.getElementById('user-messages-list');
  const empty = document.getElementById('user-messages-empty');
  const msgBadge = document.getElementById('messages-tab-badge');
  const warningBadge = document.getElementById('warnings-tab-badge');
  const announcementBadge = document.getElementById('announcement-badge');

  function unreadCount(){ return Object.values(INBOX).filter(m=>m && m.read !== true).length; }
  function updateCounts(){
    const n=unreadCount();
    if(msgBadge){ msgBadge.textContent=badgeText(n); msgBadge.style.display=n?'inline-flex':'none'; }
    // De bel toont alle nieuwe announcements + nieuwe berichten.
    const announcements = typeof getGelezenAankondigingen === 'function' && typeof ALL_ANNOUNCEMENTS !== 'undefined'
      ? Object.keys(ALL_ANNOUNCEMENTS||{}).filter(id=>!getGelezenAankondigingen().includes(id)).length : 0;
    const total=announcements+n;
    if(announcementBadge){ announcementBadge.textContent=badgeText(total); announcementBadge.style.display=total?'flex':'none'; }
    if(warningBadge){
      const warnings=Object.values(INBOX).filter(()=>false).length; // waarschuwingen hebben hun eigen geschiedenis; badge hieronder wordt door announcements.js gezet
    }
  }

  function render(){
    if(!list) return;
    const entries=Object.entries(INBOX).filter(([,m])=>m).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0));
    list.innerHTML='';
    if(!entries.length){ if(empty) empty.style.display='block'; updateCounts(); return; }
    if(empty) empty.style.display='none';
    entries.forEach(([id,m])=>{
      const item=document.createElement('div'); item.className='announcement-item user-message-item'+(m.read===true?'':' unread');
      item.innerHTML=`<div class="announcement-item-head"><span class="announcement-item-title">✉️ ${esc(m.title||'Zonder titel')}</span><span class="announcement-item-date">${esc(fmt(m.createdAt))}</span></div><div class="announcement-item-info">Van: ${esc(m.fromUsername||'Onbekend')}</div>`;
      item.addEventListener('click',()=>openMessage(id,m));
      list.appendChild(item);
    });
    updateCounts();
  }

  async function openMessage(id,m){
    selectedMessageId=id;
    document.getElementById('read-user-message-title').textContent=m.title||'Zonder titel';
    document.getElementById('read-user-message-meta').textContent=`Van ${m.fromUsername||'Onbekend'} · ${fmt(m.createdAt)}`;
    document.getElementById('read-user-message-body').textContent=m.text||'';
    openModal('modal-read-user-message');
    if(m.read!==true){
      try{ await db.ref('users/'+userId+'/messages/'+id+'/read').set(true); }catch(e){ console.warn('Bericht als gelezen markeren mislukt',e); }
    }
  }

  document.getElementById('delete-user-message')?.addEventListener('click',async()=>{
    if(!selectedMessageId) return;
    try{
      await db.ref('users/'+userId+'/messages/'+selectedMessageId).remove();
      // Ook de centrale kopie proberen te verwijderen; de inbox is leidend.
      try{ await db.ref('messages/'+selectedMessageId).remove(); }catch(e){}
      closeModal('modal-read-user-message'); selectedMessageId=null;
    }catch(e){ console.error(e); alert('Bericht verwijderen is niet gelukt.'); }
  });

  // Users zoeken: alle usernames die gedeeltelijk overeenkomen verschijnen.
  function renderUserResults(q){
    const el=document.getElementById('message-recipient-results'); if(!el) return;
    el.innerHTML='';
    const needle=q.trim().toLowerCase();
    if(!needle) return;
    Object.entries(ALL_USERS).filter(([id,u])=>u && u.username && u.username.toLowerCase().includes(needle))
      .sort((a,b)=>a[1].username.localeCompare(b[1].username,'nl'))
      .slice(0,10).forEach(([id,u])=>{
        const row=document.createElement('button'); row.type='button'; row.className='user-search-result'; row.textContent=u.username;
        row.addEventListener('click',()=>{ selectedRecipient={id,username:u.username}; document.getElementById('message-recipient-selected').textContent='Naar: '+u.username; document.getElementById('message-recipient-selected').style.display='block'; document.getElementById('message-recipient-search').value=u.username; el.innerHTML=''; });
        el.appendChild(row);
      });
  }
  document.getElementById('message-recipient-search')?.addEventListener('input',e=>renderUserResults(e.target.value));

  document.getElementById('btn-new-user-message')?.addEventListener('click',()=>{
    selectedRecipient=null;
    document.getElementById('message-recipient-search').value='';
    document.getElementById('message-recipient-results').innerHTML='';
    document.getElementById('message-recipient-selected').style.display='none';
    document.getElementById('message-title-input').value='';
    document.getElementById('message-body-input').value='';
    document.getElementById('message-compose-error').textContent='';
    openModal('modal-new-user-message');
    setTimeout(()=>document.getElementById('message-recipient-search')?.focus(),50);
  });

  document.getElementById('send-user-message')?.addEventListener('click',async()=>{
    const err=document.getElementById('message-compose-error');
    const title=document.getElementById('message-title-input').value.trim();
    const text=document.getElementById('message-body-input').value.trim();
    if(!selectedRecipient){err.textContent='Kies eerst een username uit de zoekresultaten.';return;}
    if(!title){err.textContent='Vul een titel in.';return;}
    if(!text){err.textContent='Vul een bericht in.';return;}
    const btn=document.getElementById('send-user-message'); btn.disabled=true; err.textContent='';
    const msgId=db.ref('messages').push().key;
    const msg={id:msgId,fromUserId:userId,fromUsername:getUsername(),toUserId:selectedRecipient.id,toUsername:selectedRecipient.username,title,text,createdAt:Date.now(),read:false};
    try{
      // De inbox van de ontvanger is de primaire opslag.
      await db.ref('users/'+selectedRecipient.id+'/messages/'+msgId).set(msg);
      // Centrale kopie voor beheer/diagnostiek; geen sent-folder in de speler.
      try{await db.ref('messages/'+msgId).set(msg);}catch(e){}
      closeModal('modal-new-user-message');
    }catch(e){ console.error(e); err.textContent='Versturen mislukt. Controleer of deze gebruiker nog bestaat en probeer opnieuw.'; }
    finally{btn.disabled=false;}
  });

  db.ref('users').on('value',snap=>{ ALL_USERS=snap.val()||{}; });
  db.ref('users/'+userId+'/messages').on('value',snap=>{ INBOX=snap.val()||{}; render(); });

  // Herbereken de bel zodra announcements.js zijn data wijzigt.
  window.addEventListener('announcementsUpdated', updateCounts);
  setInterval(updateCounts,1500);
})();
