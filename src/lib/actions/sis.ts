'use server';

// ============================================================
// WattleOS V2 - SIS Actions Barrel Export
// ============================================================
// Re-exports all Student Information System actions for
// convenient importing. Usage:
//   import { listStudents, createStudent } from '@/lib/actions/sis';
// ============================================================

export {
  createStudent,
  deleteStudent,
  getStudent,
  listStudents,
  updateStudent,
} from "./students";

export type {
  CreateStudentInput,
  ListStudentsParams,
  UpdateStudentInput,
} from "./students";

export {
  createClass,
  deleteClass,
  getClass,
  getClassRoster,
  listClasses,
  updateClass,
} from "./classes";

export type { CreateClassInput, UpdateClassInput } from "./classes";

export {
  enrollStudent,
  getStudentEnrollmentHistory,
  transferStudent,
  withdrawStudent,
} from "./enrollments";

export type { EnrollStudentInput, TransferStudentInput } from "./enrollments";

export {
  createGuardian,
  listGuardians,
  removeGuardian,
  updateGuardian,
} from "./guardians";

export type { CreateGuardianInput, UpdateGuardianInput } from "./guardians";

export {
  createMedicalCondition,
  deleteMedicalCondition,
  listCriticalMedicalConditions,
  listMedicalConditions,
  updateMedicalCondition,
} from "./medical";

export type {
  CreateMedicalConditionInput,
  UpdateMedicalConditionInput,
} from "./medical";

export {
  createEmergencyContact,
  deleteEmergencyContact,
  listEmergencyContacts,
  updateEmergencyContact,
} from "./emergency-contacts";

export type {
  CreateEmergencyContactInput,
  UpdateEmergencyContactInput,
} from "./emergency-contacts";

export {
  createCustodyRestriction,
  deleteCustodyRestriction,
  listCustodyRestrictions,
  updateCustodyRestriction,
} from "./custody";

export type {
  CreateCustodyRestrictionInput,
  UpdateCustodyRestrictionInput,
} from "./custody";
