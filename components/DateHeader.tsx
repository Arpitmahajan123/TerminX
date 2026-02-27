import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Calendar, Languages } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate } from '@/constants/translations';

/**
 * DateHeader — Shows today's real date + language toggle.
 * Place in the top-right of any screen header.
 */
export default function DateHeader({ showToggle = true }: { showToggle?: boolean }) {
  const { isHindi, toggleLanguage } = useLanguage();
  const [now, setNow] = useState(new Date());

  // Update date at midnight
  useEffect(() => {
    const msToMidnight = () => {
      const d = new Date();
      d.setHours(24, 0, 0, 0);
      return d.getTime() - Date.now();
    };

    const timer = setTimeout(() => {
      setNow(new Date());
    }, msToMidnight());

    return () => clearTimeout(timer);
  }, [now]);

  return (
    <View style={styles.container}>
      <View style={styles.dateBadge}>
        <Calendar size={13} color={Colors.primary} />
        <Text style={styles.dateText}>{formatDate(now, isHindi, 'full')}</Text>
      </View>
      {showToggle && (
        <Pressable onPress={toggleLanguage} style={styles.langBtn}>
          <Languages size={15} color={Colors.primary} />
          <Text style={styles.langText}>{isHindi ? 'EN' : 'हि'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  langText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
});
