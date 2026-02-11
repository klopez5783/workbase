import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Helper to safely parse Firestore timestamps or date strings
const parseDate = (date) => {
  if (!date) return new Date();

  // Firestore Timestamp object
  if (date?.seconds) return new Date(date.seconds * 1000);

  // Already a Date object
  if (date instanceof Date) return date;

  // String or number
  return new Date(date);
};

export const estimatePDFService = {
  generateEstimatePDF: (estimate, companyInfo = {}) => {
    const doc = new jsPDF("p", "mm", "a4"); // Use mm units
    const pageWidth = doc.internal.pageSize.width; // 210mm
    const pageHeight = doc.internal.pageSize.height; // 297mm

    // Colors
    const primaryColor = [37, 99, 235];
    const grayColor = [107, 114, 128];
    const lightGray = [243, 244, 246];
    const darkColor = [17, 24, 39];

    // ─── HEADER BACKGROUND ────────────────────────────
    doc.setFillColor(240, 240, 240);
    doc.rect(0, 0, pageWidth, 40, "F");

    // Logo (top left)
    doc.setFontSize(9);
    doc.setTextColor(...grayColor);
    doc.text("YOUR", 15, 12);
    doc.text("LOGO", 15, 17);

    // Estimate Number (top right)
    doc.setFontSize(9);
    doc.setTextColor(...grayColor);
    doc.text(`NO. ${estimate.estimateNumber || "DRAFT"}`, pageWidth - 15, 12, {
      align: "right",
    });

    // Big ESTIMATE title
    doc.setFontSize(28);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...darkColor);
    doc.text("ESTIMATE", 15, 33);

    // ─── DATE ─────────────────────────────────────────
    let yPos = 52;
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...darkColor);
    doc.text("Date:", 15, yPos);
    doc.setFont(undefined, "normal");
    doc.setTextColor(...grayColor);
    doc.text(
      parseDate(estimate.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      30,
      yPos,
    );

    // ─── BILLED TO / FROM ─────────────────────────────
    yPos += 12;
    const leftCol = 15;
    const rightCol = pageWidth / 2 + 5;

    // Billed To header
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...darkColor);
    doc.text("Billed to:", leftCol, yPos);

    // From header
    doc.text("From:", rightCol, yPos);

    // Billed To content
    doc.setFont(undefined, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...grayColor);

    let leftY = yPos + 6;
    doc.text(estimate.clientName || "", leftCol, leftY);
    if (estimate.clientAddress) {
      leftY += 5;
      doc.text(estimate.clientAddress, leftCol, leftY);
    }
    if (estimate.clientEmail) {
      leftY += 5;
      doc.text(estimate.clientEmail, leftCol, leftY);
    }
    if (estimate.clientPhone) {
      leftY += 5;
      doc.text(estimate.clientPhone, leftCol, leftY);
    }

    // From content
    let rightY = yPos + 6;
    doc.text(companyInfo.name || "Your Company", rightCol, rightY);
    if (companyInfo.address) {
      rightY += 5;
      doc.text(companyInfo.address, rightCol, rightY);
    }
    if (companyInfo.email) {
      rightY += 5;
      doc.text(companyInfo.email, rightCol, rightY);
    }
    if (companyInfo.phone) {
      rightY += 5;
      doc.text(companyInfo.phone, rightCol, rightY);
    }

    // Move yPos past the tallest column
    yPos = Math.max(leftY, rightY) + 10;

    // ─── PROJECT INFO ─────────────────────────────────
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...darkColor);
    doc.text("Project:", leftCol, yPos);
    doc.setFont(undefined, "normal");
    doc.setTextColor(...grayColor);
    doc.text(estimate.projectName || "", leftCol + 22, yPos);

    if (estimate.projectDescription) {
      yPos += 5;
      doc.setFontSize(9);
      const splitDescription = doc.splitTextToSize(
        estimate.projectDescription,
        pageWidth - 30,
      );
      doc.text(splitDescription, leftCol, yPos);
      yPos += splitDescription.length * 4.5;
    }

    // ─── LINE ITEMS TABLE ─────────────────────────────
    yPos += 8;

    let tableHeaders, tableData;

    if (estimate.estimateType === "simple") {
      tableHeaders = ["Item", "Qty", "Unit", "Price", "Amount"];
      tableData = estimate.lineItems.map((item) => [
        item.description + (item.notes ? `\n  ${item.notes}` : ""),
        item.quantity,
        item.unit,
        `$${item.unitPrice.toFixed(2)}`,
        `$${item.total.toFixed(2)}`,
      ]);
    } else {
      tableHeaders = ["Item", "Material", "Labor", "Amount"];
      tableData = estimate.lineItems.map((item) => [
        item.description + (item.notes ? `\n  ${item.notes}` : ""),
        `$${item.materialCost.toFixed(2)}`,
        `$${item.laborCost.toFixed(2)}`,
        `$${item.itemTotal.toFixed(2)}`,
      ]);
    }

    autoTable(doc, {
      startY: yPos,
      head: [tableHeaders],
      body: tableData,
      theme: "plain",
      headStyles: {
        fillColor: lightGray,
        textColor: darkColor,
        fontStyle: "bold",
        fontSize: 9,
        cellPadding: 4,
      },
      bodyStyles: {
        textColor: grayColor,
        fontSize: 9,
        cellPadding: 4,
      },
      columnStyles:
        estimate.estimateType === "simple"
          ? {
              0: { cellWidth: 75 },
              1: { cellWidth: 20, halign: "center" },
              2: { cellWidth: 20, halign: "center" },
              3: { cellWidth: 30, halign: "right" },
              4: { cellWidth: 30, halign: "right" },
            }
          : {
              0: { cellWidth: 90 },
              1: { cellWidth: 30, halign: "right" },
              2: { cellWidth: 30, halign: "right" },
              3: { cellWidth: 30, halign: "right" },
            },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      margin: { left: 15, right: 15 },
    });

    // ─── TOTALS ───────────────────────────────────────
    yPos = doc.lastAutoTable.finalY + 8;
    const totalsLabelX = pageWidth - 55;
    const totalsValueX = pageWidth - 15;

    doc.setFontSize(9);
    doc.setTextColor(...grayColor);

    // Subtotal
    doc.text("Subtotal:", totalsLabelX, yPos, { align: "right" });
    doc.text(
      `$${estimate.subtotal?.toFixed(2) || "0.00"}`,
      totalsValueX,
      yPos,
      { align: "right" },
    );

    // Detailed breakdown
    if (estimate.estimateType === "detailed") {
      yPos += 6;
      doc.text("Materials:", totalsLabelX, yPos, { align: "right" });
      doc.text(
        `$${estimate.materialGrandTotal?.toFixed(2) || "0.00"}`,
        totalsValueX,
        yPos,
        { align: "right" },
      );
      yPos += 5;
      doc.text("Labor:", totalsLabelX, yPos, { align: "right" });
      doc.text(
        `$${estimate.laborGrandTotal?.toFixed(2) || "0.00"}`,
        totalsValueX,
        yPos,
        { align: "right" },
      );
    }

    // Discount
    if (estimate.discountAmount > 0) {
      yPos += 6;
      doc.text("Discount:", totalsLabelX, yPos, { align: "right" });
      doc.text(`-$${estimate.discountAmount.toFixed(2)}`, totalsValueX, yPos, {
        align: "right",
      });
    }

    // Tax
    yPos += 6;
    doc.text(`Tax (${estimate.taxRate}%):`, totalsLabelX, yPos, {
      align: "right",
    });
    doc.text(
      `$${estimate.taxAmount?.toFixed(2) || "0.00"}`,
      totalsValueX,
      yPos,
      { align: "right" },
    );

    // Divider line above total
    yPos += 4;
    doc.setDrawColor(...lightGray);
    doc.line(totalsLabelX - 20, yPos, totalsValueX, yPos);

    // Grand Total
    yPos += 7;
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...darkColor);
    doc.text("Total:", totalsLabelX, yPos, { align: "right" });
    doc.setTextColor(...primaryColor);
    doc.text(
      `$${estimate.grandTotal?.toFixed(2) || "0.00"}`,
      totalsValueX,
      yPos,
      { align: "right" },
    );

    // ─── DIVIDER ──────────────────────────────────────
    yPos += 10;
    doc.setDrawColor(229, 231, 235);
    doc.line(15, yPos, pageWidth - 15, yPos);

    // ─── PAYMENT METHOD / TERMS ───────────────────────
    yPos += 8;
    if (estimate.terms.paymentTerms) {
      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.setTextColor(...darkColor);
      doc.text("Payment method:", 15, yPos);
      doc.setFont(undefined, "normal");
      doc.setTextColor(...grayColor);
      doc.text(estimate.terms.paymentTerms, 55, yPos);
      yPos += 7;
    }

    // ─── TERMS & CONDITIONS ───────────────────────────
    if (
      estimate.terms.isNonBinding ||
      estimate.terms.changesMayAffectPricing ||
      estimate.terms.approvalConstitutesAgreement
    ) {
      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.setTextColor(...darkColor);
      doc.text("Note:", 15, yPos);
      doc.setFont(undefined, "normal");
      doc.setTextColor(...grayColor);
      doc.setFontSize(9);

      let noteText = [];
      if (estimate.terms.isNonBinding)
        noteText.push(
          "This estimate is non-binding and subject to final inspection.",
        );
      if (estimate.terms.changesMayAffectPricing)
        noteText.push(
          "Changes to scope or materials may affect final pricing.",
        );
      if (estimate.terms.approvalConstitutesAgreement)
        noteText.push(
          "Approval of this estimate constitutes agreement to proceed.",
        );
      if (estimate.terms.customTerms) noteText.push(estimate.terms.customTerms);

      doc.text(noteText.join(" "), 30, yPos, {
        maxWidth: pageWidth - 45,
      });

      yPos += Math.ceil(noteText.join(" ").length / 80) * 5 + 5;
    }

    // ─── VALID UNTIL ──────────────────────────────────
    yPos += 3;
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...darkColor);
    doc.text("Valid Until:", 15, yPos);
    doc.setFont(undefined, "normal");
    doc.setTextColor(...grayColor);
    // Date line (~line 52)
    doc.text(
      parseDate(estimate.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      30,
      yPos,
    );

    // ─── FOOTER ───────────────────────────────────────
    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200);
    doc.text(
      `Generated on ${parseDate(new Date()).toLocaleDateString()} | ${estimate.estimateNumber || "DRAFT"}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" },
    );

    return doc;
  },

  downloadPDF: (estimate, companyInfo) => {
    const doc = estimatePDFService.generateEstimatePDF(estimate, companyInfo);
    doc.save(`${estimate.estimateNumber || "estimate"}.pdf`);
  },

  previewPDF: (estimate, companyInfo) => {
    const doc = estimatePDFService.generateEstimatePDF(estimate, companyInfo);
    const pdfBlob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, "_blank");
  },
};
