import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import OlimpoButton from './OlimpoButton';

export default function InstallPrompt({ open, onClose }) {
  const [platform, setPlatform] = useState('unknown');

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform('ios');
    } else if (/android/.test(ua)) {
      setPlatform('android');
    } else if (/windows|mac|linux/.test(ua)) {
      setPlatform('desktop');
    }
  }, []);

  const instructions = {
    ios: {
      title: 'Instalar no iOS',
      steps: [
        'Toque no botão de Compartilhar (ícone quadrado com seta)',
        'Role para baixo e toque em "Adicionar à Tela de Início"',
        'Confirme tocando em "Adicionar"'
      ],
      icon: Share
    },
    android: {
      title: 'Instalar no Android',
      steps: [
        'Toque nos 3 pontinhos (⋮) no menu do navegador',
        'Toque em "Instalar app" ou "Adicionar à tela inicial"',
        'Confirme a instalação'
      ],
      icon: Download
    },
    desktop: {
      title: 'Instalar no Computador',
      steps: [
        'Clique no ícone de instalação na barra de endereços',
        'Ou acesse Menu → Instalar Olimpo',
        'Confirme a instalação'
      ],
      icon: Download
    },
    unknown: {
      title: 'Adicionar à Tela Inicial',
      steps: [
        'Acesse o menu do navegador (⋮ ou ···)',
        'Procure por "Instalar app" ou "Adicionar à tela inicial"',
        'Siga as instruções do navegador'
      ],
      icon: Download
    }
  };

  const info = instructions[platform];
  const Icon = info.icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0B0F0C] border-[rgba(0,255,102,0.18)] text-[#E8E8E8] max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[#00FF66] flex items-center gap-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            <Icon className="w-5 h-5" />
            {info.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <p className="text-sm text-[#9AA0A6]">
            Adicione o Olimpo à sua tela inicial para acesso rápido e experiência de app nativo:
          </p>
          
          <ol className="space-y-3">
            {info.steps.map((step, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[rgba(0,255,102,0.2)] text-[#00FF66] flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </span>
                <span className="text-sm text-[#E8E8E8] pt-0.5">{step}</span>
              </li>
            ))}
          </ol>

          {platform === 'ios' && (
            <div className="bg-[rgba(255,193,7,0.1)] border border-[rgba(255,193,7,0.3)] rounded-lg p-3 mt-4">
              <p className="text-xs text-[#FFC107]">
                ⚠️ No iOS, use o Safari para instalar o app.
              </p>
            </div>
          )}

          <OlimpoButton onClick={onClose} className="w-full mt-4">
            Entendi
          </OlimpoButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}