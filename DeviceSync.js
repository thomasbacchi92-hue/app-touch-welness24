/* DeviceSync.js - Ponte Radio Multi-Firma v5.0 (Testo Integrale) */
window.DeviceSync = {
    initPC: function() {
        if(!window.twStructId) return;
        const syncRef = firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/device_sync/tablet`);
        
        syncRef.on('value', snap => {
            const data = snap.val();
            if(data && data.status === 'completed') {
                if(data.driveLink && data.driveLink.startsWith("http")) {
                    if(typeof window.savePrivacyLink === 'function') window.savePrivacyLink(data.appId, data.date, data.driveLink);
                    window.DeviceSync.linkToGlobalCRM(data.appId, data.date, data.driveLink, data.docs);
                    const btnPdf = document.getElementById('uiPrivacyLink');
                    if(btnPdf) { btnPdf.href = data.driveLink; btnPdf.style.display = 'flex'; }
                    if(typeof showToast === 'function') showToast('✅ Documento Integrale Firmato e Salvato!');
                } else {
                    alert("⚠️ Firma completata, ma il server non ha generato un PDF valido.");
                }
                syncRef.remove();
            }
        });
    },

    linkToGlobalCRM: function(appId, date, link, docsArray) {
        const sid = window.twStructId;
        if(!sid) return;

        firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${sid}/app/${date}`).once('value').then(snap => {
            let apps = snap.val() || [];
            if(!Array.isArray(apps)) apps = Object.values(apps);
            let myApp = apps.find(a => a && a.id === appId);

            if(myApp && myApp.cog) {
                const nomeCliente = myApp.cog.trim().toLowerCase();

                firebase.database().ref('MASTER_ADMIN_DB/global_customers').once('value').then(cSnap => {
                    const customers = cSnap.val() || {};
                    let targetCustId = null;

                    for(let cid in customers) {
                        if(customers[cid].nome && customers[cid].nome.trim().toLowerCase() === nomeCliente) {
                            targetCustId = cid; break;
                        }
                    }

                    if(targetCustId) {
                        // Estrae solo i titoli per nominarlo nell'anagrafica
                        const docTitles = docsArray ? docsArray.map(d => typeof d === 'string' ? d : d.title).join(', ') : "Consenso SPA";
                        firebase.database().ref(`MASTER_ADMIN_DB/global_customers/${targetCustId}/docs`).push({
                            dataInserimento: new Date().toLocaleString('it-IT'),
                            nomeDoc: "Moduli: " + docTitles,
                            link: link,
                            structId: sid
                        });
                    }
                });
            }
        });
    },

    sendToMobile: function(appId, date, docsPayload) {
        if(!window.twStructId) return;
        firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/device_sync/tablet`).set({ 
            status: 'pending', 
            appId: appId, 
            date: date, 
            docs: docsPayload, // Ora questo è un Array Pieno di Testi!
            timestamp: Date.now() 
        });
        if(typeof showToast === 'function') showToast('Inviato al Tablet... In attesa di firma');
    }
};

document.addEventListener('DOMContentLoaded', () => { 
    const url = window.location.href.toLowerCase();
    if(!url.includes('mobile.html') && !url.includes('firma.html') && !url.includes('admin')) {
        setTimeout(() => { window.DeviceSync.initPC(); }, 1500);
    }
});