# Moderation

WattleOS provides moderation tools to maintain a safe, professional communication environment. Moderators can hide inappropriate messages, control who can post in channels, and manage the overall tone of school communications.

## Message Moderation

### Hiding Messages

Moderators can hide any message in any channel. Hidden messages are removed from the visible conversation but preserved in the database for audit purposes. Each hidden message records:

- **Who hid it** - The moderator's user ID
- **Why** - A required reason explaining why the message was hidden (e.g. "Inappropriate language," "Off-topic," "Contains personal information about another family")

Hidden messages are not deleted - they can be unhidden if the moderation decision is reversed. This preserves the complete communication history while keeping the visible conversation appropriate.

### Unhiding Messages

If a message was hidden in error, a moderator can unhide it. This clears the hidden flag, the hidden_by reference, and the reason, restoring the message to the visible conversation.

### Message Deletion vs Hiding

WattleOS distinguishes between deletion and hiding:

- **Deletion** is available to the message sender only. A user can soft-delete their own messages. Moderators cannot delete other users' messages.
- **Hiding** is available to moderators only. It removes the message from view without the sender's involvement. This is the appropriate tool for content moderation.

This separation ensures that moderation actions are transparent (recorded with a reason) while still allowing users to manage their own messages.

## Channel Moderation Settings

### Moderated Channels

When a channel's `is_moderated` flag is enabled, it signals that moderators are actively reviewing content. This setting is informational in the current implementation - messages are posted immediately rather than queued for approval - but it indicates to members that the channel is monitored and inappropriate content will be hidden.

### Controlling Parent Posting

The `allow_parent_posts` setting on class group and program group channels controls whether parents can send messages:

- **Enabled (default)** - Parents can send text, images, and files in the channel. This creates a two-way communication channel.
- **Disabled** - Parents can only read messages. Only staff can post. This is useful for channels that serve as one-way information broadcasts, such as weekly updates or homework instructions.

This setting does not affect direct message channels - parents can always send messages in DMs.

### Deactivating Channels

Setting a channel to inactive prevents all new messages without deleting the conversation history. Inactive channels remain visible in the inbox (for historical reference) but the message input is disabled. This is useful for end-of-year archiving or when a class is dissolved.

## Moderation Best Practices

When hiding a message, always provide a clear reason. This creates an audit trail and helps if the moderation decision is questioned. Good reasons are specific: "Contains another family's medical information" is better than "Inappropriate."

Use the `allow_parent_posts` toggle rather than hiding messages when the issue is parents posting in a channel that should be staff-only. Preventing posts is better than moderating after the fact.

For persistent issues with a specific user, address the behaviour through direct communication rather than repeatedly hiding their messages. WattleOS does not currently support blocking or muting individual users from channels, so moderation is message-level rather than user-level.

## Permissions

- **Moderate Chat** - Hide and unhide messages. Create staff channels. Update channel settings (name, moderation flags, active status, parent posting). This is the primary moderation permission.
- **Send Announcements** - Not a moderation permission, but relevant because announcement authors can view acknowledgement statistics.
- **Manage Directory** - Controls visibility in the school directory, which affects who appears as available for direct messages.
- **View Message Analytics** - Access communication metrics and usage statistics.
