// State Management for JucaAssistência Pro
let transactions = [];
let activeSection = 'dashboard';
let profitChart = null;
let typeChart = null;

// Initialize
async function init() {
    try {
        const response = await fetch('/api/os');
        transactions = await response.json();
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        transactions = JSON.parse(localStorage.getItem('assistencia_transactions')) || [];
    }
    
    updateSummary();
    renderHistory();
    renderInventory();
    initCharts();
}

// Navigation
window.switchSection = function(sectionId) {
    document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
    
    document.getElementById(`section-${sectionId}`).classList.add('active');
    if (event) event.currentTarget.classList.add('active');
    activeSection = sectionId;
};

window.toggleForm = function(id) {
    const el = document.getElementById(id);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

// Formatting
function formatCurrency(value) {
    const val = typeof value === 'string' ? parseFloat(value) : value;
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Update Summary & Dashboards
function updateSummary() {
    const bIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + parseFloat(t.amount), 0);
    const bServiceExpense = transactions.filter(t => t.type === 'expense' && t.description.includes('Custo de Peça')).reduce((acc, t) => acc + parseFloat(t.amount), 0);
    const bStockExpense = transactions.filter(t => t.type === 'expense' && t.description.includes('Estoque:')).reduce((acc, t) => acc + parseFloat(t.amount), 0);
    
    const activeCount = transactions.filter(t => t.status && t.status !== 'Entregue').length;

    document.getElementById('total-income').innerHTML = formatCurrency(bIncome);
    document.getElementById('total-profit').innerHTML = formatCurrency(bIncome - bServiceExpense);
    document.getElementById('total-expenses').innerHTML = formatCurrency(bStockExpense + bServiceExpense);
    document.getElementById('active-services').innerHTML = activeCount;

    if (activeSection === 'dashboard') updateCharts();
}

// Render History
function renderHistory(filter = '') {
    const list = document.getElementById('history-list');
    const filtered = transactions.filter(t => 
        t.description.toLowerCase().includes(filter.toLowerCase()) ||
        (t.customer && t.customer.toLowerCase().includes(filter.toLowerCase()))
    ).filter(t => t.type === 'income' || t.description.includes('Custo de Peça'));

    if (filtered.length === 0) {
        list.innerHTML = '<p style="padding: 2rem; text-align: center; color: var(--text-muted);">Nenhum serviço encontrado.</p>';
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Serviço</th>
                    <th>Status</th>
                    <th>Valor</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
    `;

    const services = filtered.filter(t => t.description.includes('Serviço:'));

    services.forEach(s => {
        const statusClass = getStatusClass(s.status);
        html += `
            <tr>
                <td>${new Date(s.date).toLocaleDateString('pt-BR')}</td>
                <td><strong>${s.customer || 'N/A'}</strong></td>
                <td>${s.description.split('|')[0].replace('Serviço:', '')}</td>
                <td><span class="status-badge ${statusClass}">${s.status || 'Finalizado'}</span></td>
                <td>${formatCurrency(s.amount)}</td>
                <td style="display: flex; gap: 0.5rem;">
                    <button class="btn-primary" style="padding: 0.3rem 0.6rem; font-size: 0.7rem;" onclick="downloadPDF(${s.id})">PDF</button>
                    <button class="btn-outline" style="padding: 0.3rem 0.6rem; font-size: 0.7rem; border-color: var(--error); color: var(--error);" onclick="removeRecord(${s.id})">✕</button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    list.innerHTML = html;
}

function getStatusClass(status) {
    switch(status) {
        case 'Aguardando': return 'status-waiting';
        case 'Em Manutenção': return 'status-process';
        case 'Pronto': return 'status-ready';
        case 'Entregue': return 'status-done';
        default: return 'status-done';
    }
}

// Inventory
function renderInventory() {
    const invList = document.getElementById('inventory-list');
    const stockItems = transactions.filter(t => t.description.includes('Estoque:'));
    
    invList.innerHTML = '<h3>Itens em Estoque</h3>' + stockItems.map(item => `
        <div style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border);">
            <span>${item.description.replace('Estoque:', '')}</span>
            <span style="font-weight: 600;">${formatCurrency(item.amount)}</span>
        </div>
    `).join('');
}

// Forms
document.getElementById('service-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const customer = document.getElementById('service-customer').value;
    const desc = document.getElementById('service-desc').value;
    const cost = parseFloat(document.getElementById('service-part-cost').value) || 0;
    const sell = parseFloat(document.getElementById('service-part-sell').value) || 0;
    const labor = parseFloat(document.getElementById('service-labor').value) || 0;
    const status = document.getElementById('service-status').value;

    const mainRecord = {
        customer, status,
        description: `Serviço: ${desc} | Cliente: ${customer}`,
        amount: sell + labor,
        type: 'income'
    };

    await fetch('/api/os', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mainRecord)
    });

    if (cost > 0) {
        await fetch('/api/os', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer, status: 'Finalizado',
                description: `Custo de Peça: ${desc} | Cliente: ${customer}`,
                amount: cost,
                type: 'expense'
            })
        });
    }

    init();
    e.target.reset();
    toggleForm('service-form-box');
});

document.getElementById('parts-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = document.getElementById('part-type').value;
    const model = document.getElementById('part-model').value;
    const qty = parseInt(document.getElementById('part-qty').value);
    const price = parseFloat(document.getElementById('part-price').value);

    await fetch('/api/os', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            customer: 'Estoque',
            status: 'Estoque',
            description: `Estoque: ${type} - ${model} (x${qty})`,
            amount: qty * price,
            type: 'expense'
        })
    });

    init();
    e.target.reset();
});

// Remove
window.removeRecord = async function(id) {
    if (confirm('Apagar registro permanentemente do banco de dados?')) {
        await fetch(`/api/os?id=${id}`, { method: 'DELETE' });
        init();
    }
};

// Charts (Keep logic but update data source)
function initCharts() {
    const ctxProfit = document.getElementById('profitChart').getContext('2d');
    if (profitChart) profitChart.destroy();
    profitChart = new Chart(ctxProfit, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Lucro (R$)', data: [], borderColor: '#2563eb', tension: 0.4 }] },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const ctxType = document.getElementById('typeChart').getContext('2d');
    if (typeChart) typeChart.destroy();
    typeChart = new Chart(ctxType, {
        type: 'doughnut',
        data: { labels: ['Telas', 'Baterias', 'Conectores', 'Outros'], datasets: [{ data: [0,0,0,0], backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#64748b'] }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
    updateCharts();
}

function updateCharts() {
    if (!profitChart) return;
    const days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toLocaleDateString('pt-BR', { weekday: 'short' });
    });
    profitChart.data.labels = days;
    profitChart.data.datasets[0].data = days.map(() => Math.floor(Math.random() * 500) + 100);
    profitChart.update();
}

// Search
window.searchData = function() {
    const term = document.getElementById('global-search').value;
    renderHistory(term);
};

// PDF Logic (Premium Receipt)
window.downloadPDF = function(id) {
    const { jsPDF } = window.jspdf;
    const record = transactions.find(t => t.id == id);
    if (!record || !jsPDF) return;

    const customerName = record.customer || 'Cliente';
    const serviceName = record.description.split('|')[0].replace('Serviço:', '').trim();
    const amount = parseFloat(record.amount);
    const dateStr = new Date(record.date).toLocaleDateString('pt-BR');
    
    const expiryDate = new Date(record.date);
    expiryDate.setMonth(expiryDate.getMonth() + 3);

    const doc = new jsPDF();
    
    // Header & Brand
    doc.setFillColor(37, 99, 235); // Blue Primary
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text("JUCA ASSISTÊNCIA", 105, 25, { align: "center" });
    
    doc.setFontSize(10);
    doc.text("SOLUÇÕES EM TECNOLOGIA E REPAROS AVANÇADOS", 105, 33, { align: "center" });

    // Body Info
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.text(`ORDEM DE SERVIÇO: #${record.id}`, 20, 55);
    doc.text(`DATA DE EMISSÃO: ${dateStr}`, 140, 55);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 60, 190, 60);

    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO CLIENTE", 20, 70);
    doc.setFont("helvetica", "normal");
    doc.text(`NOME: ${customerName.toUpperCase()}`, 20, 78);
    
    // Table Header
    doc.setFillColor(248, 250, 252);
    doc.rect(20, 90, 170, 10, 'F');
    doc.setFont("helvetica", "bold");
    doc.text("DESCRIÇÃO DO SERVIÇO", 25, 96.5);
    doc.text("VALOR TOTAL", 185, 96.5, { align: "right" });

    // Table Content
    doc.setFont("helvetica", "normal");
    doc.text(serviceName, 25, 110);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(amount), 185, 110, { align: "right" });

    // Totals Box
    doc.setFillColor(37, 99, 235);
    doc.rect(130, 125, 60, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL PAGO:", 135, 134.5);
    doc.text(formatCurrency(amount), 185, 134.5, { align: "right" });

    // Warranty Section
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("TERMOS DE GARANTIA", 20, 160);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const terms = [
        "1. Garantia limitada de 90 dias a partir da data de entrega.",
        "2. A garantia cobre apenas o componente substituído ou o serviço realizado.",
        "3. Abertura do aparelho por terceiros ou danos por líquidos anulam esta garantia.",
        "4. É indispensável a apresentação deste recibo para qualquer reclamação."
    ];
    doc.text(terms, 20, 168);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("GARANTIA VÁLIDA ATÉ: " + expiryDate.toLocaleDateString('pt-BR'), 20, 195);

    // Footer Signature
    doc.setDrawColor(30, 41, 59);
    doc.line(120, 240, 180, 240);
    doc.setFontSize(9);
    doc.text("ASSINATURA DO TÉCNICO", 150, 245, { align: "center" });
    
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Documento gerado eletronicamente por JucaAssistência Pro", 105, 285, { align: "center" });

    doc.save(`Recibo_OS_${record.id}_${customerName.replace(/ /g, '_')}.pdf`);
};

init();
