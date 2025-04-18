// Configuration
const CONFIG = {
    BIN_ID: "67f7ae9c8561e97a50fca560",
    API_KEY: "$2a$10$yVUHnA02tZlhxv.f.q4L5.Y4NwvvMCwGu6QDr4a3fv9ptv/LQOJti"
};

// Initialize data
let gstinOptions = JSON.parse(localStorage.getItem('gstinOptions')) || [];
let invoices = JSON.parse(localStorage.getItem('invoices')) || [];
let cutoffInvoices = JSON.parse(localStorage.getItem('cutoffInvoices')) || [];

// DOM elements
const elements = {
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

// Initialize the page
function init() {
    updateDataStatus();
    setupEventListeners();
}

// Update data status
function updateDataStatus() {
    elements.activeCount.textContent = invoices.length;
    elements.cutoffCount.textContent = cutoffInvoices.length;
    elements.totalCount.textContent = invoices.length + cutoffInvoices.length;
}

// Export to Excel
function exportToExcel(data, filename) {
    const excelData = data.map(invoice => ({
        'SL.No': invoice.serialNumber,
        'Invoice No.': invoice.invoiceNumber,
        'Date': invoice.invoiceDate,
        'Customer': invoice.customerName,
        'Customer GSTIN': invoice.customerGSTIN,
        'Actual Value': invoice.actualValue,
        'CGST 9%': invoice.cgstValue,
        'SGST 9%': invoice.sgstValue,
        'Total GST': invoice.totalGSTValue,
        'Total Inv.Value': invoice.totalInvoiceValue,
        'Status': invoice.status || 'active'
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoices');
    XLSX.writeFile(workbook, filename);
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
        exportToExcel(invoices, 'Current_Invoices.xlsx');
        
        const cutoffData = invoices.map(invoice => ({
            ...invoice,
            status: 'cutoff'
        }));
        
        cutoffInvoices = [...cutoffInvoices, ...cutoffData];
        invoices = [];
        
        localStorage.setItem('invoices', JSON.stringify(invoices));
        localStorage.setItem('cutoffInvoices', JSON.stringify(cutoffInvoices));
        
        updateDataStatus();
        alert('Data has been cutoff successfully!');
    }
}

// Import data
function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
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
                    actualValue: item['Actual Value'] || '0',
                    cgstValue: item['CGST 9%'] || '0',
                    sgstValue: item['SGST 9%'] || '0',
                    totalGSTValue: item['Total GST'] || '0',
                    totalInvoiceValue: item['Total Inv.Value'] || '0',
                    status: item['Status'] || 'active'
                }));
            }
            
            if (confirm(`Import ${data.length} records? This will add to your existing data.`)) {
                const activeData = data.filter(item => item.status !== 'cutoff');
                const cutoffData = data.filter(item => item.status === 'cutoff');
                
                invoices = [...invoices, ...activeData];
                cutoffInvoices = [...cutoffInvoices, ...cutoffData];
                
                localStorage.setItem('invoices', JSON.stringify(invoices));
                localStorage.setItem('cutoffInvoices', JSON.stringify(cutoffInvoices));
                
                const newGSTINs = data
                    .map(item => item.customerGSTIN)
                    .filter(gstin => gstin && !gstinOptions.includes(gstin));
                
                if (newGSTINs.length > 0) {
                    gstinOptions = [...gstinOptions, ...newGSTINs];
                    localStorage.setItem('gstinOptions', JSON.stringify(gstinOptions));
                }
                
                updateDataStatus();
                alert('Data imported successfully!');
            }
        } catch (error) {
            alert('Error importing file: ' + error.message);
        }
    };
    
    if (file.name.endsWith('.json')) {
        reader.readAsText(file);
    } else {
        reader.readAsArrayBuffer(file);
    }
    
    e.target.value = '';
}

// Cloud Sync
async function saveToCloud() {
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
            
            localStorage.setItem('gstinOptions', JSON.stringify(gstinOptions));
            localStorage.setItem('invoices', JSON.stringify(invoices));
            localStorage.setItem('cutoffInvoices', JSON.stringify(cutoffInvoices));
            
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
    elements.exportAllBtn.addEventListener('click', exportAllData);
    elements.exportCutoffBtn.addEventListener('click', exportAndCutoff);
    elements.importBtn.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', importData);
    elements.saveToCloudBtn.addEventListener('click', saveToCloud);
    elements.loadFromCloudBtn.addEventListener('click', loadFromCloud);
}

// Initialize the page
document.addEventListener('DOMContentLoaded', init);