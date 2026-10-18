'use client';

import { useEffect, useState } from 'react';
import { AppNav } from '@/components/app-nav';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { SharedMaterial, Notification } from '@/lib/types';
import { BookOpen, Bell, FileText, ExternalLink, Clock, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function StudentDashboard() {
  const { profile } = useAuth();
  const [materials, setMaterials] = useState<SharedMaterial[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      setIsLoading(true);
      const [materialsResult, alarmsResult] = await Promise.all([
        supabase.from('course_materials')
          .select('id, professor_id, title, file_url, subject_code, is_shared_with_students, created_at')
          .eq('is_shared_with_students', true)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('student_alarms')
          .select('id, student_id, title, alarm_time, is_completed, created_at')
          .eq('student_id', profile.id)
          .order('alarm_time', { ascending: true })
          .limit(5),
      ]);

      setMaterialsError(materialsResult.error?.message ?? null);
      setNotificationsError(alarmsResult.error?.message ?? null);
      setMaterials((materialsResult.data ?? []).map((material) => ({
        id: material.id,
        professor_id: material.professor_id ?? '',
        title: material.title,
        file_url: material.file_url,
        subject: material.subject_code,
        student_ids: [],
        created_at: material.created_at ?? '',
      })));
      setNotifications((alarmsResult.data ?? []).map((alarm) => ({
        id: alarm.id,
        user_id: alarm.student_id ?? profile.id,
        title: alarm.title,
        scheduled_for: alarm.alarm_time,
        notification_type: 'Reminder',
        is_sent: alarm.is_completed ?? false,
        created_at: alarm.created_at ?? '',
      })));
      setIsLoading(false);
    })();
  }, [profile]);

  return (
    <AppNav>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {profile?.full_name}</h1>
          <p className="mt-1 text-muted-foreground">Access your shared materials and stay on track with notifications.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Available Materials</CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{materialsError ? '—' : materials.length}</div></CardContent>
          </Card>
          <Card className="border-accent/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Notifications</CardTitle>
              <Bell className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{notificationsError ? '—' : notifications.filter(n => !n.is_sent).length}</div></CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Recent Materials</h2>
              <Link href="/student/materials"><Button variant="ghost" size="sm" className="gap-1">View All</Button></Link>
            </div>
            {isLoading ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Loading materials...</CardContent></Card>
            ) : materialsError ? (
              <Card><CardContent className="py-8 text-center text-sm text-destructive">Materials could not be loaded: {materialsError}</CardContent></Card>
            ) : materials.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No materials available yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {(materials || []).map((m) => (
                  <Card key={m.id} className="border-border/60">
                    <CardContent className="flex items-start gap-3 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{m.title}</p>
                        {m.subject && <p className="text-sm text-muted-foreground">{m.subject}</p>}
                        {m.file_url && (
                          <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                            Open file <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Upcoming Notifications</h2>
              <Link href="/student/notifications"><Button variant="ghost" size="sm">View All</Button></Link>
            </div>
            {isLoading ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Loading notifications...</CardContent></Card>
            ) : notificationsError ? (
              <Card><CardContent className="py-8 text-center text-sm text-destructive">Reminders could not be loaded: {notificationsError}</CardContent></Card>
            ) : notifications.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No notifications scheduled</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {(notifications || []).map((n) => (
                  <Card key={n.id} className="border-border/60">
                    <CardContent className="flex items-start gap-3 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{n.title}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" /> {new Date(n.scheduled_for).toLocaleString()}
                        </p>
                      </div>
                      {!n.is_sent && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">Scheduled</span>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppNav>
  );
}
