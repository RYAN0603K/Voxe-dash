/*
=========================================================================
VOXE CRM - SCRIPT ARSENAL & MESSAGING SCRIPTS
=========================================================================
*/

const SCRIPTS_DATA = [
  {
    id: "wa-opener-reviews",
    title: "Abordagem 1: Elogio de Avaliações Google",
    category: "Primeiro Contato",
    description: "Excelente para abrir portas. Usa as avaliações positivas da clínica veterinária no Google Maps para gerar reciprocidade.",
    text: `Olá, tudo bem? Falo com o responsável comercial ou proprietário da [CLINICA]?

Estava pesquisando clínicas veterinárias na região e vi o perfil de vocês no Google Maps com excelentes avaliações. Parabéns pelo trabalho!

Vi que vocês oferecem [SEGMENTO]. Notei um detalhe importante no site de vocês ([SITE]) que pode estar fazendo vocês perderem agendamentos para concorrentes da região toda semana.

Se eu te mandar um áudio de 1 minuto explicando como corrigir isso e atrair mais donos de pets, você ouviria?

Abraços, [ASSESSOR]`
  },
  {
    id: "wa-opener-site",
    title: "Abordagem 2: Análise Rápida de Site",
    category: "Primeiro Contato",
    description: "Foco técnico/comercial. Aponta uma melhoria direta no site da clínica ou a falta dele.",
    text: `Oi, tudo bem? Quem fala é o [ASSESSOR].

Estava analisando o site da [CLINICA] ([SITE]) e percebi que ele não está otimizado para celulares, o que dificulta que clientes cliquem para ligar ou chamar no WhatsApp em casos de emergência.

Nós ajudamos clínicas veterinárias a estruturarem um funil de agendamentos online automático que triplica a conversão de novos clientes.

Você teria 5 minutos nesta semana para eu te mostrar como clínicas da região estão lotando a agenda de consultas e cirurgias com isso?`
  },
  {
    id: "wa-followup-1",
    title: "Follow-up 1: Lembrete Amigável",
    category: "Follow-up",
    description: "Use 24 a 48 horas após o primeiro contato sem resposta.",
    text: `Oi, [NOME]. Tudo bem?

Imagino que a rotina de consultas e atendimentos na [CLINICA] deve estar super corrida! 🐾

Queria apenas garantir que minha mensagem anterior não acabou se perdendo no seu fluxo. Conseguiu dar uma olhada?`
  },
  {
    id: "wa-followup-2",
    title: "Follow-up 2: Acesso a Conteúdo/Insight",
    category: "Follow-up",
    description: "Envia um insight rápido sobre captação de clientes pet para reengajar.",
    text: `Oi, [NOME], tudo bem?

Passando rápido para compartilhar um dado interessante: 82% dos donos de pets buscam clínicas no Google pelo celular em situações de emergência de banho e tosa ou veterinário 24h.

Se a [CLINICA] não aparece nas primeiras posições ou o botão do WhatsApp do site falha, o cliente clica no próximo da lista em menos de 10 segundos.

Nós montamos um guia rápido com 3 passos para posicionar a clínica no topo do Google local. Quer que eu te envie o PDF por aqui?`
  },
  {
    id: "obj-sem-tempo",
    title: "Objeção: Estou sem tempo",
    category: "Objeções",
    description: "Contorno para quando o lead diz que a rotina veterinária está muito cheia.",
    text: `Entendo perfeitamente, [NOME]! A rotina médica e cirúrgica de uma clínica não para um minuto.

É exatamente por isso que nossa assessoria foca em implementar um sistema automático de captação. Você não precisará gastar seu tempo prospectando clientes; o sistema roda em segundo plano.

O que acha de agendarmos uma conversa rápida de apenas 10 minutos na próxima quinta-feira, no início da manhã ou no fim do dia, apenas para eu te mostrar a estrutura?`
  },
  {
    id: "obj-sem-interesse",
    title: "Objeção: Já tenho agência/marketing",
    category: "Objeções",
    description: "Contorno para quando a clínica já investe em marketing digital tradicional.",
    text: `Excelente, [NOME]! Fico muito feliz que vocês já entendam a importância de se posicionar no digital.

A diferença é que a maioria das agências foca em curtidas e postagens bonitas em redes sociais. Nosso trabalho é assessoria de vendas direta: focamos exclusivamente em ligar o seu site a pessoas que estão buscando atendimento veterinário urgente HOJE.

Funciona como um canal extra de vendas, focado em ROI (retorno sobre o investimento).

Podemos agendar 15 minutos para fazer uma comparação com o que vocês rodam hoje, sem compromisso?`
  },
  {
    id: "agendamento-confirmacao",
    title: "Agendamento: Confirmação de Reunião",
    category: "Agendamento",
    description: "Mensagem formal para enviar logo após o agendamento de uma sessão de diagnóstico.",
    text: `Perfeito, [NOME]! Combinado para o dia [DATA_REUNIAO] às [HORA_REUNIAO].

Acabei de enviar o convite para o seu e-mail ([EMAIL]) com o link da sala do Google Meet. 

Vou te mandar um lembrete por aqui 15 minutos antes de começarmos. Estudei a presença digital da [CLINICA] e separei ótimas oportunidades para te apresentar.

Tenha um excelente dia de trabalho! 🐾`
  }
];

// Replaces variables in template text based on lead data
function replaceLeadVariables(text, lead, assessorName = "Ryan") {
  if (!text) return "";
  
  const leadName = lead.name || "Responsável";
  // Get first name for more informal greeting
  const firstName = leadName.split(' ')[0].replace(/[^a-zA-ZÀ-ÿ]/g, '');
  
  const companyName = lead.name || "Clínica";
  const website = lead.website || "seu site";
  const segment = lead.category || "Serviço Veterinário";
  const phone = lead.phone || "";
  const email = lead.email || "[Definir E-mail]";
  const mDate = lead.meetingDate || "[Definir Data]";
  const mTime = lead.meetingTime || "[Definir Horário]";
  
  return text
    .replace(/\[NOME\]/g, firstName)
    .replace(/\[CLINICA\]/g, companyName)
    .replace(/\[SITE\]/g, website)
    .replace(/\[SEGMENTO\]/g, segment)
    .replace(/\[TELEFONE\]/g, phone)
    .replace(/\[EMAIL\]/g, email)
    .replace(/\[DATA_REUNIAO\]/g, mDate)
    .replace(/\[HORA_REUNIAO\]/g, mTime)
    .replace(/\[ASSESSOR\]/g, assessorName);
}

// Render script cards in the Arsenal view
function renderScriptsView(selectedLeadId, activeCategory = 'all') {
  const grid = document.getElementById('scripts-cards-grid');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  const activeLead = db.getLeadById(selectedLeadId);
  const assessorName = document.getElementById('user-name-display')?.textContent || 'Ryan';
  
  const infoBar = document.getElementById('script-lead-info-bar');
  if (infoBar) {
    if (activeLead) {
      const parts = [];
      if (activeLead.phone) parts.push(`📞 <strong>Telefone:</strong> ${activeLead.phone}`);
      if (activeLead.email) parts.push(`✉️ <strong>E-mail:</strong> ${activeLead.email}`);
      if (activeLead.website) parts.push(`🌐 <strong>Website:</strong> <a href="${activeLead.website.startsWith('http') ? activeLead.website : 'http://' + activeLead.website}" target="_blank" class="web-link">${activeLead.website}</a>`);
      if (activeLead.meetingDate) {
        const timeStr = activeLead.meetingTime ? ` às ${activeLead.meetingTime}` : '';
        parts.push(`📅 <strong>Reunião:</strong> ${activeLead.meetingDate}${timeStr}`);
      }
      infoBar.innerHTML = parts.length > 0 ? parts.join(' <span style="color: var(--color-border);">|</span> ') : 'Nenhuma informação adicional para o lead.';
      infoBar.style.display = 'flex';
    } else {
      infoBar.style.display = 'none';
    }
  }
  
  const filteredScripts = SCRIPTS_DATA.filter(s => activeCategory === 'all' || s.category === activeCategory);
  
  if (filteredScripts.length === 0) {
    grid.innerHTML = `<div class="card text-center" style="grid-column: span 2; padding: 2rem; color: var(--color-text-muted);">Nenhum roteiro encontrado.</div>`;
    return;
  }
  
  filteredScripts.forEach(script => {
    // Process text variables if we have a selected lead
    const processedText = activeLead ? replaceLeadVariables(script.text, activeLead, assessorName) : script.text;
    
    const card = document.createElement('div');
    card.className = 'script-card';
    card.innerHTML = `
      <div class="script-card-header">
        <h4 class="script-card-title">${script.title}</h4>
        <span class="script-card-category">${script.category}</span>
      </div>
      <p class="script-card-desc">${script.description}</p>
      <div class="script-card-preview" id="preview-text-${script.id}">${processedText}</div>
      <div class="script-card-actions">
        <button class="btn btn-secondary btn-sm" onclick="copyScriptText('${script.id}')">Copiar 📋</button>
        <button class="btn btn-primary btn-sm" onclick="openWhatsAppForScript('${script.id}', '${selectedLeadId}')">Enviar WhatsApp 💬</button>
      </div>
    `;
    
    grid.appendChild(card);
  });
}

function copyScriptText(scriptId) {
  const textContainer = document.getElementById(`preview-text-${scriptId}`);
  if (!textContainer) return;
  
  const text = textContainer.textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Script copiado para a área de transferência! ✓', 'success');
  }).catch(err => {
    console.error('Error copying text:', err);
  });
}

function openWhatsAppForScript(scriptId, leadId) {
  const textContainer = document.getElementById(`preview-text-${scriptId}`);
  const lead = db.getLeadById(leadId);
  if (!textContainer || !lead) {
    showToast('Selecione um lead foco no topo para enviar o script.', 'error');
    return;
  }
  
  const text = textContainer.textContent;
  navigator.clipboard.writeText(text).then(() => {
    let cleanPhone = lead.cleanPhone;
    if (!cleanPhone && lead.phone) {
      cleanPhone = lead.phone.replace(/[^\d]/g, '');
      if (cleanPhone.length <= 11 && cleanPhone.length > 0 && !cleanPhone.startsWith('55')) {
        cleanPhone = '55' + cleanPhone;
      }
    }
    
    if (cleanPhone) {
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank');
      showToast('Copiado e redirecionando para WhatsApp...', 'success');
      
      // Automatically log contact attempt
      if (typeof logContactAttemptSilent === 'function') {
        const script = SCRIPTS_DATA.find(s => s.id === scriptId);
        const scriptTitle = script ? script.title : 'Mensagem Rápida';
        logContactAttemptSilent(lead.id, 'Mensagem', `Disparo (Roteiro: ${scriptTitle})`);
      }

      // Update status to "✋/Em contato" automatically
      db.updateLead(lead.id, { status: '✋/Em contato' });
      if (typeof initApp === 'function') initApp();
    } else {
      showToast('O prospect não possui telefone cadastrado. Mensagem apenas copiada!', 'success');
    }
  });
}
