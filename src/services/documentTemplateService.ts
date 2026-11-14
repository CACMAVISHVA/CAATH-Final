import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

export type PracticeTemplateId = 'directors-report' | 'board-minutes' | 'agm-notice' | 'management-representation';

export type PracticeTemplateInput = {
  companyName: string;
  cin: string;
  registeredOffice: string;
  financialYearEnd: string;
  documentDate: string;
  place: string;
  meetingCount: string;
  signatoryName: string;
};

const heading = (text: string) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, bold: true })], spacing: { before: 240, after: 100 } });
const body = (text: string) => new Paragraph({ children: [new TextRun(text)], spacing: { after: 140 }, alignment: AlignmentType.JUSTIFIED });
const blank = (label = 'Details') => body(`${label}: ________________________________________________`);
const title = (text: string) => new Paragraph({ alignment: AlignmentType.CENTER, heading: HeadingLevel.TITLE, children: [new TextRun({ text, bold: true })], spacing: { after: 200 } });

const financialSummary = () => new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    ['Particulars', 'Current year (₹)', 'Previous year (₹)'],
    ['Revenue from operations', '', ''], ['Other income', '', ''], ['Profit / (loss) before tax', '', ''],
    ['Tax expense', '', ''], ['Profit / (loss) after tax', '', ''],
  ].map((row, index) => new TableRow({ children: row.map((cell) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: cell, bold: index === 0 })] })] })) })),
});

const directorsReport = (input: PracticeTemplateInput) => [
  title("BOARD'S REPORT"),
  body(`${input.companyName} | CIN: ${input.cin}`), body(`Registered office: ${input.registeredOffice}`),
  body(`To the Members,`), body(`The Board presents its report together with the financial statements for the year ended ${input.financialYearEnd}. This working draft should be reviewed for entity-specific applicability before issue.`),
  heading('1. Financial results and state of affairs'), financialSummary(), blank('Operational highlights and outlook'),
  heading('2. Dividend and transfer to reserves'), blank('Dividend recommendation and proposed transfer'),
  heading('3. Annual return'), blank('Web address of annual return, where applicable'),
  heading('4. Board meetings'), body(`The Board met ${input.meetingCount || '____'} times during the financial year.`), blank('Director attendance and meeting dates'),
  heading("5. Directors' responsibility statement"),
  body('The directors confirm that applicable accounting standards were followed; accounting policies were selected and applied consistently; reasonable and prudent estimates were used; adequate accounting records and asset safeguards were maintained; the accounts were prepared on a going-concern basis; applicable internal financial controls were addressed; and systems were established to support compliance with applicable laws.'),
  heading("6. Auditors' observations"), blank('Response to qualifications, reservations, adverse remarks or disclaimers'),
  heading('7. Loans, guarantees, investments and related parties'), blank('Section 186 particulars and AOC-2 / related-party disclosures'),
  heading('8. Material changes and commitments'), blank('Events after the reporting date affecting financial position'),
  heading('9. Energy, technology and foreign exchange'), blank('Conservation, technology absorption, foreign exchange earnings and outgo'),
  heading('10. Risk management, CSR and internal financial controls'), blank('Applicability and disclosures'),
  heading('11. Directors, KMP, deposits and other statutory disclosures'), blank('Changes, deposits, fraud reporting, POSH, cost records and regulator orders'),
  body(`For and on behalf of the Board of ${input.companyName}`), blank(`Signatory: ${input.signatoryName || 'Director'}`), body(`Place: ${input.place}    Date: ${input.documentDate}`),
];

const boardMinutes = (input: PracticeTemplateInput) => [
  title('MINUTES OF THE MEETING OF THE BOARD OF DIRECTORS'), body(input.companyName), body(`CIN: ${input.cin}`),
  body(`Meeting date: ${input.documentDate}    Place: ${input.place}`), heading('Attendance and quorum'), blank('Directors present, invitees and leave of absence'),
  heading('Chairperson'), body(`${input.signatoryName || 'The elected chairperson'} took the chair after confirming quorum.`),
  heading('Disclosure of interests'), blank('Disclosures recorded and participation restrictions, if any'),
  heading('Business transacted'), blank('Agenda item, deliberation and exact text of each resolution'),
  heading('Closure'), blank('Time of conclusion and vote of thanks'), body(`Chairperson: ${input.signatoryName || '________________'}    Date signed: ________________`),
];

const agmNotice = (input: PracticeTemplateInput) => [
  title('NOTICE OF ANNUAL GENERAL MEETING'), body(input.companyName), body(`CIN: ${input.cin}`), body(`Registered office: ${input.registeredOffice}`),
  body(`Notice is given that the Annual General Meeting of the members will be held on ${input.documentDate} at ${input.place}, to transact the business set out below.`),
  heading('Ordinary business'), blank('Adoption of financial statements and reports'), blank('Appointment / retirement of directors'), blank('Appointment and remuneration of auditors, where applicable'),
  heading('Special business'), blank('Resolution text and explanatory statement under section 102, where applicable'),
  heading('Notes'), body('Insert attendance, proxy, electronic participation, voting, book-closure and document-inspection instructions applicable to the company and meeting mode.'),
  body(`By order of the Board of ${input.companyName}`), body(`${input.signatoryName || 'Authorised signatory'}    Place: ${input.place}    Date: ${input.documentDate}`),
];

const managementRepresentation = (input: PracticeTemplateInput) => [
  title('MANAGEMENT REPRESENTATION LETTER'), body(`Date: ${input.documentDate}`), body('To the Statutory Auditors'),
  body(`Subject: Audit of ${input.companyName} for the year ended ${input.financialYearEnd}`),
  body('This letter records management representations made in connection with the audit. It must be tailored to the engagement, audit evidence and applicable reporting framework.'),
  heading('Financial statements and records'), blank('Responsibility, completeness of records, estimates and disclosures'),
  heading('Fraud, laws and litigation'), blank('Known or suspected fraud, non-compliance, claims and contingencies'),
  heading('Related parties and commitments'), blank('Relationships, transactions, guarantees and contractual commitments'),
  heading('Assets, liabilities and subsequent events'), blank('Title, impairment, completeness and events after reporting date'),
  heading('Taxation and statutory dues'), blank('GST, income tax, TDS, payroll and other statutory matters'),
  body(`For ${input.companyName}`), blank(`Authorised signatory: ${input.signatoryName}`), body(`Place: ${input.place}`),
];

const builders: Record<PracticeTemplateId, (input: PracticeTemplateInput) => Array<Paragraph | Table>> = {
  'directors-report': directorsReport,
  'board-minutes': boardMinutes,
  'agm-notice': agmNotice,
  'management-representation': managementRepresentation,
};

export const generatePracticeDocument = async (templateId: PracticeTemplateId, input: PracticeTemplateInput) => {
  if (!input.companyName.trim()) throw new Error('Please enter the company name.');
  if (input.cin && !/^[A-Z]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/.test(input.cin.toUpperCase())) throw new Error('Please enter a valid 21-character CIN.');
  if (!input.documentDate || Number.isNaN(Date.parse(input.documentDate))) throw new Error('Please enter a valid document date.');
  const document = new Document({ sections: [{ properties: {}, children: builders[templateId]({ ...input, companyName: input.companyName.trim(), cin: input.cin.toUpperCase() }) }] });
  const blob = await Packer.toBlob(document);
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = `${input.companyName.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}-${templateId}.docx`;
  anchor.click();
  URL.revokeObjectURL(url);
};
