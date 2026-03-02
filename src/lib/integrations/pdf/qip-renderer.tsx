// src/lib/integrations/pdf/qip-renderer.tsx
//
// ============================================================
// WattleOS V2 - QIP PDF Renderer (Reg 55)
// ============================================================
// Renders the Quality Improvement Plan as a professional PDF
// for submission to the regulatory authority on request.
// Uses @react-pdf/renderer (same as student reports).
// ============================================================

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// ============================================================
// QIP PDF Content Types
// ============================================================

export interface QipPdfElement {
  id: string;
  name: string;
  rating: "working_towards" | "meeting" | "exceeding" | null;
  strengths: string | null;
  goals: Array<{
    description: string;
    strategies: string | null;
    responsible_person: string | null;
    due_date: string | null;
    success_measures: string | null;
    status: string;
  }>;
  evidence: Array<{
    type: string;
    title: string;
  }>;
}

export interface QipPdfStandard {
  id: string;
  name: string;
  elements: QipPdfElement[];
}

export interface QipPdfQualityArea {
  number: number;
  name: string;
  standards: QipPdfStandard[];
}

export interface QipPdfContent {
  school_name: string;
  export_date: string;
  philosophy: string | null;
  quality_areas: QipPdfQualityArea[];
}

// ============================================================
// Styles
// ============================================================

const AMBER = "#D97706";
const GREEN = "#059669";
const PURPLE = "#7C3AED";
const GRAY = "#9CA3AF";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1F2937",
  },
  // Cover
  coverPage: {
    padding: 60,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  coverTitle: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    textAlign: "center",
  },
  coverSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 40,
  },
  coverSchool: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    textAlign: "center",
  },
  coverDate: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  // QA Header
  qaHeader: {
    backgroundColor: "#F3F4F6",
    padding: 12,
    marginBottom: 8,
    borderRadius: 4,
  },
  qaTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  // Standard
  standardHeader: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 10,
    marginBottom: 6,
    color: "#374151",
  },
  // Element
  elementRow: {
    marginBottom: 8,
    padding: 8,
    borderBottom: "1 solid #E5E7EB",
  },
  elementHeader: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  elementId: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#6B7280",
  },
  elementName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  ratingBadge: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    padding: "2 6",
    borderRadius: 8,
    color: "#FFFFFF",
  },
  strengths: {
    fontSize: 9,
    color: "#4B5563",
    marginTop: 4,
    lineHeight: 1.4,
  },
  // Goals table
  goalRow: {
    fontSize: 9,
    padding: "4 0",
    borderBottom: "0.5 solid #F3F4F6",
  },
  goalLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#6B7280",
  },
  // Evidence
  evidenceList: {
    marginTop: 4,
    fontSize: 8,
    color: "#6B7280",
  },
  // Philosophy
  philosophySection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#FEF3C7",
    borderRadius: 4,
  },
  philosophyTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  philosophyText: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#374151",
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 7,
    color: "#9CA3AF",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function ratingColor(rating: string | null): string {
  switch (rating) {
    case "exceeding":
      return PURPLE;
    case "meeting":
      return GREEN;
    case "working_towards":
      return AMBER;
    default:
      return GRAY;
  }
}

function ratingLabel(rating: string | null): string {
  switch (rating) {
    case "exceeding":
      return "Exceeding";
    case "meeting":
      return "Meeting";
    case "working_towards":
      return "Working Towards";
    default:
      return "Not Assessed";
  }
}

// ============================================================
// Document Component
// ============================================================

export function QipDocument({ content }: { content: QipPdfContent }) {
  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverTitle}>Quality Improvement Plan</Text>
        <Text style={styles.coverSubtitle}>
          National Quality Standard (Reg 55)
        </Text>
        <Text style={styles.coverSchool}>{content.school_name}</Text>
        <Text style={styles.coverDate}>{content.export_date}</Text>
      </Page>

      {/* Philosophy + QA Pages */}
      <Page size="A4" style={styles.page} wrap>
        {/* Philosophy */}
        {content.philosophy && (
          <View style={styles.philosophySection}>
            <Text style={styles.philosophyTitle}>
              Service Philosophy (Element 7.1.1)
            </Text>
            <Text style={styles.philosophyText}>{content.philosophy}</Text>
          </View>
        )}

        {/* Quality Areas */}
        {content.quality_areas.map((qa) => (
          <View key={qa.number} wrap={false}>
            <View style={styles.qaHeader}>
              <Text style={styles.qaTitle}>
                QA{qa.number}: {qa.name}
              </Text>
            </View>

            {qa.standards.map((standard) => (
              <View key={standard.id}>
                <Text style={styles.standardHeader}>
                  Standard {standard.id}: {standard.name}
                </Text>

                {standard.elements.map((element) => (
                  <View key={element.id} style={styles.elementRow} wrap={false}>
                    <View style={styles.elementHeader}>
                      <View>
                        <Text style={styles.elementId}>
                          Element {element.id}
                        </Text>
                        <Text style={styles.elementName}>{element.name}</Text>
                      </View>
                      <Text
                        style={{
                          ...styles.ratingBadge,
                          backgroundColor: ratingColor(element.rating),
                        }}
                      >
                        {ratingLabel(element.rating)}
                      </Text>
                    </View>

                    {element.strengths && (
                      <Text style={styles.strengths}>
                        Strengths: {element.strengths}
                      </Text>
                    )}

                    {/* Goals */}
                    {element.goals.length > 0 && (
                      <View style={{ marginTop: 6 }}>
                        <Text style={styles.goalLabel}>Improvement Goals:</Text>
                        {element.goals.map((goal, i) => (
                          <View key={i} style={styles.goalRow}>
                            <Text>{goal.description}</Text>
                            {goal.strategies && (
                              <Text style={{ color: "#6B7280" }}>
                                Strategies: {goal.strategies}
                              </Text>
                            )}
                            {(goal.responsible_person || goal.due_date) && (
                              <Text style={{ color: "#9CA3AF" }}>
                                {[
                                  goal.responsible_person
                                    ? `Responsible: ${goal.responsible_person}`
                                    : null,
                                  goal.due_date
                                    ? `Due: ${goal.due_date}`
                                    : null,
                                  `Status: ${goal.status.replace("_", " ")}`,
                                ]
                                  .filter(Boolean)
                                  .join(" | ")}
                              </Text>
                            )}
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Evidence */}
                    {element.evidence.length > 0 && (
                      <Text style={styles.evidenceList}>
                        Evidence ({element.evidence.length}):{" "}
                        {element.evidence
                          .map((e) => `${e.title} [${e.type}]`)
                          .join("; ")}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Generated by WattleOS</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
