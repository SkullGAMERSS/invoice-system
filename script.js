// Initialize data
let gstinOptions = JSON.parse(localStorage.getItem('gstinOptions')) || [];
let invoices = JSON.parse(localStorage.getItem('invoices')) || [];
let cutoffInvoices = JSON.parse(localStorage.getItem('cutoffInvoices')) || [];

// DOM elements
const invoiceForm = document.getElementById('invoiceForm');
const customerGSTIN = document.getElementById('customerGSTIN');
const addGSTIN = document.getElementById('addGSTIN');
const actualValue = document.getElementById('actualValue');
const cgstValue = document.getElementById('cgstValue');
const sgstValue = document.getElementById('sgstValue');
const totalGSTValue = document.getElementById('totalGSTValue');
const totalInvoiceValue = document.getElementById('totalInvoiceValue');
const invoiceTable = document.getElementById('invoiceTable').getElementsByTagName('tbody')[0];
const exportBtn = document.getElementById('exportBtn');
const exportAllBtn = document.getElementById('exportAllBtn');
const exportCutoffBtn = document.getElementById('exportCutoffBtn');
const importBtn = document.getElementById('importBtn');
const fileInput = document.getElementById('fileInput');
const saveToCloudBtn = document.getElementById('saveToCloudBtn');
const loadFromCloudBtn = document.getElementById('loadFromCloudBtn');
const activeCount = document.getElementById('activeCount');
const cutoffCount = document.getElementById('cutoffCount');
const totalCount = document.getElementById('totalCount');
const cloudStatus = document.getElementById('cloudStatus');

// Set default invoice date to today
document.getElementById('invoiceDate').valueAsDate = new Date();

// Initialize the page
function init() {
    updateGSTINDropdown();
    updateInvoiceTable();
    updateDataStatus();
    
    // Tab switching
    window.switchTab = function(tab) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        document.querySelector(`.tab[onclick="switchTab('${tab}')"]`).classList.add('active');
        document.getElementById(`${tab}Tab`).classList.add('active');
    };
}

// Update GSTIN dropdown
function updateGSTINDropdown() {
    customerGSTIN.innerHTML = '<option value="">Select GSTIN</option>';
    gstinOptions.forEach(gstin => {
        const option = document.createElement('option');
        option.value = gstin;
        option.textContent = gstin;
        customerGSTIN.appendChild(option);
    });
}

// Calculate GST values when actual value changes
actualValue.addEventListener('input', function() {
    const value = parseFloat(this.value) || 0;
    const cgst = value * 0.09;
    const sgst = value * 0.09;
    const totalGST = cgst + sgst;
    const total = value + totalGST;
    
    cgstValue.value = cgst.toFixed(2);
    sgstValue.value = sgst.toFixed(2);
    totalGSTValue.value = totalGST.toFixed(2);
    totalInvoiceValue.value = total.toFixed(2);
});

// Add new GSTIN
addGSTIN.addEventListener('click', function() {
    const newGSTIN = prompt('Enter new GSTIN number:');
    if (newGSTIN) {
        if (!gstinOptions.includes(newGSTIN)) {
            gstinOptions.push(newGSTIN);
            localStorage.setItem('gstinOptions', JSON.stringify(gstinOptions));
            updateGSTINDropdown();
            customerGSTIN.value = newGSTIN;
        } else {
            alert('This GSTIN already exists!');
        }
    }
});

// Save invoice
invoiceForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const invoice = {
        id: Date.now(),
        serialNumber: document.getElementById('serialNumber').value,
        invoiceNumber: document.getElementById('invoiceNumber').value,
        invoiceDate: document.getElementById('invoiceDate').value,
        customerName: document.getElementById('customerName').value,
        customerGSTIN: document.getElementById('customerGSTIN').value,
        actualValue: document.getElementById('actualValue').value,
        cgstValue: document.getElementById('cgstValue').value,
        sgstValue: document.getElementById('sgstValue').value,
        totalGSTValue: document.getElementById('totalGSTValue').value,
        totalInvoiceValue: document.getElementById('totalInvoiceValue').value,
        status: 'active'
    };
    
    invoices.push(invoice);
    localStorage.setItem('invoices', JSON.stringify(invoices));
    updateInvoiceTable();
    updateDataStatus();
    this.reset();
    
    // Reset invoice date to today
    document.getElementById('invoiceDate').valueAsDate = new Date();
});

// Update invoice table with new column order
function updateInvoiceTable() {
    invoiceTable.innerHTML = '';
    const recentInvoices = invoices.slice(-10).reverse();
    
    recentInvoices.forEach(invoice => {
        const row = invoiceTable.insertRow();
        const date = new Date(invoice.invoiceDate);
        const formattedDate = date.toLocaleDateString('en-IN');
        
        row.innerHTML = `
            <td>${invoice.serialNumber}</td>
            <td>${invoice.invoiceNumber}</td>
            <td>${formattedDate}</td>
            <td>${invoice.customerName}</td>
            <td>${invoice.customerGSTIN}</td>
            <td>₹${invoice.actualValue}</td>
            <td>₹${invoice.cgstValue}</td>
            <td>₹${invoice.sgstValue}</td>
            <td>₹${invoice.totalGSTValue}</td>
            <td>₹${invoice.totalInvoiceValue}</td>
        `;
    });
}

// Update Excel export with new column order
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

// Export and cutoff data
exportCutoffBtn.addEventListener('click', function() {
    if (invoices.length === 0) {
        alert('No current invoices to cutoff!');
        return;
    }
    
    if (confirm('This will export all current invoices and move them to cutoff storage. Continue?')) {
        // Export current data first
        exportData();
        
        // Add status to invoices before cutoff
        const cutoffData = invoices.map(invoice => ({
            ...invoice,
            status: 'cutoff'
        }));
        
        // Move to cutoff storage
        cutoffInvoices = [...cutoffInvoices, ...cutoffData];
        invoices = [];
        
        localStorage.setItem('invoices', JSON.stringify(invoices));
        localStorage.setItem('cutoffInvoices', JSON.stringify(cutoffInvoices));
        
        updateInvoiceTable();
        updateDataStatus();
        alert('Data has been cutoff successfully!');
    }
});

// Import data
importBtn.addEventListener('click', function() {
    fileInput.click();
});

fileInput.addEventListener('change', function(e) {
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
                
                // Convert Excel data to our format
                data = data.map(item => ({
                    id: Date.now() + Math.floor(Math.random() * 1000),
                    invoiceDate: item['Invoice Date'] || new Date().toISOString().split('T')[0],
                    serialNumber: item['Serial Number'] || '',
                    invoiceNumber: item['Invoice Number'] || '',
                    customerName: item['Customer Name'] || '',
                    customerGSTIN: item['Customer GSTIN'] || '',
                    actualValue: item['Actual Value'] || '',
                    cgstValue: item['CGST 9% Value'] || '',
                    sgstValue: item['SGST 9% Value'] || '',
                    totalGSTValue: item['Total GST Value'] || '',
                    totalInvoiceValue: item['Total Invoice Value'] || '',
                    status: item['Status'] || 'active'
                }));
            }
            
            if (confirm(`Import ${data.length} records? This will add to your existing data.`)) {
                // Separate active and cutoff data
                const activeData = data.filter(item => item.status !== 'cutoff');
                const cutoffData = data.filter(item => item.status === 'cutoff');
                
                invoices = [...invoices, ...activeData];
                cutoffInvoices = [...cutoffInvoices, ...cutoffData];
                
                localStorage.setItem('invoices', JSON.stringify(invoices));
                localStorage.setItem('cutoffInvoices', JSON.stringify(cutoffInvoices));
                
                // Update GSTIN options
                const newGSTINs = data
                    .map(item => item.customerGSTIN)
                    .filter(gstin => gstin && !gstinOptions.includes(gstin));
                
                if (newGSTINs.length > 0) {
                    gstinOptions = [...gstinOptions, ...newGSTINs];
                    localStorage.setItem('gstinOptions', JSON.stringify(gstinOptions));
                    updateGSTINDropdown();
                }
                
                updateInvoiceTable();
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
    
    // Reset file input
    fileInput.value = '';
});

// Cloud Sync Configuration (Replace with your JSONBin.io credentials)
const BIN_ID = "67f7ae9c8561e97a50fca560";
const API_KEY = "$2a$10$yVUHnA02tZlhxv.f.q4L5.Y4NwvvMCwGu6QDr4a3fv9ptv/LQOJti";

// Save to Cloud
saveToCloudBtn.addEventListener('click', async function() {
    const cloudData = {
        gstinOptions,
        invoices,
        cutoffInvoices,
        lastUpdated: new Date().toISOString()
    };
    
    try {
        cloudStatus.textContent = "Saving to cloud...";
        cloudStatus.style.color = "#6c757d";
        
        const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY,
                'X-Bin-Versioning': 'false'
            },
            body: JSON.stringify(cloudData)
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        const timestamp = new Date().toLocaleString();
        cloudStatus.textContent = `✅ Saved to cloud at ${timestamp}`;
        cloudStatus.style.color = "#28a745";
    } catch (error) {
        console.error('Cloud save error:', error);
        cloudStatus.textContent = `❌ Error: ${error.message}`;
        cloudStatus.style.color = "#dc3545";
    }
});

// Load from Cloud
loadFromCloudBtn.addEventListener('click', async function() {
    try {
        cloudStatus.textContent = "Loading from cloud...";
        cloudStatus.style.color = "#6c757d";
        
        const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            headers: {
                'X-Master-Key': API_KEY
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
            
            updateGSTINDropdown();
            updateInvoiceTable();
            updateDataStatus();
            
            const timestamp = new Date().toLocaleString();
            cloudStatus.textContent = `✅ Loaded from cloud at ${timestamp}`;
            cloudStatus.style.color = "#28a745";
        } else {
            cloudStatus.textContent = "Cloud load canceled";
            cloudStatus.style.color = "#6c757d";
        }
    } catch (error) {
        console.error('Cloud load error:', error);
        cloudStatus.textContent = `❌ Error: ${error.message}`;
        cloudStatus.style.color = "#dc3545";
    }
});

// Initialize the page
init();