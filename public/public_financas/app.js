// State Management for JucaFinanças
let transactions = [];
let debts = JSON.parse(localStorage.getItem('debts')) || []; // Debts can stay in local storage for now or be moved too
let myChart = null;

// Initialize
async function init() {
    try {
        const response = await fetch('/api/finance');
        transactions = await response.json();
    } catch (error) {
        console.error('Erro ao carregar finanças:', error);
        transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    }

    // Ensure Salary exists (R$ 6.200,00) in DB if not present
    const hasSalary = transactions.some(t => t.category === 'Salário' && parseFloat(t.amount) === 6200);
    if (!hasSalary && transactions.length === 0) {
        await addFixedSalary();
    }

    updateSummary();
    renderTransactions();
    renderChart();
    renderDebts();
}

// Global functions for buttons
window.removeTransaction = async function(id) {
    if (confirm('Deletar transação permanentemente?')) {
        await fetch(`/api/finance?id=${id}`, { method: 'DELETE' });
        init();
    }
};

window.addFixedSalary = async function() {
    const salaryTransaction = {
        description: 'Salário + Pensão Mensal',
        amount: 6200.00,
        category: 'Salário',
        type: 'income'
    };
    await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salaryTransaction)
    });
    init();
};

window.addVA = async function() {
    const amount = prompt("Qual o valor do seu Vale Alimentação?", "0.00");
    if (amount !== null && !isNaN(amount) && amount > 0) {
        const vaTransaction = {
            description: 'Depósito Vale Alimentação',
            amount: parseFloat(amount),
            category: 'Vale Alimentação',
            type: 'income'
        };
        await fetch('/api/finance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vaTransaction)
        });
        init();
    }
};

// Update Summary
function updateSummary() {
    const income = transactions.filter(t => t.type === 'income').reduce((acc, item) => acc + parseFloat(item.amount), 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, item) => acc + parseFloat(item.amount), 0);
    const total = income - expense;

    document.getElementById('total-balance').innerHTML = formatCurrency(total);
    document.getElementById('total-balance').style.color = total >= 0 ? 'var(--success)' : 'var(--error)';
    document.getElementById('total-income').innerHTML = formatCurrency(income);
    document.getElementById('total-expenses').innerHTML = formatCurrency(expense);
}

// Render Transaction List
function renderTransactions() {
    const listEl = document.getElementById('transaction-list');
    if (transactions.length === 0) {
        listEl.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">Nenhuma transação registrada.</p>';
        return;
    }

    listEl.innerHTML = transactions.map(t => `
        <div class="transaction-item">
            <div class="transaction-info">
                <h4>${t.description}</h4>
                <p>${t.category} • ${new Date(t.date).toLocaleDateString('pt-BR')}</p>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
                <span class="transaction-amount ${t.type === 'income' ? 'income' : 'expense'}">
                    ${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}
                </span>
                <button class="delete-btn" onclick="window.removeTransaction('${t.id}')">Remover</button>
            </div>
        </div>
    `).join('');
}

// Add Transaction Form
document.getElementById('transaction-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newTransaction = {
        description: document.getElementById('description').value,
        amount: parseFloat(document.getElementById('amount').value),
        category: document.getElementById('category').value,
        type: document.getElementById('type').value
    };

    await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTransaction)
    });

    e.target.reset();
    init();
});

// Utils
function formatCurrency(value) {
    const val = typeof value === 'string' ? parseFloat(value) : value;
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function renderChart() {
    const chartCtx = document.getElementById('expenseChart').getContext('2d');
    const expensesByCategory = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + parseFloat(t.amount);
    });

    const labels = Object.keys(expensesByCategory);
    const data = Object.values(expensesByCategory);

    if (myChart) myChart.destroy();
    if (data.length === 0) return;

    myChart = new Chart(chartCtx, {
        type: document.getElementById('chart-type').value,
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// (Debts logic stays mostly local for now as requested or implied by complexity)
function renderDebts() {
    // Keep local for now or migrate later
}

init();
