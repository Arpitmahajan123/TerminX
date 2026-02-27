/**
 * GameContext.js - React Context + Provider for global game state
 * Wraps useReducer with the game reducer and provides state + dispatch
 * to all child components via context.
 */

import React, { createContext, useContext, useReducer } from 'react';
import gameReducer from './gameReducer';
import initialState from './initialState';

/**
 * @type {React.Context<{ state: object, dispatch: function }>}
 */
const GameContext = createContext(null);

/**
 * GameProvider wraps the app in the game state context.
 * All child components can access state and dispatch via useGame().
 * @param {{ children: React.ReactNode }} props
 * @returns {React.ReactElement}
 */
export function GameProvider({ children }) {
    const [state, dispatch] = useReducer(gameReducer, initialState);

    return (
        <GameContext.Provider value={{ state, dispatch }}>
            {children}
        </GameContext.Provider>
    );
}

/**
 * Custom hook to access game state and dispatch function.
 * Must be used within a GameProvider.
 * @returns {{ state: object, dispatch: function }}
 */
export function useGame() {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
}

export default GameContext;
