/* Menu.js - Menu Laterale Elegante e Dinamico (Fix Percorsi) v5.0 */

window.injectMenu = function() {
    if (window.self !== window.top) {
        // Nasconde il menu se caricato dentro l'iframe (es. Piscina)
        const style = document.createElement('style');
        style.innerHTML = `
            .navbar, .btn-menu, .mobile-bottom-bar { display: none !important; }
            body, .layout, .main-content { padding-top: 0 !important; padding-bottom: 0 !important; margin: 0 !important; }
        `;
        document.head.appendChild(style);
        return;
    }

    if (document.getElementById('navMenu')) return; 

    // Rilevamento cartelle (Gestisce correttamente base path)
    const path = window.location.pathname.toLowerCase();
    const isSubFolder = path.includes('/piscina') || path.includes('/archivio');
    const base = isSubFolder ? '../' : './'; 

    const menuHTML = `
    <style>
        /* Sfondo oscurato ed effetto sfocatura */
        .menu-overlay-bg { display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); z-index: 9998; backdrop-filter: blur(5px); opacity: 0; transition: opacity 0.3s ease; }
        .menu-overlay-bg.show { display: block; opacity: 1; }
        
        /* Pannello Menu Laterale */
        #navMenu { position: fixed; top: 0; right: -320px; width: 300px; height: 100vh; background: #0f172a !important; color: #ffffff !important; border-left: 2px solid #334155; box-shadow: -10px 0 40px rgba(0,0,0,0.8); transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 9999; padding: 20px; box-sizing: border-box; display: flex; flex-direction: column; overflow-y: auto; }
        #navMenu.open { right: 0; }
        
        /* Bottoni */
        .nav-link { display: flex; align-items: center; gap: 15px; color: #ffffff; text-decoration: none; padding: 15px 20px; margin-bottom: 8px; border-radius: 8px; font-weight: bold; font-size: 14px; transition: 0.2s; border: 1px solid transparent; cursor: pointer; background: transparent; border-left: 3px solid transparent; }
        
        /* Effetto Hover animato a destra */
        .nav-link:hover { background: rgba(56, 189, 248, 0.05); color: #38bdf8; border-left: 3px solid #38bdf8; padding-left: 25px; }
        
        /* Intestazioni delle sezioni */
        .nav-title { margin-top: 15px; padding: 10px 20px; font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 900; border-bottom: 1px solid #334155; margin-bottom: 10px; letter-spacing: 1px; }
    </style>
    
    <div class="menu-overlay-bg" id="menuOverlay" onclick="window.toggleMenu(event)"></div>
    <div id="navMenu">
        
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 25px; border-bottom: 1px solid #334155; padding-bottom: 15px;">
            <div style="font-weight:900; color:#fbbf24; letter-spacing:1px; font-size:16px;">TOUCH WELNESS</div>
            <i class="material-icons-round" style="cursor:pointer; color:#94a3b8; font-size:24px; transition:0.2s;" onclick="window.toggleMenu(event)" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#94a3b8'">close</i>
        </div>
        
        <a href="${base}index.html" class="nav-link"><i class="material-icons-round" style="color:#38bdf8">calendar_today</i> AGENDA CABINE</a>
        <a href="${base}Archivio/Lista.html" class="nav-link"><i class="material-icons-round" style="color:#38bdf8">view_list</i> LISTA APPUNTAMENTI</a>
        
        <div class="nav-link" onclick="if(typeof sysToggleLocalCRM === 'function'){ sysToggleLocalCRM(); window.toggleMenu(event); }else{ window.location.href='${base}index.html?view=crm'; }">
            <i class="material-icons-round" style="color:#10b981">contact_page</i> CRM CLIENTI SPA
        </div>
        
        <a href="${base}chat.html" class="nav-link"><i class="material-icons-round" style="color:#38bdf8">forum</i> CHAT E GRUPPI</a>
        <a href="${base}Area_Riservata.html" class="nav-link"><i class="material-icons-round" style="color:#38bdf8">lock_person</i> AREA RISERVATA</a>
        <a href="${base}Piscina/Piscina_GUI.html" class="nav-link"><i class="material-icons-round" style="color:#38bdf8">pool</i> PISCINA E SPA</a>
        
        <div class="nav-title">Impostazioni e Strumenti</div>
        
        <a href="${base}Gestione.html" class="nav-link"><i class="material-icons-round" style="color:#94a3b8">settings</i> IMPOSTAZIONI GENERALI</a>
        
        <div class="nav-link" onclick="if(typeof openTabletSettings === 'function'){ openTabletSettings(); window.toggleMenu(event); } else { alert('Vai in Agenda per configurare il tablet.'); }">
            <i class="material-icons-round" style="color:#a855f7">tablet_mac</i> CONFIGURA TABLET
        </div>
        
        <div class="nav-link" onclick="window.logoutApp()" style="margin-top:auto; color:#ef4444; background:rgba(239, 68, 68, 0.05); border:1px solid rgba(239, 68, 68, 0.2); justify-content:center; cursor:pointer;">
            <i class="material-icons-round">logout</i> DISCONNETTI
        </div>
    </div>
    `;
    
    document.head.insertAdjacentHTML('beforeend', '<style>@import url("https://fonts.googleapis.com/icon?family=Material+Icons+Round");</style>');
    document.body.insertAdjacentHTML('beforeend', menuHTML);
};

window.toggleMenu = function(e) { 
    if(e) e.stopPropagation(); 
    const menu = document.getElementById('navMenu');
    const overlay = document.getElementById('menuOverlay');
    
    if(!menu) { 
        window.injectMenu(); 
        setTimeout(() => window.toggleMenu(), 50); 
        return; 
    }

    if(menu.classList.contains('open')) {
        menu.classList.remove('open');
        overlay.classList.remove('show');
        setTimeout(() => { overlay.style.display = 'none'; }, 300);
    } else {
        overlay.style.display = 'block';
        setTimeout(() => { overlay.classList.add('show'); menu.classList.add('open'); }, 10);
    }
};

window.logoutApp = function() {
    localStorage.clear();
    const path = window.location.pathname.toLowerCase();
    const isSubFolder = path.includes('/piscina') || path.includes('/archivio');
    window.location.href = (isSubFolder ? '../' : './') + "login.html";
};

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', window.injectMenu); } else { window.injectMenu(); }