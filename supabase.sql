-- 2. Tabella principale per le note
CREATE TABLE IF NOT EXISTS manual_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Riferimento al contenuto
  manual_id UUID NOT NULL,
  section_id UUID,
  article_id UUID,
  
  -- Contenuto della nota
  content TEXT NOT NULL CHECK (char_length(content) >= 10 AND char_length(content) <= 500),
  note_type VARCHAR(20) NOT NULL DEFAULT 'tip' CHECK (note_type IN ('tip', 'warn', 'ask', 'clarify')),
  
  -- Metadata
  user_id UUID NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT true,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_reference CHECK (
    (section_id IS NULL AND article_id IS NULL) OR
    (section_id IS NOT NULL AND article_id IS NULL) OR
    (section_id IS NOT NULL AND article_id IS NOT NULL)
  )
);

-- 3. Aggiungi le foreign keys dopo aver creato la tabella (se le tabelle esistono)
DO $$
BEGIN
  -- Aggiungi FK per manual_id se manuals esiste
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'manuals') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'manual_notes_manual_id_fkey'
    ) THEN
      ALTER TABLE manual_notes 
      ADD CONSTRAINT manual_notes_manual_id_fkey 
      FOREIGN KEY (manual_id) REFERENCES manuals(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- Aggiungi FK per section_id se sections esiste
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sections') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'manual_notes_section_id_fkey'
    ) THEN
      ALTER TABLE manual_notes 
      ADD CONSTRAINT manual_notes_section_id_fkey 
      FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- Aggiungi FK per article_id se articles esiste
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'articles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'manual_notes_article_id_fkey'
    ) THEN
      ALTER TABLE manual_notes 
      ADD CONSTRAINT manual_notes_article_id_fkey 
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- Aggiungi FK per user_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'manual_notes_user_id_fkey'
  ) THEN
    ALTER TABLE manual_notes 
    ADD CONSTRAINT manual_notes_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Indici per performance
CREATE INDEX IF NOT EXISTS idx_manual_notes_manual_id ON manual_notes(manual_id);
CREATE INDEX IF NOT EXISTS idx_manual_notes_section_id ON manual_notes(section_id);
CREATE INDEX IF NOT EXISTS idx_manual_notes_article_id ON manual_notes(article_id);
CREATE INDEX IF NOT EXISTS idx_manual_notes_user_id ON manual_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_notes_created_at ON manual_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manual_notes_note_type ON manual_notes(note_type);

-- 5. Tabella per le reazioni
CREATE TABLE IF NOT EXISTS manual_note_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL,
  user_id UUID NOT NULL,
  reaction_type VARCHAR(10) NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like', 'helpful', 'warning')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(note_id, user_id)
);

-- 6. Aggiungi FK per manual_note_reactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'manual_note_reactions_note_id_fkey'
  ) THEN
    ALTER TABLE manual_note_reactions 
    ADD CONSTRAINT manual_note_reactions_note_id_fkey 
    FOREIGN KEY (note_id) REFERENCES manual_notes(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'manual_note_reactions_user_id_fkey'
  ) THEN
    ALTER TABLE manual_note_reactions 
    ADD CONSTRAINT manual_note_reactions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_note_reactions_note_id ON manual_note_reactions(note_id);
CREATE INDEX IF NOT EXISTS idx_note_reactions_user_id ON manual_note_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_note_reactions_reaction_type ON manual_note_reactions(reaction_type);

-- 7. View per le note con stats
CREATE OR REPLACE VIEW v_manual_notes_with_stats AS
SELECT 
  mn.*,
  p.display_name,
  p.avatar_url,
  p.nickname,
  COALESCE(COUNT(mnr.id) FILTER (WHERE mnr.reaction_type = 'helpful'), 0)::integer as helpful_content,
  COALESCE(COUNT(mnr.id) FILTER (WHERE mnr.reaction_type = 'like'), 0)::integer as like_count,
  COALESCE(COUNT(mnr.id), 0)::integer as total_reactions,
  COALESCE(
    EXISTS(
      SELECT 1 FROM manual_note_reactions 
      WHERE note_id = mn.id 
      AND user_id = auth.uid()
      AND reaction_type = 'helpful'
    ),
    false
  ) as current_user_reacted_helpful,
  COALESCE(
    EXISTS(
      SELECT 1 FROM manual_note_reactions 
      WHERE note_id = mn.id 
      AND user_id = auth.uid()
    ),
    false
  ) as current_user_reacted
FROM manual_notes mn
LEFT JOIN profiles p ON mn.user_id = p.id
LEFT JOIN manual_note_reactions mnr ON mn.id = mnr.note_id
WHERE mn.is_public = true OR mn.user_id = auth.uid()
GROUP BY mn.id, p.display_name, p.avatar_url, p.nickname;

-- 8. RLS Policies per manual_notes
ALTER TABLE manual_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view public notes" ON manual_notes;
CREATE POLICY "Anyone can view public notes"
  ON manual_notes FOR SELECT
  USING (is_public = true OR user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can create notes" ON manual_notes;
CREATE POLICY "Authenticated users can create notes"
  ON manual_notes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own notes" ON manual_notes;
CREATE POLICY "Users can update own notes"
  ON manual_notes FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own notes" ON manual_notes;
CREATE POLICY "Users can delete own notes"
  ON manual_notes FOR DELETE
  USING (user_id = auth.uid());

-- 9. RLS Policies per manual_note_reactions
ALTER TABLE manual_note_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view reactions" ON manual_note_reactions;
CREATE POLICY "Anyone can view reactions"
  ON manual_note_reactions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage reactions" ON manual_note_reactions;
CREATE POLICY "Authenticated users can manage reactions"
  ON manual_note_reactions FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 10. Trigger per updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_manual_notes_updated_at ON manual_notes;
CREATE TRIGGER update_manual_notes_updated_at
  BEFORE UPDATE ON manual_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();