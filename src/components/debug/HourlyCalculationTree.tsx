import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface HourlyCalculationTreeProps {
  detailedHourly: any[];
}

export const HourlyCalculationTree = ({
  detailedHourly,
}: HourlyCalculationTreeProps) => {
  if (detailedHourly.length === 0) return null;

  return (
    <View style={styles.tableSection}>
      <Text style={styles.sectionTitle}>Hourly Calculation Tree</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.cell, styles.headerCell, styles.flex06]}>
            Time
          </Text>
          <Text style={[styles.cell, styles.headerCell, styles.numericCell]}>
            Act
          </Text>
          <Text style={[styles.cell, styles.headerCell, styles.numericCell]}>
            Tot
          </Text>
          <Text style={[styles.cell, styles.headerCell, styles.numericCell]}>
            Bsl
          </Text>
          <Text style={[styles.cell, styles.headerCell, styles.flex12]}>
            Source
          </Text>
          <Text style={[styles.cell, styles.headerCell, styles.flex04Centered]}>
            Est
          </Text>
        </View>
        {detailedHourly.map((item, i) => (
          <View
            key={i}
            style={[
              styles.tableRow,
              i % 2 === 0 ? styles.rowEven : styles.rowOdd,
            ]}
          >
            <Text style={[styles.cell, styles.flex06]}>
              {item.hourIndex}:00
            </Text>
            <Text
              style={[styles.cell, styles.numericCell, styles.textSemiBold]}
            >
              {item.activeCalories.toFixed(0)}
            </Text>
            <Text style={[styles.cell, styles.numericCell]}>
              {(item.totalCalories || 0).toFixed(0)}
            </Text>
            <Text style={[styles.cell, styles.numericCell, styles.basalText]}>
              {(item.basalUsed || 0).toFixed(0)}
            </Text>
            <Text
              style={[
                styles.cell,
                styles.flex12,
                styles.sourceText,
                item.activeCaloriesSource === 'activeRecord'
                  ? styles.sourceActive
                  : styles.sourceNone,
              ]}
            >
              {item.activeCaloriesSource === 'activeRecord'
                ? 'Tier-1 (FIT)'
                : item.activeCaloriesSource === 'totalMinusBasal'
                ? 'Tier-2 (Est)'
                : 'None'}
            </Text>
            <Text style={[styles.cell, styles.flex04Centered]}>
              {item.hasActiveRecord
                ? '✓'
                : item.activeCaloriesSource === 'totalMinusBasal'
                ? '—'
                : '✕'}
            </Text>
          </View>
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
  tableSection: {
    marginTop: 10,
  },
  table: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#8E8E93',
    padding: 10,
  },
  headerCell: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 11,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F2F2F7',
  },
  rowEven: {
    backgroundColor: '#FFF',
  },
  rowOdd: {
    backgroundColor: '#FAFAFA',
  },
  cell: {
    flex: 1,
    fontSize: 12,
    color: '#3C3C43',
  },
  numericCell: {
    textAlign: 'right',
    paddingRight: 8,
  },
  flex06: { flex: 0.6 },
  flex12: { flex: 1.2 },
  flex04Centered: { flex: 0.4, textAlign: 'center' },
  textSemiBold: { fontWeight: '600' },
  basalText: { color: '#8E8E93' },
  sourceText: { fontSize: 9 },
  sourceActive: { color: '#34C759' },
  sourceNone: { color: '#8E8E93' },
});
