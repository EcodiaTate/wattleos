# Roles and Permissions

WattleOS uses a permissions-based access control system that gives schools complete flexibility in defining who can do what. Rather than hardcoding a fixed set of roles with fixed capabilities, the system separates roles (which are school-defined) from permissions (which are system-defined), and lets administrators mix and match them to suit their staffing structure.

## How It Works

The system has three components. **Permissions** are system-defined capabilities like "Create Observations," "Manage Attendance," or "Approve Timesheets." These are global — every school has the same set of available permissions. New permissions are added through platform updates and are immediately available to all schools.

**Roles** are school-defined groupings of permissions. A role is just a name, a description, and a set of permissions. Schools can create whatever roles make sense for their structure — "Head of School," "Lead Guide," "Office Administrator," "Music Specialist," "Volunteer" — and assign each role exactly the permissions that position requires.

**Role assignments** connect users to roles within a school. Each staff member is assigned one role in each school they belong to. Since a user can belong to multiple schools (relief teachers, network administrators), they can have different roles in different schools.

## Default Roles

When a new school is set up in WattleOS, a standard set of system roles is created automatically. These provide a sensible starting point that most schools can use immediately or customise to fit.

**Owner** has all permissions. This is typically the school principal or proprietor. **Administrator** has all permissions except managing tenant settings. **Head of School** has all pedagogy, SIS, attendance, and communications permissions. **Lead Guide** can create and publish observations, manage curriculum and mastery, view students and medical records, manage attendance, and send class messages. **Guide** can create and publish observations, view students and medical records, manage attendance and mastery, and send class messages. **Assistant** can create observations (but not publish them), view students, and manage attendance. **Parent** has no explicit permissions — parent access is controlled through the guardian relationship rather than the role system.

System roles are marked as protected and cannot be deleted, though their permissions can be modified. Custom roles can be created, edited, and deleted freely.

## Permission Categories

Permissions are grouped by module to make them easier to understand when configuring roles.

**Administration** includes managing school settings, managing users and roles, viewing audit logs, and managing integrations. **Pedagogy** includes creating observations, publishing observations, viewing all observations, managing curriculum, updating mastery status, and managing reports. **SIS (Student Information)** includes viewing students, creating and editing students, viewing medical records, managing medical records, managing custody and safety records, and managing enrollment. **Attendance** includes managing attendance and viewing attendance reports. **Communications** includes sending school announcements and sending class messages. **Timesheets** includes logging time, approving timesheets, and viewing all timesheets.

## Why Permissions, Not Role Names

A critical architectural decision in WattleOS is that database security policies check permissions, not role names. When you access a page or perform an action, the system asks "does this user have the create_observation permission?" rather than "is this user a Guide?"

This means creating a new role never requires a database change or platform update. If a school creates a "Volunteer" role and gives it the "View Students" and "Manage Attendance" permissions, the volunteer can immediately access student lists and the attendance register — no code changes needed.

## Assigning Roles to Staff

Roles are assigned when a staff member is added to the school or invited through the mass invite flow. Each staff member has exactly one role per school. Changing a staff member's role takes effect immediately — their available navigation items and accessible actions update on their next page load.

## Parent Access

Parents do not use the role and permission system. Instead, their access is controlled by the guardian relationship. A parent can see data for their children and only their children, enforced by `is_guardian_of()` checks at both the database level (Row Level Security) and the application level. This means parent access cannot be accidentally expanded by modifying role permissions.

## Permissions

Managing roles and their permission assignments requires the **MANAGE_USERS** permission. Viewing available roles requires authentication but no specific permission.
