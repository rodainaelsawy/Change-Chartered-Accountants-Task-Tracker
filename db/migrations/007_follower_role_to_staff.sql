-- Separate file: a new enum value can only be used after the transaction that added it (006) has committed.
update users set role = 'staff' where role = 'follower';
