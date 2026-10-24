import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import type { GSTControlRow } from './gstControlCenterPolicy';

const text = (value: string, bold = false) => new Paragraph({ children: [new TextRun({ text: value, bold })], spacing: { after: 120 } });
const heading = (value: string) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: value, bold: true })], spacing: { before: 220, after: 100 } });
const tableCell = (value: string, bold = false) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: value, bold })] })] });

export const downloadGSTControlReport = async (input: { financialYear: string; taxPeriod: string; rows: GSTControlRow[]; totalClients: number }) => {
  const filed = input.rows.filter((row) => row.action === 'Filed').length;
  const review = input.rows.filter((row) => row.action === 'Review filing').length;
  const dataRequests = input.rows.filter((row) => row.action === 'Request data').length;
  const report = new Document({ sections: [{ properties: {}, children: [
    new Paragraph({ alignment: AlignmentType.CENTER, heading: HeadingLevel.TITLE, children: [new TextRun({ text: 'CAATH GST CONTROL CENTRE REPORT', bold: true })], spacing: { after: 120 } }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${input.taxPeriod} · FY ${input.financialYear}` })], spacing: { after: 260 } }),
    heading('Executive summary'),
    text(`Clients in this report: ${input.rows.length}${input.rows.length !== input.totalClients ? ` of ${input.totalClients} after the selected filter` : ''}.`),
    text(`Both returns filed: ${filed}  |  Need filing review: ${review}  |  Need client data: ${dataRequests}.`),
    text('This report is a working control register. It records CAATH status data; it does not confirm portal filing independently.'),
    heading('Client-by-client filing matrix'),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ children: ['Client', 'GSTIN', 'GSTR-1', 'GSTR-3B', 'Next action'].map((value) => tableCell(value, true)) }),
      ...input.rows.map((row) => new TableRow({ children: [
        tableCell(row.client.name), tableCell(row.client.gstin || '—'), tableCell(row.gstr1), tableCell(row.gstr3b),
        tableCell(row.action === 'Request data' ? `Request data: ${row.outstandingReturns.join(', ')}` : row.action),
      ] })),
    ] }),
    heading('Operating notes'),
    text('Use the CAATH follow-up queue to request missing data. Review records marked “Need filing review” before filing or marking a return as filed.'),
  ] }] });
  const blob = await Packer.toBlob(report);
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = `CAATH-GST-Control-Report-${input.financialYear}-${input.taxPeriod.replace(/[^a-z0-9]+/gi, '-')}.docx`;
  anchor.click();
  URL.revokeObjectURL(url);
};
