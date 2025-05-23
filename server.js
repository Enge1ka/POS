const express = require('express');
const path = require('path'); // Added
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Connect to SQLite database
const dbPath = './pos_database.db';
let dbReady = false; // dbReady flag
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
        // dbReady remains false
    } else {
        console.log('Connected to the SQLite database.');
        dbReady = true;
    }
});

// --- Product Management API Endpoints ---

// GET /api/products - Fetch all products
app.get('/api/products', (req, res) => {
    console.log(`[${new Date().toISOString()}] Received request for GET /api/products`); // Log request
    if (!dbReady) {
        console.error(`[${new Date().toISOString()}] DB not ready for /api/products`);
        res.setHeader('Content-Type', 'application/json');
        return res.status(503).json({ error: "Database not ready. Please try again in a moment." });
    }
    
    const sql = "SELECT * FROM Products ORDER BY name";
    console.log(`[${new Date().toISOString()}] Executing SQL for /api/products: ${sql}`);
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error(`[${new Date().toISOString()}] Error executing SQL for /api/products:`, err.message);
            res.setHeader('Content-Type', 'application/json');
            return res.status(500).json({ error: 'Failed to retrieve products from database due to a database error.' });
        }
        console.log(`[${new Date().toISOString()}] Successfully fetched ${rows ? rows.length : 0} products. Sending JSON response.`);
        res.setHeader('Content-Type', 'application/json'); // Explicitly set content type
        res.json({ products: rows });
    });
});

// POST /api/products - Add a new product
app.post('/api/products', (req, res) => {
    if (!dbReady) {
        return res.status(503).json({ error: "Database not ready. Please try again in a moment." });
    }
    const { name, price, stock_quantity } = req.body;

    if (name == null || price == null) {
        return res.status(400).json({ error: 'Product name and price are required.' });
    }
    if (typeof price !== 'number' || price < 0) {
        return res.status(400).json({ error: 'Price must be a non-negative number.' });
    }
    const initialStock = stock_quantity != null ? (Number.isInteger(stock_quantity) && stock_quantity >=0 ? stock_quantity : 0) : 0;

    const sql = "INSERT INTO Products (name, price, stock_quantity) VALUES (?, ?, ?)";
    db.run(sql, [name, price, initialStock], function(err) {
        if (err) {
            console.error('Error adding product:', err.message);
            if (err.message.includes('UNIQUE constraint failed: Products.name')) {
                return res.status(409).json({ error: 'Product name already exists.' });
            }
            return res.status(500).json({ error: 'Failed to add product to database.' });
        }
        res.status(201).json({ message: 'Product added successfully', productId: this.lastID, name, price, stock_quantity: initialStock });
    });
});

// PUT /api/products/:id - Update an existing product
app.put('/api/products/:id', (req, res) => {
    if (!dbReady) {
        return res.status(503).json({ error: "Database not ready. Please try again in a moment." });
    }
    const { id } = req.params;
    const { name, price, stock_quantity } = req.body;

    if (name == null && price == null && stock_quantity == null) {
        return res.status(400).json({ error: 'No fields provided for update. Please provide name, price, or stock_quantity.' });
    }

    // Build the query dynamically based on provided fields
    let fieldsToUpdate = [];
    let params = [];

    if (name != null) {
        fieldsToUpdate.push("name = ?");
        params.push(name);
    }
    if (price != null) {
        if (typeof price !== 'number' || price < 0) {
            return res.status(400).json({ error: 'Price must be a non-negative number.' });
        }
        fieldsToUpdate.push("price = ?");
        params.push(price);
    }
    if (stock_quantity != null) {
         if (!Number.isInteger(stock_quantity) || stock_quantity < 0) {
            return res.status(400).json({ error: 'Stock quantity must be a non-negative integer.' });
        }
        fieldsToUpdate.push("stock_quantity = ?");
        params.push(stock_quantity);
    }

    if (fieldsToUpdate.length === 0) {
         return res.status(400).json({ error: 'No valid fields provided for update.' }); // Should be caught earlier, but as a safeguard
    }

    params.push(id); // For the WHERE clause

    const sql = `UPDATE Products SET ${fieldsToUpdate.join(", ")} WHERE id = ?`;

    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error updating product:', err.message);
            if (err.message.includes('UNIQUE constraint failed: Products.name')) {
                return res.status(409).json({ error: `Product name '${name}' already exists.` });
            }
            return res.status(500).json({ error: 'Failed to update product in database.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: `Product with ID ${id} not found.` });
        }
        res.json({ message: `Product with ID ${id} updated successfully.`, changes: this.changes });
    });
});

// DELETE /api/products/:id - Delete a product
app.delete('/api/products/:id', (req, res) => {
    if (!dbReady) {
        return res.status(503).json({ error: "Database not ready. Please try again in a moment." });
    }
    const { id } = req.params;
    const sql = "DELETE FROM Products WHERE id = ?";

    db.run(sql, id, function(err) {
        if (err) {
            console.error('Error deleting product:', err.message);
            // Check for foreign key constraint error if SaleItems referencing this product exist
            if (err.message.includes('FOREIGN KEY constraint failed')) {
                 return res.status(409).json({ error: 'Cannot delete product. It is referenced in existing sales records. Consider archiving or disabling instead.' });
            }
            return res.status(500).json({ error: 'Failed to delete product from database.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: `Product with ID ${id} not found.` });
        }
        res.json({ message: `Product with ID ${id} deleted successfully.` });
    });
});

// --- Sales Processing API Endpoint ---

// POST /api/sales - Process a new sale
app.post('/api/sales', async (req, res) => {
    if (!dbReady) {
        return res.status(503).json({ error: "Database not ready. Please try again in a moment." });
    }
    const { customer_id, items } = req.body; // items should be an array of { product_id, quantity, price_at_sale }

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Sale items are required.' });
    }

    // Basic validation for items
    for (const item of items) {
        if (item.product_id == null || item.quantity == null || item.price_at_sale == null) {
            return res.status(400).json({ error: 'Each sale item must include product_id, quantity, and price_at_sale.' });
        }
        // Further validation for quantity and price_at_sale can be kept as is
        if (typeof item.quantity !== 'number' || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
            return res.status(400).json({ error: `Invalid quantity for product ID ${item.product_id}. Must be a positive integer.` });
        }
        if (typeof item.price_at_sale !== 'number' || item.price_at_sale < 0) {
            return res.status(400).json({ error: `Invalid price for product ID ${item.product_id}. Must be a non-negative number.` });
        }
    }

    db.serialize(async () => { // Added async here to use await inside
        db.run("BEGIN TRANSACTION;", async (errBegin) => { // Added async here
            if (errBegin) {
                console.error("Error beginning transaction:", errBegin.message);
                return res.status(500).json({ error: "Failed to start sale transaction." });
            }

            let saleId; // Declare saleId here to be accessible for journal entries

            try {
                let calculatedTotalAmount = 0;
                let totalCOGS = 0; // For accounting

                // Pre-fetch account IDs (assuming they exist from database_setup.js)
                // This is a simplified way; in a real app, these might be configurable or cached
                const getAccountId = (name) => new Promise((resolve, reject) => {
                    db.get("SELECT account_id FROM ChartOfAccounts WHERE account_name = ?", [name], (err, row) => {
                        if (err) reject(new Error(`DB error fetching account ID for ${name}: ${err.message}`));
                        else if (!row) reject(new Error(`Account '${name}' not found in ChartOfAccounts.`));
                        else resolve(row.account_id);
                    });
                });

                const cashAccountId = await getAccountId('Cash'); // Assuming Cash for now
                const salesRevenueAccountId = await getAccountId('Sales Revenue');
                const cogsAccountId = await getAccountId('Cost of Goods Sold');
                const inventoryAccountId = await getAccountId('Inventory');

                for (const item of items) {
                    const productRow = await new Promise((resolve, reject) => {
                        // Fetch current price and stock. For COGS, if not storing cost_price, price_at_sale is used.
                        db.get("SELECT stock_quantity, price FROM Products WHERE id = ?", [item.product_id], (err, row) => {
                            if (err) reject(new Error(`Database error checking product ${item.product_id}: ${err.message}`));
                            else if (!row) reject(new Error(`Product with ID ${item.product_id} not found.`));
                            else resolve(row);
                        });
                    });

                    if (productRow.stock_quantity < item.quantity) {
                        throw new Error(`Not enough stock for product ID ${item.product_id}. Available: ${productRow.stock_quantity}, Requested: ${item.quantity}.`);
                    }
                    
                    calculatedTotalAmount += item.quantity * item.price_at_sale;
                    // *** COGS CALCULATION (SIMPLIFIED) ***
                    // Using item.price_at_sale as COGS. In a real system, product.cost_price should be used.
                    totalCOGS += item.quantity * item.price_at_sale; 
                }
                
                calculatedTotalAmount = parseFloat(calculatedTotalAmount.toFixed(2));
                totalCOGS = parseFloat(totalCOGS.toFixed(2)); // Ensure COGS is also 2 decimal places

                const salesSql = "INSERT INTO Sales (customer_id, total_amount) VALUES (?, ?)";
                const saleResult = await new Promise((resolve, reject) => {
                    db.run(salesSql, [customer_id, calculatedTotalAmount], function(err) {
                        if (err) reject(new Error(`Failed to insert into Sales table: ${err.message}`));
                        else resolve({ saleId: this.lastID });
                    });
                });
                saleId = saleResult.saleId; // Assign to the outer scope saleId

                // *** Generate and store document_number ***
                const documentNumber = `INV-${String(saleId).padStart(5, '0')}`;
                await new Promise((resolve, reject) => {
                    db.run("UPDATE Sales SET document_number = ? WHERE id = ?", [documentNumber, saleId], function(errUpdate) {
                        if (errUpdate) reject(new Error(`Failed to update Sales table with document_number: ${errUpdate.message}`));
                        else if (this.changes === 0) reject(new Error(`Failed to update document_number, sale ID ${saleId} not found for update.`));
                        else resolve();
                    });
                });
                // *** End of document_number ***

                const saleItemSql = "INSERT INTO SaleItems (sale_id, product_id, quantity, price_at_sale) VALUES (?, ?, ?, ?)";
                const updateStockSql = "UPDATE Products SET stock_quantity = stock_quantity - ? WHERE id = ?";

                for (const item of items) {
                    await new Promise((resolve, reject) => { // SaleItems
                        db.run(saleItemSql, [saleId, item.product_id, item.quantity, item.price_at_sale], function(err) {
                            if (err) reject(new Error(`Failed to insert SaleItem for product ${item.product_id}: ${err.message}`));
                            else resolve();
                        });
                    });
                    await new Promise((resolve, reject) => { // Update Stock
                        db.run(updateStockSql, [item.quantity, item.product_id], function(err) {
                            if (err) reject(new Error(`Failed to update stock for product ${item.product_id}: ${err.message}`));
                            else if (this.changes === 0) reject(new Error(`Stock update failed (no rows changed) for product ${item.product_id}.`));
                            else resolve();
                        });
                    });
                }

                // *** ADD JOURNAL ENTRIES ***
                const journalEntrySql = "INSERT INTO JournalEntries (sale_id, account_id, entry_type, amount, description) VALUES (?, ?, ?, ?, ?)";
                const description = `Sale ID: ${saleId}`;

                // 1. Debit Cash, Credit Sales Revenue
                await new Promise((resolve, reject) => {
                    db.run(journalEntrySql, [saleId, cashAccountId, 'Debit', calculatedTotalAmount, description], (err) => {
                        if (err) reject(new Error(`Journal (Cash Debit) failed: ${err.message}`)); else resolve();
                    });
                });
                await new Promise((resolve, reject) => {
                    db.run(journalEntrySql, [saleId, salesRevenueAccountId, 'Credit', calculatedTotalAmount, description], (err) => {
                        if (err) reject(new Error(`Journal (Sales Revenue Credit) failed: ${err.message}`)); else resolve();
                    });
                });

                // 2. Debit COGS, Credit Inventory
                await new Promise((resolve, reject) => {
                    db.run(journalEntrySql, [saleId, cogsAccountId, 'Debit', totalCOGS, description], (err) => {
                        if (err) reject(new Error(`Journal (COGS Debit) failed: ${err.message}`)); else resolve();
                    });
                });
                await new Promise((resolve, reject) => {
                    db.run(journalEntrySql, [saleId, inventoryAccountId, 'Credit', totalCOGS, description], (err) => {
                        if (err) reject(new Error(`Journal (Inventory Credit) failed: ${err.message}`)); else resolve();
                    });
                });
                // *** END OF JOURNAL ENTRIES ***

                db.run("COMMIT;", (errCommit) => {
                    if (errCommit) {
                        console.error("Error committing transaction:", errCommit.message);
                        db.run("ROLLBACK;", (errRollback) => { // Attempt rollback
                            if (errRollback) console.error("Error rolling back after commit error:", errRollback.message);
                        });
                        return res.status(500).json({ error: "Failed to finalize sale transaction (commit error)." });
                    }
                    res.status(201).json({ 
                        message: 'Sale processed successfully with accounting entries.', 
                        saleId: saleId, 
                        totalAmount: calculatedTotalAmount,
                        document_number: documentNumber // Added
                    });
                });

            } catch (error) {
                db.run("ROLLBACK;", (errRollback) => {
                    if (errRollback) console.error("Error rolling back transaction:", errRollback.message);
                });
                console.error('Error during sale processing (with accounting):', error.message);
                if (error.message.includes("Not enough stock") || error.message.includes("not found") || error.message.includes("Account")) {
                     // More specific errors for client
                    return res.status(409).json({ error: error.message });
                }
                return res.status(500).json({ error: `Sale processing failed: ${error.message}` });
            }
        });
    });
});

// --- Reporting API Endpoints ---

// GET /api/reports/sales - Fetch sales data
app.get('/api/reports/sales', (req, res) => {
    if (!dbReady) {
        return res.status(503).json({ error: "Database not ready. Please try again in a moment." });
    }
    // For a more detailed report, we can join Sales with SaleItems and Products
    // This is a simplified version showing basic sales info + item details as a string
    const sql = `
        SELECT 
            s.id AS sale_id,
            s.document_number, /* Added */
            s.timestamp, 
            s.total_amount,
            GROUP_CONCAT(p.name || ' (x' || si.quantity || ' @ $' || printf('%.2f', si.price_at_sale) || ')', '; ') AS items_sold
        FROM Sales s
        LEFT JOIN SaleItems si ON s.id = si.sale_id
        LEFT JOIN Products p ON si.product_id = p.id
        GROUP BY s.id
        ORDER BY s.timestamp DESC;
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching sales report:', err.message);
            return res.status(500).json({ error: 'Failed to retrieve sales report.' });
        }
        res.json({ sales_report: rows });
    });
});

// GET /api/reports/inventory - Fetch current inventory status (reuses /api/products)
// Note: The /api/products endpoint already has the dbReady check.

// GET /api/reports/journal - Fetch all journal entries
app.get('/api/reports/journal', (req, res) => {
    if (!dbReady) {
        return res.status(503).json({ error: "Database not ready. Please try again in a moment." });
    }
    const sql = `
        SELECT 
            je.entry_id,
            je.sale_id,
            je.timestamp,
            coa.account_name,
            je.entry_type,
            printf('%.2f', je.amount) AS amount,
            je.description
        FROM JournalEntries je
        JOIN ChartOfAccounts coa ON je.account_id = coa.account_id
        ORDER BY je.timestamp DESC, je.entry_id DESC;
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching journal entries:', err.message);
            return res.status(500).json({ error: 'Failed to retrieve journal entries.' });
        }
        res.json({ journal_entries: rows });
    });
});

// --- Returns Processing API Endpoint ---
app.post('/api/returns', async (req, res) => {
    if (!dbReady) {
        return res.status(503).json({ error: "Database not ready. Please try again in a moment." });
    }
    const { sale_id, reason } = req.body;

    if (sale_id == null || reason == null || reason.trim() === '') {
        return res.status(400).json({ error: 'Sale ID and reason are required for a return.' });
    }

    const saleIdNum = parseInt(sale_id, 10);
    if (isNaN(saleIdNum) || saleIdNum <= 0) {
        return res.status(400).json({ error: 'Invalid Sale ID format.' });
    }

    // Check if this sale has already been fully returned (simplistic check)
    const existingReturnEntries = await new Promise((resolve, reject) => {
        db.all("SELECT 1 FROM JournalEntries WHERE sale_id = ? AND description LIKE 'Return of Sale ID%' LIMIT 1", [saleIdNum], (err, rows) => {
            if (err) reject(new Error(`DB error checking existing returns: ${err.message}`));
            else resolve(rows);
        });
    });

    if (existingReturnEntries.length > 0) {
        return res.status(409).json({ error: `Sale ID ${saleIdNum} appears to have already been processed for return.` });
    }

    db.serialize(async () => { // Added async for await
        db.run("BEGIN TRANSACTION;", async (errBegin) => { // Added async for await
            if (errBegin) {
                console.error("Error beginning return transaction:", errBegin.message);
                return res.status(500).json({ error: "Failed to start return transaction." });
            }

            try {
                // 1. Verify the sale exists and get its items and total amount
                const saleDetails = await new Promise((resolve, reject) => {
                    db.get("SELECT id, total_amount FROM Sales WHERE id = ?", [saleIdNum], (err, row) => {
                        if (err) reject(new Error(`DB error fetching sale ${saleIdNum}: ${err.message}`));
                        else if (!row) reject(new Error(`Sale with ID ${saleIdNum} not found.`));
                        else resolve(row);
                    });
                });
                
                const saleItems = await new Promise((resolve, reject) => {
                    db.all("SELECT product_id, quantity, price_at_sale FROM SaleItems WHERE sale_id = ?", [saleIdNum], (err, rows) => {
                        if (err) reject(new Error(`DB error fetching sale items for sale ${saleIdNum}: ${err.message}`));
                        else if (!rows || rows.length === 0) reject(new Error(`No items found for sale ID ${saleIdNum}. Cannot process return.`));
                        else resolve(rows);
                    });
                });

                // Pre-fetch account IDs
                const getAccountId = (name) => new Promise((resolve, reject) => {
                    db.get("SELECT account_id FROM ChartOfAccounts WHERE account_name = ?", [name], (err, row) => {
                        if (err) reject(new Error(`DB error fetching account ID for ${name}: ${err.message}`));
                        else if (!row) reject(new Error(`Account '${name}' not found.`));
                        else resolve(row.account_id);
                    });
                });

                const cashAccountId = await getAccountId('Cash');
                const salesRevenueAccountId = await getAccountId('Sales Revenue');
                const cogsAccountId = await getAccountId('Cost of Goods Sold');
                const inventoryAccountId = await getAccountId('Inventory');

                let totalReturnedAmount = saleDetails.total_amount; // Assuming full return for simplicity
                let totalReturnedCOGS = 0;

                // 2. Update stock for each returned item
                const updateStockSql = "UPDATE Products SET stock_quantity = stock_quantity + ? WHERE id = ?";
                for (const item of saleItems) {
                    await new Promise((resolve, reject) => {
                        db.run(updateStockSql, [item.quantity, item.product_id], function(err) {
                            if (err) reject(new Error(`Failed to update stock for product ID ${item.product_id} during return: ${err.message}`));
                            else if (this.changes === 0) reject(new Error(`Stock update failed (no rows changed) for product ID ${item.product_id}.`));
                            else resolve();
                        });
                    });
                    // Simplified COGS for return = sum of (quantity * price_at_sale) for returned items
                    totalReturnedCOGS += item.quantity * item.price_at_sale;
                }
                totalReturnedCOGS = parseFloat(totalReturnedCOGS.toFixed(2));

                // 3. Create reversal journal entries
                const journalEntrySql = "INSERT INTO JournalEntries (sale_id, account_id, entry_type, amount, description) VALUES (?, ?, ?, ?, ?)";
                const returnDescription = `Return of Sale ID ${saleIdNum}. Reason: ${reason}`;

                // Debit Sales Revenue, Credit Cash (reversing the sale's effect)
                await new Promise((resolve, reject) => {
                    db.run(journalEntrySql, [saleIdNum, salesRevenueAccountId, 'Debit', totalReturnedAmount, returnDescription], (err) => {
                        if (err) reject(new Error(`Journal (Sales Revenue Debit for return) failed: ${err.message}`)); else resolve();
                    });
                });
                await new Promise((resolve, reject) => {
                    db.run(journalEntrySql, [saleIdNum, cashAccountId, 'Credit', totalReturnedAmount, returnDescription], (err) => {
                        if (err) reject(new Error(`Journal (Cash Credit for return) failed: ${err.message}`)); else resolve();
                    });
                });

                // Debit Inventory, Credit COGS (reversing the COGS effect)
                await new Promise((resolve, reject) => {
                    db.run(journalEntrySql, [saleIdNum, inventoryAccountId, 'Debit', totalReturnedCOGS, returnDescription], (err) => {
                        if (err) reject(new Error(`Journal (Inventory Debit for return) failed: ${err.message}`)); else resolve();
                    });
                });
                await new Promise((resolve, reject) => {
                    db.run(journalEntrySql, [saleIdNum, cogsAccountId, 'Credit', totalReturnedCOGS, returnDescription], (err) => {
                        if (err) reject(new Error(`Journal (COGS Credit for return) failed: ${err.message}`)); else resolve();
                    });
                });

                db.run("COMMIT;", (errCommit) => {
                    if (errCommit) {
                        console.error("Error committing return transaction:", errCommit.message);
                        db.run("ROLLBACK;"); // Attempt rollback
                        return res.status(500).json({ error: "Failed to finalize return (commit error)." });
                    }
                    res.status(200).json({ 
                        message: `Return for Sale ID ${saleIdNum} processed successfully. Stock updated and accounting entries made.`, 
                        returnedSaleId: saleIdNum,
                        totalReturnedAmount: totalReturnedAmount
                    });
                });

            } catch (error) {
                db.run("ROLLBACK;", (errRollback) => {
                    if (errRollback) console.error("Error rolling back return transaction:", errRollback.message);
                });
                console.error('Error processing return:', error.message);
                if (error.message.includes("not found") || error.message.includes("No items found")) {
                    return res.status(404).json({ error: error.message });
                }
                return res.status(500).json({ error: `Return processing failed: ${error.message}` });
            }
        });
    });
});

// Serve static files (HTML, CSS, JS) from the root directory
app.use(express.static(path.join(__dirname)));

// Old root path handler - now commented out or removed
/*
app.get('/', (req, res) => {
    res.send('Hello from Supermarket POS Backend!');
});
*/

// Start the server
app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Closed the database connection.');
        process.exit(0);
    });
});
