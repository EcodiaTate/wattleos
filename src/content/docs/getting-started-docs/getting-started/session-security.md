# Session Security

WattleOS includes automatic session management to protect student data, especially on shared devices like classroom iPads.

## Idle Timeout

If you are inactive for 15 minutes, WattleOS shows a warning modal with a countdown. You have 60 seconds to click **Stay Signed In** to continue your session. If the countdown reaches zero, WattleOS automatically signs you out and redirects you to the login page.

Activity that resets the idle timer includes mouse movement, keyboard input, touch events, scrolling, and clicking anywhere in the application. Simply having the page open in the background does not count as activity.

If you switch to another application (the WattleOS tab is in the background), the idle timer pauses. It resumes when you return to the WattleOS tab. This prevents false timeouts when you are working in another application.

## Why This Matters

Montessori guides often use shared iPads in classrooms. A guide might put down the iPad mid-observation to help a student, and the next person who picks it up should not have access to sensitive information like medical records, custody restrictions, or another guide's draft observations. The idle timeout ensures that unattended sessions are closed automatically.

## Cross-Tab Logout

If you have WattleOS open in multiple browser tabs and you sign out from one tab, all other tabs detect this and redirect to the login page. This uses browser storage events for synchronisation and works across tabs in the same browser.

## What Triggers a Logout

You will be signed out in these situations:

- You click **Sign Out** in the sidebar
- The idle timeout expires (15 minutes inactive, plus 60-second warning)
- Another tab signs out (cross-tab detection)
- Your session expires on the server (for example, if an administrator revokes your access)
- You navigate to the login page with `?reason=idle`, which indicates the idle timeout was triggered

## After Being Signed Out

When you are signed out, you are redirected to the login page. Simply click **Continue with Google** to sign in again. If you belong to a single school, you will be taken directly to your Dashboard. If you belong to multiple schools, you will see the school picker.

Any unsaved work (like a draft observation you were writing) may be lost if you are signed out by the idle timeout. WattleOS saves observation drafts to the database as you work, so in most cases your draft will be recoverable after signing back in. However, it is good practice to save your work regularly rather than leaving forms open unattended.

## Configuring Timeouts

The default idle timeout is 15 minutes with a 60-second warning. These durations may be adjusted by your school administrator through tenant settings in a future update. Currently, the timeouts are the same for all schools.

Schools that handle particularly sensitive data (for example, schools with students under custody restrictions) may want shorter timeouts. Schools where guides frequently step away from iPads to attend to students may prefer the default or slightly longer timeouts. Contact WattleOS support if you need a custom configuration.
