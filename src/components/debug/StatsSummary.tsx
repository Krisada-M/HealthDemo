import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StatsSummaryProps {
  debugInfo: string[];
}

export const StatsSummary = ({ debugInfo }: StatsSummaryProps) => {
  if (debugInfo.length === 0) return null;

  return (
    <View style={styles.debugSection}>
      <Text style={styles.sectionTitle}>Filtering Statistics</Text>
      <View style={styles.debugCard}>
        {debugInfo.map((info, i) => (
          <Text key={i} style={styles.debugText}>
            {info.startsWith('•') ? info : `• ${info}`}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
    marginTop: 12,
  },
  debugSection: {
    marginBottom: 16,
  },
  debugCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFCC00',
  },
  debugText: {
    fontSize: 13,
    color: '#3C3C43',
    marginBottom: 4,
    lineHeight: 18,
  },
});
