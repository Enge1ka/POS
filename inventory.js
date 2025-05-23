document.addEventListener('DOMContentLoaded', () => {
    const productTableBody = document.getElementById('productTableBody');
    const productForm = document.getElementById('productForm');
    const productIdField = document.getElementById('productId');
    const productNameField = document.getElementById('productName');
    const productPriceField = document.getElementById('productPrice');
    const productStockField = document.getElementById('productStock');
    const clearFormButton = document.getElementById('clearFormButton');
    const userMessagesDiv = document.getElementById('userMessages');

    const API_URL = '/api/products';
    let editingProductId = null;

    // --- Utility Functions ---
    function displayMessage(message, type = 'success') {
        userMessagesDiv.innerHTML = ''; // Clear previous messages
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        userMessagesDiv.appendChild(messageDiv);
        setTimeout(() => {
            if (userMessagesDiv.contains(messageDiv)) {
                 userMessagesDiv.removeChild(messageDiv);
            }
        }, 5000); // Message disappears after 5 seconds
    }

    // --- Fetch and Display Products ---
    async function fetchProducts() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            renderProductTable(data.products);
        } catch (error) {
            console.error('Error fetching products:', error);
            displayMessage(`Error fetching products: ${error.message}`, 'error');
        }
    }

    function renderProductTable(products) {
        productTableBody.innerHTML = ''; // Clear existing rows
        if (!products || products.length === 0) {
            const tr = productTableBody.insertRow();
            const td = tr.insertCell();
            td.colSpan = 4;
            td.textContent = 'No products found.';
            td.style.textAlign = 'center';
            return;
        }
        products.forEach(product => {
            const tr = productTableBody.insertRow();
            tr.innerHTML = `
                <td>${product.id}</td>
                <td>${product.name}</td>
                <td>$${parseFloat(product.price).toFixed(2)}</td>
                <td>${product.stock_quantity}</td>
            `;
            tr.style.cursor = 'pointer';
            tr.onclick = () => populateFormForEdit(product);
        });
    }

    // --- Form Handling ---
    function populateFormForEdit(product) {
        editingProductId = product.id;
        productIdField.value = product.id;
        productNameField.value = product.name;
        productPriceField.value = parseFloat(product.price).toFixed(2);
        productStockField.value = product.stock_quantity;
        productForm.querySelector('.btn-save').textContent = 'Update Product';
    }

    function resetForm() {
        editingProductId = null;
        productForm.reset();
        productIdField.value = ''; // Explicitly clear hidden field
        productForm.querySelector('.btn-save').textContent = 'Save Product';
        productNameField.focus();
    }

    clearFormButton.addEventListener('click', resetForm);

    productForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const name = productNameField.value.trim();
        const price = parseFloat(productPriceField.value);
        const stock_quantity = parseInt(productStockField.value, 10);

        if (!name || isNaN(price) || price < 0 || isNaN(stock_quantity) || stock_quantity < 0) {
            displayMessage('Please fill in all fields correctly (Name, non-negative Price, non-negative Stock).', 'error');
            return;
        }

        const productData = { name, price, stock_quantity };
        let url = API_URL;
        let method = 'POST';

        if (editingProductId) {
            url = `${API_URL}/${editingProductId}`;
            method = 'PUT';
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });

            const responseData = await response.json();

            if (!response.ok) {
                 throw new Error(responseData.error || `HTTP error! status: ${response.status}`);
            }
            
            displayMessage(responseData.message || `Product ${editingProductId ? 'updated' : 'added'} successfully!`);
            fetchProducts(); // Refresh table
            resetForm();

        } catch (error) {
            console.error(`Error ${editingProductId ? 'updating' : 'adding'} product:`, error);
            displayMessage(`Error: ${error.message}`, 'error');
        }
    });
    
    // It might be good to add a separate delete button per row or next to the form when an item is selected.
    // For now, let's add a delete button to the form that only appears when editing.
    // Or, better, a delete button that is always visible but enabled when a product is selected.
    // For simplicity in this step, we'll add a delete button to the form section.

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.id = 'deleteProductButton';
    deleteButton.className = 'btn-delete';
    deleteButton.textContent = 'Delete Selected Product';
    deleteButton.style.marginTop = '10px'; // Add some space
    deleteButton.disabled = true; // Disabled by default

    // Enable delete button when a product is selected for editing
    const originalPopulateForm = populateFormForEdit;
    populateFormForEdit = (product) => {
        originalPopulateForm(product);
        deleteButton.disabled = false;
    };

    const originalResetForm = resetForm;
    resetForm = () => {
        originalResetForm();
        deleteButton.disabled = true;
    };
    
    deleteButton.addEventListener('click', async () => {
        if (!editingProductId) {
            displayMessage('No product selected for deletion.', 'error');
            return;
        }

        if (!confirm(`Are you sure you want to delete product "${productNameField.value}" (ID: ${editingProductId})?`)) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/${editingProductId}`, { method: 'DELETE' });
            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || `HTTP error! status: ${response.status}`);
            }

            displayMessage(responseData.message || 'Product deleted successfully!');
            fetchProducts(); // Refresh table
            resetForm(); // Clear form and disable delete button

        } catch (error) {
            console.error('Error deleting product:', error);
            displayMessage(`Error deleting product: ${error.message}`, 'error');
        }
    });

    // Append the delete button to the form's button group
    const buttonGroup = productForm.querySelector('.button-group');
    if (buttonGroup) {
        buttonGroup.appendChild(deleteButton);
    }


    // Initial load
    fetchProducts();
    productNameField.focus();
});
