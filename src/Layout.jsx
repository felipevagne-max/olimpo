import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import MatrixColumns from '@/components/olimpo/MatrixColumns';
import TitleEquipEffect from '@/components/olimpo/TitleEquipEffect';
import SplashScreen from '@/components/olimpo/SplashScreen';
import TopBar from '@/components/olimpo/TopBar';
import BottomNav from '@/components/olimpo/BottomNav';

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isChecking, setIsChecking] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    }
  });

  const toggleSidebarMutation = useMutation({
    mutationFn: async (collapsed) => {
      if (!userProfile?.id) return;
      return base44.entities.UserProfile.update(userProfile.id, { sidebarCollapsed: collapsed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userProfile']);
    }
  });

  const sidebarCollapsed = userProfile?.sidebarCollapsed ?? false;

  // Detect desktop breakpoint
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    // Initialize with minimum 1s splash duration
    const init = async () => {
      const startTime = Date.now();
      const MIN_SPLASH_DURATION = 1000;
      
      try {
        // Check if user is authenticated
        const isAuth = await base44.auth.isAuthenticated();
        
        if (isAuth) {
          const user = await base44.auth.me();
          
          // Check if first login and redirect to FirstAccess page
          const { data } = await base44.functions.invoke('checkFirstLogin', {
            email: user.email
          });
          
          if (data.is_first_login && data.subscription_status === 'active') {
            navigate('/FirstAccess');
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
      }
      
      // Ensure minimum splash duration
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_SPLASH_DURATION - elapsed);
      
      await new Promise(resolve => setTimeout(resolve, remainingTime));
      setIsChecking(false);
    };

    init();
  }, []);

  if (isChecking) {
    return <SplashScreen />;
  }

  return (
    <>
      {/* PWA Meta Tags */}
      <head>
        {/* Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Theme Color */}
        <meta name="theme-color" content="#000000" />
        <meta name="msapplication-TileColor" content="#000000" />
        
        {/* iOS PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Olimpo" />
        <link rel="apple-touch-icon" href="/icons/icon-180.png" />
        
        {/* Viewport */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        
        {/* SEO Básico */}
        <meta name="description" content="Sistema de produtividade e gamificação pessoal" />
        <meta name="keywords" content="produtividade,gamificação,hábitos,tarefas,metas" />
        
        {/* Service Worker Registration */}
        <script dangerouslySetInnerHTML={{__html: `
          if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/service-worker.js')
                .then(function(registration) {
                  console.log('[PWA] Service Worker registrado:', registration.scope);
                  
                  // Check for updates periodically
                  setInterval(function() {
                    registration.update();
                  }, 60000); // Check every minute
                  
                  // Handle updates
                  registration.addEventListener('updatefound', function() {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', function() {
                      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New version available
                        if (confirm('Nova versão disponível! Recarregar agora?')) {
                          newWorker.postMessage({ type: 'SKIP_WAITING' });
                          window.location.reload();
                        }
                      }
                    });
                  });
                })
                .catch(function(error) {
                  console.log('[PWA] Falha ao registrar Service Worker:', error);
                });
                
              // Handle controller change (new SW activated)
              navigator.serviceWorker.addEventListener('controllerchange', function() {
                window.location.reload();
              });
            });
          }
        `}} />
      </head>

      <MatrixColumns opacity={0.15} />
      <TitleEquipEffect />
      <TopBar 
        sidebarCollapsed={isDesktop ? sidebarCollapsed : false} 
        onToggleSidebar={() => toggleSidebarMutation.mutate(!sidebarCollapsed)}
      />
      <BottomNav collapsed={isDesktop ? sidebarCollapsed : false} />
      <div 
        className="min-h-screen bg-black relative overflow-hidden transition-all duration-200"
        style={{
          paddingLeft: isDesktop ? (sidebarCollapsed ? '72px' : '256px') : '0'
        }}
      >
        <style>{`
          /* Desktop responsive container */
          @media (min-width: 1024px) {
            .olimpo-container {
              max-width: 1280px;
              margin-left: auto;
              margin-right: auto;
            }

            .olimpo-grid-2 {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 1rem;
            }

            .olimpo-grid-4 {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 1rem;
            }
          }

          @media (max-width: 1023px) {
            body {
              padding-left: 0 !important;
            }
          }
        `}</style>
        <style>{`
          body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 0;
          }
        `}</style>
        <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        
        /* Global box-sizing reset */
        *, *::before, *::after {
          box-sizing: border-box;
        }

        html, body, #root {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          margin: 0;
          padding: 0;
        }

        :root {
          --olimpo-bg: #000000;
          --olimpo-surface: #0B0F0C;
          --olimpo-surface2: #070A08;
          --olimpo-primary: #00FF66;
          --olimpo-primary-soft: rgba(0,255,102,0.18);
          --olimpo-text: #E8E8E8;
          --olimpo-muted: #9AA0A6;
          --olimpo-warning: #FFC107;
          --olimpo-danger: #FF3B3B;
        }

        body {
          background-color: var(--olimpo-bg);
          color: var(--olimpo-text);
          font-family: 'Inter', sans-serif;
        }

        /* Prevent wide images/elements from breaking layout */
        img {
          max-width: 100%;
          height: auto;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 4px;
        }
        ::-webkit-scrollbar-track {
          background: var(--olimpo-surface);
        }
        ::-webkit-scrollbar-thumb {
          background: var(--olimpo-primary-soft);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: var(--olimpo-primary);
        }

        /* Hide Base44 edit button */
        [class*="base44-edit"],
        [class*="editWithBase44"],
        [id*="base44-edit"],
        iframe[src*="base44"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }

        /* Date input styling */
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: 0.5;
        }
        
        input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: 0.5;
        }
      `}</style>
      {children}
      </div>
      </>
      );
      }