import React, { useState } from 'react';
import { X, FileText, FileSpreadsheet, File, FileDown, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'word';

export interface ExportOptions {
  format: ExportFormat;
  includeHeaders: boolean;
  includeSummary: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onExport: (options: ExportOptions) => void;
  recordCount: number;
}

const FORMAT_OPTIONS = [
  { id: 'pdf', label: 'PDF Document', description: 'Portable Document Format', icon: FileText, color: 'text-red-400', bg: 'bg-red-500/10' },
  { id: 'excel', label: 'Excel Spreadsheet', description: 'Microsoft Excel .xlsx', icon: FileSpreadsheet, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { id: 'csv', label: 'CSV File', description: 'Comma Separated Values', icon: File, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'word', label: 'Word Document', description: 'Microsoft Word .docx', icon: FileDown, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
] as const;

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  title,
  onExport,
  recordCount
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('excel');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [dateRange, setDateRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleExport = () => {
    const options: ExportOptions = {
      format: selectedFormat,
      includeHeaders,
      includeSummary,
      ...(dateRange && startDate && endDate ? { dateRange: { start: startDate, end: endDate } } : {}),
    };
    onExport(options);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-matte-black-light border border-slate-800 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white">Export {title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">✕</button>
        </div>

        <div className="p-4 space-y-5">
          {/* Record Count */}
          <div className="p-3 bg-matte-black border border-slate-800">
            <p className="text-xs text-slate-500 uppercase mb-1">Records to Export</p>
            <p className="text-xl font-bold text-white">{recordCount} items</p>
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-xs text-slate-500 uppercase font-bold mb-2">Select Format</label>
            <div className="grid grid-cols-2 gap-2">
              {FORMAT_OPTIONS.map((format) => (
                <button
                  key={format.id}
                  onClick={() => setSelectedFormat(format.id as ExportFormat)}
                  className={cn(
                    "p-3 border text-left transition-all",
                    selectedFormat === format.id
                      ? "border-gold bg-gold/5"
                      : "border-slate-800 hover:border-slate-700"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <format.icon className={cn("w-4 h-4", format.color)} />
                    <span className={cn("text-xs font-bold", selectedFormat === format.id ? "text-gold" : "text-white")}>
                      {format.label}
                    </span>
                    {selectedFormat === format.id && <Check className="w-3 h-3 text-gold ml-auto" />}
                  </div>
                  <p className="text-[10px] text-slate-500">{format.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="flex items-center gap-2 mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dateRange}
                onChange={(e) => setDateRange(e.target.checked)}
                className="w-4 h-4 accent-gold"
              />
              <span className="text-xs text-slate-400">Filter by Date Range</span>
            </label>
            {dateRange && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-matte-black border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-matte-black border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Additional Options */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeHeaders}
                onChange={(e) => setIncludeHeaders(e.target.checked)}
                className="w-4 h-4 accent-gold"
              />
              <span className="text-xs text-slate-400">Include Column Headers</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSummary}
                onChange={(e) => setIncludeSummary(e.target.checked)}
                className="w-4 h-4 accent-gold"
              />
              <span className="text-xs text-slate-400">Include Summary Section</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gold text-matte-black text-xs font-bold hover:bg-gold-light transition-colors flex items-center gap-1.5"
          >
            <FileDown className="w-3.5 h-3.5" />
            Export Now
          </button>
        </div>
      </div>
    </div>
  );
};

// Generate CSV content
const generateCSV = <T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions,
  columns: { key: string; label: string }[]
): string => {
  let output = '';

  if (options.includeHeaders) {
    output += columns.map(c => `"${c.label}"`).join(',') + '\n';
  }

  const filteredData = options.dateRange
    ? data.filter(row => {
        const dateVal = row.date as string || row.dueDate as string || row.issueDate as string;
        if (!dateVal) return true;
        return dateVal >= options.dateRange!.start && dateVal <= options.dateRange!.end;
      })
    : data;

  filteredData.forEach(row => {
    output += columns.map(c => {
      const val = row[c.key];
      if (val === null || val === undefined) return '';
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return String(val);
    }).join(',') + '\n';
  });

  if (options.includeSummary) {
    output += '\n';
    output += `Total Records,${filteredData.length}\n`;
    output += `Export Date,${new Date().toLocaleDateString()}\n`;
    output += `Generated By,CAATH PMS\n`;
  }

  return output;
};

// Generate Excel-compatible XML (works in Excel)
const generateExcelXML = <T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions,
  columns: { key: string; label: string }[]
): string => {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<?mso-application progid="Excel.Sheet"?>\n';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
  xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
  xml += '<Worksheet ss:Name="Report">\n';
  xml += '<Table>\n';

  // Headers
  if (options.includeHeaders) {
    xml += '<Row>\n';
    columns.forEach(col => {
      xml += `<Cell><Data ss:Type="String">${col.label}</Data></Cell>\n`;
    });
    xml += '</Row>\n';
  }

  const filteredData = options.dateRange
    ? data.filter(row => {
        const dateVal = row.date as string || row.dueDate as string || row.issueDate as string;
        if (!dateVal) return true;
        return dateVal >= options.dateRange!.start && dateVal <= options.dateRange!.end;
      })
    : data;

  filteredData.forEach(row => {
    xml += '<Row>\n';
    columns.forEach(col => {
      const val = row[col.key];
      const strVal = val === null || val === undefined ? '' : String(val);
      const isNumber = !isNaN(Number(val)) && val !== '';
      xml += `<Cell><Data ss:Type="${isNumber ? 'Number' : 'String'}">${strVal}</Data></Cell>\n`;
    });
    xml += '</Row>\n';
  });

  if (options.includeSummary) {
    xml += '<Row>\n';
    xml += `<Cell><Data ss:Type="String">Total Records</Data></Cell>\n`;
    xml += `<Cell><Data ss:Type="Number">${filteredData.length}</Data></Cell>\n`;
    xml += '</Row>\n';
  }

  xml += '</Table>\n';
  xml += '</Worksheet>\n';
  xml += '</Workbook>';

  return xml;
};

// Generate HTML (can be saved as .xls for Excel or opened in Word)
const generateHTML = <T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions,
  columns: { key: string; label: string }[],
  title: string
): string => {
  let html = '<!DOCTYPE html>\n';
  html += '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">\n';
  html += '<head>\n';
  html += '<meta charset="UTF-8">\n';
  html += '<style>\n';
  html += 'table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }\n';
  html += 'th { background: #1e1e1e; color: white; padding: 10px; text-align: left; border: 1px solid #333; }\n';
  html += 'td { padding: 8px; border: 1px solid #333; color: #333; }\n';
  html += 'tr:nth-child(even) { background: #f5f5f5; }\n';
  html += '</style>\n';
  html += '</head>\n<body>\n';

  html += `<h1 style="color:#333;">${title}</h1>\n`;
  html += `<p style="color:#666;">Generated: ${new Date().toLocaleString()}</p>\n`;
  html += '<table>\n';

  // Headers
  if (options.includeHeaders) {
    html += '<thead><tr>\n';
    columns.forEach(col => {
      html += `<th>${col.label}</th>\n`;
    });
    html += '</tr></thead>\n';
  }

  html += '<tbody>\n';

  const filteredData = options.dateRange
    ? data.filter(row => {
        const dateVal = row.date as string || row.dueDate as string || row.issueDate as string;
        if (!dateVal) return true;
        return dateVal >= options.dateRange!.start && dateVal <= options.dateRange!.end;
      })
    : data;

  filteredData.forEach(row => {
    html += '<tr>\n';
    columns.forEach(col => {
      const val = row[col.key];
      html += `<td>${val === null || val === undefined ? '' : val}</td>\n`;
    });
    html += '</tr>\n';
  });

  html += '</tbody>\n</table>\n';

  if (options.includeSummary) {
    html += `<p style="margin-top:20px;color:#666;"><strong>Total Records:</strong> ${filteredData.length}</p>\n`;
  }

  html += '</body>\n</html>';

  return html;
};

// Generate PDF-like text content
const generatePDFText = <T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions,
  columns: { key: string; label: string }[],
  title: string
): string => {
  let text = '';
  const border = '='.repeat(80);

  text += border + '\n';
  text += title.padStart(40 + title.length/2).padEnd(80) + '\n';
  text += border + '\n\n';
  text += `Generated: ${new Date().toLocaleString()}\n`;
  text += `Total Records: ${data.length}\n\n`;
  text += border + '\n\n';

  // Calculate column widths
  const colWidths = columns.map(col => Math.max(col.label.length, 15));

  // Headers
  if (options.includeHeaders) {
    columns.forEach((col, i) => {
      text += col.label.padEnd(colWidths[i]) + ' | ';
    });
    text += '\n';
    text += colWidths.map(w => '-'.repeat(w)).join('-+-') + '\n';
  }

  // Data
  const filteredData = options.dateRange
    ? data.filter(row => {
        const dateVal = row.date as string || row.dueDate as string || row.issueDate as string;
        if (!dateVal) return true;
        return dateVal >= options.dateRange!.start && dateVal <= options.dateRange!.end;
      })
    : data;

  filteredData.forEach(row => {
    columns.forEach((col, i) => {
      const val = row[col.key];
      const strVal = val === null || val === undefined ? '' : String(val);
      text += strVal.substring(0, colWidths[i]).padEnd(colWidths[i]) + ' | ';
    });
    text += '\n';
  });

  text += '\n' + border + '\n';
  text += 'Generated by CAATH Practice Management System\n';

  return text;
};

// Download helper
export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Main export function
export const exportData = <T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions,
  columns: { key: string; label: string }[],
  reportTitle: string
): void => {
  const timestamp = new Date().toISOString().split('T')[0];
  let content: string;
  let filename: string;
  let mimeType: string;
  let extension: string;

  switch (options.format) {
    case 'excel':
      // Use HTML format that Excel can open
      content = generateHTML(data, options, columns, reportTitle);
      extension = 'xls';
      mimeType = 'application/vnd.ms-excel';
      filename = `${reportTitle.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.${extension}`;
      break;

    case 'word':
      // Use HTML format that Word can open
      content = generateHTML(data, options, columns, reportTitle);
      extension = 'doc';
      mimeType = 'application/msword';
      filename = `${reportTitle.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.${extension}`;
      break;

    case 'pdf':
      // Generate text-based PDF-like content
      content = generatePDFText(data, options, columns, reportTitle);
      extension = 'txt';
      mimeType = 'text/plain';
      filename = `${reportTitle.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.${extension}`;
      break;

    case 'csv':
    default:
      content = generateCSV(data, options, columns);
      extension = 'csv';
      mimeType = 'text/csv';
      filename = `${reportTitle.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.${extension}`;
      break;
  }

  downloadFile(content, filename, mimeType);
};

// Legacy compatibility
export const generateExportData = generateCSV;

export default ExportModal;