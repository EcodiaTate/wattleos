# Check-In and Check-Out

WattleOS records precise arrival and departure times for students through the check-in and check-out system. This provides a detailed record of exactly when each student was on school premises.

## How Check-In Works

When a student arrives at school, a staff member can check them in. The check-in action records the current time and sets the student's attendance status to Present for that day.

Check-in uses the same underlying attendance system as roll call. If a student is checked in before the roll is taken, their status will already show as Present when the guide opens the roll call page. If the roll has already been taken, checking in updates the existing record.

## How Check-Out Works

When a student leaves for the day, a staff member records a check-out. This updates the existing attendance record for that student and date with a departure timestamp.

Check-out requires that an attendance record already exists for the student on that day. If the student was not checked in or marked present through roll call, the system will indicate that no record was found. The guide should mark the student's attendance first, then record the check-out.

## When to Use Check-In / Check-Out

Check-in and check-out are most valuable for:

- **Before and after school care programs**: Students may arrive and depart at different times. Precise timestamps help calculate billing for extended care and satisfy regulatory requirements for child-to-staff ratios.

- **Flexible arrival windows**: Montessori schools often have a staggered arrival window (e.g. 8:00–8:30). Check-in records exactly when each child arrived.

- **Early departures**: When a parent picks up a child mid-day, checking them out creates a record of when they left the premises.

- **Regulatory compliance**: Some Australian states require schools to maintain records of when children are physically present on-site, not just whether they attended that day.

## Relationship to Roll Call

Check-in and check-out complement but do not replace roll call. Roll call captures the day's overall attendance status (Present, Absent, Late, etc.), while check-in/check-out records the specific times. A typical day might look like:

1. Students arrive - checked in at 8:15, 8:22, 8:28, etc.
2. Morning roll is taken - guide confirms who is present, marks absences
3. A student leaves early at 2pm - checked out, note added to attendance record
4. End of day - remaining students are checked out as they are picked up

Both systems write to the same attendance record in the database, ensuring a single source of truth per student per day.

## Permissions

Check-in and check-out require the **Manage Attendance** permission, the same permission used for roll call. Any staff member who can take the roll can also record check-ins and check-outs.
