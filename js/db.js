// VOXE CRM - SUPABASE INTEGRATION (SINGLE TABLE)
const { createClient } = supabase;
const db = createClient('https://rmfurfangmwbxjxavbxc.supabase.co', 'sb_publishable_bwsEtUEYMxAw-8wjBWZZSw_EhIDIvPp');

db.leadsCache = [];

// Helper to check for errors and log them
function handleSupabaseError(error) {
  if (error) {
    console.error("Supabase Error:", error);
    return true;
  }
  return false;
}

// 1. O fetchLeadsFromSupabase buscar direto da tabela leads com SELECT *
db.fetchLeadsFromSupabase = async function() {
  const { data: leadsData, error: leadsError } = await db.from('leads').select('*');
  handleSupabaseError(leadsError);

  // MIGRATION CHECK: If Supabase has no leads, but localStorage has, migrate them!
  if ((!leadsData || leadsData.length === 0) && localStorage.getItem('voxecrm_leads')) {
    try {
      const localLeads = JSON.parse(localStorage.getItem('voxecrm_leads')) || [];
      if (localLeads.length > 0) {
        console.log("Migrando leads locais para o Supabase (Tabela Única)...");
        for (const lead of localLeads) {
          await db.from('leads').insert({
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
          });
        }
        // Re-fetch now that we migrated
        return db.fetchLeadsFromSupabase();
      }
    } catch (e) {
      console.error("Erro na migração automática:", e);
    }
  }

  // 4. O mapeamento do cache local usar name, phone, email, website, address, status, priority, channel, notes, value, meeting_date, meeting_time, meeting_notes, closed_value diretamente
  db.leadsCache = (leadsData || []).map(l => {
    return {
      id: l.id,
      name: l.name || 'Sem Nome',
      phone: l.phone || '',
      cleanPhone: (l.phone || '').replace(/[^\d]/g, ''),
      email: l.email || '',
      website: l.website || '',
      address: l.address || '',
      category: l.category || 'Clínica Veterinária',
      mapsLink: l.maps_link || '',
      status: l.status || 'Novo',
      priority: l.priority || 'Média',
      channel: l.channel || 'Google Maps',
      notes: l.notes || '',
      value: Number(l.value) || 0,
      seller: l.seller_name || 'Ryan de Azevedo',
      decisor: l.decisor || '',
      warmup: l.warmup || '',
      meetingDate: l.meeting_date || '',
      meetingTime: l.meeting_time || '',
      meetingNotes: l.meeting_notes || '',
      estimatedTicket: Number(l.estimated_ticket) || 0,
      probability: Number(l.probability) || 50,
      closedValue: Number(l.closed_value) || 0,
      date: l.created_at ? new Date(l.created_at).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
      contacts: []
    };
  });

  return db.leadsCache;
};

db.getLeads = function() {
  return db.leadsCache;
};

db.getLeadById = function(id) {
  return db.leadsCache.find(l => l.id === id);
};

// 2. O addLead inserir usando os campos da nova tabela leads
db.addLead = function(lead) {
  if (!lead.id) {
    lead.id = `lead_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }

  // Perform async insert in background
  (async () => {
    const { error: leadsError } = await db.from('leads').insert({
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
    });
    handleSupabaseError(leadsError);
  })();

  db.leadsCache.unshift(lead);
  return lead;
};

// 3. O updateLead atualizar esses mesmos campos
db.updateLead = function(id, updates) {
  const index = db.leadsCache.findIndex(l => l.id === id);
  if (index === -1) return null;
  db.leadsCache[index] = { ...db.leadsCache[index], ...updates };
  const lead = db.leadsCache[index];

  // Perform async update in background
  (async () => {
    const leadPayload = {};
    if (updates.name !== undefined) leadPayload.name = updates.name;
    if (updates.phone !== undefined) leadPayload.phone = updates.phone;
    if (updates.email !== undefined) leadPayload.email = updates.email;
    if (updates.website !== undefined) leadPayload.website = updates.website;
    if (updates.address !== undefined) leadPayload.address = updates.address;
    if (updates.category !== undefined) leadPayload.category = updates.category;
    if (updates.mapsLink !== undefined) leadPayload.maps_link = updates.mapsLink;
    if (updates.status !== undefined) leadPayload.status = updates.status;
    if (updates.priority !== undefined) leadPayload.priority = updates.priority;
    if (updates.channel !== undefined) leadPayload.channel = updates.channel;
    if (updates.notes !== undefined) leadPayload.notes = updates.notes;
    if (updates.value !== undefined) leadPayload.value = Number(updates.value) || 0;
    if (updates.seller !== undefined) leadPayload.seller_name = updates.seller;
    if (updates.decisor !== undefined) leadPayload.decisor = updates.decisor;
    if (updates.warmup !== undefined) leadPayload.warmup = updates.warmup;
    if (updates.meetingDate !== undefined) leadPayload.meeting_date = updates.meetingDate;
    if (updates.meetingTime !== undefined) leadPayload.meeting_time = updates.meetingTime;
    if (updates.meetingNotes !== undefined) leadPayload.meeting_notes = updates.meetingNotes;
    if (updates.estimatedTicket !== undefined) leadPayload.estimated_ticket = Number(updates.estimatedTicket) || 0;
    if (updates.probability !== undefined) leadPayload.probability = Number(updates.probability) || 50;
    if (updates.closedValue !== undefined) leadPayload.closed_value = Number(updates.closedValue) || 0;

    if (Object.keys(leadPayload).length > 0) {
      const { error: leadsError } = await db.from('leads').update(leadPayload).eq('id', id);
      handleSupabaseError(leadsError);
    }
  })();

  return lead;
};

// Deletar lead da tabela
db.deleteLead = function(id) {
  const index = db.leadsCache.findIndex(l => l.id === id);
  if (index === -1) return false;
  db.leadsCache.splice(index, 1);

  // Perform async delete in background
  (async () => {
    const { error: leadsError } = await db.from('leads').delete().eq('id', id);
    handleSupabaseError(leadsError);
  })();

  return true;
};

db.deleteMultipleLeads = function(ids) {
  const beforeCount = db.leadsCache.length;
  db.leadsCache = db.leadsCache.filter(l => !ids.includes(l.id));

  // Perform async delete in background
  (async () => {
    const { error: leadsError } = await db.from('leads').delete().in('id', ids);
    handleSupabaseError(leadsError);
  })();

  return beforeCount - db.leadsCache.length;
};

db.saveAllLeads = function(newLeadsList) {
  db.leadsCache = newLeadsList;
  (async () => {
    // Clear all leads
    const { error: clearLeads } = await db.from('leads').delete().neq('id', 'placeholder');
    handleSupabaseError(clearLeads);

    for (const lead of newLeadsList) {
      await db.from('leads').insert({
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
      });
    }
  })();
};

db.resetDatabase = function() {
  db.leadsCache = [];
  (async () => {
    const { error: clearLeads } = await db.from('leads').delete().neq('id', 'placeholder');
    handleSupabaseError(clearLeads);
  })();
  return db.leadsCache;
};

db.getSupabaseConfig = function() {
  return { url: 'https://rmfurfangmwbxjxavbxc.supabase.co', anonKey: 'sb_publishable_bwsEtUEYMxAw-8wjBWZZSw_EhIDIvPp' };
};

db.saveSupabaseConfig = function() {};
db.syncWithSupabaseCloud = async function(onProgress) {
  onProgress("Carregando...");
  await db.fetchLeadsFromSupabase();
  onProgress("Concluído!");
};
