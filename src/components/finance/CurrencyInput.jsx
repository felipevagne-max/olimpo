import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

export default function CurrencyInput({ value, onChange, className, ...props }) {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    if (value === '' || value === null || value === undefined) {
      setDisplayValue('');
    } else {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (!isNaN(numValue)) {
        setDisplayValue(formatCurrency(numValue));
      }
    }
  }, [value]);

  const formatCurrency = (num) => {
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handleChange = (e) => {
    let input = e.target.value;
    
    // Remove tudo que não é dígito
    input = input.replace(/\D/g, '');
    
    if (input === '') {
      setDisplayValue('');
      onChange({ target: { value: '' } });
      return;
    }
    
    // Converte para centavos e depois para reais
    const cents = parseInt(input, 10);
    const reais = cents / 100;
    
    setDisplayValue(formatCurrency(reais));
    onChange({ target: { value: reais.toString() } });
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA0A6] text-sm pointer-events-none">
        R$
      </span>
      <Input
        {...props}
        type="text"
        value={displayValue}
        onChange={handleChange}
        className={`pl-10 ${className}`}
        inputMode="numeric"
      />
    </div>
  );
}