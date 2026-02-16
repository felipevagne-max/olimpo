import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, addMonths } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import OlimpoInput from '../olimpo/OlimpoInput';
import OlimpoButton from '../olimpo/OlimpoButton';
import CurrencyInput from './CurrencyInput';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function QuickExpenseSheet({ open, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    payeeName: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    status: 'pago',
    planType: 'PREVISTO',
    categoryId: '',
    isRecurring: false,
    recurringFrequency: 'monthly'
  });
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Category.filter({ created_by: user.email });
    },
    enabled: !!user?.email
  });

  useEffect(() => {
    if (!open) {
      setFormData({
        title: '',
        amount: '',
        payeeName: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        status: 'pago',
        planType: 'PREVISTO',
        categoryId: '',
        isRecurring: false,
        recurringFrequency: 'monthly'
      });
      setCategorySearch('');
    }
  }, [open]);

  const createCategoryMutation = useMutation({
    mutationFn: (name) => base44.entities.Category.create({ name, type: 'expense' }),
    onSuccess: (newCategory) => {
      queryClient.invalidateQueries(['categories']);
      setFormData(prev => ({ ...prev, categoryId: newCategory.id }));
      setCategoryOpen(false);
      setCategorySearch('');
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const isPaid = data.status === 'pago';
      const recurringGroupId = data.isRecurring ? crypto.randomUUID() : null;
      
      const baseExpense = {
        title: data.title,
        amount: parseFloat(data.amount),
        date: data.date,
        type: 'despesa',
        status: data.status,
        paymentMethod: 'debit_pix',
        planType: data.planType,
        paid_at: isPaid ? new Date().toISOString() : null,
        payeeName: data.payeeName || null,
        categoryId: data.categoryId || null,
        isRecurring: data.isRecurring,
        recurringFrequency: data.isRecurring ? data.recurringFrequency : null,
        recurringGroupId: recurringGroupId,
        recurringAnchorDay: data.isRecurring ? new Date(data.date).getDate() : null
      };

      // Create main expense
      await base44.entities.Expense.create(baseExpense);

      // If recurring, create next 6 months
      if (data.isRecurring && data.recurringFrequency === 'monthly') {
        const promises = [];
        for (let i = 1; i <= 6; i++) {
          const nextDate = addMonths(new Date(data.date), i);
          const anchorDay = new Date(data.date).getDate();
          const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
          const adjustedDay = Math.min(anchorDay, lastDayOfMonth);
          nextDate.setDate(adjustedDay);

          promises.push(
            base44.entities.Expense.create({
              ...baseExpense,
              date: format(nextDate, 'yyyy-MM-dd'),
              status: 'programado',
              paid_at: null,
              recurringGroupId: recurringGroupId
            })
          );
        }
        await Promise.all(promises);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      toast.success('Despesa registrada!');
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.amount || !formData.date || !formData.status || !formData.planType) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleCreateCategory = () => {
    if (categorySearch.trim()) {
      createCategoryMutation.mutate(categorySearch.trim());
    }
  };

  const selectedCategory = categories.find(c => c.id === formData.categoryId);
  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="bg-[#0B0F0C] border-t border-[rgba(255,59,59,0.3)] rounded-t-2xl"
      >
        <SheetHeader className="pb-4">
          <SheetTitle 
            className="text-lg text-[#FF3B3B]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Nova Despesa (Débito/Pix)
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-[#9AA0A6] text-xs">Valor *</Label>
            <CurrencyInput
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0,00"
              className="bg-[#070A08] border-[rgba(255,59,59,0.3)] text-[#E8E8E8] placeholder:text-[#9AA0A6] focus:border-[#FF3B3B]"
              required
              autoFocus
            />
          </div>

          <div>
            <Label className="text-[#9AA0A6] text-xs">Compra *</Label>
            <OlimpoInput
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: mercado, gasolina, farmácia"
              required
            />
          </div>

          <div>
            <Label className="text-[#9AA0A6] text-xs">Observações</Label>
            <OlimpoInput
              value={formData.payeeName}
              onChange={(e) => setFormData(prev => ({ ...prev, payeeName: e.target.value }))}
              placeholder="Notas adicionais..."
            />
          </div>

          <div>
            <Label className="text-[#9AA0A6] text-xs">Data do pagamento *</Label>
            <OlimpoInput
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label className="text-[#9AA0A6] text-xs">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}
            >
              <SelectTrigger className="bg-[#070A08] border-[rgba(255,59,59,0.3)] text-[#E8E8E8]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0B0F0C] border-[rgba(255,59,59,0.3)]">
                <SelectItem value="pago" className="text-[#E8E8E8]">PAGO</SelectItem>
                <SelectItem value="programado" className="text-[#E8E8E8]">PROGRAMADO</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[#9AA0A6] text-xs">Tipo de gasto *</Label>
            <Select
              value={formData.planType}
              onValueChange={(v) => setFormData(prev => ({ ...prev, planType: v }))}
            >
              <SelectTrigger className="bg-[#070A08] border-[rgba(255,59,59,0.3)] text-[#E8E8E8]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0B0F0C] border-[rgba(255,59,59,0.3)]">
                <SelectItem value="PREVISTO" className="text-[#E8E8E8]">Programado</SelectItem>
                <SelectItem value="IMPREVISTO" className="text-[#E8E8E8]">Não Programado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[#9AA0A6] text-xs">Categoria (opcional)</Label>
            <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
              <PopoverTrigger asChild>
                <button
                  className="w-full flex items-center justify-between px-3 py-2 bg-[#070A08] border border-[rgba(255,59,59,0.3)] rounded-lg text-[#E8E8E8] text-sm hover:bg-[#0B0F0C] transition-colors"
                >
                  <span className={!selectedCategory ? 'text-[#9AA0A6]' : ''}>
                    {selectedCategory ? selectedCategory.name : 'Selecione...'}
                  </span>
                  <ChevronsUpDown className="w-4 h-4 text-[#9AA0A6]" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-[#0B0F0C] border-[rgba(255,59,59,0.3)]" align="start">
                <Command className="bg-[#0B0F0C]">
                  <CommandInput 
                    placeholder="Buscar ou criar..." 
                    value={categorySearch}
                    onValueChange={setCategorySearch}
                    className="bg-[#070A08] border-0 text-[#E8E8E8]"
                  />
                  <CommandEmpty className="py-3 px-3 text-sm text-[#9AA0A6]">
                    <button
                      onClick={handleCreateCategory}
                      className="w-full flex items-center gap-2 text-[#00FF66] hover:bg-[rgba(0,255,102,0.1)] p-2 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Criar categoria "{categorySearch}"</span>
                    </button>
                  </CommandEmpty>
                  <CommandGroup className="max-h-48 overflow-y-auto">
                    {filteredCategories.map((category) => (
                      <CommandItem
                        key={category.id}
                        onSelect={() => {
                          setFormData(prev => ({ ...prev, categoryId: category.id }));
                          setCategoryOpen(false);
                        }}
                        className="text-[#E8E8E8] cursor-pointer hover:bg-[rgba(0,255,102,0.1)]"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formData.categoryId === category.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {category.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="p-3 bg-[#070A08] rounded-lg border border-[rgba(255,59,59,0.18)]">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-[#9AA0A6] text-xs">Gasto recorrente</Label>
              <Switch
                checked={formData.isRecurring}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, isRecurring: v }))}
                className="data-[state=checked]:bg-[#00FF66]"
              />
            </div>
            {formData.isRecurring && (
              <div className="mt-3">
                <Label className="text-[#9AA0A6] text-xs mb-2 block">Frequência</Label>
                <Select
                  value={formData.recurringFrequency}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, recurringFrequency: v }))}
                >
                  <SelectTrigger className="bg-[#0B0F0C] border-[rgba(255,59,59,0.3)] text-[#E8E8E8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B0F0C] border-[rgba(255,59,59,0.3)]">
                    <SelectItem value="monthly" className="text-[#E8E8E8]">Mensal</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-[#9AA0A6] mt-2">
                  Serão criados lançamentos programados para os próximos 6 meses
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <OlimpoButton
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onClose}
            >
              Cancelar
            </OlimpoButton>
            <OlimpoButton
              type="submit"
              className="flex-1 bg-[#FF3B3B] hover:bg-[#DD2B2B]"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Salvando...' : 'Salvar'}
            </OlimpoButton>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}