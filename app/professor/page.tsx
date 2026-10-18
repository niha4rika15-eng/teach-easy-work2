'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppNav } from '@/components/app-nav';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { FileText, Brain, BarChart3, ArrowRight, Clock, TrendingUp, CheckCircle2, Globe } from 'lucide-react';
import { Generation, QuizForm, TEMPLATE_TYPE_LABELS } from '@/lib/types';

export default function ProfessorDashboard() {
  const { profile } = useAuth();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [quizzes, setQuizzes] = useState<QuizForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, avgNep: 0, avgQuality: 0, languages: new Set<string>() })
  ;

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [generationsResult, generationCountResult, quizzesResult] = await Promise.all([
        supabase.from('generated_content')
          .select('id, user_id, template_type, target_language, generated_output, nep_compliance_score, hallucination_score, quality_index, created_at')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase.from('generated_content')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id),
        supabase.from('quizzes')
          .select('id, professor_id, title, student_quiz_url, professor_results_url, created_at')
          .eq('professor_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);
      const gens: Generation[] = generationsResult.data?.map((row): Generation => ({
        id: row.id,
        user_id: row.user_id ?? profile.id,
        template_type: row.template_type,
        target_language: row.target_language ?? 'English',
        input_variables: {},
        training_opt_in: false,
        generated_text: row.generated_output,
        nep_confidence: row.nep_compliance_score,
        hallucination_index: row.hallucination_score,
        quality_rating: row.quality_index == null ? undefined : row.quality_index / 10,
        status: 'saved',
        created_at: row.created_at ?? '',
      })) ?? [];
      const qs = quizzesResult.data?.map((row) => ({
        id: row.id,
        user_id: row.professor_id ?? profile.id,
        title: row.title,
        student_quiz_link: row.student_quiz_url,
        professor_results_link: row.professor_results_url ?? undefined,
        question_count: 0,
        created_at: row.created_at ?? '',
      }));
      const generationsError = generationsResult.error;
      const quizzesError = quizzesResult.error;
      if (generationsError || generationCountResult.error || quizzesError) setLoadError([generationsError?.message, generationCountResult.error?.message, quizzesError?.message].filter(Boolean).join(' '));
      setGenerations(gens);
      setQuizzes((qs as QuizForm[]) || []);
      setIsLoading(false);

      const nepScores = (gens || []).filter((generation: Generation) => generation.nep_confidence != null);
      const qualityScores = (gens || []).filter((generation: Generation) => generation.quality_rating != null);
      const avgNep = nepScores.reduce((sum: number, generation: Generation) => sum + (generation.nep_confidence ?? 0), 0) / (nepScores.length || 1);
      const avgQuality = qualityScores.reduce((sum: number, generation: Generation) => sum + (generation.quality_rating ?? 0), 0) / (qualityScores.length || 1);
      setStats({ total: generationCountResult.count ?? 0, avgNep, avgQuality, languages: new Set((gens || []).map((generation: Generation) => generation.target_language)) });
    })().catch((error: unknown) => {
      setLoadError(error instanceof Error ? error.message : 'Unexpected error loading professor dashboard.')
      setIsLoading(false)
    });
  }, [profile]);

  return (
    <AppNav>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {profile?.full_name}</h1>
          <p className="mt-1 text-muted-foreground">Prepare educational drafts and share approved materials with your students.</p>
        </div>

        {/* Stats */}
        {loadError && <Card className="border-destructive/40 bg-destructive/5"><CardContent className="py-4 text-sm text-destructive">Saved dashboard data could not be loaded. Check the configured Supabase tables and policies. {loadError}</CardContent></Card>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-primary/20 animate-slide-up">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Generations</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{loadError ? '—' : stats.total}</div></CardContent>
          </Card>
          <Card className="border-accent/20 animate-slide-up">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg NEP Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-accent">{loadError ? '—' : `${stats.avgNep.toFixed(1)}%`}</div></CardContent>
          </Card>
          <Card className="animate-slide-up">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Quality</CardTitle>
              <Brain className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{loadError ? '—' : `${stats.avgQuality.toFixed(1)}/10`}</div></CardContent>
          </Card>
          <Card className="animate-slide-up">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Languages Used</CardTitle>
              <Globe className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{loadError ? '—' : stats.languages.size}</div></CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/professor/generate">
            <Card className="group cursor-pointer border-border/60 transition-all hover:border-primary/30 hover:shadow-lg">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Generate Content</h3>
                  <p className="text-sm text-muted-foreground">Create lesson plans, quizzes, and more</p>
                </div>
                <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/professor/templates">
            <Card className="group cursor-pointer border-border/60 transition-all hover:border-primary/30 hover:shadow-lg">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                  <Brain className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Manage Templates</h3>
                  <p className="text-sm text-muted-foreground">View and customize prompt templates</p>
                </div>
                <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/professor/share">
            <Card className="group cursor-pointer border-border/60 transition-all hover:border-primary/30 hover:shadow-lg">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Share Materials</h3>
                  <p className="text-sm text-muted-foreground">Distribute content to students</p>
                </div>
                <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Generations */}
        <div>
          <h2 className="mb-4 text-xl font-semibold">Recent Generations</h2>
          {isLoading ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Loading generations...</CardContent></Card>
          ) : loadError ? (
            <Card><CardContent className="py-8 text-center text-sm text-destructive">Saved generations could not be loaded: {loadError}</CardContent></Card>
          ) : generations.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-muted-foreground">No generations yet. Start by creating content.</p>
                <Link href="/professor/generate" className="mt-4">
                  <Button size="sm" className="gap-2">Generate Content <ArrowRight className="h-4 w-4" /></Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {(generations || []).map((gen) => (
                <Card key={gen.id} className="border-border/60 transition-all hover:shadow-md">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{TEMPLATE_TYPE_LABELS[gen.template_type] ?? gen.template_type}</p>
                        <p className="text-sm text-muted-foreground">{gen.target_language}{gen.created_at ? ` · ${new Date(gen.created_at).toLocaleDateString()}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {gen.nep_confidence != null && (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-accent" />
                          <span className="text-sm font-medium">{gen.nep_confidence.toFixed(1)}%</span>
                        </div>
                      )}
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize">{gen.status}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Recent Quizzes */}
        <div>
          <h2 className="mb-4 text-xl font-semibold">Recent Quizzes</h2>
          {isLoading ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Loading quizzes...</CardContent></Card>
          ) : loadError ? (
            <Card><CardContent className="py-8 text-center text-sm text-destructive">Saved quizzes could not be loaded: {loadError}</CardContent></Card>
          ) : quizzes.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">No items created yet</CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {(quizzes || []).map((q) => (
                <Card key={q.id} className="border-border/60">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                        <Brain className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{q.title}</p>
                        <p className="text-sm text-muted-foreground">{q.created_at ? new Date(q.created_at).toLocaleDateString() : 'Date unavailable'}</p>
                      </div>
                    </div>
                    {q.student_quiz_link && (
                      <a href={q.student_quiz_link} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-2">
                          <Globe className="h-4 w-4" /> Open Form
                        </Button>
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppNav>
  );
}
