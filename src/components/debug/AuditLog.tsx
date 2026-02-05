import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
} from 'react-native';

interface AuditRowProps {
  record: any;
}

export const AuditRow = ({ record }: AuditRowProps) => {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <View
      style={[
        styles.auditRow,
        record.trusted ? styles.trustedBorder : styles.untrustedBorder,
      ]}
    >
      <View style={styles.auditHeader}>
        <Text style={styles.auditTime}>{record.time}</Text>
        <Text
          style={[
            styles.auditBadge,
            record.trusted ? styles.badgeAccepted : styles.badgeRejected,
          ]}
        >
          {record.trusted ? 'ACCEPTED' : 'REJECTED'}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.auditContent}>
          <Text style={styles.auditType}>
            {record.type}: <Text style={styles.auditValue}>{record.value}</Text>
          </Text>
          <Text style={styles.auditOrigin}>
            via {record.origin}{' '}
            <Text style={styles.auditOriginMethod}>
              (Method: {record.recordingMethod ?? 'N/A'})
            </Text>
          </Text>
          {record.device && (
            <Text style={styles.auditDevice}>📱 Hardware: {record.device}</Text>
          )}
          {!record.trusted && (
            <Text style={styles.auditReason}>
              ⚠️ Reason: {record.rejectionReason}
            </Text>
          )}
          <Text style={styles.metadataToggle}>
            {expanded ? 'Hide Meta' : 'Show Meta'}
          </Text>
        </View>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.metadataView}>
          <Text style={styles.metadataText}>
            {record.rawMetadata || 'No metadata available'}
          </Text>
        </View>
      )}
    </View>
  );
};

interface AuditLogProps {
  auditLog: any[];
}

export const AuditLog = ({ auditLog }: AuditLogProps) => {
  if (auditLog.length === 0) return null;

  return (
    <View style={styles.auditSection}>
      <Text style={styles.sectionTitle}>Record Inspector (Raw Data Log)</Text>
      <View style={styles.auditContainer}>
        {[...auditLog].reverse().map((record, i) => (
          <AuditRow key={i} record={record} />
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
  auditSection: {
    marginBottom: 20,
  },
  auditContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
  },
  auditRow: {
    padding: 10,
    borderLeftWidth: 3,
    marginBottom: 8,
    backgroundColor: '#F9F9FB',
    borderRadius: 8,
  },
  trustedBorder: { borderLeftColor: '#34C759' },
  untrustedBorder: { borderLeftColor: '#FF3B30' },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  auditTime: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
  },
  auditBadge: {
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  badgeAccepted: {
    backgroundColor: '#E1F5E1',
    color: '#1E7E34',
  },
  badgeRejected: {
    backgroundColor: '#FEEBEB',
    color: '#D0021B',
  },
  auditContent: {},
  auditType: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  auditValue: {
    fontWeight: '800',
    color: '#007AFF',
  },
  auditOrigin: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  auditOriginMethod: {
    fontSize: 9,
    color: '#8E8E93',
  },
  auditDevice: {
    fontSize: 10,
    color: '#5856D6',
    fontWeight: '600',
    marginTop: 2,
  },
  auditReason: {
    fontSize: 11,
    color: '#D0021B',
    fontWeight: '600',
    marginTop: 4,
    backgroundColor: '#FFF0F0',
    padding: 4,
    borderRadius: 4,
  },
  metadataToggle: {
    fontSize: 10,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 6,
    textDecorationLine: 'underline',
  },
  metadataView: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#1C1C1E',
    borderRadius: 6,
  },
  metadataText: {
    fontSize: 9,
    color: '#34C759',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
