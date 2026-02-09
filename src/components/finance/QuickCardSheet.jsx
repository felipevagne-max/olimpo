import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, addMonths } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Check, ChevronsUpDown, Plus, Pencil, Power, PowerOff } from 'lucide-react';
import OlimpoInput from '../olimpo/OlimpoInput';
import OlimpoButton from '../olimpo/OlimpoButton';
import CardPurchaseConfirmDialog from './CardPurchaseConfirmDialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function QuickCardSheet({ open, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    totalAmount: '',
    installments: 1,
    firstPaymentDate: format(new Date(), 'yyyy-MM-dd'),
    creditCardId: '',
    categoryId: ''
  });
  const [cardOpen, setCardOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [showCardManager, setShowCardManager] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardName, setNewCardName] = useState('');
  const [editingCard, setEditingCard] = useState(null);
  const [createdPurchaseId, setCreatedPurchaseId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: cards = [] } = useQuery({
    queryKey: ['creditCards'],
    queryFn: () => base44.entities.CreditCard.list()
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list()
  });

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    }
  });

  const activeCards = cards.filter(c => c.active !== false);

  useEffect(() => {
    if (!open) {
      setFormData({
        title: '',
        totalAmount: '',
        installments: 1,
        firstPaymentDate: format(new Date(), 'yyyy-MM-dd'),
        creditCardId: '',
        categoryId: ''
      });
      setCategorySearch('');
    }
  }, [open]);

  const createCardMutation = useMutation({
    mutationFn: (name) => base44.entities.CreditCard.create({ name, active: true }),
    onSuccess: (newCard) => {
      queryClient.invalidateQueries(['creditCards']);
      setFormData(prev => ({ ...prev, creditCardId: newCard.id }));
      setNewCardName('');
      setShowAddCard(false);
      toast.success('Cartão adicionado!');
    }
  });

  const updateCardMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CreditCard.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['creditCards']);
      setEditingCard(null);
      toast.success('Cartão atualizado!');
    }
  });

  const createCategoryMutation = useMutation({
    mutationFn: (name) => base44.entities.Category.create({ name, type: 'expense' }),
    onSuccess: (newCategory) => {
      queryClient.invalidateQueries(['categories']);
      setFormData(prev => ({ ...prev, categoryId: newCategory.id }));
      setCategoryOpen(false);
      setCategorySearch('');
    }
  });

  const createPurchaseMutation = useMutation({
    mutationFn: async (data) => {
      const purchaseDate = format(new Date(), 'yyyy-MM-dd');
      const totalAmount = parseFloat(data.totalAmount);
      const installments = parseInt(data.installments);
      
      // Create purchase
      const purchase = await base44.entities.CardPurchase.create({
        title: data.title || 'Compra no cartão',
        totalAmount,
        installmentsTotal: installments,
        purchaseDate,
        firstPaymentDate: data.firstPaymentDate,
        creditCardId: data.creditCardId,
        categoryId: data.categoryId || null
      });

      // Calculate installment amounts
      const baseAmount = Math.floor((totalAmount * 100) / installments) / 100;
      const remainder = Math.round((totalAmount - (baseAmount * installments)) * 100) / 100;

      // Create installments
      const installmentPromises = [];
      for (let i = 0; i < installments; i++) {
        const dueDate = addMonths(new Date(data.firstPaymentDate), i);
        const monthKey = format(dueDate, 'yyyy-MM');
        const amount = i === installments - 1 ? baseAmount + remainder : baseAmount;

        installmentPromises.push(
          base44.entities.CardInstallment.create({
            purchaseId: purchase.id,
            installmentNumber: i + 1,
            installmentAmount: amount,
            dueDate: format(dueDate, 'yyyy-MM-dd'),
            monthKey,
            status: 'OPEN'
          })
        );
      }

      await Promise.all(installmentPromises);
      return purchase;
    },
    onSuccess: (purchase) => {
      queryClient.invalidateQueries(['cardPurchases']);
      queryClient.invalidateQueries(['cardInstallments']);
      toast.success('Compra registrada!');
      
      // Check if should show confirm dialog
      if (!userProfile?.skipCardPurchaseConfirm) {
        setCreatedPurchaseId(purchase.id);
        setShowConfirm(true);
      } else {
        onClose();
      }
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.totalAmount || !formData.creditCardId) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    createPurchaseMutation.mutate(formData);
  };

  const handleCreateCategory = () => {
    if (categorySearch.trim()) {
      createCategoryMutation.mutate(categorySearch.trim());
    }
  };

  const handleCreateCard = () => {
    if (newCardName.trim()) {
      createCardMutation.mutate(newCardName.trim());
    }
  };

  const handleToggleCardActive = (card) => {
    updateCardMutation.mutate({
      id: card.id,
      data: { active: !card.active }
    });
  };

  const handleEditCard = (card) => {
    if (editingCard?.id === card.id && editingCard.name.trim()) {
      updateCardMutation.mutate({
        id: card.id,
        data: { name: editingCard.name }
      });
    } else {
      setEditingCard({ id: card.id, name: card.name });
    }
  };

  const selectedCard = activeCards.find(c => c.id === formData.creditCardId);
  const selectedCategory = categories.find(c => c.id === formData.categoryId);
  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const handleConfirmClose = () => {
    setShowConfirm(false);
    setCreatedPurchaseId(null);
    onClose();
  };

  return (
    <>
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="bg-[#0B0F0C] border-t border-[rgba(255,193,7,0.3)] rounded-t-2xl max-h-[90vh] overflow-y-auto"
      >
        <SheetHeader className="pb-4">
          <SheetTitle 
            className="text-lg text-[#FFC107]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Compra no Cartão
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-[#9AA0A6] text-xs">Valor total *</Label>
            <OlimpoInput
              type="number"
              step="0.01"
              min="0.01"
              value={formData.totalAmount}
              onChange={(e) => setFormData(prev => ({ ...prev, totalAmount: e.target.value }))}
              placeholder="0,00"
              required
              autoFocus
            />
          </div>

          <div>
            <Label className="text-[#9AA0A6] text-xs">Número de parcelas *</Label>
            <Select
              value={String(formData.installments)}
              onValueChange={(v) => setFormData(prev => ({ ...prev, installments: parseInt(v) }))}
            >
              <SelectTrigger className="bg-[#070A08] border-[rgba(255,193,7,0.3)] text-[#E8E8E8]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0B0F0C] border-[rgba(255,193,7,0.3)]">
                {Array.from({ length: 24 }, (_, i) => i + 1).map(n => (
                  <SelectItem key={n} value={String(n)} className="text-[#E8E8E8]">
                    {n}x
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[#9AA0A6] text-xs">Primeiro pagamento *</Label>
            <OlimpoInput
              type="date"
              value={formData.firstPaymentDate}
              onChange={(e) => setFormData(prev => ({ ...prev, firstPaymentDate: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label className="text-[#9AA0A6] text-xs">Cartão *</Label>
            <Popover open={cardOpen} onOpenChange={setCardOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 bg-[#070A08] border border-[rgba(255,193,7,0.3)] rounded-lg text-[#E8E8E8] text-sm hover:bg-[#0B0F0C] transition-colors"
                >
                  <span className={!selectedCard ? 'text-[#9AA0A6]' : ''}>
                    {selectedCard ? selectedCard.name : 'Selecione...'}
                  </span>
                  <ChevronsUpDown className="w-4 h-4 text-[#9AA0A6]" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-[#0B0F0C] border-[rgba(255,193,7,0.3)]" align="start">
                <div className="max-h-48 overflow-y-auto p-2">
                  {activeCards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, creditCardId: card.id }));
                        setCardOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[#E8E8E8] hover:bg-[rgba(255,193,7,0.1)] rounded-lg transition-colors text-left"
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          formData.creditCardId === card.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {card.name}
                    </button>
                  ))}
                </div>
                <div className="border-t border-[rgba(255,193,7,0.3)] p-2 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCardOpen(false);
                      setShowAddCard(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[#00FF66] hover:bg-[rgba(0,255,102,0.1)] rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar cartão</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCardOpen(false);
                      setShowCardManager(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[#FFC107] hover:bg-[rgba(255,193,7,0.1)] rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    <span>Editar cartões</span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label className="text-[#9AA0A6] text-xs">Categoria (opcional)</Label>
            <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 bg-[#070A08] border border-[rgba(255,193,7,0.3)] rounded-lg text-[#E8E8E8] text-sm hover:bg-[#0B0F0C] transition-colors"
                >
                  <span className={!selectedCategory ? 'text-[#9AA0A6]' : ''}>
                    {selectedCategory ? selectedCategory.name : 'Selecione...'}
                  </span>
                  <ChevronsUpDown className="w-4 h-4 text-[#9AA0A6]" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-[#0B0F0C] border-[rgba(255,193,7,0.3)]" align="start">
                <Command className="bg-[#0B0F0C]">
                  <CommandInput 
                    placeholder="Buscar ou criar..." 
                    value={categorySearch}
                    onValueChange={setCategorySearch}
                    className="bg-[#070A08] border-0 text-[#E8E8E8]"
                  />
                  <CommandEmpty className="py-3 px-3 text-sm text-[#9AA0A6]">
                    <button
                      type="button"
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
              className="flex-1 bg-[#FFC107] text-black hover:bg-[#FFD54F]"
              disabled={createPurchaseMutation.isPending}
            >
              {createPurchaseMutation.isPending ? 'Salvando...' : 'Salvar'}
            </OlimpoButton>
          </div>
        </form>
      </SheetContent>
    </Sheet>

    {/* Add Card Dialog */}
    <Dialog open={showAddCard} onOpenChange={setShowAddCard}>
      <DialogContent className="bg-[#0B0F0C] border-[rgba(255,193,7,0.3)]">
        <DialogHeader>
          <DialogTitle className="text-[#FFC107]" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Adicionar Cartão
          </DialogTitle>
        </DialogHeader>
        <div>
          <Label className="text-[#9AA0A6] text-xs">Nome do cartão *</Label>
          <OlimpoInput
            value={newCardName}
            onChange={(e) => setNewCardName(e.target.value)}
            placeholder="Ex: Nubank, Inter, C6..."
            autoFocus
          />
        </div>
        <DialogFooter>
          <OlimpoButton
            variant="secondary"
            onClick={() => {
              setShowAddCard(false);
              setNewCardName('');
            }}
          >
            Cancelar
          </OlimpoButton>
          <OlimpoButton
            onClick={handleCreateCard}
            disabled={!newCardName.trim() || createCardMutation.isPending}
            className="bg-[#FFC107] text-black hover:bg-[#FFD54F]"
          >
            Adicionar
          </OlimpoButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Card Manager Dialog */}
    <Dialog open={showCardManager} onOpenChange={setShowCardManager}>
      <DialogContent className="bg-[#0B0F0C] border-[rgba(255,193,7,0.3)] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#FFC107]" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Gerenciar Cartões
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex items-center gap-2 p-3 bg-[#070A08] rounded-lg border border-[rgba(255,193,7,0.18)]"
            >
              {editingCard?.id === card.id ? (
                <OlimpoInput
                  value={editingCard.name}
                  onChange={(e) => setEditingCard({ ...editingCard, name: e.target.value })}
                  className="flex-1"
                  autoFocus
                />
              ) : (
                <span className={cn("flex-1 text-sm", !card.active && "text-[#9AA0A6] line-through")}>
                  {card.name}
                </span>
              )}
              <button
                type="button"
                onClick={() => handleEditCard(card)}
                className="p-2 text-[#FFC107] hover:bg-[rgba(255,193,7,0.1)] rounded-lg transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleToggleCardActive(card)}
                className="p-2 hover:bg-[rgba(255,193,7,0.1)] rounded-lg transition-colors"
              >
                {card.active ? (
                  <Power className="w-4 h-4 text-[#00FF66]" />
                ) : (
                  <PowerOff className="w-4 h-4 text-[#9AA0A6]" />
                )}
              </button>
            </div>
          ))}
        </div>
        <DialogFooter>
          <OlimpoButton onClick={() => setShowCardManager(false)}>
            Fechar
          </OlimpoButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Confirm Dialog */}
    <CardPurchaseConfirmDialog
      open={showConfirm}
      onClose={handleConfirmClose}
      purchaseId={createdPurchaseId}
    />
    </>
  );
}