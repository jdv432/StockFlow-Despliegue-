import React, { useState, useRef, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  FileDown, 
  Plus, 
  CloudUpload, 
  Search, 
  Calendar, 
  ChevronDown, 
  Eye, 
  Trash2,
  History,
  X,
  Check,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  ArrowUpDown,
  ChevronRight,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Filter
} from 'lucide-react';

interface Invoice {
  id: number;
  status: 'Paid' | 'Pending' | 'Draft';
  date: string; // Stored as YYYY-MM-DD for sorting, formatted for display
  refId: string;
  provider: string;
  providerInitials: string;
  providerColor: string;
  total: string;
  fileName?: string;
  fileUrl?: string; // For previewing uploaded files
  fileType?: string; // 'image' or 'pdf'
}

// Initial Mock Data
const INITIAL_INVOICES: Invoice[] = [
  { 
    id: 1,
    status: 'Paid', 
    date: '2023-10-12', 
    refId: 'INV-2023-001', 
    provider: 'Tech Supplies S.L.', 
    providerInitials: 'TS',
    providerColor: 'bg-orange-100 text-orange-600',
    total: '€1,250.00',
    fileName: 'invoice_ts_001.pdf',
    fileType: 'pdf'
  },
  { 
    id: 2,
    status: 'Pending', 
    date: '2023-10-10', 
    refId: 'INV-2023-002', 
    provider: 'Office Depot', 
    providerInitials: 'OD',
    providerColor: 'bg-red-100 text-red-600',
    total: '€45.20',
    fileName: 'office_supplies.jpg',
    fileType: 'image'
  },
  { 
    id: 3,
    status: 'Paid', 
    date: '2023-10-05', 
    refId: 'INV-2023-003', 
    provider: 'Cleaning Services Inc.', 
    providerInitials: 'CS',
    providerColor: 'bg-blue-100 text-blue-600',
    total: '€200.00',
    fileName: 'cleaning_oct.pdf',
    fileType: 'pdf'
  },
  { 
    id: 4,
    status: 'Draft', 
    date: '2023-10-01', 
    refId: 'INV-2023-004', 
    provider: 'Internet Access Corp', 
    providerInitials: 'IA',
    providerColor: 'bg-purple-100 text-purple-600',
    total: '€89.99',
    fileName: 'internet_bill.pdf',
    fileType: 'pdf'
  }
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Generate year options (current year - 5 to current year + 5)
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

interface InvoicesProps {
  onAddInvoice?: () => void; // Kept for prop compatibility if used elsewhere
}

const Invoices = ({ onAddInvoice }: InvoicesProps) => {
  // State
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ 
    key: 'date', 
    direction: 'desc' // Default: Newest first
  });
  const [isSortOpen, setIsSortOpen] = useState(false);
  
  // Upload & Form Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Action Modals State
  const [invoiceToDelete, setInvoiceToDelete] = useState<number | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  // Export State
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportConfig, setExportConfig] = useState({
    scope: 'all', // 'all', 'last_month', 'specific_month', 'count'
    specificMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
    count: 5,
    status: 'All'
  });

  // New Invoice Form State
  const [formData, setFormData] = useState({
    provider: '',
    date: new Date().toISOString().split('T')[0], // Default today YYYY-MM-DD
    refId: '',
    total: ''
  });
  const [formErrors, setFormErrors] = useState<{ refId?: string, provider?: string }>({});

  // Helper to trigger file input
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setIsFormModalOpen(true);
      // Reset form defaults for new entry
      setFormData({
        provider: '',
        date: new Date().toISOString().split('T')[0],
        refId: '',
        total: ''
      });
      setFormErrors({});
    }
  };

  // Helper to check Ref ID uniqueness
  const isRefIdUnique = (refId: string) => {
    return !invoices.some(inv => inv.refId.toLowerCase() === refId.toLowerCase());
  };

  // Generate unique ID
  const generateRefId = () => {
    const year = new Date().getFullYear();
    let newId = '';
    let unique = false;
    
    while (!unique) {
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      newId = `INV-${year}-${random}`;
      unique = isRefIdUnique(newId);
    }
    return newId;
  };

  // Handle Form Submit
  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { refId?: string, provider?: string } = {};

    if (!formData.provider.trim()) {
      errors.provider = "Provider name is required";
    }

    let finalRefId = formData.refId.trim();

    if (finalRefId) {
      // User provided an ID, check uniqueness
      if (!isRefIdUnique(finalRefId)) {
        errors.refId = "This Ref ID already exists. Please use a unique ID.";
      }
    } else {
      // Generate automatic ID
      finalRefId = generateRefId();
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Create new Invoice object
    const initials = formData.provider.slice(0, 2).toUpperCase();
    const colors = ['bg-pink-100 text-pink-600', 'bg-indigo-100 text-indigo-600', 'bg-teal-100 text-teal-600', 'bg-gray-100 text-gray-600'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    // Create a temporary URL for the file to display in preview (Mocking persistence)
    let fileUrl = '';
    let fileType = 'pdf';
    
    if (selectedFile) {
      fileUrl = URL.createObjectURL(selectedFile);
      fileType = selectedFile.type.includes('image') ? 'image' : 'pdf';
    }

    const newInvoice: Invoice = {
      id: Date.now(),
      status: 'Pending', // Default status
      date: formData.date,
      refId: finalRefId,
      provider: formData.provider,
      providerInitials: initials,
      providerColor: randomColor,
      total: formData.total ? `€${parseFloat(formData.total).toFixed(2)}` : '€0.00',
      fileName: selectedFile?.name,
      fileUrl: fileUrl,
      fileType: fileType
    };

    setInvoices([newInvoice, ...invoices]);
    closeFormModal();
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Delete Handlers
  const handleDeleteClick = (id: number) => {
    setInvoiceToDelete(id);
  };

  const confirmDelete = () => {
    if (invoiceToDelete) {
      setInvoices(invoices.filter(inv => inv.id !== invoiceToDelete));
      setInvoiceToDelete(null);
    }
  };

  // Preview Handlers
  const handlePreviewClick = (invoice: Invoice) => {
    setPreviewInvoice(invoice);
  };

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    setSortConfig({ key, direction });
    setIsSortOpen(false);
  };

  // --- Export Logic ---

  const getFilteredDataForExport = () => {
    let data = [...invoices];

    // 1. Filter by Status
    if (exportConfig.status !== 'All') {
      data = data.filter(inv => inv.status === exportConfig.status);
    }

    // 2. Filter by Scope
    if (exportConfig.scope === 'last_month') {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      
      data = data.filter(inv => {
        const invDate = new Date(inv.date);
        return invDate >= lastMonth && invDate <= endLastMonth;
      });
    } else if (exportConfig.scope === 'specific_month') {
      const [year, month] = exportConfig.specificMonth.split('-');
      data = data.filter(inv => {
        const invDate = new Date(inv.date);
        return invDate.getFullYear() === parseInt(year) && (invDate.getMonth() + 1) === parseInt(month);
      });
    } else if (exportConfig.scope === 'count') {
      // Sort by newest first before slicing
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      data = data.slice(0, exportConfig.count);
    }

    return data;
  };

  const generateExcel = (data: Invoice[]) => {
    const exportData = data.map(inv => ({
      Status: inv.status,
      Date: inv.date,
      RefID: inv.refId,
      Provider: inv.provider,
      Total: inv.total
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");
    XLSX.writeFile(workbook, "Invoices_Report.xlsx");
  };

  const generatePDF = (data: Invoice[]) => {
    const doc = new jsPDF();
    const tableColumn = ["Status", "Date", "Ref ID", "Provider", "Total"];
    const tableRows: any[] = [];

    data.forEach(inv => {
      const rowData = [
        inv.status,
        formatDate(inv.date),
        inv.refId,
        inv.provider,
        inv.total
      ];
      tableRows.push(rowData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [19, 91, 236] }
    });

    doc.text("Invoices Report", 14, 15);
    doc.save("Invoices_Report.pdf");
  };

  const handleExport = (format: 'excel' | 'pdf', useFilters: boolean) => {
    let dataToExport = invoices;
    
    if (useFilters) {
      dataToExport = getFilteredDataForExport();
    }

    if (dataToExport.length === 0) {
      alert("No invoices match your export criteria.");
      return;
    }

    if (format === 'excel') {
      generateExcel(dataToExport);
    } else {
      generatePDF(dataToExport);
    }
    
    setIsExportModalOpen(false);
    setIsExportDropdownOpen(false);
  };

  // Memoized sorted and filtered invoices for display
  const processedInvoices = useMemo(() => {
    // 1. Filter
    let result = invoices.filter(inv => 
      inv.provider.toLowerCase().includes(searchTerm.toLowerCase()) || 
      inv.refId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 2. Sort
    result.sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof Invoice];
      let bValue: any = b[sortConfig.key as keyof Invoice];

      // Handle specific data types
      if (sortConfig.key === 'total') {
        // Remove currency symbol and parse float
        aValue = parseFloat(aValue.replace(/[^0-9.-]+/g, "")) || 0;
        bValue = parseFloat(bValue.replace(/[^0-9.-]+/g, "")) || 0;
      } else if (sortConfig.key === 'date') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [invoices, searchTerm, sortConfig]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 relative">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-text-main dark:text-white text-3xl font-black tracking-tight">Invoice Management</h1>
          <p className="text-text-secondary dark:text-gray-400 text-base font-normal">Upload new invoices or check payment history.</p>
        </div>
        <div className="flex gap-3 relative">
          
          {/* Export Dropdown Trigger */}
          <div className="relative">
            <button 
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-surface-light dark:bg-surface-dark text-text-main dark:text-white text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
            >
              <FileDown className="w-5 h-5" />
              Export Report
              <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${isExportDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Export Dropdown Menu */}
            {isExportDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsExportDropdownOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white dark:bg-surface-dark shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20 border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
                  <div className="py-1">
                    <button
                      onClick={() => handleExport('excel', false)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-green-600" />
                      Download All (Excel)
                    </button>
                    <button
                      onClick={() => handleExport('pdf', false)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <FileText className="w-4 h-4 text-red-600" />
                      Download All (PDF)
                    </button>
                    <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                    <button
                      onClick={() => {
                        setIsExportDropdownOpen(false);
                        setIsExportModalOpen(true);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-primary font-semibold hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Filter className="w-4 h-4" />
                      Custom Export...
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <button 
            onClick={triggerFileUpload}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-bold shadow-md hover:bg-primary-hover transition-colors active:scale-95"
          >
            <Plus className="w-5 h-5" />
            New Invoice
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/*,application/pdf"
      />

      {/* Upload Section */}
      <section>
        <div className="w-full bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-1 transition-colors">
          <div 
            onClick={triggerFileUpload}
            className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 px-6 py-12 hover:bg-primary/10 transition-all cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-full bg-white dark:bg-surface-dark flex items-center justify-center shadow-sm text-primary group-hover:scale-110 transition-transform duration-300">
              <CloudUpload className="w-8 h-8" />
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="text-text-main dark:text-white text-lg font-bold">Upload your invoice here</p>
              <p className="text-text-secondary dark:text-gray-400 text-sm">Drag a PDF file or Image (max 5MB) or click to browse.</p>
            </div>
            <button className="mt-2 px-5 py-2 rounded-lg bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-600 text-primary font-semibold text-sm shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Select File
            </button>
          </div>
        </div>
      </section>

      {/* Search & Sort Bar */}
      <div className="grid gap-4 rounded-xl bg-surface-light dark:bg-surface-dark p-4 shadow-sm border border-gray-200 dark:border-gray-700 sm:grid-cols-12 items-center z-20 relative transition-colors">
        <div className="relative sm:col-span-12 md:col-span-6">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-lg border-0 bg-gray-50 dark:bg-gray-800 py-2.5 pl-10 pr-3 text-text-main dark:text-white ring-1 ring-inset ring-gray-200 dark:ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 transition-shadow" 
            placeholder="Search by provider..." 
          />
        </div>
        
        <div className="flex flex-wrap gap-3 sm:col-span-12 md:col-span-6 justify-start md:justify-end">
            <div className="relative">
              <button 
                onClick={() => setIsSortOpen(!isSortOpen)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  isSortOpen
                    ? 'border-primary bg-primary/5 text-primary' 
                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <ArrowUpDown className="w-5 h-5" />
                <span>Sort</span>
                <ChevronRight className={`w-4 h-4 transition-transform ${isSortOpen ? '-rotate-90' : 'rotate-90'}`} />
              </button>
              
              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsSortOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20 border border-gray-100 dark:border-gray-700">
                    <div className="py-1">
                      {/* Date Sort */}
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50">
                        By Date
                      </div>
                      <button
                        onClick={() => handleSort('date', 'desc')}
                        className="flex w-full items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Newest First
                        {sortConfig.key === 'date' && sortConfig.direction === 'desc' && <Check className="w-4 h-4 text-primary" />}
                      </button>
                      <button
                        onClick={() => handleSort('date', 'asc')}
                        className="flex w-full items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Oldest First
                        {sortConfig.key === 'date' && sortConfig.direction === 'asc' && <Check className="w-4 h-4 text-primary" />}
                      </button>

                      {/* Status Sort */}
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
                        By Status
                      </div>
                      <button
                        onClick={() => handleSort('status', 'asc')}
                        className="flex w-full items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        A-Z
                        {sortConfig.key === 'status' && sortConfig.direction === 'asc' && <Check className="w-4 h-4 text-primary" />}
                      </button>
                      <button
                        onClick={() => handleSort('status', 'desc')}
                        className="flex w-full items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Z-A
                        {sortConfig.key === 'status' && sortConfig.direction === 'desc' && <Check className="w-4 h-4 text-primary" />}
                      </button>

                      {/* Total Sort */}
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
                        By Total
                      </div>
                      <button
                        onClick={() => handleSort('total', 'desc')}
                        className="flex w-full items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Highest First
                        {sortConfig.key === 'total' && sortConfig.direction === 'desc' && <Check className="w-4 h-4 text-primary" />}
                      </button>
                      <button
                        onClick={() => handleSort('total', 'asc')}
                        className="flex w-full items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Lowest First
                        {sortConfig.key === 'total' && sortConfig.direction === 'asc' && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
        </div>
      </div>

      {/* History Section */}
      <section className="flex flex-col gap-5">
        <h2 className="text-xl font-bold text-text-main dark:text-white flex items-center gap-2">
           <History className="w-6 h-6 text-primary" />
           Recent History
        </h2>

        {/* Invoice Table */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-background-light/50 dark:bg-gray-900/50">
                  <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400">Status</th>
                  <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400">Date</th>
                  <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400">Ref ID</th>
                  <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400 w-1/3">Provider</th>
                  <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400 text-right">Total</th>
                  <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-400 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                {processedInvoices.map((inv) => (
                  <InvoiceRow 
                    key={inv.id}
                    {...inv}
                    onDeleteClick={() => handleDeleteClick(inv.id)}
                    onPreviewClick={() => handlePreviewClick(inv)}
                  />
                ))}
                {processedInvoices.length === 0 && (
                   <tr>
                     <td colSpan={6} className="py-8 text-center text-text-secondary dark:text-gray-500">
                       No invoices found.
                     </td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* --- MODALS --- */}

      {/* 4. CUSTOM EXPORT MODAL */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setIsExportModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-surface-dark rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-text-main dark:text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" /> Custom Export
              </h2>
              <button onClick={() => setIsExportModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6">
              
              {/* Scope Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-text-main dark:text-gray-200">Date Range / Quantity</label>
                <select 
                  value={exportConfig.scope}
                  onChange={(e) => setExportConfig({...exportConfig, scope: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                >
                  <option value="all">All Time</option>
                  <option value="last_month">Last Month</option>
                  <option value="specific_month">Specific Month</option>
                  <option value="count">Last X Invoices</option>
                </select>

                {/* Conditional Inputs based on Scope */}
                {exportConfig.scope === 'specific_month' && (
                  <div className="mt-2 flex gap-2">
                    <select
                      value={parseInt(exportConfig.specificMonth.split('-')[1])}
                      onChange={(e) => {
                        const newMonth = e.target.value.padStart(2, '0');
                        const year = exportConfig.specificMonth.split('-')[0];
                        setExportConfig({...exportConfig, specificMonth: `${year}-${newMonth}`});
                      }}
                      className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    >
                      {MONTHS.map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={parseInt(exportConfig.specificMonth.split('-')[0])}
                      onChange={(e) => {
                        const newYear = e.target.value;
                        const month = exportConfig.specificMonth.split('-')[1];
                        setExportConfig({...exportConfig, specificMonth: `${newYear}-${month}`});
                      }}
                      className="w-1/3 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    >
                      {YEARS.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                )}

                {exportConfig.scope === 'count' && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-text-secondary dark:text-gray-400">Last</span>
                    <input 
                      type="number" 
                      min="1"
                      value={exportConfig.count}
                      onChange={(e) => setExportConfig({...exportConfig, count: parseInt(e.target.value) || 1})}
                      className="w-20 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-center"
                    />
                    <span className="text-sm text-text-secondary dark:text-gray-400">invoices</span>
                  </div>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-text-main dark:text-gray-200">Invoice Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {['All', 'Paid', 'Pending', 'Draft'].map(status => (
                    <button
                      key={status}
                      onClick={() => setExportConfig({...exportConfig, status})}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                        exportConfig.status === status 
                          ? 'bg-primary/10 border-primary text-primary' 
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex gap-3">
              <button 
                onClick={() => handleExport('excel', true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-sm transition-colors active:scale-95"
              >
                <FileSpreadsheet className="w-5 h-5" /> Export Excel
              </button>
              <button 
                onClick={() => handleExport('pdf', true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-sm transition-colors active:scale-95"
              >
                <FileText className="w-5 h-5" /> Export PDF
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 1. ADD INVOICE MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={closeFormModal}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-surface-dark rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-text-main dark:text-white">Add Invoice Details</h2>
              <button onClick={closeFormModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <form id="invoiceForm" onSubmit={handleSaveInvoice} className="flex flex-col gap-5">
                
                {/* File Preview (Mini) */}
                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                  <div className="p-2 bg-white dark:bg-surface-dark rounded-md text-primary">
                     {selectedFile?.type.includes('image') ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-main dark:text-white truncate">{selectedFile?.name}</p>
                    <p className="text-xs text-text-secondary dark:text-gray-400">{(selectedFile!.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <div className="text-green-600 dark:text-green-400">
                    <Check className="w-5 h-5" />
                  </div>
                </div>

                {/* Provider Input */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="provider" className="text-sm font-bold text-text-main dark:text-gray-200">
                    Provider Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    id="provider"
                    value={formData.provider}
                    onChange={(e) => {
                      setFormData({...formData, provider: e.target.value});
                      setFormErrors({...formErrors, provider: ''});
                    }}
                    className={`w-full px-4 py-2.5 rounded-lg border ${formErrors.provider ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all`}
                    placeholder="e.g. Amazon Web Services"
                    autoFocus
                  />
                  {formErrors.provider && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {formErrors.provider}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Date Input */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="date" className="text-sm font-bold text-text-main dark:text-gray-200">
                      Invoice Date
                    </label>
                    <input 
                      type="date" 
                      id="date"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>

                  {/* Total Amount (Optional) */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="total" className="text-sm font-bold text-text-main dark:text-gray-200">
                      Total Amount
                    </label>
                    <input 
                      type="number" 
                      id="total"
                      step="0.01"
                      value={formData.total}
                      onChange={(e) => setFormData({...formData, total: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Ref ID Input */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="refId" className="text-sm font-bold text-text-main dark:text-gray-200 flex justify-between">
                    <span>Reference ID</span>
                    <span className="text-text-secondary font-normal text-xs">Auto-generated if empty</span>
                  </label>
                  <input 
                    type="text" 
                    id="refId"
                    value={formData.refId}
                    onChange={(e) => {
                      setFormData({...formData, refId: e.target.value});
                      setFormErrors({...formErrors, refId: ''});
                    }}
                    className={`w-full px-4 py-2.5 rounded-lg border ${formErrors.refId ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all`}
                    placeholder="e.g. INV-2024-XXXX"
                  />
                  {formErrors.refId && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {formErrors.refId}
                    </p>
                  )}
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
              <button 
                onClick={closeFormModal}
                className="px-4 py-2 text-sm font-bold text-text-secondary hover:text-text-main dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="invoiceForm"
                className="px-6 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-lg shadow-md transition-all active:scale-95"
              >
                Save Invoice
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. DELETE CONFIRMATION MODAL */}
      {invoiceToDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setInvoiceToDelete(null)}></div>
           <div className="relative transform overflow-hidden rounded-xl bg-white dark:bg-surface-dark text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg animate-in zoom-in-95 duration-200">
             <div className="bg-white dark:bg-surface-dark px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
               <div className="sm:flex sm:items-start">
                 <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 sm:mx-0 sm:h-10 sm:w-10">
                   <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
                 </div>
                 <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                   <h3 className="text-lg font-bold leading-6 text-gray-900 dark:text-white" id="modal-title">Delete Invoice</h3>
                   <div className="mt-2">
                     <p className="text-sm text-gray-500 dark:text-gray-400">
                       Are you sure you want to delete this invoice? This action cannot be undone and will remove the item from your history permanently.
                     </p>
                   </div>
                 </div>
               </div>
             </div>
             <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
               <button 
                 type="button" 
                 onClick={confirmDelete}
                 className="inline-flex w-full justify-center rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto transition-colors"
               >
                 Delete
               </button>
               <button 
                 type="button" 
                 onClick={() => setInvoiceToDelete(null)}
                 className="mt-3 inline-flex w-full justify-center rounded-lg bg-white dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 sm:mt-0 sm:w-auto transition-colors"
               >
                 Cancel
               </button>
             </div>
           </div>
         </div>
      )}

      {/* 3. PREVIEW MODAL */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setPreviewInvoice(null)}></div>
          <div className="relative w-full max-w-4xl bg-white dark:bg-surface-dark rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col md:flex-row h-[80vh] md:h-auto md:max-h-[85vh]">
             
             {/* Left Side: File Preview */}
             <div className="flex-1 bg-gray-100 dark:bg-gray-900/50 relative flex items-center justify-center border-r border-gray-200 dark:border-gray-700 p-4 min-h-[300px]">
                {previewInvoice.fileType === 'image' && (previewInvoice.fileUrl || previewInvoice.fileName?.endsWith('.jpg')) ? (
                   <img 
                      src={previewInvoice.fileUrl || 'https://placehold.co/600x800?text=Invoice+Image+Preview'} 
                      alt="Invoice Preview" 
                      className="max-w-full max-h-full object-contain shadow-lg rounded-lg"
                   />
                ) : (
                   <div className="flex flex-col items-center justify-center text-gray-400">
                      <div className="w-24 h-24 bg-white dark:bg-surface-dark rounded-xl shadow-sm flex items-center justify-center mb-4">
                         <FileText className="w-12 h-12 text-primary opacity-50" />
                      </div>
                      <p className="text-sm font-medium">PDF Preview Not Available in Demo</p>
                      <p className="text-xs mt-1">{previewInvoice.fileName || 'No file attached'}</p>
                   </div>
                )}
                
                {/* Overlay Button */}
                <div className="absolute top-4 right-4">
                   <button className="p-2 bg-white/90 dark:bg-black/50 backdrop-blur-sm rounded-lg hover:bg-white dark:hover:bg-black/70 transition-colors shadow-sm text-gray-700 dark:text-white" title="Open Original">
                      <ExternalLink className="w-5 h-5" />
                   </button>
                </div>
             </div>

             {/* Right Side: Details */}
             <div className="w-full md:w-96 flex flex-col bg-surface-light dark:bg-surface-dark">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                   <h3 className="font-bold text-lg text-text-main dark:text-white">Invoice Details</h3>
                   <button onClick={() => setPreviewInvoice(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                      <X className="w-5 h-5" />
                   </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                   <div className="flex flex-col gap-6">
                      
                      {/* Status & Date */}
                      <div className="flex justify-between items-start">
                         <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Status</span>
                            <span className={`inline-flex items-center w-fit px-2.5 py-1 rounded-full text-xs font-medium border ${previewInvoice.status === 'Paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : previewInvoice.status === 'Pending' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                               {previewInvoice.status}
                            </span>
                         </div>
                         <div className="flex flex-col gap-1 text-right">
                            <span className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Date</span>
                            <span className="text-sm font-medium text-text-main dark:text-white">{formatDate(previewInvoice.date)}</span>
                         </div>
                      </div>

                      {/* Total */}
                      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700 text-center">
                         <span className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Total Amount</span>
                         <p className="text-3xl font-black text-primary mt-1">{previewInvoice.total}</p>
                      </div>

                      {/* Provider Info */}
                      <div className="flex flex-col gap-2">
                         <span className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Provider</span>
                         <div className="flex items-center gap-3 p-3 border border-gray-100 dark:border-gray-700 rounded-lg">
                            <div className={`w-10 h-10 rounded-md ${previewInvoice.providerColor} dark:bg-opacity-20 flex items-center justify-center font-bold text-sm shrink-0`}>
                               {previewInvoice.providerInitials}
                            </div>
                            <div>
                               <p className="font-bold text-sm text-text-main dark:text-white">{previewInvoice.provider}</p>
                               <p className="text-xs text-text-secondary dark:text-gray-400">{previewInvoice.refId}</p>
                            </div>
                         </div>
                      </div>

                       {/* File Info */}
                       <div className="flex flex-col gap-2">
                         <span className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider">Attached File</span>
                         <div className="flex items-center gap-2 text-sm text-text-main dark:text-gray-300">
                            {previewInvoice.fileType === 'image' ? <ImageIcon className="w-4 h-4 text-primary" /> : <FileText className="w-4 h-4 text-primary" />}
                            <span className="truncate">{previewInvoice.fileName || 'No file attached'}</span>
                         </div>
                      </div>

                   </div>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                   <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-bold text-text-main dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
                      <Download className="w-4 h-4" />
                      Download Invoice
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Helper to format YYYY-MM-DD to DD-MM-YYYY (or localized)
const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

interface InvoiceRowProps extends Invoice {
  onDeleteClick: () => void;
  onPreviewClick: () => void;
}

const InvoiceRow = ({ status, date, refId, provider, providerInitials, providerColor, total, onDeleteClick, onPreviewClick }: InvoiceRowProps) => {
  let statusBadge = null;
  if (status === 'Paid') {
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        Paid
      </span>
    );
  } else if (status === 'Pending') {
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        Pending
      </span>
    );
  } else {
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
        Draft
      </span>
    );
  }

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
      <td className="py-4 px-6 whitespace-nowrap">{statusBadge}</td>
      <td className="py-4 px-6 text-text-main dark:text-white whitespace-nowrap">{formatDate(date)}</td>
      <td className="py-4 px-6 text-text-secondary dark:text-gray-400 font-mono text-xs">{refId}</td>
      <td className="py-4 px-6">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded ${providerColor} dark:bg-opacity-20 flex items-center justify-center font-bold text-xs shrink-0`}>
            {providerInitials}
          </div>
          <span className="font-medium text-text-main dark:text-white truncate">{provider}</span>
        </div>
      </td>
      <td className="py-4 px-6 text-right font-bold text-text-main dark:text-white tabular-nums">{total}</td>
      <td className="py-4 px-6">
        <div className="flex items-center justify-center gap-2">
          <button 
            onClick={onPreviewClick}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-text-secondary dark:text-gray-400 hover:text-primary transition-colors" 
            title="View Details"
          >
            <Eye className="w-5 h-5" />
          </button>
          <button 
            onClick={onDeleteClick}
            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-text-secondary dark:text-gray-400 hover:text-red-600 transition-colors" 
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default Invoices;