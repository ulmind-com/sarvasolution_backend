/**
 * GST Calculator Service
 * Standardizes tax calculations across the system.
 */
class GSTCalculator {
    /**
     * Calculate GST breakdown for a given base price
     * @param {number} basePrice - Price EXCLUDING GST
     * @param {number} gstRate - Tax rate percentage (e.g., 18)
     * @returns {Object} { cgstRate, sgstRate, igstRate, cgstAmount, sgstAmount, totalGst, finalPrice }
     */
    static calculate(basePrice, gstRate) {
        const rate = Number(gstRate) || 0;
        const price = Number(basePrice) || 0;

        // Intra-state split (Standard assumption for local sales unless state specified)
        const cgstRate = rate / 2;
        const sgstRate = rate / 2;
        const igstRate = rate; // Used for inter-state

        const totalGstAmount = (price * rate) / 100;
        const cgstAmount = totalGstAmount / 2;
        const sgstAmount = totalGstAmount / 2;

        const finalPrice = price + totalGstAmount;

        return {
            basePriceExGST: price,
            gstRate: rate,
            cgstRate,
            sgstRate,
            igstRate, // For reference
            cgstAmount: Number(cgstAmount.toFixed(2)),
            sgstAmount: Number(sgstAmount.toFixed(2)),
            gstAmount: Number(totalGstAmount.toFixed(2)),
            finalPriceIncGST: Number(finalPrice.toFixed(2))
        };
    }
}

export default GSTCalculator;
