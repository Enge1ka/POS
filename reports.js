document.addEventListener('DOMContentLoaded', () => {
    const salesReportTableBody = document.getElementById('salesReportTableBody');
    const inventoryReportTableBody = document.getElementById('inventoryReportTableBody');
    const journalEntriesReportTableBody = document.getElementById('journalEntriesReportTableBody');
    
    const loadSalesReportButton = document.getElementById('loadSalesReportButton');
    const loadInventoryReportButton = document.getElementById('loadInventoryReportButton');
    const loadJournalEntriesReportButton = document.getElementById('loadJournalEntriesReportButton');
    
    const userMessagesDiv = document.getElementById('userMessages');

    function displayMessage(message, type = 'error', duration = 5000) {
        userMessagesDiv.innerHTML = ''; // Clear previous
        const msgEl = document.createElement('div');
        msgEl.className = `message ${type}`;
        msgEl.textContent = message;
        userMessagesDiv.appendChild(msgEl);
        setTimeout(() => {
            if (userMessagesDiv.contains(msgEl)) userMessagesDiv.removeChild(msgEl);
        }, duration);
    }

    async function fetchAndRenderSalesReport() {
        try {
            loadSalesReportButton.textContent = 'Loading...';
            loadSalesReportButton.disabled = true;
            const response = await fetch('/api/reports/sales');
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || `HTTP Error: ${response.status}`);
            }
            const data = await response.json();
            salesReportTableBody.innerHTML = ''; // Clear
            if (!data.sales_report || data.sales_report.length === 0) {
                salesReportTableBody.innerHTML = '<tr><td colspan="5">No sales data found.</td></tr>'; // Updated colspan
                return;
            }
            data.sales_report.forEach(sale => {
                const row = salesReportTableBody.insertRow();
                row.insertCell().textContent = sale.sale_id;
                row.insertCell().textContent = sale.document_number || 'N/A'; // Added document_number
                row.insertCell().textContent = new Date(sale.timestamp).toLocaleString();
                row.insertCell().textContent = `$${parseFloat(sale.total_amount).toFixed(2)}`;
                row.insertCell().textContent = sale.items_sold.replace(/; /g, '\n'); // Display items on new lines
            });
        } catch (error) {
            console.error('Error fetching sales report:', error);
            displayMessage(`Failed to load sales report: ${error.message}`, 'error');
            salesReportTableBody.innerHTML = '<tr><td colspan="5">Error loading report.</td></tr>'; // Updated colspan
        } finally {
            loadSalesReportButton.textContent = 'Load Sales Report';
            loadSalesReportButton.disabled = false;
        }
    }

    async function fetchAndRenderInventoryReport() {
        try {
            loadInventoryReportButton.textContent = 'Loading...';
            loadInventoryReportButton.disabled = true;
            // Reusing the /api/products endpoint for inventory list
            const response = await fetch('/api/products'); 
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || `HTTP Error: ${response.status}`);
            }
            const data = await response.json();
            inventoryReportTableBody.innerHTML = ''; // Clear
            if (!data.products || data.products.length === 0) {
                inventoryReportTableBody.innerHTML = '<tr><td colspan="4">No products found in inventory.</td></tr>';
                return;
            }
            data.products.forEach(product => {
                const row = inventoryReportTableBody.insertRow();
                row.insertCell().textContent = product.id;
                row.insertCell().textContent = product.name;
                row.insertCell().textContent = product.stock_quantity;
                row.insertCell().textContent = `$${parseFloat(product.price).toFixed(2)}`;
            });
        } catch (error) {
            console.error('Error fetching inventory report:', error);
            displayMessage(`Failed to load inventory report: ${error.message}`, 'error');
            inventoryReportTableBody.innerHTML = '<tr><td colspan="4">Error loading report.</td></tr>';
        } finally {
            loadInventoryReportButton.textContent = 'Load Inventory Report';
            loadInventoryReportButton.disabled = false;
        }
    }

    async function fetchAndRenderJournalEntriesReport() {
        try {
            loadJournalEntriesReportButton.textContent = 'Loading...';
            loadJournalEntriesReportButton.disabled = true;
            const response = await fetch('/api/reports/journal');
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || `HTTP Error: ${response.status}`);
            }
            const data = await response.json();
            journalEntriesReportTableBody.innerHTML = ''; // Clear
            if (!data.journal_entries || data.journal_entries.length === 0) {
                journalEntriesReportTableBody.innerHTML = '<tr><td colspan="7">No journal entries found.</td></tr>';
                return;
            }
            data.journal_entries.forEach(entry => {
                const row = journalEntriesReportTableBody.insertRow();
                row.insertCell().textContent = entry.entry_id;
                row.insertCell().textContent = entry.sale_id || 'N/A';
                row.insertCell().textContent = new Date(entry.timestamp).toLocaleString();
                row.insertCell().textContent = entry.account_name;
                row.insertCell().textContent = entry.entry_type;
                row.insertCell().textContent = `$${entry.amount}`; // Amount is already formatted
                row.insertCell().textContent = entry.description || '';
            });
        } catch (error) {
            console.error('Error fetching journal entries:', error);
            displayMessage(`Failed to load journal entries: ${error.message}`, 'error');
            journalEntriesReportTableBody.innerHTML = '<tr><td colspan="7">Error loading report.</td></tr>';
        } finally {
            loadJournalEntriesReportButton.textContent = 'Load Journal Entries';
            loadJournalEntriesReportButton.disabled = false;
        }
    }

    if(loadSalesReportButton) loadSalesReportButton.addEventListener('click', fetchAndRenderSalesReport);
    if(loadInventoryReportButton) loadInventoryReportButton.addEventListener('click', fetchAndRenderInventoryReport);
    if(loadJournalEntriesReportButton) loadJournalEntriesReportButton.addEventListener('click', fetchAndRenderJournalEntriesReport);

    // Optionally, load one or all reports on page load
    // fetchAndRenderSalesReport();
    // fetchAndRenderInventoryReport();
    // fetchAndRenderJournalEntriesReport();
});
