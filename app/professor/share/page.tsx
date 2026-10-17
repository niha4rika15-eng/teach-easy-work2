'use client';

import { useEffect, useState } from 'react';
import { AppNav } from '@/components/app-nav';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase/client';
import { SharedMaterial } from '@/lib/types';
import { Users, FileText, Trash2, Upload, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function SharePage() {
  const { profile } = useAuth();
  const [materials, setMaterials] = useState<SharedMaterial[]>([]);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data, error } = await supabase.from('course_materials')
        .select('id, professor_id, title, file_url, subject_code, is_shared_with_students, created_at')
        .eq('professor_id', profile.id)
        .order('created_at', { ascending: false });
      if (error) setLoadError(error.message);
      setMaterials((data ?? []).map((material) => ({
        id: material.id,
        professor_id: material.professor_id ?? profile.id,
        title: material.title,
        file_url: material.file_url,
        subject: material.subject_code,
        student_ids: [],
        created_at: material.created_at ?? '',
      })));
    })();
  }, [profile]);

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || isSubmitting) return;
    if (!title.trim() || !subject.trim() || !fileUrl.trim()) {
      toast.error('Title, subject code, and a resource URL are required.');
      return;
    }
    try {
      const parsedUrl = new URL(fileUrl);
      if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
        toast.error('Enter a valid HTTP or HTTPS resource URL.');
        return;
      }
    } catch {
      toast.error('Enter a valid HTTP or HTTPS resource URL.');
      return;
    }
    setIsSubmitting(true);
    const { data, error } = await supabase.from('course_materials').insert({
      professor_id: profile.id,
      title: title.trim(),
      subject_code: subject.trim(),
      file_url: fileUrl.trim(),
      is_shared_with_students: true,
    }).select().single();

    if (error || !data) {
      setLoadError(error?.message || 'The material was not saved.');
      toast.error(`Material was not shared: ${error?.message || 'The database returned no saved record.'}`);
      setIsSubmitting(false);
      return;
    }
    const material: SharedMaterial = {
      id: data.id,
      professor_id: data.professor_id ?? profile.id,
      title: data.title,
      file_url: data.file_url,
      subject: data.subject_code,
      student_ids: [],
      created_at: data.created_at ?? '',
    };
    setMaterials((current) => [material, ...current]);
    setLoadError(null);
    setTitle(''); setSubject(''); setFileUrl('');
    toast.success('Material shared successfully with students.');
    setIsSubmitting(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('course_materials').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      setMaterials(materials.filter((m) => m.id !== id));
      toast.success('Material removed');
    }
  }

  return (
    <AppNav>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Share Materials</h1>
          <p className="mt-1 text-muted-foreground">Share files and resources with your students</p>
        </div>
        {loadError && <Card className="border-destructive/40 bg-destructive/5"><CardContent className="py-4 text-sm text-destructive">Sharing is unavailable until the Supabase table, storage, and RLS policies are configured. {loadError}</CardContent></Card>}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary" /> Share New Material</CardTitle>
              <CardDescription>Add a resource for students to access</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleShare} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 5 Notes" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject code</Label>
                  <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. BIO-101" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fileUrl">Resource URL</Label>
                  <Input id="fileUrl" type="url" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://..." required />
                  <p className="text-xs text-muted-foreground">Uploads are unavailable because no Supabase Storage bucket is configured. Share an existing HTTP or HTTPS link.</p>
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full gap-2"><Upload className="h-4 w-4" />{isSubmitting ? 'Sharing...' : 'Share Material'}</Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Shared Materials ({materials.length})</h2>
            {materials.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No materials shared yet</p>
                </CardContent>
              </Card>
            ) : (
              (materials || []).map((m) => (
                <Card key={m.id} className="border-border/60">
                  <CardContent className="flex items-start justify-between p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{m.title}</p>
                        {m.subject && <p className="text-sm text-muted-foreground">{m.subject}</p>}
                        {m.file_url && (
                          <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm text-primary hover:underline">
                            Open file
                          </a>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </AppNav>
  );
}
