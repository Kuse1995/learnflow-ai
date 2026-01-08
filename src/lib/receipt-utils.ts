import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FeeReceipt, StudentStatement } from '@/hooks/useFeeReceipts';
import { formatZMW } from './school-fees-system';

// =============================================================================
// RECEIPT PDF GENERATION
// =============================================================================

export function generateReceiptPDF(receipt: FeeReceipt): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5', // Smaller format for receipts
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = 20;

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(receipt.schoolNameSnapshot, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 8;
  doc.setFontSize(12);
  doc.text('OFFICIAL RECEIPT', pageWidth / 2, yPos, { align: 'center' });

  // Voided watermark
  if (receipt.voided) {
    doc.setTextColor(255, 0, 0);
    doc.setFontSize(40);
    doc.text('VOIDED', pageWidth / 2, 80, { align: 'center', angle: 45 });
    doc.setTextColor(0, 0, 0);
  }

  // Receipt details
  yPos += 12;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Receipt number and date
  doc.text(`Receipt No: ${receipt.receiptNumber}`, margin, yPos);
  doc.text(`Date: ${format(new Date(receipt.issuedAt), 'dd MMMM yyyy')}`, pageWidth - margin, yPos, { align: 'right' });

  // Divider
  yPos += 5;
  doc.setDrawColor(200);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  // Student info
  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Student Details', margin, yPos);
  
  yPos += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${receipt.studentNameSnapshot}`, margin, yPos);
  
  yPos += 5;
  doc.text(`Class: ${receipt.classNameSnapshot || 'N/A'}`, margin, yPos);
  doc.text(`Grade: ${receipt.gradeSnapshot || 'N/A'}`, margin + 60, yPos);

  yPos += 5;
  doc.text(`Academic Year: ${receipt.academicYear}`, margin, yPos);
  doc.text(`Term: ${receipt.term ? `Term ${receipt.term}` : 'Annual'}`, margin + 60, yPos);

  // Payment info
  yPos += 12;
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Details', margin, yPos);
  
  yPos += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Amount: ${formatZMW(receipt.amount)}`, margin, yPos);
  
  yPos += 5;
  doc.text(`Method: ${receipt.paymentMethod}`, margin, yPos);
  
  if (receipt.referenceNumber) {
    yPos += 5;
    doc.text(`Reference: ${receipt.referenceNumber}`, margin, yPos);
  }

  yPos += 5;
  doc.text(`Payment Date: ${format(new Date(receipt.paymentDate), 'dd MMMM yyyy')}`, margin, yPos);

  // Voided info
  if (receipt.voided) {
    yPos += 12;
    doc.setTextColor(255, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('RECEIPT VOIDED', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(`Reason: ${receipt.voidReason}`, margin, yPos);
    doc.text(`Date: ${receipt.voidedAt ? format(new Date(receipt.voidedAt), 'dd MMM yyyy') : 'N/A'}`, margin, yPos + 5);
    doc.setTextColor(0, 0, 0);
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text('Thank you for your payment.', pageWidth / 2, footerY, { align: 'center' });
  doc.text('Generated from School Management System', pageWidth / 2, footerY + 4, { align: 'center' });

  return doc;
}

export function downloadReceiptPDF(receipt: FeeReceipt): void {
  const doc = generateReceiptPDF(receipt);
  doc.save(`Receipt-${receipt.receiptNumber}.pdf`);
}

export function printReceipt(receipt: FeeReceipt): void {
  const doc = generateReceiptPDF(receipt);
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
}

// =============================================================================
// STATEMENT PDF GENERATION
// =============================================================================

export function generateStatementPDF(statement: StudentStatement, schoolName: string): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = 20;

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolName, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 8;
  doc.setFontSize(12);
  doc.text('FEE STATEMENT', pageWidth / 2, yPos, { align: 'center' });

  // Student info box
  yPos += 12;
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 25, 'F');

  yPos += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Student: ${statement.studentName}`, margin + 5, yPos);
  doc.text(`Class: ${statement.className || 'N/A'}`, margin + 90, yPos);

  yPos += 5;
  doc.text(`Grade: ${statement.grade || 'N/A'}`, margin + 5, yPos);
  doc.text(`Academic Year: ${statement.academicYear}`, margin + 90, yPos);

  yPos += 5;
  doc.text(`Period: ${format(new Date(statement.periodStart), 'dd MMM yyyy')} - ${format(new Date(statement.periodEnd), 'dd MMM yyyy')}`, margin + 5, yPos);
  if (statement.term) {
    doc.text(`Term: ${statement.term}`, margin + 90, yPos);
  }

  // Summary
  yPos += 15;
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', margin, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'normal');

  const summaryData = [
    ['Opening Balance', formatZMW(statement.openingBalance)],
    ['Total Charges', formatZMW(statement.totalCharges)],
    ['Total Payments', formatZMW(statement.totalPayments)],
    ['Closing Balance', formatZMW(statement.closingBalance)],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: summaryData,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { halign: 'right', cellWidth: 40 },
    },
    margin: { left: margin },
  });

  // Transaction table
  yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Transaction History', margin, yPos);

  const tableData = statement.entries.map(entry => [
    format(new Date(entry.date), 'dd/MM/yyyy'),
    entry.description,
    entry.reference || '-',
    entry.debit > 0 ? formatZMW(entry.debit) : '-',
    entry.credit > 0 ? formatZMW(entry.credit) : '-',
    formatZMW(entry.balance),
  ]);

  autoTable(doc, {
    startY: yPos + 4,
    head: [['Date', 'Description', 'Ref', 'Debit', 'Credit', 'Balance']],
    body: tableData,
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [66, 66, 66] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 55 },
      2: { cellWidth: 25 },
      3: { halign: 'right', cellWidth: 25 },
      4: { halign: 'right', cellWidth: 25 },
      5: { halign: 'right', cellWidth: 25 },
    },
    margin: { left: margin, right: margin },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(`Generated on ${format(new Date(), 'dd MMM yyyy HH:mm')}`, margin, footerY);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, footerY, { align: 'right' });
  }

  return doc;
}

export function downloadStatementPDF(statement: StudentStatement, schoolName: string): void {
  const doc = generateStatementPDF(statement, schoolName);
  doc.save(`Statement-${statement.studentName.replace(/\s+/g, '_')}-${statement.academicYear}.pdf`);
}

// =============================================================================
// CSV EXPORT
// =============================================================================

export function generatePaymentsCSV(payments: Array<{
  entry_date: string;
  description: string;
  credit_amount: number;
  reference_number: string | null;
  students: { name: string } | null;
}>): string {
  const headers = ['Date', 'Student Name', 'Amount (ZMW)', 'Description', 'Reference'];
  
  const rows = payments.map(p => [
    p.entry_date,
    p.students?.name || 'Unknown',
    Number(p.credit_amount).toFixed(2),
    p.description,
    p.reference_number || '',
  ]);

  return [headers.join(','), ...rows.map(r => r.map(escapeCSV).join(','))].join('\n');
}

export function generateOutstandingBalancesCSV(balances: Array<{
  studentName: string;
  className: string;
  grade: string;
  totalCharges: number;
  totalPayments: number;
  outstandingBalance: number;
}>): string {
  const headers = ['Student Name', 'Class', 'Grade', 'Total Charges (ZMW)', 'Total Payments (ZMW)', 'Outstanding Balance (ZMW)'];
  
  const rows = balances.map(b => [
    b.studentName,
    b.className,
    b.grade,
    b.totalCharges.toFixed(2),
    b.totalPayments.toFixed(2),
    b.outstandingBalance.toFixed(2),
  ]);

  return [headers.join(','), ...rows.map(r => r.map(escapeCSV).join(','))].join('\n');
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
