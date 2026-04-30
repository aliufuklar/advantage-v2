import { useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import type { QuotePDFData } from '@/types';

interface PDFPreviewProps {
  data: QuotePDFData;
  onClose: () => void;
}

export function PDFPreview({ data, onClose }: PDFPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      const doc = new jsPDF();

      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('TEKLİF', 20, 25);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(data.companyName, 20, 32);
      if (data.companyAddress) {
        doc.text(data.companyAddress, 20, 37);
      }
      if (data.companyPhone) {
        doc.text(`Tel: ${data.companyPhone}`, 20, 42);
      }
      if (data.companyEmail) {
        doc.text(`E-posta: ${data.companyEmail}`, 20, 47);
      }

      // Quote number and date on right
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Teklif No: ${data.quoteNumber}`, 140, 25);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tarih: ${data.date}`, 140, 32);
      if (data.validUntil) {
        doc.text(`Geçerlilik: ${data.validUntil}`, 140, 38);
      }

      // Line under header
      doc.setLineWidth(0.5);
      doc.line(20, 52, 190, 52);

      // Customer info
      let y = 62;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('MÜŞTERİ BİLGİLERİ', 20, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      if (data.customerName) {
        doc.text(`Ad: ${data.customerName}`, 20, y);
        y += 6;
      }
      if (data.customerEmail) {
        doc.text(`E-posta: ${data.customerEmail}`, 20, y);
        y += 6;
      }
      if (data.customerPhone) {
        doc.text(`Telefon: ${data.customerPhone}`, 20, y);
        y += 6;
      }
      if (data.customerAddress) {
        doc.text(`Adres: ${data.customerAddress}`, 20, y);
        y += 6;
      }

      y += 5;

      // Items table header
      doc.setFillColor(240, 240, 240);
      doc.rect(20, y, 170, 8, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Açıklama', 22, y + 6);
      doc.text('Miktar', 95, y + 6);
      doc.text('Birim', 115, y + 6);
      doc.text('B.Fiyat', 130, y + 6);
      doc.text('İskonto', 150, y + 6);
      doc.text('Toplam', 170, y + 6);

      y += 10;

      // Items
      doc.setFont('helvetica', 'normal');
      const pageWidth = doc.internal.pageSize.getWidth();

      data.items.forEach((item, index) => {
        const rowY = y + (index * 10);

        // Check if we need a new page
        if (rowY > 270) {
          doc.addPage();
          y = 20;
        }

        doc.text(item.description.substring(0, 40), 22, rowY);
        doc.text(String(item.quantity), 95, rowY);
        doc.text(item.unit, 115, rowY);
        doc.text(item.unitPrice.toFixed(2), 130, rowY);
        doc.text(item.discount.toFixed(2), 150, rowY);
        doc.text(item.total.toFixed(2), 170, rowY);
      });

      y = y + (data.items.length * 10) + 5;

      // Line before totals
      doc.line(120, y, 190, y);
      y += 8;

      // Totals
      doc.setFontSize(10);
      const currency = data.currency === 'TRY' ? ' ₺' : data.currency === 'EUR' ? ' €' : ' $';

      doc.text('Ara Toplam:', 140, y);
      doc.text(`${data.subtotal.toFixed(2)}${currency}`, 170, y);
      y += 6;

      doc.text(`KDV (${data.taxRate}%):`, 140, y);
      doc.text(`${data.taxAmount.toFixed(2)}${currency}`, 170, y);
      y += 6;

      doc.setFont('helvetica', 'bold');
      doc.text('GENEL TOPLAM:', 140, y);
      doc.text(`${data.total.toFixed(2)}${currency}`, 170, y);

      y += 15;

      // Notes
      if (data.notes) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Notlar:', 20, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        const lines = doc.splitTextToSize(data.notes, 170);
        doc.text(lines, 20, y);
      }

      // Footer
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text('Bu teklif geçerlilik süresi boyunca bağlayıcıdır.', pageWidth / 2, pageHeight - 15, { align: 'center' });
      doc.text(`${data.companyName} - ${data.companyAddress || ''}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Generate preview
      const pdfUrl = doc.output('datauristring');
      const iframe = document.createElement('iframe');
      iframe.src = pdfUrl;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      containerRef.current.appendChild(iframe);
    }
  }, [data]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] flex flex-col m-4">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Teklif Önizleme - {data.quoteNumber}</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                const doc = new jsPDF();
                doc.save(`Teklif_${data.quoteNumber}.pdf`);
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              İndir
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              Kapat
            </button>
          </div>
        </div>
        <div ref={containerRef} className="flex-1 p-4 overflow-auto bg-gray-100" />
      </div>
    </div>
  );
}

export function generatePDF(data: QuotePDFData): jsPDF {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('TEKLİF', 20, 25);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.companyName, 20, 32);
  if (data.companyAddress) doc.text(data.companyAddress, 20, 37);
  if (data.companyPhone) doc.text(`Tel: ${data.companyPhone}`, 20, 42);
  if (data.companyEmail) doc.text(`E-posta: ${data.companyEmail}`, 20, 47);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Teklif No: ${data.quoteNumber}`, 140, 25);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tarih: ${data.date}`, 140, 32);
  if (data.validUntil) doc.text(`Geçerlilik: ${data.validUntil}`, 140, 38);

  doc.setLineWidth(0.5);
  doc.line(20, 52, 190, 52);

  // Customer info
  let y = 62;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('MÜŞTERİ BİLGİLERİ', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (data.customerName) { doc.text(`Ad: ${data.customerName}`, 20, y); y += 6; }
  if (data.customerEmail) { doc.text(`E-posta: ${data.customerEmail}`, 20, y); y += 6; }
  if (data.customerPhone) { doc.text(`Telefon: ${data.customerPhone}`, 20, y); y += 6; }
  if (data.customerAddress) { doc.text(`Adres: ${data.customerAddress}`, 20, y); y += 6; }

  y += 5;

  // Items table header
  doc.setFillColor(240, 240, 240);
  doc.rect(20, y, 170, 8, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Açıklama', 22, y + 6);
  doc.text('Miktar', 95, y + 6);
  doc.text('Birim', 115, y + 6);
  doc.text('B.Fiyat', 130, y + 6);
  doc.text('İskonto', 150, y + 6);
  doc.text('Toplam', 170, y + 6);

  y += 10;

  doc.setFont('helvetica', 'normal');
  const currency = data.currency === 'TRY' ? ' ₺' : data.currency === 'EUR' ? ' €' : ' $';

  data.items.forEach((item, index) => {
    const rowY = y + (index * 10);
    if (rowY > 270) { doc.addPage(); y = 20; }
    doc.text(item.description.substring(0, 40), 22, rowY);
    doc.text(String(item.quantity), 95, rowY);
    doc.text(item.unit, 115, rowY);
    doc.text(item.unitPrice.toFixed(2), 130, rowY);
    doc.text(item.discount.toFixed(2), 150, rowY);
    doc.text(item.total.toFixed(2), 170, rowY);
  });

  y = y + (data.items.length * 10) + 5;
  doc.line(120, y, 190, y);
  y += 8;

  doc.setFontSize(10);
  doc.text('Ara Toplam:', 140, y);
  doc.text(`${data.subtotal.toFixed(2)}${currency}`, 170, y);
  y += 6;
  doc.text(`KDV (${data.taxRate}%):`, 140, y);
  doc.text(`${data.taxAmount.toFixed(2)}${currency}`, 170, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('GENEL TOPLAM:', 140, y);
  doc.text(`${data.total.toFixed(2)}${currency}`, 170, y);

  y += 15;

  if (data.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Notlar:', 20, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(data.notes, 170);
    doc.text(lines, 20, y);
  }

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text('Bu teklif geçerlilik süresi boyunca bağlayıcıdır.', doc.internal.pageSize.getWidth() / 2, pageHeight - 15, { align: 'center' });
  doc.text(`${data.companyName} - ${data.companyAddress || ''}`, doc.internal.pageSize.getWidth() / 2, pageHeight - 10, { align: 'center' });

  return doc;
}