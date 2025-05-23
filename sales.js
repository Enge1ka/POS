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
            generateReceipt(responseData.saleId, totalPaid, responseData.document_number); 
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


    function generateReceipt(saleId, totalPaid, documentNumber) {
        receiptDiv.innerHTML = '<h2>Receipt</h2>';
        if (documentNumber) {
            receiptDiv.innerHTML += `<p>Document No.: ${documentNumber}</p>`;
        }
        receiptDiv.innerHTML += `<p>Transaction ID: ${saleId}</p>`; 
        receiptDiv.innerHTML += '<p>Items:</p>';
        const ul = document.createElement('ul');
        // Need to use the cart content *before* it was cleared for the receipt
        // For simplicity, we'll reconstruct from the totalPaid and saleId, or pass cart items
        // Let's assume cart items were passed or use a snapshot
        // For now, this part will be simplified as cart is already cleared.
        // A better approach would be to pass the cart items to generateReceipt.
        // However, since the user message already confirms the total, we'll keep it simple.
        cart.forEach(item => { // This will be empty if called after cart.length = 0
             const li = document.createElement('li');
             li.textContent = `${item.name} (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}`;
             ul.appendChild(li);
        });
        if (ul.children.length === 0) { // If cart was cleared before receipt generation
            receiptDiv.innerHTML += '<p><em>(Item details processed)</em></p>';
        } else {
            receiptDiv.appendChild(ul);
        }

        receiptDiv.innerHTML += `<p><strong>Total Paid: $${parseFloat(totalPaid).toFixed(2)}</strong></p>`;
        receiptDiv.style.display = 'block';

        setTimeout(() => {
            receiptDiv.style.display = 'none';
        }, 15000); // Hide after 15 seconds
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
        
        fetchProducts(); // Initial product load
        renderCart();    // Initial cart render
    } else {
        console.error('Main element not found for sales page!');
    }
});
