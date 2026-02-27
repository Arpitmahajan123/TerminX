/**
 * FieldTile.js - Visual farm field with crop growth sprites
 * Shows soil → seedling → plant → golden crop → wilted → dead
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { getCropByName } from '../data/crops';
import { FIELD_STATES } from '../data/constants';
import { getGrowthProgress } from '../engine/cropEngine';

const GROWTH_SPRITES = {
    EMPTY: '🟫',
    PLANTED: '🌱',
    GROWING_EARLY: '🌿',
    GROWING_MID: '🪴',
    GROWING_LATE: '🌾',
    MATURE: '✨',
    OVERRIPE: '🥀',
    DEAD: '💀',
};

function getSprite(field) {
    if (field.status === FIELD_STATES.EMPTY) return GROWTH_SPRITES.EMPTY;
    if (field.status === FIELD_STATES.PLANTED) return GROWTH_SPRITES.PLANTED;
    if (field.status === FIELD_STATES.DEAD) return GROWTH_SPRITES.DEAD;
    if (field.status === FIELD_STATES.OVERRIPE) return GROWTH_SPRITES.OVERRIPE;
    if (field.status === FIELD_STATES.MATURE) {
        const crop = getCropByName(field.cropType);
        return crop?.emoji || GROWTH_SPRITES.MATURE;
    }
    // GROWING — show progress-based sprite
    const progress = getGrowthProgress(field);
    if (progress < 33) return GROWTH_SPRITES.GROWING_EARLY;
    if (progress < 66) return GROWTH_SPRITES.GROWING_MID;
    return GROWTH_SPRITES.GROWING_LATE;
}

export default function FieldTile({ field, onPress, isSelected, compact, size: propSize }) {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const progress = getGrowthProgress(field);
    const crop = field.cropType ? getCropByName(field.cropType) : null;

    useEffect(() => {
        if (field.status === FIELD_STATES.MATURE) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.05, duration: 600, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [field.status]);

    // Soil/field background color
    const bgColor = {
        [FIELD_STATES.EMPTY]: '#5D4037',
        [FIELD_STATES.PLANTED]: '#6D4C41',
        [FIELD_STATES.GROWING]: '#33691E',
        [FIELD_STATES.MATURE]: '#F9A825',
        [FIELD_STATES.OVERRIPE]: '#BF360C',
        [FIELD_STATES.DEAD]: '#3E2723',
    }[field.status] || '#5D4037';

    const borderColor = isSelected ? '#FFD740' :
        field.status === FIELD_STATES.MATURE ? '#FDD835' :
            field.status === FIELD_STATES.OVERRIPE ? '#FF5722' :
                field.status === FIELD_STATES.DEAD ? '#D32F2F' : '#3E2723';

    const size = propSize || (compact ? 68 : 88);

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
            <Animated.View style={[
                styles.tile,
                {
                    width: size, height: size,
                    backgroundColor: bgColor,
                    borderColor,
                    transform: [{ scale: pulseAnim }],
                    borderWidth: isSelected ? 3 : 2,
                },
            ]}>
                {/* Field number */}
                <Text style={styles.fieldNum}>{field.id + 1}</Text>

                {/* Crop sprite */}
                <Text style={[styles.sprite, { fontSize: compact ? 24 : 32 }]}>{getSprite(field)}</Text>

                {/* Crop name */}
                {crop && <Text style={styles.cropName} numberOfLines={1}>{crop.name}</Text>}

                {/* Growth bar for growing fields */}
                {(field.status === FIELD_STATES.GROWING || field.status === FIELD_STATES.PLANTED) && (
                    <View style={styles.growthBarWrap}>
                        <View style={[styles.growthBar, { width: `${progress}%` }]} />
                    </View>
                )}

                {/* Quality for mature */}
                {field.status === FIELD_STATES.MATURE && (
                    <Text style={styles.quality}>Q:{Math.round(field.quality)}%</Text>
                )}

                {/* Status indicator */}
                {field.status === FIELD_STATES.EMPTY && (
                    <Text style={styles.emptyLabel}>Empty</Text>
                )}
            </Animated.View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    tile: {
        borderRadius: 12,
        margin: 4,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        overflow: 'hidden',
    },
    fieldNum: {
        position: 'absolute', top: 3, left: 5,
        fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.5)',
    },
    sprite: { marginBottom: 2 },
    cropName: {
        fontSize: 9, fontWeight: '800', color: '#FFF',
        textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2,
    },
    growthBarWrap: {
        width: '80%', height: 5, backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 3, marginTop: 3, overflow: 'hidden',
    },
    growthBar: {
        height: 5, backgroundColor: '#76FF03', borderRadius: 3,
    },
    quality: {
        fontSize: 10, fontWeight: '900', color: '#FFEB3B',
        textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
    },
    emptyLabel: {
        fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: '600',
    },
});
