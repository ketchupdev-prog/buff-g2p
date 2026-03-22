/**
 * Timeline – vertical event list with dots and connecting lines.
 * Used in: loan detail, transaction detail (future), proof-of-life history.
 */
import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

export interface TimelineEvent {
  id: string;
  title: string;
  subtitle?: string;
  date?: string;
  /** Dot fill colour */
  color?: string;
  /** If true, dot is an unfilled circle (upcoming / pending) */
  hollow?: boolean;
}

interface TimelineProps {
  events: TimelineEvent[];
  style?: ViewStyle;
}

export function Timeline({ events, style }: TimelineProps) {
  return (
    <View style={[styles.container, style]}>
      {events.map((event, idx) => {
        const isLast = idx === events.length - 1;
        const dotColor = event.color ?? '#D1D5DB';
        return (
          <View key={event.id} style={styles.item}>
            {/* Left rail */}
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: event.hollow ? '#fff' : dotColor },
                  event.hollow && { borderWidth: 2, borderColor: dotColor },
                ]}
              />
              {!isLast && <View style={styles.line} />}
            </View>
            {/* Content */}
            <View style={[styles.content, isLast && styles.contentLast]}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, event.hollow && styles.titleHollow]}>
                  {event.title}
                </Text>
                {event.date ? <Text style={styles.date}>{event.date}</Text> : null}
              </View>
              {event.subtitle ? (
                <Text style={[styles.subtitle, event.hollow && styles.subtitleHollow]}>
                  {event.subtitle}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  item: { flexDirection: 'row', gap: 14 },
  rail: { width: 20, alignItems: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7, marginTop: 3 },
  line: { flex: 1, width: 2, backgroundColor: '#E5E7EB', marginTop: 4, minHeight: 28 },
  content: { flex: 1, paddingBottom: 20 },
  contentLast: { paddingBottom: 0 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 },
  title: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  titleHollow: { color: '#9CA3AF' },
  date: { fontSize: 12, color: '#9CA3AF' },
  subtitle: { fontSize: 12, color: '#6B7280' },
  subtitleHollow: { color: '#C4C9D4' },
});
