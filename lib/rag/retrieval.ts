import { createClient } from '@/lib/supabase/server'

export type RetrievedChunk = {
  id: string
  document_id: string
  title: string
  content: string
  source_metadata: Record<string, unknown>
  similarity: number
}

export async function retrieveDocumentChunks(queryEmbedding: number[], courseId?: string, limit = 8) {
  if (queryEmbedding.length !== 1536) throw new Error('Embedding dimension does not match the database contract.')
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Authentication is required for retrieval.')
  const { data, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: limit,
    requested_course_id: courseId ?? null,
  })
  if (error) throw new Error(`Retrieval failed: ${error.message}`)
  return (data ?? []) as RetrievedChunk[]
}
