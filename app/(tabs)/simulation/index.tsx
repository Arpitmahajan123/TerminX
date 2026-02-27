import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GameProvider, useGame } from '@/simulation/state/GameContext';
import { SCREENS } from '@/simulation/data/constants';
import { useLanguage } from '@/hooks/useLanguage';
import { setLanguage as setSimLang } from '@/simulation/i18n/lang';

// Screens
import TitleScreen from '@/simulation/screens/TitleScreen';
import GameScreen from '@/simulation/screens/GameScreen';
import PlantingScreen from '@/simulation/screens/PlantingScreen';
import StorageScreen from '@/simulation/screens/StorageScreen';
import MarketScreen from '@/simulation/screens/MarketScreen';
import BankScreen from '@/simulation/screens/BankScreen';
import SetupScreen from '@/simulation/screens/SetupScreen';
import WeatherScreen from '@/simulation/screens/WeatherScreen';
import AIScreen from '@/simulation/screens/AIScreen';
import GameOverScreen from '@/simulation/screens/GameOverScreen';

/**
 * Screen router — renders the current screen based on game state.
 */
function ScreenRouter() {
  const { state } = useGame() as { state: any; dispatch: any };

  switch (state.currentScreen) {
    case SCREENS.TITLE:
      return <TitleScreen />;
    case SCREENS.SETUP:
      return <SetupScreen />;
    case SCREENS.GAME:
      return <GameScreen />;
    case SCREENS.PLANTING:
      return <PlantingScreen />;
    case SCREENS.STORAGE:
      return <StorageScreen />;
    case SCREENS.MARKET:
      return <MarketScreen />;
    case SCREENS.BANK:
      return <BankScreen />;
    case SCREENS.WEATHER:
      return <WeatherScreen />;
    case SCREENS.AI:
      return <AIScreen />;
    case SCREENS.GAME_OVER:
      return <GameOverScreen />;
    default:
      return <TitleScreen />;
  }
}

/**
 * Simulation tab — hosts the farming simulation game.
 * Wraps everything in GameProvider for state management.
 * Syncs the main app language with the simulation's own i18n.
 */
export default function SimulationScreen() {
  const { language } = useLanguage();

  // Sync simulation i18n with main app language
  useEffect(() => {
    setSimLang(language);
  }, [language]);

  return (
    // @ts-ignore - React 19 children prop type issue with JS context providers
    <GameProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />
        <ScreenRouter />
      </SafeAreaView>
    </GameProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1B2A',
  },
});
