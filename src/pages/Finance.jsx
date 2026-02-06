import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import BottomNav from '@/components/olimpo/BottomNav';
import TopBar from '@/components/olimpo/TopBar';
import OlimpoCard from '@/components/olimpo/OlimpoCard';
import OlimpoButton from '@/components/olimpo/OlimpoButton';
import OlimpoInput from '@/components/olimpo/OlimpoInput';
import LoadingSpinner from '@/components/olimpo/LoadingSpinner';
import EmptyState from '@/components/olimpo/EmptyState';
import { Plus, Wallet, TrendingDown, DollarSign, Trash2, ShoppingCart, Home, Car, Utensils, Heart, Smartphone, MoreHorizontal } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CATEGORIES = [
  { value: 'alimentacao', label: 'Alimentação', icon: Utensils },
  { value: 'transporte', label: 'Transporte', icon: Car },
  { value: 'moradia', label: 'Moradia', icon: Home },
  { value: 'compras', label: 'Compras', icon: ShoppingCart },
  { value: 'saude', label: 'Saúde', icon: Heart },
  { value: 'tecnologia', label: 'Tecnologia', icon: Smartphone },
  { value: 'outros', label: 'Outros', icon: MoreHorizontal },
];

export default function Finance() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'outros',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const currentMonth = new Date();
  const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date')
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create({
      ...data,
      amount: parseFloat(data.amount) || 0
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      setShowModal(false);
      setFormData({
        title: '',
        amount: '',
        category: 'outros',
        date: format(new Date(), 'yyyy-MM-dd')
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      setDeleteId(null);
    }
  });

  const monthExpenses = expenses.filter(e => {
    const expDate = e.date;
    return expDate >= monthStart && expDate <= monthEnd;
  });

  const totalMonth = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const expensesByCategory = monthExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + (e.amount || 0);
    return acc;
  }, {});

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.amount) return;
    createExpenseMutation.mutate(formData);
  };

  const getCategoryIcon = (category) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat?.icon || MoreHorizontal;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      <TopBar />
      <div className="px-4 pt-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1 
            className="text-xl font-bold text-[#00FF66]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            FINANÇAS
          </h1>
          <OlimpoButton onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Despesa
          </OlimpoButton>
        </div>
        <p className="text-[#9AA0A6] text-sm mb-6">Controle seus gastos.</p>

        {/* Month Summary */}
        <OlimpoCard className="mb-6" glow>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[rgba(255,59,59,0.15)] flex items-center justify-center">
              <TrendingDown className="w-7 h-7 text-[#FF3B3B]" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-[#9AA0A6]">
                Total de {format(currentMonth, 'MMMM', { locale: ptBR })}
              </p>
              <p className="text-2xl font-bold text-[#FF3B3B]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                R$ {totalMonth.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#9AA0A6]">Despesas</p>
              <p className="text-lg font-bold text-[#E8E8E8]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {monthExpenses.length}
              </p>
            </div>
          </div>
        </OlimpoCard>

        {/* Categories Breakdown */}
        {Object.keys(expensesByCategory).length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {CATEGORIES.filter(c => expensesByCategory[c.value]).map(cat => {
              const Icon = cat.icon;
              const amount = expensesByCategory[cat.value] || 0;
              const percent = totalMonth > 0 ? (amount / totalMonth) * 100 : 0;
              
              return (
                <OlimpoCard key={cat.value} className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-[#00FF66]" />
                    <span className="text-xs text-[#9AA0A6]">{cat.label}</span>
                  </div>
                  <p className="text-sm font-bold text-[#E8E8E8]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    R$ {amount.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-[#9AA0A6]">{percent.toFixed(0)}%</p>
                </OlimpoCard>
              );
            })}
          </div>
        )}

        {/* Expenses List */}
        <h2 className="text-sm font-semibold text-[#E8E8E8] mb-3" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          Despesas do Mês
        </h2>

        {monthExpenses.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Nenhuma despesa registrada"
            description="Adicione sua primeira despesa do mês."
            actionLabel="Adicionar Despesa"
            onAction={() => setShowModal(true)}
          />
        ) : (
          <div className="space-y-2">
            {monthExpenses.map(expense => {
              const Icon = getCategoryIcon(expense.category);
              
              return (
                <OlimpoCard key={expense.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[rgba(0,255,102,0.1)] flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[#00FF66]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#E8E8E8] truncate">{expense.title}</p>
                      <p className="text-xs text-[#9AA0A6]">
                        {format(parseISO(expense.date), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[#FF3B3B]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      -R$ {expense.amount?.toFixed(2)}
                    </p>
                    <button
                      onClick={() => setDeleteId(expense.id)}
                      className="p-1 text-[#9AA0A6] hover:text-[#FF3B3B]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </OlimpoCard>
              );
            })}
          </div>
        )}
      </div>

      {/* New Expense Modal */}
      <Sheet open={showModal} onOpenChange={setShowModal}>
        <SheetContent 
          side="bottom" 
          className="bg-[#0B0F0C] border-t border-[rgba(0,255,102,0.18)] rounded-t-2xl"
        >
          <SheetHeader className="pb-4">
            <SheetTitle 
              className="text-lg text-[#00FF66]"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Nova Despesa
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-[#9AA0A6] text-xs">Descrição *</Label>
              <OlimpoInput
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Almoço"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#9AA0A6] text-xs">Valor (R$) *</Label>
                <OlimpoInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0,00"
                  required
                />
              </div>

              <div>
                <Label className="text-[#9AA0A6] text-xs">Data</Label>
                <OlimpoInput
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label className="text-[#9AA0A6] text-xs">Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
              >
                <SelectTrigger className="bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]">
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value} className="text-[#E8E8E8]">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <OlimpoButton
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </OlimpoButton>
              <OlimpoButton
                type="submit"
                className="flex-1"
                disabled={createExpenseMutation.isPending}
              >
                {createExpenseMutation.isPending ? 'Salvando...' : 'Adicionar'}
              </OlimpoButton>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#E8E8E8]">Excluir despesa?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#9AA0A6]">
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-[rgba(0,255,102,0.18)] text-[#E8E8E8]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate(deleteId)}
              className="bg-[#FF3B3B] text-white hover:bg-[#DD2B2B]"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
}