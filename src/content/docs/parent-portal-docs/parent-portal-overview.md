# Parent Portal Overview

The parent portal is your window into your child's Montessori journey. It brings together everything that matters - observations from the classroom, mastery progress, attendance, reports, messages from guides, program bookings, and billing - in a single, simplified interface. Unlike the staff view with its full sidebar of administrative modules, the parent portal is designed to be clean and focused. You see only what is relevant to your children.

## Getting Access

Parent access is created during the enrollment approval process. When your child's enrollment application is approved, the school sends you an invitation email with a secure link. Clicking the link takes you through account creation (via Google sign-in) and automatically links your account to your child. Once set up, you log in at your school's WattleOS address and land directly on the parent dashboard.

If you have not received an invitation or cannot access the portal, contact your school's administration. They can resend the invitation or manually link your account to your child.

## The Parent Dashboard

The dashboard is the first page you see after logging in. It shows a welcome message with your name and an overview card for each child linked to your account. If you have multiple children at the school, each gets their own card.

Each child's overview card displays their photo (or initials), name, and the class they are currently enrolled in. Below that, four summary panels give you a snapshot of what is happening. The attendance panel shows total school days recorded, how many your child was present, and the overall attendance rate. The observations panel shows the count of recent published observations. The mastery panel shows how many curriculum outcomes your child has been presented, is practicing, and has mastered, with a percentage mastered figure. The reports panel shows how many published term reports are available.

Clicking into any of these panels takes you to the corresponding detail page for that child.

## Navigating Between Children

If you have more than one child at the school, all children appear on the dashboard. Each child's portfolio, attendance, and reports are accessed from their individual card or by navigating to the child-specific routes. The portal always verifies your guardian relationship before showing any data - you can only see information for children where you are a registered guardian.

## What Parents Can See

The parent portal provides read-only access to most school data about your children. You can view published observations (with photos, videos, and tagged curriculum outcomes), mastery progress across curriculum areas, attendance records and patterns, published term reports, school announcements, and messages from your child's guides.

What you will not see are draft observations, staff-only notes, other children's data, administrative tools, or any records where the observation has not been published by the guide. This curation is intentional - the portal shows a complete picture of your child's learning, but only the information that has been reviewed and shared by the school.

## What Parents Can Do

While most of the portal is read-only, there are several actions available to parents. You can update your consent preferences (media and directory consent) through the settings page. You can update your phone number without needing to contact the school. You can browse and book program sessions (OSHC, extracurriculars, vacation care). You can send and receive messages with your child's guides. You can view and pay invoices through the billing page. And during re-enrollment periods, you can review and submit your child's re-enrollment form with pre-filled data.

## Permissions and Security

Parent access does not use the same permission system as staff accounts. Instead, everything is controlled by the guardian relationship. At the database level, a function called `is_guardian_of` checks whether your user account is linked as a guardian to a given student. This check runs on every data request - both in the application code and at the database row-level security layer - providing defence in depth.

This means you cannot access any student's data unless you have an active, non-deleted guardian record linking you to that child. If the school removes your guardian link, portal access to that child's data is revoked immediately.
