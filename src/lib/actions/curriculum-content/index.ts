// ============================================================
// WattleOS V2 - Module 14: Curriculum Content Library
// ============================================================
// Barrel export for all curriculum content server actions.
// Split into two files by domain responsibility:
//   - cross-mappings: CRUD for inter-framework outcome links
//   - content-library: Enhanced queries, compliance reports, import
// ============================================================

export {
  bulkCreateCrossMappings,
  // Actions
  createCrossMapping,
  deleteCrossMapping,
  deleteGlobalCrossMapping,
  listCrossMappings,
  listCrossMappingsBetweenTemplates,
  listCrossMappingsForNode,
  resolveLinkedOutcomes,
  updateCrossMapping,
  type BulkCreateResult,
  type BulkCrossMappingInput,
  type CreateCrossMappingInput,
  type CrossMappingConfidence,
  type CrossMappingType,
  type CrossMappingWithDetails,
  // Types
  type CurriculumCrossMapping,
  type LinkedOutcome,
  type LinkedOutcomesResult,
  type ListCrossMappingsFilter,
  type UpdateCrossMappingInput,
} from "./cross-mappings";

export {
  generateComplianceReport,
  getEnrichedNode,
  getPrerequisiteChain,
  importJsonTemplate,
  listAvailableAgeRanges,
  listAvailableFrameworks,
  // Actions
  listTemplatesFiltered,
  searchNodesByCode,
  searchNodesByMaterial,
  updateNodeEnrichment,
  type ComplianceEvidence,
  type ComplianceReport,
  type ComplianceReportItem,
  type EnhancedCurriculumNode,
  // Types
  type EnhancedCurriculumTemplate,
  type ImportResult,
  type JsonTemplateImport,
  type JsonTemplateNode,
  type MaterialSearchResult,
  type TemplateFilter,
  type UpdateNodeEnrichmentInput,
} from "./content-library";
