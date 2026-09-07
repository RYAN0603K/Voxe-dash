const crmData = [
    { id: Date.now(), status: 'cliente', total: 4800, mensal: 1600 }
];

let currentTimeFilter = 'live';

const now = new Date();
let filteredData = crmData.filter(l => {
    if (currentTimeFilter === 'live') return true;
    
    let leadDate;
    if (l.dataReuniao) {
        leadDate = new Date(l.dataReuniao + 'T12:00:00');
    } else if (l.criado_em) {
        leadDate = new Date(l.criado_em);
    } else {
        leadDate = new Date(l.id); // id is Date.now()
    }

    if (isNaN(leadDate.getTime())) return true; // if date is invalid, include it

    const isSameMonth = leadDate.getMonth() === now.getMonth() && leadDate.getFullYear() === now.getFullYear();

    if (currentTimeFilter === 'month') return isSameMonth;
    return true;
});

console.log('Filtered Length for live:', filteredData.length);
currentTimeFilter = 'month';
console.log('Filtered Length for month:', crmData.filter(l => {
    let leadDate = new Date(l.id);
    return leadDate.getMonth() === now.getMonth() && leadDate.getFullYear() === now.getFullYear();
}).length);