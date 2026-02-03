import PDFDocument from 'pdfkit';

/**
 * Generate Invoice PDF Buffer
 * @param {Object} invoiceData - Invoice object populated with details
 * @returns {Promise<Buffer>} - PDF file as Buffer
 */
export const generateInvoicePDFBuffer = async (invoiceData) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(buffers);
            resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // --- PDF Generation Logic ---

        // 1. Header
        doc.fillColor('#444444')
            .fontSize(20)
            .text('SSVPL MLM Solutions', 50, 57)
            .fontSize(10)
            .text('GSTIN: 19XXXXXXXXXX', 50, 80)
            .text('Kolkata, West Bengal', 50, 95)
            .moveDown();

        // 2. Invoice Details
        doc.fontSize(20).text('INVOICE', 400, 57, { align: 'right' })
            .fontSize(10)
            .text(`Invoice No: ${invoiceData.invoiceNo}`, 400, 80, { align: 'right' })
            .text(`Date: ${new Date(invoiceData.invoiceDate).toLocaleDateString()}`, 400, 95, { align: 'right' })
            .moveDown();

        // 3. Bill To
        const delivery = invoiceData.deliveryAddress;
        doc.text(`Bill To:`, 50, 130)
            .font('Helvetica-Bold').text(delivery.franchiseName || 'Franchise', 50, 145)
            .font('Helvetica').text(delivery.shopName, 50, 160)
            .text(`${delivery.fullAddress}, ${delivery.city}`, 50, 175)
            .text(`${delivery.state} - ${delivery.pincode}`, 50, 190)
            .moveDown();

        // 4. Table Header
        const invoiceTableTop = 230;
        doc.font('Helvetica-Bold');
        generateTableRow(doc, invoiceTableTop, 'Item', 'HSN', 'Qty', 'Price', 'Amount');
        generateHr(doc, invoiceTableTop + 20);
        doc.font('Helvetica');

        // 5. Table Rows
        let i = 0;
        let position = 0;
        invoiceData.items.forEach(item => {
            position = invoiceTableTop + (i + 1) * 30;
            // Prevent page overflow simple check omitted for brevity (pdfkit handles new pages if careful, but for long lists need logic)
            generateTableRow(
                doc,
                position,
                item.product.productName || 'Product', // Ensure populated or handled
                item.hsnCode || 'N/A',
                item.quantity,
                `₹${item.productDP}`,
                `₹${item.amount}`
            );
            generateHr(doc, position + 20);
            i++;
        });

        // 6. Totals
        const subtotalPosition = invoiceTableTop + (i + 1) * 30 + 20;

        doc.font('Helvetica-Bold');
        doc.text('Subtotal:', 350, subtotalPosition)
            .text(`₹${invoiceData.subTotal}`, 450, subtotalPosition, { align: 'right' });

        doc.text(`GST (${invoiceData.gstRate}%):`, 350, subtotalPosition + 20)
            .text(`₹${invoiceData.gstAmount}`, 450, subtotalPosition + 20, { align: 'right' });

        doc.fontSize(14).text('Total:', 350, subtotalPosition + 45)
            .text(`₹${invoiceData.grandTotal}`, 450, subtotalPosition + 45, { align: 'right' });

        // 7. Footer
        doc.fontSize(10).text('Payment Terms: Net 15 Days', 50, 700, { align: 'center', width: 500 });

        doc.end();
    });
};

function generateTableRow(doc, y, item, hsn, qty, price, amount) {
    doc.fontSize(10)
        .text(item, 50, y, { width: 200 })
        .text(hsn, 260, y, { width: 50, align: 'right' })
        .text(qty, 320, y, { width: 50, align: 'right' })
        .text(price, 380, y, { width: 70, align: 'right' })
        .text(amount, 0, y, { align: 'right' }); // auto aligns to right margin
}

function generateHr(doc, y) {
    doc.strokeColor('#aaaaaa')
        .lineWidth(1)
        .moveTo(50, y)
        .lineTo(550, y)
        .stroke();
}
