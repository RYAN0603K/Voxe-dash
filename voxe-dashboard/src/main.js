let originChart, funnelChart, heroChart;
        let crmData = [];
        
        // --- 3D INTERACTIVITY LOGIC ---
        let isHoloDragging = false;
        let holoPrevX = 0;
        let holoPrevY = 0;
        let holoRotX = 65;
        let holoRotZ = -25;

        // --- 3D INTERACTIVITY LISTENERS ---
        const endDrag = () => {
            isHoloDragging = false;
            const scene = document.getElementById('holo-scene');
            if (scene) scene.style.cursor = 'grab';
        };
        
        window.addEventListener('mouseup', endDrag);
        window.addEventListener('touchend', endDrag);
        
        const moveDrag = (e) => {
            if (!isHoloDragging) return;
            if(e.preventDefault) e.preventDefault(); // Stop page scroll while dragging
            
            const dragWrapper = document.getElementById('holo-drag-wrapper');
            if (!dragWrapper) return;
            
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            const deltaX = clientX - holoPrevX;
            const deltaY = clientY - holoPrevY;
            
            holoRotZ += deltaX * 0.5; // horizontal drag rotates Z (spins funnel)
            holoRotX -= deltaY * 0.5; // vertical drag rotates X (tilts funnel)
            
            // Clamp tilt so it doesn't flip over (0 = top down view, 90 = side view)
            if (holoRotX < 0) holoRotX = 0;
            if (holoRotX > 90) holoRotX = 90;
            
            dragWrapper.style.transform = `rotateX(${holoRotX}deg) rotateZ(${holoRotZ}deg)`;
            
            // Update labels inverse rotation to face camera
            document.querySelectorAll('.holo-label').forEach(label => {
                label.style.transform = "translateX(-50%)";
            });
            
            holoPrevX = clientX;
            holoPrevY = clientY;
        };

        window.addEventListener('mousemove', moveDrag);
        window.addEventListener('touchmove', moveDrag, { passive: false });
        
        // Auto-spin for maximum WOW factor
        let autoSpinInterval;
        const startAutoSpin = () => {
            if (autoSpinInterval) clearInterval(autoSpinInterval);
            autoSpinInterval = setInterval(() => {
                if (!isHoloDragging) {
                    const dragWrapper = document.getElementById('holo-drag-wrapper');
                    if (dragWrapper) {
                        holoRotZ += 0.3; // Spin slowly
                        dragWrapper.style.transform = `rotateX(${holoRotX}deg) rotateZ(${holoRotZ}deg)`;
                        document.querySelectorAll('.holo-label').forEach(label => {
                            label.style.transform = "translateX(-50%)";
                        });
                    }
                }
            }, 30); // ~33fps
        };
        startAutoSpin();

        // Utilities
        const formatBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
        const formatDateStr = (d) => { if(!d) return ''; const p = d.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; };
        
        function formatPhone(phone) {
            if(!phone) return '';
            const cleaned = ('' + phone).replace(/\D/g, '');
            if(cleaned.length === 11) return `(${cleaned.substring(0,2)}) ${cleaned.substring(2,7)}-${cleaned.substring(7)}`;
            if(cleaned.length === 10) return `(${cleaned.substring(0,2)}) ${cleaned.substring(2,6)}-${cleaned.substring(6)}`;
            return phone;
        }

        const optionsInbound = [
            {v: 'instagram', l: 'Instagram Ads'},
            {v: 'google', l: 'Google Ads'},
            {v: 'indicacao', l: 'Indicação'},
            {v: 'organico', l: 'SEO / Orgânico'}
        ];
        
        const optionsOutbound = [
            {v: 'cold_call', l: 'Cold Call'},
            {v: 'linkedin', l: 'LinkedIn Sales'},
            {v: 'email', l: 'Cold Email'},
            {v: 'networking', l: 'Networking Evento'}
        ];

        function getOrigemLabel(val) {
            const found = [...optionsInbound, ...optionsOutbound].find(x => x.v === val);
            return found ? found.l : val;
        }

        function updateOrigemOptions() {
            const tipo = document.getElementById('input-tipo').value;
            const select = document.getElementById('input-origem');
            select.innerHTML = '';
            (tipo === 'inbound' ? optionsInbound : optionsOutbound).forEach(o => {
                select.innerHTML += `<option value="${o.v}">${o.l}</option>`;
            });
        }

        // ==========================================
        // DARK MODE
        // ==========================================
        function toggleTheme() {
            const html = document.documentElement;
            if (html.classList.contains('dark')) {
                html.classList.remove('dark');
                localStorage.setItem('voxe_theme_v2', 'light');
                document.getElementById('theme-icon').setAttribute('data-lucide', 'moon');
            } else {
                html.classList.add('dark');
                localStorage.setItem('voxe_theme_v2', 'dark');
                document.getElementById('theme-icon').setAttribute('data-lucide', 'sun');
            }
            lucide.createIcons();
            renderDashboard();
        }

        function loadTheme() {
            const saved = localStorage.getItem('voxe_theme_v2');
            if (saved === 'light') { // default to dark because premium
                document.documentElement.classList.remove('dark');
                document.getElementById('theme-icon').setAttribute('data-lucide', 'moon');
            }
        }

        // ==========================================
        // LOCAL STORAGE & DATA MGMT
        // ==========================================
        let supabaseClient = null;

        function initSupabase() {
            const url = 'https://feqxzustzkzrpkgqyptz.supabase.co';
            // Tabela criada via conexão direta. Usando chave anônima (segura)
            const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlcXh6dXN0emt6cnBrZ3F5cHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3ODgzMTIsImV4cCI6MjEwMzM2NDMxMn0.Y9scaSab-52Y13QfQhGUw4JEa9tYvlbtMxoA9wq8pQE';
            
            supabaseClient = supabase.createClient(url, key);
            const modal = document.getElementById('supabase-modal');
            if(modal) modal.classList.add('hidden');
            loadData(); // Reload from supabase
        }

        function connectSupabase() {
            const url = document.getElementById('supa-url').value.trim();
            const key = document.getElementById('supa-key').value.trim();
            if(!url || !key) return alert('Preencha os dois campos!');
            localStorage.setItem('voxe_supa_url', url);
            localStorage.setItem('voxe_supa_key', key);
            initSupabase();
        }

        async function loadData() {
            if (supabaseClient) {
                try {
                    const { data, error } = await supabaseClient.from('leads').select('*');
                    if (error) throw error;
                    if (data && data.length > 0) {
                        crmData = data;
                        refreshAllViews();
                        return;
                    }
                } catch(err) {
                    console.error("Supabase Error:", err);
                    alert("Erro ao ler do Supabase. Verifique se a tabela 'leads' existe e é pública.");
                }
            }
            
            // Fallback to local storage
            const saved = localStorage.getItem('voxe_crm_data_v4');
            if (saved) {
                crmData = JSON.parse(saved);
            } else {
                crmData = [
                    { id: 1, nome: 'Dr. Roberto (Clínica Odonto)', tipo: 'inbound', origem: 'instagram', status: '1_reuniao', dataReuniao: '2026-08-30', horaReuniao: '14:30', mensal: 1500, total: 9000, telefone: '11987654321', anotacoes: 'Quer focar em implantes.' },
                    { id: 2, nome: 'E-commerce Moda Fitness', tipo: 'outbound', origem: 'linkedin', status: '2_reuniao', dataReuniao: '2026-08-28', horaReuniao: '10:00', mensal: 2500, total: 15000, telefone: '21999998888', anotacoes: 'Proposta enviada.' }
                ];
                saveData();
            }
            refreshAllViews();
        }

        async function saveData() { 
            localStorage.setItem('voxe_crm_data_v4', JSON.stringify(crmData)); 
            
            if (supabaseClient) {
                try {
                    // Sync all to supabase (Upsert requires ID)
                    const { error } = await supabaseClient.from('leads').upsert(crmData);
                    if (error) console.error("Erro ao salvar no Supabase:", error);
                } catch(err) {}
            }
        }
        
        function refreshAllViews() {
            renderDashboard();
            renderAgenda();
            renderKanban();
        }

                function allowDrop(ev) {
            ev.preventDefault();
        }

        function dragCard(ev, id) {
            ev.dataTransfer.setData("text", id);
        }

        function dropCard(ev, colId) {
            ev.preventDefault();
            const id = ev.dataTransfer.getData("text");
            if(id && colId) {
                updateStatusDirectly(id, colId);
            }
        }
        function updateStatusDirectly(id, newStatus) {
            const lead = crmData.find(l => l.id == id);
            if(lead) { lead.status = newStatus; saveData(); refreshAllViews(); }
        }

        function removeLead(id) {
            if(confirm("Tem certeza que deseja apagar este lead da sua carteira?")) {
                crmData = crmData.filter(l => l.id != id);
                saveData(); refreshAllViews(); closeModal();
            }
        }

        // ==========================================
        // KANBAN BOARD
        // ==========================================
        const COLUMNS = [
            { id: 'novo', label: 'Leads', bgHead: 'bg-slate-200/50 dark:bg-slate-800 text-slate-700 dark:text-slate-300', dot: 'bg-slate-400' },
            { id: '1_reuniao', label: '1ª Reunião', bgHead: 'bg-amber-100/50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400', dot: 'bg-amber-400' },
            { id: '2_reuniao', label: '2ª Reunião', bgHead: 'bg-purple-100/50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400', dot: 'bg-purple-400' },
            { id: 'cliente', label: 'Clientes Ativos', bgHead: 'bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-400' },
            { id: 'perdido', label: 'Antigos Clientes', bgHead: 'bg-red-100/50 dark:bg-red-900/30 text-red-700 dark:text-red-400', dot: 'bg-red-400' }
        ];

        function renderKanban() {
            const board = document.getElementById(`board-funil`);
            board.innerHTML = '';
            
            // Build data for 3D Funnel
            const funnelData = [];

            COLUMNS.forEach(col => {
                const colLeads = crmData.filter(l => l.status === col.id);
                let valueSum = colLeads.reduce((acc, curr) => acc + (curr.mensal || 0), 0);
                
                if(col.id !== 'perdido') {
                    funnelData.push([col.label, colLeads.length]);
                }

                let html = `
                    <div ondragover="allowDrop(event)" ondrop="dropCard(event, '${col.id}')" class="kanban-col bg-slate-200/40 dark:bg-dark-900/40 border border-slate-200/60 dark:border-white/5">
                        <div class="flex justify-between items-center mb-4 px-3 py-2.5 rounded-xl ${col.bgHead} border border-white/10 shadow-sm backdrop-blur-md">
                            <h3 class="font-bold text-[13px] tracking-wide flex items-center gap-2"><div class="w-2 h-2 rounded-full ${col.dot}"></div> ${col.label}</h3>
                            <span class="bg-white/60 dark:bg-black/20 text-[10px] font-black px-2 py-0.5 rounded-md">${colLeads.length}</span>
                        </div>
                        <div class="text-right px-2 mb-2 text-xs font-bold text-slate-400">Total: ${formatBRL(valueSum)}</div>
                        <div class="flex flex-col gap-3">
                `;

                colLeads.forEach(l => {
                    let selectHtml = `<select onchange="updateStatusDirectly(${l.id}, this.value)" onclick="event.stopPropagation()" class="select-status text-xs w-full mt-4 border-t border-slate-100 dark:border-white/5 pt-3 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">`;
                    COLUMNS.forEach(c => { selectHtml += `<option class="bg-slate-50 dark:bg-dark-900 text-slate-800 dark:text-slate-200" value="${c.id}" ${l.status === c.id ? 'selected' : ''}>Mover p/ ${c.label}</option>`; });
                    selectHtml += `</select>`;

                    let tagHtml = l.dataReuniao ? `<div class="text-[11px] bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-lg mt-3 font-semibold inline-flex items-center gap-1.5 border border-slate-200 dark:border-white/5"><i data-lucide="calendar" class="w-3 h-3 text-voxe-500"></i> ${formatDateStr(l.dataReuniao)} às ${l.horaReuniao||'--:--'}</div>` : '';
                    let originIcon = l.tipo === 'inbound' ? '🎯 Inbound' : '🏹 Outbound';
                    
                    let whatsAppHtml = '';
                    if(l.telefone) {
                        const zap = l.telefone.replace(/\D/g, '');
                        whatsAppHtml = `<a href="https://wa.me/55${zap}" target="_blank" onclick="event.stopPropagation()" class="mt-3 text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 text-xs font-bold transition-colors w-fit"><i data-lucide="message-circle" class="w-3.5 h-3.5"></i> ${formatPhone(l.telefone)}</a>`;
                    }

                    html += `
                        <div draggable="true" ondragstart="dragCard(event, ${l.id})" class="kanban-card bg-white dark:bg-dark-850 border border-slate-200 dark:border-white/5 cursor-pointer" onclick="editLead(${l.id})">
                            <div class="font-extrabold text-sm mb-1.5 line-clamp-1 text-slate-800 dark:text-slate-100" title="${l.nome}">${l.nome}</div>
                            <div class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 line-clamp-1">${originIcon} • ${getOrigemLabel(l.origem)}</div>
                            <div class="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">${formatBRL(l.mensal)}</div>
                            ${whatsAppHtml}
                            ${tagHtml}
                            ${selectHtml}
                        </div>
                    `;
                });

                html += `</div></div>`;
                board.innerHTML += html;
            });
            
            // Bulletproof Holographic 3D Funnel
            const funnelColors = [
                { main: '#38bdf8', bg: 'rgba(56, 189, 248, 0.1)', bgHover: 'rgba(56, 189, 248, 0.3)', glow: 'rgba(56, 189, 248, 0.5)' },
                { main: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)', bgHover: 'rgba(251, 191, 36, 0.3)', glow: 'rgba(251, 191, 36, 0.5)' },
                { main: '#c084fc', bg: 'rgba(192, 132, 252, 0.1)', bgHover: 'rgba(192, 132, 252, 0.3)', glow: 'rgba(192, 132, 252, 0.5)' },
                { main: '#34d399', bg: 'rgba(52, 211, 153, 0.1)', bgHover: 'rgba(52, 211, 153, 0.3)', glow: 'rgba(52, 211, 153, 0.5)' }
            ];
            
            let holoHtml = `<div class="holo-scene" id="holo-scene" style="cursor: grab;">
                <div class="holo-drag-wrapper" id="holo-drag-wrapper" style="transform-style: preserve-3d; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; transform: rotateX(${holoRotX}deg) rotateZ(${holoRotZ}deg);">
                    <div class="holo-container">`;
            holoHtml += `<div class="holo-core"></div>`; // Central laser beam
            
            let currentWidth = 320;
            let currentTZ = 120;
            let tierIndex = 0;
            
            COLUMNS.forEach(col => {
                if(col.id === 'perdido') return;
                
                const colLeads = crmData.filter(l => l.status === col.id);
                let valueSum = colLeads.reduce((acc, curr) => acc + (curr.mensal || 0), 0);
                const count = colLeads.length;
                const c = funnelColors[tierIndex];
                
                // Labels must counter-rotate to face camera based on initial rot
                holoHtml += `
                <div class="holo-tier" style="width: ${currentWidth}px; height: ${currentWidth}px; --tz: ${currentTZ}px; --clr: ${c.main}; --bg: ${c.bg}; --bg-hover: ${c.bgHover}; --delay: ${tierIndex * 0.5}s;">
                    <div class="holo-label" style="--clr: ${c.main}; --clr-glow: ${c.glow}; transform: translateX(-50%);">
                        <div class="holo-label-title">${col.label}</div>
                        <div class="holo-label-stats">${count} leads ativos</div>
                        <div class="holo-label-money">${formatBRL(valueSum)}</div>
                    </div>
                </div>`;
                
                currentWidth -= 60; // Shrink each tier
                currentTZ -= 80;    // Stack them vertically (Z-axis in isometric)
                tierIndex++;
            });
            
            holoHtml += `</div></div></div>`;
            document.getElementById('funnel3d-container').innerHTML = holoHtml;
            
            // Attach mousedown and touchstart
            const scene = document.getElementById('holo-scene');
            scene.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Prevent native browser dragging from hijacking the mouse
                isHoloDragging = true;
                holoPrevX = e.clientX;
                holoPrevY = e.clientY;
                scene.style.cursor = 'grabbing';
            });
            scene.addEventListener('touchstart', (e) => {
                isHoloDragging = true;
                holoPrevX = e.touches[0].clientX;
                holoPrevY = e.touches[0].clientY;
            });

            lucide.createIcons();
        }

        // ==========================================
        // AGENDA
        // ==========================================
        function renderAgenda() {
            const list = document.getElementById('agenda-list');
            const empty = document.getElementById('no-agenda');
            list.innerHTML = '';
            
            const scheduled = crmData.filter(l => l.dataReuniao && l.status !== 'cliente' && l.status !== 'perdido').sort((a, b) => new Date(a.dataReuniao + 'T' + (a.horaReuniao || '00:00')) - new Date(b.dataReuniao + 'T' + (b.horaReuniao || '00:00')));

            if(scheduled.length === 0) {
                empty.classList.remove('hidden');
            } else {
                empty.classList.add('hidden');
                scheduled.forEach(l => {
                    const is1 = l.status === '1_reuniao';
                    const [year, month, day] = l.dataReuniao.split('-');
                    
                    const card = document.createElement('div');
                    card.className = "bg-white dark:bg-dark-850 border border-slate-200 dark:border-white/5 rounded-2xl p-6 hover:-translate-y-1 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between h-full";
                    card.onclick = () => editLead(l.id);
                    
                    card.innerHTML = `
                        <div>
                            <div class="flex justify-between items-start mb-5">
                                <div class="bg-gradient-to-b from-slate-800 to-slate-900 text-white rounded-xl p-2.5 text-center min-w-[4rem] shadow-md border border-slate-700">
                                    <div class="text-2xl font-black leading-none">${day}</div>
                                    <div class="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">${month}/${year.substring(2)}</div>
                                </div>
                                <div class="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-white/5">
                                    <i data-lucide="clock" class="w-3.5 h-3.5 text-voxe-500"></i> ${l.horaReuniao || '--:--'}
                                </div>
                            </div>
                            <h3 class="font-extrabold text-lg leading-tight mb-2 line-clamp-1 text-slate-800 dark:text-slate-100">${l.nome}</h3>
                            <p class="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-3">${l.tipo === 'inbound' ? '🎯 Inbound' : '🏹 Outbound'} - ${getOrigemLabel(l.origem)}</p>
                            ${l.telefone ? `<div class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium"><i data-lucide="phone" class="w-3.5 h-3.5"></i> ${formatPhone(l.telefone)}</div>` : ''}
                        </div>
                        <div class="mt-5 pt-5 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
                            <span class="px-3 py-1.5 rounded-lg text-xs font-bold ${is1 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'}">${is1 ? '1ª Reunião' : '2ª Reunião'}</span>
                            <span class="font-black text-emerald-600 dark:text-emerald-400 text-lg">${formatBRL(l.mensal)}</span>
                        </div>
                    `;
                    list.appendChild(card);
                });
                lucide.createIcons();
            }
        }

        // ==========================================
        // DASHBOARD
        // ==========================================
        function renderDashboard() {
            let mrr = 0, totalRev = 0, countIn = 0, countOut = 0;
            const origins = {}; const funnel = { 'novo':0, '1_reuniao': 0, '2_reuniao': 0, 'cliente': 0, 'perdido': 0 };

            crmData.forEach(l => {
                totalRev += l.total;
                if(l.status === 'cliente') { mrr += l.mensal; } 
                else if(l.status !== 'perdido') { if(l.tipo === 'inbound') countIn++; else countOut++; }
                origins[l.origem] = (origins[l.origem] || 0) + 1;
                if(funnel[l.status] !== undefined) funnel[l.status]++;
            });

            document.getElementById('kpi-leads').innerText = (countIn + countOut);
            document.getElementById('kpi-ativos').innerText = funnel['cliente'];
            document.getElementById('kpi-mensal').innerText = formatBRL(mrr);
            document.getElementById('kpi-total').innerText = formatBRL(totalRev);

            const isDark = document.documentElement.classList.contains('dark');
            const textColor = isDark ? '#94a3b8' : '#64748b';
            const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

            if (originChart) {
                originChart.data.labels = Object.keys(origins).map(k => getOrigemLabel(k));
                originChart.data.datasets[0].data = Object.values(origins);
                originChart.options.plugins.legend.labels.color = textColor;
                originChart.update();
            }
            if (funnelChart) {
                funnelChart.data.datasets[0].data = [funnel['novo'], funnel['1_reuniao'], funnel['2_reuniao'], funnel['cliente'], funnel['perdido']];
                funnelChart.options.scales.x.ticks.color = textColor;
                funnelChart.options.scales.y.ticks.color = textColor;
                funnelChart.options.scales.y.grid.color = gridColor;
                funnelChart.update();
            }
        }

        // ==========================================
        // MODAL
        // ==========================================
        function openModal() { 
            document.getElementById('modal-title').innerText = "Novo Prospecto";
            document.getElementById('form-new-lead').reset();
            document.getElementById('input-id').value = '';
            document.getElementById('btn-delete').classList.add('hidden');
            document.getElementById('input-tipo').value = 'inbound';
            updateOrigemOptions();
            document.getElementById('modal-new-lead').classList.remove('hidden'); 
        }
        function closeModal() { document.getElementById('modal-new-lead').classList.add('hidden'); }

        function editLead(id) {
            const l = crmData.find(x => x.id === id);
            if(!l) return;
            document.getElementById('modal-title').innerText = "Editar Prospecto";
            document.getElementById('input-id').value = l.id;
            document.getElementById('input-nome').value = l.nome;
            document.getElementById('input-telefone').value = l.telefone || '';
            document.getElementById('input-tipo').value = l.tipo;
            updateOrigemOptions(); 
            document.getElementById('input-origem').value = l.origem;
            document.getElementById('input-status').value = l.status;
            document.getElementById('input-data').value = l.dataReuniao || '';
            document.getElementById('input-hora').value = l.horaReuniao || '';
            document.getElementById('input-mensal').value = l.mensal || '';
            document.getElementById('input-total').value = l.total || '';
            document.getElementById('input-anotacoes').value = l.anotacoes || '';
            document.getElementById('btn-delete').classList.remove('hidden');
            document.getElementById('modal-new-lead').classList.remove('hidden');
        }

        function saveLead(e) { if(e) e.preventDefault();
            const payload = {
                id: document.getElementById('input-id').value ? parseInt(document.getElementById('input-id').value) : Date.now(),
                nome: document.getElementById('input-nome').value,
                telefone: document.getElementById('input-telefone').value,
                tipo: document.getElementById('input-tipo').value,
                origem: document.getElementById('input-origem').value,
                status: document.getElementById('input-status').value,
                dataReuniao: document.getElementById('input-data').value,
                horaReuniao: document.getElementById('input-hora').value,
                mensal: parseFloat(document.getElementById('input-mensal').value) || 0,
                total: parseFloat(document.getElementById('input-total').value) || 0,
                anotacoes: document.getElementById('input-anotacoes').value
            };
            const i = crmData.findIndex(x => x.id === payload.id);
            if(i >= 0) crmData[i] = payload; else crmData.push(payload);
            saveData(); refreshAllViews(); closeModal();
        }

        function deleteFromModal() { const id = document.getElementById('input-id').value; if(id) removeLead(parseInt(id)); }

        // ==========================================
        // ROUTES & BOOT
        // ==========================================
        function changePage(pageId) {
            document.querySelectorAll('.page-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('aside nav button').forEach(el => {
                el.classList.remove('bg-gradient-to-r', 'from-voxe-500', 'to-blue-600', 'text-white', 'shadow-lg', 'shadow-voxe-500/20');
                el.classList.add('text-slate-600', 'dark:text-slate-400');
            });
            document.getElementById('page-' + pageId).classList.add('active');
            if (window.innerWidth < 768) { const sb = document.getElementById('sidebar'); if (!sb.classList.contains('-translate-x-full')) toggleSidebar(); }
            const btn = document.getElementById('nav-' + pageId);
            btn.classList.remove('text-slate-600', 'dark:text-slate-400');
            btn.classList.add('bg-gradient-to-r', 'from-voxe-500', 'to-blue-600', 'text-white', 'shadow-lg', 'shadow-voxe-500/20');

            if(pageId === 'funil') {
                setTimeout(renderKanban, 50);
            }
            if(pageId === 'cerebro') {
                setTimeout(initBrain, 50);
            }
            if(false) {
                setTimeout(renderKanban, 50); // Give DOM time to display:block so Highcharts can calculate dimensions
            }
        }

        function initApp() {
            loadTheme();
            updateOrigemOptions();
            lucide.createIcons();
            
            initSupabase();

            Chart.defaults.font.family = "'Inter', sans-serif";
            
            // Hero Chart
            const ctxHero = document.getElementById('heroProgressChart').getContext('2d');
            let gradient = ctxHero.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
            gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
            
            heroChart = new Chart(ctxHero, {
                type: 'line',
                data: {
                    labels: ['18 Mar', '21 Mar', '24 Mar', '27 Mar', '30 Mar', '02 Apr', '05 Apr', '08 Apr', '11 Apr', '14 Apr', '17 Apr', '20 Apr', '23 Apr', '26 Apr', '29 Apr', '02 May', '05 May', '08 May', '11 May'],
                    datasets: [{
                        data: [20000, 23000, 24000, 22000, 35600, 36000, 41000, 37000, 36000, 36600, 37000, 37000, 33200, 36200, 33600, 39000, 37600, 32400, 33200],
                        borderColor: '#10b981',
                        borderWidth: 3,
                        backgroundColor: gradient,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#10b981'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, callbacks: { label: (ctx) => formatBRL(ctx.raw) } } },
                    scales: {
                        x: { display: false },
                        y: { display: false, min: 15000 }
                    },
                    interaction: { mode: 'nearest', axis: 'x', intersect: false }
                }
            });

            const ctxOrigin = document.getElementById('leadsOriginChart').getContext('2d');
            originChart = new Chart(ctxOrigin, {
                type: 'pie',
                data: { labels: [], datasets: [{ data: [], backgroundColor: ['#0d9488', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ec4899'], borderWidth: 0, hoverOffset: 4 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { weight: '600' } } } } }
            });

            const ctxFunnel = document.getElementById('leadsFunnelChart').getContext('2d');
            funnelChart = new Chart(ctxFunnel, {
                type: 'bar',
                data: {
                    labels: ['Leads', '1ª Reunião', '2ª Reunião', 'Ativos', 'Antigos'],
                    datasets: [{ label: 'Leads', data: [0, 0, 0, 0, 0], backgroundColor: ['#94a3b8', '#fbbf24', '#a78bfa', '#34d399', '#f87171'], borderRadius: 8, barThickness: 40 }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, font: { weight: '600' } } }, x: { grid: { display: false }, ticks: { font: { weight: '600' } } } } }
            });

            loadData();
    }
    

// Expose functions to window for inline HTML event handlers
window.changePage = changePage;
  window.updateOrigemOptions = updateOrigemOptions;
  function exportBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(crmData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "voxe_crm_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}
function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data)) {
                crmData = data;
                saveData();
                refreshAllViews();
                alert('Backup importado com sucesso!');
            }
        } catch (err) {
            alert('Erro ao ler arquivo de backup.');
        }
    };
    reader.readAsText(file);
}
  window.exportBackup = exportBackup;
  window.importBackup = importBackup;
window.openModal = openModal;
window.closeModal = closeModal;
window.saveLead = saveLead;
window.editLead = editLead;
window.deleteFromModal = deleteFromModal;
window.updateStatusDirectly = updateStatusDirectly;
  window.allowDrop = allowDrop;
  window.dragCard = dragCard;
  window.dropCard = dropCard;



window.renderKanban = renderKanban;

window.toggleTheme = toggleTheme;

window.connectSupabase = connectSupabase;

// --- MOBILE SIDEBAR ---
window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
}

// --- LOGIN SYSTEM ---
const MASTER_PASSWORD = 'voxe'; // Senha master simples

// Auto-login desativado


window.handleLogin = function() {
    const MASTER_PASSWORD = 'voxe';
    const pass = document.getElementById('login-password').value;
    if (pass.toLowerCase().trim() === MASTER_PASSWORD) {
        localStorage.setItem('voxe_logged_in', 'true');
        document.getElementById('login-screen').classList.add('opacity-0');
        setTimeout(() => {
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('app-container').classList.remove('hidden');
            if (typeof initApp === 'function') initApp();
            window.dispatchEvent(new Event('resize'));
        }, 300);
    } else {
        document.getElementById('login-error').classList.remove('hidden');
        document.getElementById('login-password').value = '';
    }
};
















// ==========================================
// BRAIN NETWORK (JARVIS PLEXUS)
// ==========================================
let brainInitialized = false;
let brainScene, brainCamera, brainRenderer, brainParticles, brainLines, brainLinePositions, brainLineColors;
let brainParticlesData = [];
const maxParticleCount = 250;
const particleCount = 150;
const r = 800; 

function initBrain() {
    if (brainInitialized) return;
    if (typeof THREE === 'undefined') { setTimeout(initBrain, 500); return; }
    brainInitialized = true;
    const container = document.getElementById('brain-container');
    if (!container) return;

    brainScene = new THREE.Scene();
    brainCamera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 4000);
    brainCamera.position.z = 1750;
    const group = new THREE.Group();
    brainScene.add(group);

    const pMaterial = new THREE.PointsMaterial({
        color: 0x34d399, size: 5, blending: THREE.AdditiveBlending, transparent: true, sizeAttenuation: true
    });

    const particles = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(maxParticleCount * 3);
    for (let i = 0; i < maxParticleCount; i++) {
        particlePositions[i * 3] = Math.random() * r - r / 2;
        particlePositions[i * 3 + 1] = Math.random() * r - r / 2;
        particlePositions[i * 3 + 2] = Math.random() * r - r / 2;
        brainParticlesData.push({
            velocity: new THREE.Vector3(-1 + Math.random() * 2, -1 + Math.random() * 2, -1 + Math.random() * 2).normalize().multiplyScalar(Math.random() * 2 + 0.5),
            numConnections: 0
        });
    }

    particles.setDrawRange(0, particleCount);
    particles.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    brainParticles = new THREE.Points(particles, pMaterial);
    group.add(brainParticles);

    const segments = maxParticleCount * maxParticleCount;
    brainLinePositions = new Float32Array(segments * 3);
    brainLineColors = new Float32Array(segments * 3);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(brainLinePositions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(brainLineColors, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.computeBoundingSphere();
    geometry.setDrawRange(0, 0);

    const material = new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.8 });
    brainLines = new THREE.LineSegments(geometry, material);
    group.add(brainLines);

    brainRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    brainRenderer.setPixelRatio(window.devicePixelRatio);
    brainRenderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(brainRenderer.domElement);

    let mouseX = 0, mouseY = 0;
    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        mouseX = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
        mouseY = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;
    });

    function animate() {
        requestAnimationFrame(animate);
        if (!document.getElementById('page-cerebro').classList.contains('active')) return;

        group.rotation.y += 0.002;
        group.rotation.x += 0.001;
        
        brainCamera.position.x += (mouseX * 500 - brainCamera.position.x) * 0.05;
        brainCamera.position.y += (mouseY * 500 - brainCamera.position.y) * 0.05;
        brainCamera.lookAt(brainScene.position);

        let vertexpos = 0, colorpos = 0, numConnected = 0;
        for (let i = 0; i < particleCount; i++) brainParticlesData[i].numConnections = 0;

        for (let i = 0; i < particleCount; i++) {
            const particleData = brainParticlesData[i];
            particlePositions[i * 3] += particleData.velocity.x;
            particlePositions[i * 3 + 1] += particleData.velocity.y;
            particlePositions[i * 3 + 2] += particleData.velocity.z;

            if (particlePositions[i * 3 + 1] < -r / 2 || particlePositions[i * 3 + 1] > r / 2) particleData.velocity.y = -particleData.velocity.y;
            if (particlePositions[i * 3] < -r / 2 || particlePositions[i * 3] > r / 2) particleData.velocity.x = -particleData.velocity.x;
            if (particlePositions[i * 3 + 2] < -r / 2 || particlePositions[i * 3 + 2] > r / 2) particleData.velocity.z = -particleData.velocity.z;

            for (let j = i + 1; j < particleCount; j++) {
                const particleDataB = brainParticlesData[j];
                const dx = particlePositions[i * 3] - particlePositions[j * 3];
                const dy = particlePositions[i * 3 + 1] - particlePositions[j * 3 + 1];
                const dz = particlePositions[i * 3 + 2] - particlePositions[j * 3 + 2];
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (dist < 150) {
                    particleData.numConnections++;
                    particleDataB.numConnections++;

                    brainLinePositions[vertexpos++] = particlePositions[i * 3];
                    brainLinePositions[vertexpos++] = particlePositions[i * 3 + 1];
                    brainLinePositions[vertexpos++] = particlePositions[i * 3 + 2];

                    brainLinePositions[vertexpos++] = particlePositions[j * 3];
                    brainLinePositions[vertexpos++] = particlePositions[j * 3 + 1];
                    brainLinePositions[vertexpos++] = particlePositions[j * 3 + 2];

                    const alpha = 1.0 - dist / 150;
                    brainLineColors[colorpos++] = 0.05;
                    brainLineColors[colorpos++] = 0.5 + (0.5 * alpha);
                    brainLineColors[colorpos++] = 0.8;

                    brainLineColors[colorpos++] = 0.05;
                    brainLineColors[colorpos++] = 0.5 + (0.5 * alpha);
                    brainLineColors[colorpos++] = 0.8;
                    
                    numConnected++;
                }
            }
        }

        brainLines.geometry.setDrawRange(0, numConnected * 2);
        brainLines.geometry.attributes.position.needsUpdate = true;
        brainLines.geometry.attributes.color.needsUpdate = true;
        brainParticles.geometry.attributes.position.needsUpdate = true;

        brainRenderer.render(brainScene, brainCamera);
    }
    animate();
}

window.addEventListener('resize', () => {
    if(brainRenderer && brainCamera) {
        const container = document.getElementById('brain-container');
        if(container) {
            brainCamera.aspect = container.clientWidth / container.clientHeight;
            brainCamera.updateProjectionMatrix();
            brainRenderer.setSize(container.clientWidth, container.clientHeight);
        }
    }
});
