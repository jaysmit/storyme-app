-- Storage policies for photos bucket
-- Allow authenticated users to upload their own photos
CREATE POLICY "Users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to read their own photos
CREATE POLICY "Users can read own photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access to all photos (for display)
CREATE POLICY "Public can read all photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'photos');

-- Allow users to delete their own photos
CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);
