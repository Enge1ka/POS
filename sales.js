document.addEventListener('DOMContentLoaded', () => {
    const products = [
        { id: 1, name: 'Milk', price: 2.50 },
        { id: 2, name: 'Bread', price: 1.80 },
        { id: 3, name: 'Eggs', price: 3.00 },
        { id: 4, name: 'Apples', price: 0.50 },
        { id: 5, name: 'Chicken Breast', price: 5.20 },
    ];

    const productGrid = document.createElement('div');
    productGrid.style.display = 'grid';
    productGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(150px, 1fr))';
    productGrid.style.gap = '1em';
    productGrid.style.marginTop = '2em';

    const cart = [];
    const cartItemsDiv = document.createElement('div');
    cartItemsDiv.style.marginTop = '2em';
    cartItemsDiv.style.border = '1px solid #ccc';
    cartItemsDiv.style.padding = '1em';

    const totalDiv = document.createElement('div');
    totalDiv.style.marginTop = '1em';
    totalDiv.style.fontWeight = 'bold';

    function renderProducts() {
        products.forEach(product => {
            const productDiv = document.createElement('div');
            productDiv.style.border = '1px solid #eee';
            productDiv.style.padding = '1em';
            productDiv.style.textAlign = 'center';

            const productName = document.createElement('h3');
            productName.textContent = product.name;

            const productPrice = document.createElement('p');
            productPrice.textContent = `$${product.price.toFixed(2)}`;

            const addButton = document.createElement('button');
            addButton.textContent = 'Add to Cart';
            addButton.onclick = () => addToCart(product);

            productDiv.appendChild(productName);
            productDiv.appendChild(productPrice);
            productDiv.appendChild(addButton);
            productGrid.appendChild(productDiv);
        });
    }

    function addToCart(product) {
        cart.push(product);
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
                li.textContent = `${item.name} - $${item.price.toFixed(2)}`;
                ul.appendChild(li);
            });
            cartItemsDiv.appendChild(ul);
        }
        calculateTotal();
    }

    function calculateTotal() {
        const total = cart.reduce((sum, item) => sum + item.price, 0);
        totalDiv.textContent = `Total: $${total.toFixed(2)}`;
    }

    // --- Payment and Receipt (Mock) ---
    const paymentButton = document.createElement('button');
    paymentButton.textContent = 'Process Payment';
    paymentButton.style.marginTop = '1em';
    paymentButton.style.padding = '0.5em 1em';
    paymentButton.style.backgroundColor = '#28a745';
    paymentButton.style.color = 'white';
    paymentButton.style.border = 'none';
    paymentButton.style.cursor = 'pointer';

    paymentButton.onclick = () => {
        if (cart.length === 0) {
            alert('Cart is empty. Please add products before processing payment.');
            return;
        }
        // Mock payment processing
        alert(`Payment of $${cart.reduce((sum, item) => sum + item.price, 0).toFixed(2)} processed successfully!`);
        generateReceipt();
        cart.length = 0; // Clear cart
        renderCart(); // Update cart display
    };

    const receiptDiv = document.createElement('div');
    receiptDiv.style.marginTop = '2em';
    receiptDiv.style.border = '1px dashed #666';
    receiptDiv.style.padding = '1em';
    receiptDiv.style.display = 'none'; // Initially hidden

    function generateReceipt() {
        receiptDiv.innerHTML = '<h2>Receipt</h2>';
        const transactionId = `TRANS-${Date.now()}`;
        receiptDiv.innerHTML += `<p>Transaction ID: ${transactionId}</p>`;
        receiptDiv.innerHTML += '<p>Items:</p>';
        const ul = document.createElement('ul');
        cart.forEach(item => { // This should use the cart content *before* clearing
            const li = document.createElement('li');
            li.textContent = `${item.name} - $${item.price.toFixed(2)}`;
            ul.appendChild(li);
        });
        receiptDiv.appendChild(ul);
        const total = cart.reduce((sum, item) => sum + item.price, 0); // Same here
        receiptDiv.innerHTML += `<p><strong>Total Paid: $${total.toFixed(2)}</strong></p>`;
        receiptDiv.style.display = 'block';

        // Hide receipt after a delay and then clear cart
        setTimeout(() => {
            receiptDiv.style.display = 'none';
        }, 10000); // Hide after 10 seconds
    }


    // Append elements to main
    const mainElement = document.querySelector('main');
    if (mainElement) {
        mainElement.appendChild(productGrid);
        mainElement.appendChild(cartItemsDiv);
        mainElement.appendChild(totalDiv);
        mainElement.appendChild(paymentButton);
        mainElement.appendChild(receiptDiv);
        renderProducts();
        renderCart(); // Initial cart render
    } else {
        console.error('Main element not found for sales page!');
    }
});
