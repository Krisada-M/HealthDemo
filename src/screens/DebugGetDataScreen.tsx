import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { HealthLayer } from '../health/HealthLayer';
import {
  HealthState,
  DashboardMetrics,
  HourlyHealthPayload,
} from '../health/models';
import { MetricCard } from '../components/debug/MetricCard';
import { AuditLog } from '../components/debug/AuditLog';
import { StatsSummary } from '../components/debug/StatsSummary';
import { HourlyCalculationTree } from '../components/debug/HourlyCalculationTree';

const DebugGetDataScreen = () => {
  const [state, setState] = React.useState<HealthState | string>('IDLE');
  const [metrics, setMetrics] = React.useState<DashboardMetrics | null>(null);
  const [hourly, setHourly] = React.useState<HourlyHealthPayload[] | null>(
    null,
  );
  const [detailedHourly, setDetailedHourly] = React.useState<any[]>([]);
  const [debugInfo, setDebugInfo] = React.useState<string[]>([]);
  const [auditLog, setAuditLog] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [showRaw, setShowRaw] = React.useState(false);
  const [allowManual, setAllowManual] = React.useState(false);

  React.useEffect(() => {
    const autoRequest = async () => {
      try {
        setState('INITIALIZING...');
        const healthState = await HealthLayer.ensurePermissions();
        setState(healthState);
      } catch (e) {
        console.error('Auto-permission error:', e);
        setState('ERROR');
      }
    };
    const timer = setTimeout(autoRequest, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleGetData = async () => {
    try {
      setError(null);
      setState('CHECKING...');
      const healthState = await HealthLayer.ensurePermissions();
      setState(healthState);

      if (healthState === HealthState.READY) {
        const provider = HealthLayer.getProvider();
        if (provider) {
          provider.setBypassManualFilter(allowManual);
        }

        const h = await HealthLayer.getTodayHourlyPayload();
        setHourly(h);

        const totals = h.reduce(
          (acc: any, curr: any) => ({
            steps: acc.steps + curr.steps,
            activeCalories: acc.activeCalories + curr.activeCalories,
            distance: acc.distance + curr.distance,
          }),
          { steps: 0, activeCalories: 0, distance: 0 },
        );

        setMetrics({
          steps: totals.steps,
          activeCaloriesKcal: totals.activeCalories,
          distanceMeters: totals.distance,
          lastUpdatedISO: new Date().toISOString(),
        });

        if (provider) {
          setDebugInfo(provider.getDebugInfo());
          setDetailedHourly(provider.getDetailedHourlyDebug());
          setAuditLog(provider.getIngestionAuditLog());
        }
      }
    } catch (e: any) {
      setError(e.message || 'Unknown error');
      setState('ERROR');
    }
  };

  const handleClear = () => {
    setMetrics(null);
    setHourly(null);
    setDetailedHourly([]);
    setAuditLog([]);
    setDebugInfo([]);
    setError(null);
    setState('IDLE');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Health Dashboard</Text>
        <View style={styles.stateBadge}>
          <View
            style={[
              styles.stateDot,
              state === 'READY' ? styles.stateDotReady : styles.stateDotError,
            ]}
          />
          <Text style={styles.stateText}>{state}</Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <View style={styles.configRow}>
          <Text style={styles.configLabel}>
            Allow Manual & Unknown (Test Mode)
          </Text>
          <Switch
            value={allowManual}
            onValueChange={setAllowManual}
            trackColor={{ true: '#34C759', false: '#CCC' }}
          />
        </View>
        <TouchableOpacity style={styles.mainButton} onPress={handleGetData}>
          <Text style={styles.buttonText}>Sync Today's Data</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleClear}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {metrics && (
          <View style={styles.metricsGrid}>
            <MetricCard
              label="Steps"
              value={metrics.steps.toLocaleString()}
              unit="steps"
              color="#007AFF"
            />
            <MetricCard
              label="Active Energy"
              value={metrics.activeCaloriesKcal.toFixed(1)}
              unit="kcal"
              color="#FF9500"
            />
            <MetricCard
              label="Distance"
              value={(metrics.distanceMeters / 1000).toFixed(2)}
              unit="km"
              color="#34C759"
            />
          </View>
        )}

        <StatsSummary debugInfo={debugInfo} />

        <AuditLog auditLog={auditLog} />

        <HourlyCalculationTree detailedHourly={detailedHourly} />

        <TouchableOpacity
          style={styles.rawToggle}
          onPress={() => setShowRaw(!showRaw)}
        >
          <Text style={styles.rawToggleText}>
            {showRaw ? 'Hide Raw JSON' : 'Show Raw JSON'}
          </Text>
        </TouchableOpacity>

        {showRaw && (
          <View style={styles.rawSection}>
            <Text style={styles.json}>
              {metrics ? JSON.stringify(metrics, null, 2) : 'No metrics'}
            </Text>
            <View style={styles.spacer10} />
            <Text style={styles.json}>
              {hourly ? JSON.stringify(hourly, null, 2) : 'No hourly data'}
            </Text>
          </View>
        )}

        <View style={styles.spacer40} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: {
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', color: '#1C1C1E' },
  stateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stateDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  stateDotReady: { backgroundColor: '#34C759' },
  stateDotError: { backgroundColor: '#FF3B30' },
  stateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
  },
  buttonContainer: { padding: 16, backgroundColor: '#FFF', marginBottom: 8 },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  configLabel: { fontSize: 14, fontWeight: '600', color: '#3C3C43' },
  mainButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#FF3B30',
  },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  clearButtonText: { fontSize: 16, fontWeight: '700', color: '#FF3B30' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: '#FFD7D7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: { color: '#D0021B', fontSize: 14, fontWeight: '600' },
  rawToggle: { padding: 16, alignItems: 'center' },
  rawToggleText: { color: '#007AFF', fontWeight: '600' },
  rawSection: { marginTop: 10 },
  json: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: '#E5E5EA',
    padding: 12,
    borderRadius: 12,
    color: '#3C3C43',
  },
  spacer10: { height: 10 },
  spacer40: { height: 40 },
});

export default DebugGetDataScreen;
