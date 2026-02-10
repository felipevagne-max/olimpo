/**
 * Formata um número para moeda brasileira (R$ X.XXX,XX)
 * @param {number} value - Valor numérico
 * @returns {string} Valor formatado em R$
 */
export function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0,00';
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  return numValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}