// src/lib/integrations/pdf/report-renderer.tsx
//
// ============================================================
// WattleOS V2 - PDF Report Renderer
// ============================================================
// Renders a StudentReport's JSONB content into a professional
// PDF using @react-pdf/renderer. This runs server-side only.
//
// WHY @react-pdf/renderer: Pure Node.js, no browser/puppeteer
// dependency, React component model matches our stack, produces
// high-quality vector PDFs with embedded fonts.
// ============================================================

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// ============================================================
// Types for the report content JSONB structure
// ============================================================

/** A single observation excerpt included in the report */
interface ReportObservation {
  date: string;
  content: string;
  outcomes: string[];
  author_name: string;
}

/** Mastery summary for a curriculum area */
interface ReportMasteryArea {
  area_name: string;
  items: Array<{
    outcome_title: string;
    status: 'not_started' | 'presented' | 'practicing' | 'mastered';
  }>;
}

/** Attendance summary stats */
interface ReportAttendance {
  total_days: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendance_rate: number;
}

/** The full rendered report content structure stored in student_reports.content */
export interface ReportContent {
  student_name: string;
  student_dob?: string;
  class_name?: string;
  term: string;
  school_name: string;
  school_logo_url?: string;
  author_name: string;
  report_date: string;
  narrative?: string;
  sections?: Array<{
    title: string;
    body: string;
  }>;
  observations?: ReportObservation[];
  mastery_summary?: ReportMasteryArea[];
  attendance?: ReportAttendance;
  teacher_comments?: string;
  goals?: string;
}

// ============================================================
// Styles - Warm Montessori aesthetic
// ============================================================

const WATTLE_AMBER = '#D97706';
const WATTLE_AMBER_LIGHT = '#FEF3C7';
const WATTLE_GREEN = '#059669';
const TEXT_PRIMARY = '#1F2937';
const TEXT_SECONDARY = '#6B7280';
const BORDER_COLOR = '#E5E7EB';

const MASTERY_COLORS: Record<string, string> = {
  not_started: '#9CA3AF',
  presented: '#3B82F6',
  practicing: '#D97706',
  mastered: '#059669',
};

const MASTERY_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  presented: 'Presented',
  practicing: 'Practicing',
  mastered: 'Mastered',
};

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: TEXT_PRIMARY,
    lineHeight: 1.6,
  },
  // Header
  header: {
    marginBottom: 30,
    borderBottom: `2 solid ${WATTLE_AMBER}`,
    paddingBottom: 15,
  },
  schoolName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: WATTLE_AMBER,
    marginBottom: 4,
  },
  reportTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  reportSubtitle: {
    fontSize: 10,
    color: TEXT_SECONDARY,
  },
  // Student info bar
  studentInfoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: WATTLE_AMBER_LIGHT,
    padding: 12,
    borderRadius: 4,
    marginBottom: 20,
  },
  studentInfoItem: {
    flexDirection: 'column',
  },
  studentInfoLabel: {
    fontSize: 8,
    color: TEXT_SECONDARY,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  studentInfoValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: TEXT_PRIMARY,
  },
  // Sections
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: WATTLE_AMBER,
    marginTop: 20,
    marginBottom: 8,
    borderBottom: `1 solid ${BORDER_COLOR}`,
    paddingBottom: 4,
  },
  bodyText: {
    fontSize: 10,
    lineHeight: 1.7,
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  // Observations
  observationCard: {
    backgroundColor: '#F9FAFB',
    borderLeft: `3 solid ${WATTLE_GREEN}`,
    padding: 10,
    marginBottom: 8,
    borderRadius: 2,
  },
  observationDate: {
    fontSize: 8,
    color: TEXT_SECONDARY,
    marginBottom: 3,
  },
  observationContent: {
    fontSize: 9.5,
    lineHeight: 1.6,
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  observationOutcomes: {
    fontSize: 8,
    color: WATTLE_GREEN,
    fontFamily: 'Helvetica-Oblique',
  },
  // Mastery table
  masteryArea: {
    marginBottom: 12,
  },
  masteryAreaTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  masteryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottom: `0.5 solid ${BORDER_COLOR}`,
  },
  masteryRowAlt: {
    backgroundColor: '#F9FAFB',
  },
  masteryOutcome: {
    fontSize: 9,
    color: TEXT_PRIMARY,
    flex: 1,
  },
  masteryStatus: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  // Attendance
  attendanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  attendanceStat: {
    width: '30%',
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  attendanceNumber: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: TEXT_PRIMARY,
  },
  attendanceLabel: {
    fontSize: 8,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  attendanceRate: {
    width: '100%',
    backgroundColor: WATTLE_AMBER_LIGHT,
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 4,
  },
  attendanceRateNumber: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: WATTLE_AMBER,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    borderTop: `1 solid ${BORDER_COLOR}`,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: TEXT_SECONDARY,
  },
  // Teacher comments / goals
  commentBox: {
    backgroundColor: '#F9FAFB',
    border: `1 solid ${BORDER_COLOR}`,
    padding: 12,
    borderRadius: 4,
    marginBottom: 12,
  },
  commentLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: TEXT_SECONDARY,
    marginBottom: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  commentText: {
    fontSize: 10,
    lineHeight: 1.7,
    color: TEXT_PRIMARY,
  },
  // Signature area
  signatureArea: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureLine: {
    width: '40%',
    borderTop: `1 solid ${TEXT_PRIMARY}`,
    paddingTop: 4,
  },
  signatureLabel: {
    fontSize: 8,
    color: TEXT_SECONDARY,
  },
});

// ============================================================
// Component: Student Info Bar
// ============================================================

function StudentInfoBar({ content }: { content: ReportContent }) {
  return (
    <View style={styles.studentInfoBar}>
      <View style={styles.studentInfoItem}>
        <Text style={styles.studentInfoLabel}>Student</Text>
        <Text style={styles.studentInfoValue}>{content.student_name}</Text>
      </View>
      {content.class_name && (
        <View style={styles.studentInfoItem}>
          <Text style={styles.studentInfoLabel}>Class</Text>
          <Text style={styles.studentInfoValue}>{content.class_name}</Text>
        </View>
      )}
      <View style={styles.studentInfoItem}>
        <Text style={styles.studentInfoLabel}>Term</Text>
        <Text style={styles.studentInfoValue}>{content.term}</Text>
      </View>
      {content.student_dob && (
        <View style={styles.studentInfoItem}>
          <Text style={styles.studentInfoLabel}>Date of Birth</Text>
          <Text style={styles.studentInfoValue}>{content.student_dob}</Text>
        </View>
      )}
    </View>
  );
}

// ============================================================
// Component: Narrative Sections
// ============================================================

function NarrativeSections({ content }: { content: ReportContent }) {
  return (
    <>
      {content.narrative && (
        <>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.bodyText}>{content.narrative}</Text>
        </>
      )}
      {content.sections?.map((section, i) => (
        <View key={i} wrap={false}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.bodyText}>{section.body}</Text>
        </View>
      ))}
    </>
  );
}

// ============================================================
// Component: Observations Section
// ============================================================

function ObservationsSection({ observations }: { observations: ReportObservation[] }) {
  if (observations.length === 0) return null;

  return (
    <>
      <Text style={styles.sectionTitle}>Selected Observations</Text>
      {observations.map((obs, i) => (
        <View key={i} style={styles.observationCard} wrap={false}>
          <Text style={styles.observationDate}>
            {obs.date} - {obs.author_name}
          </Text>
          <Text style={styles.observationContent}>{obs.content}</Text>
          {obs.outcomes.length > 0 && (
            <Text style={styles.observationOutcomes}>
              Outcomes: {obs.outcomes.join(', ')}
            </Text>
          )}
        </View>
      ))}
    </>
  );
}

// ============================================================
// Component: Mastery Summary
// ============================================================

function MasterySection({ areas }: { areas: ReportMasteryArea[] }) {
  if (areas.length === 0) return null;

  return (
    <>
      <Text style={styles.sectionTitle}>Curriculum Progress</Text>
      {areas.map((area, areaIdx) => (
        <View key={areaIdx} style={styles.masteryArea} wrap={false}>
          <Text style={styles.masteryAreaTitle}>{area.area_name}</Text>
          {area.items.map((item, itemIdx) => (
            <View
              key={itemIdx}
              style={[
                styles.masteryRow,
                itemIdx % 2 === 1 ? styles.masteryRowAlt : {},
              ]}
            >
              <Text style={styles.masteryOutcome}>{item.outcome_title}</Text>
              <Text
                style={[
                  styles.masteryStatus,
                  { color: MASTERY_COLORS[item.status] ?? '#6B7280' },
                ]}
              >
                {MASTERY_LABELS[item.status] ?? item.status}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </>
  );
}

// ============================================================
// Component: Attendance Summary
// ============================================================

function AttendanceSection({ attendance }: { attendance: ReportAttendance }) {
  return (
    <>
      <Text style={styles.sectionTitle}>Attendance Summary</Text>
      <View style={styles.attendanceGrid}>
        <View style={styles.attendanceStat}>
          <Text style={styles.attendanceNumber}>{attendance.total_days}</Text>
          <Text style={styles.attendanceLabel}>Total Days</Text>
        </View>
        <View style={styles.attendanceStat}>
          <Text style={styles.attendanceNumber}>{attendance.present}</Text>
          <Text style={styles.attendanceLabel}>Present</Text>
        </View>
        <View style={styles.attendanceStat}>
          <Text style={styles.attendanceNumber}>{attendance.absent}</Text>
          <Text style={styles.attendanceLabel}>Absent</Text>
        </View>
        <View style={styles.attendanceStat}>
          <Text style={styles.attendanceNumber}>{attendance.late}</Text>
          <Text style={styles.attendanceLabel}>Late</Text>
        </View>
        <View style={styles.attendanceStat}>
          <Text style={styles.attendanceNumber}>{attendance.excused}</Text>
          <Text style={styles.attendanceLabel}>Excused</Text>
        </View>
      </View>
      <View style={styles.attendanceRate}>
        <Text style={styles.attendanceRateNumber}>
          {attendance.attendance_rate}%
        </Text>
        <Text style={styles.attendanceLabel}>Attendance Rate</Text>
      </View>
    </>
  );
}

// ============================================================
// Component: Teacher Comments & Goals
// ============================================================

function CommentsAndGoals({ content }: { content: ReportContent }) {
  return (
    <>
      {content.teacher_comments && (
        <View style={styles.commentBox} wrap={false}>
          <Text style={styles.commentLabel}>Teacher Comments</Text>
          <Text style={styles.commentText}>{content.teacher_comments}</Text>
        </View>
      )}
      {content.goals && (
        <View style={styles.commentBox} wrap={false}>
          <Text style={styles.commentLabel}>Goals for Next Term</Text>
          <Text style={styles.commentText}>{content.goals}</Text>
        </View>
      )}
    </>
  );
}

// ============================================================
// Main Document Component
// ============================================================

export function ReportDocument({ content }: { content: ReportContent }) {
  return (
    <Document
      title={`${content.student_name} - ${content.term} Report`}
      author={content.author_name}
      subject={`Student Report for ${content.student_name}`}
      creator="WattleOS"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.schoolName}>{content.school_name}</Text>
          <Text style={styles.reportTitle}>
            Student Report - {content.term}
          </Text>
          <Text style={styles.reportSubtitle}>
            Prepared by {content.author_name} · {content.report_date}
          </Text>
        </View>

        {/* Student Info */}
        <StudentInfoBar content={content} />

        {/* Narrative / Custom Sections */}
        <NarrativeSections content={content} />

        {/* Observations */}
        {content.observations && content.observations.length > 0 && (
          <ObservationsSection observations={content.observations} />
        )}

        {/* Mastery */}
        {content.mastery_summary && content.mastery_summary.length > 0 && (
          <MasterySection areas={content.mastery_summary} />
        )}

        {/* Attendance */}
        {content.attendance && (
          <AttendanceSection attendance={content.attendance} />
        )}

        {/* Comments & Goals */}
        <CommentsAndGoals content={content} />

        {/* Signature Area */}
        <View style={styles.signatureArea}>
          <View style={styles.signatureLine}>
            <Text style={styles.signatureLabel}>Guide / Teacher</Text>
          </View>
          <View style={styles.signatureLine}>
            <Text style={styles.signatureLabel}>Head of School</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {content.school_name} · {content.term}
          </Text>
          <Text style={styles.footerText}>
            Generated by WattleOS · Confidential
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}