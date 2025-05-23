const sqlite3 = require('sqlite3').verbose();

// Connect to SQLite database. If the file doesn't exist, it will be created.
const db = new sqlite3.Database('./pos_database.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Error when creating the database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        createTables();
    }
});

function createTables() {
    db.serialize(() => {
        // Products Table
        db.run(`CREATE TABLE IF NOT EXISTS Products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            price REAL NOT NULL,
            stock_quantity INTEGER DEFAULT 0
        )`, (err) => {
            if (err) console.error("Error creating Products table", err.message);
            else console.log("Products table created or already exists.");
        });

        // Attempt to add document_number column to Sales table
        db.run("ALTER TABLE Sales ADD COLUMN document_number TEXT UNIQUE", (err) => {
            if (err && err.message.includes("duplicate column name")) {
                // This is expected if the column already exists, so ignore this specific error.
                console.log("Column document_number already exists in Sales table.");
            } else if (err) {
                // For other errors (like table not existing yet), it might be an issue,
                // but CREATE TABLE IF NOT EXISTS should handle table creation.
                // This specific ALTER might fail if Sales table doesn't exist at all,
                // which is fine as CREATE TABLE will define it.
                console.log("Could not add document_number column via ALTER, CREATE TABLE will attempt to define it. Error:", err.message);
            } else {
                console.log("Column document_number added to Sales table or prepared for it.");
            }
        });

        // Sales Table
        db.run(`CREATE TABLE IF NOT EXISTS Sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_number TEXT UNIQUE, 
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            customer_id INTEGER,
            total_amount REAL NOT NULL,
            FOREIGN KEY (customer_id) REFERENCES Customers(id)
        )`, (err) => {
            if (err) console.error("Error creating Sales table", err.message);
            else console.log("Sales table created or already exists (with document_number).");
        });

        // SaleItems Table (Junction table for Sales and Products)
        db.run(`CREATE TABLE IF NOT EXISTS SaleItems (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            price_at_sale REAL NOT NULL, -- Price of the product at the time of sale
            FOREIGN KEY (sale_id) REFERENCES Sales(id),
            FOREIGN KEY (product_id) REFERENCES Products(id)
        )`, (err) => {
            if (err) console.error("Error creating SaleItems table", err.message);
            else console.log("SaleItems table created or already exists.");
        });

        // Customers Table (Optional for now, basic implementation)
        db.run(`CREATE TABLE IF NOT EXISTS Customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            contact_info TEXT
        )`, (err) => {
            if (err) console.error("Error creating Customers table", err.message);
            else console.log("Customers table created or already exists.");
        });

        // Chart of Accounts Table
        db.run(`CREATE TABLE IF NOT EXISTS ChartOfAccounts (
            account_id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_name TEXT NOT NULL UNIQUE,
            account_type TEXT NOT NULL CHECK(account_type IN ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense'))
        )`, (err) => {
            if (err) {
                console.error("Error creating ChartOfAccounts table", err.message);
            } else {
                console.log("ChartOfAccounts table created or already exists.");
                // Populate with some basic accounts
                const accounts = [
                    { name: 'Cash', type: 'Asset' },
                    { name: 'Accounts Receivable', type: 'Asset' },
                    { name: 'Inventory', type: 'Asset' },
                    { name: 'Sales Revenue', type: 'Revenue' },
                    { name: 'Cost of Goods Sold', type: 'Expense' },
                    { name: 'Accounts Payable', type: 'Liability' },
                    { name: 'Owners Equity', type: 'Equity' }
                ];
                const stmt = db.prepare("INSERT OR IGNORE INTO ChartOfAccounts (account_name, account_type) VALUES (?, ?)");
                for (const acc of accounts) {
                    stmt.run(acc.name, acc.type, (errRun) => {
                        if (errRun) console.error(`Error inserting account ${acc.name}`, errRun.message);
                    });
                }
                stmt.finalize((errFinal) => {
                    if(errFinal) console.error("Error finalizing account inserts", errFinal.message);
                    else console.log("Basic accounts populated in ChartOfAccounts.");
                });
            }
        });

        // Journal Entries Table (for basic accounting)
        db.run(`CREATE TABLE IF NOT EXISTS JournalEntries (
            entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER, -- Link to the sale if applicable
            account_id INTEGER NOT NULL,
            entry_type TEXT NOT NULL CHECK(entry_type IN ('Debit', 'Credit')),
            amount REAL NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            description TEXT,
            FOREIGN KEY (sale_id) REFERENCES Sales(id),
            FOREIGN KEY (account_id) REFERENCES ChartOfAccounts(account_id)
        )`, (err) => {
            if (err) {
                console.error("Error creating JournalEntries table", err.message);
            } else {
                console.log("JournalEntries table created or already exists.");
            }
            // Close the database connection once all table creation and population operations are done
            db.close((errClose) => {
                if (errClose) {
                    console.error('Error closing the database', errClose.message);
                } else {
                    console.log('Database setup complete. Connection closed.');
                }
            });
        });
    });
}

// Note: This script is intended to be run directly with `node database_setup.js`
// to initialize the database. It's not part of the server logic itself.
