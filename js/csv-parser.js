/*
=========================================================================
VOXE CRM - CSV FILE IMPORT & HEADER MAPPING WIZARD
=========================================================================
*/

let csvParsedRows = [];
let csvHeaders = [];

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  processCSVFile(file);
}

function processCSVFile(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    parseCSVText(text);
  };
  reader.readAsText(file, 'UTF-8');
}

// Enable Drag & Drop
document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('drop-zone');
  if (dropZone) {
    dropZone.onclick = () => document.getElementById('csv-file-input').click();
    
    dropZone.ondragover = (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    };
    
    dropZone.ondragleave = () => {
      dropZone.classList.remove('drag-over');
    };
    
    dropZone.ondrop = (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length > 0) {
        processCSVFile(e.dataTransfer.files[0]);
      }
    };
  }
});

function parseCSVToRows(text) {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let inQuotes = false;
  
  // Auto-detect delimiter from the first line or first 1000 characters
  let delimiter = ',';
  const firstLine = text.split(/\r?\n/)[0] || '';
  if (firstLine.includes(';') && !firstLine.includes(',')) {
    delimiter = ';';
  } else if (firstLine.includes(';') && firstLine.includes(',')) {
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;
    if (semiCount > commaCount) delimiter = ';';
  }
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      currentRow.push(currentCell.trim());
      if (currentRow.length > 0 && !currentRow.every(v => v === '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }
  
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.length > 0 && !currentRow.every(v => v === '')) {
      rows.push(currentRow);
    }
  }
  
  return rows;
}

function parseCSVText(text) {
  const allRows = parseCSVToRows(text);
  if (allRows.length === 0) {
    showToast('O arquivo CSV está vazio.', 'error');
    return;
  }
  
  csvHeaders = allRows[0];
  csvParsedRows = allRows.slice(1);
  
  if (csvParsedRows.length === 0) {
    showToast('Nenhum dado encontrado no arquivo.', 'error');
    return;
  }
  
  showToast(`CSV Carregado! ${csvParsedRows.length} linhas encontradas. Mapeie as colunas.`, 'success');
  renderMappingInterface();
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  // Auto-detect delimiter (comma or semicolon)
  let delimiter = ',';
  if (line.includes(';') && !line.includes(',')) {
    delimiter = ';';
  } else if (line.includes(';') && line.includes(',')) {
    // If it has both, count occurrences outside quotes or simple heuristic
    const commaCount = (line.match(/,/g) || []).length;
    const semiCount = (line.match(/;/g) || []).length;
    if (semiCount > commaCount) delimiter = ';';
  }
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Render header selector dropdowns for CSV import
function renderMappingInterface() {
  const container = document.getElementById('mapping-fields-container');
  const mappingArea = document.getElementById('csv-mapping-area');
  const dropZone = document.getElementById('drop-zone');
  
  if (!container || !mappingArea) return;
  
  container.innerHTML = '';
  
  // Target fields in CRM
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
    { key: 'notes', label: 'Notas / Anotações' }
  ];
  
  crmFields.forEach(field => {
    const row = document.createElement('div');
    row.className = 'mapping-row';
    
    // Find best match heuristics
    let bestMatchIndex = -1;
    const lowerLabel = field.label.toLowerCase();
    const lowerKey = field.key.toLowerCase();
    
    csvHeaders.forEach((header, idx) => {
      const lowerHeader = header.toLowerCase();
      if (lowerHeader === lowerKey || 
          lowerHeader.includes(lowerKey) || 
          lowerHeader.includes('site') && field.key === 'website' ||
          lowerHeader.includes('nome') && field.key === 'name' ||
          lowerHeader.includes('tel') && field.key === 'phone' ||
          lowerHeader.includes('end') && field.key === 'address' ||
          lowerHeader.includes('cat') && field.key === 'category' ||
          lowerHeader.includes('link') && field.key === 'mapsLink') {
        bestMatchIndex = idx;
      }
    });
    
    // Specifically for user's google Teste.csv headers
    if (field.key === 'name' && csvHeaders.includes('qBF1Pd')) {
      bestMatchIndex = csvHeaders.indexOf('qBF1Pd');
    }
    if (field.key === 'phone' && csvHeaders.includes('UsdlK')) {
      bestMatchIndex = csvHeaders.indexOf('UsdlK');
    }
    if (field.key === 'website' && csvHeaders.includes('lcr4fd href')) {
      bestMatchIndex = csvHeaders.indexOf('lcr4fd href');
    }
    if (field.key === 'address' && csvHeaders.includes('W4Efsd 4')) {
      bestMatchIndex = csvHeaders.indexOf('W4Efsd 4');
    }
    if (field.key === 'category' && csvHeaders.includes('W4Efsd')) {
      bestMatchIndex = csvHeaders.indexOf('W4Efsd');
    }
    if (field.key === 'mapsLink' && csvHeaders.includes('hfpxzc href')) {
      bestMatchIndex = csvHeaders.indexOf('hfpxzc href');
    }
    
    let optionsHtml = `<option value="">-- Ignorar Campo --</option>`;
    csvHeaders.forEach((header, idx) => {
      const selectedAttr = idx === bestMatchIndex ? 'selected' : '';
      optionsHtml += `<option value="${idx}" ${selectedAttr}>${header}</option>`;
    });
    
    row.innerHTML = `
      <span class="mapping-label">${field.label}</span>
      <select class="mapping-select" data-crm-field="${field.key}">
        ${optionsHtml}
      </select>
    `;
    
    container.appendChild(row);
  });
  
  // Hide upload dropzone and show mapping controls
  dropZone.classList.add('hidden');
  mappingArea.classList.remove('hidden');
}

function cancelCSVImport() {
  const mappingArea = document.getElementById('csv-mapping-area');
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('csv-file-input');
  
  if (mappingArea) mappingArea.classList.add('hidden');
  if (dropZone) dropZone.classList.remove('hidden');
  if (fileInput) fileInput.value = ''; // Reset file input
  
  csvParsedRows = [];
  csvHeaders = [];
}

function processCSVImport() {
  const selects = document.querySelectorAll('.mapping-select');
  const mappings = {};
  
  selects.forEach(select => {
    const crmField = select.getAttribute('data-crm-field');
    const csvIndex = select.value;
    if (csvIndex !== '') {
      mappings[crmField] = parseInt(csvIndex);
    }
  });
  
  // Validation: Name is mandatory
  if (mappings['name'] === undefined) {
    showToast('Você precisa mapear a coluna "Nome da Empresa/Clínica".', 'error');
    return;
  }
  
  let importCount = 0;
  let duplicateCount = 0;
  const currentLeads = db.getLeads();
  
  csvParsedRows.forEach(row => {
    const nameVal = row[mappings['name']];
    if (!nameVal || nameVal === '.' || nameVal === '""') return; // Skip invalid entries
    
    const phoneVal = mappings['phone'] !== undefined ? cleanQuotes(row[mappings['phone']]) : '';
    const websiteVal = mappings['website'] !== undefined ? cleanQuotes(row[mappings['website']]) : '';
    
    // Normalize values for duplicate check
    const cleanPhoneImport = phoneVal.replace(/[^\d]/g, '');
    const cleanWebsiteImport = websiteVal.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').trim();
    
    // Check duplication
    let isDuplicate = false;
    if (cleanPhoneImport || cleanWebsiteImport) {
      isDuplicate = currentLeads.some(l => {
        const cleanPhoneDb = l.phone ? l.phone.replace(/[^\d]/g, '') : '';
        const cleanWebsiteDb = l.website ? l.website.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').trim() : '';
        
        return (cleanPhoneImport && cleanPhoneDb === cleanPhoneImport) ||
               (cleanWebsiteImport && cleanWebsiteDb === cleanWebsiteImport);
      });
    }
    
    if (isDuplicate) {
      duplicateCount++;
      return; // Skip duplicate lead
    }
    
    const lead = {
      name: cleanQuotes(nameVal),
      decisor: mappings['decisor'] !== undefined ? cleanQuotes(row[mappings['decisor']]) : '',
      phone: phoneVal,
      email: mappings['email'] !== undefined ? cleanQuotes(row[mappings['email']]) : '',
      website: websiteVal,
      address: mappings['address'] !== undefined ? cleanQuotes(row[mappings['address']]) : '',
      warmup: mappings['warmup'] !== undefined ? cleanQuotes(row[mappings['warmup']]) : '',
      category: mappings['category'] !== undefined ? cleanQuotes(row[mappings['category']]) : 'Clínica Veterinária',
      mapsLink: mappings['mapsLink'] !== undefined ? cleanQuotes(row[mappings['mapsLink']]) : '',
      notes: mappings['notes'] !== undefined ? cleanQuotes(row[mappings['notes']]) : '',
      status: 'Novo',
      priority: 'Média',
      channel: 'CSV Import',
      value: 0,
      seller: 'Ryan'
    };
    
    db.addLead(lead);
    importCount++;
  });
  
  if (duplicateCount > 0) {
    showToast(`${importCount} prospects importados. ${duplicateCount} duplicados ignorados. ✓`, 'success');
  } else {
    showToast(`${importCount} prospects importados com sucesso! ✓`, 'success');
  }
  
  cancelCSVImport();
  
  // Reload app grid
  if (typeof initApp === 'function') {
    initApp();
  }
}

function cleanQuotes(str) {
  if (str === null || str === undefined) return '';
  const s = String(str);
  return s.replace(/^"+|"+$/g, '').trim();
}
