-- Add new roles to user_szerepkor enum
ALTER TYPE user_szerepkor ADD VALUE 'rendszergazda';
ALTER TYPE user_szerepkor ADD VALUE 'vezeto';
ALTER TYPE user_szerepkor ADD VALUE 'betekinto';
ALTER TYPE user_szerepkor ADD VALUE 'auditor';
