# Signing In to WattleOS

WattleOS uses Google Sign-In for all accounts. There are no separate usernames or passwords to remember. How you first sign in depends on how your school has invited you.

## Staff and Guides: Your First Sign-In

Your school administrator will add you to WattleOS and assign your role. Once your account is set up, go to your school's WattleOS URL and click **Continue with Google**. Sign in with the Google account that matches the email your administrator used when setting up your access.

After signing in with Google, one of three things happens:

- **Single school**: You are taken directly to your Dashboard. This is the most common scenario.
- **Multiple schools**: If you work at more than one school using WattleOS (common for relief teachers or network administrators), you will see a school picker. Select which school you want to work in, and you will be taken to that school's Dashboard.
- **No school found**: If your Google account email does not match any WattleOS school, you will see an error. Contact your school administrator to confirm they have added your email address.

## Parents: Accepting Your Invitation

Parents receive access to WattleOS through an invitation email sent after their child's enrollment is approved. The process works like this:

1. You receive an email with a link to your school's WattleOS site (for example, `greenvalley.wattleos.au/invite/your-token`).
2. Click the link. You will be taken to a Google Sign-In page.
3. Sign in with the **same Google account** that matches the email on the invitation. This is important — the system verifies your email matches the invitation for security.
4. On successful sign-in, WattleOS automatically creates your account, links you to your child, and assigns you the Parent role.
5. You land on the Dashboard, where you can see your child's class and start exploring their portfolio.

If you sign in with a different email than the one on the invitation, you will see an error message telling you which email to use. If you need the invitation resent or sent to a different email, contact your school administrator.

Invitation links expire after 14 days. If your link has expired, the school can resend it from the Enrollment section.

## What Happens Behind the Scenes

When you sign in for the first time, WattleOS does several things automatically:

- Creates your user profile using your Google account name and photo
- Links you to your school (tenant) with the correct role and permissions
- For parents accepting invitations: creates the guardian-to-student link, pulls in your contact details from the enrollment application, and sets consent flags (media consent, directory listing)
- Stamps your school's identity into your session so all data you see is scoped to your school

## Signing Out

Click your name or avatar at the bottom of the sidebar, then click **Sign Out**. You will be redirected to the login page.

If you are inactive for 15 minutes, WattleOS will show a warning and automatically sign you out after 60 seconds. This is a security feature, especially important on shared devices like classroom iPads. See the Session Security documentation for more details.

## Signing Out Across Tabs

If you have WattleOS open in multiple browser tabs and sign out from one, all other tabs will detect this and redirect to the login page. This uses browser storage events for cross-tab synchronisation, so you do not need to manually close each tab.

## Troubleshooting Sign-In

**"No school found" error**: Your email is not associated with any WattleOS school. Ask your administrator to check the email address they used when adding you.

**"This invitation has expired"**: Invitation links are valid for 14 days. Ask your school to resend the invitation from the Enrollment section.

**"This invitation was sent to a different email"**: You signed in with a Google account that does not match the invitation. Sign out and sign in again with the correct Google account.

**"Auth failed" error**: The Google sign-in process was interrupted or denied. Try again, and make sure you complete the Google consent screen.

**Stuck on "Signing you in..."**: If the spinner does not resolve after several seconds, try clearing your browser cookies for the WattleOS domain and signing in again. This can happen if a previous session's cookies are stale.

**Redirect loop between login and dashboard**: This rare issue occurs when session cookies become out of sync. Clear all cookies for your WattleOS domain, close all tabs, and sign in fresh. If this persists, contact your administrator.

**"This school account is currently inactive"**: The school's WattleOS subscription may be paused or the account has been deactivated. Contact WattleOS support at support@wattleos.au.
