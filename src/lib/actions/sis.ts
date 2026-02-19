// ============================================================
// WattleOS V2 — SIS Actions Barrel Export
// ============================================================
// Re-exports all Student Information System actions for
// convenient importing. Usage:
//   import { listStudents, createStudent } from '@/lib/actions/sis';
// ============================================================

export {
  listStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
} from './students';

export type {
  CreateStudentInput,
  UpdateStudentInput,
  ListStudentsParams,
} from './students';

export {
  listClasses,
  getClass,
  getClassRoster,
  createClass,
  updateClass,
  deleteClass,
} from './classes';

export type {
  CreateClassInput,
  UpdateClassInput,
} from './classes';

export {
  enrollStudent,
  transferStudent,
  withdrawStudent,
  getStudentEnrollmentHistory,
} from './enrollments';

export type {
  EnrollStudentInput,
  TransferStudentInput,
} from './enrollments';

export {
  listGuardians,
  createGuardian,
  updateGuardian,
  removeGuardian,
} from './guardians';

export type {
  CreateGuardianInput,
  UpdateGuardianInput,
} from './guardians';

export {
  listMedicalConditions,
  listCriticalMedicalConditions,
  createMedicalCondition,
  updateMedicalCondition,
  deleteMedicalCondition,
} from './medical';

export type {
  CreateMedicalConditionInput,
  UpdateMedicalConditionInput,
} from './medical';

export {
  listEmergencyContacts,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
} from './emergency-contacts';

export type {
  CreateEmergencyContactInput,
  UpdateEmergencyContactInput,
} from './emergency-contacts';

export {
  listCustodyRestrictions,
  createCustodyRestriction,
  updateCustodyRestriction,
  deleteCustodyRestriction,
} from './custody';

export type {
  CreateCustodyRestrictionInput,
  UpdateCustodyRestrictionInput,
} from './custody';