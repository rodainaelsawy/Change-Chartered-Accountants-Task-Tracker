-- Roles v2: 'admin' (مدير), 'member' (مشرف: like admin but sees only their tasks), 'staff' (عضو: their tasks, companies read-only).
-- Being an assignee or a follower is now a per-task relationship for any role, so the 'follower' role is retired
-- (its users become 'staff' in 007; the enum value stays because Postgres cannot drop enum values).
alter type user_role add value if not exists 'staff';
