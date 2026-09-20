-- 1. Bővítjük az ugyirat_statusz enumot a 'selejtezett' értékkel
ALTER TYPE ugyirat_statusz ADD VALUE IF NOT EXISTS 'selejtezett';

-- 2. Frissítjük az irat SELECT RLS szabályt, hogy tartalmazza a minősítési szint ellenőrzését
DROP POLICY IF EXISTS "Irat megtekintes szigoru ABAC" ON irat;

CREATE POLICY "Irat megtekintes szigoru ABAC" ON irat
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM felhasznalo_profil fp
    WHERE fp.id = auth.uid()
    -- KÖTELEZŐ: az irat minősítése nem haladhatja meg a felhasználó minősítését (kivéve admin)
    AND (fp.docs_szerepkor::text = 'admin' OR irat.minosites <= fp.max_minosites)
    AND (
      -- Admin, iktató, auditor minden engedélyezett minősítésű iratot láthat
      fp.docs_szerepkor::text IN ('admin', 'iktato', 'auditor') OR
      -- Még nem iktatott bejövő iratok az inboxban
      irat.ugyirat_id IS NULL OR
      -- Iktatott iratok esetén osztály vagy explicit hozzáférés
      public.check_ugyirat_user_access(irat.ugyirat_id, fp.id, fp.szervezeti_egyseg_id)
    )
  )
);
