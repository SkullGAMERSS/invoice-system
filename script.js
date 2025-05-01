// Configuration
const CONFIG = {
    GST_RATE: 0.09,
    BIN_ID: "67f7ae9c8561e97a50fca560",
    API_KEY: "$2a$10$yVUHnA02tZlhxv.f.q4L5.Y4NwvvMCwGu6QDr4a3fv9ptv/LQOJti",
    RECENT_INVOICES_LIMIT: 10
};

// Initialize data with safe parsing
let gstinOptions = loadFromStorage('gstinOptions') || [];
let invoices = loadFromStorage('invoices') || [];
let cutoffInvoices = loadFromStorage('cutoffInvoices') || [];

// Helper functions
function loadFromStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error(`Error loading ${key} from storage:`, error);
        return null;
    }
}

function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error(`Error saving ${key} to storage:`, error);
        throw error;
    }
}

// DOM elements
const elements = {
    invoiceForm: document.getElementById('invoiceForm'),
    customerGSTIN: document.getElementById('customerGSTIN'),
    addGSTIN: document.getElementById('addGSTIN'),
    actualValue: document.getElementById('actualValue'),
    cgstValue: document.getElementById('cgstValue'),
    sgstValue: document.getElementById('sgstValue'),
    totalGSTValue: document.getElementById('totalGSTValue'),
    totalInvoiceValue: document.getElementById('totalInvoiceValue'),
    invoiceTable: document.getElementById('invoiceTable')?.getElementsByTagName('tbody')[0],
    exportBtn: document.getElementById('exportBtn'),
    exportAllBtn: document.getElementById('exportAllBtn'),
    exportCutoffBtn: document.getElementById('exportCutoffBtn'),
    importBtn: document.getElementById('importBtn'),
    fileInput: document.getElementById('fileInput'),
    saveToCloudBtn: document.getElementById('saveToCloudBtn'),
    loadFromCloudBtn: document.getElementById('loadFromCloudBtn'),
    activeCount: document.getElementById('activeCount'),
    cutoffCount: document.getElementById('cutoffCount'),
    totalCount: document.getElementById('totalCount'),
    cloudStatus: document.getElementById('cloudStatus')
};

// Set default invoice date to today
function setDefaultDate() {
    const dateElement = document.getElementById('invoiceDate');
    if (dateElement) {
        dateElement.valueAsDate = new Date();
    }
}

// Tab switching function
function setupTabSwitching() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Deactivate all tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Activate selected tab and content
    document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

// Initialize the page
function init() {
    setDefaultDate();
    updateGSTINDropdown();
    updateInvoiceTable();
    updateDataStatus();
    setupTabSwitching();
    setupEventListeners();
}

// Debounce function for performance
function debounce(func, delay) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// Basic GSTIN validation
function isValidGSTIN(gstin) {
    if (!gstin) return false;
    // Simple format check - real validation would be more complex
    return /^[0-9A-Z]{15}$/.test(gstin);
}

// Calculate GST values
function calculateGST() {
    const value = parseFloat(elements.actualValue.value) || 0;
    const cgst = value * CONFIG.GST_RATE;
    const sgst = value * CONFIG.GST_RATE;
    const totalGST = cgst + sgst;
    const total = value + totalGST;
    
    elements.cgstValue.value = cgst.toFixed(2);
    elements.sgstValue.value = sgst.toFixed(2);
    elements.totalGSTValue.value = totalGST.toFixed(2);
    elements.totalInvoiceValue.value = total.toFixed(2);
}

// Update GSTIN dropdown
function updateGSTINDropdown() {
    if (!elements.customerGSTIN) return;
    
    elements.customerGSTIN.innerHTML = '<option value="">Select GSTIN</option>';
    gstinOptions.forEach(gstin => {
        const option = document.createElement('option');
        option.value = gstin;
        option.textContent = gstin;
        elements.customerGSTIN.appendChild(option);
    });
}

// Add new GSTIN
function addNewGSTIN() {
    const newGSTIN = prompt('Enter new GSTIN number:');
    if (!newGSTIN) return;
    
    if (!isValidGSTIN(newGSTIN)) {
        alert('Please enter a valid 15-digit GSTIN');
        return;
    }
    
    if (gstinOptions.includes(newGSTIN)) {
        alert('This GSTIN already exists!');
        return;
    }
    
    gstinOptions.push(newGSTIN);
    saveToStorage('gstinOptions', gstinOptions);
    updateGSTINDropdown();
    elements.customerGSTIN.value = newGSTIN;
}

// Save invoice
function saveInvoice(e) {
    e.preventDefault();
    
    const invoice = {
        id: Date.now(),
        serialNumber: document.getElementById('serialNumber').value,
        invoiceNumber: document.getElementById('invoiceNumber').value,
        invoiceDate: document.getElementById('invoiceDate').value,
        customerName: document.getElementById('customerName').value,
        customerGSTIN: document.getElementById('customerGSTIN').value,
        actualValue: parseFloat(document.getElementById('actualValue').value) || 0,
        cgstValue: parseFloat(document.getElementById('cgstValue').value) || 0,
        sgstValue: parseFloat(document.getElementById('sgstValue').value) || 0,
        totalGSTValue: parseFloat(document.getElementById('totalGSTValue').value) || 0,
        totalInvoiceValue: parseFloat(document.getElementById('totalInvoiceValue').value) || 0,
        status: 'active'
    };
    
    invoices.push(invoice);
    saveToStorage('invoices', invoices);
    updateInvoiceTable();
    updateDataStatus();
    e.target.reset();
    setDefaultDate();
}

// Update invoice table
function updateInvoiceTable() {
    if (!elements.invoiceTable) return;
    
    elements.invoiceTable.innerHTML = '';
    const recentInvoices = invoices
        .slice()
        .reverse()
        .slice(0, CONFIG.RECENT_INVOICES_LIMIT);
    
    recentInvoices.forEach(invoice => {
        const row = elements.invoiceTable.insertRow();
        
        const date = new Date(invoice.invoiceDate);
        const formattedDate = date.toLocaleDateString('en-IN');
        
        row.innerHTML = `
            <td>${invoice.serialNumber}</td>
            <td>${invoice.invoiceNumber}</td>
            <td>${formattedDate}</td>
            <td>${invoice.customerName}</td>
            <td>${invoice.customerGSTIN}</td>
            <td>₹${parseFloat(invoice.actualValue).toFixed(2)}</td>
            <td>₹${parseFloat(invoice.cgstValue).toFixed(2)}</td>
            <td>₹${parseFloat(invoice.sgstValue).toFixed(2)}</td>
            <td>₹${parseFloat(invoice.totalGSTValue).toFixed(2)}</td>
            <td>₹${parseFloat(invoice.totalInvoiceValue).toFixed(2)}</td>
        `;
    });
}

// Update data status
function updateDataStatus() {
    if (elements.activeCount) elements.activeCount.textContent = invoices.length;
    if (elements.cutoffCount) elements.cutoffCount.textContent = cutoffInvoices.length;
    if (elements.totalCount) elements.totalCount.textContent = invoices.length + cutoffInvoices.length;
}

// Export functions
function exportToExcel(data, filename) {
    const excelData = data.map(invoice => ({
        'SL.No': invoice.serialNumber,
        'Invoice No.': invoice.invoiceNumber,
        'Date': invoice.invoiceDate,
        'Customer': invoice.customerName,
        'Customer GSTIN': invoice.customerGSTIN,
        'Actual Value': Number(invoice.actualValue), // Ensure it's a number
        'CGST 9%': Number(invoice.cgstValue),       // Ensure it's a number
        'SGST 9%': Number(invoice.sgstValue),       // Ensure it's a number
        'Total GST': Number(invoice.totalGSTValue), // Ensure it's a number
        'Total Inv.Value': Number(invoice.totalInvoiceValue), // Ensure it's a number
        'Status': invoice.status || 'active'
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Explicitly set cell types for numeric columns to 'n' (number)
    const numericColumns = ['Actual Value', 'CGST 9%', 'SGST 9%', 'Total GST', 'Total Inv.Value'];
    Object.keys(worksheet).forEach(cell => {
        if (cell[0] === '!') return; // Skip special keys
        const cellValue = worksheet[cell].v;
        const col = cell.match(/[A-Z]+/)[0];
        const headerCell = col + '1';
        if (numericColumns.includes(worksheet[headerCell].v)) {
            if (typeof cellValue === 'number') {
                worksheet[cell].t = 'n'; // Set cell type to number
            }
        }
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoices');
    XLSX.writeFile(workbook, filename);
}

function exportData() {
    if (invoices.length === 0) {
        alert('No invoices to export!');
        return;
    }
    exportToExcel(invoices, 'Current_Invoices.xlsx');
}

function exportAllData() {
    const allData = [...invoices, ...cutoffInvoices];
    if (allData.length === 0) {
        alert('No data to export!');
        return;
    }
    exportToExcel(allData, 'All_Invoices.xlsx');
}

function exportAndCutoff() {
    if (invoices.length === 0) {
        alert('No current invoices to cutoff!');
        return;
    }
    
    if (confirm('This will export all current invoices and move them to cutoff storage. Continue?')) {
        exportData();
        
        const cutoffData = invoices.map(invoice => ({
            ...invoice,
            status: 'cutoff'
        }));
        
        cutoffInvoices = [...cutoffInvoices, ...cutoffData];
        invoices = [];
        
        saveToStorage('invoices', invoices);
        saveToStorage('cutoffInvoices', cutoffInvoices);
        
        updateInvoiceTable();
        updateDataStatus();
        alert('Data has been cutoff successfully!');
    }
}

// Import data
async function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        const data = await readFile(file);
        
        if (confirm(`Import ${data.length} records? This will add to your existing data.`)) {
            // Separate active and cutoff data
            const activeData = data.filter(item => item.status !== 'cutoff');
            const cutoffData = data.filter(item => item.status === 'cutoff');
            
            invoices = [...invoices, ...activeData];
            cutoffInvoices = [...cutoffInvoices, ...cutoffData];
            
            saveToStorage('invoices', invoices);
            saveToStorage('cutoffInvoices', cutoffInvoices);
            
            // Update GSTIN options
            const newGSTINs = data
                .map(item => item.customerGSTIN)
                .filter((gstin, index, self) => 
                    gstin && !gstinOptions.includes(gstin) && self.indexOf(gstin) === index
                );
            
            if (newGSTINs.length > 0) {
                gstinOptions = [...gstinOptions, ...newGSTINs];
                saveToStorage('gstinOptions', gstinOptions);
                updateGSTINDropdown();
            }
            
            updateInvoiceTable();
            updateDataStatus();
            alert('Data imported successfully!');
        }
    } catch (error) {
        alert('Error importing file: ' + error.message);
    } finally {
        e.target.value = '';
    }
}

function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                let data;
                if (file.name.endsWith('.json')) {
                    data = JSON.parse(e.target.result);
                } else if (file.name.endsWith('.xlsx')) {
                    const workbook = XLSX.read(e.target.result, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    data = XLSX.utils.sheet_to_json(firstSheet);
                    
                    data = data.map(item => ({
                        id: Date.now() + Math.floor(Math.random() * 1000),
                        serialNumber: item['SL.No'] || '',
                        invoiceNumber: item['Invoice No.'] || '',
                        invoiceDate: item['Date'] || new Date().toISOString().split('T')[0],
                        customerName: item['Customer'] || '',
                        customerGSTIN: item['Customer GSTIN'] || '',
                        actualValue: parseFloat(item['Actual Value']) || 0, // Parse as number
                        cgstValue: parseFloat(item['CGST 9%']) || 0,       // Parse as number
                        sgstValue: parseFloat(item['SGST 9%']) || 0,       // Parse as number
                        totalGSTValue: parseFloat(item['Total GST']) || 0, // Parse as number
                        totalInvoiceValue: parseFloat(item['Total Inv.Value']) || 0, // Parse as number
                        status: item['Status'] || 'active'
                    }));
                }
                resolve(data || []);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => reject(new Error('File reading error'));
        
        if (file.name.endsWith('.json')) {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    });
}

// Cloud Sync
async function saveToCloud() {
    if (!elements.cloudStatus) return;
    
    const cloudData = {
        gstinOptions,
        invoices,
        cutoffInvoices,
        lastUpdated: new Date().toISOString()
    };
    
    try {
        elements.cloudStatus.textContent = "Saving to cloud...";
        elements.cloudStatus.style.color = "#6c757d";
        
        const response = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': CONFIG.API_KEY,
                'X-Bin-Versioning': 'false'
            },
            body: JSON.stringify(cloudData)
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const timestamp = new Date().toLocaleString();
        elements.cloudStatus.textContent = `✅ Saved to cloud at ${timestamp}`;
        elements.cloudStatus.style.color = "#28a745";
    } catch (error) {
        console.error('Cloud save error:', error);
        elements.cloudStatus.textContent = `❌ Error: ${error.message}`;
        elements.cloudStatus.style.color = "#dc3545";
    }
}

async function loadFromCloud() {
    if (!elements.cloudStatus) return;
    
    try {
        elements.cloudStatus.textContent = "Loading from cloud...";
        elements.cloudStatus.style.color = "#6c757d";
        
        const response = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.BIN_ID}/latest`, {
            headers: {
                'X-Master-Key': CONFIG.API_KEY
            }
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        const cloudData = result.record;
        const lastUpdated = new Date(cloudData.lastUpdated).toLocaleString();
        
        if (confirm(`Load data from cloud (last updated ${lastUpdated})? This will replace your local data.`)) {
            gstinOptions = cloudData.gstinOptions || [];
            invoices = cloudData.invoices || [];
            cutoffInvoices = cloudData.cutoffInvoices || [];
            
            saveToStorage('gstinOptions', gstinOptions);
            saveToStorage('invoices', invoices);
            saveToStorage('cutoffInvoices', cutoffInvoices);
            
            updateGSTINDropdown();
            updateInvoiceTable();
            updateDataStatus();
            
            const timestamp = new Date().toLocaleString();
            elements.cloudStatus.textContent = `✅ Loaded from cloud at ${timestamp}`;
            elements.cloudStatus.style.color = "#28a745";
        } else {
            elements.cloudStatus.textContent = "Cloud load canceled";
            elements.cloudStatus.style.color = "#6c757d";
        }
    } catch (error) {
        console.error('Cloud load error:', error);
        elements.cloudStatus.textContent = `❌ Error: ${error.message}`;
        elements.cloudStatus.style.color = "#dc3545";
    }
}

// Setup event listeners
function setupEventListeners() {
    // Calculate GST with debounce
    elements.actualValue?.addEventListener('input', debounce(calculateGST, 300));
    
    // Form events
    elements.addGSTIN?.addEventListener('click', addNewGSTIN);
    elements.invoiceForm?.addEventListener('submit', saveInvoice);
    
    // Export buttons
    elements.exportBtn?.addEventListener('click', exportData);
    elements.exportAllBtn?.addEventListener('click', exportAllData);
    elements.exportCutoffBtn?.addEventListener('click', exportAndCutoff);
    
    // Import data
    elements.importBtn?.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput?.addEventListener('change', importData);
    
    // Cloud sync
    elements.saveToCloudBtn?.addEventListener('click', saveToCloud);
    elements.loadFromCloudBtn?.addEventListener('click', loadFromCloud);
}

// Initialize the page
document.addEventListener('DOMContentLoaded', init);