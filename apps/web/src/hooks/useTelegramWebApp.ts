'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store';
import { authApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          query_id?: string;
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            is_premium?: boolean;
          };
          auth_date?: string;
          hash?: string;
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        colorScheme: 'light' | 'dark';
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
        };
        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        onEvent: (eventType: string, callback: () => void) => void;
        offEvent: (eventType: string, callback: () => void) => void;
        sendData: (data: string) => void;
        platform: string;
      };
    };
  }
}

interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium?: boolean;
  photoUrl?: string;
}

export function useTelegramWebApp() {
  const [isTelegram, setIsTelegram] = useState(false);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [initData, setInitData] = useState('');
  const [isReady, setIsReady] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      setIsTelegram(true);
      setInitData(tg.initData);

      const user = tg.initDataUnsafe?.user;
      if (user) {
        setTelegramUser({
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          username: user.username,
          languageCode: user.language_code,
          isPremium: user.is_premium,
        });
      }

      // Signal to Telegram that WebApp is ready
      tg.ready();
      tg.expand();

      // Apply Telegram theme
      if (tg.colorScheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // Listen for theme changes
      tg.onEvent('themeChanged', () => {
        if (tg.colorScheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      });

      setIsReady(true);
    } else {
      setIsReady(true); // Not in Telegram, but ready
    }
  }, []);

  const loginWithTelegram = useCallback(async () => {
    if (!initData) return;

    try {
      const response = await authApi.telegramWebAppLogin(initData);
      const { user, accessToken, refreshToken } = response.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success('Logged in via Telegram!');
      router.push('/drive');
    } catch (error: any) {
      console.error('Telegram WebApp login failed:', error);
      toast.error('Failed to auto-login. Please use phone number.');
    }
  }, [initData, setAuth, router]);

  return {
    isTelegram,
    telegramUser,
    initData,
    isReady,
    loginWithTelegram,
  };
}
