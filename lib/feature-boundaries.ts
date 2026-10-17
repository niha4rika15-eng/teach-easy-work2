export type BoundaryStatus = 'available' | 'not-configured'

export type FeatureBoundary = {
  key: 'rag' | 'embeddings' | 'persistence' | 'storage-rls' | 'evaluation' | 'notifications' | 'google-forms'
  label: string
  status: BoundaryStatus
  description: string
  nextStep: string
}

export const FEATURE_BOUNDARIES: readonly FeatureBoundary[] = [
  {
    key: 'rag',
    label: 'Research-grounded generation',
    status: 'not-configured',
    description: 'Generation currently uses the selected template and entered context only.',
    nextStep: 'Connect a document source and retrieval pipeline before citing external material.',
  },
  {
    key: 'embeddings',
    label: 'Semantic search and embeddings',
    status: 'not-configured',
    description: 'No vectors are created or searched in this build.',
    nextStep: 'Add an embedding model and vector store before enabling similarity search.',
  },
  {
    key: 'persistence',
    label: 'Server-side persistence',
    status: 'not-configured',
    description: 'Generated results remain in the current browser session and are not treated as durable records.',
    nextStep: 'Apply the approved database schema and ownership policies before saving user content.',
  },
  {
    key: 'storage-rls',
    label: 'Supabase storage and RLS',
    status: 'not-configured',
    description: 'No file bucket, upload policy, or new RLS policy is introduced by this safe build.',
    nextStep: 'Review the existing schema, choose a bucket, and apply least-privilege storage and table policies through the approved Supabase workflow.',
  },
  {
    key: 'evaluation',
    label: 'Evaluation and score persistence',
    status: 'not-configured',
    description: 'No NEP, fact-check, or quality score is calculated or persisted.',
    nextStep: 'Define evaluation inputs, scoring criteria, retention, and ownership before adding a versioned migration and server-side evaluator.',
  },
  {
    key: 'notifications',
    label: 'Notifications',
    status: 'not-configured',
    description: 'The app does not send email, push, or scheduled notifications.',
    nextStep: 'Configure a delivery provider and notification preferences before sending messages.',
  },
  {
    key: 'google-forms',
    label: 'Google Forms publishing',
    status: 'not-configured',
    description: 'The quiz preview and copyable schema are available; no form is created automatically.',
    nextStep: 'Authorize Google Forms access before creating or updating forms for a user.',
  },
] as const

export function getUnavailableBoundaries() {
  return FEATURE_BOUNDARIES.filter((boundary) => boundary.status === 'not-configured')
}

export function isBoundaryAvailable(key: FeatureBoundary['key']) {
  return FEATURE_BOUNDARIES.some((boundary) => boundary.key === key && boundary.status === 'available')
}
