/**
 * App.js - Entry point for Kisan Simulator
 * Agricultural market simulation tool for farmers.
 */

import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { GameProvider, useGame } from './src/state/GameContext';
import { SCREENS } from './src/data/constants';

// Screens
import TitleScreen from './src/screens/TitleScreen';
import GameScreen from './src/screens/GameScreen';
import PlantingScreen from './src/screens/PlantingScreen';
import StorageScreen from './src/screens/StorageScreen';
import MarketScreen from './src/screens/MarketScreen';
import BankScreen from './src/screens/BankScreen';
import SetupScreen from './src/screens/SetupScreen';
import WeatherScreen from './src/screens/WeatherScreen';
import AIScreen from './src/screens/AIScreen';

/**
 * Screen router — renders the current screen based on game state.
 */
function ScreenRouter() {
    const { state } = useGame();

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
        default:
            return <TitleScreen />;
    }
}

/**
 * Root App component.
 * Wraps everything in GameProvider for global state access.
 */
export default function App() {
    return (
        <GameProvider>
            <SafeAreaView style={styles.container}>
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
