let transactions = [];
let editingTransactionId = null;
let selectedMonth = new Date().getMonth();
let selectedYear = new Date().getFullYear();

let expenseChart = null;
let incomeExpenseChart = null;
let trendChart = null;

const currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
});

function formatCurrency(amount) {
    return currencyFormatter.format(Number(amount) || 0);
}

function formatDate(dateString) {
    if (!dateString) return "-";

    const date = new Date(dateString + "T00:00:00");

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function getCurrentDate() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getMonthName(month, year) {
    return new Date(year, month).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric"
    });
}

function getCurrentMonthTransactions() {
    const month = new Date().getMonth();
    const year = new Date().getFullYear();

    return transactions.filter(transaction => {
        const date = new Date(transaction.date + "T00:00:00");

        return date.getMonth() === month &&
            date.getFullYear() === year;
    });
}

function calculateTotals(transactionList) {
    let income = 0;
    let expenses = 0;

    transactionList.forEach(transaction => {
        const amount = Number(transaction.amount) || 0;

        if (transaction.type === "income") {
            income += amount;
        } else {
            expenses += amount;
        }
    });

    return {
        income,
        expenses,
        savings: income - expenses
    };
}

// ================================
// AUTHENTICATION
// ================================

async function checkAuthentication() {
    if (!window.supabaseClient) {
        alert("Supabase is not configured. Please check supabase-config.js.");
        return false;
    }

    const { data, error } = await window.supabaseClient.auth.getSession();

    if (error || !data.session) {
        window.location.href = "auth.html";
        return false;
    }

    return true;
}

// ================================
// LOAD TRANSACTIONS
// ================================

async function loadTransactions() {
    const { data: userData } = await window.supabaseClient.auth.getUser();

    if (!userData.user) {
        window.location.href = "auth.html";
        return;
    }

    const userId = userData.user.id;

    const { data, error } = await window.supabaseClient
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false });

    if (error) {
        console.error("Error loading transactions:", error.message);
        alert("Unable to load transactions. Please try again.");
        return;
    }

    transactions = (data || []).map(transaction => ({
        id: transaction.id,
        description: transaction.description,
        amount: Number(transaction.amount),
        type: transaction.type,
        category: transaction.category,
        date: transaction.date
    }));

    // Optional one-time import from localStorage
    await importLocalTransactionsIfNeeded(userId);

    renderAllPages();
}

// ================================
// OPTIONAL LOCAL STORAGE IMPORT
// ================================

async function importLocalTransactionsIfNeeded(userId) {
    const importKey = `moneyMapImported_${userId}`;

    if (localStorage.getItem(importKey)) {
        return;
    }

    if (transactions.length > 0) {
        localStorage.setItem(importKey, "true");
        return;
    }

    const localData = localStorage.getItem("moneyMapTransactions");

    if (!localData) {
        localStorage.setItem(importKey, "true");
        return;
    }

    let localTransactions = [];

    try {
        localTransactions = JSON.parse(localData);
    } catch (error) {
        console.error("Unable to read local transactions:", error);
        return;
    }

    if (!Array.isArray(localTransactions) || localTransactions.length === 0) {
        localStorage.setItem(importKey, "true");
        return;
    }

    const shouldImport = confirm(
        `We found ${localTransactions.length} transaction(s) saved in this browser.\n\nWould you like to import them into your MoneyMap account?`
    );

    if (!shouldImport) {
        localStorage.setItem(importKey, "true");
        return;
    }

    const formattedTransactions = localTransactions.map(transaction => ({
        user_id: userId,
        description: transaction.description,
        amount: Number(transaction.amount),
        type: transaction.type,
        category: transaction.category,
        date: transaction.date
    }));

    const { data, error } = await window.supabaseClient
        .from("transactions")
        .insert(formattedTransactions)
        .select();

    if (error) {
        console.error("Import failed:", error.message);
        alert("Import failed. Your original browser data is still safe.");
        return;
    }

    transactions = (data || []).map(transaction => ({
        id: transaction.id,
        description: transaction.description,
        amount: Number(transaction.amount),
        type: transaction.type,
        category: transaction.category,
        date: transaction.date
    }));

    localStorage.setItem(importKey, "true");

    alert("Your transactions have been imported successfully!");
}

// ================================
// SAVE TRANSACTION
// ================================

async function saveTransaction(transactionData) {
    const { data: userData } = await window.supabaseClient.auth.getUser();

    if (!userData.user) {
        alert("Please log in again.");
        window.location.href = "auth.html";
        return false;
    }

    const userId = userData.user.id;

if (editingTransactionId !== null) {
    const { data, error } = await window.supabaseClient
        .from("transactions")
        .update({
            description: transactionData.description,
            amount: Number(transactionData.amount),
            type: transactionData.type,
            category: transactionData.category,
            date: transactionData.date
        })
            .eq("id", editingTransactionId)
            .eq("user_id", userId)
            .select();

        if (error) {
            console.error("Error updating transaction:", error.message);
            alert("Unable to update transaction. Please try again.");
            return false;
        }

        const updatedTransaction = data[0];

        transactions = transactions.map(transaction =>
            String(transaction.id) === String(editingTransactionId)
                ? {
                    ...transaction,
                    description: updatedTransaction.description,
                    amount: Number(updatedTransaction.amount),
                    type: updatedTransaction.type,
                    category: updatedTransaction.category,
                    date: updatedTransaction.date
                }
                : transaction
        );

        editingTransactionId = null;

        return true;
    }

    const { data, error } = await window.supabaseClient
        .from("transactions")
        .insert({
            user_id: userId,
            description: transactionData.description,
            amount: Number(transactionData.amount),
            type: transactionData.type,
            category: transactionData.category,
            date: transactionData.date
        })
        .select();

    if (error) {
        console.error("Error saving transaction:", error.message);
        alert("Unable to save transaction. Please try again.");
        return false;
    }

    const newTransaction = data[0];

    transactions.unshift({
        id: newTransaction.id,
        description: newTransaction.description,
        amount: Number(newTransaction.amount),
        type: newTransaction.type,
        category: newTransaction.category,
        date: newTransaction.date
    });

    return true;
}

// ================================
// DELETE TRANSACTION
// ================================

async function deleteTransaction(transactionId) {
    const confirmed = confirm(
        "Are you sure you want to delete this transaction?"
    );

    if (!confirmed) {
        return;
    }

    const { data: userData } = await window.supabaseClient.auth.getUser();

    if (!userData.user) {
        alert("Your session has expired. Please log in again.");
        window.location.href = "auth.html";
        return;
    }

    const { error } = await window.supabaseClient
        .from("transactions")
        .delete()
        .eq("id", transactionId)
        .eq("user_id", userData.user.id);

    if (error) {
        console.error("Error deleting transaction:", error.message);
        alert("Unable to delete transaction. Please try again.");
        return;
    }

    transactions = transactions.filter(transaction =>
        String(transaction.id) !== String(transactionId)
    );

    renderAllPages();

    alert("Transaction deleted successfully!");
}

// ================================
// RENDER ALL PAGES
// ================================

function renderAllPages() {
    renderOverview();
    renderMonthlyExpenses();
    renderAllTransactions();
    renderHistory();
    renderAnalysis();
}

// ================================
// OVERVIEW PAGE
// ================================

function renderOverview() {
    const totals = calculateTotals(transactions);
    const currentMonthTransactions = getCurrentMonthTransactions();
    const monthlyTotals = calculateTotals(currentMonthTransactions);

    const totalBalanceElement = document.getElementById("total-balance");
    const totalIncomeElement = document.getElementById("total-income");
    const totalExpensesElement = document.getElementById("total-expenses");
    const monthlyIncomeElement = document.getElementById("monthly-income");
    const monthlyExpensesElement = document.getElementById("monthly-expenses");

    if (totalBalanceElement) {
        totalBalanceElement.textContent = formatCurrency(totals.savings);
    }

    if (totalIncomeElement) {
        totalIncomeElement.textContent = formatCurrency(totals.income);
    }

    if (totalExpensesElement) {
        totalExpensesElement.textContent = formatCurrency(totals.expenses);
    }

    if (monthlyIncomeElement) {
        monthlyIncomeElement.textContent = formatCurrency(monthlyTotals.income);
    }

    if (monthlyExpensesElement) {
        monthlyExpensesElement.textContent = formatCurrency(monthlyTotals.expenses);
    }

    renderRecentTransactions();
    renderExpenseChart();
    renderIncomeExpenseChart();
}

// ================================
// RECENT TRANSACTIONS
// ================================



function renderRecentTransactions() {
    const container = document.getElementById("recent-transactions-body");
    if (!container) return;

    const recentTransactions = [...transactions]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    if (recentTransactions.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;padding:20px;">
                    No transactions yet. Add your first transaction!
                </td>
            </tr>
        `;
        return;
    }

    container.innerHTML = recentTransactions.map(transaction => `
        <tr class="clickable-transaction"
            data-id="${transaction.id}"
            style="cursor:pointer;">

            <td>${escapeHTML(transaction.description)}</td>
            <td>${escapeHTML(transaction.category)}</td>
            <td>${formatDate(transaction.date)}</td>

            <td>
                <span class="transaction-type ${transaction.type}">
                    ${transaction.type === "income" ? "Income" : "Expense"}
                </span>
            </td>

            <td class="${transaction.type}">
                ${transaction.type === "income" ? "+" : "-"}${formatCurrency(transaction.amount)}
            </td>
        </tr>
    `).join("");

    container.querySelectorAll(".clickable-transaction").forEach(row => {
        row.addEventListener("click", function() {
            openEditTransactionModal(this.dataset.id);
        });
    });
}



// ================================
// HTML ESCAPE HELPER
// ================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}
// ================================
// MONTHLY EXPENSES PAGE
// ================================


function renderMonthlyExpenses() {
    const container = document.getElementById("monthly-transactions-body");
    if (!container) return;

    const monthTransactions = transactions.filter(transaction => {
        const date = new Date(transaction.date + "T00:00:00");

        return date.getMonth() === selectedMonth &&
               date.getFullYear() === selectedYear;
    });

    const totals = calculateTotals(monthTransactions);

    document.getElementById("monthly-income").textContent =
        formatCurrency(totals.income);

    document.getElementById("monthly-expenses").textContent =
        formatCurrency(totals.expenses);

    document.getElementById("monthly-savings").textContent =
        formatCurrency(totals.savings);

    const monthLabel = document.getElementById("selected-month");
    if (monthLabel) {
        monthLabel.textContent = getMonthName(selectedMonth, selectedYear);
    }

    if (monthTransactions.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;padding:20px;">
                    No transactions found for this month.
                </td>
            </tr>
        `;
        return;
    }

    container.innerHTML = monthTransactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(transaction => `
            <tr class="clickable-transaction"
                data-id="${transaction.id}"
                style="cursor:pointer;">

                <td>${escapeHTML(transaction.description)}</td>
                <td>${escapeHTML(transaction.category)}</td>
                <td>${formatDate(transaction.date)}</td>

                <td>
                    <span class="transaction-type ${transaction.type}">
                        ${transaction.type === "income" ? "Income" : "Expense"}
                    </span>
                </td>

                <td class="${transaction.type}">
                    ${transaction.type === "income" ? "+" : "-"}${formatCurrency(transaction.amount)}
                </td>
            </tr>
        `).join("");

    container.querySelectorAll(".clickable-transaction").forEach(row => {
        row.addEventListener("click", function() {
            openEditTransactionModal(this.dataset.id);
        });
    });
}


// ================================
// ALL TRANSACTIONS PAGE
// ================================


function renderAllTransactions() {
    const container = document.getElementById("all-transactions-body");
    if (!container) return;

    const typeFilter = document.getElementById("filter-type");
    const monthFilter = document.getElementById("filter-month");
    const fromDateFilter = document.getElementById("filter-from-date");
    const toDateFilter = document.getElementById("filter-to-date");

    const selectedType = typeFilter ? typeFilter.value : "all";
    const selectedMonth = monthFilter ? monthFilter.value : "all";
    const fromDate = fromDateFilter ? fromDateFilter.value : "";
    const toDate = toDateFilter ? toDateFilter.value : "";

    let filtered = [...transactions];

    if (selectedType !== "all") {
        filtered = filtered.filter(t => t.type === selectedType);
    }

    if (selectedMonth !== "all") {
        filtered = filtered.filter(t =>
            t.date.startsWith(selectedMonth)
        );
    }

    if (fromDate) {
        filtered = filtered.filter(t => t.date >= fromDate);
    }

    if (toDate) {
        filtered = filtered.filter(t => t.date <= toDate);
    }

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    const emptyMessage = document.getElementById("transactions-empty-message");

    if (filtered.length === 0) {
        container.innerHTML = "";
        if (emptyMessage) emptyMessage.style.display = "block";
        return;
    }

    if (emptyMessage) emptyMessage.style.display = "none";

    container.innerHTML = filtered.map(transaction => `
        <tr>
            <td>${escapeHTML(transaction.description)}</td>
            <td>${escapeHTML(transaction.category)}</td>
            <td>${formatDate(transaction.date)}</td>
            <td>
                <span class="transaction-type ${transaction.type}">
                    ${transaction.type === "income" ? "Income" : "Expense"}
                </span>
            </td>
            <td class="${transaction.type}">
                ${transaction.type === "income" ? "+" : "-"}${formatCurrency(transaction.amount)}
            </td>
            <td>
                <button class="edit-btn" data-id="${transaction.id}"
                    type="button" title="Edit">✏️</button>

                <button class="delete-btn" data-id="${transaction.id}"
                    type="button" title="Delete">🗑️</button>
            </td>
        </tr>
    `).join("");

    container.querySelectorAll(".edit-btn").forEach(button => {
        button.addEventListener("click", function() {
            openEditTransactionModal(this.dataset.id);
        });
    });

    container.querySelectorAll(".delete-btn").forEach(button => {
        button.addEventListener("click", function() {
            deleteTransaction(this.dataset.id);
        });
    });
}


// ================================
// CATEGORY FILTER OPTIONS
// ================================

function populateCategoryFilter() {
    const categoryFilter = document.getElementById("transaction-category-filter");

    if (!categoryFilter) return;

    const categories = [...new Set(
        transactions.map(transaction => transaction.category)
    )].sort();

    const currentValue = categoryFilter.value;

    categoryFilter.innerHTML = `
        <option value="all">All Categories</option>
        ${categories.map(category => `
            <option value="${escapeHTML(category)}">${escapeHTML(category)}</option>
        `).join("")}
    `;

    if (categories.includes(currentValue)) {
        categoryFilter.value = currentValue;
    }
}

// ================================
// SEARCH AND FILTER LISTENERS
// ================================

function setupTransactionFilters() {
    const searchInput = document.getElementById("transaction-search");
    const typeFilter = document.getElementById("transaction-type-filter");
    const categoryFilter = document.getElementById("transaction-category-filter");

    if (searchInput) {
        searchInput.addEventListener("input", renderAllTransactions);
    }

    if (typeFilter) {
        typeFilter.addEventListener("change", renderAllTransactions);
    }

    if (categoryFilter) {
        categoryFilter.addEventListener("change", renderAllTransactions);
    }
}
// ================================
// FINANCIAL ANALYSIS PAGE
// ================================

function renderAnalysis() {
    renderAnalysisSummary();
    renderTrendChart();
}

// ================================
// ANALYSIS SUMMARY
// ================================

function renderAnalysisSummary() {
    const container = document.getElementById("analysis-summary");

    if (!container) return;

    const totals = calculateTotals(transactions);

    const savingsRate = totals.income > 0
        ? (totals.savings / totals.income) * 100
        : 0;

    container.innerHTML = `
        <div class="analysis-card">
            <h3>Total Income</h3>
            <p class="income">${formatCurrency(totals.income)}</p>
        </div>

        <div class="analysis-card">
            <h3>Total Expenses</h3>
            <p class="expense">${formatCurrency(totals.expenses)}</p>
        </div>

        <div class="analysis-card">
            <h3>Net Savings</h3>
            <p>${formatCurrency(totals.savings)}</p>
        </div>

        <div class="analysis-card">
            <h3>Savings Rate</h3>
            <p>${savingsRate.toFixed(1)}%</p>
        </div>
    `;
}

// ================================
// EXPENSE DOUGHNUT CHART
// ================================

function renderExpenseChart() {
    const canvas = document.getElementById("expense-chart");

    if (!canvas || typeof Chart === "undefined") return;

    const expenses = transactions.filter(transaction =>
        transaction.type === "expense"
    );

    const categoryTotals = {};

    expenses.forEach(transaction => {
        const category = transaction.category || "Other";

        categoryTotals[category] =
            (categoryTotals[category] || 0) + Number(transaction.amount);
    });

    const labels = Object.keys(categoryTotals);
    const values = Object.values(categoryTotals);

    if (expenseChart) {
        expenseChart.destroy();
    }

    expenseChart = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    "#10b981",
                    "#34d399",
                    "#059669",
                    "#6ee7b7",
                    "#047857",
                    "#a7f3d0",
                    "#2dd4bf",
                    "#14b8a6"
                ],
                borderWidth: 2,
                borderColor: "#ffffff"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "bottom"
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            }
        }
    });
}

// ================================
// INCOME VS EXPENSES BAR CHART
// ================================

function renderIncomeExpenseChart() {
    const canvas = document.getElementById("income-expense-chart");

    if (!canvas || typeof Chart === "undefined") return;

    const monthlyTransactions = getCurrentMonthTransactions();
    const totals = calculateTotals(monthlyTransactions);

    if (incomeExpenseChart) {
        incomeExpenseChart.destroy();
    }

    incomeExpenseChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels: ["Income", "Expenses"],
            datasets: [{
                label: "Amount",
                data: [totals.income, totals.expenses],
                backgroundColor: ["#10b981", "#f87171"],
                borderRadius: 8,
                barThickness: 45
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
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return "₹" + value.toLocaleString("en-IN");
                        }
                    }
                }
            }
        }
    });
}

// ================================
// MONTHLY TREND CHART
// ================================

function renderTrendChart() {
    const canvas = document.getElementById("trend-chart");

    if (!canvas || typeof Chart === "undefined") return;

    const monthlyData = {};

    transactions.forEach(transaction => {
        const date = new Date(transaction.date + "T00:00:00");

        const key = `${date.getFullYear()}-${String(
            date.getMonth() + 1
        ).padStart(2, "0")}`;

        if (!monthlyData[key]) {
            monthlyData[key] = {
                income: 0,
                expenses: 0
            };
        }

        if (transaction.type === "income") {
            monthlyData[key].income += Number(transaction.amount);
        } else {
            monthlyData[key].expenses += Number(transaction.amount);
        }
    });

    const sortedMonths = Object.keys(monthlyData).sort();

    const labels = sortedMonths.map(key => {
        const [year, month] = key.split("-");

        return new Date(Number(year), Number(month) - 1)
            .toLocaleDateString("en-IN", {
                month: "short",
                year: "numeric"
            });
    });

    const incomeData = sortedMonths.map(key => monthlyData[key].income);
    const expenseData = sortedMonths.map(key => monthlyData[key].expenses);

    if (trendChart) {
        trendChart.destroy();
    }

    trendChart = new Chart(canvas, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Income",
                    data: incomeData,
                    borderColor: "#10b981",
                    backgroundColor: "rgba(16, 185, 129, 0.12)",
                    fill: true,
                    tension: 0.35
                },
                {
                    label: "Expenses",
                    data: expenseData,
                    borderColor: "#f87171",
                    backgroundColor: "rgba(248, 113, 113, 0.10)",
                    fill: true,
                    tension: 0.35
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: "index"
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return "₹" + value.toLocaleString("en-IN");
                        }
                    }
                }
            }
        }
    });
}
// ================================
// TRANSACTION MODAL
// ================================

function openTransactionModal() {
    editingTransactionId = null;

    const modal = document.getElementById("transaction-modal");
    const form = document.getElementById("transaction-form");
    const modalTitle = document.getElementById("modal-title");

    if (!modal || !form) return;

    form.reset();

    document.getElementById("transaction-date").value = getCurrentDate();

    if (modalTitle) {
        modalTitle.textContent = "Add Transaction";
    }

    modal.classList.add("active");
}

// ================================
// CLOSE TRANSACTION MODAL
// ================================

function closeTransactionModal() {
    const modal = document.getElementById("transaction-modal");

    if (modal) {
        modal.classList.remove("active");
    }

    editingTransactionId = null;
}

// ================================
// EDIT TRANSACTION
// ================================

function openEditTransactionModal(transactionId) {
    const transaction = transactions.find(item =>
        String(item.id) === String(transactionId)
    );

    if (!transaction) {
        alert("Transaction not found.");
        return;
    }

    editingTransactionId = transaction.id;

    const modal = document.getElementById("transaction-modal");
    const modalTitle = document.getElementById("modal-title");

    document.getElementById("transaction-description").value =
        transaction.description;

    document.getElementById("transaction-amount").value =
        transaction.amount;

    document.getElementById("transaction-type").value =
        transaction.type;

    document.getElementById("transaction-category").value =
        transaction.category;

    document.getElementById("transaction-date").value =
        transaction.date;

    if (modalTitle) {
        modalTitle.textContent = "Edit Transaction";
    }

    if (modal) {
        modal.classList.add("active");
    }
}

// ================================
// TRANSACTION FORM SUBMISSION
// ================================

async function handleTransactionFormSubmit(event) {
    event.preventDefault();

    const description = document.getElementById(
        "transaction-description"
    ).value.trim();

    const amount = Number(document.getElementById(
        "transaction-amount"
    ).value);

    const type = document.getElementById(
        "transaction-type"
    ).value;

    const category = document.getElementById(
        "transaction-category"
    ).value;

    const date = document.getElementById(
        "transaction-date"
    ).value;

    if (!description) {
        alert("Please enter a transaction description.");
        return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        alert("Please enter a valid amount greater than zero.");
        return;
    }

    if (!type || !category || !date) {
        alert("Please fill in all transaction details.");
        return;
    }

    const submitButton = document.querySelector(
        '#transaction-form button[type="submit"]'
    );

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Saving...";
    }

    const success = await saveTransaction({
        description,
        amount,
        type,
        category,
        date
    });

    if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = editingTransactionId !== null
            ? "Update Transaction"
            : "Save Transaction";
    }

    if (!success) return;

const wasEditing = editingTransactionId !== null;

closeTransactionModal();
renderAllPages();
populateCategoryFilter();

alert(
    wasEditing
        ? "Transaction updated successfully!"
        : "Transaction added successfully!"
);
}

// ================================
// NAVIGATION
// ================================

function showPage(pageName) {
    const pages = document.querySelectorAll(".page");
    const navigationItems = document.querySelectorAll(".nav-item");

    pages.forEach(page => {
        page.classList.remove("active");
    });

    navigationItems.forEach(item => {
        item.classList.remove("active");
    });

    const selectedPage = document.getElementById(`${pageName}-page`);

    if (selectedPage) {
        selectedPage.classList.add("active");
    }

    const selectedNavigation = document.querySelector(
        `.nav-item[data-page="${pageName}"]`
    );

    if (selectedNavigation) {
        selectedNavigation.classList.add("active");
    }

    if (pageName === "monthly-expenses") {
        renderMonthlyExpenses();
    }

    if (pageName === "transactions") {
        renderAllTransactions();
    }

    if (pageName === "analysis") {
        renderAnalysis();
    }

    if (pageName === "history") {
        renderHistory();
    }
}

// ================================
// CSV EXPORT
// ================================

function exportTransactionsToCSV() {
    if (transactions.length === 0) {
        alert("There are no transactions to export.");
        return;
    }

    const headers = [
        "Description",
        "Amount",
        "Type",
        "Category",
        "Date"
    ];

    const rows = transactions.map(transaction => [
        transaction.description,
        transaction.amount,
        transaction.type,
        transaction.category,
        transaction.date
    ]);

    const csvContent = [
        headers,
        ...rows
    ].map(row =>
        row.map(value =>
            `"${String(value).replace(/"/g, '""')}"`
        ).join(",")
    ).join("\n");

    const blob = new Blob(
        ["﻿" + csvContent],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "MoneyMap_Transactions.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}
// ================================
// HISTORY PAGE
// ================================


function renderHistory() {
    const container = document.getElementById("history-transactions-body");
    if (!container) return;

    const monthlyData = {};

    transactions.forEach(transaction => {
        const date = new Date(transaction.date + "T00:00:00");

        const key = `${date.getFullYear()}-${String(
            date.getMonth() + 1
        ).padStart(2, "0")}`;

        if (!monthlyData[key]) {
            monthlyData[key] = {
                income: 0,
                expenses: 0
            };
        }

        if (transaction.type === "income") {
            monthlyData[key].income += Number(transaction.amount);
        } else {
            monthlyData[key].expenses += Number(transaction.amount);
        }
    });

    const sortedMonths = Object.keys(monthlyData).sort().reverse();

    if (sortedMonths.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center;padding:20px;">
                    No transaction history available.
                </td>
            </tr>
        `;
        return;
    }

    container.innerHTML = sortedMonths.map(key => {
        const data = monthlyData[key];
        const savings = data.income - data.expenses;
        const [year, month] = key.split("-");

        const monthName = new Date(Number(year), Number(month) - 1)
            .toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric"
            });

        return `
            <tr>
                <td>${monthName}</td>
                <td class="income">${formatCurrency(data.income)}</td>
                <td class="expense">${formatCurrency(data.expenses)}</td>
                <td>${formatCurrency(savings)}</td>
            </tr>
        `;
    }).join("");
}


// ================================
// LOGOUT
// ================================

async function logoutUser() {
    const confirmed = confirm("Are you sure you want to logout?");

    if (!confirmed) return;

    const { error } = await window.supabaseClient.auth.signOut();

    if (error) {
        console.error("Logout error:", error.message);
        alert("Unable to logout. Please try again.");
        return;
    }

    window.location.href = "auth.html";
}

// ================================
// INITIALIZE DASHBOARD
// ================================

document.addEventListener("DOMContentLoaded", async function() {

    // First verify the user is logged in
    const authenticated = await checkAuthentication();

    if (!authenticated) return;

    // Load transactions from Supabase
    await loadTransactions();

    // Add Transaction button
    const addTransactionButton = document.getElementById(
        "add-transaction-btn"
    );

    if (addTransactionButton) {
        addTransactionButton.addEventListener("click", openTransactionModal);
    }

    // Transaction form
    const transactionForm = document.getElementById("transaction-form");

    if (transactionForm) {
        transactionForm.addEventListener(
            "submit",
            handleTransactionFormSubmit
        );
    }

    // Close modal button
    const closeModalButton = document.getElementById("close-modal");

    if (closeModalButton) {
        closeModalButton.addEventListener(
            "click",
            closeTransactionModal
        );
    }

    // Cancel transaction button
    const cancelTransactionButton = document.getElementById(
        "cancel-transaction"
    );

    if (cancelTransactionButton) {
        cancelTransactionButton.addEventListener(
            "click",
            closeTransactionModal
        );
    }

    // Close modal when clicking outside
    const transactionModal = document.getElementById("transaction-modal");

    if (transactionModal) {
        transactionModal.addEventListener("click", function(event) {
            if (event.target === transactionModal) {
                closeTransactionModal();
            }
        });
    }

    // Sidebar navigation
    document.querySelectorAll(".nav-item[data-page]").forEach(item => {
        item.addEventListener("click", function() {
            const pageName = this.dataset.page;
            showPage(pageName);
        });
    });

    // Settings button
    const settingsButton = document.getElementById("settings-page-btn");

    if (settingsButton) {
        settingsButton.addEventListener("click", function() {
            window.location.href = "settings.html";
        });
    }

    // Logout button
    const logoutButton = document.getElementById("logout-btn");

    if (logoutButton) {
        logoutButton.addEventListener("click", logoutUser);
    }

    // CSV export button
    const exportButton = document.getElementById("export-transactions");

    if (exportButton) {
        exportButton.addEventListener("click", exportTransactionsToCSV);
    }

    // Transaction filters
    setupTransactionFilters();

    // Populate category filter
    populateCategoryFilter();

    // Initial rendering
    renderAllPages();



    
    // Monthly Expenses navigation
    document.getElementById("previous-month")
        ?.addEventListener("click", function() {
            selectedMonth--;

            if (selectedMonth < 0) {
                selectedMonth = 11;
                selectedYear--;
            }

            renderMonthlyExpenses();
        });

    document.getElementById("next-month")
        ?.addEventListener("click", function() {
            selectedMonth++;

            if (selectedMonth > 11) {
                selectedMonth = 0;
                selectedYear++;
            }

            renderMonthlyExpenses();
        });

    // All Transactions filters
    document.getElementById("filter-type")
        ?.addEventListener("change", renderAllTransactions);

    document.getElementById("filter-month")
        ?.addEventListener("change", renderAllTransactions);

    document.getElementById("filter-from-date")
        ?.addEventListener("change", renderAllTransactions);

    document.getElementById("filter-to-date")
        ?.addEventListener("change", renderAllTransactions);

    // Clear All Filters
    document.getElementById("clear-filters-btn")
        ?.addEventListener("click", function() {
            document.getElementById("filter-type").value = "all";
            document.getElementById("filter-month").value = "all";
            document.getElementById("filter-from-date").value = "";
            document.getElementById("filter-to-date").value = "";

            renderAllTransactions();
        });

    // View All Transactions
    document.getElementById("view-all-transactions")
        ?.addEventListener("click", function() {
            showPage("transactions");
        });

    // CSV Export
    document.getElementById("export-csv-btn")
        ?.addEventListener("click", exportTransactionsToCSV);



});