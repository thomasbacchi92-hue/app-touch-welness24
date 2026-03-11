/* System.js - Core Logic SPA v17.5 - CRM FRONTEND & COLORI GRIGLIA */

const fbConfig = {
    apiKey: "AIzaSyCrDuK7SWHdbzrJR-pNpxmRwGnZgV2Dd2Y",
    authDomain: "touch-welness-massage.firebaseapp.com",
    databaseURL: "https://touch-welness-massage-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "touch-welness-massage",
    storageBucket: "touch-welness-massage.firebasestorage.app"
};

if (!firebase.apps.length) firebase.initializeApp(fbConfig);

window.twStructId = localStorage.getItem("tw_structure_id");
let db = { app: {}, requests: {}, settings: {}, staff: [], servizi: [] };
let globalCustomers = [];
let tempSelectedServiceId = null;
window.currentOpenedCustomerId = null;

if (window.twStructId) {
    const dbRefLocal = firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.twStructId);
    dbRefLocal.on('value', snap => {
        const val = snap.val() || {};
        db.app = val.app || {}; db.requests = val.requests || {}; db.settings = val.settings || {};
        db.staff = Array.isArray(val.staff) ? val.staff : Object.values(val.staff || {});
        let rawServ = val.servizi;
        if(Array.isArray(rawServ)) db.servizi = rawServ;
        else if(rawServ && typeof rawServ === 'object') db.servizi = Object.values(rawServ);
        else db.servizi = [];
        if(typeof window.render === 'function') window.render();
    });
    firebase.database().ref('MASTER_ADMIN_DB/global_customers').on('value', snap => { globalCustomers = Object.values(snap.val() || {}); });
}

window.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById("mainDate")) {
        const d = new Date(); document.getElementById("mainDate").value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        if(typeof window.render === 'function') window.render(); 
    }
});

window.sysChangeDate = function(offset) {
    const picker = document.getElementById("mainDate");
    if(picker && picker.value) { const d = new Date(picker.value); d.setDate(d.getDate() + offset); picker.value = d.toISOString().split('T')[0]; window.render(); }
}

window.showToast = function(msg) { const x = document.getElementById("toastBlue"); if(x) { document.getElementById("toastMsg").innerText = msg; x.className = "show"; setTimeout(() => x.className = x.className.replace("show", ""), 3000); } }

window.closeSidebar = function(e, force = false) { 
    if(force || !e || (!e.target.closest('.sidebar') && !e.target.closest('.slot') && !e.target.closest('.modal-box') && !e.target.closest('.btn-quick-eseg'))) {
        const sf = document.getElementById('sideForm'); if(sf) { sf.classList.remove('active'); sf.classList.remove('request-mode'); }
    }
}

/* CRM AUTOCOMPLETE */
window.sysCheckCustomerInput = function() {
    const val = document.getElementById('aCog').value.toLowerCase().trim(); const suggBox = document.getElementById('cogSuggestions');
    if(val.length >= 3) {
        const matches = globalCustomers.filter(c => c.nome && c.nome.toLowerCase().includes(val));
        if(matches.length > 0) {
            suggBox.innerHTML = matches.map(c => `<div style="padding:10px; border-bottom:1px solid var(--border-line); cursor:pointer;" onclick="sysSelectCustomer('${c.nome.replace(/'/g, "\\'")}', '${c.tel||''}', '${c.dataNascita||''}')"><b>${c.nome}</b><br><span style="font-size:11px; color:var(--text-muted)">${c.tel ? c.tel : 'N.D.'}</span></div>`).join('');
            suggBox.style.display = 'block';
        } else suggBox.style.display = 'none';
    } else suggBox.style.display = 'none';
}
window.sysSelectCustomer = function(nome, tel, dob) { 
    document.getElementById('aCog').value = nome; document.getElementById('aTel').value = tel; 
    if(document.getElementById('aDataNascita')) document.getElementById('aDataNascita').value = dob;
    document.getElementById('cogSuggestions').style.display = 'none'; 
}
document.addEventListener('click', e => { if(e.target.id !== 'aCog' && document.getElementById('cogSuggestions')) document.getElementById('cogSuggestions').style.display = 'none'; });

/* SCHEDA PROFILO CLIENTE (RECEPTION) */
window.sysOpenCustomerProfile = function(e, name) {
    e.stopPropagation();
    if(!name) return;
    let custId = null; let custData = { tel: 'N.D.', dataNascita: 'N.D.', note: '' };

    firebase.database().ref('MASTER_ADMIN_DB/global_customers').once('value').then(snap => {
        const allC = snap.val() || {};
        for(let k in allC) { if(allC[k].nome && allC[k].nome.toLowerCase() === name.toLowerCase()) { custId = k; custData = allC[k]; break; } }
        
        document.getElementById('cp_nome').innerText = name.toUpperCase();
        document.getElementById('cp_tel').innerText = custData.tel || 'N.D.';
        document.getElementById('cp_dob').innerText = custData.dataNascita ? custData.dataNascita.split('-').reverse().join('/') : 'N.D.';
        document.getElementById('cp_note').value = custData.note || '';

        let history = []; let totalSpent = 0;
        for(let d in db.app) {
            db.app[d].forEach(a => {
                if(a && a.cog && a.cog.toLowerCase() === name.toLowerCase()) {
                    let price = parseFloat(a.price) || parseFloat(a.prezzo) || 0;
                    if(price === 0 && a.serv) { const srv = db.servizi.find(s => a.serv.includes(s.nome)); if(srv && srv.prezzo) price = parseFloat(srv.prezzo); }
                    if(a.pagato) totalSpent += price;
                    history.push({ date: d, serv: a.serv||'-', op: a.op||'-', price: price, pagato: a.pagato });
                }
            });
        }
        document.getElementById('cp_spent').innerText = totalSpent.toFixed(2) + ' €';
        history.sort((a,b) => b.date.localeCompare(a.date));
        const hBody = document.getElementById('cp_history');
        hBody.innerHTML = history.map(h => `<tr><td>${h.date.split('-').reverse().join('/')}</td><td>${h.serv}</td><td>${h.op}</td><td><b>${h.price.toFixed(2)}€</b> <br><span style="font-size:10px; font-weight:bold; color:${h.pagato?'var(--green)':'var(--red)'}">${h.pagato?'PAGATO':'DA PAGARE'}</span></td></tr>`).join('');
        if(history.length===0) hBody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:var(--text-muted)'>Nessun trattamento registrato.</td></tr>";

        window.currentOpenedCustomerId = custId;
        document.getElementById('customerProfileModal').style.display = 'flex';
    });
};

window.sysSaveCustomerNote = function() {
    const note = document.getElementById('cp_note').value;
    if(window.currentOpenedCustomerId) {
        firebase.database().ref('MASTER_ADMIN_DB/global_customers/' + window.currentOpenedCustomerId).update({ note: note });
        showToast("Nota aggiornata nel CRM!");
    }
};

/* LOGICA UI SERVIZI */
window.sysRenderServiceBox = function() {
    const area = document.getElementById('serviceRenderArea'); const sName = document.getElementById('aServ').value;
    if(sName) { area.innerHTML = `<div style="background:rgba(56, 189, 248, 0.1); border:1px solid rgba(56, 189, 248, 0.3); border-radius:8px; padding:12px; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;"><div class="info"><b style="color:var(--accent); display:block; font-size:13px;">${sName}</b><span style="color:var(--text-muted); font-size:10px;">${document.getElementById('aDur').value} min | ${document.getElementById('aPrice').value} €</span></div><div onclick="sysExecuteRemoveService()" style="color:var(--red); background:rgba(239, 68, 68, 0.2); border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; cursor:pointer;"><i class="material-icons-round" style="font-size:14px;">close</i></div></div>`; } 
    else { area.innerHTML = `<button class="btn-save btn-outline" style="margin-bottom:10px;" onclick="sysOpenServiceSelector()"><i class="material-icons-round" style="color:var(--accent); font-size:18px;">add_circle</i> AGGIUNGI SERVIZIO</button>`; }
}
window.sysFilterServices = function() { const val = document.getElementById('searchServiceInput').value.toLowerCase(); document.querySelectorAll('.serv-item').forEach(el => { const name = el.getAttribute('data-name') || ''; el.style.display = name.includes(val) ? 'flex' : 'none'; }); }
window.sysOpenServiceSelector = function() {
    const listUI = document.getElementById('serviziUIList'); listUI.innerHTML = ""; document.getElementById('searchServiceInput').value = ""; 
    let servList = db.servizi || []; servList = servList.filter(s => s && s.nome);
    if(servList.length === 0) { listUI.innerHTML = "<div style='text-align:center; padding:20px; color:var(--text-muted); font-size:12px'>Nessun servizio in Listino.</div>"; } 
    else {
        servList.forEach((s, index) => {
            const sId = s.id || ('SV_TEMP_' + index); s.id = sId;
            const div = document.createElement('div'); div.className = 'serv-item'; div.id = 'srvUI_' + sId; div.setAttribute('data-name', s.nome.toLowerCase());
            div.style.cssText = "background:var(--bg-body); border:1px solid var(--border-line); border-radius:8px; padding:12px; display:flex; align-items:center; gap:10px; cursor:pointer; color:var(--text-main);";
            div.innerHTML = `<i class="material-icons-round" style="color:var(--text-muted); font-size:18px;">spa</i><div><b>${s.nome}</b> <span style="color:var(--accent); margin-left:10px;">${s.durata||30}m - ${s.prezzo||0}€</span></div>`;
            div.onclick = function() { document.querySelectorAll('.serv-item').forEach(x => {x.style.borderColor='var(--border-line)'; x.style.background='var(--bg-body)'}); div.style.borderColor='var(--green)'; div.style.background='rgba(16,185,129,0.1)'; tempSelectedServiceId = { nome: s.nome, dur: s.durata, price: s.prezzo }; };
            listUI.appendChild(div);
        });
    }
    tempSelectedServiceId = null; document.getElementById('serviceSelectModal').style.display = 'flex';
}
window.sysConfirmServiceSelection = function() { if(tempSelectedServiceId) { document.getElementById('aServ').value = tempSelectedServiceId.nome; document.getElementById('aDur').value = tempSelectedServiceId.dur; document.getElementById('aPrice').value = tempSelectedServiceId.price; sysRenderServiceBox(); document.getElementById('serviceSelectModal').style.display = 'none'; } else { showToast("Seleziona un trattamento."); } }
window.sysExecuteRemoveService = function() { document.getElementById('aServ').value = ""; document.getElementById('aDur').value = "30"; document.getElementById('aPrice').value = "0"; sysRenderServiceBox(); }

/* APPUNTAMENTI DND */
window.sysApplyZoom = function() { const z = document.getElementById('gridZoom').value; const grid = document.getElementById('mainGrid'); if(grid) { grid.style.zoom = z / 100; } }
window.sysSetZoom = function(step) { const slider = document.getElementById('gridZoom'); if(!slider) return; let z = parseInt(slider.value) + step; if(z < 50) z = 50; if(z > 150) z = 150; slider.value = z; sysApplyZoom(); }
window.sysDragStart = function(e, appId) { e.dataTransfer.setData("text/plain", appId); e.target.classList.add('dragging'); }
window.sysAllowDrop = function(e) { e.preventDefault(); if(e.target.classList.contains('slot') && !e.target.querySelector('.app-busy')) { e.target.classList.add('drag-over'); } }
window.sysDragLeave = function(e) { e.target.classList.remove('drag-over'); }
window.sysDrop = function(e) { e.preventDefault(); e.target.classList.remove('drag-over'); const appId = e.dataTransfer.getData("text/plain"); const dropZone = e.target.closest('.slot'); if(!dropZone || dropZone.querySelector('.app-busy')) return; sysMoveAppointment(appId, dropZone.getAttribute('data-ora'), dropZone.getAttribute('data-cab')); }
window.sysMoveAppointment = function(appId, newOra, newCab) {
    const d = document.getElementById("mainDate").value; if(!d || !window.twStructId) return;
    firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.twStructId + '/app/' + d).once('value').then(snap => {
        let apps = snap.val() || []; if(!Array.isArray(apps)) apps = Object.values(apps); const idx = apps.findIndex(x => x && x.id === appId);
        if(idx > -1) {
            const startMin = tToM(newOra); const appDur = parseInt(apps[idx].dur) || 30; const endMin = startMin + appDur;
            let collision = apps.some(a => { if(!a || a.id === appId || parseInt(a.cab) !== parseInt(newCab)) return false; const aStart = tToM(a.ora); const aEnd = aStart + (parseInt(a.dur) || 30); return (startMin < aEnd && endMin > aStart); });
            if(collision) { showToast("Orario Occupato!"); window.render(); return; }
            apps[idx].ora = newOra; apps[idx].cab = newCab;
            firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.twStructId + '/app/' + d).set(apps).then(() => { showToast("Spostato!"); });
        }
    });
}

/* GESTIONE SIDEBAR FORM */
window.sysEnableTimePick = function(e) { e.preventDefault(); showToast("Clicca su uno spazio vuoto nell'agenda per cambiare orario."); }
window.sysOpenSlot = function(ora, cab) {
    if (document.getElementById('sideForm').classList.contains('active')) { document.getElementById("aOra").value = ora; document.getElementById("aCab").value = cab; showToast(`Orario: ${ora}`); return; }
    document.getElementById('sideForm').classList.remove('request-mode'); document.getElementById("sidebarTitle").innerText = "Nuovo Appuntamento"; document.getElementById("sidebarTitle").style.color = "var(--gold)";
    document.getElementById("mId").value = ""; document.getElementById("mReqId").value = ""; 
    const cd = document.getElementById("mainDate").value; document.getElementById("aDate").value = cd; document.getElementById("mOldDate").value = cd; 
    document.getElementById("aOra").value = ora; document.getElementById("aCab").value = cab;
    ['aCam', 'aCog', 'aTel', 'aDataNascita', 'aOp', 'aNote', 'aServ'].forEach(id => { const el=document.getElementById(id); if(el) el.value = ""; });
    document.getElementById("aDur").value = "30"; document.getElementById("aPrice").value = "0";
    document.getElementById("eseguitoSwitchBox").style.display = "flex"; if(document.getElementById("aEseguito")) document.getElementById("aEseguito").checked = false;
    const uiLink = document.getElementById("uiPrivacyLink"); if(uiLink) uiLink.style.display = "none";
    sysRenderServiceBox(); 
    document.getElementById("btnSaveAppStandard").style.display = "flex"; document.getElementById("editActionButtons").style.display = "none"; document.getElementById("reqActionButtons").style.display = "none";
    document.getElementById('sideForm').classList.add('active');
}

window.sysOpenEdit = function(id) {
    if(window.justDragged) return; 
    const d = document.getElementById("mainDate").value; let apps = Array.isArray(db.app[d]) ? db.app[d] : Object.values(db.app[d]||{});
    const app = apps.find(x => x && x.id === id); if(!app) return;
    document.getElementById('sideForm').classList.remove('request-mode'); document.getElementById("sidebarTitle").innerText = "Modifica Prenotazione"; document.getElementById("sidebarTitle").style.color = "var(--gold)";
    document.getElementById("mId").value = app.id; document.getElementById("mReqId").value = ""; 
    document.getElementById("aDate").value = d; document.getElementById("mOldDate").value = d;
    document.getElementById("aOra").value = app.ora; document.getElementById("aCam").value = app.cam || "";
    document.getElementById("aCog").value = app.cog || ""; document.getElementById("aTel").value = app.tel || "";
    if(document.getElementById("aDataNascita")) document.getElementById("aDataNascita").value = app.dataNascita || "";
    document.getElementById("aOp").value = app.op || ""; document.getElementById("aNote").value = app.note || ""; document.getElementById("aCab").value = app.cab;
    document.getElementById("eseguitoSwitchBox").style.display = "flex"; if(document.getElementById("aEseguito")) document.getElementById("aEseguito").checked = app.eseguito === true;
    const uiLink = document.getElementById("uiPrivacyLink");
    if(uiLink) { if(app.driveLink) { uiLink.href = app.driveLink; uiLink.style.display = "flex"; } else { uiLink.style.display = "none"; } }
    if(app.serv) { document.getElementById('aServ').value = app.serv; document.getElementById('aDur').value = app.dur || 30; document.getElementById('aPrice').value = app.price || 0; } else { document.getElementById('aServ').value = ""; }
    sysRenderServiceBox(); 
    document.getElementById("btnSaveAppStandard").style.display = "flex"; document.getElementById("editActionButtons").style.display = "flex"; document.getElementById("reqActionButtons").style.display = "none";
    document.getElementById('sideForm').classList.add('active');
}

window.sysOpenRequestSidebar = function(reqId) {
    const d = document.getElementById("mainDate").value; let reqs = Array.isArray(db.requests[d]) ? db.requests[d] : Object.values(db.requests[d]||{}); const req = reqs.find(x => x && x.id === reqId); if(!req) return;
    document.getElementById('sideForm').classList.add('request-mode'); document.getElementById("sidebarTitle").innerText = "GESTISCI RICHIESTA"; document.getElementById("sidebarTitle").style.color = "var(--purple)";
    document.getElementById("mId").value = ""; document.getElementById("mReqId").value = req.id; document.getElementById("reqConfOldOra").value = req.ora; 
    document.getElementById("aDate").value = d; document.getElementById("mOldDate").value = d; document.getElementById("aOra").value = req.ora; document.getElementById("aCam").value = req.cam || "";
    document.getElementById("aCog").value = req.cog || ""; document.getElementById("aTel").value = req.tel || ""; if(document.getElementById("aDataNascita")) document.getElementById("aDataNascita").value = req.dataNascita || "";
    document.getElementById("aOp").value = ""; document.getElementById("aNote").value = req.note || ""; document.getElementById("aCab").value = req.cab;
    document.getElementById("eseguitoSwitchBox").style.display = "none";
    if(req.serv) { document.getElementById('aServ').value = req.serv; document.getElementById('aDur').value = req.dur || 30; document.getElementById('aPrice').value = req.price || 0; } else { document.getElementById('aServ').value = ""; }
    sysRenderServiceBox(); 
    document.getElementById("btnSaveAppStandard").style.display = "none"; document.getElementById("editActionButtons").style.display = "none"; document.getElementById("reqActionButtons").style.display = "flex";
    document.getElementById('sideForm').classList.add('active');
}

window.sysSaveApp = function() {
    const id = document.getElementById("mId").value; const selDate = document.getElementById("aDate").value; const oldDate = document.getElementById("mOldDate").value; const sName = document.getElementById('aServ').value;
    if(!selDate || !document.getElementById("aCam").value || !sName) return showToast("Compila i campi Camera e Servizio!");
    const nCog = document.getElementById('aCog').value.trim(); const nTel = document.getElementById('aTel').value.trim(); const nDataNascita = document.getElementById('aDataNascita') ? document.getElementById('aDataNascita').value : "";
    if(nCog) { const ex = globalCustomers.find(c => c.nome && c.nome.toLowerCase() === nCog.toLowerCase()); if(!ex) { firebase.database().ref('MASTER_ADMIN_DB/global_customers').push({ nome: nCog, tel: nTel, dataNascita: nDataNascita, created_at: new Date().toISOString() }); } else if(nDataNascita && !ex.dataNascita) { firebase.database().ref('MASTER_ADMIN_DB/global_customers').once('value').then(s=>{ for(let k in s.val()){ if(s.val()[k].nome.toLowerCase()===nCog.toLowerCase()){ firebase.database().ref('MASTER_ADMIN_DB/global_customers/'+k).update({dataNascita: nDataNascita}); break; } } }); } }
    const toggleEseguito = document.getElementById("aEseguito") ? document.getElementById("aEseguito").checked : false;
    const obj = { id: id || "APP"+Date.now(), ora: document.getElementById("aOra").value, cab: document.getElementById("aCab").value, cam: document.getElementById("aCam").value, cog: nCog, tel: nTel, dataNascita: nDataNascita, serv: sName, dur: parseInt(document.getElementById("aDur").value) || 30, price: parseFloat(document.getElementById("aPrice").value) || 0, op: document.getElementById("aOp").value, note: document.getElementById("aNote").value, eseguito: toggleEseguito, pagato: false };
    const dbRefLocal = firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.twStructId);
    if(id && oldDate && oldDate !== selDate) { let oldApps = Array.isArray(db.app[oldDate]) ? db.app[oldDate] : Object.values(db.app[oldDate]||{}); oldApps = oldApps.filter(x => x && x.id !== id); dbRefLocal.child('app').child(oldDate).set(oldApps); }
    let apps = Array.isArray(db.app[selDate]) ? db.app[selDate] : Object.values(db.app[selDate]||{});
    if(id && oldDate === selDate) { const idx = apps.findIndex(x => x && x.id === id); if(idx > -1) { obj.pagato = apps[idx].pagato; obj.fromReception = apps[idx].fromReception; obj.reqId = apps[idx].reqId; if(apps[idx].privacySigned) obj.privacySigned = apps[idx].privacySigned; if(apps[idx].driveLink) obj.driveLink = apps[idx].driveLink; apps[idx] = obj; } else apps.push(obj); } else apps.push(obj); 
    dbRefLocal.child('app').child(selDate).set(apps).then(() => { closeSidebar(null, true); showToast("Agenda Salvata!"); if(selDate !== document.getElementById("mainDate").value) { document.getElementById("mainDate").value = selDate; window.render(); } });
}

window.sysAcceptRequest = function() {
    const reqId = document.getElementById('mReqId').value; const d = document.getElementById("mainDate").value; const confOra = document.getElementById('aOra').value; const oldOra = document.getElementById('reqConfOldOra').value; const sName = document.getElementById('aServ').value;
    if(!document.getElementById("aCam").value || !sName) return showToast("Compila i campi Camera e Servizio!");
    let reqs = Array.isArray(db.requests[d]) ? db.requests[d] : Object.values(db.requests[d]||{}); const req = reqs.find(x => x && x.id === reqId); if(!req) return;
    const nDataNascita = document.getElementById('aDataNascita') ? document.getElementById('aDataNascita').value : "";
    const newApp = { id: "APP" + Date.now(), reqId: reqId, ora: confOra, cab: document.getElementById("aCab").value, cam: document.getElementById("aCam").value, cog: document.getElementById("aCog").value.trim(), tel: document.getElementById("aTel").value.trim(), dataNascita: nDataNascita, serv: sName, dur: parseInt(document.getElementById("aDur").value) || 30, price: parseFloat(document.getElementById("aPrice").value) || 0, op: document.getElementById("aOp").value, note: document.getElementById("aNote").value, eseguito: false, pagato: false, fromReception: true };
    const dbRefLocal = firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.twStructId); let apps = Array.isArray(db.app[d]) ? db.app[d] : Object.values(db.app[d]||{}); apps.push(newApp); req.status = 'accepted';
    const isChanged = confOra !== oldOra; const logMsg = isChanged ? `Orario Modificato: Da ${oldOra} a ${confOra}.` : `Confermato.`;
    Promise.all([ dbRefLocal.child('app').child(d).set(apps), dbRefLocal.child('requests').child(d).set(reqs), dbRefLocal.child('requests_log').child(reqId).update({ type: isChanged ? 'modified-accepted' : 'accepted', ora: confOra, msg: logMsg, date: new Date().toLocaleString('it-IT'), timestamp: Date.now() }) ]).then(() => { closeSidebar(null, true); showToast("Inserito in Agenda!"); });
}

window.sysPromptRejectRequest = function() { document.getElementById('delReasonInput').value = ""; document.getElementById('deleteModal').style.display = 'flex'; setTimeout(() => document.getElementById('delReasonInput').focus(), 100); }
window.sysDelApp = function() { 
    const id = document.getElementById("mId").value; const d = document.getElementById("mainDate").value; let apps = Array.isArray(db.app[d]) ? db.app[d] : Object.values(db.app[d]||{}); const appToDel = apps.find(x => x && x.id === id); 
    if (appToDel && appToDel.fromReception) { document.getElementById('delReasonInput').value = ""; document.getElementById('deleteModal').style.display = 'flex'; setTimeout(() => document.getElementById('delReasonInput').focus(), 100); } 
    else { if(confirm("Eliminare definitivamente questo appuntamento?")) sysExecuteDeleteApp("Cancellato dallo Staff SPA"); }
}
window.sysConfirmDelete = function() {
    const motivo = document.getElementById('delReasonInput').value.trim(); if(!motivo) return showToast("Motivo obbligatorio!");
    const reqId = document.getElementById("mReqId").value;
    if(reqId) {
        const d = document.getElementById("mainDate").value; let reqs = Array.isArray(db.requests[d]) ? db.requests[d] : Object.values(db.requests[d]||{}); const req = reqs.find(x => x && x.id === reqId); if(!req) return; req.status = 'rejected';
        const dbRefLocal = firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.twStructId);
        Promise.all([ dbRefLocal.child('requests').child(d).set(reqs), dbRefLocal.child('requests_log').child(reqId).update({ type: 'rejected', msg: `RIFIUTATA. Motivo: ${motivo}`, date: new Date().toLocaleString('it-IT'), timestamp: Date.now() }) ]).then(() => { document.getElementById('deleteModal').style.display = 'none'; closeSidebar(null, true); showToast("Rifiutata."); });
    } else sysExecuteDeleteApp(motivo);
}

function sysExecuteDeleteApp(motivo) {
    const id = document.getElementById("mId").value; const d = document.getElementById("mainDate").value; let apps = Array.isArray(db.app[d]) ? db.app[d] : Object.values(db.app[d]||{}); const appToDel = apps.find(x => x && x.id === id); apps = apps.filter(x => x && x.id !== id);
    const dbRefLocal = firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.twStructId); let promises = [dbRefLocal.child('app').child(d).set(apps)];
    if(appToDel) { 
        appToDel.deleteReason = motivo; appToDel.date = d; appToDel.deletedAt = new Date().toLocaleString('it-IT'); appToDel.deletedBy = localStorage.getItem("tw_user") || "Staff"; promises.push(dbRefLocal.child('deleted_apps').push(appToDel)); 
        if(appToDel.fromReception && appToDel.reqId) { promises.push(dbRefLocal.child('requests_log').child(appToDel.reqId).update({ type: 'deleted-after', msg: `CANCELLATA DALLA SPA. Motivo: ${motivo}`, date: new Date().toLocaleString('it-IT'), timestamp: Date.now() })); }
    } 
    Promise.all(promises).then(() => { document.getElementById('deleteModal').style.display = 'none'; closeSidebar(null, true); showToast("Eliminato."); });
}

window.sysToggleEseguitoAgenda = function(e, date, appId) { e.stopPropagation(); let dayApps = Array.isArray(db.app[date]) ? db.app[date] : Object.values(db.app[date]||{}); const idx = dayApps.findIndex(a => a && a.id === appId); if(idx > -1) { const ns = !dayApps[idx].eseguito; dayApps[idx].eseguito = ns; firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.twStructId + '/app/' + date).set(dayApps).then(() => showToast(ns ? "Eseguito!" : "Spunta Rimossa!")); } }
window.sysShareWA = function() { const id = document.getElementById("mId").value; const d = document.getElementById("mainDate").value; let apps = Array.isArray(db.app[d]) ? db.app[d] : Object.values(db.app[d]||{}); const app = apps.find(x => x && x.id === id); if(app && app.tel) { window.open(`https://wa.me/${app.tel}?text=${encodeURIComponent(`Gentile Ospite, ti ricordiamo il tuo appuntamento per il trattamento: ${app.serv}, alle ore ${app.ora}. Ti aspettiamo nella nostra SPA!`)}`, '_blank'); closeSidebar(null, true); } else showToast("Manca telefono."); }

function tToM(t) { if(!t || typeof t !== 'string') return 0; const p = t.split(':'); return (parseInt(p[0])||0)*60 + (parseInt(p[1])||0); }
function mToT(m) { const h=Math.floor(m/60); const mm=m%60; return `${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}`; }
function getSlots() { let s=[]; for(let i=10*60; i<=20*60; i+=10) s.push(mToT(i)); return s; }

window.render = function() {
    const grid = document.getElementById("mainGrid"); if(!grid) return;
    const selOp = document.getElementById("aOp");
    if(selOp && db.staff) {
        const currentVal = selOp.value; selOp.innerHTML = '<option value="">-- Seleziona Operatore --</option>';
        const staffList = Array.isArray(db.staff) ? db.staff : Object.values(db.staff);
        staffList.forEach(s => { if(s && s.nome) selOp.innerHTML += `<option value="${s.nome}">${s.nome} ${s.cognome || ''}</option>`; });
        selOp.value = currentVal;
    }
    const d = document.getElementById("mainDate").value; if(!d) return;
    const nCabine = (db.settings && db.settings.cabine) ? parseInt(db.settings.cabine) : 2;
    const slots = getSlots();
    let dayApps = db.app[d] || []; if (!Array.isArray(dayApps)) dayApps = Object.values(dayApps);
    let dayReqs = db.requests[d] || []; if (!Array.isArray(dayReqs)) dayReqs = Object.values(dayReqs);

    let h = "";
    for(let c = 1; c <= nCabine; c++) {
        h += `<div class="colonna"><div class="col-head">CABINA ${c}</div>`;
        slots.forEach(s => {
            const sMin = tToM(s);
            const startApp = dayApps.find(x => x && x.ora === s && parseInt(x.cab) === c);
            const busyApp = dayApps.find(x => { if(!x || !x.ora) return false; const start = tToM(x.ora); const end = start + (parseInt(x.dur) || 30); return parseInt(x.cab) === c && sMin > start && sMin < end; });
            const startReq = dayReqs.find(x => x && x.ora === s && parseInt(x.cab) === c && x.status === 'pending');
            const busyReq = dayReqs.find(x => { if(!x || !x.ora || x.status !== 'pending') return false; const start = tToM(x.ora); const end = start + (parseInt(x.dur) || 30); return parseInt(x.cab) === c && sMin > start && sMin < end; });
            
            if(startApp) {
                // LOGICA COLORI GRIGLIA
                let isEseg = "";
                if(startApp.pagato) isEseg = "pagato-style";
                else if(startApp.eseguito) isEseg = "eseguito-style";

                const slotsCount = Math.ceil((parseInt(startApp.dur) || 30) / 10);
                const hCss = `height: calc(${slotsCount * 100}% + ${slotsCount - 1}px - 6px); top: 3px;`;
                let noteHtml = startApp.note ? `<div class="app-note-preview"><i class="material-icons-round" style="font-size:10px; vertical-align:middle">chat</i> ${startApp.note}</div>` : '';
                let safeName = (startApp.cog || 'N.D.').replace(/'/g, "\\'");
                
                h += `<div class="time-row"><div class="time-lbl">${s}</div>
                      <div class="slot" data-ora="${s}" data-cab="${c}" ondragover="sysAllowDrop(event)" ondragleave="sysDragLeave(event)" ondrop="sysDrop(event)">
                        <div class="app-base ${isEseg}" style="${hCss}" draggable="true" ondragstart="sysDragStart(event, '${startApp.id}')" onclick="sysOpenEdit('${startApp.id}')" ondragend="this.classList.remove('dragging')">
                            <div class="app-info-col">
                                <b style="cursor:pointer; pointer-events:auto;" onclick="sysOpenCustomerProfile(event, '${safeName}')">Cam ${startApp.cam || '?'} - ${startApp.cog || 'N.D.'}</b>
                                <span style="font-size:11px; margin-bottom:2px; opacity:0.9;">${startApp.serv || '-'} (${startApp.dur||30} min)</span>
                                <span style="font-size:10px; font-weight:bold; color:var(--gold);">OP: ${startApp.op || '-'}</span>
                                ${noteHtml}
                            </div>
                            <button class="btn-quick-eseg" onclick="sysToggleEseguitoAgenda(event, '${d}', '${startApp.id}')"><i class="material-icons-round">check</i></button>
                        </div>
                      </div></div>`;
            } else if(busyApp) { h += `<div class="time-row"><div class="time-lbl">${s}</div><div class="slot"><div class="app-busy" onclick="sysOpenEdit('${busyApp.id}')"></div></div></div>`;
            } else if(startReq) {
                const slotsCount = Math.ceil((parseInt(startReq.dur) || 30) / 10); const hCss = `height: calc(${slotsCount * 100}% + ${slotsCount - 1}px - 6px); top: 3px;`;
                let noteHtml = startReq.note ? `<div class="app-note-preview"><i class="material-icons-round" style="font-size:10px; vertical-align:middle">chat</i> ${startReq.note}</div>` : '';
                h += `<div class="time-row"><div class="time-lbl">${s}</div>
                      <div class="slot"><div class="app-base req-style" style="${hCss}" onclick="sysOpenRequestSidebar('${startReq.id}')">
                            <div class="app-info-col">
                                <b><i class="material-icons-round" style="font-size:12px">notifications_active</i> RICHIESTA SPA</b>
                                <span style="font-size:11px; margin-bottom:2px; opacity:0.9;">Cam ${startReq.cam || '?'} - ${startReq.cog || 'Ospite'}</span>
                                <span style="font-size:10px; font-weight:bold;">${startReq.serv || '-'} (${startReq.dur||30} min)</span>
                                ${noteHtml}
                            </div>
                        </div></div></div>`;
            } else if(busyReq) { h += `<div class="time-row"><div class="time-lbl">${s}</div><div class="slot"><div class="app-busy req-busy" onclick="sysOpenRequestSidebar('${busyReq.id}')"></div></div></div>`;
            } else { h += `<div class="time-row"><div class="time-lbl">${s}</div><div class="slot" data-ora="${s}" data-cab="${c}" ondragover="sysAllowDrop(event)" ondragleave="sysDragLeave(event)" ondrop="sysDrop(event)" onclick="sysOpenSlot('${s}', ${c})"></div></div>`; }
        });
        h += `</div>`;
    }
    grid.innerHTML = h;
    if(window.sysApplyZoom) window.sysApplyZoom();
};