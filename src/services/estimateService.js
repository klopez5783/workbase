import { firestoreService } from './firestoreService';

export const estimatesService = {
  // Generate estimate number
  generateEstimateNumber: async (companyId) => {
    const result = await firestoreService.getAll('estimates');
    if (result.success) {
      const companyEstimates = result.data.filter(
        est => est.companyId === companyId
      );
      const count = companyEstimates.length + 1;
      return `EST-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;
    }
    return `EST-${new Date().getFullYear()}-001`;
  },

  // Calculate totals for simple estimate
  calculateSimpleTotals: (lineItems, taxRate, discountAmount) => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
    const grandTotal = subtotal - discountAmount + taxAmount;
    
    return { subtotal, taxAmount, grandTotal };
  },

  // Calculate totals for detailed estimate
  calculateDetailedTotals: (lineItems, taxRate, discountAmount) => {
    const materialGrandTotal = lineItems.reduce((sum, item) => sum + (item.materialCost || 0), 0);
    const laborGrandTotal = lineItems.reduce((sum, item) => sum + (item.laborCost || 0), 0);
    const subtotal = materialGrandTotal + laborGrandTotal;
    const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
    const grandTotal = subtotal - discountAmount + taxAmount;
    
    return { materialGrandTotal, laborGrandTotal, subtotal, taxAmount, grandTotal };
  }
};