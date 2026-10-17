'use client'

import { useRouter } from 'next/navigation'
import { AppNav } from '@/components/app-nav'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Sparkles, ArrowRight, ListChecks } from 'lucide-react'
import type { PromptTemplate } from '@/lib/types'

const TEMPLATES: PromptTemplate[] = [
  { id: 'google-forms-quiz', name: 'Google Forms-Ready Interactive Quiz', template_type: 'quiz', system_prompt: 'Formative and summative assessment with 5 multiple-choice questions, radio-button options, answer keys, and Google Forms export formatting.', variables: ['subject', 'grade_level', 'topic', 'difficulty'], created_at: new Date().toISOString() },
  { id: 'lecture-deck-notes', name: '10-Slide Lecture Deck with Professor Notes', template_type: 'ppt_outline', system_prompt: 'In-class teaching deck with ten slide titles, concept bullets, visual diagram prompts, and professor speaker notes.', variables: ['subject', 'topic', 'audience', 'learning_goal'], created_at: new Date().toISOString() },
  { id: 'structured-study-notes', name: 'Structured Study Notes (Doc / PDF Export)', template_type: 'word_brief', system_prompt: 'Comprehensive course material with learning outcomes, key formulas and definitions, methodologies, summary matrices, and revision prompts.', variables: ['subject', 'grade_level', 'topic', 'learning_outcomes'], created_at: new Date().toISOString() },
  { id: 'visual-context-notes', name: 'Highly Visual & Real-World Context Study Notes', template_type: 'word_brief', system_prompt: 'Engagement-focused notes with relatable analogies, everyday Indian context examples, visual flowchart descriptions, and Did You Know memory anchors.', variables: ['subject', 'topic', 'learner_context', 'key_concept'], created_at: new Date().toISOString() },
]

const CATEGORY_LABELS: Record<string, string> = { quiz: 'Assessment', ppt_outline: 'Lecture deck', word_brief: 'Study notes' }

export default function TemplatesPage() {
  const router = useRouter()
  return (
    <AppNav>
      <main className="flex flex-col gap-6">
        <header>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary"><Sparkles className="size-4" /> Academic content workflows</div>
          <h1 className="text-3xl font-bold tracking-tight">Prompt Templates</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">Choose a focused workflow for assessment, classroom delivery, or student-facing study material.</p>
        </header>
        <div className="grid gap-6 md:grid-cols-2">
          {TEMPLATES.map((template) => (
            <Card key={template.id} className="flex flex-col border-border/60 transition-shadow hover:shadow-lg">
              <CardHeader className="gap-4">
                <div className="flex items-start justify-between gap-4"><div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="size-5" /></div><Badge variant="outline">{CATEGORY_LABELS[template.template_type]}</Badge></div>
                <div><CardTitle className="text-xl leading-tight">{template.name}</CardTitle><CardDescription className="mt-3 leading-relaxed">{template.system_prompt}</CardDescription></div>
              </CardHeader>
              <CardContent className="mt-auto flex flex-col gap-5"><div className="flex flex-wrap gap-2">{(template.variables || []).map((variable) => <Badge key={variable} variant="secondary" className="font-normal">{variable.replace(/_/g, ' ')}</Badge>)}</div><Button onClick={() => router.push(`/professor/generate?template=${template.id}`)} className="w-full gap-2">Use Template <ArrowRight className="size-4" /></Button></CardContent>
            </Card>
          ))}
        </div>
        <Card className="border-dashed bg-muted/30"><CardContent className="flex items-center gap-4 p-5 text-sm text-muted-foreground"><ListChecks className="size-5 shrink-0 text-primary" /><p>Each workflow produces structured, reviewable content with language-aware export actions.</p></CardContent></Card>
      </main>
    </AppNav>
  )
}
