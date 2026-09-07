const crmData = [
    { id: Date.now(), total: 10000, status: 'novo', dataReuniao: '2026-08-01' },
    { id: Date.now() - 10000000, total: 14000, status: '1_reuniao', criado_em: '2026-07-01' }
];

const currentTimeFilter = 'month'; // 'live', 'month', '2months', '3months', 'year', 'lastyear'
const now = new Date('2026-08-28T12:00:00');

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
    const isSameYear = leadDate.getFullYear() === now.getFullYear();
    const isLastYear = leadDate.getFullYear() === now.getFullYear() - 1;
    const diffTime = Math.abs(now - leadDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (currentTimeFilter === 'month') return isSameMonth;
    if (currentTimeFilter === '2months') return diffDays <= 60;
    if (currentTimeFilter === '3months') return diffDays <= 90;
    if (currentTimeFilter === 'year') return isSameYear;
    if (currentTimeFilter === 'lastyear') return isLastYear;
    
    return true;
});

console.log('Month Filter:', filteredData.length);