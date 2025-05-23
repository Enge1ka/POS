document.addEventListener('DOMContentLoaded', async () => {
    const productGrid = document.createElement('div');
    productGrid.style.display = 'grid';
    productGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))'; // Adjusted minmax
    productGrid.style.gap = '1.5em'; // Increased gap
    productGrid.style.marginTop = '2em';

    const cart = [];
    const cartItemsDiv = document.createElement('div');
    cartItemsDiv.style.marginTop = '2em';
    cartItemsDiv.style.border = '1px solid #ccc';
    cartItemsDiv.style.padding = '1em';
    cartItemsDiv.style.borderRadius = '5px'; // Added border radius

    const totalDiv = document.createElement('div');
    totalDiv.style.marginTop = '1em';
    totalDiv.style.fontWeight = 'bold';
    totalDiv.style.fontSize = '1.2em'; // Larger total font

    const userMessagesDiv = document.createElement('div'); // For displaying messages
    userMessagesDiv.style.marginTop = '1em';

    let productsCatalog = []; // To store products fetched from API

    // --- Utility to display messages ---
    function displayMessage(message, type = 'success', duration = 5000) {
        userMessagesDiv.innerHTML = ''; // Clear previous messages
        const messageElement = document.createElement('div');
        messageElement.textContent = message;
        messageElement.style.padding = '10px';
        messageElement.style.marginBottom = '10px';
        messageElement.style.borderRadius = '4px';
        if (type === 'error') {
            messageElement.style.backgroundColor = '#f8d7da';
            messageElement.style.color = '#721c24';
            messageElement.style.border = '1px solid #f5c6cb';
        } else {
            messageElement.style.backgroundColor = '#d4edda';
            messageElement.style.color = '#155724';
            messageElement.style.border = '1px solid #c3e6cb';
        }
        userMessagesDiv.insertBefore(messageElement, userMessagesDiv.firstChild);
        setTimeout(() => {
            if (userMessagesDiv.contains(messageElement)) {
                userMessagesDiv.removeChild(messageElement);
            }
        }, duration);
    }

    // --- Fetch Products from API ---
    async function fetchProducts() {
        try {
            const response = await fetch('/api/products');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            productsCatalog = data.products || [];
            renderProducts();
        } catch (error) {
            console.error('Error fetching products:', error);
            displayMessage(`Error fetching products: ${error.message}`, 'error');
            productGrid.innerHTML = '<p style="color: red;">Could not load products. Please try again later.</p>';
        }
    }

    function renderProducts() {
        productGrid.innerHTML = ''; // Clear previous products
        if (productsCatalog.length === 0) {
            productGrid.innerHTML = '<p>No products available at the moment.</p>';
            return;
        }
        productsCatalog.forEach(product => {
            if (product.stock_quantity <= 0) return; // Don't display out-of-stock items for sale

            const productDiv = document.createElement('div');
            productDiv.style.border = '1px solid #eee';
            productDiv.style.padding = '1em';
            productDiv.style.textAlign = 'center';
            productDiv.style.borderRadius = '5px'; // Rounded corners for product cards

            const productName = document.createElement('h3');
            productName.textContent = product.name;
            productName.style.fontSize = '1.1em'; // Slightly larger product name

            const productPrice = document.createElement('p');
            productPrice.textContent = `$${parseFloat(product.price).toFixed(2)}`;
            productPrice.style.color = '#333'; // Darker price color

            const productStock = document.createElement('p');
            productStock.textContent = `Stock: ${product.stock_quantity}`;
            productStock.style.fontSize = '0.9em';
            productStock.style.color = product.stock_quantity < 10 ? 'orange' : '#666';


            const addButton = document.createElement('button');
            addButton.textContent = 'Add to Cart';
            addButton.style.padding = '0.5em 1em'; // Better padding
            addButton.style.backgroundColor = '#007bff'; // Bootstrap primary blue
            addButton.style.color = 'white';
            addButton.style.border = 'none';
            addButton.style.borderRadius = '4px';
            addButton.style.cursor = 'pointer';
            addButton.onmouseover = () => addButton.style.backgroundColor = '#0056b3';
            addButton.onmouseout = () => addButton.style.backgroundColor = '#007bff';

            addButton.onclick = () => addToCart(product);

            productDiv.appendChild(productName);
            productDiv.appendChild(productPrice);
            productDiv.appendChild(productStock);
            productDiv.appendChild(addButton);
            productGrid.appendChild(productDiv);
        });
    }

    function addToCart(product) {
        const existingItem = cart.find(item => item.id === product.id);
        if (existingItem) {
            if (existingItem.quantity < product.stock_quantity) {
                existingItem.quantity++;
            } else {
                displayMessage(`Cannot add more of ${product.name}. Max stock reached in cart.`, 'error', 3000);
                return;
            }
        } else {
            if (product.stock_quantity > 0) {
                cart.push({ ...product, quantity: 1 });
            } else {
                displayMessage(`${product.name} is out of stock.`, 'error', 3000);
                return;
            }
        }
        renderCart();
    }

    function renderCart() {
        cartItemsDiv.innerHTML = '<h2>Cart</h2>';
        if (cart.length === 0) {
            cartItemsDiv.innerHTML += '<p>Cart is empty</p>';
        } else {
            const ul = document.createElement('ul');
            ul.style.listStyleType = 'none';
            ul.style.padding = '0';
            cart.forEach(item => {
                const li = document.createElement('li');
                li.style.display = 'flex';
                li.style.justifyContent = 'space-between';
                li.style.marginBottom = '0.5em';
                li.innerHTML = `
                    <span>${item.name} (x${item.quantity})</span>
                    <span>$${(item.price * item.quantity).toFixed(2)}</span>
                `;
                ul.appendChild(li);
            });
            cartItemsDiv.appendChild(ul);
        }
        calculateTotal();
    }

    function calculateTotal() {
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        totalDiv.textContent = `Total: $${total.toFixed(2)}`;
    }

    // --- Payment and Receipt ---
    const paymentButton = document.createElement('button');
    paymentButton.textContent = 'Process Payment';
    paymentButton.style.marginTop = '1em';
    paymentButton.style.padding = '0.7em 1.5em'; // Larger payment button
    paymentButton.style.backgroundColor = '#28a745'; // Bootstrap success green
    paymentButton.style.color = 'white';
    paymentButton.style.border = 'none';
    paymentButton.style.borderRadius = '4px';
    paymentButton.style.cursor = 'pointer';
    paymentButton.onmouseover = () => paymentButton.style.backgroundColor = '#1e7e34';
    paymentButton.onmouseout = () => paymentButton.style.backgroundColor = '#28a745';

    paymentButton.onclick = async () => {
        if (cart.length === 0) {
            displayMessage('Cart is empty. Please add products before processing payment.', 'error');
            return;
        }

        const saleData = {
            // customer_id: null, // Add customer selection later if needed
            items: cart.map(item => ({
                product_id: item.id,
                quantity: item.quantity,
                price_at_sale: item.price // Using the current price from catalog
            }))
        };

        try {
            paymentButton.disabled = true;
            paymentButton.textContent = 'Processing...';
            const response = await fetch('/api/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(saleData)
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || `HTTP error! status: ${response.status}`);
            }
            
            const totalPaid = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            displayMessage(`Payment of $${totalPaid.toFixed(2)} processed successfully! Sale ID: ${responseData.saleId}, Document No.: ${responseData.document_number}`);
            const cartSnapshot = [...cart]; // Create snapshot before clearing
            generateReceipt(responseData.saleId, totalPaid, responseData.document_number, cartSnapshot); 
            cart.length = 0; // Clear cart
            renderCart(); // Update cart display
            fetchProducts(); // Refresh product list to update stock display

        } catch (error) {
            console.error('Payment processing error:', error);
            displayMessage(`Payment failed: ${error.message}`, 'error');
        } finally {
            paymentButton.disabled = false;
            paymentButton.textContent = 'Process Payment';
        }
    };

    const receiptDiv = document.createElement('div');
    receiptDiv.style.marginTop = '2em';
    receiptDiv.style.border = '1px dashed #666';
    receiptDiv.style.padding = '1em';
    receiptDiv.style.display = 'none'; // Initially hidden
    receiptDiv.style.maxWidth = '400px'; // Max width for receipt
    receiptDiv.style.marginLeft = 'auto';
    receiptDiv.style.marginRight = 'auto';

    const printInvoiceButton = document.createElement('button');
    printInvoiceButton.id = 'printInvoiceButton'; 
    printInvoiceButton.textContent = 'Print Invoice';
    printInvoiceButton.style.padding = '0.7em 1.5em';
    printInvoiceButton.style.backgroundColor = '#6c757d'; 
    printInvoiceButton.style.color = 'white';
    printInvoiceButton.style.border = 'none';
    printInvoiceButton.style.borderRadius = '4px';
    printInvoiceButton.style.cursor = 'pointer';
    printInvoiceButton.style.marginTop = '10px'; 
    printInvoiceButton.style.display = 'none'; // Initially hidden

    printInvoiceButton.onmouseover = () => printInvoiceButton.style.backgroundColor = '#5a6268';
    printInvoiceButton.onmouseout = () => printInvoiceButton.style.backgroundColor = '#6c757d';

    printInvoiceButton.onclick = () => {
        window.print();
    };

    function generateReceipt(saleId, totalPaid, documentNumber, cartSnapshot) {
        receiptDiv.innerHTML = ''; // Clear previous content

        const invoiceTitle = document.createElement('h2');
        invoiceTitle.textContent = 'INVOICE';
        invoiceTitle.style.textAlign = 'center';
        invoiceTitle.style.marginBottom = '20px';
        receiptDiv.appendChild(invoiceTitle);

        // Header Section
        const headerDiv = document.createElement('div');
        headerDiv.style.marginBottom = '20px';
        
        const docNumP = document.createElement('p');
        docNumP.innerHTML = `<strong>Document No.:</strong> ${documentNumber || 'N/A'}`;
        headerDiv.appendChild(docNumP);

        const transIdP = document.createElement('p');
        transIdP.innerHTML = `<strong>Transaction ID:</strong> ${saleId}`;
        headerDiv.appendChild(transIdP);
        
        const customerNameP = document.createElement('p');
        customerNameP.innerHTML = `<strong>Customer:</strong> Retail Customer (Placeholder)`; // Placeholder
        headerDiv.appendChild(customerNameP);

        const dateP = document.createElement('p');
        dateP.innerHTML = `<strong>Date:</strong> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
        headerDiv.appendChild(dateP);
        
        receiptDiv.appendChild(headerDiv);

        // Line Items Section
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginBottom = '20px';

        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        const headers = ['Item', 'Qty', 'Unit Price', 'Total'];
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            th.style.border = '1px solid #ddd';
            th.style.padding = '8px';
            th.style.textAlign = 'left';
            th.style.backgroundColor = '#f2f2f2';
            // Append th to headerRow in the correct order
            headerRow.appendChild(th); 
        });
        // The above loop already appends them, so these lines are redundant if loop is used as intended.
        // If headers are fixed, direct append is fine:
        // headerRow.appendChild(headers[0]); // Item
        // headerRow.appendChild(headers[1]); // Qty
        // headerRow.appendChild(headers[2]); // Unit Price
        // headerRow.appendChild(headers[3]); // Total

        const tbody = table.createTBody();
        if (cartSnapshot && cartSnapshot.length > 0) {
            cartSnapshot.forEach(item => {
                const row = tbody.insertRow();
                row.insertCell().textContent = item.name;
                row.insertCell().textContent = item.quantity;
                row.insertCell().textContent = `$${parseFloat(item.price).toFixed(2)}`;
                row.insertCell().textContent = `$${(item.price * item.quantity).toFixed(2)}`;
                Array.from(row.cells).forEach(cell => {
                    cell.style.border = '1px solid #ddd';
                    cell.style.padding = '8px';
                });
            });
        } else {
            const row = tbody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 4;
            cell.textContent = '(Item details processed or cart was empty)';
            cell.style.textAlign = 'center';
            cell.style.padding = '8px';
            cell.style.border = '1px solid #ddd';
        }
        receiptDiv.appendChild(table);

        // Totals Section
        const totalsDiv = document.createElement('div');
        totalsDiv.style.textAlign = 'right';

        // In a real scenario, subtotal might be different from total if there are taxes/discounts
        const subtotalP = document.createElement('p');
        subtotalP.innerHTML = `<strong>Subtotal:</strong> $${parseFloat(totalPaid).toFixed(2)}`;
        totalsDiv.appendChild(subtotalP);
        
        // Placeholder for Tax (not implemented)
        // const taxP = document.createElement('p');
        // taxP.innerHTML = `<strong>Tax (0%):</strong> $0.00`;
        // totalsDiv.appendChild(taxP);

        const grandTotalP = document.createElement('p');
        grandTotalP.style.fontSize = '1.2em';
        grandTotalP.innerHTML = `<strong>Total Paid:</strong> $${parseFloat(totalPaid).toFixed(2)}`;
        totalsDiv.appendChild(grandTotalP);

        receiptDiv.appendChild(totalsDiv);
        
        receiptDiv.style.display = 'block'; // Make it visible
        printInvoiceButton.style.display = 'block'; // Show print button too

        // Auto-hide logic (can be kept or removed based on preference for new "Print" button)
        // If re-enabling, ensure printInvoiceButton.style.display = 'none'; is also added.
        // setTimeout(() => {
        //     receiptDiv.style.display = 'none';
        //     printInvoiceButton.style.display = 'none'; // Hide print button
        // }, 15000); // Hide after 15 seconds
    }

    // Append elements to main
    const mainElement = document.querySelector('main');
    if (mainElement) {
        mainElement.appendChild(userMessagesDiv); // Add message div first
        mainElement.appendChild(productGrid);
        mainElement.appendChild(cartItemsDiv);
        mainElement.appendChild(totalDiv);
        mainElement.appendChild(paymentButton);
        mainElement.appendChild(receiptDiv);
        mainElement.appendChild(printInvoiceButton); // Append print button
        
        fetchProducts(); // Initial product load
        renderCart();    // Initial cart render
    } else {
        console.error('Main element not found for sales page!');
    }
});
