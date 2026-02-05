import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    Button,
    ScrollView,
    SafeAreaView,
    Platform,
    TouchableOpacity,
    Switch
} from 'react-native';
import { HealthLayer } from '../health/HealthLayer';
import { HealthState, DashboardMetrics, HourlyHealthPayload } from '../health/models';
import { AndroidHealthConnectProvider } from '../health/providers/androidHealthConnect';

// Sub-components moved outside
const MetricCard = ({ label, value, unit, color }: { label: string, value: string | number, unit: string, color: string }) => (
    <View style={[styles.card, { borderLeftColor: color, borderLeftWidth: 5 }]}>
        <Text style={styles.cardLabel}>{label}</Text>
        <View style={styles.cardValueRow}>
            <Text style={styles.cardValue}>{value}</Text>
            <Text style={styles.cardUnit}>{unit}</Text>
        </View>
    </View>
);

const AuditRow = ({ record }: { record: any }) => {
    const [expanded, setExpanded] = React.useState(false);

    return (
        <View style={[styles.auditRow, { borderLeftColor: record.trusted ? '#34C759' : '#FF3B30' }]}>
            <View style={styles.auditHeader}>
                <Text style={styles.auditTime}>{record.time}</Text>
                <Text style={[styles.auditBadge, { backgroundColor: record.trusted ? '#E1F5E1' : '#FEEBEB', color: record.trusted ? '#1E7E34' : '#D0021B' }]}>
                    {record.trusted ? 'ACCEPTED' : 'REJECTED'}
                </Text>
            </View>
            <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
                <View style={styles.auditContent}>
                    <Text style={styles.auditType}>{record.type}: <Text style={styles.auditValue}>{record.value}</Text></Text>
                    <Text style={styles.auditOrigin}>via {record.origin} <Text style={{ fontSize: 9, color: '#8E8E93' }}>(Method: {record.recordingMethod ?? 'N/A'})</Text></Text>
                    {record.device && (
                        <Text style={styles.auditDevice}>📱 Hardware: {record.device}</Text>
                    )}
                    {!record.trusted && (
                        <Text style={styles.auditReason}>⚠️ Reason: {record.rejectionReason}</Text>
                    )}
                    <Text style={styles.metadataToggle}>{expanded ? 'Hide Meta' : 'Show Meta'}</Text>
                </View>
            </TouchableOpacity>
            {expanded && (
                <View style={styles.metadataView}>
                    <Text style={styles.metadataText}>{record.rawMetadata || 'No metadata available'}</Text>
                </View>
            )}
        </View>
    );
};

const DebugGetDataScreen = () => {
    const [state, setState] = React.useState<HealthState | string>('IDLE');
    const [metrics, setMetrics] = React.useState<DashboardMetrics | null>(null);
    const [hourly, setHourly] = React.useState<HourlyHealthPayload[] | null>(null);
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
                if (Platform.OS === 'android' && provider instanceof AndroidHealthConnectProvider) {
                    provider.setBypassManualFilter(allowManual);
                }

                const h = await HealthLayer.getTodayHourlyPayload();
                setHourly(h);

                const totals = h.reduce((acc: any, curr: any) => ({
                    steps: acc.steps + curr.steps,
                    activeCalories: acc.activeCalories + curr.activeCalories,
                    distance: acc.distance + curr.distance
                }), { steps: 0, activeCalories: 0, distance: 0 });

                setMetrics({
                    steps: totals.steps,
                    activeCaloriesKcal: totals.activeCalories,
                    distanceMeters: totals.distance,
                    lastUpdatedISO: new Date().toISOString(),
                });

                if (Platform.OS === 'android' && provider instanceof AndroidHealthConnectProvider) {
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
                    <View style={[styles.stateDot, { backgroundColor: state === 'READY' ? '#34C759' : '#FF3B30' }]} />
                    <Text style={styles.stateText}>{state}</Text>
                </View>
            </View>

            <View style={styles.buttonContainer}>
                <View style={styles.configRow}>
                    <Text style={styles.configLabel}>Allow Manual & Unknown (Test Mode)</Text>
                    <Switch
                        value={allowManual}
                        onValueChange={setAllowManual}
                        trackColor={{ true: '#34C759', false: '#CCC' }}
                    />
                </View>
                <TouchableOpacity style={[styles.mainButton, { backgroundColor: '#007AFF' }]} onPress={handleGetData}>
                    <Text style={styles.buttonText}>Sync Today's Data</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.secondaryButton, { borderColor: '#FF3B30' }]} onPress={handleClear}>
                    <Text style={[styles.buttonText, { color: '#FF3B30' }]}>Clear</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {error && (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>⚠️ {error}</Text>
                    </View>
                )}

                {metrics && (
                    <View style={styles.metricsGrid}>
                        <MetricCard label="Steps" value={metrics.steps.toLocaleString()} unit="steps" color="#007AFF" />
                        <MetricCard label="Active Energy" value={metrics.activeCaloriesKcal.toFixed(1)} unit="kcal" color="#FF9500" />
                        <MetricCard label="Distance" value={(metrics.distanceMeters / 1000).toFixed(2)} unit="km" color="#34C759" />
                    </View>
                )}

                {debugInfo.length > 0 && (
                    <View style={styles.debugSection}>
                        <Text style={styles.sectionTitle}>Filtering Statistics</Text>
                        <View style={styles.debugCard}>
                            {debugInfo.map((info, i) => (
                                <Text key={i} style={styles.debugText}>{info.startsWith('•') ? info : `• ${info}`}</Text>
                            ))}
                        </View>
                    </View>
                )}

                {auditLog.length > 0 && (
                    <View style={styles.auditSection}>
                        <Text style={styles.sectionTitle}>Record Inspector (Raw Data Log)</Text>
                        <View style={styles.auditContainer}>
                            {[...auditLog].reverse().map((record, i) => (
                                <AuditRow key={i} record={record} />
                            ))}
                        </View>
                    </View>
                )}

                {detailedHourly.length > 0 && (
                    <View style={styles.tableSection}>
                        <Text style={styles.sectionTitle}>Hourly Calculation Tree</Text>
                        <View style={styles.table}>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.cell, styles.headerCell, { flex: 0.6 }]}>Time</Text>
                                <Text style={[styles.cell, styles.headerCell, styles.numericCell]}>Act</Text>
                                <Text style={[styles.cell, styles.headerCell, styles.numericCell]}>Tot</Text>
                                <Text style={[styles.cell, styles.headerCell, styles.numericCell]}>Bsl</Text>
                                <Text style={[styles.cell, styles.headerCell, { flex: 1.2 }]}>Source</Text>
                                <Text style={[styles.cell, styles.headerCell, { flex: 0.4, textAlign: 'center' }]}>Est</Text>
                            </View>
                            {detailedHourly.map((item, i) => (
                                <View key={i} style={[styles.tableRow, i % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                                    <Text style={[styles.cell, { flex: 0.6 }]}>{item.hourIndex}:00</Text>
                                    <Text style={[styles.cell, styles.numericCell, { fontWeight: '600' }]}>{item.activeCalories.toFixed(0)}</Text>
                                    <Text style={[styles.cell, styles.numericCell]}>{(item.totalCalories || 0).toFixed(0)}</Text>
                                    <Text style={[styles.cell, styles.numericCell, { color: '#8E8E93' }]}>{(item.basalUsed || 0).toFixed(0)}</Text>
                                    <Text style={[styles.cell, { flex: 1.2, fontSize: 9, color: item.activeCaloriesSource === 'activeRecord' ? '#34C759' : '#8E8E93' }]}>
                                        {item.activeCaloriesSource === 'activeRecord' ? 'Tier-1 (FIT)' : item.activeCaloriesSource === 'totalMinusBasal' ? 'Tier-2 (Est)' : 'None'}
                                    </Text>
                                    <Text style={[styles.cell, { flex: 0.4, textAlign: 'center' }]}>
                                        {item.hasActiveRecord ? '✓' : item.activeCaloriesSource === 'totalMinusBasal' ? '—' : '✕'}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                <TouchableOpacity style={styles.rawToggle} onPress={() => setShowRaw(!showRaw)}>
                    <Text style={styles.rawToggleText}>{showRaw ? 'Hide Raw JSON' : 'Show Raw JSON'}</Text>
                </TouchableOpacity>

                {showRaw && (
                    <View style={styles.rawSection}>
                        <Text style={styles.json}>{metrics ? JSON.stringify(metrics, null, 2) : 'No metrics'}</Text>
                        <View style={{ height: 10 }} />
                        <Text style={styles.json}>{hourly ? JSON.stringify(hourly, null, 2) : 'No hourly data'}</Text>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F2F7' },
    header: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E5EA', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 22, fontWeight: '800', color: '#1C1C1E' },
    stateBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    stateDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    stateText: { fontSize: 12, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase' },
    buttonContainer: { padding: 16, backgroundColor: '#FFF', marginBottom: 8 },
    configRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
    configLabel: { fontSize: 14, fontWeight: '600', color: '#3C3C43' },
    mainButton: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    secondaryButton: { height: 44, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    buttonText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16 },
    metricsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    card: { flex: 1, backgroundColor: '#FFF', marginHorizontal: 4, padding: 12, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    cardLabel: { fontSize: 12, color: '#8E8E93', marginBottom: 4, fontWeight: '600' },
    cardValueRow: { flexDirection: 'row', alignItems: 'baseline' },
    cardValue: { fontSize: 18, fontWeight: '800', color: '#1C1C1E' },
    cardUnit: { fontSize: 10, color: '#8E8E93', marginLeft: 2, fontWeight: '500' },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginBottom: 12, marginTop: 12 },
    debugSection: { marginBottom: 16 },
    debugCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderLeftWidth: 4, borderLeftColor: '#FFCC00' },
    debugText: { fontSize: 13, color: '#3C3C43', marginBottom: 4, lineHeight: 18 },
    auditSection: { marginBottom: 20 },
    auditContainer: { backgroundColor: '#FFF', borderRadius: 12, padding: 12 },
    auditRow: { padding: 10, borderLeftWidth: 3, marginBottom: 8, backgroundColor: '#F9F9FB', borderRadius: 8 },
    auditHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    auditTime: { fontSize: 11, color: '#8E8E93', fontWeight: '600' },
    auditBadge: { fontSize: 9, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
    auditContent: {},
    auditType: { fontSize: 14, fontWeight: '700', color: '#1C1C1E' },
    auditValue: { fontWeight: '800', color: '#007AFF' },
    auditOrigin: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
    auditDevice: { fontSize: 10, color: '#5856D6', fontWeight: '600', marginTop: 2 },
    auditReason: { fontSize: 11, color: '#D0021B', fontWeight: '600', marginTop: 4, backgroundColor: '#FFF0F0', padding: 4, borderRadius: 4 },
    metadataToggle: { fontSize: 10, color: '#007AFF', fontWeight: '600', marginTop: 6, textDecorationLine: 'underline' },
    metadataView: { marginTop: 8, padding: 8, backgroundColor: '#1C1C1E', borderRadius: 6 },
    metadataText: { fontSize: 9, color: '#34C759', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
    tableSection: { marginTop: 10 },
    table: { backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden' },
    tableHeader: { flexDirection: 'row', backgroundColor: '#8E8E93', padding: 10 },
    headerCell: { color: '#FFF', fontWeight: '800', fontSize: 11 },
    tableRow: { flexDirection: 'row', padding: 10, borderBottomWidth: 0.5, borderBottomColor: '#F2F2F7' },
    rowEven: { backgroundColor: '#FFF' },
    rowOdd: { backgroundColor: '#FAFAFA' },
    cell: { flex: 1, fontSize: 12, color: '#3C3C43' },
    numericCell: { textAlign: 'right', paddingRight: 8 },
    errorBox: { backgroundColor: '#FFD7D7', padding: 12, borderRadius: 12, marginBottom: 16 },
    errorText: { color: '#D0021B', fontSize: 14, fontWeight: '600' },
    rawToggle: { padding: 16, alignItems: 'center' },
    rawToggleText: { color: '#007AFF', fontWeight: '600' },
    rawSection: { marginTop: 10 },
    json: { fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', backgroundColor: '#E5E5EA', padding: 12, borderRadius: 12, color: '#3C3C43' },
});

export default DebugGetDataScreen;
