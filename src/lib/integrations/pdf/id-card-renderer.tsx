// src/lib/integrations/pdf/id-card-renderer.tsx
//
// ============================================================
// WattleOS V2 - School ID Card PDF Renderer (Module R)
// ============================================================
// Renders student/staff ID cards as a multi-up PDF using
// @react-pdf/renderer. Portrait cards: 2 columns × 4 rows
// per A4 page. Landscape cards: 2 columns × 3 rows.
// ============================================================

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { IdCardTemplateConfig, IdCardPersonData } from "@/types/domain";

// ============================================================
// Props
// ============================================================

export interface IdCardPdfProps {
  people: IdCardPersonData[];
  config: IdCardTemplateConfig;
  schoolName: string;
  schoolLogoUrl: string | null;
  year: string;
  qrDataUris: Map<string, string>;
}

// ============================================================
// Layout Constants
// ============================================================

const PORTRAIT_CARD_WIDTH = 243; // ~85.6mm (CR-80 card standard)
const PORTRAIT_CARD_HEIGHT = 153; // ~54mm
const LANDSCAPE_CARD_WIDTH = 243;
const LANDSCAPE_CARD_HEIGHT = 153;

const CARDS_PER_ROW = 2;
const PORTRAIT_ROWS_PER_PAGE = 4;
const LANDSCAPE_ROWS_PER_PAGE = 3;

const PAGE_MARGIN = 30;
const CARD_GAP = 12;

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  page: {
    padding: PAGE_MARGIN,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: CARD_GAP,
  },
  cardPortrait: {
    width: PORTRAIT_CARD_WIDTH,
    height: PORTRAIT_CARD_HEIGHT,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    marginHorizontal: CARD_GAP / 2,
    flexDirection: "row",
  },
  cardLandscape: {
    width: LANDSCAPE_CARD_WIDTH,
    height: LANDSCAPE_CARD_HEIGHT,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    marginHorizontal: CARD_GAP / 2,
    flexDirection: "column",
    alignItems: "center",
  },
  // Portrait layout: photo on left, info on right
  photoContainerPortrait: {
    width: 90,
    height: "100%",
    backgroundColor: "#F3F4F6",
  },
  infoContainerPortrait: {
    flex: 1,
    padding: 10,
    justifyContent: "center",
  },
  // Landscape layout: header bar, then photo + info row
  headerBar: {
    width: "100%",
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 8,
  },
  landscapeBody: {
    flex: 1,
    flexDirection: "row",
    padding: 6,
    alignItems: "center",
  },
  photoContainerLandscape: {
    width: 60,
    height: 72,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  photo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  photoPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  schoolName: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  personName: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 2,
  },
  className: {
    fontSize: 9,
    color: "#6B7280",
    marginBottom: 2,
  },
  yearText: {
    fontSize: 8,
    color: "#9CA3AF",
    marginTop: 4,
  },
  logoSmall: {
    width: 16,
    height: 16,
    marginRight: 4,
  },
  qrCode: {
    width: 36,
    height: 36,
    marginTop: 4,
  },
  idLabel: {
    fontSize: 6,
    color: "#9CA3AF",
    marginTop: 2,
  },
});

// ============================================================
// ID Card Component
// ============================================================

function IdCard({
  person,
  config,
  schoolName,
  schoolLogoUrl,
  year,
  qrDataUri,
}: {
  person: IdCardPersonData;
  config: IdCardTemplateConfig;
  schoolName: string;
  schoolLogoUrl: string | null;
  year: string;
  qrDataUri: string | null;
}) {
  const displayName = person.preferred_name
    ? `${person.preferred_name} ${person.last_name}`
    : `${person.first_name} ${person.last_name}`;

  const initials =
    `${person.first_name.charAt(0)}${person.last_name.charAt(0)}`.toUpperCase();

  const subtitle =
    person.person_type === "student" ? person.class_name : person.position;

  if (config.card_orientation === "landscape") {
    return (
      <View style={styles.cardLandscape}>
        {/* Coloured header bar */}
        <View
          style={[styles.headerBar, { backgroundColor: config.primary_color }]}
        >
          {config.show_logo && schoolLogoUrl ? (
            <Image src={schoolLogoUrl} style={styles.logoSmall} />
          ) : null}
          <Text style={styles.schoolName}>{schoolName}</Text>
        </View>

        {/* Body: photo + info */}
        <View style={styles.landscapeBody}>
          <View style={styles.photoContainerLandscape}>
            {person.photo_url ? (
              <Image src={person.photo_url} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.placeholderText}>{initials}</Text>
              </View>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.personName,
                {
                  fontSize: config.font_size_name,
                  color: config.secondary_color,
                },
              ]}
            >
              {displayName}
            </Text>
            {config.show_class && subtitle ? (
              <Text
                style={[styles.className, { fontSize: config.font_size_class }]}
              >
                {subtitle}
              </Text>
            ) : null}
            {config.show_year ? (
              <Text style={styles.yearText}>{year}</Text>
            ) : null}
            {config.show_qr_code && qrDataUri ? (
              <Image src={qrDataUri} style={styles.qrCode} />
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  // Portrait layout
  return (
    <View style={styles.cardPortrait}>
      {/* Photo side */}
      <View
        style={[
          styles.photoContainerPortrait,
          { backgroundColor: config.primary_color + "15" },
        ]}
      >
        {person.photo_url ? (
          <Image src={person.photo_url} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.placeholderText}>{initials}</Text>
          </View>
        )}
      </View>

      {/* Info side */}
      <View style={styles.infoContainerPortrait}>
        {config.show_logo && schoolLogoUrl ? (
          <Image
            src={schoolLogoUrl}
            style={[styles.logoSmall, { marginBottom: 4 }]}
          />
        ) : null}
        <Text
          style={[
            styles.personName,
            { fontSize: config.font_size_name, color: config.secondary_color },
          ]}
        >
          {displayName}
        </Text>
        {config.show_class && subtitle ? (
          <Text
            style={[styles.className, { fontSize: config.font_size_class }]}
          >
            {subtitle}
          </Text>
        ) : null}
        {config.show_year ? <Text style={styles.yearText}>{year}</Text> : null}
        {config.show_qr_code && qrDataUri ? (
          <Image src={qrDataUri} style={styles.qrCode} />
        ) : null}
        <Text style={styles.idLabel}>
          ID: {person.id.slice(0, 8).toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

// ============================================================
// Main Document
// ============================================================

export function IdCardDocument({
  people,
  config,
  schoolName,
  schoolLogoUrl,
  year,
  qrDataUris,
}: IdCardPdfProps) {
  const rowsPerPage =
    config.card_orientation === "portrait"
      ? PORTRAIT_ROWS_PER_PAGE
      : LANDSCAPE_ROWS_PER_PAGE;
  const cardsPerPage = rowsPerPage * CARDS_PER_ROW;

  // Chunk people into pages
  const pages: IdCardPersonData[][] = [];
  for (let i = 0; i < people.length; i += cardsPerPage) {
    pages.push(people.slice(i, i + cardsPerPage));
  }

  return (
    <Document>
      {pages.map((pagePeople, pageIdx) => {
        // Chunk into rows
        const rows: IdCardPersonData[][] = [];
        for (let i = 0; i < pagePeople.length; i += CARDS_PER_ROW) {
          rows.push(pagePeople.slice(i, i + CARDS_PER_ROW));
        }

        return (
          <Page key={pageIdx} size="A4" style={styles.page}>
            {rows.map((rowPeople, rowIdx) => (
              <View key={rowIdx} style={styles.row}>
                {rowPeople.map((person) => (
                  <IdCard
                    key={person.id}
                    person={person}
                    config={config}
                    schoolName={schoolName}
                    schoolLogoUrl={schoolLogoUrl}
                    year={year}
                    qrDataUri={qrDataUris.get(person.id) ?? null}
                  />
                ))}
              </View>
            ))}
          </Page>
        );
      })}
    </Document>
  );
}
