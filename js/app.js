/*
=========================================================================
VOXE CRM - MAIN APPLICATION CONTROLLER
=========================================================================
*/

// Application State
let chartInstances = {};
let appState = {
  currentTab: 'dashboard',
  leads: [],
  filteredLeads: [],
  selectedLeadIds: [],
  activeLeadIdForScripts: null,
  activeScriptDrawerLeadId: null,
  activeAddressModalLeadId: null,
  activeMeetingDateLeadId: null,
  previousMeetingStatus: null,
  meetingDateConfirmed: false,
  previousCloseSaleStatus: null,
  closeSaleConfirmed: false,
  sortField: 'name',
  sortAscending: true,
  valuesVisible: localStorage.getItem('voxecrm_values_visible') !== 'false',
  activeCalendarDate: new Date(),
  notifications: [],
  visibleColumns: {
    name: true,
    decisor: true,
    phone: true,
    contacts: true,
    email: true,
    website: true,
    address: true,
    status: true,
    warmup: true,
    notes: true,
    category: false,
    priority: false,
    value: false,
    date: false,
    respondiId: false
  }
};

// Available fields mapping
const COLUMN_NAMES = {
  name: "Nome da Clínica",
  decisor: "Decisor / Contato",
  phone: "Telefone",
  contacts: "Contatos",
  email: "E-mail",
  website: "Website",
  address: "Endereço",
  status: "Status",
  warmup: "Aquecimento",
  notes: "Notas / Anotações",
  category: "Segmento",
  priority: "Prioridade",
  value: "Valor Est.",
  date: "Data",
  respondiId: "ID"
};

// Document Ready Initializer
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Theme Switch Toggle
  initTheme();
  
  // Apply values visibility (eye blur)
  applyValuesVisibility();

  // Check auth session
  checkUserAuthOnLoad();

  // Load initial settings UI
  setupColumnCheckboxSelector();
  setupSettingsTab();
  
  // Set up event listeners for filters
  const checkAll = document.getElementById('check-all');
  if (checkAll) checkAll.checked = false;
  
  // Load Supabase fields if saved
  const sConfig = db.getSupabaseConfig();
  if (sConfig) {
    document.getElementById('supabase-url').value = sConfig.url || '';
    document.getElementById('supabase-anon-key').value = sConfig.anonKey || '';
    const syncBtn = document.getElementById('btn-sync-supabase');
    if (syncBtn) syncBtn.disabled = false;
    updateSupabaseBadge(true, 'Salvo localmente');
  }

  // Setup notepad listener and value
  setupGeneralNotepad();

  // Load and render persistent notifications
  loadNotifications();
  
  // Click outside to close notifications dropdown
  document.addEventListener('click', (event) => {
    const dropdown = document.getElementById('notification-dropdown');
    const bellBtn = document.getElementById('btn-notification-bell');
    if (dropdown && !dropdown.classList.contains('hidden') && bellBtn && !bellBtn.contains(event.target) && !dropdown.contains(event.target)) {
      dropdown.classList.add('hidden');
    }
  });
});

function applyProfileTableConfiguration() {
  let activeUser = 'Ryan Az';
  try {
    const user = JSON.parse(localStorage.getItem('voxecrm_current_user'));
    if (user && user.name) {
      activeUser = user.name;
    }
  } catch (e) {}

  const headerRow = document.getElementById('table-header-row');
  if (!headerRow) return;

  if (activeUser === 'Vithor') {
    appState.visibleColumns = {
      decisor: true,
      phone: true,
      email: true,
      category: true,
      name: true,
      notes: true,
      warmup: true,
      date: true,
      respondiId: true,
      status: true,
      contacts: true,
      website: false,
      address: false,
      priority: false,
      value: false
    };

    headerRow.innerHTML = `
      <th class="col-actions" style="width: 50px;"></th>
      <th data-field="decisor" onclick="sortTable('decisor')">Decisor <span class="sort-indicator"></span></th>
      <th data-field="phone" onclick="sortTable('phone')">Telefone <span class="sort-indicator"></span></th>
      <th data-field="email" onclick="sortTable('email')">E-mail <span class="sort-indicator"></span></th>
      <th data-field="category" onclick="sortTable('category')">Segmento <span class="sort-indicator"></span></th>
      <th data-field="name" onclick="sortTable('name')">Nome da Clínica <span class="sort-indicator"></span></th>
      <th data-field="notes" class="col-notes">Faturamento</th>
      <th data-field="warmup" onclick="sortTable('warmup')">Pontuação <span class="sort-indicator"></span></th>
      <th data-field="date" onclick="sortTable('date')">Data <span class="sort-indicator"></span></th>
      <th data-field="respondiId" onclick="sortTable('respondiId')">ID <span class="sort-indicator"></span></th>
      <th data-field="status" class="col-status" onclick="sortTable('status')">Status <span class="sort-indicator"></span></th>
      <th data-field="contacts" style="width: 95px; text-align: center;" onclick="sortTable('contacts')">Contatos <span class="sort-indicator"></span></th>
    `;
  } else {
    appState.visibleColumns = {
      name: true,
      decisor: true,
      phone: true,
      contacts: true,
      email: true,
      website: true,
      address: true,
      status: true,
      warmup: true,
      notes: true,
      category: false,
      priority: false,
      value: false,
      date: false,
      respondiId: false
    };

    headerRow.innerHTML = `
      <th class="col-actions" style="width: 50px;"></th>
      <th data-field="name" onclick="sortTable('name')">Nome da Clínica <span class="sort-indicator"></span></th>
      <th data-field="decisor" onclick="sortTable('decisor')">Decisor / Contato <span class="sort-indicator"></span></th>
      <th data-field="phone" onclick="sortTable('phone')">Telefone <span class="sort-indicator"></span></th>
      <th data-field="contacts" style="width: 95px; text-align: center;" onclick="sortTable('contacts')">Contatos <span class="sort-indicator"></span></th>
      <th data-field="email" onclick="sortTable('email')">E-mail <span class="sort-indicator"></span></th>
      <th data-field="website" onclick="sortTable('website')">Website <span class="sort-indicator"></span></th>
      <th data-field="address" onclick="sortTable('address')">Endereço <span class="sort-indicator"></span></th>
      <th data-field="status" class="col-status" onclick="sortTable('status')">Status <span class="sort-indicator"></span></th>
      <th data-field="warmup" style="width: 110px;" onclick="sortTable('warmup')">Aquecimento <span class="sort-indicator"></span></th>
      <th data-field="notes" class="col-notes">Notas / Anotações</th>
      <th data-field="category" onclick="sortTable('category')">Segmento <span class="sort-indicator"></span></th>
      <th data-field="priority" class="col-priority" onclick="sortTable('priority')">Prioridade <span class="sort-indicator"></span></th>
      <th data-field="value" onclick="sortTable('value')">Valor Est. (R$) <span class="sort-indicator"></span></th>
    `;
  }

  // Re-populate checkboxes popup
  setupColumnCheckboxSelector();
}

async function initApp() {
  applyProfileTableConfiguration();
  try {
    appState.leads = await db.fetchLeadsFromSupabase();
  } catch (err) {
    console.error('Falha ao carregar Supabase:', err);
    appState.leads = db.getLeads();
  }
  
  // Set default seller filter in dashboard based on logged-in user
  const filterEl = document.getElementById('dashboard-seller-filter');
  if (filterEl) {
    let activeUser = 'Ryan Az';
    try {
      const user = JSON.parse(localStorage.getItem('voxecrm_current_user'));
      if (user && user.name) activeUser = user.name;
    } catch (e) {}
    filterEl.value = activeUser;
  }
  
  // Set default seller filter in financeiro based on logged-in user
  const finFilterEl = document.getElementById('financeiro-seller-filter');
  if (finFilterEl) {
    let activeUser = 'Ryan Az';
    try {
      const user = JSON.parse(localStorage.getItem('voxecrm_current_user'));
      if (user && user.name) activeUser = user.name;
    } catch (e) {}
    finFilterEl.value = activeUser;
  }
  
  // Set up dropdown list of leads for the scripts tab
  populateScriptLeadSelector();
  
  // Filter, sort and render
  filterGrid();
  
  // Update Metrics Dashboard
  updateDashboardMetrics();
  
  // Update Financeiro View
  updateFinanceiroView();
  
  // Inicializa seletores de data e assessores customizados (Notched Border)
  initCustomDropdowns();
}

// SWITCH TABS
function switchTab(tabId) {
  appState.currentTab = tabId;
  
  // Update nav buttons
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const activeBtn = document.getElementById(`btn-tab-${tabId}`);
  if (activeBtn) activeBtn.classList.add('active');
  
  // Update views
  document.querySelectorAll('.tab-content').forEach(view => {
    view.classList.add('hidden');
  });
  
  const activeView = document.getElementById(`view-${tabId}`);
  if (activeView) activeView.classList.remove('hidden');
  
  // Tab-specific initializations
  if (tabId === 'scripts') {
    // Select the first lead if none is active
    if (!appState.activeLeadIdForScripts && appState.leads.length > 0) {
      appState.activeLeadIdForScripts = appState.leads[0].id;
      document.getElementById('active-lead-script').value = appState.leads[0].id;
    }
    updateScriptPreviews();
  } else if (tabId === 'dashboard') {
    updateDashboardView();
  } else if (tabId === 'settings') {
    setupSettingsTab();
  } else if (tabId === 'calendar') {
    renderCalendar();
  } else if (tabId === 'financeiro') {
    updateFinanceiroView();
  }
}

// Parse lead date helper
function parseLeadDate(dateStr) {
  if (!dateStr) return null;
  const cleaned = String(dateStr).trim();
  if (cleaned.includes('-')) {
    const parts = cleaned.split('T')[0].split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
  }
  if (cleaned.includes('/')) {
    const parts = cleaned.split('/');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
  }
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

// Check if a date falls in a selected period
function isDateInPeriod(dateObj, period, isFinanceiro = false) {
  if (period === 'all') return true;
  if (!dateObj) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const target = new Date(dateObj);
  target.setHours(0, 0, 0, 0);
  
  if (period === 'today') {
    return target.getTime() === today.getTime();
  }
  
  if (period === 'yesterday') {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return target.getTime() === yesterday.getTime();
  }
  
  if (period === 'last-7-days') {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return target.getTime() >= start.getTime() && target.getTime() <= today.getTime();
  }
  
  if (period === 'last-30-days') {
    const start = new Date(today);
    start.setDate(today.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    return target.getTime() >= start.getTime() && target.getTime() <= today.getTime();
  }
  
  if (period === 'custom') {
    const startId = isFinanceiro ? 'financeiro-custom-date-start' : 'custom-date-start';
    const endId = isFinanceiro ? 'financeiro-custom-date-end' : 'custom-date-end';
    const startInput = document.getElementById(startId)?.value;
    const endInput = document.getElementById(endId)?.value;
    if (!startInput || !endInput) return false;
    
    // Parse in local timezone
    const partsStart = startInput.split('-');
    const startDate = new Date(parseInt(partsStart[0]), parseInt(partsStart[1]) - 1, parseInt(partsStart[2]), 0, 0, 0, 0);
    
    const partsEnd = endInput.split('-');
    const endDate = new Date(parseInt(partsEnd[0]), parseInt(partsEnd[1]) - 1, parseInt(partsEnd[2]), 23, 59, 59, 999);
    
    return target.getTime() >= startDate.getTime() && target.getTime() <= endDate.getTime();
  }
  
  if (period === 'this-week') {
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    // Se for domingo (0), volta 6 dias. Senão, volta para a segunda-feira anterior (dayOfWeek - 1).
    const diff = today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return target.getTime() >= startOfWeek.getTime() && target.getTime() <= endOfWeek.getTime();
  }
  
  if (period === 'this-month') {
    return target.getFullYear() === today.getFullYear() && target.getMonth() === today.getMonth();
  }
  
  if (period === 'this-year') {
    return target.getFullYear() === today.getFullYear();
  }
  
  return false;
}

function updateDashboardMetrics() {
  const sellerFilter = document.getElementById('dashboard-seller-filter')?.value || 'all';
  const period = document.getElementById('dashboard-period-filter')?.value || 'all';
  
  // Filter by seller first
  let sellerLeads = sellerFilter === 'all' 
    ? appState.leads 
    : appState.leads.filter(l => {
        const sellerName = String(l.seller || '').toLowerCase();
        const filterName = sellerFilter.toLowerCase();
        return sellerName.includes(filterName) || filterName.includes(sellerName);
      });
      
  // 1. Total leads registered in period
  const leadsInPeriod = sellerLeads.filter(l => {
    const d = parseLeadDate(l.date);
    return isDateInPeriod(d, period);
  });
  const total = leadsInPeriod.length;
  
  const totalEl = document.getElementById('stat-total');
  if (totalEl) totalEl.textContent = total;
  
  // 2. Leads prospectados no período (leads únicos com algum contato)
  const contactedLeads = leadsInPeriod.filter(l => {
    return (l.status && l.status !== 'Novo' && l.status !== '') || (l.contacts && l.contacts.length > 0);
  });
  const contacted = contactedLeads.length;
  
  // Total touchpoints for sub-label
  let totalAttempts = 0;
  leadsInPeriod.forEach(l => {
    totalAttempts += (l.contacts || []).length;
  });
  
  // "Prospecções" = unique leads contacted (not total attempts)
  const contactedEl = document.getElementById('stat-contacted');
  if (contactedEl) contactedEl.textContent = contacted;
  
  const contactedPct = total > 0 ? Math.round((contacted / total) * 100) : 0;
  
  const contactedPctEl = document.getElementById('stat-contacted-pct');
  if (contactedPctEl) {
    contactedPctEl.innerHTML = `${totalAttempts} touchpoints &nbsp;•&nbsp; ${contactedPct}% do total`;
  }
  
  // 3. Reuniões Agendadas
  const meetingLeads = sellerLeads.filter(l => {
    const d = parseLeadDate(l.meetingDate);
    const isMeetingStatus = l.status === 'Reunião Agendada' || l.status === 'Show' || l.status === 'No-Show' || l.status === 'Venda Fechada' || l.status === 'Fechamento Não Realizado';
    return isDateInPeriod(d, period) && isMeetingStatus;
  });
  const meetings = meetingLeads.length;
  
  const meetingsEl = document.getElementById('stat-meetings');
  if (meetingsEl) meetingsEl.textContent = meetings;
  
  const meetingsPct = contacted > 0 ? Math.round((meetings / contacted) * 100) : 0;
  const meetingsPctEl = document.getElementById('stat-meetings-pct');
  if (meetingsPctEl) {
    meetingsPctEl.textContent = `${meetingsPct}% conversão`;
  }
  
  // 4. Vendas Realizadas and Faturamento Realizado in period
  const salesLeads = sellerLeads.filter(l => {
    const d = parseLeadDate(l.saleDate || l.date);
    return l.status === 'Venda Fechada' && isDateInPeriod(d, period);
  });
  const salesCount = salesLeads.length;
  
  const faturamentoRealizado = salesLeads.reduce((acc, l) => acc + (parseFloat(l.closedValue || l.value) || 0), 0);
  
  const salesQtdEl = document.getElementById('stat-vendas-qtd');
  if (salesQtdEl) salesQtdEl.textContent = salesCount;
  
  const salesConversion = meetings > 0 ? Math.round((salesCount / meetings) * 100) : 0;
  const salesConversionEl = document.getElementById('stat-vendas-conversion');
  if (salesConversionEl) {
    salesConversionEl.textContent = `${salesConversion}% conv. reun.`;
  }
  
  const faturamentoEl = document.getElementById('stat-faturamento');
  if (faturamentoEl) {
    faturamentoEl.textContent = `R$ ${faturamentoRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  // Update flat stats if they exist
  const statsAgendadasVal = document.getElementById('stats-agendadas-val');
  if (statsAgendadasVal) statsAgendadasVal.textContent = meetings;
  
  const statsLeadsVal = document.getElementById('stats-leads-val');
  if (statsLeadsVal) statsLeadsVal.textContent = total;
  
  const statsTotalReunioesVal = document.getElementById('stats-total-reunioes-val');
  if (statsTotalReunioesVal) statsTotalReunioesVal.textContent = meetings;
  
  // Show / No-Show / Fechamento Não Realizado counts in period
  const showsCount = meetingLeads.filter(l => l.status === 'Show' || l.status === 'Venda Fechada' || l.status === 'Fechamento Não Realizado').length;
  const noshowsCount = meetingLeads.filter(l => l.status === 'No-Show').length;
  const nofechouCount = meetingLeads.filter(l => l.status === 'Fechamento Não Realizado').length;
  
  const showRate = meetings > 0 ? Math.round((showsCount / meetings) * 100) : 0;
  const noshowRate = meetings > 0 ? Math.round((noshowsCount / meetings) * 100) : 0;
  const nofechouRate = meetings > 0 ? Math.round((nofechouCount / meetings) * 100) : 0;
  
  const showRateEl = document.getElementById('stats-show-rate-val');
  if (showRateEl) showRateEl.textContent = `${showRate}%`;
  
  const showCountEl = document.getElementById('stats-show-count');
  if (showCountEl) showCountEl.textContent = showsCount;
  
  const noshowRateEl = document.getElementById('stats-noshow-rate-val');
  if (noshowRateEl) noshowRateEl.textContent = `${noshowRate}%`;
  
  const noshowCountEl = document.getElementById('stats-noshow-count');
  if (noshowCountEl) noshowCountEl.textContent = noshowsCount;

  const nofechouRateEl = document.getElementById('stats-nofechou-rate-val');
  if (nofechouRateEl) nofechouRateEl.textContent = `${nofechouRate}%`;

  const nofechouCountEl = document.getElementById('stats-nofechou-count');
  if (nofechouCountEl) nofechouCountEl.textContent = nofechouCount;
  
  const statShowRate = document.getElementById('stat-show-rate');
  if (statShowRate) statShowRate.textContent = `${showRate}%`;
  
  const statShowCountLabel = document.getElementById('stat-show-count-label');
  if (statShowCountLabel) statShowCountLabel.textContent = `${showsCount} presenças`;
  
  // Render main dashboard funnels (Horizontal and Vertical) - 5 Stages
  
  let mainLeads = 0;
  let mainHandRaise = 0;
  let mainMeetings = 0;
  let mainShows = 0;
  let mainSales = 0;
  
  // Filter core funnel segments for the active period (salesLeads is already filtered above)
  
  const showsLeads = sellerLeads.filter(l => {
    const d = parseLeadDate(l.meetingDate);
    const isShowStatus = l.status === 'Show' || l.status === 'Venda Fechada' || l.status === 'Fechamento Não Realizado';
    return isDateInPeriod(d, period) && isShowStatus;
  });
  
  const meetingsLeads = sellerLeads.filter(l => {
    const d = parseLeadDate(l.meetingDate);
    const isMeetingStatus = l.status === 'Reunião Agendada' || l.status === 'Show' || l.status === 'No-Show' || l.status === 'Venda Fechada' || l.status === 'Fechamento Não Realizado';
    return isDateInPeriod(d, period) && isMeetingStatus;
  });

  const salesIds = new Set(salesLeads.map(l => l.id));
  const showsIds = new Set(showsLeads.map(l => l.id));
  const meetingsIds = new Set(meetingsLeads.map(l => l.id));
  
  // Propagação lógica: Toda venda já passou por show e reunião
  salesIds.forEach(id => showsIds.add(id));
  showsIds.forEach(id => meetingsIds.add(id));
  
  // Levantou Mão base para o período
  let handRaiseLeads = leadsInPeriod.filter(l => {
    return l.status === '✋/Em contato' || l.status === 'Reunião Agendada' || l.status === 'Show' || l.status === 'No-Show' || l.status === 'Fechamento Não Realizado' || l.status === 'Venda Fechada';
  });
  
  // Leads base para o período
  let baseLeads = [];
  if (sellerFilter === 'Ryan Az') {
    baseLeads = leadsInPeriod.filter(l => (l.status && l.status !== 'Novo' && l.status !== '') || (l.contacts && l.contacts.length > 0));
  } else if (sellerFilter === 'Vithor') {
    baseLeads = leadsInPeriod;
  } else {
    // Geral
    baseLeads = leadsInPeriod.filter(l => {
      const isRyan = String(l.seller || '').toLowerCase().includes('ryan');
      if (isRyan) {
        return (l.status && l.status !== 'Novo' && l.status !== '') || (l.contacts && l.contacts.length > 0);
      }
      return true; // Vithor
    });
  }
  
  const handRaiseIds = new Set(handRaiseLeads.map(l => l.id));
  const baseLeadsIds = new Set(baseLeads.map(l => l.id));
  
  // Propagação lógica: Toda reunião (ou show/venda) já levantou a mão e já foi um lead
  meetingsIds.forEach(id => handRaiseIds.add(id));
  handRaiseIds.forEach(id => baseLeadsIds.add(id));
  
  mainSales = salesIds.size;
  mainShows = showsIds.size;
  mainMeetings = meetingsIds.size;
  mainHandRaise = handRaiseIds.size;
  mainLeads = baseLeadsIds.size;

  const mainHandRaisePct = mainLeads > 0 ? Math.round((mainHandRaise / mainLeads) * 100) : 0;
  const mainMeetingsPct = mainLeads > 0 ? Math.round((mainMeetings / mainLeads) * 100) : 0;
  const mainShowsPct = mainLeads > 0 ? Math.round((mainShows / mainLeads) * 100) : 0;
  const mainSalesPct = mainLeads > 0 ? Math.round((mainSales / mainLeads) * 100) : 0;

  const mainStages = [
    { label: 'Leads', value: mainLeads, pct: 100, icon: '👥', gradient: 'linear-gradient(90deg, #3b82f6, #1d4ed8)' },
    { label: 'Levantou Mão', value: mainHandRaise, pct: mainHandRaisePct, icon: '✋', gradient: 'linear-gradient(90deg, #a855f7, #7c3aed)' },
    { label: 'Reuniões', value: mainMeetings, pct: mainMeetingsPct, icon: '📅', gradient: 'linear-gradient(90deg, #fbbf24, #d97706)' },
    { label: 'Shows', value: mainShows, pct: mainShowsPct, icon: '✅', gradient: 'linear-gradient(90deg, #34d399, #059669)' },
    { label: 'Vendas', value: mainSales, pct: mainSalesPct, icon: '💰', gradient: 'linear-gradient(90deg, #10b981, #047857)' }
  ];

  renderFunnelBar('main-funnel-horizontal', mainStages, 'horizontal');
  
  // Render main dashboard status pie/doughnut chart
  renderMainStatusPieChart(leadsInPeriod);

  // Apply values visibility blur
  applyValuesVisibility();
  
  // Update strategic metrics, goals, bottlenecks and insights
  updateIntelligenceCenter();
}

function renderMainStatusPieChart(leads) {
  const counts = {
    'Novo': 0,
    'Interagiu': 0,
    '✋/Em contato': 0,
    'Reunião Agendada': 0,
    'Show': 0,
    'No-Show': 0,
    'Fechamento Não Realizado': 0,
    'Venda Fechada': 0,
    'Sem Interesse': 0
  };
  
  leads.forEach(l => {
    const status = l.status || 'Novo';
    if (counts.hasOwnProperty(status)) {
      counts[status]++;
    } else {
      counts['Novo']++;
    }
  });
  
  const statusMeta = {
    'Novo': { label: '⛳ Novo', color: '#3b82f6' },
    'Interagiu': { label: '🔄 Interagiu', color: '#6366f1' },
    '✋/Em contato': { label: '✋ Em contato', color: '#a855f7' },
    'Reunião Agendada': { label: '📅 Agendada', color: '#fbbf24' },
    'Show': { label: '✅ Show', color: '#34d399' },
    'No-Show': { label: '❌ No-Show', color: '#f87171' },
    'Fechamento Não Realizado': { label: '📉 Não Realizado', color: '#ef4444' },
    'Venda Fechada': { label: '💰 Venda Fechada', color: '#10b981' },
    'Sem Interesse': { label: '🚫 Sem Interesse', color: '#64748b' }
  };
  
  const labels = [];
  const data = [];
  const backgroundColor = [];
  
  Object.keys(statusMeta).forEach(status => {
    const val = counts[status];
    if (val > 0) {
      labels.push(statusMeta[status].label);
      data.push(val);
      backgroundColor.push(statusMeta[status].color);
    }
  });
  
  // If empty, show fallback
  if (data.length === 0) {
    labels.push('Sem Leads');
    data.push(1);
    backgroundColor.push('#374151');
  }
  
  const pieCanvas = document.getElementById('main-pie-chart');
  if (!pieCanvas) return;
  
  const pieCtx = pieCanvas.getContext('2d');
  
  if (chartInstances.mainPie) {
    chartInstances.mainPie.destroy();
  }
  
  chartInstances.mainPie = new Chart(pieCtx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColor,
        borderWidth: 1,
        borderColor: '#1e293b'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#94a3b8',
            font: {
              family: "'Inter', sans-serif",
              size: 11
            },
            boxWidth: 12,
            padding: 8
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? Math.round((value / total) * 100) : 0;
              return ` ${label}: ${value} (${pct}%)`;
            }
          }
        }
      },
      cutout: '65%'
    }
  });
}

function updateDashboardView() {
  updateDashboardMetrics();
  updateDashboardCharts();
  updatePartnerRanking();
  
  const sellerFilter = document.getElementById('dashboard-seller-filter')?.value || 'all';
  const filteredLeads = sellerFilter === 'all'
    ? appState.leads
    : appState.leads.filter(l => {
        const sellerName = String(l.seller || '').toLowerCase();
        const filterName = sellerFilter.toLowerCase();
        return sellerName.includes(filterName) || filterName.includes(sellerName);
      });
  renderUpcomingMeetings(filteredLeads);
}

// UPDATE FINANCEIRO TAB VIEW & CALCULATIONS
function updateFinanceiroView() {
  const tabView = document.getElementById('view-financeiro');
  if (!tabView || tabView.classList.contains('hidden')) return; // Avoid chart sizing bugs in hidden divs
  
  const sellerFilter = document.getElementById('financeiro-seller-filter')?.value || 'all';
  const period = document.getElementById('financeiro-period-filter')?.value || 'all';
  
  // Filter leads by seller
  let sellerLeads = sellerFilter === 'all' 
    ? appState.leads 
    : appState.leads.filter(l => {
        const sellerName = String(l.seller || '').toLowerCase();
        const filterName = sellerFilter.toLowerCase();
        return sellerName.includes(filterName) || filterName.includes(sellerName);
      });
      
  // Filter sales leads in period
  const salesLeads = sellerLeads.filter(l => {
    if (l.status !== 'Venda Fechada') return false;
    const d = parseLeadDate(l.saleDate || l.date);
    return isDateInPeriod(d, period, true);
  });
  
  const salesCount = salesLeads.length;
  
  // Calculate revenue metrics
  let faturamentoRealizado = 0;
  let mrr = 0;
  let pontual = 0;
  
  salesLeads.forEach(l => {
    const val = parseFloat(l.closedValue || l.value) || 0;
    faturamentoRealizado += val;
    if (l.isRecurrent) {
      mrr += val;
    } else {
      pontual += val;
    }
  });
  
  const ticketMedio = salesCount > 0 ? faturamentoRealizado / salesCount : 0;
  
  // Calculate projected faturamento from pipeline leads of filtered seller
  let faturamentoProjetado = 0;
  sellerLeads.forEach(l => {
    if (l.status === 'Reunião Agendada' || l.status === 'Show') {
      const ticket = parseFloat(l.estimatedTicket) || 0;
      const probability = parseFloat(l.probability) || 50;
      faturamentoProjetado += (ticket * probability) / 100;
    }
  });
  
  // Update UI stats elements
  const realizadoEl = document.getElementById('financeiro-stat-realizado');
  if (realizadoEl) realizadoEl.textContent = `R$ ${faturamentoRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  const qtdEl = document.getElementById('financeiro-stat-vendas-qtd');
  if (qtdEl) qtdEl.textContent = salesCount;
  
  const mrrEl = document.getElementById('financeiro-right-mrr');
  if (mrrEl) mrrEl.textContent = `R$ ${mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  const pontualEl = document.getElementById('financeiro-right-pontual');
  if (pontualEl) pontualEl.textContent = `R$ ${pontual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  const projetadoEl = document.getElementById('financeiro-right-projetado');
  if (projetadoEl) projetadoEl.textContent = `R$ ${faturamentoProjetado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  const ticketEl = document.getElementById('financeiro-right-ticket-medio');
  if (ticketEl) ticketEl.textContent = `R$ ${ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  // Group categories dynamically
  const categoriesMap = {};
  sellerLeads.forEach(l => {
    const cat = l.category || 'Clínica Veterinária';
    if (!categoriesMap[cat]) {
      categoriesMap[cat] = { totalLeads: 0, salesCount: 0, closedValue: 0 };
    }
    
    // Total leads in period
    const dObj = parseLeadDate(l.date);
    if (isDateInPeriod(dObj, period, true)) {
      categoriesMap[cat].totalLeads++;
    }
    
    // Closed sales in period
    if (l.status === 'Venda Fechada') {
      const saleDObj = parseLeadDate(l.saleDate || l.date);
      if (isDateInPeriod(saleDObj, period, true)) {
        categoriesMap[cat].salesCount++;
        categoriesMap[cat].closedValue += parseFloat(l.closedValue || l.value) || 0;
      }
    }
  });
  
  // Render categories performance
  const categoriesBody = document.getElementById('financeiro-categorias-body');
  if (categoriesBody) {
    categoriesBody.innerHTML = '';
    const sortedCats = Object.keys(categoriesMap).sort((a, b) => categoriesMap[b].closedValue - categoriesMap[a].closedValue);
    
    if (sortedCats.length === 0) {
      categoriesBody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 1rem; color: var(--color-text-muted);">Nenhuma categoria registrada.</td></tr>`;
    } else {
      sortedCats.forEach(cat => {
        const stats = categoriesMap[cat];
        const totalForConv = Math.max(stats.totalLeads, stats.salesCount);
        const convRate = totalForConv > 0 ? Math.round((stats.salesCount / totalForConv) * 100) : 0;
        const valText = stats.closedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid rgba(255, 255, 255, 0.04)';
        row.innerHTML = `
          <td style="padding: 0.65rem 0.75rem; text-align: left; font-weight: 500; color: #fff;">${cat}</td>
          <td style="padding: 0.65rem 0.75rem; text-align: center; color: var(--color-text-secondary);">${convRate}% <span style="font-size: 0.75rem; color: var(--color-text-muted);">(${stats.salesCount}/${stats.totalLeads})</span></td>
          <td style="padding: 0.65rem 0.75rem; text-align: right; font-weight: 600; color: #10b981;" class="blur-sensitive">R$ ${valText}</td>
        `;
        categoriesBody.appendChild(row);
      });
    }
  }
  
  // Render recent contracts
  const recentSales = [...salesLeads].sort((a, b) => {
    const timeA = a.saleTimestamp || 0;
    const timeB = b.saleTimestamp || 0;
    return timeB - timeA;
  });
  
  const recentBody = document.getElementById('financeiro-recentes-body');
  const recentEmpty = document.getElementById('financeiro-recentes-vazio');
  if (recentBody) {
    recentBody.innerHTML = '';
    if (recentSales.length === 0) {
      if (recentEmpty) recentEmpty.style.display = 'block';
    } else {
      if (recentEmpty) recentEmpty.style.display = 'none';
      recentSales.forEach(sale => {
        const valueVal = parseFloat(sale.closedValue || sale.value) || 0;
        const valText = valueVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const typeText = sale.isRecurrent 
          ? '<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 0.72rem; padding: 2px 6px;">Recorrente</span>' 
          : '<span class="badge" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3); font-size: 0.72rem; padding: 2px 6px;">Pontual</span>';
        
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid rgba(255, 255, 255, 0.04)';
        row.innerHTML = `
          <td style="padding: 0.65rem 0.75rem; text-align: left; font-weight: 500; color: #fff;">${sale.name}</td>
          <td style="padding: 0.65rem 0.75rem; text-align: left; color: var(--color-text-secondary);">${sale.seller || 'Ryan Az'}</td>
          <td style="padding: 0.65rem 0.75rem; text-align: left; color: var(--color-text-muted);">${sale.saleDate || sale.date}</td>
          <td style="padding: 0.65rem 0.75rem; text-align: left;">${typeText}</td>
          <td style="padding: 0.65rem 0.75rem; text-align: right; font-weight: 600; color: #fff;" class="blur-sensitive">R$ ${valText}</td>
        `;
        recentBody.appendChild(row);
      });
    }
  }
  
  // Render Doughnut Composition Chart
  const pieCanvas = document.getElementById('financeiro-pie-chart');
  if (pieCanvas) {
    const pieCtx = pieCanvas.getContext('2d');
    
    if (chartInstances.financeiroPie) {
      chartInstances.financeiroPie.destroy();
    }
    
    const sum = mrr + pontual;
    const recPct = sum > 0 ? Math.round((mrr / sum) * 100) : 0;
    const pontPct = sum > 0 ? Math.round((pontual / sum) * 100) : 0;
    
    const chartData = sum > 0 ? [mrr, pontual] : [0, 0];
    const chartColors = ['#10b981', '#3b82f6'];
    
    if (sum === 0) {
      chartData[0] = 1;
      chartColors[0] = '#374151';
      chartColors[1] = '#374151';
    }
    
    chartInstances.financeiroPie = new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: ['Recorrente (MRR)', 'Pontual / Setup'],
        datasets: [{
          data: chartData,
          backgroundColor: chartColors,
          borderWidth: 1,
          borderColor: '#1e293b'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: sum > 0,
            callbacks: {
              label: function(context) {
                const val = context.raw;
                if (sum === 0) return '';
                return ` R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${context.dataIndex === 0 ? recPct : pontPct}%)`;
              }
            }
          }
        },
        cutout: '70%'
      }
    });
    
    // Render custom legend
    const legendEl = document.getElementById('financeiro-pie-legend');
    if (legendEl) {
      legendEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem;">
          <div style="display: flex; align-items: center; gap: 0.45rem;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span>
            <span style="color: var(--color-text-secondary);">Recorrente</span>
          </div>
          <span style="color: #fff; font-weight: 600;" class="blur-sensitive">${recPct}% (R$ ${mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem;">
          <div style="display: flex; align-items: center; gap: 0.45rem;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #3b82f6;"></span>
            <span style="color: var(--color-text-secondary);">Pontual</span>
          </div>
          <span style="color: #fff; font-weight: 600;" class="blur-sensitive">${pontPct}% (R$ ${pontual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</span>
        </div>
      `;
    }
  }
  
  // Re-apply visibility blur if values are toggled hidden
  applyValuesVisibility();
}

// PARTNER COMPARATIVE RANKING / LEADERBOARD LOGIC
function updatePartnerRanking() {
  const leads = appState.leads;
  
  const stats = {
    ryan: { leads: 0, contatados: 0, levantadasMao: 0, reunioes: 0, shows: 0, noshows: 0, vendas: 0, faturamento: 0, touchpoints: 0, semInteresse: 0 },
    vithor: { leads: 0, contatados: 0, levantadasMao: 0, reunioes: 0, shows: 0, noshows: 0, vendas: 0, faturamento: 0, touchpoints: 0, semInteresse: 0 }
  };
  
  leads.forEach(l => {
    const seller = (l.seller || '').toLowerCase();
    let partner = null;
    if (seller.includes('ryan')) {
      partner = stats.ryan;
    } else if (seller.includes('vithor')) {
      partner = stats.vithor;
    }
    
    if (partner) {
      partner.leads++;
      partner.touchpoints += (l.contacts || []).length;
      
      // Contatados: status no longer Novo and not empty, OR has contacts history
      if ((l.status && l.status !== 'Novo' && l.status !== '') || (l.contacts && l.contacts.length > 0)) {
        partner.contatados++;
      }
      
      // Levantou Mão: status is Em contato, Reunião, Show, No-show, etc.
      const isHandRaise = l.status === '✋/Em contato' || l.status === 'Reunião Agendada' || l.status === 'Show' || l.status === 'No-Show' || l.status === 'Fechamento Não Realizado' || l.status === 'Venda Fechada';
      if (isHandRaise) {
        partner.levantadasMao++;
      }
      
      if (l.status === 'Reunião Agendada') {
        partner.reunioes++;
      } else if (l.status === 'Show' || l.status === 'Fechamento Não Realizado') {
        partner.reunioes++;
        partner.shows++;
      } else if (l.status === 'No-Show') {
        partner.reunioes++;
        partner.noshows++;
      } else if (l.status === 'Venda Fechada') {
        partner.reunioes++;
        partner.shows++;
        partner.vendas++;
        partner.faturamento += parseFloat(l.closedValue || l.value) || 0;
      } else if (l.status === 'Sem Interesse') {
        partner.semInteresse++;
      }
    }
  });
  
  // Ryan rates
  const ryanLeads = stats.ryan.leads;
  const ryanReunioes = stats.ryan.reunioes;
  const ryanShows = stats.ryan.shows;
  const ryanSales = stats.ryan.vendas;
  
  const ryanProspecReuniao = ryanLeads > 0 ? Math.round((ryanReunioes / ryanLeads) * 100) : 0;
  const ryanShowFechamento = ryanShows > 0 ? Math.round((ryanSales / ryanShows) * 100) : 0;
  const ryanShowRate = ryanReunioes > 0 ? Math.round((ryanShows / ryanReunioes) * 100) : 0;
  
  // Vithor rates
  const vithorLeads = stats.vithor.leads;
  const vithorReunioes = stats.vithor.reunioes;
  const vithorShows = stats.vithor.shows;
  const vithorSales = stats.vithor.vendas;
  
  const vithorProspecReuniao = vithorLeads > 0 ? Math.round((vithorReunioes / vithorLeads) * 100) : 0;
  const vithorShowFechamento = vithorShows > 0 ? Math.round((vithorSales / vithorShows) * 100) : 0;
  const vithorShowRate = vithorReunioes > 0 ? Math.round((vithorShows / vithorReunioes) * 100) : 0;
  
  // Update Ryan UI Elements
  const ryanLeadsEl = document.getElementById('ryan-rank-leads');
  const ryanReunioesEl = document.getElementById('ryan-rank-reunioes');
  const ryanVendasEl = document.getElementById('ryan-rank-vendas');
  const ryanRateProspecReuniaoEl = document.getElementById('ryan-rate-prospec-reuniao');
  const ryanRateShowFechamentoEl = document.getElementById('ryan-rate-show-fechamento');
  
  const ryanShowRateEl = document.getElementById('ryan-rank-show-rate');
  const ryanNoshowsEl = document.getElementById('ryan-rank-noshows');
  const ryanTouchpointsEl = document.getElementById('ryan-rank-touchpoints');
  const ryanSemInteresseEl = document.getElementById('ryan-rank-seminteresse');
  const ryanFaturamentoEl = document.getElementById('ryan-rank-faturamento');
  
  if (ryanLeadsEl) ryanLeadsEl.textContent = stats.ryan.leads;
  if (ryanReunioesEl) ryanReunioesEl.textContent = stats.ryan.reunioes;
  if (ryanVendasEl) ryanVendasEl.textContent = stats.ryan.vendas;
  if (ryanRateProspecReuniaoEl) ryanRateProspecReuniaoEl.textContent = `${ryanProspecReuniao}%`;
  if (ryanRateShowFechamentoEl) ryanRateShowFechamentoEl.textContent = `${ryanShowFechamento}%`;
  
  if (ryanShowRateEl) ryanShowRateEl.textContent = `${ryanShowRate}%`;
  if (ryanNoshowsEl) ryanNoshowsEl.textContent = stats.ryan.noshows;
  if (ryanTouchpointsEl) ryanTouchpointsEl.textContent = stats.ryan.touchpoints;
  if (ryanSemInteresseEl) ryanSemInteresseEl.textContent = stats.ryan.semInteresse;
  if (ryanFaturamentoEl) {
    ryanFaturamentoEl.textContent = `R$ ${stats.ryan.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  // Update Vithor UI Elements
  const vithorLeadsEl = document.getElementById('vithor-rank-leads');
  const vithorReunioesEl = document.getElementById('vithor-rank-reunioes');
  const vithorVendasEl = document.getElementById('vithor-rank-vendas');
  const vithorRateProspecReuniaoEl = document.getElementById('vithor-rate-prospec-reuniao');
  const vithorRateShowFechamentoEl = document.getElementById('vithor-rate-show-fechamento');
  
  const vithorShowRateEl = document.getElementById('vithor-rank-show-rate');
  const vithorNoshowsEl = document.getElementById('vithor-rank-noshows');
  const vithorTouchpointsEl = document.getElementById('vithor-rank-touchpoints');
  const vithorSemInteresseEl = document.getElementById('vithor-rank-seminteresse');
  const vithorFaturamentoEl = document.getElementById('vithor-rank-faturamento');
  
  if (vithorLeadsEl) vithorLeadsEl.textContent = stats.vithor.leads;
  if (vithorReunioesEl) vithorReunioesEl.textContent = stats.vithor.reunioes;
  if (vithorVendasEl) vithorVendasEl.textContent = stats.vithor.vendas;
  if (vithorRateProspecReuniaoEl) vithorRateProspecReuniaoEl.textContent = `${vithorProspecReuniao}%`;
  if (vithorRateShowFechamentoEl) vithorRateShowFechamentoEl.textContent = `${vithorShowFechamento}%`;
  
  if (vithorShowRateEl) vithorShowRateEl.textContent = `${vithorShowRate}%`;
  if (vithorNoshowsEl) vithorNoshowsEl.textContent = stats.vithor.noshows;
  if (vithorTouchpointsEl) vithorTouchpointsEl.textContent = stats.vithor.touchpoints;
  if (vithorSemInteresseEl) vithorSemInteresseEl.textContent = stats.vithor.semInteresse;
  if (vithorFaturamentoEl) {
    vithorFaturamentoEl.textContent = `R$ ${stats.vithor.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  // Render visual funnel charts for both partners (5 stages, horizontal mode)
  const ryanLeadsVal = stats.ryan.contatados;
  const ryanLevantadasMaoPct = ryanLeadsVal > 0 ? Math.round((stats.ryan.levantadasMao / ryanLeadsVal) * 100) : 0;
  const ryanReunioesPct = ryanLeadsVal > 0 ? Math.round((stats.ryan.reunioes / ryanLeadsVal) * 100) : 0;
  const ryanShowsPct = ryanLeadsVal > 0 ? Math.round((stats.ryan.shows / ryanLeadsVal) * 100) : 0;
  const ryanVendasPct = ryanLeadsVal > 0 ? Math.round((stats.ryan.vendas / ryanLeadsVal) * 100) : 0;
  
  const ryanStages = [
    { label: 'Leads', value: ryanLeadsVal, pct: 100, icon: '👥', gradient: 'linear-gradient(90deg, #3b82f6, #1d4ed8)' },
    { label: 'Levantou Mão', value: stats.ryan.levantadasMao, pct: ryanLevantadasMaoPct, icon: '✋', gradient: 'linear-gradient(90deg, #a855f7, #7c3aed)' },
    { label: 'Reuniões', value: stats.ryan.reunioes, pct: ryanReunioesPct, icon: '📅', gradient: 'linear-gradient(90deg, #fbbf24, #d97706)' },
    { label: 'Shows', value: stats.ryan.shows, pct: ryanShowsPct, icon: '✅', gradient: 'linear-gradient(90deg, #34d399, #059669)' },
    { label: 'Vendas', value: stats.ryan.vendas, pct: ryanVendasPct, icon: '💰', gradient: 'linear-gradient(90deg, #10b981, #047857)' }
  ];
  renderFunnelBar('ryan-funnel-container', ryanStages, 'horizontal');
  
  const vithorLeadsVal = stats.vithor.leads;
  const vithorLevantadasMaoPct = vithorLeadsVal > 0 ? Math.round((stats.vithor.levantadasMao / vithorLeadsVal) * 100) : 0;
  const vithorReunioesPct = vithorLeadsVal > 0 ? Math.round((stats.vithor.reunioes / vithorLeadsVal) * 100) : 0;
  const vithorShowsPct = vithorLeadsVal > 0 ? Math.round((stats.vithor.shows / vithorLeadsVal) * 100) : 0;
  const vithorVendasPct = vithorLeadsVal > 0 ? Math.round((stats.vithor.vendas / vithorLeadsVal) * 100) : 0;
  
  const vithorStages = [
    { label: 'Leads', value: vithorLeadsVal, pct: 100, icon: '👥', gradient: 'linear-gradient(90deg, #3b82f6, #1d4ed8)' },
    { label: 'Levantou Mão', value: stats.vithor.levantadasMao, pct: vithorLevantadasMaoPct, icon: '✋', gradient: 'linear-gradient(90deg, #a855f7, #7c3aed)' },
    { label: 'Reuniões', value: stats.vithor.reunioes, pct: vithorReunioesPct, icon: '📅', gradient: 'linear-gradient(90deg, #fbbf24, #d97706)' },
    { label: 'Shows', value: stats.vithor.shows, pct: vithorShowsPct, icon: '✅', gradient: 'linear-gradient(90deg, #34d399, #059669)' },
    { label: 'Vendas', value: stats.vithor.vendas, pct: vithorVendasPct, icon: '💰', gradient: 'linear-gradient(90deg, #10b981, #047857)' }
  ];
  renderFunnelBar('vithor-funnel-container', vithorStages, 'horizontal');
  
  // Determine Leader based on Faturamento Realizado (if tied, closed sales, if tied, shows)
  let ryanIsLeader = false;
  let vithorIsLeader = false;
  
  if (stats.ryan.faturamento > stats.vithor.faturamento) {
    ryanIsLeader = true;
  } else if (stats.vithor.faturamento > stats.ryan.faturamento) {
    vithorIsLeader = true;
  } else {
    // Tie breaker: sales
    if (stats.ryan.vendas > stats.vithor.vendas) {
      ryanIsLeader = true;
    } else if (stats.vithor.vendas > stats.ryan.vendas) {
      vithorIsLeader = true;
    } else {
      // Tie breaker 2: shows
      if (stats.ryan.shows >= stats.vithor.shows) {
        ryanIsLeader = true;
      } else {
        vithorIsLeader = true;
      }
    }
  }
  
  const ryanBadge = document.getElementById('ryan-leader-badge');
  const vithorBadge = document.getElementById('vithor-leader-badge');
  const ryanPos = document.getElementById('ryan-rank-pos');
  const vithorPos = document.getElementById('vithor-rank-pos');
  const ryanCard = document.getElementById('ranking-card-ryan');
  const vithorCard = document.getElementById('ranking-card-vithor');
  
  const ryanCrown = document.getElementById('ryan-rank-crown');
  const vithorCrown = document.getElementById('vithor-rank-crown');
  
  if (ryanBadge && vithorBadge && ryanPos && vithorPos && ryanCard && vithorCard) {
    if (ryanIsLeader) {
      ryanBadge.classList.remove('hidden');
      vithorBadge.classList.add('hidden');
      ryanPos.textContent = '👑 1º';
      vithorPos.textContent = '2º';
      ryanPos.style.color = '#f59e0b'; // Gold color for leader
      vithorPos.style.color = 'rgba(255,255,255,0.15)';
      ryanCard.style.borderColor = 'rgba(245, 158, 11, 0.4)'; // Gold border
      vithorCard.style.borderColor = 'var(--color-border)';
      
      if (ryanCrown) ryanCrown.classList.remove('hidden');
      if (vithorCrown) vithorCrown.classList.add('hidden');
    } else {
      vithorBadge.classList.remove('hidden');
      ryanBadge.classList.add('hidden');
      vithorPos.textContent = '👑 1º';
      ryanPos.textContent = '2º';
      vithorPos.style.color = '#f59e0b';
      ryanPos.style.color = 'rgba(255,255,255,0.15)';
      vithorCard.style.borderColor = 'rgba(245, 158, 11, 0.4)';
      ryanCard.style.borderColor = 'var(--color-border)';
      
      if (vithorCrown) vithorCrown.classList.remove('hidden');
      if (ryanCrown) ryanCrown.classList.add('hidden');
    }
  }
}

// Convert DD/MM/YYYY and HH:MM to Date object for sorting
function getMeetingDateObj(lead) {
  if (!lead.meetingDate) return new Date(2999, 11, 31);
  const dParts = lead.meetingDate.split('/');
  if (dParts.length !== 3) return new Date(2999, 11, 31);
  const tParts = (lead.meetingTime || '00:00').split(':');
  
  const day = parseInt(dParts[0], 10);
  const month = parseInt(dParts[1], 10) - 1;
  const year = parseInt(dParts[2], 10);
  const hour = parseInt(tParts[0], 10) || 0;
  const minute = parseInt(tParts[1], 10) || 0;
  
  return new Date(year, month, day, hour, minute);
}

// RENDER UPCOMING MEETINGS WIDGET
function renderUpcomingMeetings(leads) {
  const container = document.getElementById('upcoming-meetings-list');
  const countBadge = document.getElementById('upcoming-meetings-count');
  if (!container) return;
  
  container.innerHTML = '';
  
  const upcoming = leads
    .filter(l => l.status === 'Reunião Agendada')
    .sort((a, b) => getMeetingDateObj(a) - getMeetingDateObj(b));
    
  if (countBadge) {
    countBadge.textContent = `${upcoming.length} agendados`;
  }
  
  if (upcoming.length === 0) {
    container.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: var(--color-text-muted); font-size: 0.82rem; border: 1px dashed var(--color-border); border-radius: 8px;">Nenhuma reunião agendada pendente para este assessor.</div>`;
    return;
  }
  
  upcoming.forEach(lead => {
    const isPast = isMeetingDatePast(lead.meetingDate);
    const alertBadge = isPast ? '<span class="trend-pill trend-cyan" style="background-color: var(--color-danger-bg); color: var(--color-danger); font-size: 0.65rem; font-weight: 700; margin-left: 0.25rem;">ATRASADO</span>' : '';
    const timeStr = lead.meetingTime ? ` às ${lead.meetingTime}` : '';
    const decisorMarkup = lead.decisor ? `👤 <strong>Decisor:</strong> ${lead.decisor}` : '👤 Sem decisor';
    const emailMarkup = lead.email ? `✉️ ${lead.email}` : '';
    const phoneMarkup = lead.phone ? `📞 ${lead.phone}` : '';
    
    // Warmup tag styling
    let warmupTag = '';
    if (lead.warmup !== undefined && lead.warmup !== '') {
      const score = parseInt(lead.warmup, 10);
      let icon = '❄️';
      let tagClass = 'trend-neutral';
      if (score >= 8) { icon = '🔥'; tagClass = 'trend-green'; }
      else if (score >= 5) { icon = '⚡'; tagClass = 'trend-gold'; }
      warmupTag = `<span class="trend-pill ${tagClass}" style="font-size: 0.65rem; font-weight: 700;">${icon} ${score}/10</span>`;
    }
    
    const item = document.createElement('div');
    item.className = 'upcoming-meeting-item';
    item.style.cssText = `
      background-color: var(--color-bg-main);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 0.85rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: var(--transition-fast);
      gap: 1rem;
    `;
    
    // Hover interactions
    item.onmouseenter = () => { 
      item.style.borderColor = 'var(--color-primary)'; 
      item.style.backgroundColor = 'rgba(255, 255, 255, 0.01)'; 
    };
    item.onmouseleave = () => { 
      item.style.borderColor = 'var(--color-border)'; 
      item.style.backgroundColor = 'var(--color-bg-main)'; 
    };
    
    item.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.35rem; flex: 1;">
        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <strong style="font-size: 0.88rem; color: #fff;">${lead.name}</strong>
          <span style="font-size: 0.72rem; color: var(--color-primary); background-color: var(--color-primary-glow); padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 700; font-family: monospace;">📅 ${lead.meetingDate}${timeStr}</span>
          ${alertBadge}
          ${warmupTag}
        </div>
        <div style="font-size: 0.76rem; color: var(--color-text-secondary); display: flex; gap: 1rem; flex-wrap: wrap;">
          <span>${decisorMarkup}</span>
          ${emailMarkup ? `<span>${emailMarkup}</span>` : ''}
          ${phoneMarkup ? `<span>${phoneMarkup}</span>` : ''}
        </div>
      </div>
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <button class="btn btn-secondary btn-sm" onclick="openScriptDrawerForLead('${lead.id}')" title="Abordar pelo WhatsApp" style="height: 30px; font-size: 0.72rem; padding: 0.25rem 0.5rem;">
          💬 Abordar
        </button>
        <button class="btn btn-primary btn-sm" onclick="openMeetingDateModal('${lead.id}')" title="Reagendar" style="height: 30px; font-size: 0.72rem; padding: 0.25rem 0.5rem;">
          📅 Reagendar
        </button>
        <button class="btn btn-sm" onclick="downloadLeadProtocolDirect('${lead.id}')" title="Baixar Protocolo PDF" style="height: 30px; font-size: 0.72rem; padding: 0.25rem 0.5rem; background-color: rgba(43, 194, 209, 0.15); border: 1px solid rgba(43, 194, 209, 0.35); color: #2bc2d1;">
          📄 Protocolo
        </button>
      </div>
    `;
    
    container.appendChild(item);
  });
}

// FILTER & SORT GRID
function filterGrid() {
  const searchQuery = document.getElementById('grid-search').value.toLowerCase().trim();
  const statusFilter = document.getElementById('filter-status').value;
  const priorityFilter = document.getElementById('filter-priority').value;
  
  // Get active logged in user
  let activeUser = 'Ryan Az';
  try {
    const user = JSON.parse(localStorage.getItem('voxecrm_current_user'));
    if (user && user.name) {
      activeUser = user.name;
    }
  } catch (e) {}

  appState.filteredLeads = appState.leads.filter(lead => {
    // Check if lead belongs to the active profile to keep bases clean and separated
    if (activeUser === 'Vithor') {
      // Vithor only sees leads from Google Sheets (Organic) or leads assigned to him
      const isFromGsheets = lead.channel && (
        lead.channel.toLowerCase().includes('orgânico') ||
        lead.channel.toLowerCase().includes('organico') ||
        lead.channel.toLowerCase().includes('respondi') ||
        lead.channel.toLowerCase().includes('sheets')
      );
      const isVithorSeller = String(lead.seller || '').toLowerCase() === 'vithor';
      if (!isFromGsheets && !isVithorSeller) return false;
    } else {
      // Ryan only sees cold leads/Maps leads and hides Vithor's organic leads
      const isFromGsheets = lead.channel && (
        lead.channel.toLowerCase().includes('orgânico') ||
        lead.channel.toLowerCase().includes('organico') ||
        lead.channel.toLowerCase().includes('respondi') ||
        lead.channel.toLowerCase().includes('sheets')
      );
      const isVithorSeller = String(lead.seller || '').toLowerCase() === 'vithor';
      if (isFromGsheets || isVithorSeller) return false;
    }

    // Search filter
    const matchSearch = searchQuery === '' || 
      (lead.name && lead.name.toLowerCase().includes(searchQuery)) ||
      (lead.phone && lead.phone.toLowerCase().includes(searchQuery)) ||
      (lead.website && lead.website.toLowerCase().includes(searchQuery)) ||
      (lead.address && lead.address.toLowerCase().includes(searchQuery)) ||
      (lead.notes && lead.notes.toLowerCase().includes(searchQuery));
      
    // Status filter
    const matchStatus = statusFilter === 'all' || lead.status === statusFilter;
    
    // Priority filter
    const matchPriority = priorityFilter === 'all' || lead.priority === priorityFilter;
    
    return matchSearch && matchStatus && matchPriority;
  });
  
  // Apply Sort
  sortData();
  
  // Render
  renderGridRows();
}

function sortTable(field) {
  if (appState.sortField === field) {
    appState.sortAscending = !appState.sortAscending;
  } else {
    appState.sortField = field;
    appState.sortAscending = true;
  }
  
  // Update indicators
  document.querySelectorAll('.excel-table th').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
  });
  
  const activeTh = document.querySelector(`.excel-table th[data-field="${field}"]`);
  if (activeTh) {
    activeTh.classList.add(appState.sortAscending ? 'sort-asc' : 'sort-desc');
  }
  
  sortData();
  renderGridRows();
}

function sortData() {
  const field = appState.sortField;
  const asc = appState.sortAscending;
  
  appState.filteredLeads.sort((a, b) => {
    let valA = a[field] !== undefined ? a[field] : '';
    let valB = b[field] !== undefined ? b[field] : '';
    
    // Convert numbers if numeric field
    if (field === 'value') {
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
    } else {
      valA = valA.toString().toLowerCase();
      valB = valB.toString().toLowerCase();
    }
    
    if (valA < valB) return asc ? -1 : 1;
    if (valA > valB) return asc ? 1 : -1;
    return 0;
  });
}

function getContactsCellMarkup(lead) {
  const contacts = lead.contacts || [];
  if (contacts.length === 0) {
    return `<span style="color: var(--color-text-muted); font-style: italic; cursor: pointer;" onclick="event.stopPropagation(); openScriptDrawerForLead('${lead.id}')">-</span>`;
  }
  
  let msgs = 0;
  let calls = 0;
  contacts.forEach(c => {
    if (c.type === 'Mensagem') msgs++;
    else if (c.type === 'Ligação') calls++;
  });
  
  let markup = '';
  if (msgs > 0) {
    markup += `<span class="contacts-pill-msg" title="${msgs} mensagem(ns)">${msgs}💬</span>`;
  }
  if (calls > 0) {
    if (markup) markup += ' ';
    markup += `<span class="contacts-pill-call" title="${calls} ligação(ões)">${calls}📞</span>`;
  }
  
  return `<div class="contacts-badge-container" onclick="event.stopPropagation(); openScriptDrawerForLead('${lead.id}')">${markup}</div>`;
}

// RENDER SPREADSHEET
function renderGridRows() {
  const tbody = document.getElementById('excel-table-body');
  tbody.innerHTML = '';
  
  // Update count indicators
  document.getElementById('displayed-rows-count').textContent = appState.filteredLeads.length;
  document.getElementById('total-rows-count').textContent = appState.leads.length;
  
  if (appState.filteredLeads.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center" style="padding: 2.5rem; color: var(--color-text-muted);">Nenhum prospect corresponde aos filtros aplicados.</td></tr>`;
    return;
  }
  
  appState.filteredLeads.forEach(lead => {
    const isRowChecked = appState.selectedLeadIds.includes(lead.id);
    const row = document.createElement('tr');
    row.id = `row-${lead.id}`;
    
    // Add Excel-like conditional formatting class based on status
    if (lead.status === 'Novo') row.className = 'row-status-novo';
    else if (lead.status === '✋/Em contato') row.className = 'row-status-contato';
    else if (lead.status === 'Interagiu') row.className = 'row-status-interagiu';
    else if (lead.status === 'Reunião Agendada') {
      if (isMeetingDatePast(lead.meetingDate)) {
        row.className = 'row-sla-expired';
      } else {
        row.className = 'row-status-agendado';
      }
    }
    else if (lead.status === 'Show') row.className = 'row-status-show';
    else if (lead.status === 'No-Show') row.className = 'row-status-noshow';
    else if (lead.status === 'Fechamento Não Realizado') row.className = 'row-status-nofechou';
    else if (lead.status === 'Venda Fechada') row.className = 'row-status-venda';
    else if (lead.status === 'Sem Interesse') row.className = 'row-status-semfoco';
    
    if (isRowChecked) row.classList.add('row-checked');
    
    // Actions Cell with 3-dots dropdown menu
    const isElligibleForClose = lead.status === 'Reunião Agendada' || lead.status === 'Show' || lead.status === 'Fechamento Não Realizado';
    const closeSaleBtnHtml = isElligibleForClose ? `<button class="dropdown-item" style="color: #10b981; font-weight: 500;" onclick="openCloseSaleModal('${lead.id}')">💰 Fechar Venda</button>` : '';
    const hasMeeting = lead.status === 'Reunião Agendada' && lead.meetingDate;
    const protocolBtnHtml = hasMeeting ? `<button class="dropdown-item" style="color: #2bc2d1;" onclick="downloadLeadProtocolDirect('${lead.id}')">📄 Protocolo PDF</button>` : '';
    
    let rowHtml = `
      <td class="col-actions">
        <div class="row-actions-dropdown">
          <button class="btn-dots" onclick="toggleRowActionsMenu(event, '${lead.id}')" title="Ações">⋮</button>
          <div class="dropdown-menu hidden" id="dropdown-${lead.id}">
            <button class="dropdown-item" onclick="openScriptDrawerForLead('${lead.id}')">💬 Abordar</button>
            ${protocolBtnHtml}
            ${closeSaleBtnHtml}
            <button class="dropdown-item btn-delete" onclick="deleteLeadSingle('${lead.id}', '${lead.name.replace(/'/g, "\\'")}')">🗑️ Deletar</button>
          </div>
        </div>
      </td>
    `;
    
    // Data Cells with visibility toggles (Clean Re-ordered)
    let activeUser = 'Ryan Az';
    try {
      const user = JSON.parse(localStorage.getItem('voxecrm_current_user'));
      if (user && user.name) {
        activeUser = user.name;
      }
    } catch (e) {}

    if (activeUser === 'Vithor') {
      // 1. Decisor (É um prazer te receber aqui!)
      const decisorVal = lead.decisor || '';
      const decisorMarkup = decisorVal !== '' ? decisorVal : `<span style="color: var(--color-text-muted); font-style: italic;">Definir...</span>`;
      rowHtml += renderCell('decisor', lead.id, lead.decisor, decisorMarkup);
      
      // 2. Phone (Prazer, ___!)
      let phoneMarkup = lead.phone || '';
      if (phoneMarkup && phoneMarkup !== '""') {
        phoneMarkup = `${lead.phone} <span class="cell-copy-icon" onclick="copyPhoneToClipboard(event, '${lead.phone}')" title="Copiar Telefone">📋</span>`;
      }
      rowHtml += renderCell('phone', lead.id, lead.phone, phoneMarkup);
      
      // 3. Email (Qual é o seu melhor e-mail?)
      const emailVal = lead.email || '';
      const emailMarkup = emailVal !== '' ? emailVal : `<span style="color: var(--color-text-muted); font-style: italic;">Definir...</span>`;
      rowHtml += renderCell('email', lead.id, lead.email, emailMarkup);
      
      // 4. Category (___, você tem um consultório, clínica ou hospital veterinário?)
      rowHtml += renderCell('category', lead.id, lead.category);
      
      // 5. Name (___, e qual o nome da ___ 🤔?)
      rowHtml += renderCell('name', lead.id, lead.name);
      
      // 6. Notes (___, precisamos de mais informações sobre a ___. Hoje ___, em média, ela está faturando quanto ao mês?)
      const notesVal = lead.notes || '';
      const notesMarkup = notesVal !== '' ? notesVal : `<span style="color: var(--color-text-muted); font-style: italic;">Adicionar nota...</span>`;
      rowHtml += renderCell('notes', lead.id, lead.notes, notesMarkup);
      
      // 7. Warmup (Pontuação)
      rowHtml += renderCell('warmup', lead.id, lead.warmup, getWarmupMarkup(lead.warmup));
      
      // 8. Date (Data)
      const dateVal = lead.date || '-';
      rowHtml += renderCell('date', lead.id, lead.date, dateVal);
      
      // 9. Respondi ID (ID)
      const idVal = lead.respondiId || lead.id || '-';
      rowHtml += renderCell('respondiId', lead.id, lead.respondiId, idVal);
      
      // 10. Status
      let statusMarkup = `<span class="badge ${getStatusBadgeClass(lead.status)}">${lead.status || 'Novo'}</span>`;
      if (lead.status === 'Reunião Agendada') {
        if (lead.meetingDate) {
          const timeStr = lead.meetingTime ? ` às ${lead.meetingTime}` : '';
          const isPast = isMeetingDatePast(lead.meetingDate);
          const alertIcon = isPast ? '⚠️ ' : '';
          const pillClass = isPast ? 'meeting-date-pill meeting-date-past' : 'meeting-date-pill';
          statusMarkup += `<div class="${pillClass}" onclick="event.stopPropagation(); openMeetingDateModal('${lead.id}')" title="Clique para remarcar">${alertIcon}📅 ${lead.meetingDate}${timeStr}</div>`;
          statusMarkup += `<div class="protocol-pdf-pill" onclick="event.stopPropagation(); downloadLeadProtocolDirect('${lead.id}')" title="Baixar Protocolo PDF">📄 PDF Protocolo</div>`;
        } else {
          statusMarkup += `<div class="meeting-date-pill" style="background-color: rgba(250, 137, 107, 0.1); border: 1px dashed rgba(250, 137, 107, 0.45); color: #fa896b;" onclick="event.stopPropagation(); openMeetingDateModal('${lead.id}')" title="Clique para definir data/hora">📅 Definir data...</div>`;
        }
      }
      rowHtml += renderCell('status', lead.id, lead.status, statusMarkup);
      
      // 11. Contacts (Contatos)
      rowHtml += renderCell('contacts', lead.id, lead.contacts ? lead.contacts.length : 0, getContactsCellMarkup(lead));
      
    } else {
      // Ryan / Default order
      rowHtml += renderCell('name', lead.id, lead.name);
      
      const decisorVal = lead.decisor || '';
      const decisorMarkup = decisorVal !== '' ? decisorVal : `<span style="color: var(--color-text-muted); font-style: italic;">Definir...</span>`;
      rowHtml += renderCell('decisor', lead.id, lead.decisor, decisorMarkup);
      
      let phoneMarkup = lead.phone || '';
      if (phoneMarkup && phoneMarkup !== '""') {
        phoneMarkup = `${lead.phone} <span class="cell-copy-icon" onclick="copyPhoneToClipboard(event, '${lead.phone}')" title="Copiar Telefone">📋</span>`;
      }
      rowHtml += renderCell('phone', lead.id, lead.phone, phoneMarkup);

      rowHtml += renderCell('contacts', lead.id, lead.contacts ? lead.contacts.length : 0, getContactsCellMarkup(lead));
      
      const emailVal = lead.email || '';
      const emailMarkup = emailVal !== '' ? emailVal : `<span style="color: var(--color-text-muted); font-style: italic;">Definir...</span>`;
      rowHtml += renderCell('email', lead.id, lead.email, emailMarkup);
      
      let webContent = lead.website || '';
      if (webContent && webContent !== '' && webContent !== '""') {
        let displayUrl = webContent.replace(/^https?:\/\/(www\.)?/, '').substring(0, 25);
        if (webContent.length > 25) displayUrl += '...';
        const absoluteUrl = webContent.startsWith('http') ? webContent : `http://${webContent}`;
        webContent = `<a href="${absoluteUrl}" target="_blank" class="web-link" onclick="event.stopPropagation()">${displayUrl}</a>`;
      }
      rowHtml += renderCell('website', lead.id, lead.website, webContent);
      
      let addressMarkup = '-';
      if (lead.address && lead.address !== '' && lead.address !== '""' && lead.address !== '·') {
        addressMarkup = `<button class="btn-action-address" onclick="openAddressModal('${lead.id}')" title="Ver Endereço Completo">📍 Ver</button>`;
      }
      rowHtml += renderCell('address', lead.id, lead.address, addressMarkup);
      
      let statusMarkup = `<span class="badge ${getStatusBadgeClass(lead.status)}">${lead.status || 'Novo'}</span>`;
      if (lead.status === 'Reunião Agendada') {
        if (lead.meetingDate) {
          const timeStr = lead.meetingTime ? ` às ${lead.meetingTime}` : '';
          const isPast = isMeetingDatePast(lead.meetingDate);
          const alertIcon = isPast ? '⚠️ ' : '';
          const pillClass = isPast ? 'meeting-date-pill meeting-date-past' : 'meeting-date-pill';
          statusMarkup += `<div class="${pillClass}" onclick="event.stopPropagation(); openMeetingDateModal('${lead.id}')" title="Clique para remarcar">${alertIcon}📅 ${lead.meetingDate}${timeStr}</div>`;
          statusMarkup += `<div class="protocol-pdf-pill" onclick="event.stopPropagation(); downloadLeadProtocolDirect('${lead.id}')" title="Baixar Protocolo PDF">📄 PDF Protocolo</div>`;
        } else {
          statusMarkup += `<div class="meeting-date-pill" style="background-color: rgba(250, 137, 107, 0.1); border: 1px dashed rgba(250, 137, 107, 0.45); color: #fa896b;" onclick="event.stopPropagation(); openMeetingDateModal('${lead.id}')" title="Clique para definir data/hora">📅 Definir data...</div>`;
        }
      }
      rowHtml += renderCell('status', lead.id, lead.status, statusMarkup);
      
      rowHtml += renderCell('warmup', lead.id, lead.warmup, getWarmupMarkup(lead.warmup));
      
      const notesVal = lead.notes || '';
      const notesMarkup = notesVal !== '' ? notesVal : `<span style="color: var(--color-text-muted); font-style: italic;">Adicionar nota...</span>`;
      rowHtml += renderCell('notes', lead.id, lead.notes, notesMarkup);
      
      rowHtml += renderCell('category', lead.id, lead.category);
      
      const priorityMarkup = `<span class="badge ${getPriorityBadgeClass(lead.priority)}">${lead.priority || 'Média'}</span>`;
      rowHtml += renderCell('priority', lead.id, lead.priority, priorityMarkup);
      
      const valueNum = Number(lead.value) || 0;
      const valueFormatted = valueNum > 0 ? `R$ ${valueNum.toLocaleString('pt-BR')}` : '-';
      rowHtml += renderCell('value', lead.id, lead.value, valueFormatted);
    }
    
    row.innerHTML = rowHtml;
    
    // Apply double click event to cells
    row.querySelectorAll('td').forEach(td => {
      const field = td.getAttribute('data-field');
      const leadId = td.getAttribute('data-lead-id');
      
      // Skip checkbox and actions cells, and handle contacts specially
      if (field && leadId) {
        if (field === 'contacts') {
          td.ondblclick = () => openScriptDrawerForLead(leadId);
        } else {
          td.ondblclick = () => enterEditMode(td, leadId, field);
        }
      }
    });
    
    tbody.appendChild(row);
  });
  
  updateColumnsVisibility();
}

function renderCell(field, leadId, rawValue, customMarkup = null) {
  const isVisible = appState.visibleColumns[field];
  const displayStyle = isVisible ? '' : 'style="display: none;"';
  const val = rawValue !== undefined ? rawValue : '';
  const content = customMarkup !== null ? customMarkup : val;
  
  return `<td data-field="${field}" data-lead-id="${leadId}" data-raw-value="${val}" ${displayStyle}>${content}</td>`;
}

// CELL INLINE EDITING LOGIC
function enterEditMode(td, leadId, field) {
  // Check if cell is already in edit mode
  if (td.classList.contains('editing')) return;
  
  td.classList.add('editing');
  const rawValue = td.getAttribute('data-raw-value') || '';
  
  let editorHtml = '';
  
  if (field === 'status') {
    editorHtml = `
      <select class="cell-editor" id="editor-${leadId}-${field}">
        <option value="Novo" ${rawValue === 'Novo' ? 'selected' : ''}>⛳ Novo</option>
        <option value="✋/Em contato" ${rawValue === '✋/Em contato' ? 'selected' : ''}>✋/Em contato</option>
        <option value="Interagiu" ${rawValue === 'Interagiu' ? 'selected' : ''}>🔄 Interagiu</option>
        <option value="Reunião Agendada" ${rawValue === 'Reunião Agendada' ? 'selected' : ''}>🏆 Reunião Agendada</option>
        <option value="Show" ${rawValue === 'Show' ? 'selected' : ''}>✅ Show</option>
        <option value="No-Show" ${rawValue === 'No-Show' ? 'selected' : ''}>❌ No-Show</option>
        <option value="Fechamento Não Realizado" ${rawValue === 'Fechamento Não Realizado' ? 'selected' : ''}>📉 Fechamento Não Realizado</option>
        <option value="Venda Fechada" ${rawValue === 'Venda Fechada' ? 'selected' : ''}>💰 Venda Fechada</option>
        <option value="Sem Interesse" ${rawValue === 'Sem Interesse' ? 'selected' : ''}>🚫 Sem Interesse</option>
      </select>
    `;
  } else if (field === 'priority') {
    editorHtml = `
      <select class="cell-editor" id="editor-${leadId}-${field}">
        <option value="Alta" ${rawValue === 'Alta' ? 'selected' : ''}>🔥 Alta</option>
        <option value="Média" ${rawValue === 'Média' ? 'selected' : ''}>⚡ Média</option>
        <option value="Baixa" ${rawValue === 'Baixa' ? 'selected' : ''}>❄️ Baixa</option>
      </select>
    `;
  } else if (field === 'warmup') {
    editorHtml = `<select class="cell-editor" id="editor-${leadId}-${field}">`;
    editorHtml += `<option value="" ${rawValue === '' ? 'selected' : ''}>Definir...</option>`;
    for (let i = 10; i >= 0; i--) {
      let icon = '❄️';
      if (i >= 8) icon = '🔥';
      else if (i >= 5) icon = '⚡';
      editorHtml += `<option value="${i}" ${rawValue !== '' && parseInt(rawValue, 10) === i ? 'selected' : ''}>${icon} ${i}/10</option>`;
    }
    editorHtml += `</select>`;
  } else if (field === 'notes') {
    editorHtml = `<textarea class="cell-editor" id="editor-${leadId}-${field}" style="min-height: 60px; font-family: inherit;">${rawValue}</textarea>`;
  } else if (field === 'value') {
    editorHtml = `<input type="number" class="cell-editor" id="editor-${leadId}-${field}" value="${rawValue}">`;
  } else {
    editorHtml = `<input type="text" class="cell-editor" id="editor-${leadId}-${field}" value="${rawValue}">`;
  }
  
  td.innerHTML = editorHtml;
  
  const editor = document.getElementById(`editor-${leadId}-${field}`);
  editor.focus();
  
  // Position cursor at end of input
  if (editor.type === 'text') {
    const valLength = editor.value.length;
    editor.setSelectionRange(valLength, valLength);
  }
  
  // Save handler helper
  const saveValue = () => {
    const newValue = editor.value.trim();
    if (newValue !== rawValue) {
      // Check for duplicates on phone or website edit
      if (newValue !== '' && (field === 'phone' || field === 'website')) {
        const cleanVal = field === 'phone' ? newValue.replace(/[^\d]/g, '') : newValue.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').trim();
        if (cleanVal) {
          const duplicate = appState.leads.find(l => {
            if (l.id === leadId) return false;
            const dbVal = field === 'phone' ? (l.phone || '').replace(/[^\d]/g, '') : (l.website || '').toLowerCase().replace(/^https?:\/\/(www\.)?/, '').trim();
            return dbVal === cleanVal;
          });
          if (duplicate) {
            showToast(`Atenção: Duplicado! "${duplicate.name}" já possui este ${field === 'phone' ? 'telefone' : 'site'}.`, 'error');
          }
        }
      }
      db.updateLead(leadId, { [field]: newValue });
      if (field === 'status') {
        let logNotes = `Status alterado para: ${newValue}`;
        if (newValue === 'Fechamento Não Realizado') {
          logNotes = 'Fechamento Não Realizado - Lead compareceu à reunião mas não fechou a venda.';
        }
        logContactAttemptSilent(leadId, 'Status', logNotes);
      }
      showToast('Célula atualizada! ✓', 'success');
      if (field === 'status' && newValue === 'Reunião Agendada') {
        openMeetingDateModal(leadId, rawValue);
      } else if (field === 'status' && newValue === 'Venda Fechada') {
        openCloseSaleModal(leadId, rawValue);
      } else {
        initApp();
      }
    } else {
      // Revert markup
      renderGridRows();
    }
  };
  
  editor.onblur = () => {
    saveValue();
  };
  
  editor.onkeydown = (e) => {
    if (e.key === 'Enter' && field !== 'notes') {
      e.preventDefault();
      saveValue();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      renderGridRows(); // Cancel edits
    }
  };
}

function addNewRow() {
  let assessorName = 'Ryan';
  try {
    const user = JSON.parse(localStorage.getItem('voxecrm_current_user'));
    if (user && user.sellerName) {
      assessorName = user.sellerName;
    } else if (user && user.name) {
      const name = user.name.toLowerCase();
      if (name.includes('ryan')) assessorName = 'Ryan';
      else if (name.includes('vithor')) assessorName = 'Vithor';
    }
  } catch (e) {}
  const newLead = {
    name: 'Nova Clínica ' + (appState.leads.length + 1),
    category: 'Veterinário',
    phone: '',
    email: '',
    website: '',
    address: '',
    status: 'Novo',
    priority: 'Média',
    value: 0,
    notes: '',
    seller: assessorName
  };
  
  const created = db.addLead(newLead);
  showToast('Novo lead adicionado no topo! ✓', 'success');
  initApp();
  
  // Highlight the row and enter edit mode immediately for the name
  setTimeout(() => {
    const row = document.getElementById(`row-${created.id}`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const nameTd = row.querySelector('td[data-field="name"]');
      if (nameTd) enterEditMode(nameTd, created.id, 'name');
    }
  }, 150);
}

// SELECTION & CHECKBOX LOGIC
function toggleSelectRow(checkbox, leadId) {
  if (checkbox.checked) {
    if (!appState.selectedLeadIds.includes(leadId)) {
      appState.selectedLeadIds.push(leadId);
    }
    document.getElementById(`row-${leadId}`)?.classList.add('row-checked');
  } else {
    appState.selectedLeadIds = appState.selectedLeadIds.filter(id => id !== leadId);
    document.getElementById(`row-${leadId}`)?.classList.remove('row-checked');
  }
  
  updateBulkActionsToolbar();
}

function toggleSelectAll(masterCheckbox) {
  const isChecked = masterCheckbox.checked;
  const checkboxes = document.querySelectorAll('#excel-table-body input[type="checkbox"]');
  
  appState.selectedLeadIds = [];
  
  checkboxes.forEach(cb => {
    cb.checked = isChecked;
    const leadId = cb.getAttribute('data-lead-id');
    
    if (isChecked && leadId) {
      appState.selectedLeadIds.push(leadId);
      document.getElementById(`row-${leadId}`)?.classList.add('row-checked');
    } else if (leadId) {
      document.getElementById(`row-${leadId}`)?.classList.remove('row-checked');
    }
  });
  
  updateBulkActionsToolbar();
}

function clearSelection() {
  document.getElementById('check-all').checked = false;
  toggleSelectAll({ checked: false });
}

function updateBulkActionsToolbar() {
  const bulkBar = document.getElementById('bulk-actions-bar');
  const countSpan = document.getElementById('checked-count');
  const count = appState.selectedLeadIds.length;
  
  if (count > 0) {
    bulkBar.classList.remove('hidden');
    countSpan.textContent = count;
  } else {
    bulkBar.classList.add('hidden');
  }
}

// BATCH OPERATIONS
function applyBulkStatus() {
  const select = document.getElementById('bulk-status-select');
  const newStatus = select.value;
  if (!newStatus) return;
  
  let updatedCount = 0;
  appState.selectedLeadIds.forEach(id => {
    const updateObj = { status: newStatus };
    if (newStatus === 'Venda Fechada') {
      const lead = db.getLeadById(id);
      if (lead) {
        updateObj.closedValue = lead.estimatedTicket || lead.value || 0;
        updateObj.value = updateObj.closedValue;
      }
    }
    db.updateLead(id, updateObj);
    let logNotes = `Status alterado via lote para: ${newStatus}`;
    if (newStatus === 'Fechamento Não Realizado') {
      logNotes = 'Fechamento Não Realizado - Lead compareceu à reunião mas não fechou a venda.';
    }
    logContactAttemptSilent(id, 'Status', logNotes);
    updatedCount++;
  });
  
  showToast(`${updatedCount} leads atualizados em lote! ✓`, 'success');
  appState.selectedLeadIds = [];
  select.value = '';
  initApp();
}

function deleteSelectedRows() {
  if (confirm(`Tem certeza que deseja deletar os ${appState.selectedLeadIds.length} leads selecionados?`)) {
    const deleted = db.deleteMultipleLeads(appState.selectedLeadIds);
    showToast(`${deleted} leads removidos do banco.`, 'success');
    appState.selectedLeadIds = [];
    initApp();
  }
}

// SINGLE ROW DELETE FROM DRAWER OR ACTIONS (Fallback helper)
function deleteLeadSingle(leadId, name) {
  if (confirm(`Deletar o lead "${name}" permanentemente?`)) {
    db.deleteLead(leadId);
    showToast(`Lead removido.`, 'success');
    initApp();
  }
}

// COLUMN VISIBILITY SELECTOR LOGIC
function setupColumnCheckboxSelector() {
  const container = document.getElementById('column-checkboxes-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  Object.keys(COLUMN_NAMES).forEach(field => {
    const label = document.createElement('label');
    label.className = 'col-checkbox-label';
    label.innerHTML = `
      <input type="checkbox" value="${field}" ${appState.visibleColumns[field] ? 'checked' : ''} onchange="toggleColumnVisibility(this)">
      ${COLUMN_NAMES[field]}
    `;
    container.appendChild(label);
  });
}

function toggleColumnSelector() {
  const popup = document.getElementById('column-selector-popup');
  popup.classList.toggle('hidden');
}

// Close column popup and actions dropdown if clicked outside
window.addEventListener('click', (e) => {
  const popup = document.getElementById('column-selector-popup');
  const toggleBtn = document.getElementById('btn-toggle-columns');
  
  if (popup && !popup.classList.contains('hidden') && e.target !== toggleBtn && !toggleBtn.contains(e.target) && !popup.contains(e.target)) {
    popup.classList.add('hidden');
  }

  // Close row dropdown menus
  if (!e.target.classList.contains('btn-dots')) {
    document.querySelectorAll('.row-actions-dropdown .dropdown-menu').forEach(menu => {
      menu.classList.add('hidden');
    });
  }
});

function toggleRowActionsMenu(event, leadId) {
  event.stopPropagation();
  const targetMenu = document.getElementById(`dropdown-${leadId}`);
  
  // Close all other menus
  document.querySelectorAll('.row-actions-dropdown .dropdown-menu').forEach(menu => {
    if (menu !== targetMenu) {
      menu.classList.add('hidden');
    }
  });
  
  if (targetMenu) {
    targetMenu.classList.toggle('hidden');
  }
}

function toggleColumnVisibility(checkbox) {
  const field = checkbox.value;
  appState.visibleColumns[field] = checkbox.checked;
  updateColumnsVisibility();
}

function updateColumnsVisibility() {
  // Update header th visibilities
  document.querySelectorAll('.excel-table th[data-field]').forEach(th => {
    const field = th.getAttribute('data-field');
    if (appState.visibleColumns[field]) {
      th.style.display = '';
    } else {
      th.style.display = 'none';
    }
  });
  
  // Update body td visibilities
  document.querySelectorAll('.excel-table td[data-field]').forEach(td => {
    const field = td.getAttribute('data-field');
    if (appState.visibleColumns[field]) {
      td.style.display = '';
    } else {
      td.style.display = 'none';
    }
  });
}

// RESET ALL FILTERS
function resetFilters() {
  document.getElementById('grid-search').value = '';
  document.getElementById('filter-status').value = 'all';
  document.getElementById('filter-priority').value = 'all';
  filterGrid();
}

// =========================================================================
// TAB 2: ARSENAL VIEW EVENTS
// =========================================================================
function populateScriptLeadSelector() {
  const select = document.getElementById('active-lead-script');
  if (!select) return;
  
  select.innerHTML = '';
  appState.leads.forEach(lead => {
    const opt = document.createElement('option');
    opt.value = lead.id;
    opt.textContent = `${lead.name} (${lead.phone || 'Sem telefone'})`;
    select.appendChild(opt);
  });
}

function updateScriptPreviews() {
  const select = document.getElementById('active-lead-script');
  if (!select) return;
  
  appState.activeLeadIdForScripts = select.value;
  const activeCategoryBtn = document.querySelector('#scripts-categories .category-btn.active');
  const activeCategory = activeCategoryBtn ? activeCategoryBtn.getAttribute('onclick').match(/'([^']+)'/)[1] : 'all';
  
  renderScriptsView(appState.activeLeadIdForScripts, activeCategory);
}

function filterScripts(category) {
  // Update sidebar buttons
  document.querySelectorAll('#scripts-categories .category-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  event.target.classList.add('active');
  updateScriptPreviews();
}

// =========================================================================
// DRAWER LATERAL: WHATSAPP INTEGRATION
// =========================================================================
function openScriptDrawerForLead(leadId) {
  appState.activeScriptDrawerLeadId = leadId;
  const lead = db.getLeadById(leadId);
  if (!lead) return;
  
  // Set Context info
  document.getElementById('drawer-lead-name').textContent = lead.name;
  document.getElementById('drawer-lead-phone').textContent = lead.phone || 'Nenhum';
  document.getElementById('drawer-lead-email').textContent = lead.email || 'Nenhum';
  document.getElementById('drawer-lead-website').textContent = lead.website || 'Nenhum';
  document.getElementById('drawer-lead-category').textContent = lead.category || 'Clínica Veterinária';
  
  const meetingRow = document.getElementById('drawer-meeting-info-row');
  const meetingSpan = document.getElementById('drawer-lead-meeting');
  if (meetingRow && meetingSpan) {
    if (lead.meetingDate) {
      const timeStr = lead.meetingTime ? ` às ${lead.meetingTime}` : '';
      meetingSpan.textContent = `${lead.meetingDate}${timeStr}`;
      meetingRow.style.display = 'block';
    } else {
      meetingRow.style.display = 'none';
    }
  }
  
  const drawerCloseSaleBtn = document.getElementById('btn-drawer-close-sale');
  if (drawerCloseSaleBtn) {
    if (lead.status === 'Reunião Agendada' || lead.status === 'Show' || lead.status === 'Venda Fechada' || lead.status === 'Fechamento Não Realizado') {
      drawerCloseSaleBtn.style.display = 'inline-flex';
    } else {
      drawerCloseSaleBtn.style.display = 'none';
    }
  }
  
  // Populate scripts selector dropdown inside drawer
  const selector = document.getElementById('drawer-script-selector');
  selector.innerHTML = '';
  SCRIPTS_DATA.forEach((script, idx) => {
    const opt = document.createElement('option');
    opt.value = script.id;
    opt.textContent = `${idx + 1}. ${script.title}`;
    selector.appendChild(opt);
  });
  
  // Set active toggle status btn
  updateDrawerStatusButtons(lead.status);
  
  // Load script content
  loadDrawerScriptText();

  // Load and render contacts
  const contacts = lead.contacts || [];
  document.getElementById('drawer-contacts-count').textContent = `${contacts.length} tentativa${contacts.length !== 1 ? 's' : ''}`;
  
  // Make sure actions UI is reset
  resetContactActions();
  
  renderDrawerContactsList(contacts, lead.id);
  
  // Open Drawer UI
  document.getElementById('script-drawer-backdrop').style.display = 'block';
  setTimeout(() => {
    document.getElementById('script-drawer').classList.add('open');
  }, 50);
}

function renderDrawerContactsList(contacts, leadId) {
  const container = document.getElementById('drawer-contacts-list');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!contacts || contacts.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 0.5rem; color: var(--color-text-muted); font-style: italic;">Nenhum contato registrado.</div>`;
    return;
  }
  
  // Sort descending: newest first
  const sorted = [...contacts].sort((a, b) => b.timestamp - a.timestamp);
  
  sorted.forEach(c => {
    const icon = c.type === 'Mensagem' ? '💬' : '📞';
    const dateStr = c.dateTime || '';
    const userStr = c.user || 'Assessor';
    const notesStr = c.notes ? ` - <span style="font-style: italic; opacity: 0.85;">${c.notes}</span>` : '';
    
    const div = document.createElement('div');
    div.className = 'drawer-contact-item';
    div.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.3rem 0.6rem;
      border-radius: 6px;
      background-color: var(--color-bg-main);
      margin-bottom: 0.3rem;
      border: 1px solid var(--color-border);
      font-size: 0.72rem;
    `;
    
    div.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.4rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
        <span>${icon}</span>
        <strong>${userStr}</strong>
        ${notesStr}
      </div>
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-left: 0.5rem; white-space: nowrap;">
        <span style="font-size: 0.65rem; color: var(--color-text-muted);">
          ${dateStr}
        </span>
        <button onclick="event.stopPropagation(); deleteContactAttempt('${leadId}', '${c.id}')" 
                style="background: transparent; border: none; color: var(--color-text-muted); cursor: pointer; padding: 0 4px; font-size: 0.95rem; font-weight: bold; line-height: 1; transition: color 0.15s ease;" 
                class="btn-delete-contact" title="Apagar tentativa">×</button>
      </div>
    `;
    
    container.appendChild(div);
  });
}

function showContactOutcomes(type) {
  const mainActions = document.getElementById('drawer-contact-main-actions');
  const callOutcomes = document.getElementById('drawer-contact-call-outcomes');
  const msgOutcomes = document.getElementById('drawer-contact-message-outcomes');
  
  if (mainActions) mainActions.classList.add('hidden');
  
  if (type === 'Ligação') {
    if (callOutcomes) callOutcomes.classList.remove('hidden');
    if (msgOutcomes) msgOutcomes.classList.add('hidden');
  } else if (type === 'Mensagem') {
    if (callOutcomes) callOutcomes.classList.add('hidden');
    if (msgOutcomes) msgOutcomes.classList.remove('hidden');
  }
}

function resetContactActions() {
  const mainActions = document.getElementById('drawer-contact-main-actions');
  const callOutcomes = document.getElementById('drawer-contact-call-outcomes');
  const msgOutcomes = document.getElementById('drawer-contact-message-outcomes');
  
  if (mainActions) mainActions.classList.remove('hidden');
  if (callOutcomes) callOutcomes.classList.add('hidden');
  if (msgOutcomes) msgOutcomes.classList.add('hidden');
}

function logContactAttemptWithOutcome(type, outcome) {
  // 1. Log contact attempt
  logContactAttempt(type, outcome);
  
  // 2. Map outcome to status update
  const leadId = appState.activeScriptDrawerLeadId;
  if (leadId) {
    let newStatus = null;
    if (outcome === '🏆 Agendou') {
      newStatus = 'Reunião Agendada';
    } else if (outcome === '✋ Levantou a mão') {
      newStatus = '✋/Em contato';
    } else if (outcome === '🚫 Sem interesse') {
      newStatus = 'Sem Interesse';
    } else if (outcome === '📞 Não atendeu / Sem resposta') {
      newStatus = 'Interagiu';
    } else if (outcome === '💬 Enviada / Sem resposta') {
      newStatus = 'Interagiu';
    }
    
    if (newStatus) {
      const oldStatus = db.getLeadById(leadId)?.status;
      
      // Update status in database
      db.updateLead(leadId, { status: newStatus });
      
      // Log status change silently in history
      logContactAttemptSilent(leadId, 'Status', `Contato ${type} -> Novo Status: ${newStatus}`);
      
      // If status is Reunião Agendada, open meeting date modal and close drawer
      if (newStatus === 'Reunião Agendada') {
        openMeetingDateModal(leadId, oldStatus);
        closeScriptDrawer();
      } else {
        initApp();
        showToast(`Status atualizado para: ${newStatus} ✓`, 'success');
      }
    }
  }
  
  resetContactActions();
}

function deleteContactAttempt(leadId, attemptId) {
  if (!confirm('Deseja apagar esta tentativa de contato registrada?')) return;
  
  const lead = db.getLeadById(leadId);
  if (!lead) return;
  
  const updatedContacts = (lead.contacts || []).filter(c => c.id !== attemptId);
  
  db.updateLead(leadId, { contacts: updatedContacts });
  showToast('Tentativa de contato removida! ✓', 'success');
  
  // Refresh UI
  initApp();
  
  // Refresh drawer details
  const updatedLead = db.getLeadById(leadId);
  if (updatedLead && appState.activeScriptDrawerLeadId === leadId) {
    const contacts = updatedLead.contacts || [];
    document.getElementById('drawer-contacts-count').textContent = `${contacts.length} tentativa${contacts.length !== 1 ? 's' : ''}`;
    renderDrawerContactsList(contacts, leadId);
  }
}

function logContactAttempt(type, notes = '') {
  const leadId = appState.activeScriptDrawerLeadId;
  if (!leadId) {
    showToast('Nenhum lead ativo no drawer.', 'error');
    return;
  }
  
  const lead = db.getLeadById(leadId);
  if (!lead) return;
  
  // Get active session user
  const currentUserJSON = localStorage.getItem('voxecrm_current_user');
  let assessorName = 'Ryan Az'; // fallback
  if (currentUserJSON) {
    try {
      const user = JSON.parse(currentUserJSON);
      if (user && user.name) assessorName = user.name;
    } catch (e) {
      console.error(e);
    }
  }
  
  const now = new Date();
  const dateStr = String(now.getDate()).padStart(2, '0') + '/' + 
                  String(now.getMonth() + 1).padStart(2, '0') + '/' + 
                  now.getFullYear() + ' ' + 
                  String(now.getHours()).padStart(2, '0') + ':' + 
                  String(now.getMinutes()).padStart(2, '0');
                  
  const newAttempt = {
    id: `touchpoint_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: type,
    timestamp: Date.now(),
    dateTime: dateStr,
    user: assessorName,
    notes: notes
  };
  
  const contacts = lead.contacts || [];
  contacts.push(newAttempt);
  
  db.updateLead(leadId, { contacts: contacts });
  showToast(`Tentativa de ${type} registrada! ✓`, 'success');
  
  // Refresh UI
  initApp();
  
  // Refresh drawer details
  const updatedLead = db.getLeadById(leadId);
  if (updatedLead) {
    const updatedContacts = updatedLead.contacts || [];
    document.getElementById('drawer-contacts-count').textContent = `${updatedContacts.length} tentativa${updatedContacts.length !== 1 ? 's' : ''}`;
    renderDrawerContactsList(updatedContacts, leadId);
  }
}

function logContactAttemptSilent(leadId, type, notes = '') {
  const lead = db.getLeadById(leadId);
  if (!lead) return;
  
  const currentUserJSON = localStorage.getItem('voxecrm_current_user');
  let assessorName = 'Ryan Az'; // fallback
  if (currentUserJSON) {
    try {
      const user = JSON.parse(currentUserJSON);
      if (user && user.name) assessorName = user.name;
    } catch (e) {
      console.error(e);
    }
  }
  
  const now = new Date();
  const dateStr = String(now.getDate()).padStart(2, '0') + '/' + 
                  String(now.getMonth() + 1).padStart(2, '0') + '/' + 
                  now.getFullYear() + ' ' + 
                  String(now.getHours()).padStart(2, '0') + ':' + 
                  String(now.getMinutes()).padStart(2, '0');
                  
  const newAttempt = {
    id: `touchpoint_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: type,
    timestamp: Date.now(),
    dateTime: dateStr,
    user: assessorName,
    notes: notes
  };
  
  const contacts = lead.contacts || [];
  contacts.push(newAttempt);
  
  db.updateLead(leadId, { contacts: contacts });
}

function updateDrawerStatusButtons(activeStatus) {
  document.querySelectorAll('.status-buttons-row .btn-status-toggle').forEach(btn => {
    const stat = btn.getAttribute('data-status');
    if (stat === activeStatus) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function loadDrawerScriptText() {
  const leadId = appState.activeScriptDrawerLeadId;
  const lead = db.getLeadById(leadId);
  const scriptId = document.getElementById('drawer-script-selector').value;
  const script = SCRIPTS_DATA.find(s => s.id === scriptId);
  const assessorName = document.getElementById('user-name-display')?.textContent || 'Ryan';
  
  if (!lead || !script) return;
  
  const processed = replaceLeadVariables(script.text, lead, assessorName);
  document.getElementById('drawer-script-content').textContent = processed;
}

function copyDrawerScriptText() {
  const content = document.getElementById('drawer-script-content').textContent;
  navigator.clipboard.writeText(content).then(() => {
    showToast('Mensagem copiada! ✓', 'success');
  });
}

function setDrawerLeadStatus(status) {
  const leadId = appState.activeScriptDrawerLeadId;
  if (!leadId) return;
  
  const lead = db.getLeadById(leadId);
  const oldStatus = lead ? lead.status : null;
  
  db.updateLead(leadId, { status: status });
  
  // Log status change in contacts history
  let logNotes = `Status alterado para: ${status}`;
  if (status === 'Fechamento Não Realizado') {
    logNotes = 'Fechamento Não Realizado - Lead compareceu à reunião mas não fechou a venda.';
  }
  logContactAttemptSilent(leadId, 'Status', logNotes);
  
  // Update contacts list in drawer if open
  const updatedLead = db.getLeadById(leadId);
  if (updatedLead) {
    const updatedContacts = updatedLead.contacts || [];
    const countEl = document.getElementById('drawer-contacts-count');
    if (countEl) countEl.textContent = `${updatedContacts.length} tentativa${updatedContacts.length !== 1 ? 's' : ''}`;
    renderDrawerContactsList(updatedContacts, leadId);
  }
  
  updateDrawerStatusButtons(status);
  if (status === 'Reunião Agendada') {
    openMeetingDateModal(leadId, oldStatus);
    closeScriptDrawer();
  } else {
    initApp();
    showToast(`Status atualizado para: ${status} ✓`, 'success');
  }
}

function openWhatsAppRedirect() {
  const content = document.getElementById('drawer-script-content').textContent;
  const leadId = appState.activeScriptDrawerLeadId;
  const lead = db.getLeadById(leadId);
  
  if (!lead) return;
  
  navigator.clipboard.writeText(content).then(() => {
    // Automatically log contact attempt
    const scriptId = document.getElementById('drawer-script-selector')?.value;
    const script = SCRIPTS_DATA.find(s => s.id === scriptId);
    const scriptTitle = script ? script.title : 'Mensagem Rápida';
    logContactAttemptSilent(lead.id, 'Mensagem', `Disparo (Roteiro: ${scriptTitle})`);

    // Automatically advance status to "Interagiu"
    db.updateLead(lead.id, { status: 'Interagiu' });
    initApp();
    
    let cleanPhone = lead.cleanPhone;
    if (!cleanPhone && lead.phone) {
      cleanPhone = lead.phone.replace(/[^\d]/g, '');
      if (cleanPhone.length <= 11 && cleanPhone.length > 0 && !cleanPhone.startsWith('55')) {
        cleanPhone = '55' + cleanPhone;
      }
    }
    
    if (cleanPhone) {
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(content)}`;
      window.open(waUrl, '_blank');
      showToast('Copiado e abrindo WhatsApp...', 'success');
    } else {
      showToast('Prospect sem telefone. Mensagem apenas copiada.', 'error');
    }
    
    closeScriptDrawer();
  });
}

function closeScriptDrawer() {
  document.getElementById('script-drawer').classList.remove('open');
  setTimeout(() => {
    document.getElementById('script-drawer-backdrop').style.display = 'none';
  }, 300);
}

// =========================================================================
// TAB 3: SETTINGS VIEW EVENT HANDLERS
// =========================================================================
function setupSettingsTab() {
  // Load saved Google Sheets config for Ryan
  const ryanUrl = localStorage.getItem('voxecrm_gsheets_ryan_url') || '';
  const ryanChannel = localStorage.getItem('voxecrm_gsheets_ryan_default_channel') || 'Prospecção Fria';
  const ryanLastSync = localStorage.getItem('voxecrm_gsheets_ryan_last_sync') || '';
  const ryanMapping = localStorage.getItem('voxecrm_gsheets_ryan_mapping') || '';

  const ryanUrlInput = document.getElementById('gsheets-ryan-url');
  const ryanChannelInput = document.getElementById('gsheets-ryan-channel');
  const ryanSyncBtn = document.getElementById('btn-sync-gsheets-ryan');
  const ryanLastSyncEl = document.getElementById('gsheets-last-sync-time-ryan');
  const ryanStatusDiv = document.getElementById('gsheets-sync-status-ryan');

  if (ryanUrlInput) ryanUrlInput.value = ryanUrl;
  if (ryanChannelInput) ryanChannelInput.value = ryanChannel;
  if (ryanLastSync && ryanLastSyncEl && ryanStatusDiv) {
    ryanLastSyncEl.textContent = ryanLastSync;
    ryanStatusDiv.style.display = 'block';
  } else if (ryanStatusDiv) {
    ryanStatusDiv.style.display = 'none';
  }
  if (ryanSyncBtn) ryanSyncBtn.disabled = !(ryanUrl && ryanMapping);

  // Load saved Google Sheets config for Vithor
  const vithorUrl = localStorage.getItem('voxecrm_gsheets_vithor_url') || '';
  const vithorChannel = localStorage.getItem('voxecrm_gsheets_vithor_default_channel') || 'Tráfego Orgânico';
  const vithorLastSync = localStorage.getItem('voxecrm_gsheets_vithor_last_sync') || '';
  const vithorMapping = localStorage.getItem('voxecrm_gsheets_vithor_mapping') || '';

  const vithorUrlInput = document.getElementById('gsheets-vithor-url');
  const vithorChannelInput = document.getElementById('gsheets-vithor-channel');
  const vithorSyncBtn = document.getElementById('btn-sync-gsheets-vithor');
  const vithorLastSyncEl = document.getElementById('gsheets-last-sync-time-vithor');
  const vithorStatusDiv = document.getElementById('gsheets-sync-status-vithor');

  if (vithorUrlInput) vithorUrlInput.value = vithorUrl;
  if (vithorChannelInput) vithorChannelInput.value = vithorChannel;
  if (vithorLastSync && vithorLastSyncEl && vithorStatusDiv) {
    vithorLastSyncEl.textContent = vithorLastSync;
    vithorStatusDiv.style.display = 'block';
  } else if (vithorStatusDiv) {
    vithorStatusDiv.style.display = 'none';
  }
  if (vithorSyncBtn) vithorSyncBtn.disabled = !(vithorUrl && vithorMapping);
}
// Helper to convert Google Sheets Sharing link to CSV Export link
function getGsheetsCsvUrl(url) {
  if (!url) return '';
  if (url.includes('/pub?') && url.includes('output=csv')) {
    return url;
  }
  // Check for /d/e/ first
  const deMatch = url.match(/\/d\/e\/([a-zA-Z0-9-_]+)/);
  if (deMatch) {
    const id = deMatch[1];
    return `https://docs.google.com/spreadsheets/d/e/${id}/pub?output=csv`;
  }
  const dMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (dMatch) {
    const id = dMatch[1];
    if (url.includes('/pubhtml') || url.includes('/pub')) {
      return `https://docs.google.com/spreadsheets/d/${id}/pub?output=csv`;
    }
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
  }
  return url;
}

// Smart heuristic to pre-select Google Sheets headers (supporting both PT and EN keys)
function findBestGsheetsHeaderMatch(fieldKey, header) {
  const lowerHeader = header.toLowerCase().trim();
  if (fieldKey === 'name') {
    return lowerHeader === 'name' || lowerHeader.includes('nome') || lowerHeader.includes('clínica') || lowerHeader.includes('clinica') || lowerHeader.includes('empresa') || lowerHeader.includes('título') || lowerHeader.includes('titulo');
  }
  if (fieldKey === 'decisor') {
    return lowerHeader === 'decisor' || lowerHeader.includes('contato') || lowerHeader.includes('seu nome') || lowerHeader.includes('nome do') || lowerHeader.includes('prazer te') || lowerHeader.includes('decisor') || lowerHeader.includes('responsável') || lowerHeader.includes('responsavel');
  }
  if (fieldKey === 'phone') {
    return lowerHeader === 'phone' || lowerHeader.includes('telefone') || lowerHeader.includes('celular') || lowerHeader.includes('whatsapp') || lowerHeader.includes('tel') || lowerHeader.includes('fone') || lowerHeader.includes('whats');
  }
  if (fieldKey === 'email') {
    return lowerHeader === 'email' || lowerHeader.includes('e-mail') || lowerHeader.includes('email') || lowerHeader.includes('correio');
  }
  if (fieldKey === 'website') {
    return lowerHeader === 'website' || lowerHeader.includes('site') || lowerHeader.includes('web') || lowerHeader.includes('pagina') || lowerHeader.includes('página');
  }
  if (fieldKey === 'category') {
    return lowerHeader === 'category' || lowerHeader.includes('categoria') || lowerHeader.includes('você tem um') || lowerHeader.includes('consultório') || lowerHeader.includes('segmento') || lowerHeader.includes('hospital') || lowerHeader.includes('tipo');
  }
  if (fieldKey === 'notes') {
    return lowerHeader === 'notes' || lowerHeader.includes('notas') || lowerHeader.includes('anotações') || lowerHeader.includes('anotacoes') || lowerHeader.includes('faturando') || lowerHeader.includes('faturamento') || lowerHeader.includes('mais informações') || lowerHeader.includes('observação') || lowerHeader.includes('obs');
  }
  if (fieldKey === 'address') {
    return lowerHeader === 'address' || lowerHeader.includes('endereço') || lowerHeader.includes('endereco') || lowerHeader.includes('rua') || lowerHeader.includes('localização') || lowerHeader.includes('cidade') || lowerHeader.includes('bairro');
  }
  if (fieldKey === 'mapsLink') {
    return lowerHeader === 'mapslink' || lowerHeader === 'link' || lowerHeader.includes('maps') || lowerHeader.includes('google maps') || lowerHeader.includes('link do maps');
  }
  if (fieldKey === 'warmup') {
    return lowerHeader === 'warmup' || lowerHeader.includes('aquecimento') || lowerHeader.includes('pontuação') || lowerHeader.includes('score') || lowerHeader.includes('classificação');
  }
  if (fieldKey === 'date') {
    return lowerHeader === 'date' || lowerHeader.includes('data') || lowerHeader.includes('timestamp') || lowerHeader.includes('horário') || lowerHeader.includes('hora');
  }
  if (fieldKey === 'respondiId') {
    return lowerHeader === 'respondiid' || lowerHeader.includes('id') || lowerHeader.includes('identificador') || lowerHeader.includes('respondi');
  }
  return false;
}

let gsheetsParsedRows = { ryan: [], vithor: [] };
let gsheetsHeaders = { ryan: [], vithor: [] };

// Toggle visibility of the mapping area manually
async function toggleGsheetsMappingArea(sellerId) {
  const mappingArea = document.getElementById(`gsheets-mapping-area-${sellerId}`);
  if (!mappingArea) return;
  
  if (mappingArea.classList.contains('hidden')) {
    if (!gsheetsHeaders[sellerId] || gsheetsHeaders[sellerId].length === 0) {
      const url = localStorage.getItem(`voxecrm_gsheets_${sellerId}_url`);
      if (!url) {
        showToast('Nenhuma planilha conectada ainda. Insira o link e clique em Conectar & Mapear.', 'error');
        return;
      }
      const isScript = localStorage.getItem(`voxecrm_gsheets_${sellerId}_is_script`) === 'true';
      const fetchUrl = localStorage.getItem(`voxecrm_gsheets_${sellerId}_csv_url`) || url;
      
      showToast('Carregando cabeçalhos para ajuste... 🔄', 'success');
      try {
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error('HTTP error');
        if (isScript) {
          const data = await response.json();
          gsheetsHeaders[sellerId] = data[0];
          gsheetsParsedRows[sellerId] = data.slice(1);
        } else {
          const text = await response.text();
          const lines = text.split(/\r?\n/);
          gsheetsHeaders[sellerId] = parseCSVLine(lines[0]);
        }
      } catch (err) {
        console.error(err);
        showToast('Erro ao carregar colunas da planilha.', 'error');
        return;
      }
    }
    renderGsheetsMappingInterface(gsheetsHeaders[sellerId], sellerId);
    mappingArea.classList.remove('hidden');
  } else {
    mappingArea.classList.add('hidden');
  }
}

// seller = 'ryan' | 'vithor'
async function saveGsheetsConfig(seller) {
  const sellerId = seller === 'vithor' ? 'vithor' : 'ryan';
  const urlInput = document.getElementById(`gsheets-${sellerId}-url`);
  const channelInput = document.getElementById(`gsheets-${sellerId}-channel`);
  
  if (!urlInput) return;
  const url = urlInput.value.trim();
  const defaultChannel = channelInput ? channelInput.value.trim() : (sellerId === 'ryan' ? 'Prospecção Fria' : 'Tráfego Orgânico');
  
  if (!url) {
    showToast('Por favor, insira o link da planilha.', 'error');
    return;
  }
  
  const isScript = url.includes('script.google.com');
  const fetchUrl = isScript ? url : getGsheetsCsvUrl(url);
  
  showToast(`Conectando à planilha do ${sellerId === 'ryan' ? 'Ryan' : 'Vithor'}... 🔄`, 'success');
  
  try {
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    if (isScript) {
      const data = await response.json();
      if (data.erro) throw new Error(data.erro);
      if (!Array.isArray(data) || data.length === 0) throw new Error('A planilha retornou vazia ou formato inválido.');
      gsheetsHeaders[sellerId] = data[0];
      gsheetsParsedRows[sellerId] = data.slice(1);
    } else {
      const text = await response.text();
      const allRows = parseCSVToRows(text);
      if (allRows.length === 0) throw new Error('A planilha está vazia.');
      
      gsheetsHeaders[sellerId] = allRows[0];
      gsheetsParsedRows[sellerId] = allRows.slice(1);
    }
    
    if (gsheetsHeaders[sellerId].length === 0) throw new Error('Nenhum cabeçalho encontrado.');
    
    localStorage.setItem(`voxecrm_gsheets_${sellerId}_url`, url);
    localStorage.setItem(`voxecrm_gsheets_${sellerId}_csv_url`, fetchUrl);
    localStorage.setItem(`voxecrm_gsheets_${sellerId}_default_channel`, defaultChannel);
    localStorage.setItem(`voxecrm_gsheets_${sellerId}_is_script`, isScript ? 'true' : 'false');
    
    if (sellerId === 'ryan') {
      // Mapeamento rígido fixado para as colunas do Ryan Az
      // Se for Web App Script, usa os índices estruturados do script (address=5, notes=6)
      // Se for CSV bruto, usa os índices normais do Excel (address=6, notes=7)
      const fixedRyanMapping = isScript ? {
        name: 1,      // Coluna B
        warmup: 2,    // Coluna C
        reviews: 3,   // Coluna D
        category: 4,  // Coluna E
        address: 5,   // Coluna F (Apps Script index 5)
        notes: 6,     // Coluna G (Apps Script index 6)
        phone: 8,     // Coluna I (Apps Script index 8)
        website: 9,   // Coluna J (Apps Script index 9)
        mapsLink: 0   // Coluna A
      } : {
        name: 1,      // Coluna B
        warmup: 2,    // Coluna C
        reviews: 3,   // Coluna D
        category: 4,  // Coluna E
        address: 6,   // Coluna G
        notes: 7,     // Coluna H (Horários de Funcionamento)
        phone: 8,     // Coluna I
        website: 9,   // Coluna J
        mapsLink: 0   // Coluna A
      };
      localStorage.setItem(`voxecrm_gsheets_ryan_mapping`, JSON.stringify(fixedRyanMapping));
      
      const syncBtn = document.getElementById(`btn-sync-gsheets-ryan`);
      if (syncBtn) syncBtn.disabled = false;
      
      const mappingArea = document.getElementById(`gsheets-mapping-area-ryan`);
      if (mappingArea) mappingArea.classList.add('hidden');
      
      showToast('Planilha do Ryan conectada com mapeamento idêntico ao Excel! 🚀', 'success');
    } else {
      // Auto-map columns automatically for Vithor
      const mappings = {};
      const crmFields = [
        { key: 'name', label: 'Nome da Empresa / Clínica *' },
        { key: 'decisor', label: 'Contato do Decisor' },
        { key: 'phone', label: 'Telefone' },
        { key: 'email', label: 'E-mail' },
        { key: 'website', label: 'Website (Site)' },
        { key: 'address', label: 'Endereço' },
        { key: 'warmup', label: 'Nível de Aquecimento (0-10)' },
        { key: 'category', label: 'Segmento / Categoria' },
        { key: 'mapsLink', label: 'Link do Google Maps' },
        { key: 'notes', label: 'Notas / Anotações' },
        { key: 'date', label: 'Data do Formulário (Timestamp)' },
        { key: 'respondiId', label: 'ID do Respondi' }
      ];
      
      let nameMapped = false;
      const mappedFieldNames = [];
      crmFields.forEach(field => {
        let bestMatchIndex = -1;
        gsheetsHeaders[sellerId].forEach((header, idx) => {
          if (findBestGsheetsHeaderMatch(field.key, header)) {
            bestMatchIndex = idx;
          }
        });
        if (bestMatchIndex !== -1) {
          mappings[field.key] = bestMatchIndex;
          mappedFieldNames.push(field.label.replace(' *', '').replace(' (Timestamp)', '').replace(' (Site)', ''));
          if (field.key === 'name') {
            nameMapped = true;
          }
        }
      });

      if (nameMapped) {
        localStorage.setItem(`voxecrm_gsheets_${sellerId}_mapping`, JSON.stringify(mappings));
        
        const syncBtn = document.getElementById(`btn-sync-gsheets-${sellerId}`);
        if (syncBtn) syncBtn.disabled = false;
        
        const mappingArea = document.getElementById(`gsheets-mapping-area-${sellerId}`);
        if (mappingArea) mappingArea.classList.add('hidden');
        
        showToast(`Conectado! Colunas mapeadas automaticamente: ${mappedFieldNames.join(', ')} 🚀`, 'success');
        renderGsheetsMappingInterface(gsheetsHeaders[sellerId], sellerId);
      } else {
        showToast('Conectado! Selecione manualmente qual coluna contém o Nome da Clínica.', 'info');
        renderGsheetsMappingInterface(gsheetsHeaders[sellerId], sellerId);
        const mappingArea = document.getElementById(`gsheets-mapping-area-${sellerId}`);
        if (mappingArea) mappingArea.classList.remove('hidden');
      }
    }
  } catch (error) {
    console.error('Error fetching sheet:', error);
    showToast('Erro ao ler a planilha. Verifique se o link está público.', 'error');
  }
}

function renderGsheetsMappingInterface(headers, sellerId) {
  const container = document.getElementById(`gsheets-mapping-container-${sellerId}`);
  const mappingArea = document.getElementById(`gsheets-mapping-area-${sellerId}`);
  
  if (!container || !mappingArea) return;
  
  container.innerHTML = '';
  
  const crmFields = [
    { key: 'name', label: 'Nome da Empresa / Clínica *' },
    { key: 'decisor', label: 'Contato do Decisor' },
    { key: 'phone', label: 'Telefone' },
    { key: 'email', label: 'E-mail' },
    { key: 'website', label: 'Website (Site)' },
    { key: 'address', label: 'Endereço' },
    { key: 'warmup', label: 'Nível de Aquecimento (0-10)' },
    { key: 'category', label: 'Segmento / Categoria' },
    { key: 'mapsLink', label: 'Link do Google Maps' },
    { key: 'notes', label: 'Notas / Anotações' },
    { key: 'date', label: 'Data do Formulário (Timestamp)' },
    { key: 'respondiId', label: 'ID do Respondi' }
  ];
  
  crmFields.forEach(field => {
    const row = document.createElement('div');
    row.className = 'mapping-row';
    row.style.marginBottom = '0.5rem';
    
    let bestMatchIndex = -1;
    headers.forEach((header, idx) => {
      if (findBestGsheetsHeaderMatch(field.key, header)) {
        bestMatchIndex = idx;
      }
    });
    
    let optionsHtml = `<option value="">-- Ignorar Campo --</option>`;
    headers.forEach((header, idx) => {
      const selectedAttr = idx === bestMatchIndex ? 'selected' : '';
      optionsHtml += `<option value="${idx}" ${selectedAttr}>${header}</option>`;
    });
    
    row.innerHTML = `
      <span class="mapping-label">${field.label}</span>
      <select class="form-control-sm mapping-select gsheets-mapping-select-${sellerId}" data-crm-field="${field.key}" style="max-width: 250px;">
        ${optionsHtml}
      </select>
    `;
    
    container.appendChild(row);
  });
  
  mappingArea.classList.remove('hidden');
}

function cancelGsheetsMapping(sellerId) {
  const mappingArea = document.getElementById(`gsheets-mapping-area-${sellerId}`);
  if (mappingArea) mappingArea.classList.add('hidden');
}

function confirmGsheetsMapping(sellerId) {
  const selects = document.querySelectorAll(`.gsheets-mapping-select-${sellerId}`);
  const mappings = {};
  
  selects.forEach(select => {
    const crmField = select.getAttribute('data-crm-field');
    const csvIndex = select.value;
    if (csvIndex !== '') {
      mappings[crmField] = parseInt(csvIndex);
    }
  });
  
  if (mappings['name'] === undefined) {
    showToast('Você precisa mapear a coluna "Nome da Empresa/Clínica".', 'error');
    return;
  }
  
  localStorage.setItem(`voxecrm_gsheets_${sellerId}_mapping`, JSON.stringify(mappings));
  
  const mappingArea = document.getElementById(`gsheets-mapping-area-${sellerId}`);
  if (mappingArea) mappingArea.classList.add('hidden');
  
  const syncBtn = document.getElementById(`btn-sync-gsheets-${sellerId}`);
  if (syncBtn) syncBtn.disabled = false;
  
  showToast('Mapeamento configurado! Clique em "Sincronizar Agora" para importar os leads.', 'success');
}

async function syncGoogleSheets(seller) {
  console.log(`[Google Sheets Sync] Iniciando sincronização para o assessor: ${seller}`);
  
  const sellerId = seller === 'vithor' ? 'vithor' : 'ryan';
  const sellerName = sellerId === 'ryan' ? 'Ryan de Azevedo' : 'Vithor';
  
  const syncBtn = document.getElementById(`btn-sync-gsheets-${sellerId}`);
  if (!syncBtn) {
    console.error(`[Google Sheets Sync] Botão btn-sync-gsheets-${sellerId} não encontrado no DOM.`);
    return;
  }
  
  const csvUrl = localStorage.getItem(`voxecrm_gsheets_${sellerId}_csv_url`);
  const defaultChannel = localStorage.getItem(`voxecrm_gsheets_${sellerId}_default_channel`) || (sellerId === 'ryan' ? 'Prospecção Fria' : 'Tráfego Orgânico');
  const mappingStr = localStorage.getItem(`voxecrm_gsheets_${sellerId}_mapping`);
  const isScript = localStorage.getItem(`voxecrm_gsheets_${sellerId}_is_script`) === 'true';
  
  if (!csvUrl) {
    showToast('Configure a planilha antes de sincronizar.', 'error');
    console.warn(`[Google Sheets Sync] URL da planilha não configurada para ${sellerId}`);
    return;
  }
  
  let mappings;
  if (sellerId === 'ryan') {
    mappings = isScript ? {
      name: 1,      // Coluna B
      warmup: 2,    // Coluna C
      reviews: 3,   // Coluna D
      category: 4,  // Coluna E
      address: 5,   // Coluna F (Apps Script index 5)
      notes: 6,     // Coluna G (Apps Script index 6)
      phone: 8,     // Coluna I (Apps Script index 8)
      website: 9,   // Coluna J (Apps Script index 9)
      mapsLink: 0   // Coluna A
    } : {
      name: 1,      // Coluna B
      warmup: 2,    // Coluna C
      reviews: 3,   // Coluna D
      category: 4,  // Coluna E
      address: 6,   // Coluna G
      notes: 7,     // Coluna H (Horários de Funcionamento)
      phone: 8,     // Coluna I
      website: 9,   // Coluna J
      mapsLink: 0   // Coluna A
    };
    localStorage.setItem('voxecrm_gsheets_ryan_mapping', JSON.stringify(mappings));
  } else {
    if (!mappingStr) {
      showToast('Configure a planilha e o mapeamento antes de sincronizar.', 'error');
      return;
    }
    try {
      mappings = JSON.parse(mappingStr);
    } catch (e) {
      showToast('Erro ao ler a configuração do mapeamento.', 'error');
      return;
    }
  }
  
  syncBtn.disabled = true;
  syncBtn.textContent = 'Sincronizando... 🔄';
  showToast(`Iniciando sincronização da planilha do ${sellerName}...`, 'success');
  
  try {
    console.log(`[Google Sheets Sync] Baixando planilha: ${csvUrl}`);
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    let rows = [];
    if (isScript) {
      const data = await response.json();
      if (data.erro) throw new Error(data.erro);
      rows = data.slice(1);
    } else {
      const text = await response.text();
      const allRows = parseCSVToRows(text);
      if (allRows.length <= 1) {
        showToast('Nenhum dado encontrado na planilha.', 'error');
        syncBtn.disabled = false;
        syncBtn.textContent = 'Sincronizar Agora 🔄';
        return;
      }
      rows = allRows.slice(1);
    }
    
    const currentLeads = db.getLeads();
    let importCount = 0;
    let duplicateCount = 0;
    const importedLeads = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      const nameVal = row[mappings['name']];
      if (!nameVal || nameVal === '.' || nameVal === '""') continue;
      
      const phoneVal = mappings['phone'] !== undefined ? cleanQuotes(row[mappings['phone']]) : '';
      const websiteVal = mappings['website'] !== undefined ? cleanQuotes(row[mappings['website']]) : '';
      const emailVal = mappings['email'] !== undefined ? cleanQuotes(row[mappings['email']]) : '';
      const mapsLinkVal = mappings['mapsLink'] !== undefined ? cleanQuotes(row[mappings['mapsLink']]) : '';
      const addressVal = mappings['address'] !== undefined ? cleanQuotes(row[mappings['address']]) : '';
      let notesVal = mappings['notes'] !== undefined ? cleanQuotes(row[mappings['notes']]) : '';
      
      let cleanPhoneImport = phoneVal.replace(/[^\d]/g, '');
      if (cleanPhoneImport.length < 8) cleanPhoneImport = '';
      
      const cleanWebsiteImport = websiteVal.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').trim();
      const cleanEmailImport = emailVal.toLowerCase().trim();
      const cleanMapsLinkImport = mapsLinkVal.trim();
      const cleanNameImport = nameVal.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const cleanAddressImport = addressVal.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      
      let isDuplicate = false;
      isDuplicate = currentLeads.some(l => {
        if (cleanMapsLinkImport && l.mapsLink) {
          const cleanMapsLinkDb = l.mapsLink.trim();
          if (cleanMapsLinkDb && cleanMapsLinkDb === cleanMapsLinkImport) return true;
        }
        
        const cleanPhoneDb = l.phone ? l.phone.replace(/[^\d]/g, '') : '';
        const cleanPhoneDbValid = cleanPhoneDb.length >= 8 ? cleanPhoneDb : '';
        if (cleanPhoneImport && cleanPhoneDbValid) {
          if (cleanPhoneDbValid === cleanPhoneImport) return true;
        }
        
        const cleanWebsiteDb = l.website ? l.website.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').trim() : '';
        if (cleanWebsiteImport && cleanWebsiteDb && cleanWebsiteDb === cleanWebsiteImport) return true;
        
        const cleanEmailDb = l.email ? l.email.toLowerCase().trim() : '';
        if (cleanEmailImport && cleanEmailDb && cleanEmailDb === cleanEmailImport) return true;
        
        const cleanNameDb = l.name ? l.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : '';
        if (cleanNameImport && cleanNameDb && cleanNameDb === cleanNameImport) {
          const cleanAddressDb = l.address ? l.address.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : '';
          
          if (cleanAddressImport && cleanAddressDb) {
            if (cleanAddressImport === cleanAddressDb || cleanAddressImport.includes(cleanAddressDb) || cleanAddressDb.includes(cleanAddressImport)) return true;
          } else {
            if (!cleanPhoneImport && !cleanPhoneDbValid) return true;
          }
        }
        
        return false;
      });
      
      if (isDuplicate) {
        duplicateCount++;
        continue;
      }
      
      const leadId = `lead_${Date.now()}_${Math.floor(Math.random() * 1000)}_${i}`;
      importedLeads.push({
        id: leadId,
        name: cleanQuotes(nameVal),
        decisor: mappings['decisor'] !== undefined ? cleanQuotes(row[mappings['decisor']]) : '',
        phone: phoneVal,
        email: emailVal,
        website: websiteVal,
        address: addressVal,
        warmup: mappings['warmup'] !== undefined ? cleanQuotes(row[mappings['warmup']]) : '',
        category: mappings['category'] !== undefined ? cleanQuotes(row[mappings['category']]) : 'Clínica Veterinária',
        mapsLink: mapsLinkVal,
        notes: notesVal,
        status: 'Novo',
        priority: 'Média',
        channel: defaultChannel,
        value: 0,
        seller: sellerName,
        date: mappings['date'] !== undefined ? cleanQuotes(row[mappings['date']]) : '',
        respondiId: mappings['respondiId'] !== undefined ? cleanQuotes(row[mappings['respondiId']]) : '',
        contacts: []
      });
    }
    
    if (importedLeads.length > 0) {
      console.log(`[Google Sheets Sync] Enviando lote de ${importedLeads.length} novos leads para o Supabase...`);
      const payloads = importedLeads.map(lead => ({
        id: lead.id,
        name: lead.name || '',
        phone: lead.phone || '',
        email: lead.email || '',
        website: lead.website || '',
        address: lead.address || '',
        category: lead.category || 'Clínica Veterinária',
        maps_link: lead.mapsLink || '',
        status: lead.status || 'Novo',
        priority: lead.priority || 'Média',
        channel: lead.channel || 'Google Maps',
        notes: lead.notes || '',
        value: Number(lead.value) || 0,
        seller_name: lead.seller || 'Ryan de Azevedo',
        decisor: lead.decisor || '',
        warmup: lead.warmup || '',
        meeting_date: lead.meetingDate || '',
        meeting_time: lead.meetingTime || '',
        meeting_notes: lead.meetingNotes || '',
        estimated_ticket: Number(lead.estimatedTicket) || 0,
        probability: Number(lead.probability) || 50,
        closed_value: Number(lead.closedValue) || 0
      }));

      const { error: insertError } = await db.from('leads').insert(payloads);
      if (insertError) {
        console.error('[Google Sheets Sync] Falha no insert em lote do Supabase:', insertError);
        showToast(`Erro ao gravar no Supabase: ${insertError.message || insertError}`, 'error');
        throw insertError;
      }
      
      importedLeads.forEach(l => db.leadsCache.unshift(l));
      importCount = importedLeads.length;
    }
    
    const lastSyncTime = new Date().toLocaleString('pt-BR');
    localStorage.setItem(`voxecrm_gsheets_${sellerId}_last_sync`, lastSyncTime);
    
    const lastSyncTimeEl = document.getElementById(`gsheets-last-sync-time-${sellerId}`);
    const syncStatusDiv = document.getElementById(`gsheets-sync-status-${sellerId}`);
    if (lastSyncTimeEl && syncStatusDiv) {
      lastSyncTimeEl.textContent = lastSyncTime;
      syncStatusDiv.style.display = 'block';
    }
    
    if (importCount > 0) {
      showToast(`${importCount} novos leads do ${sellerName} importados e salvos no Supabase. ${duplicateCount} duplicados ignorados. ✓`, 'success');
    } else {
      showToast(`Nenhum lead novo encontrado. A planilha do ${sellerName} está em sincronia! ✓`, 'success');
    }
    
    await initApp();
    console.log(`[Google Sheets Sync] Sincronização finalizada com sucesso para: ${seller}`);
    
  } catch (error) {
    console.error('[Google Sheets Sync] Erro geral na sincronização:', error);
    showToast(`Falha na sincronização: ${error.message || error}`, 'error');
  } finally {
    syncBtn.disabled = false;
    syncBtn.textContent = 'Sincronizar Agora 🔄';
  }
}

function exportToCSV() {
  const leads = db.getLeads();
  if (leads.length === 0) {
    showToast('Planilha vazia para exportação.', 'error');
    return;
  }
  
  // Headers row
  let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Includes BOM for Excel
  csvContent += "ID,Nome da Clinica,Telefone,Contatos,E-mail,Website,Endereco,Segmento,Link Google Maps,Status,Prioridade,Valor Est,Notas\n";
  
  leads.forEach(lead => {
    const contacts = lead.contacts || [];
    let msgs = 0;
    let calls = 0;
    contacts.forEach(c => {
      if (c.type === 'Mensagem') msgs++;
      else if (c.type === 'Ligação') calls++;
    });
    const contactsSummary = `${msgs} mensagens, ${calls} ligações`;

    const row = [
      lead.id,
      escapeCSVValue(lead.name),
      escapeCSVValue(lead.phone),
      escapeCSVValue(contactsSummary),
      escapeCSVValue(lead.email),
      escapeCSVValue(lead.website),
      escapeCSVValue(lead.address),
      escapeCSVValue(lead.category),
      escapeCSVValue(lead.mapsLink),
      escapeCSVValue(lead.status),
      escapeCSVValue(lead.priority),
      lead.value || 0,
      escapeCSVValue(lead.notes)
    ];
    csvContent += row.join(",") + "\n";
  });
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "voxe_crm_prospects.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Planilha CSV baixada!', 'success');
}

function escapeCSVValue(val) {
  if (!val) return '""';
  const clean = val.replace(/"/g, '""');
  return `"${clean}"`;
}

function exportBackupJSON() {
  const leads = db.getLeads();
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(leads, null, 2));
  const link = document.createElement('a');
  link.setAttribute("href", dataStr);
  link.setAttribute("download", "voxe_crm_backup.json");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Backup JSON baixado!', 'success');
}

function wipeLocalData() {
  if (confirm('Atenção: Isso irá deletar todas as alterações locais e recarregar os dados originais da semente (google Teste.csv). Deseja prosseguir?')) {
    if (confirm('Você tem certeza que deseja apagar os arquivos?')) {
      const password = prompt('Esta é uma ação destrutiva. Digite a senha de administrador para autorizar:');
      if (password === '2026') {
        db.resetDatabase();
        showToast('Banco de dados restaurado!', 'success');
        initApp();
      } else {
        showToast('Senha incorreta! Ação cancelada.', 'error');
      }
    }
  }
}

async function cleanAllDatabaseDuplicates() {
  const currentLeads = db.getLeads();
  const uniqueLeads = [];
  const uniqueIds = new Set();
  const discardedLeads = [];
  
  const cleanPhone = (phone) => phone ? phone.replace(/[^\d]/g, '') : '';
  const cleanWebsite = (url) => url ? url.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').trim() : '';
  const cleanEmail = (email) => email ? email.toLowerCase().trim() : '';
  const cleanString = (str) => str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : '';

  currentLeads.forEach(l => {
    const lMapsLink = l.mapsLink ? l.mapsLink.trim() : '';
    const lPhone = cleanPhone(l.phone);
    const lPhoneValid = lPhone.length >= 8 ? lPhone : '';
    const lWebsite = cleanWebsite(l.website);
    const lEmail = cleanEmail(l.email);
    const lName = cleanString(l.name);
    const lAddress = cleanString(l.address);
    
    let isDup = uniqueLeads.some(u => {
      const uMapsLink = u.mapsLink ? u.mapsLink.trim() : '';
      if (lMapsLink && uMapsLink && lMapsLink === uMapsLink) return true;
      
      const uPhone = cleanPhone(u.phone);
      const uPhoneValid = uPhone.length >= 8 ? uPhone : '';
      if (lPhoneValid && uPhoneValid && lPhoneValid === uPhoneValid) return true;
      
      const uWebsite = cleanWebsite(u.website);
      if (lWebsite && uWebsite && lWebsite === uWebsite) return true;
      
      const uEmail = cleanEmail(u.email);
      if (lEmail && uEmail && lEmail === uEmail) return true;
      
      const uName = cleanString(u.name);
      if (lName && uName && lName === uName) {
        const uAddress = cleanString(u.address);
        if (lAddress && uAddress) {
          if (lAddress === uAddress || lAddress.includes(uAddress) || uAddress.includes(lAddress)) return true;
        } else if (!lPhoneValid && !uPhoneValid) {
          return true;
        }
      }
      return false;
    });
    
    if (isDup) {
      discardedLeads.push(l);
    } else {
      uniqueLeads.push(l);
      uniqueIds.add(l.id);
    }
  });
  
  const duplicateCount = currentLeads.length - uniqueLeads.length;
  if (duplicateCount === 0) {
    showToast('Nenhum lead duplicado encontrado no banco! ✓', 'info');
    return;
  }
  
  if (confirm(`Encontrados ${duplicateCount} registros duplicados. Deseja removê-los do sistema e sincronizar com a nuvem?`)) {
    if (confirm('Você tem certeza que deseja apagar os arquivos?')) {
      const password = prompt('Esta é uma ação destrutiva. Digite a senha de administrador para autorizar:');
      if (password !== '2026') {
        showToast('Senha incorreta! Ação cancelada.', 'error');
        return;
      }
      
      // Salva a lista de leads únicos no banco local (isso remove tanto duplicados com o mesmo ID quanto com IDs diferentes)
      db.saveAllLeads(uniqueLeads);
      
      // Identifica quais IDs de leads descartados devem ser excluídos do Supabase (IDs que NÃO estão na lista única)
      const duplicateIdsForSupabase = [...new Set(discardedLeads.map(l => l.id))].filter(id => !uniqueIds.has(id));
      
      const supabaseConfig = db.getSupabaseConfig();
      if (supabaseConfig && supabaseConfig.url && supabaseConfig.anonKey && duplicateIdsForSupabase.length > 0) {
        showToast('Sincronizando remoções com a nuvem Supabase... 🔄', 'info');
        try {
          if (typeof supabase !== 'undefined') {
            const client = supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey);
            const { error } = await client.from('leads').delete().in('id', duplicateIdsForSupabase);
            if (error) throw error;
            showToast('Nuvem Supabase atualizada com sucesso! ✓', 'success');
          } else {
            showToast('Erro: Supabase SDK não carregado.', 'error');
          }
        } catch (err) {
          console.error('Failed to delete duplicates from Supabase:', err);
          showToast('Erro ao remover do Supabase, mas os dados locais foram limpos.', 'error');
        }
      }
      
      showToast(`${duplicateCount} leads duplicados removidos com sucesso! ✓`, 'success');
      initApp();
    }
  }
}

// SUPABASE CLOUD CONNECTION
function saveSupabaseConfig() {
  const url = document.getElementById('supabase-url').value.trim();
  const anonKey = document.getElementById('supabase-anon-key').value.trim();
  
  if (!url || !anonKey) {
    showToast('URL e Anon Key são necessários.', 'error');
    return;
  }
  
  db.saveSupabaseConfig(url, anonKey);
  document.getElementById('btn-sync-supabase').disabled = false;
  updateSupabaseBadge(true, 'Configurações salvas');
  showToast('Configurações salvas localmente!', 'success');
}

async function syncWithSupabase() {
  const syncBtn = document.getElementById('btn-sync-supabase');
  syncBtn.disabled = true;
  syncBtn.textContent = 'Sincronizando... 🔄';
  
  updateSupabaseBadge(true, 'Sincronizando...');
  
  try {
    await db.syncWithSupabaseCloud((statusText) => {
      updateSupabaseBadge(true, statusText);
    });
    
    showToast('Nuvem Supabase sincronizada com sucesso!', 'success');
    updateSupabaseBadge(true, 'Conectado & Sincronizado ✓');
    initApp();
  } catch (err) {
    console.error(err);
    showToast(`Falha na sincronização: ${err.message}`, 'error');
    updateSupabaseBadge(false, 'Erro na conexão');
  } finally {
    syncBtn.disabled = false;
    syncBtn.textContent = 'Sincronizar Agora 🔄';
  }
}

function updateSupabaseBadge(isActive, text) {
  const badge = document.getElementById('supabase-status-badge');
  if (!badge) return;
  
  badge.style.display = 'block';
  badge.textContent = text;
  
  if (isActive) {
    badge.className = 'status-badge status-convertido';
    badge.style.color = 'var(--color-primary)';
    badge.style.borderColor = 'rgba(16, 185, 129, 0.2)';
  } else {
    badge.className = 'status-badge status-novo';
    badge.style.color = 'var(--color-danger)';
    badge.style.borderColor = 'rgba(239, 68, 68, 0.2)';
  }
}

// TOAST NOTIFICATIONS
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast-notification');
  const msgSpan = document.getElementById('toast-message');
  
  if (!toast || !msgSpan) return;
  
  msgSpan.textContent = message;
  toast.classList.remove('hidden');
  
  if (type === 'error') {
    toast.style.borderColor = 'var(--color-danger)';
    toast.style.boxShadow = '0 5px 25px rgba(239, 68, 68, 0.2)';
  } else {
    toast.style.borderColor = 'var(--color-primary)';
    toast.style.boxShadow = '0 5px 25px rgba(16, 185, 129, 0.2)';
  }
  
  // Hide after 3 seconds
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

// HELPERS
function getStatusBadgeClass(status) {
  if (status === 'Novo') return 'badge-status-novo';
  if (status === '✋/Em contato') return 'badge-status-contato';
  if (status === 'Interagiu') return 'badge-status-interagiu';
  if (status === 'Reunião Agendada') return 'badge-status-agendado';
  if (status === 'Show') return 'badge-status-show';
  if (status === 'No-Show') return 'badge-status-noshow';
  if (status === 'Fechamento Não Realizado') return 'badge-status-nofechou';
  if (status === 'Venda Fechada') return 'badge-status-venda';
  if (status === 'Sem Interesse') return 'badge-status-semfoco';
  return 'badge-status-novo';
}

function getPriorityBadgeClass(priority) {
  if (priority === 'Alta') return 'badge-priority-alta';
  if (priority === 'Média') return 'badge-priority-media';
  if (priority === 'Baixa') return 'badge-priority-baixa';
  return 'badge-priority-media';
}

function getWarmupMarkup(warmup) {
  if (warmup === undefined || warmup === null || warmup === '') {
    return `<span style="color: var(--color-text-muted); font-style: italic;">Definir...</span>`;
  }
  const score = parseInt(warmup, 10);
  if (isNaN(score)) return warmup;
  
  let icon = '❄️';
  let badgeClass = 'badge-priority-baixa';
  if (score >= 8) {
    icon = '🔥';
    badgeClass = 'badge-priority-alta';
  } else if (score >= 5) {
    icon = '⚡';
    badgeClass = 'badge-priority-media';
  }
  
  return `<span class="badge ${badgeClass}">${icon} ${score}/10</span>`;
}

function isMeetingDatePast(meetingDate) {
  if (!meetingDate) return false;
  const parts = meetingDate.split('/');
  if (parts.length !== 3) return false;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-based in JS
  const year = parseInt(parts[2], 10);
  
  const meetingDateObj = new Date(year, month, day);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return meetingDateObj < today;
}

// =========================================================================
// VOXE PROFILE AUTHENTICATION & LOGIN LOGIC (SUPABASE AUTH)
// =========================================================================
async function submitSupabaseAuthLogin() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  const errorMsgDiv = document.getElementById('auth-error-msg');
  const submitBtn = document.getElementById('btn-login-submit');

  if (!email || !password) {
    if (errorMsgDiv) {
      errorMsgDiv.textContent = 'Por favor, digite o e-mail e a senha.';
      errorMsgDiv.style.display = 'block';
    }
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Autenticando... 🔄';
  if (errorMsgDiv) errorMsgDiv.style.display = 'none';

  try {
    // 2. Usar o Supabase Auth para autenticar
    const { data, error } = await db.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      throw error;
    }

    // 1. Após o login bem sucedido, pegar o email da sessão
    const { data: { session } } = await db.auth.getSession();
    const userEmail = session?.user?.email || email;

    // 2. Usar esse email para definir o perfil ativo
    const isRyan = userEmail.toLowerCase() === 'deazevedor640@gmail.com';
    const formattedName = isRyan ? 'Ryan de Azevedo' : 'Vithor';
    const sellerName = isRyan ? 'Ryan' : 'Vithor';
    const avatarName = isRyan ? 'ryan.png' : 'vithor.png';

    // Save session in local storage for legacy compatibility
    localStorage.setItem('voxecrm_current_user', JSON.stringify({
      username: isRyan ? 'ryan' : 'vithor',
      name: formattedName,
      sellerName: sellerName,
      avatar: avatarName,
      email: userEmail
    }));

    applyUserLoginState(formattedName, avatarName);

    // 4. Se o login funcionar, esconder a tela de login e mostrar o CRM normalmente
    document.getElementById('auth-overlay').classList.add('hidden');
    showToast(`Bem-vindo, ${formattedName}! 🚀`, 'success');

    // Load database and render
    appState.currentTab = 'dashboard';
    await initApp();
    switchTab('dashboard');

  } catch (err) {
    console.error('Login error:', err);
    // 3. Se o login falhar, mostrar mensagem de erro
    if (errorMsgDiv) {
      errorMsgDiv.textContent = `Falha na autenticação: ${err.message || err}`;
      errorMsgDiv.style.display = 'block';
    }
    showToast('Falha no login', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Entrar em Campo 🚀';
  }
}

function applyUserLoginState(name, avatar) {
  // Update sidebar
  const avatarEl = document.getElementById('user-avatar');
  if (avatarEl) {
    avatarEl.innerHTML = `<img src="img/${avatar}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    avatarEl.style.background = 'none';
    avatarEl.style.padding = '0';
  }
  const nameEl = document.getElementById('user-name-display');
  if (nameEl) nameEl.textContent = name;
}

// 5. Adicionar botão de "Sair" no CRM que chama db.auth.signOut()
async function logoutUserProfile() {
  try {
    await db.auth.signOut();
    localStorage.removeItem('voxecrm_current_user');
    
    // Show overlay
    const overlay = document.getElementById('auth-overlay');
    overlay.style.transition = '';
    overlay.classList.remove('hidden');
    
    // Reset form fields
    document.getElementById('auth-email').value = '';
    document.getElementById('auth-password').value = '';
    const errorMsgDiv = document.getElementById('auth-error-msg');
    if (errorMsgDiv) errorMsgDiv.style.display = 'none';
    
    showToast('Desconectado com sucesso.', 'success');
  } catch (err) {
    console.error('Logout error:', err);
    showToast('Erro ao desconectar', 'error');
  }
}

// 6. Na inicialização do app, verificar se já tem sessão ativa
async function checkUserAuthOnLoad() {
  try {
    const { data: { session } } = await db.auth.getSession();
    if (session && session.user) {
      // Active session found! Load CRM data
      const email = session.user.email || '';
      const isRyan = email.toLowerCase() === 'deazevedor640@gmail.com';
      const formattedName = isRyan ? 'Ryan de Azevedo' : 'Vithor';
      const sellerName = isRyan ? 'Ryan' : 'Vithor';
      const avatarName = isRyan ? 'ryan.png' : 'vithor.png';
      
      localStorage.setItem('voxecrm_current_user', JSON.stringify({
        username: isRyan ? 'ryan' : 'vithor',
        name: formattedName,
        sellerName: sellerName,
        avatar: avatarName,
        email: email
      }));
      
      applyUserLoginState(formattedName, avatarName);
      
      // Hide overlay instantly on load
      const overlay = document.getElementById('auth-overlay');
      overlay.style.transition = 'none';
      overlay.classList.add('hidden');
      setTimeout(() => {
        overlay.style.transition = '';
      }, 50);
      
      appState.currentTab = 'dashboard';
      await initApp();
      switchTab('dashboard');
    } else {
      // No session, redirect to login overlay screen
      localStorage.removeItem('voxecrm_current_user');
      document.getElementById('auth-overlay').classList.remove('hidden');
    }
  } catch (e) {
    console.error('Error checking user auth session on load:', e);
    document.getElementById('auth-overlay').classList.remove('hidden');
  }
}

function copyPhoneToClipboard(event, phone) {
  if (event) event.stopPropagation();
  if (!phone) return;
  
  navigator.clipboard.writeText(phone).then(() => {
    showToast('Número de telefone copiado! 📋', 'success');
  }).catch(err => {
    console.error('Erro ao copiar telefone:', err);
  });
}

// ADDRESS MODAL HANDLERS
function openAddressModal(leadId) {
  event?.stopPropagation(); // Prevent double click or row focus issues
  const lead = db.getLeadById(leadId);
  if (!lead) return;
  
  appState.activeAddressModalLeadId = leadId;
  
  document.getElementById('address-modal-lead-name').textContent = lead.name;
  document.getElementById('address-modal-text').textContent = lead.address || 'Endereço não disponível.';
  
  // Show backdrop and open modal
  document.getElementById('address-modal-backdrop').style.display = 'block';
  setTimeout(() => {
    document.getElementById('address-modal').classList.add('open');
  }, 50);
}

function closeAddressModal() {
  document.getElementById('address-modal').classList.remove('open');
  setTimeout(() => {
    document.getElementById('address-modal-backdrop').style.display = 'none';
  }, 300);
  appState.activeAddressModalLeadId = null;
}

function copyAddressFromModal() {
  const addressText = document.getElementById('address-modal-text').textContent;
  if (!addressText || addressText === 'Endereço não disponível.') {
    showToast('Nenhum endereço para copiar.', 'error');
    return;
  }
  
  navigator.clipboard.writeText(addressText).then(() => {
    showToast('Endereço copiado! 📋', 'success');
  }).catch(err => {
    console.error('Erro ao copiar endereço:', err);
    showToast('Erro ao copiar endereço.', 'error');
  });
}

function openAddressInMaps() {
  const leadId = appState.activeAddressModalLeadId;
  const lead = db.getLeadById(leadId);
  if (!lead) return;
  
  let mapsUrl = lead.mapsLink;
  if (!mapsUrl || mapsUrl === '' || mapsUrl === '""') {
    const query = lead.address ? `${lead.address} ${lead.name}` : lead.name;
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }
  
  window.open(mapsUrl, '_blank');
}

// MEETING DATE WORKFLOW MODAL
function openMeetingDateModal(leadId, oldStatus = null) {
  appState.activeMeetingDateLeadId = leadId;
  const lead = db.getLeadById(leadId);
  if (!lead) return;
  
  appState.meetingDateConfirmed = false;
  appState.previousMeetingStatus = oldStatus || lead.status;
  
  const dateInput = document.getElementById('meeting-date-input');
  const timeInput = document.getElementById('meeting-time-input');
  const decisorInput = document.getElementById('meeting-decisor-input');
  const warmupInput = document.getElementById('meeting-warmup-input');
  const notesInput = document.getElementById('meeting-notes-input');
  
  // Set date input value to existing or today formatted YYYY-MM-DD
  let defaultVal = '';
  if (lead.meetingDate) {
    const parts = lead.meetingDate.split('/');
    if (parts.length === 3) {
      defaultVal = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  
  if (!defaultVal) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    defaultVal = `${yyyy}-${mm}-${dd}`;
  }
  
  dateInput.value = defaultVal;
  
  // Pre-populate time, decisor, warmup, notes if they exist
  timeInput.value = lead.meetingTime || '';
  decisorInput.value = lead.decisor || '';
  document.getElementById('meeting-email-input').value = lead.email || '';
  warmupInput.value = lead.warmup !== undefined ? lead.warmup : '8'; // default to 8/10
  notesInput.value = lead.meetingNotes || '';
  
  // New fields
  document.getElementById('meeting-ticket-input').value = lead.estimatedTicket || lead.value || '';
  document.getElementById('meeting-probability-input').value = lead.probability || '50';
  
  document.getElementById('meeting-date-modal-backdrop').style.display = 'block';
  document.getElementById('meeting-date-modal').classList.add('open');
}

function closeMeetingDateModal() {
  document.getElementById('meeting-date-modal').classList.remove('open');
  setTimeout(() => {
    document.getElementById('meeting-date-modal-backdrop').style.display = 'none';
  }, 300);
  
  const leadId = appState.activeMeetingDateLeadId;
  if (leadId && !appState.meetingDateConfirmed && appState.previousMeetingStatus) {
    db.updateLead(leadId, { status: appState.previousMeetingStatus });
    showToast('Agendamento cancelado. Status revertido.', 'info');
  }
  
  appState.activeMeetingDateLeadId = null;
  appState.previousMeetingStatus = null;
  appState.meetingDateConfirmed = false;
  // Refresh anyway to reload table properly
  initApp();
}

function confirmMeetingDate() {
  const leadId = appState.activeMeetingDateLeadId;
  if (!leadId) return;
  
  const rawDate = document.getElementById('meeting-date-input').value;
  if (!rawDate) {
    showToast('Por favor, insira uma data válida.', 'error');
    return;
  }
  
  // Convert YYYY-MM-DD to DD/MM/YYYY
  const parts = rawDate.split('-');
  let formattedDate = rawDate;
  if (parts.length === 3) {
    formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  
  const time = document.getElementById('meeting-time-input').value || '';
  const decisor = document.getElementById('meeting-decisor-input').value.trim();
  const email = document.getElementById('meeting-email-input').value.trim();
  const warmup = document.getElementById('meeting-warmup-input').value;
  const meetingNotes = document.getElementById('meeting-notes-input').value.trim();
  
  const estimatedTicketVal = parseFloat(document.getElementById('meeting-ticket-input').value) || 0;
  const probabilityVal = parseInt(document.getElementById('meeting-probability-input').value, 10) || 50;
  
  appState.meetingDateConfirmed = true;
  
  const lead = db.getLeadById(leadId);
  const leadName = lead ? lead.name : 'Clínica';
  const assessorName = document.getElementById('user-name-display')?.textContent || 'Assessor';

  // Generate Protocol Number (#DDMMYYYYHHMM)
  const dateClean = formattedDate.replace(/\//g, '');
  const timeClean = time.replace(/:/g, '');
  const protocolNumber = `#${dateClean}${timeClean}`;

  db.updateLead(leadId, {
    meetingDate: formattedDate,
    meetingTime: time,
    decisor: decisor,
    email: email,
    warmup: warmup,
    meetingNotes: meetingNotes,
    estimatedTicket: estimatedTicketVal,
    value: estimatedTicketVal,
    probability: probabilityVal,
    meetingProtocol: protocolNumber,
    status: 'Reunião Agendada'
  });
  
  // Generate and Download PDF Protocol
  try {
    generateMeetingProtocolPDF(lead, protocolNumber, formattedDate, time, decisor, email, warmup, meetingNotes, estimatedTicketVal, probabilityVal, assessorName);
    showToast('Protocolo em PDF gerado! 📄', 'info');
  } catch (err) {
    console.error('Error generating PDF:', err);
  }
  
  // Add commercial notification
  addNotification('meeting', `<strong>${assessorName}</strong> agendou reunião com <strong>${leadName}</strong> para <strong>${formattedDate} às ${time}</strong> (Protocolo: ${protocolNumber})`);
  
  closeMeetingDateModal();
  showToast('Reunião comercial agendada! 📅', 'success');
  
  // Trigger Confetti Burst celebration!
  triggerConfettiBurst();
}

// MEETING END TIME CALCULATOR
function calculateMeetingEndTime(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return '';
  let hour = parseInt(parts[0], 10);
  let min = parseInt(parts[1], 10);
  
  // 30 minute meetings by default
  min += 30;
  if (min >= 60) {
    min -= 60;
    hour += 1;
  }
  if (hour >= 24) {
    hour -= 24;
  }
  
  const hStr = String(hour).padStart(2, '0');
  const mStr = String(min).padStart(2, '0');
  return `${hStr}:${mStr}`;
}

// MEETING PROTOCOL PDF GENERATOR
function generateMeetingProtocolPDF(lead, protocolNumber, formattedDate, time, decisor, email, warmup, meetingNotes, estimatedTicketVal, probabilityVal, assessorName) {
  const ryanSignatureBase64 = '#FEFEFC (1) (1).png';

  // Create wrapper that is fixed at 0,0 but has z-index -9999 (placed behind everything on screen, fully invisible to user, does not block mouse events)
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '0';
  wrapper.style.top = '0';
  wrapper.style.width = '750px';
  wrapper.style.zIndex = '-9999';
  wrapper.style.pointerEvents = 'none';
  
  // Create container inside wrapper, relative position, fully visible layout
  const container = document.createElement('div');
  container.className = 'light-theme';
  container.style.width = '750px';
  container.style.backgroundColor = '#ffffff';
  container.style.position = 'relative';
  
  let displayAssessorName = assessorName || 'Assessor';
  if (displayAssessorName === 'Ryan Az' || displayAssessorName === 'ryan' || displayAssessorName.toLowerCase().includes('ryan')) {
    displayAssessorName = 'Ryan de Azevedo';
  }

  const leadName = lead ? lead.name : 'Clínica';
  const leadPhone = lead ? (lead.phone || 'Não Mapeado') : 'Não Mapeado';
  const leadEmail = email || (lead ? (lead.email || 'Não Mapeado') : 'Não Mapeado');
  const leadWebsite = lead ? (lead.website || 'Não Mapeado') : 'Não Mapeado';

  let signatureHtml = '';
  if (displayAssessorName === 'Ryan de Azevedo' && ryanSignatureBase64) {
    signatureHtml = `
      <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end; align-items: center; width: 100%;">
        <div style="text-align: center; width: 220px; position: relative;">
          <div style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); height: 55px; width: 120px; z-index: 2; pointer-events: none;">
            <img src="${ryanSignatureBase64}" alt="Assinatura" style="max-height: 55px; width: auto;" />
          </div>
          <div style="border-top: 1px solid #94a3b8; width: 220px; margin-top: 45px; position: relative; z-index: 1;"></div>
          <div style="font-size: 0.8rem; font-weight: 700; color: #1e293b; margin-top: 5px; font-family: 'Outfit', sans-serif;">${displayAssessorName}</div>
          <div style="font-size: 0.65rem; color: #64748b; font-family: 'Outfit', sans-serif;">Assessor Comercial · Voxe</div>
        </div>
      </div>
    `;
  } else {
    signatureHtml = `
      <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end; align-items: center; width: 100%;">
        <div style="text-align: center; width: 220px; position: relative;">
          <div style="border-top: 1px solid #94a3b8; width: 220px; margin-top: 45px; position: relative; z-index: 1;"></div>
          <div style="font-size: 0.8rem; font-weight: 700; color: #1e293b; margin-top: 5px; font-family: 'Outfit', sans-serif;">${displayAssessorName}</div>
          <div style="font-size: 0.65rem; color: #64748b; font-family: 'Outfit', sans-serif;">Assessor Comercial · Voxe</div>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; padding: 2.5rem; background: #fff; max-width: 750px; box-sizing: border-box; border: 1px solid #e2e8f0; border-radius: 8px;">
      <!-- Header Bar -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2bc2d1; padding-bottom: 1.25rem; margin-bottom: 1.75rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.65rem;">
            <div style="font-size: 1.5rem; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; font-family: 'Outfit', sans-serif; text-transform: uppercase;">
              <span style="color: #2bc2d1;">Voxe</span>
            </div>
          </div>
          <div style="font-size: 0.75rem; color: #475569; line-height: 1.5; font-family: 'Outfit', sans-serif;">
            <strong style="color: #0f172a;">ASSESSORIA VOXE - MARKETING PARA VETERINÁRIOS</strong><br>
            <strong>CNPJ:</strong> 67.592.523/0001-45<br>
            <strong>E-mail:</strong> atendimento@assessoriavoxe.com<br>
            <strong>Endereço:</strong> Rua Pais Leme, 215, Conjunto 1713 - Pinheiros, São Paulo/SP - CEP 05424-150
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.82rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Outfit', sans-serif;">Protocolo de Agendamento</div>
          <div style="font-size: 1.25rem; font-weight: 800; color: #2bc2d1; margin-top: 0.25rem; font-family: monospace;">${protocolNumber}</div>
          <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 0.35rem; font-family: 'Outfit', sans-serif;">Emitido em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</div>
        </div>
      </div>

      <!-- Document Title -->
      <div style="text-align: center; margin-bottom: 1.5rem;">
        <h1 style="font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 1px; font-family: 'Outfit', sans-serif;">Termo de Confirmação e Protocolo Comercial</h1>
        <div style="width: 50px; height: 3px; background: #2bc2d1; margin: 0.65rem auto 0 auto; border-radius: 2px;"></div>
      </div>
      
      <p style="font-size: 0.82rem; color: #475569; text-align: center; margin: 0 auto 1.75rem auto; max-width: 600px; line-height: 1.5;">
        Este documento oficializa o agendamento da reunião de alinhamento estratégico entre a <strong>Assessoria Voxe</strong> e a empresa <strong>${leadName}</strong>, servindo como comprovante de protocolo de atendimento.
      </p>

      <!-- Content Grid -->
      <div style="display: flex; gap: 1.5rem; margin-bottom: 2rem; width: 100%;">
        
        <!-- Client Section -->
        <div style="flex: 1; background: #f8fafc; padding: 1.15rem; border-radius: 6px; border-left: 3px solid #64748b; box-sizing: border-box;">
          <h3 style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: #475569; margin: 0 0 0.75rem 0; letter-spacing: 0.5px; font-family: 'Outfit', sans-serif;">Dados do Lead / Empresa</h3>
          <div style="display: flex; flex-direction: column; gap: 0.45rem; font-size: 0.82rem; color: #334155; line-height: 1.4;">
            <div><strong>Empresa:</strong> ${leadName}</div>
            <div><strong>Telefone:</strong> ${leadPhone}</div>
            <div><strong>E-mail:</strong> ${leadEmail}</div>
            <div><strong>Website:</strong> ${leadWebsite}</div>
          </div>
        </div>

        <!-- Meeting Section -->
        <div style="flex: 1; background: #f0fdfa; padding: 1.15rem; border-radius: 6px; border-left: 3px solid #2bc2d1; box-sizing: border-box;">
          <h3 style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: #0d9488; margin: 0 0 0.75rem 0; letter-spacing: 0.5px; font-family: 'Outfit', sans-serif;">Detalhes do Protocolo</h3>
          <div style="display: flex; flex-direction: column; gap: 0.45rem; font-size: 0.82rem; color: #115e59; line-height: 1.4;">
            <div><strong>Data:</strong> ${formattedDate}</div>
            <div><strong>Horário:</strong> ${time} às ${calculateMeetingEndTime(time)}</div>
            <div><strong>Assessor Responsável:</strong> ${displayAssessorName}</div>
            <div><strong>Decisor Mapeado:</strong> ${decisor || 'Não Mapeado'}</div>
          </div>
        </div>

      </div>

      <!-- Confirmation Details -->
      <div style="margin-bottom: 2rem;">
        <div style="background: #fafafa; padding: 1.5rem; border-radius: 6px; border: 1px solid #e2e8f0; box-sizing: border-box; line-height: 1.6; font-size: 0.8rem; color: #334155;">
          <h3 style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: #475569; margin: 0 0 0.85rem 0; letter-spacing: 0.5px; font-family: 'Outfit', sans-serif; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">Termo de Compromisso e Presença</h3>
          <p style="margin-bottom: 0.75rem;">
            Esta reunião foi agendada por <strong>${displayAssessorName}</strong> e o horário das <strong>${time}</strong> foi reservado exclusivamente para <strong>${leadName}</strong>, com bloqueio na agenda estratégica da Voxe.
          </p>
          <p style="margin-bottom: 0.75rem;">
            Para esta sessão, nossa equipe preparou um atendimento dedicado à análise comercial da clínica, identificação de oportunidades de crescimento e apresentação de estratégias voltadas à aceleração da captação de clientes e fortalecimento da presença da empresa na região.
          </p>
          <p style="margin-bottom: 0.75rem;">
            Em razão da disponibilidade limitada da agenda e da alta demanda de clínicas veterinárias que solicitam atendimento em todo o Brasil, este horário deixa de ser disponibilizado para outras empresas enquanto permanece reservado para sua clínica.
          </p>
          <p style="margin-bottom: 0.75rem;">
            Caso seja necessário reagendar, solicitamos que <strong>${displayAssessorName}</strong> seja comunicado com antecedência mínima de 1 hora, sendo 24 horas o prazo recomendado. Isso permite que a agenda seja reorganizada de forma eficiente e que outro empreendimento possa ser atendido.
          </p>
          <p style="margin-bottom: 0.75rem; color: #991b1b; font-weight: 600;">
            O não comparecimento ou o cancelamento sem aviso prévio resulta na perda de uma sessão estratégica exclusiva e compromete o planejamento operacional da nossa equipe.
          </p>
          <p style="margin-bottom: 0; font-style: italic; color: #475569;">
            Na Voxe, acreditamos que empresas que priorizam crescimento tratam compromissos estratégicos com o mesmo nível de seriedade que esperam de seus parceiros. O respeito ao horário reservado reflete esse compromisso mútuo com resultados.
          </p>
        </div>
      </div>

      ${signatureHtml}

      <!-- Certification Footer -->
      <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 1.5rem; margin-top: 2rem;">
        <p style="font-size: 0.7rem; color: #64748b; line-height: 1.5; max-width: 500px; margin: 0 auto;">
          Este documento oficializa a criação do protocolo de agendamento comercial. O assessor designado entrará em contato pontualmente na data e hora especificadas.
        </p>
        <div style="margin-top: 1.25rem; font-size: 0.72rem; color: #0f172a; font-weight: 700; letter-spacing: 0.5px;">
          VOXE CRM · SISTEMA DE PROSPECÇÃO COMERCIAL DE ALTA VELOCIDADE
        </div>
      </div>
    </div>
  `;

  wrapper.appendChild(container);
  document.body.appendChild(wrapper);

  let pdfTriggered = false;
  const triggerPDFGeneration = () => {
    if (pdfTriggered) return;
    pdfTriggered = true;

    const opt = {
      margin:       [10, 10, 10, 10],
      filename:     `protocolo_${protocolNumber.replace('#', '')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, letterRendering: true, scrollX: 0, scrollY: 0 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(container).save().then(() => {
      document.body.removeChild(wrapper);
    }).catch(err => {
      console.error('Error generating PDF:', err);
      document.body.removeChild(wrapper);
    });
  };

  // Fallback timeout to ensure PDF is generated even if onload/onerror never fire
  const timeoutId = setTimeout(triggerPDFGeneration, 1000);

  const img = container.querySelector('img');
  if (img) {
    if (img.complete) {
      clearTimeout(timeoutId);
      triggerPDFGeneration();
    } else {
      img.onload = () => {
        clearTimeout(timeoutId);
        triggerPDFGeneration();
      };
      img.onerror = () => {
        clearTimeout(timeoutId);
        triggerPDFGeneration();
      };
    }
  } else {
    clearTimeout(timeoutId);
    triggerPDFGeneration();
  }
}

// DIRECT DOWNLOAD LEAD PROTOCOL
function downloadLeadProtocolDirect(leadId) {
  const lead = db.getLeadById(leadId);
  if (!lead) {
    showToast('Lead não encontrado.', 'error');
    return;
  }
  
  const formattedDate = lead.meetingDate || '';
  const time = lead.meetingTime || '';
  if (!formattedDate) {
    showToast('Este lead não possui data de reunião definida.', 'error');
    return;
  }
  
  let protocolNumber = lead.meetingProtocol;
  if (!protocolNumber) {
    const dateClean = formattedDate.replace(/\//g, '');
    const timeClean = time.replace(/:/g, '');
    protocolNumber = `#${dateClean}${timeClean}`;
    db.updateLead(leadId, { meetingProtocol: protocolNumber });
  }
  
  const decisor = lead.decisor || '';
  const email = lead.email || '';
  const warmup = lead.warmup || '5';
  const meetingNotes = lead.meetingNotes || '';
  const estimatedTicketVal = parseFloat(lead.estimatedTicket) || parseFloat(lead.value) || 0;
  const probabilityVal = parseInt(lead.probability, 10) || 50;
  const assessorName = lead.seller || document.getElementById('user-name-display')?.textContent || 'Assessor';
  
  try {
    generateMeetingProtocolPDF(lead, protocolNumber, formattedDate, time, decisor, email, warmup, meetingNotes, estimatedTicketVal, probabilityVal, assessorName);
    showToast('Protocolo em PDF gerado! 📄', 'info');
  } catch (err) {
    console.error('Error generating PDF:', err);
    showToast('Erro ao gerar o PDF do protocolo.', 'error');
  }
}
window.downloadLeadProtocolDirect = downloadLeadProtocolDirect;

// CLOSE SALE WORKFLOW
let activeCloseSaleLeadId = null;

function openCloseSaleModal(leadId, oldStatus = null) {
  activeCloseSaleLeadId = leadId;
  const lead = db.getLeadById(leadId);
  if (!lead) return;
  
  appState.closeSaleConfirmed = false;
  appState.previousCloseSaleStatus = oldStatus || lead.status;
  
  // Populate the default closed value input with estimated ticket or value
  const valueInput = document.getElementById('close-sale-value-input');
  valueInput.value = lead.estimatedTicket || lead.value || 0;
  
  // Populate the recurrent checkbox
  const recurrentInput = document.getElementById('close-sale-recurrent-input');
  if (recurrentInput) {
    recurrentInput.checked = lead.isRecurrent || false;
  }
  
  document.getElementById('close-sale-modal-backdrop').style.display = 'block';
  document.getElementById('close-sale-modal').classList.add('open');
}

function closeCloseSaleModal() {
  document.getElementById('close-sale-modal').classList.remove('open');
  setTimeout(() => {
    document.getElementById('close-sale-modal-backdrop').style.display = 'none';
  }, 300);
  
  const leadId = activeCloseSaleLeadId;
  if (leadId && !appState.closeSaleConfirmed && appState.previousCloseSaleStatus) {
    db.updateLead(leadId, { status: appState.previousCloseSaleStatus });
    showToast('Fechamento de venda cancelado. Status revertido.', 'info');
  }
  
  activeCloseSaleLeadId = null;
  appState.previousCloseSaleStatus = null;
  appState.closeSaleConfirmed = false;
  initApp();
}

function confirmCloseSale() {
  const leadId = activeCloseSaleLeadId;
  if (!leadId) return;
  
  const closedVal = parseFloat(document.getElementById('close-sale-value-input').value) || 0;
  const isRecurrentVal = document.getElementById('close-sale-recurrent-input')?.checked || false;
  
  appState.closeSaleConfirmed = true;
  
  const lead = db.getLeadById(leadId);
  const leadName = lead ? lead.name : 'Clínica';
  const assessorName = document.getElementById('user-name-display')?.textContent || 'Assessor';

  db.updateLead(leadId, {
    closedValue: closedVal,
    value: closedVal,
    status: 'Venda Fechada',
    isRecurrent: isRecurrentVal,
    saleDate: new Date().toLocaleDateString('pt-BR'),
    saleTimestamp: Date.now()
  });
  
  const labelRecurrent = isRecurrentVal ? ' (Recorrente)' : ' (Pontual)';
  logContactAttemptSilent(leadId, 'Status', `Venda Fechada - Valor fechado: R$ ${closedVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${labelRecurrent}`);
  
  // Add sale notification
  addNotification('sale', `<strong>${assessorName}</strong> fechou venda com <strong>${leadName}</strong> no valor de <strong>R$ ${closedVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>${labelRecurrent}! 🏆`);
  
  closeCloseSaleModal();
  showToast('Venda Fechada com sucesso! 💰🚀', 'success');
  
  // Trigger Confetti Burst celebration!
  triggerConfettiBurst();
}

function triggerDrawerCloseSale() {
  const leadId = appState.activeScriptDrawerLeadId;
  if (!leadId) return;
  const lead = db.getLeadById(leadId);
  const oldStatus = lead ? lead.status : null;
  closeScriptDrawer();
  openCloseSaleModal(leadId, oldStatus);
}

// CONFETTI PHYSICS CELEBRATION
function triggerConfettiBurst() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  const colors = ['#2bc2d1', '#10b981', '#f59e0b', '#3b82f6', '#ef4444'];
  const particles = [];
  
  // Spawn 150 particles shooting up from the bottom center
  for (let i = 0; i < 150; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height + 20,
      vx: (Math.random() - 0.5) * 20,
      vy: -(Math.random() * 18 + 12),
      size: Math.random() * 8 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      opacity: 1
    });
  }
  
  let animationFrameId;
  function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let active = false;
    
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.45; // Gravity
      p.vx *= 0.98; // Friction
      p.rotation += p.rotationSpeed;
      
      // Fade out
      if (p.y > canvas.height / 2) {
        p.opacity -= 0.006;
      } else {
        p.opacity -= 0.002;
      }
      
      if (p.opacity > 0 && p.y < canvas.height + 50) {
        active = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    });
    
    if (active) {
      animationFrameId = requestAnimationFrame(update);
    } else {
      canvas.style.display = 'none';
      cancelAnimationFrame(animationFrameId);
    }
  }
  
  update();
}

// STICKY NOTES ENGINE
let stickyNotesList = [];
const STICKY_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#f97316'];

function setupGeneralNotepad() {
  try {
    const stored = localStorage.getItem('voxecrm_sticky_notes');
    if (stored) {
      stickyNotesList = JSON.parse(stored);
    } else {
      // Seed with some default onboarding notes if empty
      stickyNotesList = [
        {
          id: 'note_1',
          content: 'MCC = USUARIO\nMETA = BM, CONTA DE ANUNCIO\n---//---',
          color: '#f59e0b',
          date: '20 de jun',
          timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000
        },
        {
          id: 'note_2',
          content: '"faço parte da Expad, somos uma empresa de tecnologia... estamos buscando parcerias com Gestores de tráfego, hoje você já utiliza algum software, CRM ou algo assim?"',
          color: '#3b82f6',
          date: '22 de jun',
          timestamp: Date.now() - 24 * 60 * 60 * 1000
        },
        {
          id: 'note_3',
          content: '85 reais money campanhas - Idioma kids\n- Colocar 5 reais por conta que gastou',
          color: '#10b981',
          date: '24 de jun',
          timestamp: Date.now()
        }
      ];
      saveStickyNotes();
    }
    renderStickyNotes();
  } catch (e) {
    console.error('Error loading sticky notes:', e);
  }
}

function saveStickyNotes() {
  localStorage.setItem('voxecrm_sticky_notes', JSON.stringify(stickyNotesList));
}

function formatStickyNoteDate(dateObj) {
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${dateObj.getDate()} de ${months[dateObj.getMonth()]}`;
}

function renderStickyNotes(filteredList = null) {
  const grid = document.getElementById('sticky-notes-grid');
  if (!grid) return;

  const listToRender = filteredList || stickyNotesList;
  
  // Sort by timestamp descending (newest first)
  const sortedList = [...listToRender].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  grid.innerHTML = '';
  
  if (sortedList.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--color-text-muted); font-size: 0.88rem;">Nenhuma nota encontrada. Crie uma clicando em "Nova Nota"!</div>`;
    return;
  }

  sortedList.forEach(note => {
    const card = document.createElement('div');
    card.className = 'sticky-note-card';
    card.style.cssText = `
      background: rgba(255, 255, 255, 0.05); 
      border-radius: 8px; 
      border-top: 4px solid ${note.color}; 
      padding: 0.85rem 1rem 1rem 1rem; 
      display: flex; 
      flex-direction: column; 
      gap: 0.65rem; 
      min-height: 180px; 
      position: relative; 
      box-shadow: 0 4px 15px rgba(0,0,0,0.1); 
      border-left: 1px solid rgba(255,255,255,0.03); 
      border-right: 1px solid rgba(255,255,255,0.03); 
      border-bottom: 1px solid rgba(255,255,255,0.03);
      transition: transform 0.2s, box-shadow 0.2s;
    `;
    
    // Hover animation
    card.onmouseenter = () => {
      card.style.transform = 'translateY(-2px)';
      card.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
    };
    card.onmouseleave = () => {
      card.style.transform = 'none';
      card.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
    };

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; color: var(--color-text-muted); height: 20px; user-select: none;">
        <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${note.color}; opacity: 0.7;"></span>
        <div style="display: flex; align-items: center; gap: 0.45rem;">
          <span style="font-weight: 500;">${note.date}</span>
          <button onclick="deleteStickyNote('${note.id}')" style="background: none; border: none; color: var(--color-text-muted); cursor: pointer; font-size: 0.85rem; padding: 2px; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: color 0.15s, background 0.15s;" onmouseover="this.style.color='#ef4444'; this.style.background='rgba(239, 68, 68, 0.08)'" onmouseout="this.style.color='var(--color-text-muted)'; this.style.background='none'" title="Excluir Nota">🗑️</button>
        </div>
      </div>
      <textarea oninput="updateStickyNoteContent('${note.id}', this.value)" style="flex: 1; width: 100%; background: none; border: none; color: #fff; font-size: 0.85rem; line-height: 1.5; resize: none; outline: none; font-family: inherit; padding: 0; margin-top: 0.25rem;" placeholder="Digite sua nota aqui...">${note.content || ''}</textarea>
    `;
    grid.appendChild(card);
  });
}

function addStickyNote() {
  const newColor = STICKY_COLORS[stickyNotesList.length % STICKY_COLORS.length];
  const newNote = {
    id: `note_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    content: '',
    color: newColor,
    date: formatStickyNoteDate(new Date()),
    timestamp: Date.now()
  };
  
  stickyNotesList.push(newNote);
  saveStickyNotes();
  
  // Clear search filter so the new note is visible immediately
  const searchInput = document.getElementById('search-sticky-notes');
  if (searchInput) searchInput.value = '';
  
  renderStickyNotes();
  
  // Focus the newly created note's textarea
  setTimeout(() => {
    const grid = document.getElementById('sticky-notes-grid');
    if (grid && grid.firstElementChild) {
      const textarea = grid.firstElementChild.querySelector('textarea');
      if (textarea) textarea.focus();
    }
  }, 50);
}

function updateStickyNoteContent(id, content) {
  const index = stickyNotesList.findIndex(n => n.id === id);
  if (index === -1) return;
  
  stickyNotesList[index].content = content;
  stickyNotesList[index].timestamp = Date.now();
  stickyNotesList[index].date = formatStickyNoteDate(new Date());
  saveStickyNotes();
}

function deleteStickyNote(id) {
  if (!confirm('Deseja realmente excluir esta nota?')) return;
  
  stickyNotesList = stickyNotesList.filter(n => n.id !== id);
  saveStickyNotes();
  
  // Re-run filter to refresh current view
  filterStickyNotes();
}

function filterStickyNotes() {
  const query = document.getElementById('search-sticky-notes')?.value?.toLowerCase() || '';
  if (!query) {
    renderStickyNotes();
    return;
  }
  
  const filtered = stickyNotesList.filter(note => 
    (note.content || '').toLowerCase().includes(query)
  );
  renderStickyNotes(filtered);
}

// Expose functions globally
window.addStickyNote = addStickyNote;
window.deleteStickyNote = deleteStickyNote;
window.updateStickyNoteContent = updateStickyNoteContent;
window.filterStickyNotes = filterStickyNotes;

// CHART.JS INSTANCES CONTAINER

// REAVIZ STYLE DYNAMIC AREA CHART RENDERER
function updateDashboardCharts() {
  const tabView = document.getElementById('view-dashboard');
  if (!tabView || tabView.classList.contains('hidden')) return; // Avoid chart sizing bug in hidden divs
  
  const sellerFilter = document.getElementById('dashboard-seller-filter')?.value || 'all';
  const leads = sellerFilter === 'all' 
    ? appState.leads 
    : appState.leads.filter(l => {
        const sellerName = String(l.seller || '').toLowerCase();
        const filterName = sellerFilter.toLowerCase();
        return sellerName.includes(filterName) || filterName.includes(sellerName);
      });
  
  const totalLeads = leads.length;
  const totalAgendados = leads.filter(l => l.status === 'Reunião Agendada').length;
  const totalShow = leads.filter(l => l.status === 'Show').length;
  const totalNoShow = leads.filter(l => l.status === 'No-Show').length;
  const totalNoFechou = leads.filter(l => l.status === 'Fechamento Não Realizado').length;
  const totalSalesStatus = leads.filter(l => l.status === 'Venda Fechada').length;
  
  const totalContacted = leads.filter(l => l.status === '✋/Em contato' || l.status === 'Reunião Agendada' || l.status === 'Show' || l.status === 'No-Show' || l.status === 'Fechamento Não Realizado' || l.status === 'Venda Fechada').length;
  const withWebsite = leads.filter(l => l.website && l.website !== '' && l.website !== '""').length;
  
  // New metrics calculations
  const totalReunioes = totalAgendados + totalShow + totalNoShow + totalSalesStatus + totalNoFechou;
  const showRate = totalReunioes > 0 ? Math.round(((totalShow + totalSalesStatus + totalNoFechou) / totalReunioes) * 100) : 0;
  const noShowRate = totalReunioes > 0 ? Math.round((totalNoShow / totalReunioes) * 100) : 0;
  const noFechouRate = totalReunioes > 0 ? Math.round((totalNoFechou / totalReunioes) * 100) : 0;
  
  // Calculate Projected Revenue
  let faturamentoProjetado = 0;
  leads.forEach(l => {
    if (l.status === 'Reunião Agendada' || l.status === 'Show') {
      const ticket = parseFloat(l.estimatedTicket) || 0;
      const probability = parseFloat(l.probability) || 0;
      faturamentoProjetado += (ticket * probability) / 100;
    }
  });

  // Calculate Realized Revenue
  let faturamentoRealizado = 0;
  leads.forEach(l => {
    if (l.status === 'Venda Fechada') {
      faturamentoRealizado += parseFloat(l.closedValue) || 0;
    }
  });

  // Update text values in dashboard UI
  document.getElementById('stats-agendadas-val').textContent = totalAgendados;
  document.getElementById('stats-leads-val').textContent = totalLeads;
  
  // Update new stats cards
  document.getElementById('stats-total-reunioes-val').textContent = totalReunioes;
  document.getElementById('stats-show-rate-val').textContent = `${showRate}%`;
  document.getElementById('stats-show-count').textContent = totalShow + totalSalesStatus + totalNoFechou;
  document.getElementById('stats-noshow-rate-val').textContent = `${noShowRate}%`;
  document.getElementById('stats-noshow-count').textContent = totalNoShow;
  
  const nofechouRateEl = document.getElementById('stats-nofechou-rate-val');
  if (nofechouRateEl) nofechouRateEl.textContent = `${noFechouRate}%`;
  const nofechouCountEl = document.getElementById('stats-nofechou-count');
  if (nofechouCountEl) nofechouCountEl.textContent = totalNoFechou;
  
  // Calculate Call and Message touchpoint outcomes
  let totalCalls = 0;
  let totalMsgs = 0;
  let callsAgendou = 0;
  let callsNaoAtendeu = 0;
  let callsSemInteresse = 0;
  let callsLevantouMao = 0;
  
  let msgsEnviadas = 0;
  let msgsAgendou = 0;
  let msgsSemInteresse = 0;
  let msgsLevantouMao = 0;
  let msgsOutros = 0;

  leads.forEach(l => {
    const contacts = l.contacts || [];
    contacts.forEach(c => {
      if (c.type === 'Ligação') {
        totalCalls++;
        if (c.notes) {
          if (c.notes.includes('Agendou')) callsAgendou++;
          else if (c.notes.includes('Não atendeu')) callsNaoAtendeu++;
          else if (c.notes.includes('Sem interesse')) callsSemInteresse++;
          else if (c.notes.includes('Levantou a mão')) callsLevantouMao++;
        }
      } else if (c.type === 'Mensagem') {
        totalMsgs++;
        if (c.notes) {
          if (c.notes.includes('Enviada')) msgsEnviadas++;
          else if (c.notes.includes('Agendou')) msgsAgendou++;
          else if (c.notes.includes('Sem interesse')) msgsSemInteresse++;
          else if (c.notes.includes('Levantou a mão')) msgsLevantouMao++;
          else msgsOutros++;
        } else {
          msgsEnviadas++;
        }
      }
    });
  });

  const callsBadgeEl = document.getElementById('stats-calls-outcomes-badge');
  const msgsBadgeEl = document.getElementById('stats-msgs-outcomes-badge');
  const totalCallsValEl = document.getElementById('stats-total-calls-val');
  const totalMsgsValEl = document.getElementById('stats-total-msgs-val');

  if (totalCallsValEl) totalCallsValEl.textContent = totalCalls;
  if (totalMsgsValEl) totalMsgsValEl.textContent = totalMsgs;
  
  if (callsBadgeEl) {
    callsBadgeEl.textContent = `${callsAgendou} 🏆 | ${callsLevantouMao} ✋ | ${callsNaoAtendeu} 📞 | ${callsSemInteresse} 🚫`;
  }
  if (msgsBadgeEl) {
    msgsBadgeEl.textContent = `${msgsEnviadas + msgsOutros} 💬 | ${msgsLevantouMao} ✋ | ${msgsAgendou} 🏆 | ${msgsSemInteresse} 🚫`;
  }

  const projEl = document.getElementById('stats-faturamento-projetado-val');
  if (projEl) {
    projEl.textContent = `R$ ${faturamentoProjetado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  const realEl = document.getElementById('stats-faturamento-realizado-val');
  if (realEl) {
    realEl.textContent = `R$ ${faturamentoRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  const contactRate = totalLeads > 0 ? Math.round((totalContacted / totalLeads) * 100) : 0;
  const contactRateEl = document.getElementById('stats-contact-rate');
  if (contactRateEl) {
    contactRateEl.textContent = `${contactRate}%`;
  }
  
  const websiteRate = totalLeads > 0 ? Math.round((withWebsite / totalLeads) * 100) : 0;
  const websiteRateEl = document.getElementById('stats-website-rate');
  if (websiteRateEl) {
    websiteRateEl.textContent = `${websiteRate}%`;
  }
  
  // Organic Leads Stats
  const organicLeads = leads.filter(l => {
    if (!l.channel) return false;
    const ch = l.channel.toLowerCase();
    return ch.includes('orgânico') || ch.includes('organico') || ch.includes('respondi') || ch.includes('sheets');
  });
  const totalOrganicLeads = organicLeads.length;
  const organicPct = totalLeads > 0 ? Math.round((totalOrganicLeads / totalLeads) * 100) : 0;
  
  const organicLeadsValEl = document.getElementById('stats-organic-leads-val');
  const organicPctValEl = document.getElementById('stats-organic-pct-val');
  if (organicLeadsValEl) {
    organicLeadsValEl.textContent = `${totalOrganicLeads} leads`;
  }
  if (organicPctValEl) {
    organicPctValEl.textContent = `${organicPct}% do total`;
  }
  
  // Handle Time Range
  const range = document.getElementById('chart-time-range').value;
  let days = 7;
  let customStartDate = null;
  let customEndDate = null;
  if (range === 'last-30-days') days = 30;
  else if (range === 'last-90-days') days = 90;
  else if (range === 'custom') {
    const startInput = document.getElementById('chart-custom-date-start')?.value;
    const endInput = document.getElementById('chart-custom-date-end')?.value;
    if (startInput && endInput) {
      const partsStart = startInput.split('-');
      const partsEnd = endInput.split('-');
      customStartDate = new Date(parseInt(partsStart[0]), parseInt(partsStart[1]) - 1, parseInt(partsStart[2]), 0, 0, 0, 0);
      customEndDate = new Date(parseInt(partsEnd[0]), parseInt(partsEnd[1]) - 1, parseInt(partsEnd[2]), 0, 0, 0, 0);
      
      const diffTime = Math.abs(customEndDate - customStartDate);
      days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      if (days <= 0) days = 1;
    }
  }
  
  // Generate mock chronological timeline ending at actual agendados
  const chartLabels = [];
  const chartData = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    if (range === 'custom' && customStartDate) {
      const dayOffset = days - 1 - i;
      date.setTime(customStartDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    } else {
      date.setDate(today.getDate() - i);
    }
    const label = date.toLocaleDateString('pt-BR', { month: 'numeric', day: 'numeric' });
    chartLabels.push(label);
    
    // Simulate beautiful progressive outbound metrics curve
    const progressRatio = (days - i) / days;
    const baseVal = Math.floor(totalAgendados * progressRatio);
    // Add realistic daily fluctuation
    const noise = Math.floor(Math.sin((days - i) * 0.5) * 2) + Math.floor(Math.random() * 2);
    chartData.push(Math.max(1, baseVal + noise));
  }
  
  const canvas = document.getElementById('reaviz-area-chart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Create beautiful brand blue area gradient matching Modernize spec
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 280);
  gradient.addColorStop(0, 'rgba(93, 135, 255, 0.35)');
  gradient.addColorStop(1, 'rgba(93, 135, 255, 0.01)');
  
  if (chartInstances.reavizArea) {
    chartInstances.reavizArea.destroy();
  }
  
  chartInstances.reavizArea = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [{
        label: 'Reuniões Agendadas',
        data: chartData,
        borderColor: '#5d87ff',
        borderWidth: 3,
        pointBackgroundColor: '#5d87ff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#5d87ff',
        pointHoverBorderWidth: 3,
        pointRadius: days === 7 ? 4 : 1,
        pointHoverRadius: 6,
        fill: true,
        backgroundColor: gradient,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e293b',
          titleColor: '#fff',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          displayColors: false,
          padding: 10,
          callbacks: {
            label: function(context) {
              return `Acumulado: ${context.raw} agendados`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: document.body.classList.contains('light-theme') ? '#475569' : '#64748b',
            font: { family: 'Plus Jakarta Sans', size: 10 }
          }
        },
        y: {
          grid: { color: document.body.classList.contains('light-theme') ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: document.body.classList.contains('light-theme') ? '#475569' : '#64748b',
            font: { family: 'Plus Jakarta Sans', size: 10 },
            stepSize: 1
          }
        }
      }
    }
  });
}

// THEME TOGGLE LOGIC
function initTheme() {
  const savedTheme = localStorage.getItem('voxecrm_theme') || 'dark';
  setThemeState(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  setThemeState(newTheme);
}

function setThemeState(theme) {
  localStorage.setItem('voxecrm_theme', theme);
  if (theme === 'light') {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
    document.body.classList.add('dark-theme');
  }
  // If the dashboard is active, re-render charts to update grid/axis colors
  if (appState.currentTab === 'dashboard') {
    updateDashboardCharts();
  }
}

// VALUES VISIBILITY LOGIC (EYE BLUR)
function toggleDashboardValuesVisibility(event) {
  if (event) event.stopPropagation();
  appState.valuesVisible = !appState.valuesVisible;
  localStorage.setItem('voxecrm_values_visible', appState.valuesVisible);
  applyValuesVisibility();
}

function applyValuesVisibility() {
  const visible = appState.valuesVisible !== false;
  const elements = document.querySelectorAll('.blur-sensitive');
  const eyeButtons = document.querySelectorAll('.cakto-card-eyebtn');
  
  elements.forEach(el => {
    if (visible) {
      el.classList.remove('cakto-value-blur');
    } else {
      el.classList.add('cakto-value-blur');
    }
  });
  
  eyeButtons.forEach(btn => {
    btn.textContent = visible ? '👁️' : '🙈';
  });
}

// CALENDAR & AGENDA tab logic
let calendarCurrentMonth = new Date().getMonth();
let calendarCurrentYear = new Date().getFullYear();

function navigateCalendar(direction) {
  calendarCurrentMonth += direction;
  if (calendarCurrentMonth < 0) {
    calendarCurrentMonth = 11;
    calendarCurrentYear--;
  } else if (calendarCurrentMonth > 11) {
    calendarCurrentMonth = 0;
    calendarCurrentYear++;
  }
  renderCalendar();
}

function renderCalendar() {
  const monthsBR = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  const titleEl = document.getElementById('calendar-month-title');
  if (titleEl) {
    titleEl.textContent = `${monthsBR[calendarCurrentMonth]} ${calendarCurrentYear}`;
  }
  
  const gridEl = document.getElementById('calendar-days-grid');
  if (!gridEl) return;
  gridEl.innerHTML = '';
  
  // First day of the current month
  const firstDay = new Date(calendarCurrentYear, calendarCurrentMonth, 1);
  // Day of the week for first day (0 = Sun, 1 = Mon, etc.)
  const startDayOfWeek = firstDay.getDay();
  // Number of days in current month
  const daysInMonth = new Date(calendarCurrentYear, calendarCurrentMonth + 1, 0).getDate();
  // Number of days in previous month
  const daysInPrevMonth = new Date(calendarCurrentYear, calendarCurrentMonth, 0).getDate();
  
  const today = new Date();
  
  // 1. Render previous month's trailing days
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell other-month';
    cell.innerHTML = `<span class="calendar-day-number">${dayNum}</span>`;
    gridEl.appendChild(cell);
  }
  
  // 2. Render current month's days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${String(day).padStart(2, '0')}/${String(calendarCurrentMonth + 1).padStart(2, '0')}/${calendarCurrentYear}`;
    const cellDateObj = new Date(calendarCurrentYear, calendarCurrentMonth, day);
    
    // Find meetings for this day
    const dayMeetings = appState.leads.filter(l => {
      const parsedMeetingDate = parseLeadDate(l.meetingDate);
      if (!parsedMeetingDate) return false;
      
      const isSameDay = parsedMeetingDate.getDate() === cellDateObj.getDate() &&
                        parsedMeetingDate.getMonth() === cellDateObj.getMonth() &&
                        parsedMeetingDate.getFullYear() === cellDateObj.getFullYear();
      
      const isMeetingStatus = l.status === 'Reunião Agendada' || l.status === 'Show' || l.status === 'No-Show' || l.status === 'Venda Fechada' || l.status === 'Fechamento Não Realizado';
      return isSameDay && isMeetingStatus;
    });
    
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell';
    
    // Check if selected
    const activeDateObj = appState.activeCalendarDate;
    if (activeDateObj && 
        activeDateObj.getDate() === day && 
        activeDateObj.getMonth() === calendarCurrentMonth && 
        activeDateObj.getFullYear() === calendarCurrentYear) {
      cell.classList.add('selected');
    }
    
    // Check if today
    if (today.getDate() === day && 
        today.getMonth() === calendarCurrentMonth && 
        today.getFullYear() === calendarCurrentYear) {
      cell.classList.add('today');
    }
    
    cell.onclick = () => {
      appState.activeCalendarDate = new Date(calendarCurrentYear, calendarCurrentMonth, day);
      // Re-render to update selected outline
      renderCalendar();
      showMeetingsForDate(dateStr);
    };
    
    // Header number
    cell.innerHTML = `<span class="calendar-day-number">${day}</span>`;
    
    // Add dots if there are meetings
    if (dayMeetings.length > 0) {
      const container = document.createElement('div');
      container.className = 'calendar-meetings-indicator-container';
      
      dayMeetings.forEach(m => {
        const dot = document.createElement('span');
        dot.className = 'calendar-meeting-dot';
        
        // Color code dots: gray for past, red for no-show/missed, green for scheduled/show
        if (m.status === 'No-Show') {
          dot.classList.add('delayed');
        } else if (m.status === 'Show' || m.status === 'Venda Fechada' || m.status === 'Fechamento Não Realizado') {
          dot.classList.add('past');
        }
        
        dot.title = `${m.meetingTime || '00:00'} - ${m.name} (${m.seller})`;
        container.appendChild(dot);
      });
      cell.appendChild(container);
    }
    
    gridEl.appendChild(cell);
  }
  
  // 3. Render next month's leading days to fill grid
  const totalCells = startDayOfWeek + daysInMonth;
  const trailingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let day = 1; day <= trailingCells; day++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell other-month';
    cell.innerHTML = `<span class="calendar-day-number">${day}</span>`;
    gridEl.appendChild(cell);
  }
  
  // Trigger loading the selected date meetings (default to active date on render)
  const activeDateObj = appState.activeCalendarDate || today;
  const formattedActive = `${String(activeDateObj.getDate()).padStart(2, '0')}/${String(activeDateObj.getMonth() + 1).padStart(2, '0')}/${activeDateObj.getFullYear()}`;
  showMeetingsForDate(formattedActive);
}

function showMeetingsForDate(dateStr) {
  const labelEl = document.getElementById('calendar-selected-date-label');
  const subEl = document.getElementById('calendar-selected-date-sub');
  const listEl = document.getElementById('calendar-meetings-list');
  
  if (labelEl) labelEl.textContent = `Reuniões de ${dateStr}`;
  if (!listEl) return;
  listEl.innerHTML = '';
  
  // Parse cell date
  const targetDate = parseLeadDate(dateStr);
  if (!targetDate) return;
  
  // Find meetings for targetDate
  const dayMeetings = appState.leads.filter(l => {
    const parsedMeetingDate = parseLeadDate(l.meetingDate);
    if (!parsedMeetingDate) return false;
    
    const isSameDay = parsedMeetingDate.getDate() === targetDate.getDate() &&
                      parsedMeetingDate.getMonth() === targetDate.getMonth() &&
                      parsedMeetingDate.getFullYear() === targetDate.getFullYear();
    
    const isMeetingStatus = l.status === 'Reunião Agendada' || l.status === 'Show' || l.status === 'No-Show' || l.status === 'Venda Fechada' || l.status === 'Fechamento Não Realizado';
    return isSameDay && isMeetingStatus;
  });
  
  if (subEl) {
    subEl.textContent = `${dayMeetings.length} reunião(ões) encontrada(s)`;
  }
  
  if (dayMeetings.length === 0) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 2rem 1rem; color: var(--color-text-muted);">
        <span style="font-size: 2rem; display: block; margin-bottom: 0.5rem;">📅</span>
        Nenhuma reunião agendada para este dia.
      </div>
    `;
    return;
  }
  
  // Render meeting cards
  dayMeetings.forEach(m => {
    const card = document.createElement('div');
    card.className = 'calendar-meeting-card-item';
    
    // Status color class
    let statusPillColor = 'trend-gold';
    if (m.status === 'Show' || m.status === 'Venda Fechada') statusPillColor = 'trend-green';
    if (m.status === 'No-Show') statusPillColor = 'trend-red';
    if (m.status === 'Fechamento Não Realizado') statusPillColor = 'trend-gold';
    
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <span style="font-size: 0.72rem; font-weight: 700; color: var(--color-primary); background-color: var(--color-primary-glow); padding: 0.15rem 0.45rem; border-radius: 4px;">
          ⏱️ ${m.meetingTime || 'Sem Horário'}
        </span>
        <span class="trend-pill ${statusPillColor}" style="font-size: 0.65rem;">
          ${m.status}
        </span>
      </div>
      
      <div style="font-family: 'Outfit', sans-serif; font-size: 0.95rem; font-weight: 700; color: #fff; margin-top: 0.25rem;">
        ${m.name}
      </div>
      
      <div style="font-size: 0.76rem; color: var(--color-text-secondary); display: flex; flex-direction: column; gap: 0.2rem;">
        <div>👤 <strong>Decisor:</strong> ${m.decisor || 'Não informado'}</div>
        <div>📞 <strong>Telefone:</strong> ${m.phone || 'Sem número'}</div>
        <div>💼 <strong>Assessor:</strong> ${m.seller}</div>
        ${m.meetingNotes ? `<div style="margin-top: 0.35rem; font-style: italic; background-color: rgba(255,255,255,0.01); border-left: 2px solid var(--color-border); padding-left: 0.5rem; color: var(--color-text-muted);">${m.meetingNotes}</div>` : ''}
      </div>
      
      <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; border-top: 1px solid var(--color-border); padding-top: 0.5rem;">
        <button class="btn btn-secondary btn-sm" onclick="openLeadQuickDrawer('${m.id}')" style="flex: 1; font-size: 0.72rem; height: 28px; padding: 0;">
          💬 Abordagem
        </button>
        <button class="btn btn-secondary btn-sm" onclick="openLeadInGrid('${m.id}')" style="flex: 1; font-size: 0.72rem; height: 28px; padding: 0;">
          🔍 Ver na Planilha
        </button>
        <button class="btn btn-sm" onclick="downloadLeadProtocolDirect('${m.id}')" style="flex: 1; font-size: 0.72rem; height: 28px; padding: 0; background-color: rgba(43, 194, 209, 0.15); border: 1px solid rgba(43, 194, 209, 0.35); color: #2bc2d1;">
          📄 Protocolo
        </button>
      </div>
    `;
    listEl.appendChild(card);
  });
}

// Helpers called from calendar meeting cards
function openLeadQuickDrawer(leadId) {
  openScriptDrawerForLead(leadId);
}

function openLeadInGrid(leadId) {
  switchTab('grid');
  document.getElementById('grid-search').value = '';
  document.getElementById('filter-status').value = 'all';
  document.getElementById('filter-priority').value = 'all';
  filterGrid();
  
  setTimeout(() => {
    const row = document.getElementById(`row-${leadId}`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      row.style.outline = '2px solid var(--color-primary)';
      setTimeout(() => {
        row.style.outline = '';
      }, 2500);
    }
  }, 100);
}

// NOTIFICATION SYSTEM LOGIC
function loadNotifications() {
  try {
    const data = localStorage.getItem('voxecrm_notifications');
    if (data) {
      appState.notifications = JSON.parse(data);
    } else {
      // Set defaults for nice immediate UX
      appState.notifications = [
        {
          id: 'notif_1',
          type: 'sale',
          text: '<strong>Ryan Az</strong> fechou venda com <strong>Clínica Vet Anjos</strong> no valor de <strong>R$ 5.000,00</strong>! 💰',
          timestamp: Date.now() - 1000 * 60 * 30, // 30 mins ago
          unread: true
        },
        {
          id: 'notif_2',
          type: 'meeting',
          text: '<strong>Vithor</strong> agendou reunião com <strong>Amigo Vett Clínica</strong> para <strong>26/06/2026 às 14:00</strong> 📅',
          timestamp: Date.now() - 1000 * 60 * 120, // 2 hours ago
          unread: true
        },
        {
          id: 'notif_3',
          type: 'sale',
          text: '<strong>Vithor</strong> fechou venda com <strong>Hospital Vet 24h</strong> no valor de <strong>R$ 3.500,00</strong>! 💰',
          timestamp: Date.now() - 1000 * 60 * 600, // 10 hours ago
          unread: false
        }
      ];
      saveNotifications();
    }
  } catch (e) {
    console.error('Error loading notifications:', e);
    appState.notifications = [];
  }
  renderNotifications();
}

function saveNotifications() {
  try {
    localStorage.setItem('voxecrm_notifications', JSON.stringify(appState.notifications));
  } catch (e) {
    console.error('Error saving notifications:', e);
  }
}

function addNotification(type, text) {
  const notif = {
    id: `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: type, // 'meeting' | 'sale'
    text: text,
    timestamp: Date.now(),
    unread: true
  };
  
  appState.notifications.unshift(notif);
  // Cap at 30 notifications max
  if (appState.notifications.length > 30) {
    appState.notifications.pop();
  }
  
  saveNotifications();
  renderNotifications();
}

function renderNotifications() {
  const container = document.getElementById('notification-list-container');
  const badge = document.getElementById('notification-badge');
  if (!container) return;
  
  container.innerHTML = '';
  
  const unreadCount = appState.notifications.filter(n => n.unread).length;
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
  
  if (appState.notifications.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem 1rem; color: var(--color-text-muted); font-size: 0.78rem;">
        Nenhuma notificação por enquanto.
      </div>
    `;
    return;
  }
  
  appState.notifications.forEach(n => {
    const item = document.createElement('div');
    item.className = `notification-item ${n.unread ? 'unread' : ''}`;
    
    const icon = n.type === 'sale' ? '💰' : '📅';
    const iconClass = n.type === 'sale' ? 'notification-icon-sale' : 'notification-icon-meeting';
    
    // Time difference helper
    const diffMs = Date.now() - n.timestamp;
    let timeText = 'Agora';
    if (diffMs > 1000 * 60 * 60 * 24) {
      timeText = `${Math.floor(diffMs / (1000 * 60 * 60 * 24))}d atrás`;
    } else if (diffMs > 1000 * 60 * 60) {
      timeText = `${Math.floor(diffMs / (1000 * 60 * 60))}h atrás`;
    } else if (diffMs > 1000 * 60) {
      timeText = `${Math.floor(diffMs / (1000 * 60))}min atrás`;
    }
    
    item.innerHTML = `
      <div class="notification-icon-circle ${iconClass}">
        ${icon}
      </div>
      <div style="display: flex; flex-direction: column; flex: 1;">
        <div class="notification-item-text">${n.text}</div>
        <div class="notification-item-time">${timeText}</div>
      </div>
    `;
    
    // Mark as read when clicked
    item.onclick = (e) => {
      n.unread = false;
      saveNotifications();
      renderNotifications();
    };
    
    container.appendChild(item);
  });
}

function toggleNotificationDropdown(event) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById('notification-dropdown');
  if (!dropdown) return;
  
  const isHidden = dropdown.classList.contains('hidden');
  if (isHidden) {
    dropdown.classList.remove('hidden');
    // Mark all as read when dropdown is opened to clear the badge
    appState.notifications.forEach(n => n.unread = false);
    saveNotifications();
    renderNotifications();
  } else {
    dropdown.classList.add('hidden');
  }
}

function clearNotifications(event) {
  if (event) event.stopPropagation();
  appState.notifications = [];
  saveNotifications();
  renderNotifications();
}

function renderFunnelBar(containerId, stages, orientation = 'horizontal') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  if (orientation === 'vertical') {
    container.classList.add('funnel-vertical');
    container.classList.remove('funnel-horizontal');
  } else {
    container.classList.add('funnel-horizontal');
    container.classList.remove('funnel-vertical');
  }

  const W = container.getBoundingClientRect().width || (orientation === 'vertical' ? 280 : 340);
  const H = container.getBoundingClientRect().height || (orientation === 'vertical' ? 240 : 140);
  const n = stages.length;
  const gap = 4;
  const totalGap = gap * (n - 1);
  
  const horiz = orientation === 'horizontal';
  const segW = horiz ? (W - totalGap) / n : W;
  const segH = horiz ? H : (H - totalGap) / n;

  const max = stages[0].value || 1;
  const norms = stages.map(s => (s.value || 0) / max);

  // SVG Bezier Segment Path Generators
  function hSegmentPath(normStart, normEnd, width, height, layerScale) {
    const my = height / 2;
    const h0 = normStart * height * 0.44 * layerScale;
    const h1 = normEnd * height * 0.44 * layerScale;
    const cx = width * 0.55;
    const top = `M 0 ${my - h0} C ${cx} ${my - h0}, ${width - cx} ${my - h1}, ${width} ${my - h1}`;
    const bot = `L ${width} ${my + h1} C ${width - cx} ${my + h1}, ${cx} ${my + h0}, 0 ${my + h0}`;
    return `${top} ${bot} Z`;
  }

  function vSegmentPath(normStart, normEnd, width, height, layerScale) {
    const mx = width / 2;
    const w0 = normStart * width * 0.44 * layerScale;
    const w1 = normEnd * width * 0.44 * layerScale;
    const cy = height * 0.55;
    const left = `M ${mx - w0} 0 C ${mx - w0} ${cy}, ${mx - w1} ${height - cy}, ${mx - w1} ${height}`;
    const right = `L ${mx + w1} ${height} C ${mx + w1} ${height - cy}, ${mx + w0} ${cy}, ${mx + w0} 0`;
    return `${left} ${right} Z`;
  }

  let svgContent = `<svg class="funnel-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">`;
  svgContent += '<defs>';
  stages.forEach((stage, i) => {
    const colors = stage.gradient.match(/#[0-9a-fA-F]{6}/g) || ['#3b82f6', '#1d4ed8'];
    svgContent += `
      <linearGradient id="grad-${containerId}-${i}" x1="0" x2="${horiz ? 1 : 0}" y1="0" y2="${horiz ? 0 : 1}">
        <stop offset="0%" stop-color="${colors[0]}" />
        <stop offset="100%" stop-color="${colors[1] || colors[0]}" />
      </linearGradient>
    `;
  });
  svgContent += '</defs>';

  // Grid lines
  svgContent += '<g stroke="rgba(255,255,255,0.06)" stroke-width="1">';
  for (let i = 1; i < n; i++) {
    if (horiz) {
      const x = segW * i + gap * (i - 1) + gap / 2;
      svgContent += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" />`;
    } else {
      const y = segH * i + gap * (i - 1) + gap / 2;
      svgContent += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" />`;
    }
  }
  svgContent += '</g>';

  // Segments
  stages.forEach((stage, i) => {
    const normStart = norms[i];
    const normEnd = norms[Math.min(i + 1, n - 1)];
    const colors = stage.gradient.match(/#[0-9a-fA-F]{6}/g) || ['#3b82f6'];
    const color = colors[0];
    
    const xOffset = horiz ? (segW + gap) * i : 0;
    const yOffset = horiz ? 0 : (segH + gap) * i;

    svgContent += `<g class="funnel-segment" data-index="${i}" transform="translate(${xOffset}, ${yOffset})">`;
    
    const layers = 3;
    for (let l = 0; l < layers; l++) {
      const scale = 1 - (l / layers) * 0.35;
      const opacity = 0.18 + (l / (layers - 1 || 1)) * 0.65;
      const pathD = horiz 
        ? hSegmentPath(normStart, normEnd, segW, H, scale)
        : vSegmentPath(normStart, normEnd, W, segH, scale);
      
      const isInnermost = l === layers - 1;
      let fill = color;
      if (isInnermost) {
        fill = `url(#grad-${containerId}-${i})`;
      }
      
      svgContent += `<path d="${pathD}" fill="${fill}" opacity="${isInnermost ? 1 : opacity}" />`;
    }
    
    svgContent += '</g>';
  });
  svgContent += '</svg>';

  // HTML Overlay Labels
  let overlayHtml = '';
  stages.forEach((stage, i) => {
    const valStr = stage.value.toLocaleString('pt-BR');
    
    if (horiz) {
      const left = (segW + gap) * i;
      const leftPct = (left / W) * 100;
      const widthPct = (segW / W) * 100;
      
      overlayHtml += `
        <div class="funnel-overlay-segment" style="left: ${leftPct}%; width: ${widthPct}%;" data-index="${i}">
          <div class="funnel-label-wrapper">
            <span class="funnel-val">${valStr}</span>
            <span class="funnel-pct">${stage.pct}%</span>
            <span class="funnel-label">${stage.icon} ${stage.label}</span>
          </div>
        </div>
      `;
    } else {
      const top = (segH + gap) * i;
      const topPct = (top / H) * 100;
      const heightPct = (segH / H) * 100;
      
      overlayHtml += `
        <div class="funnel-overlay-segment vertical-layout" style="top: ${topPct}%; height: ${heightPct}%; left: 0; width: 100%;" data-index="${i}">
          <div class="funnel-label-wrapper">
            <span class="funnel-val">${valStr}</span>
            <span class="funnel-pct">${stage.pct}%</span>
            <span class="funnel-label">${stage.icon} ${stage.label}</span>
          </div>
        </div>
      `;
    }
  });

  container.innerHTML = svgContent + overlayHtml;

  // Interactivity handlers
  const overlays = container.querySelectorAll('.funnel-overlay-segment');
  const segments = container.querySelectorAll('.funnel-segment');

  overlays.forEach(overlay => {
    overlay.addEventListener('mouseenter', () => {
      const index = overlay.getAttribute('data-index');
      container.classList.add('has-hovered');
      
      segments.forEach((seg, sIdx) => {
        if (sIdx == index) seg.classList.add('hovered');
        else seg.classList.remove('hovered');
      });

      overlays.forEach((ov, oIdx) => {
        if (oIdx == index) {
          ov.classList.add('hovered');
          ov.classList.remove('dimmed');
        } else {
          ov.classList.remove('hovered');
          ov.classList.add('dimmed');
        }
      });
    });

    overlay.addEventListener('mouseleave', () => {
      container.classList.remove('has-hovered');
      segments.forEach(seg => seg.classList.remove('hovered'));
      overlays.forEach(ov => {
        ov.classList.remove('hovered');
        ov.classList.remove('dimmed');
      });
    });
  });
}

function updateIntelligenceCenter() {
  const sellerFilter = document.getElementById('dashboard-seller-filter')?.value || 'all';
  
  // Filter leads by seller first
  const sellerLeads = sellerFilter === 'all'
    ? appState.leads
    : appState.leads.filter(l => {
        const sellerName = String(l.seller || '').toLowerCase();
        const filterName = sellerFilter.toLowerCase();
        return sellerName.includes(filterName) || filterName.includes(sellerName);
      });
      
  // 1. Metas Semanais (Prospecções, Reuniões, Vendas na semana corrente para Ryan, Vithor e Geral)
  let ryanReunioes = 0;
  let ryanVendas = 0;
  
  let vithorReunioes = 0;
  let vithorVendas = 0;
  
  const isMeetingStatus = (l) => l.status === 'Reunião Agendada' || l.status === 'Show' || l.status === 'No-Show' || l.status === 'Venda Fechada' || l.status === 'Fechamento Não Realizado';
  
  // Prospecções da semana = leads únicos que tiveram ALGUM contato registrado na semana corrente
  // (deduplicado por lead ID — não conta quantas mensagens foram enviadas ao mesmo lead)
  const ryanProspecIds = new Set();
  const vithorProspecIds = new Set();

  appState.leads.forEach(l => {
    const isRyan = String(l.seller || '').toLowerCase().includes('ryan');
    const isVithor = String(l.seller || '').toLowerCase().includes('vithor');
    
    // Verifica se houve QUALQUER contato registrado nesta semana para este lead
    const hadContactThisWeek = (l.contacts || []).some(c => {
      const cDate = parseLeadDate(c.date);
      return isDateInPeriod(cDate, 'this-week');
    });
    
    if (hadContactThisWeek) {
      if (isRyan) ryanProspecIds.add(l.id);
      if (isVithor) vithorProspecIds.add(l.id);
    }
    
    // Meetings this week
    const mDate = parseLeadDate(l.meetingDate);
    if (isMeetingStatus(l) && isDateInPeriod(mDate, 'this-week')) {
      if (isRyan) ryanReunioes++;
      if (isVithor) vithorReunioes++;
    }
    
    // Vendas this week (Count of Venda Fechada)
    if (l.status === 'Venda Fechada') {
      const sDate = parseLeadDate(l.saleDate || l.date);
      if (isDateInPeriod(sDate, 'this-week')) {
        if (isRyan) ryanVendas++;
        if (isVithor) vithorVendas++;
      }
    }
  });
  
  // Contagem final de leads únicos prospectados na semana
  const ryanProspec = ryanProspecIds.size;
  const vithorProspec = vithorProspecIds.size;
  
  // Set goal targets dynamically from localStorage
  const weeklyGoals = getWeeklyGoals();
  let goalProspecTarget = 0;
  let goalReuniaoTarget = 0;
  let goalVendaTarget = 0;
  let headerLabel = 'Geral';
  let weekProspec = 0;
  let weekReunioes = 0;
  let weekVendas = 0;
  
  const filterLower = sellerFilter.toLowerCase();
  if (filterLower.includes('ryan')) {
    goalProspecTarget = weeklyGoals.ryan.prospec;
    goalReuniaoTarget = weeklyGoals.ryan.reuniao;
    goalVendaTarget = weeklyGoals.ryan.venda;
    weekProspec = ryanProspec;
    weekReunioes = ryanReunioes;
    weekVendas = ryanVendas;
    headerLabel = 'Ryan';
  } else if (filterLower.includes('vithor')) {
    goalProspecTarget = weeklyGoals.vithor.prospec;
    goalReuniaoTarget = weeklyGoals.vithor.reuniao;
    goalVendaTarget = weeklyGoals.vithor.venda;
    weekProspec = vithorProspec;
    weekReunioes = vithorReunioes;
    weekVendas = vithorVendas;
    headerLabel = 'Vithor';
  } else {
    // Geral - Sum of both
    goalProspecTarget = weeklyGoals.ryan.prospec + weeklyGoals.vithor.prospec;
    goalReuniaoTarget = weeklyGoals.ryan.reuniao + weeklyGoals.vithor.reuniao;
    goalVendaTarget = weeklyGoals.ryan.venda + weeklyGoals.vithor.venda;
    weekProspec = ryanProspec + vithorProspec;
    weekReunioes = ryanReunioes + vithorReunioes;
    weekVendas = ryanVendas + vithorVendas;
    headerLabel = 'Geral';
  }
  
  // Update header text with end date if present
  let dateLabel = '';
  if (weeklyGoals.endDate) {
    const dateParts = weeklyGoals.endDate.split('-');
    if (dateParts.length === 3) {
      dateLabel = ` (Até ${dateParts[2]}/${dateParts[1]}/${dateParts[0]})`;
    }
  }
  
  const gHeader = document.getElementById('weekly-goals-header');
  if (gHeader) {
    gHeader.textContent = `🎯 Metas da Semana${dateLabel} (${headerLabel})`;
  }
  
  // Percentages for progress bars
  const prospecPct = goalProspecTarget > 0 ? Math.min(100, Math.round((weekProspec / goalProspecTarget) * 100)) : 0;
  const reuniaoPct = goalReuniaoTarget > 0 ? Math.min(100, Math.round((weekReunioes / goalReuniaoTarget) * 100)) : 0;
  const vendaPct = goalVendaTarget > 0 ? Math.min(100, Math.round((weekVendas / goalVendaTarget) * 100)) : 0;
  
  // Calculate individual profile percentages for the breakdown
  const ryanP_Pct = weeklyGoals.ryan.prospec > 0 ? Math.round((ryanProspec / weeklyGoals.ryan.prospec) * 100) : 0;
  const vithorP_Pct = weeklyGoals.vithor.prospec > 0 ? Math.round((vithorProspec / weeklyGoals.vithor.prospec) * 100) : 0;
  
  const ryanR_Pct = weeklyGoals.ryan.reuniao > 0 ? Math.round((ryanReunioes / weeklyGoals.ryan.reuniao) * 100) : 0;
  const vithorR_Pct = weeklyGoals.vithor.reuniao > 0 ? Math.round((vithorReunioes / weeklyGoals.vithor.reuniao) * 100) : 0;
  
  const ryanV_Pct = weeklyGoals.ryan.venda > 0 ? Math.round((ryanVendas / weeklyGoals.ryan.venda) * 100) : 0;
  const vithorV_Pct = weeklyGoals.vithor.venda > 0 ? Math.round((vithorVendas / weeklyGoals.vithor.venda) * 100) : 0;
  
  // Helper to format goal details
  const formatGoalDetails = (current, target) => {
    if (target === 0) return `${current}/0 · Sem meta`;
    const diff = target - current;
    if (diff > 0) {
      return `${current}/${target} · Faltam ${diff}`;
    } else {
      const surplus = current - target;
      return `${current}/${target} · Batida! 🎉${surplus > 0 ? ` (+${surplus})` : ''}`;
    }
  };
  
  // Render goals progress UI
  const gpsb = document.getElementById('goal-prospec-bar');
  const gpsd = document.getElementById('goal-prospec-details');
  if (gpsb) gpsb.style.width = `${prospecPct}%`;
  if (gpsd) gpsd.textContent = formatGoalDetails(weekProspec, goalProspecTarget);
  
  const gpbd = document.getElementById('goal-prospec-breakdown');
  if (gpbd) gpbd.innerHTML = `Ryan está em <strong>${ryanP_Pct}%</strong> da meta · Vithor está em <strong>${vithorP_Pct}%</strong> da meta`;
  
  const grnb = document.getElementById('goal-reuniao-bar');
  const grnd = document.getElementById('goal-reuniao-details');
  if (grnb) grnb.style.width = `${reuniaoPct}%`;
  if (grnd) grnd.textContent = formatGoalDetails(weekReunioes, goalReuniaoTarget);
  
  const grbd = document.getElementById('goal-reuniao-breakdown');
  if (grbd) grbd.innerHTML = `Ryan está em <strong>${ryanR_Pct}%</strong> da meta · Vithor está em <strong>${vithorR_Pct}%</strong> da meta`;
  
  const gslb = document.getElementById('goal-sales-bar');
  const gsld = document.getElementById('goal-sales-details');
  if (gslb) gslb.style.width = `${vendaPct}%`;
  if (gsld) gsld.textContent = formatGoalDetails(weekVendas, goalVendaTarget);
  
  const gsbd = document.getElementById('goal-sales-breakdown');
  if (gsbd) gsbd.innerHTML = `Ryan está em <strong>${ryanV_Pct}%</strong> da meta · Vithor está em <strong>${vithorV_Pct}%</strong> da meta`;
  
  // 2. Detecção de Gargalos (Baseado no período ativo selecionado no dashboard)
  const period = document.getElementById('dashboard-period-filter')?.value || 'all';
  
  // Filter leads in active period
  const periodLeads = sellerLeads.filter(l => isDateInPeriod(parseLeadDate(l.date), period));
  
  const contactedLeads = periodLeads.filter(l => {
    return (l.status && l.status !== 'Novo' && l.status !== '') || (l.contacts && l.contacts.length > 0);
  });
  const totalContacted = contactedLeads.length;
  
  const meetingLeads = sellerLeads.filter(l => {
    return isMeetingStatus(l) && isDateInPeriod(parseLeadDate(l.meetingDate), period);
  });
  const totalMeetings = meetingLeads.length;
  
  const showsLeads = meetingLeads.filter(l => l.status === 'Show' || l.status === 'Venda Fechada' || l.status === 'Fechamento Não Realizado');
  const totalShows = showsLeads.length;
  
  const salesLeads = sellerLeads.filter(l => l.status === 'Venda Fechada' && isDateInPeriod(parseLeadDate(l.saleDate || l.date), period));
  const totalSales = salesLeads.length;
  
  // Conversion Rates
  const conversionProspecReuniao = totalContacted > 0 ? (totalMeetings / totalContacted) * 100 : 0;
  const showRate = totalMeetings > 0 ? (totalShows / totalMeetings) * 100 : 0;
  const conversionShowFechamento = totalShows > 0 ? (totalSales / totalShows) * 100 : 0;
  
  const diagnosContainer = document.getElementById('gargalo-diagnosticos-container');
  if (diagnosContainer) {
    diagnosContainer.innerHTML = '';
    const diagnostics = [];
    
    // Agendamento Bottleneck (Target: >10%)
    if (totalContacted >= 5) {
      if (conversionProspecReuniao < 5) {
        diagnostics.push({
          type: 'danger',
          title: 'Gargalo Crítico de Agendamento',
          text: `Sua taxa Prospecção → Reunião está em <strong>${conversionProspecReuniao.toFixed(1)}%</strong> (Meta: >10%). Você está abordando mas não está conseguindo agendar. Refine o gancho inicial ou valide o script de quebra de objeções.`
        });
      } else if (conversionProspecReuniao < 10) {
        diagnostics.push({
          type: 'warning',
          title: 'Atenção na Prospecção',
          text: `Conversão Prospecção → Reunião de <strong>${conversionProspecReuniao.toFixed(1)}%</strong>. Pode melhorar. Tente ser mais rápido ao responder levantadas de mão e garanta ligações de acompanhamento.`
        });
      }
    } else {
      diagnostics.push({
        type: 'info',
        title: 'Dados insuficientes de Prospecção',
        text: `Você possui apenas ${totalContacted} lead(s) contatado(s) neste período. É preciso fazer pelo menos 5 contatos para gerar um diagnóstico de agendamento confiável.`
      });
    }
    
    // Show Rate Bottleneck (Target: >70%)
    if (totalMeetings >= 3) {
      if (showRate < 60) {
        diagnostics.push({
          type: 'danger',
          title: 'Gargalo Crítico de Presença (Show Rate)',
          text: `Apenas <strong>${showRate.toFixed(0)}%</strong> das reuniões agendadas compareceram (Meta: >70%). Implemente um fluxo rígido de confirmação por WhatsApp 24h e 2h antes da chamada.`
        });
      } else if (showRate < 75) {
        diagnostics.push({
          type: 'warning',
          title: 'Atenção ao Absenteísmo',
          text: `Show Rate em <strong>${showRate.toFixed(0)}%</strong>. Aqueça os agendados enviando um caso de sucesso ou vídeo curto de apresentação antes da reunião.`
        });
      }
    }
    
    // Fechamento Bottleneck (Target: >25%)
    if (totalShows >= 2) {
      if (conversionShowFechamento < 15) {
        diagnostics.push({
          type: 'danger',
          title: 'Gargalo Crítico de Fechamento',
          text: `Sua taxa de Show → Fechamento está em <strong>${conversionShowFechamento.toFixed(0)}%</strong> (Meta: >25%). O problema pode ser na ancoragem de valor ou no pitch final. Revise seus diferenciais competitivos.`
        });
      } else if (conversionShowFechamento < 25) {
        diagnostics.push({
          type: 'warning',
          title: 'Atenção no Fechamento',
          text: `Conversão Show → Fechamento de <strong>${conversionShowFechamento.toFixed(0)}%</strong>. Tente acelerar o follow-up pós-reunião com propostas personalizadas e prazos de validade curtos.`
        });
      }
    }
    
    // Fallback if fully healthy
    const activeCriticals = diagnostics.filter(d => d.type === 'danger' || d.type === 'warning');
    if (activeCriticals.length === 0 && totalContacted >= 5) {
      diagnostics.unshift({
        type: 'success',
        title: 'Fluxo Comercial Saudável',
        text: 'Suas taxas de conversão estão equilibradas e acima das médias críticas. Continue focando no volume e na constância de abordagens!'
      });
    }
    
    // Render diagnostics list
    diagnostics.forEach(d => {
      const item = document.createElement('div');
      item.style.padding = '0.75rem';
      item.style.borderRadius = '8px';
      item.style.fontSize = '0.78rem';
      item.style.lineHeight = '1.45';
      item.style.border = '1px solid';
      
      if (d.type === 'danger') {
        item.style.backgroundColor = 'rgba(239, 68, 68, 0.06)';
        item.style.borderColor = 'rgba(239, 68, 68, 0.2)';
        item.style.color = '#f87171';
        item.innerHTML = `<strong>🔴 ${d.title}</strong><div style="margin-top: 0.25rem; color: rgba(255,255,255,0.85);">${d.text}</div>`;
      } else if (d.type === 'warning') {
        item.style.backgroundColor = 'rgba(245, 158, 11, 0.06)';
        item.style.borderColor = 'rgba(245, 158, 11, 0.2)';
        item.style.color = '#fbbf24';
        item.innerHTML = `<strong>🟡 ${d.title}</strong><div style="margin-top: 0.25rem; color: rgba(255,255,255,0.85);">${d.text}</div>`;
      } else if (d.type === 'info') {
        item.style.backgroundColor = 'rgba(93, 135, 255, 0.05)';
        item.style.borderColor = 'rgba(93, 135, 255, 0.15)';
        item.style.color = '#a5b4fc';
        item.innerHTML = `<strong>ℹ️ ${d.title}</strong><div style="margin-top: 0.25rem; color: rgba(255,255,255,0.85);">${d.text}</div>`;
      } else {
        item.style.backgroundColor = 'rgba(16, 185, 129, 0.06)';
        item.style.borderColor = 'rgba(16, 185, 129, 0.2)';
        item.style.color = '#34d399';
        item.innerHTML = `<strong>🟢 ${d.title}</strong><div style="margin-top: 0.25rem; color: rgba(255,255,255,0.85);">${d.text}</div>`;
      }
      
      diagnosContainer.appendChild(item);
    });
  }
  
  // 3. Insight da Semana (Comparação Ryan Az vs Vithor)
  const insightContainer = document.getElementById('insight-semana-container');
  if (insightContainer) {
    insightContainer.innerHTML = '';
    
    // Gather comparative data for THIS WEEK
    const ryanWeekLeads = appState.leads.filter(l => l.seller && l.seller.toLowerCase().includes('ryan'));
    const vithorWeekLeads = appState.leads.filter(l => l.seller && l.seller.toLowerCase().includes('vithor'));
    
    let ryanWeekTouchpoints = 0;
    let vithorWeekTouchpoints = 0;
    let ryanWeekMeetings = 0;
    let vithorWeekMeetings = 0;
    let ryanWeekSales = 0;
    let vithorWeekSales = 0;
    
    let ryanContactedLeadsThisWeek = new Set();
    let vithorContactedLeadsThisWeek = new Set();
    
    // Ryan week stats
    ryanWeekLeads.forEach(l => {
      (l.contacts || []).forEach(c => {
        if (isDateInPeriod(parseLeadDate(c.date), 'this-week')) {
          ryanWeekTouchpoints++;
          ryanContactedLeadsThisWeek.add(l.id);
        }
      });
      if (isMeetingStatus(l) && isDateInPeriod(parseLeadDate(l.meetingDate), 'this-week')) ryanWeekMeetings++;
      if (l.status === 'Venda Fechada' && isDateInPeriod(parseLeadDate(l.saleDate || l.date), 'this-week')) ryanWeekSales++;
    });
    
    // Vithor week stats
    vithorWeekLeads.forEach(l => {
      (l.contacts || []).forEach(c => {
        if (isDateInPeriod(parseLeadDate(c.date), 'this-week')) {
          vithorWeekTouchpoints++;
          vithorContactedLeadsThisWeek.add(l.id);
        }
      });
      if (isMeetingStatus(l) && isDateInPeriod(parseLeadDate(l.meetingDate), 'this-week')) vithorWeekMeetings++;
      if (l.status === 'Venda Fechada' && isDateInPeriod(parseLeadDate(l.saleDate || l.date), 'this-week')) vithorWeekSales++;
    });
    
    const ryanLeadsCount = ryanContactedLeadsThisWeek.size;
    const vithorLeadsCount = vithorContactedLeadsThisWeek.size;
    
    const ryanRatio = ryanLeadsCount > 0 ? (ryanWeekTouchpoints / ryanLeadsCount) : 0;
    const vithorRatio = vithorLeadsCount > 0 ? (vithorWeekTouchpoints / vithorLeadsCount) : 0;
    
    const insights = [];
    
    // Touchpoints ratio comparison
    if (ryanWeekTouchpoints > 0 && vithorWeekTouchpoints > 0) {
      if (vithorRatio > ryanRatio && ryanRatio > 0) {
        const ratioDiff = (vithorRatio / ryanRatio).toFixed(1);
        insights.push(`🔥 <strong>Rigor no Acompanhamento:</strong> Vithor tem <strong>${ratioDiff}x mais touchpoints</strong> por lead do que Ryan esta semana (${vithorRatio.toFixed(1)} vs ${ryanRatio.toFixed(1)}).`);
      } else if (ryanRatio > vithorRatio && vithorRatio > 0) {
        const ratioDiff = (ryanRatio / vithorRatio).toFixed(1);
        insights.push(`🔥 <strong>Rigor no Acompanhamento:</strong> Ryan tem <strong>${ratioDiff}x mais touchpoints</strong> por lead do que Vithor esta semana (${ryanRatio.toFixed(1)} vs ${vithorRatio.toFixed(1)}).`);
      }
    } else if (vithorWeekTouchpoints > 0 && ryanWeekTouchpoints === 0) {
      insights.push(`🔥 <strong>Rigor no Acompanhamento:</strong> Vithor iniciou abordagens esta semana com média de <strong>${vithorRatio.toFixed(1)} touchpoints</strong> por lead, enquanto Ryan ainda não registrou contatos.`);
    } else if (ryanWeekTouchpoints > 0 && vithorWeekTouchpoints === 0) {
      insights.push(`🔥 <strong>Rigor no Acompanhamento:</strong> Ryan iniciou abordagens esta semana com média de <strong>${ryanRatio.toFixed(1)} touchpoints</strong> por lead, enquanto Vithor ainda não registrou contatos.`);
    }
    
    // Total Touchpoints
    if (ryanWeekTouchpoints > vithorWeekTouchpoints) {
      insights.push(`⚡ <strong>Intensidade Comercial:</strong> Ryan fez mais tentativas de contato esta semana (${ryanWeekTouchpoints} vs ${vithorWeekTouchpoints}).`);
    } else if (vithorWeekTouchpoints > ryanWeekTouchpoints) {
      insights.push(`⚡ <strong>Intensidade Comercial:</strong> Vithor fez mais tentativas de contato esta semana (${vithorWeekTouchpoints} vs ${ryanWeekTouchpoints}).`);
    }
    
    // Meetings
    if (ryanWeekMeetings > vithorWeekMeetings) {
      insights.push(`📅 <strong>Agendamento da Semana:</strong> Ryan agendou <strong>${ryanWeekMeetings - vithorWeekMeetings} reunião(ões) a mais</strong> que Vithor.`);
    } else if (vithorWeekMeetings > ryanWeekMeetings) {
      insights.push(`📅 <strong>Agendamento da Semana:</strong> Vithor agendou <strong>${vithorWeekMeetings - ryanWeekMeetings} reunião(ões) a mais</strong> que Ryan.`);
    }
    
    // Sales
    if (ryanWeekSales > vithorWeekSales) {
      insights.push(`💰 <strong>Resultados (Vendas):</strong> Ryan está liderando em conversão final esta semana.`);
    } else if (vithorWeekSales > ryanWeekSales) {
      insights.push(`💰 <strong>Resultados (Vendas):</strong> Vithor está liderando em conversão final esta semana.`);
    }
    
    if (insights.length === 0) {
      insights.push("⚖️ <strong>Equilíbrio Estratégico:</strong> Ryan e Vithor estão com ritmos operacionais e agendamentos idênticos nesta semana. Mantenham o foco no volume!");
    }
    
    insights.forEach(ins => {
      const p = document.createElement('p');
      p.style.margin = '0';
      p.style.padding = '0.35rem 0';
      p.style.borderBottom = '1px dashed rgba(255,255,255,0.03)';
      p.innerHTML = ins;
      insightContainer.appendChild(p);
    });
  }
}

// ==========================================
// CONFIGURAÇÃO DE METAS SEMANAIS
// ==========================================

function getWeeklyGoals() {
  const saved = localStorage.getItem('voxecrm_weekly_goals');
  let goals;
  if (saved) {
    try {
      goals = JSON.parse(saved);
    } catch (e) {
      console.error("Erro ao analisar metas semanais do localStorage", e);
    }
  }
  
  // Calcula o domingo da semana atual como padrão
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = today.getDate() + (dayOfWeek === 0 ? 0 : 7 - dayOfWeek);
  const sunday = new Date(today);
  sunday.setDate(diff);
  const defaultEndDate = sunday.toISOString().split('T')[0]; // YYYY-MM-DD
  
  if (!goals) {
    goals = {
      ryan: { prospec: 50, reuniao: 7, venda: 2 },
      vithor: { prospec: 50, reuniao: 7, venda: 2 },
      endDate: defaultEndDate
    };
  }
  if (!goals.endDate) {
    goals.endDate = defaultEndDate;
  }
  return goals;
}

function openGoalsModal() {
  const goals = getWeeklyGoals();
  
  document.getElementById('goal-target-end-date').value = goals.endDate || '';
  
  document.getElementById('goal-target-ryan-prospec').value = goals.ryan.prospec;
  document.getElementById('goal-target-ryan-reuniao').value = goals.ryan.reuniao;
  document.getElementById('goal-target-ryan-venda').value = goals.ryan.venda;
  
  document.getElementById('goal-target-vithor-prospec').value = goals.vithor.prospec;
  document.getElementById('goal-target-vithor-reuniao').value = goals.vithor.reuniao;
  document.getElementById('goal-target-vithor-venda').value = goals.vithor.venda;
  
  document.getElementById('goals-modal-backdrop').style.display = 'block';
  document.getElementById('goals-modal').classList.add('open');
}

function closeGoalsModal() {
  document.getElementById('goals-modal').classList.remove('open');
  document.getElementById('goals-modal-backdrop').style.display = 'none';
}

function saveGoalsConfig() {
  const endDate = document.getElementById('goal-target-end-date').value;
  
  const ryanProspec = parseInt(document.getElementById('goal-target-ryan-prospec').value) || 0;
  const ryanReuniao = parseInt(document.getElementById('goal-target-ryan-reuniao').value) || 0;
  const ryanVenda = parseInt(document.getElementById('goal-target-ryan-venda').value) || 0;
  
  const vithorProspec = parseInt(document.getElementById('goal-target-vithor-prospec').value) || 0;
  const vithorReuniao = parseInt(document.getElementById('goal-target-vithor-reuniao').value) || 0;
  const vithorVenda = parseInt(document.getElementById('goal-target-vithor-venda').value) || 0;
  
  const goals = {
    ryan: { prospec: ryanProspec, reuniao: ryanReuniao, venda: ryanVenda },
    vithor: { prospec: vithorProspec, reuniao: vithorReuniao, venda: vithorVenda },
    endDate: endDate
  };
  
  localStorage.setItem('voxecrm_weekly_goals', JSON.stringify(goals));
  
  // Atualiza a central de inteligência com as novas metas imediatamente
  updateIntelligenceCenter();
  
  closeGoalsModal();
  showToast("Metas semanais salvas com sucesso! 🎯", "success");
}

// Dynamic Custom Dropdowns (Notched Border Style)
function initCustomDropdowns() {
  const configs = [
    { selectId: 'dashboard-period-filter', wrapperId: 'dashboard-period-filter-wrapper', label: 'Período' },
    { selectId: 'dashboard-seller-filter', wrapperId: 'dashboard-seller-filter-wrapper', label: 'Assessor' },
    { selectId: 'chart-time-range', wrapperId: 'chart-time-range-wrapper', label: 'Intervalo' },
    { selectId: 'financeiro-period-filter', wrapperId: 'financeiro-period-filter-wrapper', label: 'Período' },
    { selectId: 'financeiro-seller-filter', wrapperId: 'financeiro-seller-filter-wrapper', label: 'Assessor' }
  ];

  configs.forEach(config => {
    const select = document.getElementById(config.selectId);
    const wrapper = document.getElementById(config.wrapperId);
    if (!select || !wrapper) return;

    // Oculta select original
    select.style.display = 'none';

    // Cria contêiner se não existir
    let container = wrapper.querySelector('.voxe-dropdown-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'voxe-dropdown-container';
      container.id = `custom-dropdown-${config.selectId}`;
      
      const trigger = document.createElement('div');
      trigger.className = 'voxe-dropdown-trigger';
      
      const label = document.createElement('span');
      label.className = 'voxe-dropdown-label';
      label.textContent = config.label;
      
      const value = document.createElement('span');
      value.className = 'voxe-dropdown-value';
      
      const arrow = document.createElement('span');
      arrow.className = 'voxe-dropdown-arrow';
      arrow.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      `;
      
      trigger.appendChild(label);
      trigger.appendChild(value);
      trigger.appendChild(arrow);
      
      const menu = document.createElement('div');
      menu.className = 'voxe-dropdown-menu';
      
      container.appendChild(trigger);
      container.appendChild(menu);
      wrapper.appendChild(container);

      // Abre/fecha menu ao clicar
      trigger.onclick = (e) => {
        e.stopPropagation();
        const isOpen = container.classList.contains('open');
        
        // Fecha outros dropdowns
        document.querySelectorAll('.voxe-dropdown-container').forEach(c => c.classList.remove('open'));
        
        if (!isOpen) {
          container.classList.add('open');
        }
      };
    }

    const valueEl = container.querySelector('.voxe-dropdown-value');
    const menuEl = container.querySelector('.voxe-dropdown-menu');

    // Rebuild options menu
    menuEl.innerHTML = '';
    const selectedValue = select.value;

    Array.from(select.options).forEach(opt => {
      const item = document.createElement('div');
      item.className = 'voxe-dropdown-item';
      if (opt.value === selectedValue) {
        item.classList.add('active');
        if (opt.value === 'custom') {
          valueEl.innerHTML = `
            <span style="display: flex; align-items: center; gap: 8px;">
              -
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.85;">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </span>
          `;
        } else {
          valueEl.textContent = opt.textContent;
        }
      }

      if (opt.value === 'custom') {
        item.innerHTML = `
          <span>-</span>
          <span class="voxe-dropdown-item-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.85;">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </span>
        `;
      } else {
        item.textContent = opt.textContent;
      }

      item.onclick = (e) => {
        e.stopPropagation();
        select.value = opt.value;
        select.dispatchEvent(new Event('change'));
        container.classList.remove('open');

        // Controla visualização das datas customizadas
        if (config.selectId === 'dashboard-period-filter') {
          const customDateBox = document.getElementById('custom-date-range-container');
          if (opt.value === 'custom') {
            customDateBox.classList.remove('hidden');
            const startInput = document.getElementById('custom-date-start');
            const endInput = document.getElementById('custom-date-end');
            if (startInput && !startInput.value) {
              const dStart = new Date();
              dStart.setDate(dStart.getDate() - 7);
              startInput.value = dStart.toISOString().split('T')[0];
            }
            if (endInput && !endInput.value) {
              endInput.value = new Date().toISOString().split('T')[0];
            }
          } else {
            customDateBox.classList.add('hidden');
          }
        }

        if (config.selectId === 'financeiro-period-filter') {
          const customDateBox = document.getElementById('financeiro-custom-date-range-container');
          if (opt.value === 'custom') {
            customDateBox.classList.remove('hidden');
            const startInput = document.getElementById('financeiro-custom-date-start');
            const endInput = document.getElementById('financeiro-custom-date-end');
            if (startInput && !startInput.value) {
              const dStart = new Date();
              dStart.setDate(dStart.getDate() - 7);
              startInput.value = dStart.toISOString().split('T')[0];
            }
            if (endInput && !endInput.value) {
              endInput.value = new Date().toISOString().split('T')[0];
            }
          } else {
            customDateBox.classList.add('hidden');
          }
        }

        if (config.selectId === 'chart-time-range') {
          const customDateBox = document.getElementById('chart-custom-date-range-container');
          if (opt.value === 'custom') {
            customDateBox.classList.remove('hidden');
            const startInput = document.getElementById('chart-custom-date-start');
            const endInput = document.getElementById('chart-custom-date-end');
            if (startInput && !startInput.value) {
              const dStart = new Date();
              dStart.setDate(dStart.getDate() - 30);
              startInput.value = dStart.toISOString().split('T')[0];
            }
            if (endInput && !endInput.value) {
              endInput.value = new Date().toISOString().split('T')[0];
            }
          } else {
            customDateBox.classList.add('hidden');
          }
        }

        initCustomDropdowns();
      };

      menuEl.appendChild(item);
    });

    // Garante que o estado de exibição inicial do container de data esteja correto
    if (config.selectId === 'dashboard-period-filter') {
      const customDateBox = document.getElementById('custom-date-range-container');
      if (customDateBox) {
        if (select.value === 'custom') {
          customDateBox.classList.remove('hidden');
        } else {
          customDateBox.classList.add('hidden');
        }
      }
    }

    if (config.selectId === 'financeiro-period-filter') {
      const customDateBox = document.getElementById('financeiro-custom-date-range-container');
      if (customDateBox) {
        if (select.value === 'custom') {
          customDateBox.classList.remove('hidden');
        } else {
          customDateBox.classList.add('hidden');
        }
      }
    }

    if (config.selectId === 'chart-time-range') {
      const customDateBox = document.getElementById('chart-custom-date-range-container');
      if (customDateBox) {
        if (select.value === 'custom') {
          customDateBox.classList.remove('hidden');
        } else {
          customDateBox.classList.add('hidden');
        }
      }
    }
  });
}

// Fecha dropdowns se clicar fora
document.addEventListener('click', () => {
  document.querySelectorAll('.voxe-dropdown-container').forEach(c => c.classList.remove('open'));
});

// Expõe globalmente
window.getWeeklyGoals = getWeeklyGoals;
window.openGoalsModal = openGoalsModal;
window.closeGoalsModal = closeGoalsModal;
window.saveGoalsConfig = saveGoalsConfig;
window.initCustomDropdowns = initCustomDropdowns;


