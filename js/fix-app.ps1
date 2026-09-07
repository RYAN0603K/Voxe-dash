$signaturePath = "C:\Users\Ryan Az\.gemini\antigravity\scratch\voxe-crm\#FEFEFC (1) (1).png"
$appJsPath = "C:\Users\Ryan Az\.gemini\antigravity\scratch\voxe-crm\js\app.js"

# Convert signature to base64
$sigBytes = [System.IO.File]::ReadAllBytes($signaturePath)
$sigBase64 = [Convert]::ToBase64String($sigBytes)
$sigDataUrl = "data:image/png;base64,$sigBase64"

# Read app.js
$appJsContent = [System.IO.File]::ReadAllText($appJsPath, [System.Text.Encoding]::UTF8)

# Find start and end indices of the function
$startIdx = $appJsContent.IndexOf('function generateMeetingProtocolPDF')
$endIdx = $appJsContent.IndexOf('// DIRECT DOWNLOAD LEAD PROTOCOL')

if ($startIdx -lt 0) {
    Write-Error "Error: generateMeetingProtocolPDF start not found!"
    exit 1
}
if ($endIdx -lt 0) {
    Write-Error "Error: // DIRECT DOWNLOAD LEAD PROTOCOL marker not found!"
    exit 1
}
if ($endIdx -le $startIdx) {
    Write-Error "Error: Invalid indices structure!"
    exit 1
}

# Define the new generateMeetingProtocolPDF function code
$newFunc = @'
function generateMeetingProtocolPDF(lead, protocolNumber, formattedDate, time, decisor, email, warmup, meetingNotes, estimatedTicketVal, probabilityVal, assessorName) {
  const ryanSignatureBase64 = '__SIGNATURE_BASE64__';

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
'@

# Substitute __SIGNATURE_BASE64__ placeholder
$newFunc = $newFunc.Replace('__SIGNATURE_BASE64__', $sigDataUrl)

# Perform raw text replacements (safe from Regex group expansions)
$leftSide = $appJsContent.Substring(0, $startIdx)
$rightSide = $appJsContent.Substring($endIdx)

$appJsContent = $leftSide + $newFunc + "`r`n`r`n" + $rightSide

[System.IO.File]::WriteAllText($appJsPath, $appJsContent, [System.Text.Encoding]::UTF8)
Write-Output "App.js rewritten successfully!"
