// State Management
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let debts = JSON.parse(localStorage.getItem('debts')) || [];

window.switchTab = function(tabId) {
    // Buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // Content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabId}-tab`).classList.add('active');
};
let myChart = null;

// Selectors
const balanceEl = document.getElementById('total-balance');
const incomeEl = document.getElementById('total-income');
const expenseEl = document.getElementById('total-expenses');
const listEl = document.getElementById('transaction-list');
const form = document.getElementById('transaction-form');
const chartCtx = document.getElementById('expenseChart').getContext('2d');
const chartTypeSelect = document.getElementById('chart-type');

// Initialize
function init() {
    // 1. Ensure Salary exists (R$ 6.200,00)
    const hasSalary = transactions.some(t => t.category === 'Salário' && t.amount === 6200);
    if (!hasSalary) {
        const salary = {
            id: 'salary-fixed',
            description: 'Salário + Pensão Mensal',
            amount: 6200.00,
            category: 'Salário',
            type: 'income',
            date: new Date().toISOString()
        };
        transactions.unshift(salary);
    }

    // 2. Force/Update Specific Debts
    const currentMonth = new Date().getMonth();
    const initialDebtsList = [
        { id: 'bb-fixed', name: 'Banco do Brasil', amount: 937.09, totalInstallments: 24, paidInstallments: 2, dueDay: 2, lastPaidMonth: currentMonth },
        { id: 'neon-fixed', name: 'Banco Neon', amount: 0, totalInstallments: 12, paidInstallments: 3, dueDay: 7, lastPaidMonth: currentMonth },
        { id: 'mp-fixed', name: 'Mercado Pago', amount: 0, totalInstallments: 12, paidInstallments: 0, dueDay: 11, lastPaidMonth: -1 }
    ];

    if (debts.length === 0 && !localStorage.getItem('initialized_debts')) {
        // Only populate ONCE ever
        debts = initialDebtsList;
        localStorage.setItem('initialized_debts', 'true');
    } else {
        // If not empty, only UPDATE the ones that the user kept
        initialDebtsList.forEach(initD => {
            const existingIndex = debts.findIndex(d => d.name.toLowerCase().includes(initD.name.toLowerCase()) || initD.name.toLowerCase().includes(d.name.toLowerCase()));
            if (existingIndex !== -1) {
                debts[existingIndex].amount = debts[existingIndex].amount || initD.amount;
                debts[existingIndex].dueDay = initD.dueDay;
                debts[existingIndex].totalInstallments = initD.totalInstallments;
                debts[existingIndex].paidInstallments = initD.paidInstallments;
                debts[existingIndex].lastPaidMonth = initD.lastPaidMonth;
            }
        });
    }

    // 3. Cleanup garbage
    transactions = transactions.filter(t => t.amount > 0 && t.description !== 'Salário' && t.amount !== 5000);
    debts = debts.filter(d => d.dueDay !== 10);

    saveToLocalStorage();
    updateSummary();
    renderTransactions();
    renderChart();
    renderDebts();
}

// Global functions for buttons
window.removeTransaction = function(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveToLocalStorage();
    init();
};

window.removeDebt = function(id) {
    debts = debts.filter(d => String(d.id) !== String(id));
    saveToLocalStorage();
    init();
};

window.clearAllData = function() {
    if (confirm('ATENÇÃO: Isso apagará TODOS os seus dados e recomeçará do zero. Deseja continuar?')) {
        localStorage.clear();
        location.reload();
    }
};

window.payInstallment = function(id) {
    const debt = debts.find(d => d.id === id);
    if (debt && debt.paidInstallments < debt.totalInstallments) {
        debt.paidInstallments++;
        debt.lastPaidMonth = new Date().getMonth(); // Mark as paid this month
        
        const newTransaction = {
            id: Date.now(),
            description: `Parcela: ${debt.name} (${debt.paidInstallments}/${debt.totalInstallments})`,
            amount: debt.amount,
            category: 'Outros',
            type: 'expense',
            date: new Date().toISOString()
        };
        transactions.unshift(newTransaction);
        
        saveToLocalStorage();
        init();
    }
};

window.addFixedSalary = function() {
    const salaryTransaction = {
        id: Date.now(),
        description: 'Salário + Pensão Mensal',
        amount: 6200.00,
        category: 'Salário',
        type: 'income',
        date: new Date().toISOString()
    };
    transactions.unshift(salaryTransaction);
    saveToLocalStorage();
    init();
    alert('Salário de R$ 6.200,00 adicionado com sucesso!');
};

window.addVA = function() {
    const amount = prompt("Qual o valor do seu Vale Alimentação?", "0.00");
    if (amount !== null && !isNaN(amount) && amount > 0) {
        const vaTransaction = {
            id: Date.now(),
            description: 'Depósito Vale Alimentação',
            amount: parseFloat(amount),
            category: 'Vale Alimentação',
            type: 'income',
            date: new Date().toISOString()
        };
        transactions.unshift(vaTransaction);
        saveToLocalStorage();
        init();
    }
};

window.toggleDebtForm = function() {
    const container = document.getElementById('debt-form-container');
    container.style.display = container.style.display === 'none' ? 'block' : 'none';
};

// Format Currency
function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Parts Form Submission
document.getElementById('parts-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const type = document.getElementById('part-type').value;
    const model = document.getElementById('part-model').value;
    const qty = parseInt(document.getElementById('part-qty').value);
    const unitPrice = parseFloat(document.getElementById('part-price').value);
    const totalPrice = qty * unitPrice;

    const newTransaction = {
        id: Date.now(),
        description: `Peça: ${type} - ${model} (x${qty})`,
        amount: totalPrice,
        category: 'Peças/Eletrônicos',
        type: 'expense',
        date: new Date().toISOString()
    };

    transactions.unshift(newTransaction);
    saveToLocalStorage();
    init();
    
    e.target.reset();
    alert(`Compra de ${qty}x ${type} registrada com sucesso!`);
});

// Service Orders Submission
document.getElementById('service-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const customer = document.getElementById('service-customer').value;
    const desc = document.getElementById('service-desc').value;
    const partCost = parseFloat(document.getElementById('service-part-cost').value) || 0;
    const partSell = parseFloat(document.getElementById('service-part-sell').value) || 0;
    const laborValue = parseFloat(document.getElementById('service-labor').value) || 0;
    
    const totalCustomerPays = partSell + laborValue;
    const netProfit = (partSell - partCost) + laborValue;

    // 1. Register Total Income (What the customer paid)
    const incomeTransaction = {
        id: Date.now(),
        description: `Serviço: ${desc} (Cliente: ${customer})`,
        amount: totalCustomerPays,
        category: 'Peças/Eletrônicos',
        type: 'income',
        date: new Date().toISOString()
    };
    transactions.unshift(incomeTransaction);

    // 2. Register Part Cost if > 0 (Expense for you)
    if (partCost > 0) {
        const partExpense = {
            id: Date.now() + 1,
            description: `Custo de Peça: ${desc} (Cliente: ${customer})`,
            amount: partCost,
            category: 'Peças/Eletrônicos',
            type: 'expense',
            date: new Date().toISOString()
        };
        transactions.unshift(partExpense);
    }

    saveToLocalStorage();
    init();
    
    e.target.reset();
    alert(`Serviço de ${customer} finalizado!\nTotal Cobrado: ${formatCurrency(totalCustomerPays)}\nLucro Líquido: ${formatCurrency(netProfit)}`);
});

// Update Summary
function updateSummary() {
    // 1. Personal Finances (Saldo Total)
    const personalAmounts = transactions.map(t => t.type === 'income' ? t.amount : -t.amount);
    const total = personalAmounts.reduce((acc, item) => (acc += item), 0);
    const income = transactions.filter(t => t.type === 'income').reduce((acc, item) => (acc += item.amount), 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, item) => (acc += item.amount), 0);

    balanceEl.innerHTML = formatCurrency(total);
    balanceEl.style.color = total >= 0 ? 'var(--success)' : 'var(--error)';
    incomeEl.innerHTML = formatCurrency(income);
    expenseEl.innerHTML = formatCurrency(expense);

    // 2. Business Finances (Assistência)
    const businessTrans = transactions.filter(t => t.category === 'Peças/Eletrônicos');
    
    const bIncomeSum = businessTrans.filter(t => t.type === 'income').reduce((acc, item) => (acc += item.amount), 0);
    const bServiceExpenseSum = businessTrans.filter(t => t.type === 'expense' && t.description.includes('Custo de Peça')).reduce((acc, item) => (acc += item.amount), 0);
    const bStockExpenseSum = businessTrans.filter(t => t.type === 'expense' && t.description.includes('Peça:')).reduce((acc, item) => (acc += item.amount), 0);

    const bIncomeDisplay = document.getElementById('business-income');
    const bProfitDisplay = document.getElementById('business-profit');
    const bExpenseDisplay = document.getElementById('business-expenses');

    if (bIncomeDisplay) bIncomeDisplay.innerHTML = formatCurrency(bIncomeSum);
    if (bProfitDisplay) {
        const netProfitValue = bIncomeSum - bServiceExpenseSum;
        bProfitDisplay.innerHTML = formatCurrency(netProfitValue);
        bProfitDisplay.style.color = netProfitValue >= 0 ? 'var(--success)' : 'var(--error)';
    }
    if (bExpenseDisplay) bExpenseDisplay.innerHTML = formatCurrency(bStockExpenseSum + bServiceExpenseSum);
}

// Render Transaction List
function renderTransactions() {
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

// Remove Transaction
// Handled by window.removeTransaction

// Add Transaction
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const newTransaction = {
        id: Date.now(),
        description: document.getElementById('description').value,
        amount: parseFloat(document.getElementById('amount').value),
        category: document.getElementById('category').value,
        type: document.getElementById('type').value,
        date: new Date().toISOString()
    };

    transactions.unshift(newTransaction);
    saveToLocalStorage();
    form.reset();
    init();
});

// Save to LocalStorage
function saveToLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('debts', JSON.stringify(debts));
}

// Debt Management
// toggleDebtForm Handled by window.toggleDebtForm

document.getElementById('debt-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const newDebt = {
        id: Date.now(),
        name: document.getElementById('debt-name').value,
        amount: parseFloat(document.getElementById('debt-amount').value),
        totalInstallments: parseInt(document.getElementById('debt-total-installments').value),
        paidInstallments: parseInt(document.getElementById('debt-paid-installments').value),
        dueDay: parseInt(document.getElementById('debt-due-day').value),
        lastPaidMonth: -1 // -1 means never paid via the 'Pay' button in this session
    };
    debts.push(newDebt);
    saveToLocalStorage();
    document.getElementById('debt-form').reset();
    toggleDebtForm();
    renderDebts();
});

function renderDebts() {
    const debtList = document.getElementById('debt-list');
    if (debts.length === 0) {
        debtList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">Nenhum empréstimo registrado.</p>';
        return;
    }

    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();

    debtList.innerHTML = debts.map(d => {
        const remaining = d.totalInstallments - d.paidInstallments;
        const progress = (d.paidInstallments / d.totalInstallments) * 100;
        const totalPaidValue = d.amount * d.paidInstallments;
        const totalRemainingValue = d.amount * remaining;
        
        // Due Date Logic
        let statusBadge = '';
        let statusColor = 'var(--text-muted)';
        const isPaidThisMonth = d.lastPaidMonth === currentMonth;
        
        if (remaining > 0) {
            if (isPaidThisMonth) {
                statusBadge = '✅ Pago este mês';
                statusColor = 'var(--success)';
            } else {
                const dueDay = d.dueDay || 10;
                if (currentDay > dueDay) {
                    statusBadge = `🚨 Vencido (dia ${dueDay})`;
                    statusColor = 'var(--error)';
                } else if (currentDay === dueDay) {
                    statusBadge = '⚠️ Vence HOJE!';
                    statusColor = '#fbbf24';
                } else if (dueDay - currentDay > 0 && dueDay - currentDay <= 3) {
                    statusBadge = `⏳ Vence em ${dueDay - currentDay} dias (dia ${dueDay})`;
                    statusColor = '#fb923c';
                } else {
                    statusBadge = `📅 Vencimento dia ${dueDay}`;
                }
            }
        }
        
        return `
            <div class="glass-card" style="padding: 1rem; border-color: ${statusBadge.includes('🚨') ? 'var(--error)' : 'rgba(255,255,255,0.05)'};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                    <div>
                        <h4 style="font-size: 1rem;">${d.name}</h4>
                        <div style="font-size: 0.75rem; color: ${statusColor}; font-weight: 600; margin-top: 2px;">${statusBadge}</div>
                    </div>
                    <button class="delete-btn" onclick="window.removeDebt('${d.id}')" style="padding: 0; font-size: 0.7rem;">Excluir</button>
                </div>
                
                <div style="margin: 0.8rem 0;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.3rem;">
                        <span style="color: var(--text-muted);">Progresso (${d.paidInstallments}/${d.totalInstallments})</span>
                        <span>${progress.toFixed(0)}%</span>
                    </div>
                    <div style="background: rgba(255,255,255,0.1); height: 6px; border-radius: 10px; overflow: hidden;">
                        <div style="background: var(--primary); width: ${progress}%; height: 100%;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-top: 0.5rem;">
                        <span style="color: var(--success);">Pago: ${formatCurrency(totalPaidValue)}</span>
                        <span style="color: var(--text-muted);">Falta: ${formatCurrency(totalRemainingValue)}</span>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                    <span style="font-size: 0.85rem; font-weight: 600; color: ${remaining === 0 ? 'var(--success)' : 'var(--text-main)'}">
                        ${remaining === 0 ? '✅ QUITADO' : `Parcela: ${formatCurrency(d.amount)}`}
                    </span>
                    ${remaining > 0 ? `<button onclick="window.payInstallment('${d.id}')" style="width: auto; padding: 0.3rem 0.8rem; font-size: 0.75rem; background: ${isPaidThisMonth ? 'rgba(16, 185, 129, 0.2)' : 'var(--success)'};" ${isPaidThisMonth ? 'disabled' : ''}>${isPaidThisMonth ? 'Pago' : 'Pagar Parcela'}</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// payInstallment, removeDebt, addFixedSalary, addVA Handled globally

// Chart Visualization
function renderChart() {
    const expensesByCategory = {};
    
    // Group by category (only expenses)
    transactions.filter(t => t.type === 'expense').forEach(t => {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
    });

    const labels = Object.keys(expensesByCategory);
    const data = Object.values(expensesByCategory);

    if (myChart) {
        myChart.destroy();
    }

    if (data.length === 0) {
        return;
    }

    const type = chartTypeSelect.value;

    myChart = new Chart(chartCtx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: 'Gastos por Categoria',
                data: data,
                backgroundColor: [
                    '#6366f1', '#ec4899', '#10b981', '#f59e0b', '#ef4444', 
                    '#8b5cf6', '#06b6d4', '#f472b6', '#fbbf24'
                ],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        font: { family: 'Inter', size: 12 }
                    }
                }
            },
            scales: type === 'bar' ? {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            } : {}
        }
    });
}

// Chart Type Change
chartTypeSelect.addEventListener('change', renderChart);

// Auto-select type based on category
document.getElementById('category').addEventListener('change', (e) => {
    const category = e.target.value;
    const typeSelect = document.getElementById('type');
    if (category === 'Salário' || category === 'Investimentos' || category === 'Vale Alimentação') {
        typeSelect.value = 'income';
    } else {
        typeSelect.value = 'expense';
    }
});

// Start
init();

// Direct Event Listener for Reset Button
document.getElementById('reset-button').addEventListener('click', () => {
    if (confirm('ATENÇÃO: Isso apagará TODOS os seus dados e recomeçará do zero. Deseja continuar?')) {
        localStorage.clear();
        location.reload();
    }
});
