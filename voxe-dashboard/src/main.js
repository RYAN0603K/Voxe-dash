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
                crmData = [];
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
            
            const heroTotal = document.getElementById('hero-total-value');
            if (heroTotal) heroTotal.innerText = formatBRL(totalRev + mrrAtivo);

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
// DATA-DRIVEN BRAIN NETWORK (CRM LEADS)
// ==========================================
let brainInitialized = false;
let brainScene, brainCamera, brainRenderer, brainRaycaster, brainMouse, brainControls;
let leadParticlesGroup, hubParticlesGroup;
let brainLines, brainLinePositions, brainLineColors;
let nodeDataList = [];

function typeWriterEffect(elementId, text, speed, callback) {
    const el = document.getElementById(elementId);
    if(!el) return;
    el.innerHTML = '';
    el.classList.remove('opacity-0');
    let i = 0;
    function type() {
        if (i < text.length) {
            el.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        } else if (callback) {
            callback();
        }
    }
    type();
}

function initBrain() {
    if (typeof THREE === 'undefined' || typeof THREE.OrbitControls === 'undefined') { 
        setTimeout(initBrain, 500); 
        return; 
    }
    
    const container = document.getElementById('brain-container');
    if (!container) return;
    
    // Jarvis HUD Animation
    const mrr = crmData.filter(l => l.status === 'cliente').reduce((a, b) => a + (b.mensal || 0), 0);
    const leadsPropostas = crmData.filter(l => l.status === '1_reuniao' || l.status === '2_reuniao').length;
    
    document.getElementById('jarvis-stat-1').innerHTML = '';
    document.getElementById('jarvis-stat-2').innerHTML = '';
    document.getElementById('jarvis-stat-3').innerHTML = '';
    document.getElementById('jarvis-stat-4').innerHTML = '';

    const hour = new Date().getHours();
    let greeting = '> BOA NOITE, RYAN.';
    if (hour >= 5 && hour < 12) greeting = '> BOM DIA, RYAN.';
    else if (hour >= 12 && hour < 18) greeting = '> BOA TARDE, RYAN.';

    fetch('https://api.open-meteo.com/v1/forecast?latitude=-23.67&longitude=-46.77&current_weather=true')
      .then(r => r.json())
      .then(data => {
          const temp = data.current_weather ? data.current_weather.temperature + '°C' : 'OFFLINE';
          typeWriterEffect('jarvis-greeting', greeting, 40, () => {
              typeWriterEffect('jarvis-stat-1', '> SISTEMAS ONLINE. JD MITSUTANI: ' + temp + '.', 20, () => {
                  setTimeout(() => {
                      typeWriterEffect('jarvis-stat-2', '> TOTAL DE LEADS: ' + crmData.length, 15, () => {
                          typeWriterEffect('jarvis-stat-3', '> PROPOSTAS ABERTAS: ' + leadsPropostas, 15, () => {
                              typeWriterEffect('jarvis-stat-4', '> RECEITA ATIVA (MRR): ' + formatBRL(mrr), 15);
                          });
                      });
                  }, 300);
              });
          });
      })
      .catch(() => {
          typeWriterEffect('jarvis-greeting', greeting, 40, () => {
              typeWriterEffect('jarvis-stat-1', '> SISTEMAS ONLINE. JD MITSUTANI: ACESSO BLOQUEADO PELO NAVEGADOR.', 20, () => {
                  setTimeout(() => {
                      typeWriterEffect('jarvis-stat-2', '> TOTAL DE LEADS: ' + crmData.length, 15, () => {
                          typeWriterEffect('jarvis-stat-3', '> PROPOSTAS ABERTAS: ' + leadsPropostas, 15, () => {
                              typeWriterEffect('jarvis-stat-4', '> RECEITA ATIVA (MRR): ' + formatBRL(mrr), 15);
                          });
                      });
                  }, 300);
              });
          });
      });
    
    if (brainInitialized) {
        buildDataNodes();
        return;
    }
    brainInitialized = true;

    brainScene = new THREE.Scene();
    brainCamera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 5000);
    brainCamera.position.z = 800;
    brainCamera.position.y = 300;
    
    const group = new THREE.Group();
    brainScene.add(group);

    leadParticlesGroup = new THREE.Group();
    hubParticlesGroup = new THREE.Group();
    group.add(leadParticlesGroup);
    group.add(hubParticlesGroup);

    // Neural Plexus Lines
    const maxLines = 1000 * 1000; 
    brainLinePositions = new Float32Array(maxLines * 3);
    brainLineColors = new Float32Array(maxLines * 3);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(brainLinePositions, 3).setUsage(THREE.DynamicDrawUsage));
    lineGeo.setAttribute('color', new THREE.BufferAttribute(brainLineColors, 3).setUsage(THREE.DynamicDrawUsage));
    lineGeo.setDrawRange(0, 0);
    const lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending });
    brainLines = new THREE.LineSegments(lineGeo, lineMat);
    group.add(brainLines);

    brainRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    brainRenderer.setPixelRatio(window.devicePixelRatio);
    brainRenderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(brainRenderer.domElement);

    brainControls = new THREE.OrbitControls(brainCamera, brainRenderer.domElement);
    brainControls.enableDamping = true;
    brainControls.dampingFactor = 0.05;
    brainControls.autoRotate = true;
    brainControls.autoRotateSpeed = 0.5;

    brainRaycaster = new THREE.Raycaster();
    brainRaycaster.params.Points.threshold = 15;
    brainMouse = new THREE.Vector2(-9999, -9999);

    let draggedNode = null;
    let dragPlane = new THREE.Plane();
    let dragIntersection = new THREE.Vector3();

    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        brainMouse.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
        brainMouse.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

        if (draggedNode) {
            brainRaycaster.setFromCamera(brainMouse, brainCamera);
            brainRaycaster.ray.intersectPlane(dragPlane, dragIntersection);
            if(dragIntersection) draggedNode.targetPos.copy(dragIntersection);
        }
    });

    container.addEventListener('mousedown', (e) => {
        brainRaycaster.setFromCamera(brainMouse, brainCamera);
        const intersects = brainRaycaster.intersectObjects(leadParticlesGroup.children);
        if (intersects.length > 0) {
            brainControls.enabled = false;
            brainControls.autoRotate = false;
            document.body.style.cursor = 'grabbing';
            const mesh = intersects[0].object;
            draggedNode = nodeDataList.find(n => n.mesh === mesh);
            if (draggedNode) {
                draggedNode.isDragging = true;
                draggedNode.targetPos = mesh.position.clone();
                // Create a plane facing camera to drag upon
                const camDir = new THREE.Vector3();
                brainCamera.getWorldDirection(camDir);
                dragPlane.setFromNormalAndCoplanarPoint(camDir, mesh.position);
            }
        }
    });

    container.addEventListener('mouseup', (e) => {
        if (draggedNode) {
            brainControls.enabled = true;
            brainControls.autoRotate = true;
            document.body.style.cursor = 'default';
            draggedNode.isDragging = false;

            const leadMesh = draggedNode.mesh;
            let closestHub = null;
            let minDistance = 250; 
            
            nodeDataList.forEach(node => {
                if(node.type === 'hub') {
                    const dist = leadMesh.position.distanceTo(node.mesh.position);
                    if(dist < minDistance) {
                        minDistance = dist;
                        closestHub = node;
                    }
                }
            });
            
            if (closestHub && closestHub !== draggedNode.hubObj) {
                draggedNode.hubObj = closestHub;
                draggedNode.mesh.userData.statusLabel = closestHub.label;
                
                const crmItem = crmData.find(l => l.id === draggedNode.mesh.userData.id);
                if (crmItem) {
                    crmItem.status = closestHub.id;
                    saveData();
                }
            }
            
            // Recalc orbit to resume from dropped spot seamlessly
            const dx = leadMesh.position.x - draggedNode.hubObj.mesh.position.x;
            const dz = leadMesh.position.z - draggedNode.hubObj.mesh.position.z;
            draggedNode.angle = Math.atan2(dz, dx);
            draggedNode.orbitRadius = Math.sqrt(dx*dx + dz*dz);
            if(draggedNode.orbitRadius < 50) draggedNode.orbitRadius = 50;

            draggedNode = null;
        }
    });

    container.addEventListener('mouseleave', () => {
        brainMouse.x = -9999;
        brainMouse.y = -9999;
        const tooltip = document.getElementById('brain-tooltip');
        if(tooltip) {
            tooltip.classList.add('hidden');
            tooltip.classList.remove('opacity-100');
        }
        if (draggedNode) {
            brainControls.enabled = true;
            brainControls.autoRotate = true;
            document.body.style.cursor = 'default';
            draggedNode.isDragging = false;
            draggedNode = null;
        }
    });

    buildDataNodes();

    function animate() {
        requestAnimationFrame(animate);
        if (!document.getElementById('page-cerebro').classList.contains('active')) return;

        brainControls.update();
        const time = Date.now() * 0.0005;

        // Fluid Physics & Orbits
        nodeDataList.forEach((node, i) => {
            if(node.type === 'lead') {
                if (node.isDragging && node.targetPos) {
                    // Fluid delayzinho (spring physics)
                    node.mesh.position.lerp(node.targetPos, 0.03);
                } else {
                    // Smoothly orbit around hub
                    const hub = node.hubObj;
                    if(hub) {
                        node.angle += node.speed;
                        const tx = hub.mesh.position.x + Math.cos(node.angle) * node.orbitRadius;
                        const ty = hub.mesh.position.y + Math.sin(time + i) * 20;
                        const tz = hub.mesh.position.z + Math.sin(node.angle) * node.orbitRadius;
                        // Lerp to orbit target gives fluid return when dropped!
                        node.mesh.position.lerp(new THREE.Vector3(tx, ty, tz), 0.05);
                    }
                }
            } else if (node.type === 'hub') {
                node.mesh.position.y = Math.sin(time + i * 10) * 30;
            }
        });

        // Neural Interconnections (Plexus)
        let vPos = 0;
        let cPos = 0;
        let numConn = 0;
        const connectionDist = 180;

        for (let i = 0; i < nodeDataList.length; i++) {
            for (let j = i + 1; j < nodeDataList.length; j++) {
                const n1 = nodeDataList[i];
                const n2 = nodeDataList[j];
                const dist = n1.mesh.position.distanceTo(n2.mesh.position);
                
                if (dist < connectionDist) {
                    brainLinePositions[vPos++] = n1.mesh.position.x;
                    brainLinePositions[vPos++] = n1.mesh.position.y;
                    brainLinePositions[vPos++] = n1.mesh.position.z;
                    brainLinePositions[vPos++] = n2.mesh.position.x;
                    brainLinePositions[vPos++] = n2.mesh.position.y;
                    brainLinePositions[vPos++] = n2.mesh.position.z;

                    // White Lines for neuron effect
                    const alpha = 1.0 - (dist / connectionDist);
                    brainLineColors[cPos++] = 1.0; brainLineColors[cPos++] = 1.0; brainLineColors[cPos++] = 1.0;
                    brainLineColors[cPos++] = 1.0; brainLineColors[cPos++] = 1.0; brainLineColors[cPos++] = 1.0;
                    
                    numConn++;
                }
            }
        }
        brainLines.geometry.setDrawRange(0, numConn * 2);
        brainLines.geometry.attributes.position.needsUpdate = true;
        brainLines.geometry.attributes.color.needsUpdate = true;

        // Hover Tooltip
        if(!draggedNode) {
            brainRaycaster.setFromCamera(brainMouse, brainCamera);
            const intersects = brainRaycaster.intersectObjects(leadParticlesGroup.children);
            const tooltip = document.getElementById('brain-tooltip');
            
            if (intersects.length > 0 && tooltip) {
                const hit = intersects[0];
                const leadData = hit.object.userData;
                if(leadData) {
                    document.body.style.cursor = 'grab';
                    const vector = hit.object.position.clone();
                    vector.applyMatrix4(group.matrixWorld);
                    vector.project(brainCamera);
                    
                    const sx = (vector.x * .5 + .5) * container.clientWidth;
                    const sy = (vector.y * -.5 + .5) * container.clientHeight;
                    
                    tooltip.style.left = sx + 'px';
                    tooltip.style.top = sy + 'px';
                    tooltip.innerHTML = `
                        <div class="text-[10px] text-emerald-400 font-bold mb-1 uppercase tracking-widest">${leadData.statusLabel}</div>
                        <div class="text-base font-black">${leadData.nome}</div>
                        <div class="text-slate-300 text-sm font-medium mt-0.5">${formatBRL(leadData.mensal || 0)}</div>
                    `;
                    tooltip.classList.remove('hidden');
                    tooltip.classList.add('opacity-100');
                    
                    hit.object.scale.lerp(new THREE.Vector3(2.5, 2.5, 2.5), 0.2);
                    brainControls.autoRotate = false;
                }
            } else {
                document.body.style.cursor = 'default';
                if(tooltip) {
                    tooltip.classList.add('hidden');
                    tooltip.classList.remove('opacity-100');
                }
                leadParticlesGroup.children.forEach(c => c.scale.lerp(new THREE.Vector3(1,1,1), 0.1));
                brainControls.autoRotate = true;
            }
        }

        brainRenderer.render(brainScene, brainCamera);
    }
    animate();
}

function buildDataNodes() {
    while(leadParticlesGroup.children.length > 0) leadParticlesGroup.remove(leadParticlesGroup.children[0]);
    while(hubParticlesGroup.children.length > 0) hubParticlesGroup.remove(hubParticlesGroup.children[0]);
    nodeDataList = [];

    const hubs = [
        { id: 'novo', label: 'Leads Novos', color: 0x00ffff, pos: new THREE.Vector3(-350, 0, -150) },
        { id: '1_reuniao', label: '1ª Reunião', color: 0xffea00, pos: new THREE.Vector3(-150, 0, 200) },
        { id: '2_reuniao', label: '2ª Reunião', color: 0xcc00ff, pos: new THREE.Vector3(100, 0, 250) },
        { id: 'cliente', label: 'Clientes Ativos', color: 0x00ff66, pos: new THREE.Vector3(350, 0, 0) },
        { id: 'perdido', label: 'Antigos', color: 0xff0055, pos: new THREE.Vector3(150, 0, -250) }
    ];

    const hubMap = {};
    hubs.forEach(h => {
        const geo = new THREE.SphereGeometry(15, 32, 32);
        const mat = new THREE.MeshBasicMaterial({ color: h.color, blending: THREE.AdditiveBlending });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(h.pos);
        
        const haloGeo = new THREE.SphereGeometry(25, 32, 32);
        const haloMat = new THREE.MeshBasicMaterial({ color: h.color, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        mesh.add(halo);
        
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#' + h.color.toString(16).padStart(6, '0');
        ctx.font = 'bold 24px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(h.label.toUpperCase(), 128, 64);
        const tex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(100, 50, 1);
        sprite.position.y = 40;
        mesh.add(sprite);

        hubParticlesGroup.add(mesh);
        
        const node = { type: 'hub', mesh: mesh, ...h };
        nodeDataList.push(node);
        hubMap[h.id] = node;
    });

    crmData.forEach((lead, i) => {
        const hubNode = hubMap[lead.status];
        if(!hubNode) return;

        const geo = new THREE.SphereGeometry(12, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending });
        const mesh = new THREE.Mesh(geo, mat);
        
        const angle = Math.random() * Math.PI * 2;
        const radius = 60 + Math.random() * 80;
        
        mesh.position.x = hubNode.mesh.position.x + Math.cos(angle) * radius;
        mesh.position.y = hubNode.mesh.position.y;
        mesh.position.z = hubNode.mesh.position.z + Math.sin(angle) * radius;
        
        mesh.userData = { type: 'lead', ...lead, statusLabel: hubNode.label };
        leadParticlesGroup.add(mesh);

        nodeDataList.push({
            type: 'lead',
            mesh: mesh,
            hubObj: hubNode,
            angle: angle,
            orbitRadius: radius,
            speed: 0.005 + Math.random() * 0.01
        });
    });
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







// ===== TIME FILTER SYSTEM =====
let currentTimeFilter = 'live';

function setTimeFilter(mode) {
    currentTimeFilter = mode;
    // Update tab styles
    document.querySelectorAll('.time-tab').forEach(t => {
        t.classList.remove('active-tab');
        t.classList.add('text-slate-500');
    });
    event.target.classList.add('active-tab');
    event.target.classList.remove('text-slate-500');
    
    // Update hero title
    const titleEl = document.getElementById('hero-title-label');
    if (titleEl) {
        if (mode === 'live') titleEl.innerText = 'Operação Ao Vivo';
        else if (mode === 'month') titleEl.innerText = 'Faturamento — Este Mês';
        else if (mode === 'year') titleEl.innerText = 'Faturamento — Este Ano';
    }
    
    updateKPIs();
}
window.setTimeFilter = setTimeFilter;