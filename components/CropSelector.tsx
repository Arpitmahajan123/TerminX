import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Colors } from '@/constants/colors';
import { useLanguage } from '@/hooks/useLanguage';
import { mockCrops, Crop } from '@/mocks/crops';
import { useCrops } from '@/hooks/useCrops';

interface CropSelectorProps {
  selectedCropId: string;
  onSelect: (crop: Crop) => void;
}

export default function CropSelector({ selectedCropId, onSelect }: CropSelectorProps) {
  const { isHindi } = useLanguage();
  const { crops } = useCrops();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {crops.map((crop) => {
        const selected = crop.id === selectedCropId;
        return (
          <Pressable
            key={crop.id}
            onPress={() => onSelect(crop)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={styles.icon}>{crop.icon}</Text>
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {isHindi ? crop.nameHi : crop.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 10,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  icon: {
    fontSize: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  labelSelected: {
    color: Colors.white,
  },
});
