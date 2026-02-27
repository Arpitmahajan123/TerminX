/**
 * ActionButton.js - Professional button component
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function ActionButton({ title, onPress, variant = 'primary', disabled = false, size = 'medium', style, icon }) {
    const bg = {
        primary: '#2E7D32', secondary: '#37474F', accent: '#FF9800',
        danger: '#C62828', success: '#1B5E20', outline: 'transparent',
        gold: '#FFD700', dark: '#1B2838',
    }[variant] || '#2E7D32';

    const border = variant === 'outline' ? '#66BB6A' : 'rgba(0,0,0,0.2)';
    const textColor = variant === 'outline' ? '#66BB6A' : variant === 'gold' ? '#0D1B2A' : '#ECEFF1';
    const pad = size === 'small' ? 7 : size === 'large' ? 14 : 10;
    const fontSize = size === 'small' ? 12 : size === 'large' ? 16 : 14;

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.7}
            style={[
                styles.btn,
                { backgroundColor: bg, borderColor: border, paddingVertical: pad, paddingHorizontal: pad * 1.5 },
                disabled && styles.disabled,
                style,
            ]}
        >
            <Text style={[styles.text, { color: textColor, fontSize }]}>
                {icon ? `${icon} ${title}` : title}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    btn: {
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        elevation: 2,
    },
    text: { fontWeight: '700', textAlign: 'center' },
    disabled: { opacity: 0.35 },
});
