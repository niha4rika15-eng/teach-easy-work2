'use client';

import { useEffect, useState } from 'react';
import { AppNav } from '@/components/app-nav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/client';
import { UsageLog, Generation, TEMPLATE_TYPE_LABELS } from '@/lib/types';
import { BarChart3, TrendingUp, Activity, Star } from 'lucide-react';

export default function MetricsPage() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [repeatActivityRate, setRepeatActivityRate] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [logsResult, generationsResult] = await Promise.all([
        supabase.from('usage_logs').select('id,user_id,action,route,metadata,created_at').order('created_at', { ascending: false }).limit(100),
        supabase.from('generated_content').select('id,user_id,template_type,target_language,prompt_input,generated_output,nep_compliance_score,hallucination_score,quality_index,opted_in_for_training,created_at').order('created_at', { ascending: false }).limit(100),
      ]);
      const logRows = logsResult.data || [];
      const generationRows = generationsResult.data || [];
      const mappedLogs = logRows.map((log) => ({
        id: String(log.id),
        user_id: log.user_id ?? undefined,
        event_type: log.action,
        event_data: log.metadata as Record<string, unknown>,
        time_saved_minutes: 0,
        created_at: log.created_at,
      })) as UsageLog[];
      const mappedGenerations = generationRows.map((generation) => ({
        id: generation.id,
        user_id: generation.user_id ?? '',
        template_type: generation.template_type,
        target_language: generation.target_language ?? 'English',
        input_variables: {},
        training_opt_in: generation.opted_in_for_training ?? false,
        generated_text: generation.generated_output,
        nep_confidence: generation.nep_compliance_score,
        hallucination_index: generation.hallucination_score,
        quality_rating: generation.quality_index == null ? undefined : generation.quality_index / 10,
        status: 'saved',
        created_at: generation.created_at ?? '',
      })) as Generation[];
      setLogs(mappedLogs);
      setGenerations(mappedGenerations);
      const errors = [logsResult.error?.message, generationsResult.error?.message].filter(Boolean);
      if (errors.length) setLoadError(errors.join(' '));

      const userEventCounts: Record<string, number> = logRows.reduce((acc: Record<string, number>, log) => {
        const userId = log.user_id ?? '';
        if (userId) acc[userId] = (acc[userId] || 0) + 1;
        return acc;
      }, {});
      const returningUsers = Object.values(userEventCounts).filter((count) => count > 1).length;
      const uniqueUsers = Object.keys(userEventCounts).length;
      setRepeatActivityRate(uniqueUsers > 0 ? (returningUsers / uniqueUsers) * 100 : 0);
    })().catch((error: unknown) => setLoadError(error instanceof Error ? error.message : 'Unexpected error loading metrics.'));
  }, []);

  const qualityScores = generations.filter((generation) => generation.quality_rating != null);
  const avgQuality = qualityScores.reduce((sum, generation) => sum + (generation.quality_rating ?? 0) * 10, 0) / (qualityScores.length || 1);

  return (
    <AppNav>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Telemetry & Metrics</h1>
          <p className="mt-1 text-muted-foreground">Recent analytics from the latest 100 saved content records and usage events</p>
        </div>
        {loadError && <Card className="border-destructive/40 bg-destructive/5"><CardContent className="py-4 text-sm text-destructive">Some metrics could not be loaded: {loadError}</CardContent></Card>}

        {/* Activity metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Repeat Activity Rate</CardTitle>
              <Star className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{repeatActivityRate.toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground">Users with multiple events in the latest 100 logs</p>
            </CardContent>
          </Card>
          <Card className="border-accent/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Recent Unique Users</CardTitle>
              <TrendingUp className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{new Set(logs.map((log) => log.user_id).filter(Boolean)).size}</div>
              <p className="text-xs text-muted-foreground">From the latest 100 usage events</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Generated Quality Index</CardTitle>
              <Star className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgQuality.toFixed(1)}/100</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Recent Events</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{logs.length}</div></CardContent>
          </Card>
        </div>

        {/* Generations Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Recent Generations</CardTitle>
            <CardDescription>Recent generated records and any scores stored by the configured evaluator</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>NEP Score</TableHead>
                  <TableHead>Hallucination Score</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(generations || []).map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{TEMPLATE_TYPE_LABELS[g.template_type] ?? g.template_type}</TableCell>
                    <TableCell>{g.target_language}</TableCell>
                    <TableCell>
                      {g.nep_confidence != null ? (
                        <span className={g.nep_confidence >= 70 ? 'text-accent font-medium' : 'text-destructive'}>
                          {g.nep_confidence.toFixed(1)}%
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell>{g.hallucination_index != null ? g.hallucination_index.toFixed(2) : '—'}</TableCell>
                    <TableCell>{g.quality_rating != null ? `${g.quality_rating.toFixed(1)}/10` : '—'}</TableCell>
                    <TableCell><Badge variant="secondary">Saved</Badge></TableCell>
                    <TableCell>{g.created_at ? new Date(g.created_at).toLocaleDateString() : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Usage Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Logs</CardTitle>
            <CardDescription>Latest 100 events; saved time estimates are recorded separately in usage telemetry</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Time Saved</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(logs || []).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium capitalize">{log.event_type.replace(/_/g, ' ')}</TableCell>
                      <TableCell>{log.time_saved_minutes > 0 ? `${log.time_saved_minutes}m` : '—'}</TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{JSON.stringify(log.event_data)}</TableCell>
                      <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppNav>
  );
}
