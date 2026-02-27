import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Sprout, TrendingUp, Shield, Gamepad2, Brain, MessageCircle } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useLanguage } from '@/hooks/useLanguage';

export default function TabLayout() {
  const { t } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.cardBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'android' ? 60 : 85,
          paddingBottom: Platform.OS === 'android' ? 8 : 28,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: t('dashboard'),
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="harvest"
        options={{
          title: t('harvest'),
          tabBarIcon: ({ color, size }) => <Sprout size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: t('market'),
          tabBarIcon: ({ color, size }) => <TrendingUp size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="storage"
        options={{
          title: t('storage'),
          tabBarIcon: ({ color, size }) => <Shield size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="simulation"
        options={{
          title: t('simulator'),
          tabBarIcon: ({ color, size }) => <Gamepad2 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: t('aiAdvisor'),
          tabBarIcon: ({ color, size }) => <Brain size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t('chatAssistant'),
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
