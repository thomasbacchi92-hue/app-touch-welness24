/* ADMIN CORE v17.5 - CRM STRUTTURALE POTENZIATO CON PRIVACY DOT */

const fbConfig = {
    apiKey: "AIzaSyCrDuK7SWHdbzrJR-pNpxmRwGnZgV2Dd2Y",
    authDomain: "touch-welness-massage.firebaseapp.com",
    databaseURL: "https://touch-welness-massage-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "touch-welness-massage",
    storageBucket: "touch-welness-massage.firebasestorage.app"
};

if (!firebase.apps.length) firebase.initializeApp(fbConfig);

const dbRef = firebase.database().ref('MASTER_ADMIN_DB');
const dataRef = firebase.database().ref('MASTER_ADMIN_DB/structures_data');

window.app = {
    data: { structures: {}, users: {}, global_treatments: {}, global_customers: {}, structures_data: {} },
    currentId: null, currentUserId: null, currentCustomerId: null, currentCRMStructId: null, userToDelete: null, currentDocs: {},
    currentFilteredApps: [], currentPage: 1, itemsPerPage: 50,

    init: function() {
        dbRef.on('value', (snap) => {
            try {
                const val = snap.val() || {};
                this.data.structures = val.structures || {};
                this.data.users = val.users || {};
                this.data.global_treatments = val.global_treatments || {};
                this.data.global_customers = val.global_customers || {};
                this.data.structures_data = val.structures_data || {};
                
                this.safeRender(this.renderStructures.bind(this));
                this.safeRender(this.renderUsers.bind(this));
                this.safeRender(this.renderGlobalStats.bind(this));
                this.safeRender(this.renderGlobalTreatments.bind(this));
                
                // Aggiorna la vista CRM corrente se aperta
                if(document.getElementById('crm-struct-list-view').style.display !== 'none') {
                    this.safeRender(this.renderCRMStructs.bind(this));
                } else if(this.currentCRMStructId && document.getElementById('crm-clients-list-view').style.display !== 'none') {
                    this.safeRender(this.renderCustomersForStruct.bind(this));
                }

                if(this.currentId && this.data.structures[this.currentId] && document.getElementById('detailTitle')) {
                    this.loadDetail(this.currentId, false);
                }
            } catch(e) { console.error("Errore di rendering globale:", e); } 
        });
    },

    safeRender: function(func) { try { func(); } catch(e) { console.warn("Render skip", e); } },

    toggleSubMenu: function(menuId) {
        const el = document.getElementById(menuId); const icon = document.getElementById(menuId + 'Icon');
        if(!el) return;
        if(el.style.display === 'none') { el.style.display = 'flex'; if(icon) icon.style.transform = 'rotate(180deg)'; } 
        else { el.style.display = 'none'; if(icon) icon.style.transform = 'rotate(0deg)'; }
    },

    switchView: function(v) { 
        document.querySelectorAll('.view-section').forEach(x=>x.classList.remove('active')); 
        document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active')); 
        const viewEl = document.getElementById('view-'+v); 
        const navEl = document.getElementById('nav-'+v); 
        if(viewEl) viewEl.classList.add('active'); 
        if(navEl) navEl.classList.add('active'); 

        if(v === 'customers') this.showCRMStructs();

        const submenus = ['customers', 'treatments', 'users', 'options'];
        if(submenus.includes(v)) {
            const subMenuEl = document.getElementById('optionsSubMenu'); const subMenuIcon = document.getElementById('optionsSubMenuIcon'); const navGroup = document.getElementById('nav-group-options');
            if(subMenuEl) subMenuEl.style.display = 'flex'; if(subMenuIcon) subMenuIcon.style.transform = 'rotate(180deg)'; if(navGroup) navGroup.classList.add('active');
        }
    },

    openTab: function(t) { document.querySelectorAll('#view-structure-detail .tab-content').forEach(x=>x.classList.remove('active')); document.querySelectorAll('#view-structure-detail .tab-btn').forEach(x=>x.classList.remove('active')); document.getElementById('tab-'+t).classList.add('active'); if(event && event.target) event.target.classList.add('active'); },
    openUserTab: function(t) { document.querySelectorAll('#user-detail-view .tab-content').forEach(x=>x.classList.remove('active')); document.querySelectorAll('#user-detail-view .tab-btn').forEach(x=>x.classList.remove('active')); document.getElementById('tab-'+t).classList.add('active'); if(event && event.target) event.target.classList.add('active'); },
    openCustomerTab: function(t) { document.querySelectorAll('#customer-detail-view .tab-content').forEach(x=>x.classList.remove('active')); document.querySelectorAll('#customer-detail-view .tab-btn').forEach(x=>x.classList.remove('active')); document.getElementById('tab-'+t).classList.add('active'); if(event && event.target) event.target.classList.add('active'); },
    showToast: function(m) { const t=document.getElementById("toastBlue"); if(t){ t.innerText=m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),3000); } },

    renderGlobalStats: function() {
        const table = document.getElementById('globalStatsTable'); if(!table) return; table.innerHTML = ""; let count = 0;
        Object.values(this.data.structures).forEach(s => {
            if(s && !s.archived) { 
                count++;
                table.innerHTML += `<tr class="clickable" onclick="app.loadDetail('${s.id}')"><td><b style="font-size:15px; color:var(--text-main)">${s.name}</b></td><td><span class="badge" style="background:var(--bg-body); color:var(--text-muted); border:1px solid var(--border-line)">${s.id}</span></td><td style="text-align:right"><button class="btn-action btn-sm btn-outline">APRI SCHEDA</button></td></tr>`; 
            }
        });
        if(count === 0) table.innerHTML = "<tr><td colspan='3' style='text-align:center; padding:20px; color:var(--text-muted)'>Nessuna struttura attiva trovata.</td></tr>";
    },

    // --- NUOVO CRM LOGIC ---
    renderCRMStructs: function() {
        const tbody = document.getElementById('crmStructsTableBody'); if(!tbody) return; tbody.innerHTML = "";
        Object.values(this.data.structures).forEach(s => {
            if(!s.archived) {
                const sNameSafe = s.name.replace(/'/g, "\\'");
                tbody.innerHTML += `<tr class="clickable" onclick="app.openCRMStruct('${s.id}', '${sNameSafe}')">
                    <td><b style="color:var(--text-main); font-size:15px;">${s.name}</b></td>
                    <td style="text-align:right"><button class="btn-action btn-sm btn-outline">VEDI CLIENTI</button></td>
                </tr>`;
            }
        });
    },

    showCRMStructs: function() {
        document.getElementById('crm-struct-list-view').style.display = 'block';
        document.getElementById('crm-clients-list-view').style.display = 'none';
        document.getElementById('customer-detail-view').style.display = 'none';
        this.currentCRMStructId = null;
        this.renderCRMStructs();
    },

    openCRMStruct: function(sid, sName) {
        this.currentCRMStructId = sid;
        document.getElementById('crmStructNameTitle').innerHTML = `<i class="material-icons-round" style="vertical-align:middle; color:var(--accent)">apartment</i> Clienti di: <span style="color:var(--text-main)">${sName}</span>`;
        document.getElementById('crm-struct-list-view').style.display = 'none';
        document.getElementById('crm-clients-list-view').style.display = 'block';
        document.getElementById('customer-detail-view').style.display = 'none';
        this.renderCustomersForStruct();
    },

    renderCustomersForStruct: function() {
        const sid = this.currentCRMStructId;
        const tbody = document.getElementById('adminCustomersTable');
        const query = (document.getElementById('searchCustomerAdmin')?.value || '').toLowerCase();
        
        let structClients = [];
        const structData = this.data.structures_data[sid] || {};
        const appsObj = structData.app || {};
        
        let namesInStruct = new Set();
        for(let d in appsObj) {
            appsObj[d].forEach(a => { if(a.cog) namesInStruct.add(a.cog.toLowerCase().trim()); });
        }

        Object.entries(this.data.global_customers).forEach(([id, c]) => {
            if(c.structId === sid || namesInStruct.has((c.nome||'').toLowerCase().trim())) {
                if(!query || (c.nome||'').toLowerCase().includes(query) || (c.tel||'').includes(query)) {
                    structClients.push({ id, ...c });
                }
            }
        });

        structClients.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        tbody.innerHTML = "";
        if(structClients.length === 0) {
            tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:20px; color:var(--text-muted)'>Nessun cliente registrato in questa struttura.</td></tr>";
            return;
        }

        structClients.forEach(c => {
            const hasPrivacy = c.docs && Object.keys(c.docs).length > 0;
            const dotColor = hasPrivacy ? 'var(--green)' : 'var(--red)';
            const dotTitle = hasPrivacy ? 'Privacy Ok' : 'Manca Privacy';
            const dateStr = c.dataNascita ? c.dataNascita.split('-').reverse().join('/') : 'N.D.';

            tbody.innerHTML += `
                <tr class="clickable" onclick="app.loadCustomerDetail('${c.id}')">
                    <td style="text-align:center"><div style="width:14px; height:14px; border-radius:50%; background:${dotColor}; margin:0 auto; box-shadow:0 0 5px ${dotColor}" title="${dotTitle}"></div></td>
                    <td><b style="color:var(--text-main); text-transform:uppercase; font-size:14px;">${c.nome}</b></td>
                    <td>${c.tel || 'N.D.'}</td>
                    <td style="color:var(--text-muted); font-size:13px;">${dateStr}</td>
                    <td style="text-align:right"><button class="btn-action btn-sm btn-outline">APRI</button></td>
                </tr>
            `;
        });
    },

    loadCustomerDetail: function(id) {
        this.currentCustomerId = id;
        const c = this.data.global_customers[id];
        if(!c) return;

        const elName = document.getElementById('cd_name'); if(elName) elName.innerText = c.nome.toUpperCase();
        const elId = document.getElementById('cd_id'); if(elId) elId.innerText = id.substring(1,9).toUpperCase();
        const elPhone = document.getElementById('cd_phone'); if(elPhone) elPhone.innerText = c.tel || 'N.D.';
        const elDob = document.getElementById('cd_dob'); if(elDob) elDob.innerText = c.dataNascita ? c.dataNascita.split('-').reverse().join('/') : 'N.D.';
        const elNote = document.getElementById('cd_note'); if(elNote) elNote.value = c.note || '';

        let history = []; let totalSpent = 0; let totalTreatments = 0;
        const structsData = this.data.structures_data || {};
        
        for(let sid in structsData) {
            const structName = this.data.structures[sid] ? this.data.structures[sid].name : sid;
            const appsObj = structsData[sid].app || {};
            const serviziList = Array.isArray(structsData[sid].servizi) ? structsData[sid].servizi : Object.values(structsData[sid].servizi || {});

            for(let dateKey in appsObj) {
                appsObj[dateKey].forEach(a => {
                    if(a && a.cog && a.cog.toLowerCase() === c.nome.toLowerCase()) {
                        let price = parseFloat(a.price) || parseFloat(a.prezzo) || 0;
                        if(price === 0 && a.serv) { const srv = serviziList.find(s => s && a.serv.includes(s.nome)); if(srv && srv.prezzo) price = parseFloat(srv.prezzo); }
                        if(a.pagato) totalSpent += price;
                        totalTreatments++;
                        history.push({ date: dateKey, struct: structName, serv: a.serv||'-', op: a.op||'-', price: price, pagato: a.pagato });
                    }
                });
            }
        }

        const elSpent = document.getElementById('cd_tot_spent'); if(elSpent) elSpent.innerText = totalSpent.toFixed(2) + " €";
        const elTreat = document.getElementById('cd_tot_treatments'); if(elTreat) elTreat.innerText = totalTreatments;

        history.sort((a,b) => b.date.localeCompare(a.date));
        const hBody = document.getElementById('cd_history_table');
        if(hBody) {
            if(history.length === 0) { hBody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:20px; color:var(--text-muted)'>Nessuno storico trovato.</td></tr>"; } 
            else {
                hBody.innerHTML = history.map(h => {
                    const badge = h.pagato ? `<span style="color:var(--green); font-size:10px; font-weight:bold">PAGATO</span>` : `<span style="color:var(--red); font-size:10px; font-weight:bold">DA PAGARE</span>`;
                    return `<tr><td>${h.date.split('-').reverse().join('/')}</td><td><b>${h.struct}</b></td><td>${h.serv}</td><td>${h.op}</td><td><b>${h.price.toFixed(2)}€</b><br>${badge}</td></tr>`;
                }).join('');
            }
        }

        const docsTable = document.getElementById('cd_docs_table');
        if(docsTable) {
            docsTable.innerHTML = "";
            if(c.docs) {
                Object.entries(c.docs).forEach(([docId, doc]) => {
                    docsTable.innerHTML += `<tr><td>${doc.dataInserimento}</td><td><b>${doc.nomeDoc}</b></td><td><a href="${doc.link}" target="_blank" class="btn-action btn-sm btn-green"><i class="material-icons-round">picture_as_pdf</i> VEDI PDF</a></td><td style="text-align:right"><button class="btn-icon btn-del" onclick="app.deleteCustomerDoc('${id}', '${docId}')"><i class="material-icons-round">delete</i></button></td></tr>`;
                });
            } else { docsTable.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:20px; color:var(--text-muted)'>Nessun documento associato.</td></tr>"; }
        }

        document.getElementById('crm-clients-list-view').style.display = 'none';
        document.getElementById('customer-detail-view').style.display = 'block';
    },

    saveCustomerNote: function() {
        const el = document.getElementById('cd_note');
        if(this.currentCustomerId && el) {
            dbRef.child('global_customers').child(this.currentCustomerId).update({ note: el.value }).then(()=>this.showToast("Note aggiornate"));
        }
    },

    closeCustomerDetail: function() {
        this.currentCustomerId = null;
        if(this.currentCRMStructId) {
            document.getElementById('crm-clients-list-view').style.display = 'block';
            document.getElementById('customer-detail-view').style.display = 'none';
        } else {
            this.showCRMStructs();
        }
    },

    deleteCustomerDoc: function(cId, docId) {
        if(confirm("Vuoi eliminare definitivamente questo documento?")) {
            dbRef.child(`global_customers/${cId}/docs/${docId}`).remove().then(() => {
                this.showToast("Documento eliminato."); this.loadCustomerDetail(cId);
            });
        }
    },

    // --- REST OF ADMIN CORE (Structures, Users, Treatments) REMAIN UNCHANGED ---
    openStructActionModal: function() {
        document.getElementById('deleteStructAuthArea').style.display = 'none'; document.getElementById('delStructPwd').value = '';
        const isArchived = this.data.structures[this.currentId]?.archived; const btnArch = document.getElementById('btnArchiviaStruttura');
        if(isArchived) { btnArch.innerText = "RIPRISTINA STRUTTURA"; btnArch.style.background = "var(--primary)"; btnArch.onclick = () => app.toggleArchiveStructure(false); } 
        else { btnArch.innerText = "ARCHIVIA STRUTTURA"; btnArch.style.background = "var(--gold)"; btnArch.onclick = () => app.toggleArchiveStructure(true); }
        document.getElementById('structActionModal').style.display = 'flex';
    },
    toggleArchiveStructure: function(archivedStatus) {
        if(!this.currentId) return; dbRef.child('structures').child(this.currentId).update({ archived: archivedStatus }).then(() => { this.showToast(archivedStatus ? "Struttura archiviata." : "Struttura attiva."); document.getElementById('structActionModal').style.display = 'none'; this.switchView('structures'); });
    },
    promptDeleteStructure: function() { document.getElementById('deleteStructAuthArea').style.display = 'block'; },
    confirmDeleteStructure: function() {
        const pwd = document.getElementById('delStructPwd').value;
        if (pwd === "171192") { const sid = this.currentId; if(!sid) return; dbRef.child('structures').child(sid).remove().then(() => { dataRef.child(sid).remove(); this.showToast("STRUTTURA ELIMINATA"); document.getElementById('structActionModal').style.display = 'none'; this.currentId = null; this.switchView('structures'); });
        } else { this.showToast("Password Errata!"); document.getElementById('delStructPwd').value = ''; }
    },
    renderStructures: function() {
        const l = document.getElementById('structureList'); const u = document.getElementById('uStructCreate'); 
        if(!l || !u) return; l.innerHTML = ""; u.innerHTML = '<option value="">-- Seleziona --</option>';
        const structs = Object.values(this.data.structures); structs.sort((a,b) => (a.archived === b.archived) ? 0 : a.archived ? 1 : -1);
        structs.forEach(s => {
            const bg = s.archived ? "background:var(--bg-body); opacity:0.6;" : ""; const badge = s.archived ? `<span class="badge" style="background:#64748b; color:white; margin-left:10px">ARCHIVIATA</span>` : "";
            l.innerHTML += `<div class="list-row clickable" style="${bg}" onclick="app.loadDetail('${s.id}')"><div class="row-info"><b>${s.name} ${badge}</b><span>ID: ${s.id}</span></div><i class="material-icons-round" style="color:var(--accent)">chevron_right</i></div>`;
            if(!s.archived) u.innerHTML += `<option value="${s.id}">${s.name}</option>`;
        });
    },
    addStructure: function() { const n = document.getElementById('strName').value; const id = document.getElementById('strId').value.toUpperCase().trim(); if(n && id) { dbRef.child('structures').child(id).set({ name: n, id: id, created: new Date().toISOString(), archived: false }); document.getElementById('strName').value=""; document.getElementById('strId').value=""; this.showToast("Struttura Creata!"); } },
    saveCabine: function() { if(!this.currentId) return; const val = parseInt(document.getElementById('adminCabSelect').value); dataRef.child(this.currentId).child('settings').update({ cabine: val }).then(() => this.showToast("Numero Cabine Aggiornato!")); },
    loadDetail: function(id, sw = true) {
        this.currentId = id; const s = this.data.structures[id]; if(!s) return; document.getElementById('detailTitle').innerText = s.name;
        const info = s.info || {}; const el = (idStr) => document.getElementById(idStr);
        if(el('d_s_addr')) el('d_s_addr').value = info.s_addr || info.addr || ""; if(el('d_s_city')) el('d_s_city').value = info.s_city || info.city || ""; if(el('d_s_tel')) el('d_s_tel').value = info.s_tel || info.tel || ""; if(el('d_s_email')) el('d_s_email').value = info.s_email || info.pec || "";
        if(el('d_g_ragione')) el('d_g_ragione').value = info.g_ragione || info.gestore || ""; if(el('d_g_addr')) el('d_g_addr').value = info.g_addr || info.addr || ""; if(el('d_g_city')) el('d_g_city').value = info.g_city || info.city || ""; if(el('d_g_piva')) el('d_g_piva').value = info.g_piva || info.piva || ""; if(el('d_g_sdi')) el('d_g_sdi').value = info.g_sdi || info.sdi || ""; if(el('d_g_pec')) el('d_g_pec').value = info.g_pec || info.pec || "";
        if(el('d_spaNick')) el('d_spaNick').value = info.spaNick || ""; if(el('d_spaPass')) el('d_spaPass').value = info.spaPass || ""; if(el('d_recNick')) el('d_recNick').value = info.recNick || info.structNick || ""; if(el('d_recPass')) el('d_recPass').value = info.recPass || info.structPass || ""; 
        const lExp = document.getElementById('lic_exp_date'); if(lExp) lExp.value = s.licenseSuspended ? "SOSPESA" : (s.licenseExp || "NON ATTIVA");
        const selOp = document.getElementById('selOpContratto');
        if(selOp) { selOp.innerHTML = '<option value="">-- Seleziona Operatore --</option>'; Object.values(this.data.users).filter(u => u.structureId === id).forEach(u => { selOp.innerHTML += `<option value="${u.nick}">${u.name||''} ${u.surname||''} (${u.nick})</option>`; }); }
        dataRef.child(id).child('settings').once('value').then(snap => { const sett = snap.val() || {}; const cabEl = document.getElementById('adminCabSelect'); if(cabEl) cabEl.value = sett.cabine || 2; });
        this.calculateStructStats(id); this.renderStructStaff(); this.renderWh(); this.renderStructTreatments();
        if(sw) { this.openTab('stats'); this.switchView('structure-detail'); }
    },
    saveInfo: function() { 
        const el = (idStr) => document.getElementById(idStr);
        const i = { s_addr: el('d_s_addr').value, s_city: el('d_s_city').value, s_tel: el('d_s_tel').value, s_email: el('d_s_email').value, g_ragione: el('d_g_ragione').value, g_addr: el('d_g_addr').value, g_city: el('d_g_city').value, g_piva: el('d_g_piva').value, g_sdi: el('d_g_sdi').value, g_pec: el('d_g_pec').value, spaNick: el('d_spaNick').value, spaPass: el('d_spaPass').value, recNick: el('d_recNick').value, recPass: el('d_recPass').value };
        dbRef.child('structures').child(this.currentId).child('info').set(i).then(() => this.showToast("Dati Aggiornati")); 
    },
    renderStructStaff: function() { if(!this.currentId) return; const tbody = document.getElementById('structStaffTable'); if(!tbody) return; tbody.innerHTML = ""; let count = 0; Object.entries(this.data.users).forEach(([uid, u]) => { if(u.structureId === this.currentId) { count++; tbody.innerHTML += `<tr><td><b>${u.nick}</b></td><td>${u.name||''} ${u.surname||''}</td><td>${u.phone||'-'}</td><td style="text-align:right"><button class="btn-action btn-sm btn-outline" onclick="app.loadUserDetail('${uid}', true)">VEDI PROFILO</button></td></tr>`; } }); if(count === 0) tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:20px; color:var(--text-muted)'>Nessun operatore assegnato a questa struttura.</td></tr>"; },
    calculateStructStats: function(structId = this.currentId) {
        if(!structId) return; const fy = document.getElementById('fYear'); const fm = document.getElementById('fMonth'); if(!fy || !fm) return;
        const targetPrefix = `${fy.value}-${fm.value}`; 
        dataRef.child(structId).once('value').then(snap => {
            const data = snap.val() || {}; const appsObj = data.app || {}; const delObj = data.deleted_apps || {};
            let serviziList = []; if (data.servizi) serviziList = Array.isArray(data.servizi) ? data.servizi : Object.values(data.servizi);
            let all = []; let cPren = 0, cEseg = 0, cElim = 0, cPag = 0; let ePren = 0, eEseg = 0, eElim = 0, ePag = 0; let opStats = {};
            Object.values(this.data.users).filter(u => u.structureId === structId).forEach(u => { opStats[u.nick] = { executed: 0, billed: 0, matches: [u.nick.toLowerCase(), (u.name||'').toLowerCase(), ((u.name||'') + ' ' + (u.surname||'')).toLowerCase()] }; });
            for (const dateKey in appsObj) {
                if(dateKey.startsWith(targetPrefix)) {
                    appsObj[dateKey].forEach(a => {
                        let status = "Prenotato"; let price = parseFloat(a.price) || parseFloat(a.prezzo) || 0;
                        if(price === 0 && a.serv) { const srv = serviziList.find(s => a.serv.includes(s.nome)); if(srv && srv.prezzo) price = parseFloat(srv.prezzo); }
                        const opNameLower = (a.op || "").toLowerCase(); let matchedNick = null;
                        for(let nick in opStats) { if(opStats[nick].matches.includes(opNameLower)) { matchedNick = nick; break; } }
                        if(a.eseguito) { status = "Eseguito"; cEseg++; eEseg += price; if(matchedNick) opStats[matchedNick].executed++; } else { cPren++; ePren += price; }
                        if(a.pagato) { cPag++; ePag += price; if(matchedNick) opStats[matchedNick].billed += price; }
                        all.push({...a, date: dateKey, finalStatus: status});
                    });
                }
            }
            Object.values(delObj).forEach(a => { const effectiveDate = a.rawDate || a.date; if(effectiveDate && effectiveDate.startsWith(targetPrefix)) { let price = parseFloat(a.price) || parseFloat(a.prezzo) || 0; if(price === 0 && a.serv) { const srv = serviziList.find(s => a.serv.includes(s.nome)); if(srv && srv.prezzo) price = parseFloat(srv.prezzo); } cElim++; eElim += price; all.push({...a, date: effectiveDate, finalStatus: "Eliminato"}); } });
            const opBody = document.getElementById('statsOpTable');
            if(opBody) { let opHtml = ''; Object.keys(opStats).sort().forEach(nick => { opHtml += `<tr><td><b style="color:var(--text-main)">${nick}</b></td><td>${opStats[nick].executed}</td><td><b style="color:var(--gold)">${opStats[nick].billed.toFixed(2)} €</b></td></tr>`; }); if(opHtml === '') opHtml = '<tr><td colspan="3" style="text-align:center; padding:15px; color:var(--text-muted)">Nessun operatore registrato.</td></tr>'; opBody.innerHTML = opHtml; }
            document.getElementById('sPren').innerText = cPren; document.getElementById('ePren').innerText = ePren.toFixed(2) + " €"; document.getElementById('sEseg').innerText = cEseg; document.getElementById('eEseg').innerText = eEseg.toFixed(2) + " €"; document.getElementById('sElim').innerText = cElim; document.getElementById('eElim').innerText = eElim.toFixed(2) + " €"; document.getElementById('sPag').innerText = cPag; document.getElementById('ePag').innerText = ePag.toFixed(2) + " €";
            all.sort((a,b) => { if(a.date === b.date) return (b.ora||'').localeCompare(a.ora||''); return b.date.localeCompare(a.date); });
            this.currentFilteredApps = all; this.renderAppPage(1);
        });
    },
    renderAppPage: function(page) {
        this.currentPage = page; const tbody = document.getElementById('structStatsTable'); const start = (page - 1) * this.itemsPerPage; const end = start + this.itemsPerPage; const paginatedApps = this.currentFilteredApps.slice(start, end);
        tbody.innerHTML = paginatedApps.map(x => { let badge = ""; if(x.finalStatus==="Prenotato") badge = `<span class="badge b-pren">PRENOTATO</span>`; else if(x.finalStatus==="Eseguito") badge = `<span class="badge b-eseg">ESEGUITO</span>`; else badge = `<span class="badge b-elim">ELIMINATO</span>`; if(x.pagato && x.finalStatus !== "Eliminato") badge += ` <span class="badge" style="background:var(--gold); color:#0f172a">PAGATO</span>`; const dFormat = (x.date||'').split('-').reverse().join('/'); const reasonText = x.deleteReason ? `<i class="material-icons-round" style="font-size:12px; vertical-align:middle">info</i> ${x.deleteReason}` : '-'; return `<tr><td>${badge}</td><td><b>${dFormat}</b> <span style="color:var(--accent)">${x.ora||'-'}</span></td><td>${x.cog||'-'}</td><td>${x.serv||'-'}</td><td>${x.op||'-'}</td><td style="color:var(--red); font-size:12px; font-weight:bold">${reasonText}</td></tr>`; }).join('');
        if(paginatedApps.length === 0) tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:30px; font-weight:bold; color:var(--text-muted)'>Nessun appuntamento in questo mese.</td></tr>";
        const totalPages = Math.ceil(this.currentFilteredApps.length / this.itemsPerPage); const controls = document.getElementById('paginationControls');
        if(totalPages > 1) { let btns = ''; for(let i=1; i<=totalPages; i++) { btns += `<button class="btn-sm ${i === page ? 'btn-action' : 'btn-outline'}" style="width:35px; height:35px; padding:0; display:inline-flex; border-radius:5px; margin-right:5px; margin-top:5px;" onclick="app.renderAppPage(${i})">${i}</button>`; } controls.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; width:100%; flex-wrap:wrap"><span style="margin-right:15px; font-size:12px; font-weight:bold; color:var(--text-muted)">Pagina:</span>${btns}</div>`; } else controls.innerHTML = `<div style="text-align:center; font-size:11px; color:var(--text-muted)">Visualizzati: ${this.currentFilteredApps.length} (Max 50/pagina)</div>`;
    },
    renderUsers: function() {
        const l = document.getElementById('usersList'); if(!l) return; l.innerHTML = ""; const query = (document.getElementById('searchUserAdmin')?.value || '').toLowerCase(); let count = 0;
        Object.entries(this.data.users).forEach(([k, u]) => { const sn = this.data.structures[u.structureId]?.name || "Non Assegnata"; if (query && !`${u.nick} ${u.name} ${u.surname} ${sn}`.toLowerCase().includes(query)) return; count++; l.innerHTML += `<div class="list-row clickable" onclick="app.loadUserDetail('${k}')"><div class="row-info"><b>${u.nick}</b><span>${u.name||'Manca Nome'} ${u.surname||''} - ${sn}</span></div><button class="btn-icon btn-del" onclick="event.stopPropagation(); app.askDeleteUser('${k}')"><i class="material-icons-round">delete</i></button></div>`; });
        if (count === 0) l.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted)">Nessun operatore corrispondente alla ricerca.</div>`;
    },
    addUser: function() { const u = document.getElementById('uUserCreate').value; const p = document.getElementById('uPassCreate').value; const s = document.getElementById('uStructCreate').value; if(u && p && s) { dbRef.child('users').child("U"+Date.now()).set({nick: u, pass: p, structureId: s}); this.showToast("Utente Creato"); document.getElementById('uUserCreate').value = ""; document.getElementById('uPassCreate').value = ""; } else { this.showToast("Compila tutti i campi!"); } },
    loadUserDetail: function(uid, switchV = true) {
        this.currentUserId = uid; const u = this.data.users[uid]; if(!u) return; document.getElementById('uDetailTitle').innerText = "Profilo: " + u.nick;
        ['u_username','u_password','u_name','u_surname','u_phone','u_email','u_notes'].forEach(id => { const el = document.getElementById(id); if(el) el.value = u[id.replace('u_','').replace('username','nick').replace('password','pass')] || ""; });
        const structSelect = document.getElementById('u_structureId'); if(structSelect) { structSelect.innerHTML = '<option value="">-- Nessuna Struttura --</option>'; Object.values(this.data.structures).filter(s => !s.archived).forEach(s => { structSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`; }); structSelect.value = u.structureId || ""; }
        const comm = u.commissions || {}; document.getElementById('u_c_fisso').value = comm.fisso || 0; document.getElementById('u_c_iva').value = comm.iva || 22; document.getElementById('u_c_struttura').value = comm.struttura || 0; document.getElementById('u_c_agenzia').value = comm.agenzia || 0; document.getElementById('u_c_op_massaggi').value = comm.op_massaggi || 0; document.getElementById('u_c_op_spa').value = comm.op_spa || 0;
        let revElement = document.getElementById('u_total_revenue');
        if(revElement && u.structureId) {
            revElement.innerText = "Calcolo...";
            dataRef.child(u.structureId).once('value').then(snap => { const sData = snap.val() || {}; const appsObj = sData.app || {}; let serviziList = []; if (sData.servizi) { serviziList = Array.isArray(sData.servizi) ? sData.servizi : Object.values(sData.servizi); } let totalFatturato = 0; for(let d in appsObj) { appsObj[d].forEach(a => { if((a.op === u.nick || a.op === u.name) && a.pagato === true) { let price = parseFloat(a.price) || parseFloat(a.prezzo) || 0; if(price === 0 && a.serv) { const srv = serviziList.find(s => a.serv.includes(s.nome)); if(srv && srv.prezzo) price = parseFloat(srv.prezzo); } totalFatturato += price; } }); } revElement.innerText = totalFatturato.toFixed(2) + " €"; });
        } else if(revElement) { revElement.innerText = "0.00 €"; }
        if(switchV) { this.switchView('users'); document.getElementById('user-list-view').style.display='none'; document.getElementById('user-detail-view').style.display='block'; }
    },
    saveUserDetail: function() { const data = { nick: document.getElementById('u_username').value, pass: document.getElementById('u_password').value, name: document.getElementById('u_name').value, surname: document.getElementById('u_surname').value, phone: document.getElementById('u_phone').value, email: document.getElementById('u_email').value, notes: document.getElementById('u_notes').value, structureId: document.getElementById('u_structureId').value, commissions: { fisso: parseFloat(document.getElementById('u_c_fisso').value) || 0, iva: parseFloat(document.getElementById('u_c_iva').value) || 0, struttura: parseFloat(document.getElementById('u_c_struttura').value) || 0, agenzia: parseFloat(document.getElementById('u_c_agenzia').value) || 0, op_massaggi: parseFloat(document.getElementById('u_c_op_massaggi').value) || 0, op_spa: parseFloat(document.getElementById('u_c_op_spa').value) || 0 } }; dbRef.child('users').child(this.currentUserId).update(data).then(() => { this.showToast("Profilo Salvato!"); if(this.currentId) this.renderStructStaff(); }); },
    closeUserDetail: function() { this.currentUserId = null; document.getElementById('user-detail-view').style.display='none'; document.getElementById('user-list-view').style.display='block'; },
    askDeleteUser: function(uid) { this.userToDelete = uid; document.getElementById('deleteUserModal').style.display = 'flex'; },
    cancelDeleteUser: function() { this.userToDelete = null; document.getElementById('deleteUserModal').style.display = 'none'; },
    confirmDeleteUser: function() { if(this.userToDelete) { dbRef.child('users').child(this.userToDelete).remove(); this.showToast("Collaboratore rimosso"); } this.cancelDeleteUser(); },
    renderGlobalTreatments: function() { const tbody = document.getElementById('globalTreatmentsTable'); if(!tbody) return; tbody.innerHTML = ""; const treats = Object.entries(this.data.global_treatments); if(treats.length === 0) { tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:20px; color:var(--text-muted)'>Nessuna tecnica creata.</td></tr>"; return; } treats.forEach(([k, t]) => { tbody.innerHTML += `<tr><td><b style="color:var(--text-main)">${t.nome}</b></td><td>${t.durata} min</td><td><b style="color:var(--gold)">${parseFloat(t.prezzo).toFixed(2)} €</b></td><td style="text-align:right"><button class="btn-icon btn-del" onclick="app.deleteGlobalTreatment('${k}')"><i class="material-icons-round">delete</i></button></td></tr>`; }); },
    saveGlobalTreatment: function() { const n = document.getElementById('gtName').value; const d = parseInt(document.getElementById('gtTime').value); const c = parseFloat(document.getElementById('gtCost').value); if(!n || isNaN(d) || isNaN(c)) return this.showToast("Compila tutti i campi correttamente"); dbRef.child('global_treatments').push({ nome: n, durata: d, prezzo: c }).then(() => { this.showToast("Tecnica Aggiunta all'Archivio Master"); document.getElementById('newGlobalTreatmentModal').style.display = 'none'; document.getElementById('gtName').value = ""; document.getElementById('gtTime').value = ""; document.getElementById('gtCost').value = ""; }); },
    deleteGlobalTreatment: function(id) { if(confirm("Eliminare questa tecnica dall'archivio master?")) { dbRef.child('global_treatments').child(id).remove().then(()=> this.showToast("Tecnica eliminata")); } },
    renderStructTreatments: function() {
        if(!this.currentId) return; const tbodyGlob = document.getElementById('stGlobalTreatments'); const tbodyEnab = document.getElementById('stEnabledTreatments'); if(!tbodyGlob || !tbodyEnab) return;
        dataRef.child(this.currentId).child('servizi').once('value').then(snap => {
            const enabledRaw = snap.val() || {}; const enabled = Array.isArray(enabledRaw) ? enabledRaw : Object.values(enabledRaw);
            tbodyEnab.innerHTML = ""; if(enabled.length === 0) tbodyEnab.innerHTML = "<tr><td colspan='3' style='text-align:center; padding:20px; color:var(--text-muted)'>Nessuna tecnica caricata.</td></tr>";
            enabled.forEach(e => { if(e && e.nome) { tbodyEnab.innerHTML += `<tr><td><b style="color:var(--text-main)">${e.nome}</b></td><td>${e.prezzo} € / ${e.durata}m</td><td style="text-align:right"><button class="btn-icon btn-del" onclick="app.removeStructTreatment('${e.id}')"><i class="material-icons-round">remove_circle_outline</i></button></td></tr>`; } });
            tbodyGlob.innerHTML = ""; const treats = Object.entries(this.data.global_treatments); if(treats.length === 0) tbodyGlob.innerHTML = "<tr><td colspan='3' style='text-align:center; padding:20px; color:var(--text-muted)'>Nessuna tecnica in Master.</td></tr>";
            treats.forEach(([k, t]) => { const isEn = enabled.find(x => x && x.nome === t.nome); if(!isEn) { const safeName = t.nome.replace(/'/g, "\\'").replace(/"/g, "&quot;"); tbodyGlob.innerHTML += `<tr><td><b style="color:var(--text-main)">${t.nome}</b></td><td>${t.prezzo} € / ${t.durata}m</td><td style="text-align:right"><button class="btn-action btn-sm" onclick="app.addStructTreatment('${safeName}', ${t.durata}, ${t.prezzo})"><i class="material-icons-round">add</i> ABILITA</button></td></tr>`; } });
        });
    },
    addStructTreatment: function(nome, durata, prezzo) { if(!this.currentId) return; const sId = this.currentId; dataRef.child(sId).child('servizi').once('value').then(snap => { let current = snap.val() || {}; let newObj = {}; if (Array.isArray(current)) { current.forEach((item, index) => { if(item && item.id) newObj[item.id] = item; else if(item) newObj["OLD_" + index] = item; }); } else { newObj = current; } const newId = "SV" + Date.now() + Math.floor(Math.random() * 1000); newObj[newId] = { id: newId, nome: nome, durata: parseInt(durata)||30, prezzo: parseFloat(prezzo)||0 }; dataRef.child(sId).child('servizi').set(newObj).then(() => { this.showToast("Tecnica Caricata nell'Agenda Struttura"); this.renderStructTreatments(); }); }); },
    removeStructTreatment: function(id) { if(!this.currentId) return; dataRef.child(this.currentId).child('servizi').child(id).remove().then(() => { this.showToast("Tecnica rimossa"); this.renderStructTreatments(); }); },
    uploadContract: function(type) { const fileInput = type === 'struttura' ? document.getElementById('fileContrattoStruttura') : document.getElementById('fileContrattoOp'); if(!fileInput.files || fileInput.files.length === 0) return this.showToast("Seleziona prima un file da caricare!"); const fileName = fileInput.files[0].name; if(type === 'operatore' && !document.getElementById('selOpContratto').value) return this.showToast("Seleziona un operatore dalla tendina."); dataRef.child(this.currentId).child('contracts').push({ date: new Date().toLocaleString('it-IT'), type: type, documentName: fileName, assignedTo: type === 'operatore' ? document.getElementById('selOpContratto').value : 'Struttura' }).then(() => { this.showToast(`✅ Salvato nel database: ${fileName}`); fileInput.value = ""; }); },
    openNewArticleModal: function() { document.getElementById('newArticleModal').style.display='flex'; },
    saveNewArticle: function() { if(!this.currentId) return; const n = document.getElementById('naName').value; const u = document.getElementById('naUnit').value; const c = parseFloat(document.getElementById('naCost').value); if(!n || !u || isNaN(c)) return this.showToast("Compila tutti i campi correttamente."); const id = "PRD"+Date.now(); dataRef.child(this.currentId).child('products').child(id).set({ id: id, name: n, unit: u, cost: c, qty: 0 }).then(() => { this.showToast("Articolo Aggiunto"); document.getElementById('newArticleModal').style.display='none'; document.getElementById('naName').value=''; document.getElementById('naUnit').value=''; document.getElementById('naCost').value=''; this.renderWh(); }); },
    openLoadStockModal: function() { document.getElementById('lsQty').value = ''; document.getElementById('loadStockModal').style.display='flex'; },
    confirmLoadStock: function() { if(!this.currentId) return; const pId = document.getElementById('lsProd').value; const qty = parseInt(document.getElementById('lsQty').value); if(!pId || isNaN(qty) || qty <= 0) return this.showToast("Quantità non valida."); dataRef.child(this.currentId).child('products').child(pId).once('value').then(snap => { const prod = snap.val(); if(!prod) return this.showToast("Errore di sincronizzazione."); const newQty = prod.qty + qty; dataRef.child(this.currentId).child('products').child(pId).update({qty: newQty}); dataRef.child(this.currentId).child('logs').push({ date: new Date().toLocaleString('it-IT'), type: 'CARICO', prodId: pId, prodName: prod.name, qty: qty, operator: 'Admin Master' }).then(() => { this.showToast(`✅ Carico Merce Registrato`); document.getElementById('loadStockModal').style.display='none'; this.renderWh(); }); }); },
    renderWh: function() {
        if(!this.currentId) return;
        dataRef.child(this.currentId).child('products').once('value').then(snap => { const prods = snap.val() || {}; const invBody = document.getElementById('whAdminInventory'); const lsProd = document.getElementById('lsProd'); if(invBody) invBody.innerHTML = ''; if(lsProd) lsProd.innerHTML = '<option value="">-- Seleziona Articolo --</option>'; Object.values(prods).forEach(p => { if(invBody) invBody.innerHTML += `<tr><td><b style="color:var(--text-main)">${p.name}</b></td><td>${p.cost.toFixed(2)} €</td><td><b style="color:var(--accent); font-size:15px">${p.qty}</b></td><td>${p.unit}</td></tr>`; if(lsProd) lsProd.innerHTML += `<option value="${p.id}">${p.name} (${p.unit})</option>`; }); if(Object.keys(prods).length === 0 && invBody) invBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-muted)">Nessun articolo creato.</td></tr>'; });
        dataRef.child(this.currentId).child('logs').once('value').then(snap => { const logs = snap.val() || {}; const logBody = document.getElementById('whAdminLogs'); if(logBody) { logBody.innerHTML = ""; const logArray = Object.values(logs).reverse(); if(logArray.length === 0) logBody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:20px; color:var(--text-muted)'>Nessun movimento.</td></tr>"; else logArray.forEach(l => { const color = l.type === 'CARICO' ? 'var(--green)' : 'var(--red)'; logBody.innerHTML += `<tr><td>${l.date}</td><td><b style="color:${color}">${l.type}</b></td><td>${l.prodName}</td><td><b style="color:var(--text-main)">${l.qty}</b></td><td>${l.operator}</td></tr>`; }); } });
    },
    updateLicense: function(m) { let currentExp = this.data.structures[this.currentId].licenseExp; let d = new Date(currentExp || Date.now()); d.setMonth(d.getMonth() + m); dbRef.child('structures').child(this.currentId).update({ licenseExp: d.toISOString().split('T')[0], licenseSuspended: false }); this.showToast("Licenza Rinnovata"); },
    toggleSuspend: function() { dbRef.child('structures').child(this.currentId).child('licenseSuspended').set(!this.data.structures[this.currentId].licenseSuspended); this.showToast("Stato modificato"); }
};

window.app.init();