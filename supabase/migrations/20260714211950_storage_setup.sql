-- Create a private storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('irat_files', 'irat_files', false, 52428800, '{application/pdf,image/png,image/jpeg}')
ON CONFLICT (id) DO NOTHING;



-- Storage RLS Policies for the irat_files bucket
CREATE POLICY "Allow authenticated users to insert files" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'irat_files');

CREATE POLICY "Allow authenticated users to read files" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'irat_files');
