'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppNav } from '@/components/app-nav'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LANGUAGES } from '@/lib/types'
import { getUnavailableBoundaries } from '@/lib/feature-boundaries'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase/client'
import { CheckCircle2, Copy, Download, ExternalLink, FileText, Presentation, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'

type TemplateType = 'quiz' | 'slides' | 'notes' | 'visual'
type Template = { id: string; name: string; type: TemplateType; description: string; variables: string[] }
type Slide = { title: string; bullets: string[]; notes: string }
type QuizQuestion = { question: string; options: string[]; answer: string; rationale: string }
type GeneratedContent = { type: TemplateType; title: string; topic: string; subject: string; body: string; slides: Slide[]; questions: QuizQuestion[] }
type GenerationHistoryItem = { id: string; title: string; type: TemplateType; content: string; timestamp: string; nepScore: number; factCheckScore: number }

const TEMPLATES: Template[] = [
  { id: 'google-forms-quiz', name: 'Google Forms-Ready Interactive Quiz', type: 'quiz', description: 'Five real multiple-choice questions with answer keys, rationales, and publishing-ready options.', variables: ['subject', 'grade_level', 'topic', 'difficulty'] },
  { id: 'lecture-deck-notes', name: '10-Slide Lecture Deck with Professor Notes', type: 'slides', description: 'Ten classroom-ready slides with concept bullets, visual prompts, and speaker notes.', variables: ['subject', 'topic', 'audience', 'learning_goal'] },
  { id: 'structured-study-notes', name: 'Structured Study Notes (Doc / PDF Export)', type: 'notes', description: 'Deep course notes with outcomes, definitions, methodology, case study, and revision prompts.', variables: ['subject', 'grade_level', 'topic', 'learning_outcomes'] },
  { id: 'visual-context-notes', name: 'Highly Visual & Real-World Context Study Notes', type: 'visual', description: 'Story-driven analogies, an applied case study, flowcharts, and memory anchors.', variables: ['subject', 'topic', 'learner_context', 'key_concept'] },
]

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function buildContent(template: Template, values: Record<string, string>): GeneratedContent {
  const subject = values.subject?.trim() || 'Academic Studies'
  const topic = values.topic?.trim() || 'the selected academic topic'
  const audience = values.audience || 'undergraduate learners'
  const goal = values.learning_goal || `explain, apply, and evaluate ${topic}`
  const title = `${topic}: A Professional Masterclass`
  let body = `## Executive definition\n${topic} is the deliberate design and coordination of roles, resources, authority, and communication so that individual effort becomes coherent collective performance. It converts an objective into a workable system by answering what must be done, who is responsible, how work is grouped, and how accountability is maintained.\n\n## Why the concept matters\nOrganizing reduces ambiguity and coordination cost. Explicit responsibilities let employees specialize without losing sight of the shared objective. Matching authority with responsibility moves decisions to the person with relevant information, while visible communication channels allow exceptions to be escalated before they become systemic failures.\n\n## Conceptual breakdown\n1. **Division of work:** Separate a complex objective into activities that can be performed with focus and skill.\n2. **Departmentalization:** Group related activities by function, product, geography, or customer segment.\n3. **Delegation:** Transfer decision authority while retaining clear standards and review points.\n4. **Coordination:** Connect teams through shared goals, information flows, meetings, and performance measures.\n5. **Control and learning:** Compare results with standards, investigate variance, and revise the design.\n\n## Comparison table\n| Design principle | Practical question | Evidence |\n| --- | --- | --- |\n| Accountability | Who owns the outcome? | Named decision owner |\n| Coordination | How do handoffs work? | Shared workflow metric |\n| Learning | What changes next? | Reviewed variance |\n\n## Real-world corporate case\nTata Consultancy Services scales distributed delivery teams by assigning accountable owners for solution architecture, delivery, quality assurance, and client communication. Standard operating procedures preserve consistency across locations, while local autonomy lets teams respond to regional requirements.\n\n## Revision prompts\n- Which role or handoff would you clarify first?\n- What evidence would show the structure is working?`
  body = `## Executive definition\n${topic} is a focused academic area within ${subject}. This lesson explains its key ideas, evidence, applications, and limitations so learners can connect the concept to real problems.\n\n## Why the concept matters\nUnderstanding ${topic} helps ${audience} interpret information, ask better questions, and make evidence-based decisions.\n\n## Core concepts\n1. **Definition:** State what ${topic} means and identify its boundaries.\n2. **Mechanism:** Explain how the main process, model, or principle works.\n3. **Evidence:** Examine an example or case related to ${topic}.\n4. **Application:** Use the idea to solve a realistic problem.\n5. **Evaluation:** Identify assumptions, limitations, and improvements.\n\n## Applied example\nConsider a real situation involving ${topic}. Describe the context, select the relevant principle, show the reasoning step by step, and justify the conclusion with evidence.\n\n## Learning outcome\nBy the end, learners can ${goal}.`
  let slides: Slide[] = [
    { title: 'Hook: Where does work get stuck?', bullets: ['Talented teams can still miss targets when ownership is unclear.', 'Hidden friction usually appears at handoffs and decisions.', 'Question: how does structure turn effort into results?'], notes: 'Ask learners to describe a group task that slowed down and classify the cause.' },
    { title: 'Learning goals', bullets: [`Define ${topic} precisely.`, 'Map a complex workflow into accountable activities.', 'Evaluate a structure using evidence and trade-offs.'], notes: `Tell ${audience} that transfer matters more than memorization.` },
    { title: 'The formal definition', bullets: ['Structure combines roles, authority, resources, and communication.', 'It connects individual effort to a shared outcome.', 'Good design reduces ambiguity without removing autonomy.'], notes: 'Contrast a structure that merely looks formal with one that improves decisions.' },
    { title: 'Five building blocks', bullets: ['Division of work', 'Departmentalization', 'Delegation', 'Coordination', 'Control and learning'], notes: 'Have pairs create an example for each block.' },
    { title: 'Worked example: order processing', bullets: ['Map order → inventory → payment → pick → dispatch.', 'Assign one accountable owner per activity.', 'Set a target and escalation threshold.', 'Measure cycle time before and after.'], notes: 'Solve aloud and identify the bottleneck.' },
    { title: 'Corporate case: TCS delivery teams', bullets: ['Specialist ownership supports quality and scale.', 'Standard processes protect consistency.', 'Local decision rights preserve responsiveness.', 'Feedback loops surface exceptions early.'], notes: 'Ask which practices could transfer to a small organization.' },
    { title: 'Choosing a structure', bullets: ['Functional: expertise and efficiency.', 'Product: end-to-end accountability.', 'Geographic: local responsiveness.', 'Matrix: flexible expertise sharing.'], notes: 'Match each structure to a business context.' },
    { title: 'Common misconceptions', bullets: ['More hierarchy does not automatically improve coordination.', 'Delegation retains standards and review.', 'A dashboard needs decision rights and an action path.'], notes: 'Invite evidence for which misconception most often fails.' },
    { title: `Application: ${goal}`, bullets: ['State the outcome and map the work.', 'Assign ownership and design coordination.', 'Test results, investigate variance, and revise.'], notes: 'Give learners five minutes to apply the method.' },
    { title: 'Summary and exit ticket', bullets: ['Effective organizing aligns people, authority, information, and measurement.', 'The best design makes the next decision clear.', 'What would you redesign first?'], notes: 'Collect written answers and use the reasoning to plan the next lesson.' },
  ]
  let questions: QuizQuestion[] = [
    { question: 'Which statement best defines organizing?', options: ['Adding more managerial titles', 'Coordinating roles, authority, resources, and communication toward an outcome', 'Writing a mission statement only', 'Replacing all individual discretion'], answer: 'Coordinating roles, authority, resources, and communication toward an outcome', rationale: 'Organizing creates a workable system of accountability and coordination.' },
    { question: 'A team assigns one accountable owner to each activity. Which building block is applied?', options: ['Delegation and accountability', 'Market segmentation', 'Financial forecasting', 'Brand positioning'], answer: 'Delegation and accountability', rationale: 'Ownership clarifies responsibility and escalation.' },
    { question: 'Which structure is designed for local market responsiveness?', options: ['Functional', 'Geographic', 'Purely centralized', 'Unstructured'], answer: 'Geographic', rationale: 'Geographic grouping gives teams closer knowledge of local conditions.' },
    { question: 'Why is a dashboard insufficient by itself?', options: ['It always increases cost', 'It cannot show numbers', 'Information needs decision rights and an action path', 'Dashboards eliminate accountability'], answer: 'Information needs decision rights and an action path', rationale: 'A signal improves performance only when an empowered owner can act.' },
    { question: 'What makes a structure effective?', options: ['More hierarchy', 'Clear ownership, coordination, and feedback', 'Fewer processes', 'No review points'], answer: 'Clear ownership, coordination, and feedback', rationale: 'Structure should make responsibility and learning visible.' },
  ]
  const isClustering = /cluster(ing)?|k[- ]?means|machine learning/i.test(topic)
  const isPhotosynthesis = /photosynthesis|plant biology| प्रकाश संश्लेषण/i.test(topic)
  if (isPhotosynthesis) {
    body = `## ${topic}\n\n### Definition\nPhotosynthesis is the process by which green plants use light energy to convert carbon dioxide and water into glucose and oxygen.\n\n### Key stages\n1. Light-dependent reactions capture light energy and split water molecules.\n2. The Calvin cycle uses carbon dioxide and stored energy to build glucose.\n3. Chlorophyll absorbs light mainly in the blue and red regions of the spectrum.\n\n### Factors affecting the rate\nLight intensity, carbon dioxide concentration, temperature, and water availability can affect the rate of photosynthesis. A limiting factor prevents the rate from increasing until it is improved.\n\n### Learning outcomes\nBy the end, learners can ${goal}.`
    slides = [
      { title: `${topic}: Overview`, bullets: ['Plants convert light energy into chemical energy.', 'Carbon dioxide and water are reactants.', 'Glucose and oxygen are products.'], notes: `Introduce ${topic} with a leaf and sunlight example.` },
      { title: 'Chloroplast and Chlorophyll', bullets: ['Chloroplasts contain the photosynthetic machinery.', 'Chlorophyll absorbs useful wavelengths of light.', 'Leaf structure supports gas exchange.'], notes: 'Ask learners why most leaves appear green.' },
      { title: 'Light-Dependent Reactions', bullets: ['Light energy excites electrons.', 'Water is split and oxygen is released.', 'ATP and NADPH store usable energy.'], notes: 'Connect the reaction to the thylakoid membrane.' },
      { title: 'Calvin Cycle', bullets: ['Carbon dioxide is fixed into organic molecules.', 'ATP and NADPH provide energy and reducing power.', 'The cycle helps form glucose.'], notes: 'Clarify that the cycle does not require darkness.' },
      { title: 'Limiting Factors', bullets: ['Light intensity', 'Carbon dioxide concentration', 'Temperature and water availability'], notes: 'Use a graph to identify the limiting factor.' },
      { title: 'Application and Review', bullets: [`Explain ${topic} in your own words.`, 'Predict how a factor changes the rate.', 'Support the prediction with evidence.'], notes: `Have ${audience} apply the concept to a greenhouse.` },
    ]
    questions = [
      { question: 'What is the main energy source for photosynthesis?', options: ['Light energy', 'Sound energy', 'Mechanical energy', 'Nuclear energy'], answer: 'Light energy', rationale: 'Chlorophyll captures light energy for the photosynthetic reactions.' },
      { question: 'Which gas is used as a reactant in photosynthesis?', options: ['Carbon dioxide', 'Oxygen', 'Nitrogen only', 'Hydrogen'], answer: 'Carbon dioxide', rationale: 'Carbon dioxide supplies carbon for glucose formation.' },
      { question: 'Where does the Calvin cycle use carbon dioxide?', options: ['To build carbohydrate molecules', 'To release sound', 'To split oxygen', 'To cool the leaf'], answer: 'To build carbohydrate molecules', rationale: 'The Calvin cycle fixes carbon dioxide into organic compounds.' },
      { question: 'Which factor can limit photosynthesis?', options: ['Light intensity', 'The alphabet', 'Screen size', 'File format'], answer: 'Light intensity', rationale: 'Light intensity can restrict the rate when light is insufficient.' },
      { question: 'What is released when water is split in the light reactions?', options: ['Oxygen', 'Carbon dioxide', 'Glucose only', 'Salt'], answer: 'Oxygen', rationale: 'Water splitting releases oxygen as a by-product.' },
    ]
  } else if (isClustering) {
    body = `## ${topic}\n\n### Unsupervised learning\nClustering is an unsupervised learning task that groups observations by similarity without labeled target values. In ${subject}, it can reveal natural segments in a dataset.\n\n### K-Means algorithm\nK-Means alternates between assigning each observation to its nearest centroid and recomputing each centroid as the mean of its assigned points. Centroid initialization affects convergence and can be improved with K-Means++.\n\n### Distance metrics\nEuclidean distance is useful when features are scaled and geometry is meaningful; Manhattan distance can be more robust when movement along dimensions is additive. Feature scaling should be considered before either metric.\n\n### Choosing the number of clusters\nThe Elbow Method compares within-cluster sum of squares across values of k. Silhouette Score measures how well each point fits its own cluster compared with neighboring clusters.\n\n### Speaker/application prompt\nAsk learners to standardize a dataset, compare initialization strategies, interpret an Elbow plot, and defend a chosen k using the Silhouette Score.\n\n### Learning outcomes\nBy the end, learners can ${goal}.`
    slides = [
      { title: `${topic}: Unsupervised Learning`, bullets: ['Clustering works without labeled outcomes.', 'Similarity is represented through features and distance.', 'Goal: discover useful structure in data.'], notes: `Introduce ${topic} as pattern discovery rather than prediction.` },
      { title: 'K-Means Algorithm', bullets: ['Choose k and initialize centroids.', 'Assign each point to its nearest centroid.', 'Recompute centroids and repeat until stable.'], notes: 'Walk through one assignment-update iteration.' },
      { title: 'Centroid Initialization', bullets: ['Random initialization can converge to different solutions.', 'K-Means++ spreads initial centroids strategically.', 'Run multiple seeds and compare inertia.'], notes: 'Explain why initialization changes the final partition.' },
      { title: 'Distance Metrics', bullets: ['Euclidean distance measures straight-line separation.', 'Manhattan distance sums coordinate-wise differences.', 'Scale features before comparing distances.'], notes: 'Use a two-dimensional example to contrast the metrics.' },
      { title: 'Elbow Method', bullets: ['Plot within-cluster sum of squares for each k.', 'Look for diminishing returns as k increases.', 'Treat the elbow as evidence, not an automatic answer.'], notes: 'Ask learners to interpret a hypothetical elbow plot.' },
      { title: 'Silhouette Score', bullets: ['Compare cohesion within a cluster to separation from neighbors.', 'Higher scores indicate better-defined clusters.', 'Use it alongside domain knowledge.'], notes: 'Clarify why one metric should not make the decision alone.' },
      { title: 'Applied Data Workflow', bullets: ['Clean and scale features.', 'Fit several candidate values of k.', 'Inspect clusters visually and statistically.', 'Name clusters only after examining their profiles.'], notes: 'Connect the workflow to a real analytics project.' },
      { title: `Application: ${goal}`, bullets: ['State the business or research question.', 'Select features and a distance metric.', 'Compare k values and explain the trade-offs.'], notes: `Have ${audience} justify every modeling choice.` },
      { title: 'Limitations and Risks', bullets: ['Clusters depend on features and scaling.', 'Non-spherical groups may not suit K-Means.', 'Outliers can pull centroids away from typical points.'], notes: 'Discuss when a different clustering method is more appropriate.' },
      { title: 'Summary and Exit Ticket', bullets: ['Clustering discovers unlabeled structure.', 'K-Means alternates assignment and centroid updates.', 'Elbow and Silhouette Score support model selection.'], notes: `Ask learners to explain how ${topic} could inform a decision.` },
    ]
    questions = [
      { question: 'What type of learning is clustering?', options: ['Supervised learning', 'Unsupervised learning', 'Reinforcement learning', 'Transfer learning'], answer: 'Unsupervised learning', rationale: 'Clustering discovers structure without labeled target values.' },
      { question: 'What does K-Means update after assigning points?', options: ['Centroids', 'Labels supplied by a teacher', 'The test set', 'The file format'], answer: 'Centroids', rationale: 'Each centroid is recomputed as the mean of its assigned points.' },
      { question: 'Why does feature scaling matter for distance-based clustering?', options: ['It removes all clusters', 'Large-scale features can dominate distance', 'It guarantees the correct k', 'It labels the data'], answer: 'Large-scale features can dominate distance', rationale: 'Scaling prevents a feature with larger units from overwhelming similarity.' },
      { question: 'What does the Elbow Method inspect?', options: ['Within-cluster sum of squares across k', 'Only the largest feature', 'Email delivery speed', 'A confusion matrix'], answer: 'Within-cluster sum of squares across k', rationale: 'The elbow highlights diminishing returns as clusters are added.' },
      { question: 'What does Silhouette Score help evaluate?', options: ['Cohesion and separation', 'Password strength', 'Slide count', 'Database size'], answer: 'Cohesion and separation', rationale: 'It compares how well points fit their own cluster versus neighboring clusters.' },
    ]
  } else {
    slides = slides.map((slide, index) => ({ ...slide, title: index === 0 ? `${topic}: Overview` : `${topic}: ${slide.title}`, notes: `${slide.notes} Connect this activity to ${topic} in ${subject}.` }))
    questions = questions.map((question) => ({ ...question, question: `${topic}: ${question.question}`, rationale: `${question.rationale} Apply the reasoning to ${topic}.` }))
  }
  const localizedQuestions: Record<string, QuizQuestion[]> = {
    Hindi: [
      { question: `${topic} में मुख्य अवधारणा क्या है?`, options: ['प्रकाश ऊर्जा का उपयोग', 'ध्वनि ऊर्जा का उपयोग', 'केवल तापमान', 'कोई प्रक्रिया नहीं'], answer: 'प्रकाश ऊर्जा का उपयोग', rationale: `${topic} के अध्ययन में मुख्य प्रक्रिया और उसके प्रमाण पर ध्यान दिया जाता है।` },
      { question: `${topic} को समझने के लिए किसका अध्ययन करना चाहिए?`, options: ['मुख्य चरण और कारण', 'केवल शीर्षक', 'असंबंधित तथ्य', 'केवल रंग'], answer: 'मुख्य चरण और कारण', rationale: 'चरणों और कारणों को समझने से विषय का सही अनुप्रयोग होता है।' },
      { question: `${topic} का नया उदाहरण चुनते समय क्या आवश्यक है?`, options: ['प्रमाण और संदर्भ', 'अनुमान मात्र', 'कोई जानकारी नहीं', 'केवल लंबा उत्तर'], answer: 'प्रमाण और संदर्भ', rationale: 'संदर्भ और प्रमाण उत्तर को विश्वसनीय बनाते हैं।' },
      { question: `${topic} में सीमित करने वाला कारक क्या कर सकता है?`, options: ['प्रक्रिया की दर घटा सकता है', 'हर परिणाम मिटा सकता है', 'विषय बदल सकता है', 'प्रश्न हटा सकता है'], answer: 'प्रक्रिया की दर घटा सकता है', rationale: 'सीमित संसाधन या परिस्थिति प्रगति की दर को प्रभावित करती है।' },
      { question: `${topic} सीखने का अच्छा परिणाम क्या है?`, options: ['समझाकर नए संदर्भ में लागू करना', 'केवल याद करना', 'उत्तर न देना', 'विषय से बचना'], answer: 'समझाकर नए संदर्भ में लागू करना', rationale: 'अवधारणा का स्थानांतरण वास्तविक सीखने को दर्शाता है।' },
    ],
    Marathi: [
      { question: `${topic} मधील मुख्य संकल्पना कोणती?`, options: ['प्रक्रिया आणि पुरावे समजून घेणे', 'फक्त शीर्षक वाचणे', 'असंबंधित तथ्य', 'फक्त रंग'], answer: 'प्रक्रिया आणि पुरावे समजून घेणे', rationale: 'संकल्पना समजण्यासाठी प्रक्रिया आणि पुरावे आवश्यक असतात.' },
      { question: `${topic} चा उपयोग करताना काय आवश्यक आहे?`, options: ['संदर्भ आणि पुरावा', 'केवळ अंदाज', 'माहिती नाही', 'फक्त मोठे उत्तर'], answer: 'संदर्भ आणि पुरावा', rationale: 'संदर्भ आणि पुरावा योग्य उपयोगाला आधार देतात.' },
      { question: `${topic} शिकण्याचा चांगला परिणाम कोणता?`, options: ['नवीन संदर्भात लागू करणे', 'फक्त पाठांतर', 'प्रश्न टाळणे', 'विषय बदलणे'], answer: 'नवीन संदर्भात लागू करणे', rationale: 'नवीन उदाहरणात संकल्पना वापरणे शिकणे दर्शवते.' },
      { question: `${topic} मध्ये मर्यादित करणारा घटक काय करतो?`, options: ['प्रक्रियेचा वेग कमी करू शकतो', 'सर्व परिणाम मिटवतो', 'विषय बदलतो', 'प्रश्न काढतो'], answer: 'प्रक्रियेचा वेग कमी करू शकतो', rationale: 'मर्यादित परिस्थिती प्रक्रियेचा वेग प्रभावित करते.' },
      { question: `${topic} समजावण्यासाठी काय द्यावे?`, options: ['उदाहरण आणि कारण', 'फक्त नाव', 'अंदाज', 'असंबंधित माहिती'], answer: 'उदाहरण आणि कारण', rationale: 'उदाहरण आणि कारण उत्तर स्पष्ट करतात.' },
    ],
  }
  if (localizedQuestions[values.targetLanguage || ''] && template.type === 'quiz') questions = localizedQuestions[values.targetLanguage || '']
  const localizedIntro: Record<string, string> = {
    Hindi: `## विषय का परिचय\n${topic} ${subject} का एक महत्वपूर्ण शैक्षणिक विषय है। इस पाठ में इसकी मुख्य अवधारणाएँ, उदाहरण और उपयोग समझाए गए हैं।\n\n## सीखने का परिणाम\nविद्यार्थी ${topic} को समझाकर, उदाहरण देकर और नए संदर्भ में लागू कर सकेंगे।`,
    Marathi: `## विषयाचा परिचय\n${topic} हा ${subject} मधील महत्त्वाचा शैक्षणिक विषय आहे. या धड्यात मुख्य संकल्पना, उदाहरणे आणि उपयोग समजावले आहेत.\n\n## अध्ययन निष्पत्ती\nविद्यार्थी ${topic} समजावून सांगू शकतील आणि नवीन संदर्भात त्याचा उपयोग करू शकतील.`,
    Bengali: `## বিষয়ের পরিচয়\n${topic} হল ${subject}-এর একটি গুরুত্বপূর্ণ শিক্ষামূলক বিষয়। এই পাঠে এর মূল ধারণা, উদাহরণ এবং প্রয়োগ ব্যাখ্যা করা হয়েছে।\n\n## শেখার ফলাফল\nশিক্ষার্থীরা ${topic} ব্যাখ্যা করে নতুন প্রেক্ষাপটে প্রয়োগ করতে পারবে।`,
    Telugu: `## అంశ పరిచయం\n${topic} ${subject} లో ఒక ముఖ్యమైన విద్యా అంశం. ఈ పాఠంలో ప్రధాన భావనలు, ఉదాహరణలు మరియు అనువర్తనాలు వివరించబడ్డాయి.\n\n## అభ్యాస ఫలితం\nవిద్యార్థులు ${topic} ను వివరించి కొత్త సందర్భంలో అన్వయించగలరు.`,
  }
  if (localizedIntro[values.targetLanguage || '']) body = `${localizedIntro[values.targetLanguage || '']}\n\n${body}`
  return { type: template.type, title, topic, subject, body, slides, questions }
}

function downloadFile(filename: string, content: BlobPart, mimeType: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function contentForExport(result: GeneratedContent) {
  const sections = [result.body]
  if (result.type === 'slides' && result.slides.length) {
    sections.push(`## Lecture slides\n${result.slides.map((slide, index) => `### ${index + 1}. ${slide.title}\n${slide.bullets.map((bullet) => `- ${bullet}`).join('\n')}\n\nProfessor notes: ${slide.notes}`).join('\n\n')}`)
  }
  if (result.type === 'quiz' && result.questions.length) {
    sections.push(`## Quiz questions\n${result.questions.map((question, index) => `${index + 1}. ${question.question}\n${question.options.map((option) => `- ${option}${option === question.answer ? ' (Correct answer)' : ''}`).join('\n')}\n\nAnswer: ${question.answer}\n\nRationale: ${question.rationale}`).join('\n\n')}`)
  }
  return sections.filter(Boolean).join('\n\n')
}

function readGeneratedTitle(output: string | null) {
  if (!output) return undefined
  try {
    const parsed: unknown = JSON.parse(output)
    if (typeof parsed === 'object' && parsed !== null && 'title' in parsed && typeof parsed.title === 'string') {
      return parsed.title
    }
  } catch {
    return undefined
  }
  return undefined
}

function markdownToHtml(content: string) {
  const lines = content.split('\n')
  let html = ''
  let table: string[][] = []
  const flushTable = () => {
    if (!table.length) return
    const rows = table.filter((row) => !row.every((cell) => /^[- :]+$/.test(cell)))
    if (rows.length) html += `<table><thead><tr>${rows[0].map((cell) => `<th>${escapeHtml(cell.trim())}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell.trim())}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    table = []
  }
  for (const line of lines) {
    if (line.trim().startsWith('|')) { table.push(line.split('|').slice(1, -1)); continue }
    flushTable()
    if (line.startsWith('## ')) html += `<h2>${escapeHtml(line.slice(3))}</h2>`
    else if (/^\d+\. /.test(line)) html += `<p>${escapeHtml(line)}</p>`
    else if (line.startsWith('- ')) html += `<p class="bullet">• ${escapeHtml(line.slice(2))}</p>`
    else if (!line.trim()) html += '<div class="spacer"></div>'
    else html += `<p>${escapeHtml(line).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`
  }
  flushTable()
  return html
}

export default function GeneratePage() {
  const { profile } = useAuth()
  const searchParams = useSearchParams()
  const [language, setLanguage] = useState('English')
  const [selectedId, setSelectedId] = useState(TEMPLATES[0].id)
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)
  const [status, setStatus] = useState('')
  const [result, setResult] = useState<GeneratedContent | null>(null)
  const [showFormPreview, setShowFormPreview] = useState(false)
  const selectedTemplate = useMemo(() => TEMPLATES.find((template) => template.id === selectedId) || TEMPLATES[0], [selectedId])
  const unavailableBoundaries = getUnavailableBoundaries()
  useEffect(() => { const requested = searchParams.get('template'); if (requested && TEMPLATES.some((template) => template.id === requested)) setSelectedId(requested) }, [searchParams])
  useEffect(() => setVariables(Object.fromEntries((selectedTemplate.variables || []).map((variable) => [variable, '']))), [selectedTemplate])

  async function handleGenerate() {
    const supportedTopic = /photosynthesis|plant biology|clustering|k[- ]?means|machine learning/i.test(variables.topic || '')
    if ((selectedTemplate.type === 'quiz' || selectedTemplate.type === 'slides') && !supportedTopic) {
      setStatus(`Demo ${selectedTemplate.type} generation currently supports photosynthesis and clustering topics only.`)
      toast.error(`This demo cannot reliably generate topic-specific ${selectedTemplate.type} for that topic yet.`)
      return
    }
    if ((selectedTemplate.type === 'quiz' || selectedTemplate.type === 'slides') && (language === 'Bengali' || language === 'Telugu')) {
      setStatus('Quiz and slide localization is currently unavailable in Bengali and Telugu.')
      toast.error('This selected language is not supported for this template yet.')
      return
    }
    if (selectedTemplate.type !== 'quiz' && language !== 'English') {
      setStatus('Only quiz templates currently support localized Hindi and Marathi output.')
      toast.error('This selected language is not supported for this template yet.')
      return
    }
    setGenerating(true)
    setResult(null)
    setStatus('Preparing a template-based draft...')
    try {
      const nextResult = buildContent(selectedTemplate, { ...variables, targetLanguage: language })
      setResult(nextResult)
      setStatus('Template-based draft prepared. It has not been independently verified.')
      if (!profile) {
        toast.error('The draft is available in this session but could not be saved because your profile is unavailable.')
        return
      }
      const { error } = await supabase.from('generated_content').insert({
        user_id: profile.id,
        template_type: selectedTemplate.type,
        prompt_input: JSON.stringify(variables),
        target_language: language,
        generated_output: JSON.stringify(nextResult),
        opted_in_for_training: false,
      })
      if (error) throw error
      const { error: usageError } = await supabase.from('usage_logs').insert({
        user_id: profile.id,
        action: 'content_draft_created',
        route: '/professor/generate',
        metadata: { template_type: selectedTemplate.type, target_language: language },
      })
      if (usageError) {
        toast.error(`Draft saved, but its usage event could not be recorded: ${usageError.message}`)
        return
      }
      toast.success('Template draft saved to your account.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error generating or saving content.'
      setStatus(`Draft could not be saved: ${message}`)
      toast.error(`The draft was not saved: ${message}`)
    } finally {
      setGenerating(false)
    }
  }
  function exportPdf() {
    if (!result) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return toast.error('Allow pop-ups to print this document')
    printWindow.document.write(`<html><head><title>${escapeHtml(result.title)}</title><style>@page{margin:20mm}body{font-family:Georgia,serif;color:#172033;line-height:1.65;max-width:820px;margin:auto}header{border-bottom:5px solid #2563eb;padding:32px 0;margin-bottom:28px}h1{font-size:32px}h2{color:#1d4ed8;border-left:4px solid #60a5fa;padding-left:12px;margin-top:28px}table{width:100%;border-collapse:collapse;margin:20px 0;font-family:Arial}th{background:#1e293b;color:#f1f5f9;padding:10px;text-align:left;border:1px solid #334155}td{padding:10px;border:1px solid #cbd5e1}tr:nth-child(even){background:#f8fafc}.bullet{margin:5px 0}.spacer{height:8px}.meta{font-family:Arial;color:#64748b}</style></head><body><header><div class="meta">${escapeHtml(result.subject)} · Academic Masterclass</div><h1>${escapeHtml(result.title)}</h1><div class="meta">Prepared for classroom use</div></header>${markdownToHtml(contentForExport(result))}</body></html>`)
    printWindow.document.close(); printWindow.focus(); printWindow.print(); toast.success('Print dialog opened — choose Save as PDF')
  }
  function exportWord() { if (!result) return; downloadFile(`${result.topic.replace(/\s+/g, '-').toLowerCase()}.doc`, `<html><body><h1>${escapeHtml(result.title)}</h1>${markdownToHtml(contentForExport(result))}</body></html>`, 'application/msword'); toast.success('Word-compatible .doc downloaded') }
  async function exportDeck() {
    if (!result) return
    try {
      const pptxgen = (await import('pptxgenjs')).default
      const pptx = new pptxgen(); pptx.layout = 'LAYOUT_WIDE'; pptx.author = 'Teach Easy'; pptx.subject = result.subject; pptx.title = result.title
      const colors = ['12304A', '164E63', '365314', '713F12', '4C1D95']
      ;(result.slides || []).forEach((slide, index) => { const page = pptx.addSlide(); const accent = colors[index % colors.length]; page.background = { color: 'F8FAFC' }; page.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 1.35, fill: { color: accent }, line: { color: accent } }); page.addText(`SLIDE ${String(index + 1).padStart(2, '0')}`, { x: 0.55, y: 0.28, w: 1.5, h: 0.25, color: 'BAE6FD', fontSize: 10, bold: true, charSpacing: 1.5 }); page.addText(slide.title, { x: 0.55, y: 0.62, w: 11.8, h: 0.5, color: 'FFFFFF', fontSize: 24, bold: true, margin: 0 }); page.addShape(pptx.ShapeType.roundRect, { x: 0.6, y: 1.85, w: 7.7, h: 4.55, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { color: 'E2E8F0', pt: 1 } }); page.addText((slide.bullets || []).map((bullet) => ({ text: bullet, options: { bullet: { indent: 16 }, hanging: 4, breakLine: true } })), { x: 1, y: 2.25, w: 6.9, h: 3.7, color: '1E293B', fontSize: 18, breakLine: false, paraSpaceAfter: 16, valign: 'middle' as const }); page.addShape(pptx.ShapeType.roundRect, { x: 8.7, y: 1.85, w: 4, h: 2.25, rectRadius: 0.08, fill: { color: 'E0F2FE' }, line: { color: 'BAE6FD', pt: 1 } }); page.addText('CLASSROOM PROMPT', { x: 9, y: 2.7, w: 3.4, h: 0.3, color: '164E63', fontSize: 14, bold: true, align: 'center' }); page.addText(`Professor notes: ${slide.notes}`, { x: 8.9, y: 4.5, w: 3.6, h: 1.25, color: '475569', fontSize: 11, italic: true, margin: 0.12, valign: 'top' }); page.addText(result.subject, { x: 0.6, y: 7.05, w: 5, h: 0.2, color: '64748B', fontSize: 9 }) })
      await pptx.writeFile({ fileName: `${result.topic.replace(/\s+/g, '-').toLowerCase()}-lecture-deck.pptx` })
      toast.success('PowerPoint downloaded')
    } catch (error) {
      toast.error(`PowerPoint export failed: ${error instanceof Error ? error.message : 'Unexpected error'}`)
    }
  }

  return <AppNav><main className="flex flex-col gap-6"><header><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">Academic content studio</Badge>{status && <span className="text-sm text-muted-foreground">{status}</span>}</div><h1 className="mt-3 text-3xl font-bold tracking-tight">Generate Content</h1><p className="mt-1 text-muted-foreground">Create editable drafts from the built-in academic templates.</p></header><Card className="border-amber-200 bg-amber-50/70"><CardHeader className="pb-3"><CardTitle className="text-base">Connected capability boundaries</CardTitle><CardDescription>Drafts use built-in templates and are saved to Supabase. This page does not call an LLM, retrieve external sources, verify facts, or publish to Google Forms.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{unavailableBoundaries.map((boundary) => <div key={boundary.key} className="rounded-lg border border-amber-200 bg-background/80 p-3"><div className="flex items-center gap-2"><Badge variant="outline">Not configured</Badge><span className="text-sm font-medium">{boundary.label}</span></div><p className="mt-2 text-xs text-muted-foreground">{boundary.description}</p></div>)}</CardContent></Card><div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"><div className="flex flex-col gap-6"><Card><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="size-5 text-primary" />Template Selection</CardTitle><CardDescription>Choose a workflow and customize its variables.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4"><div className="flex flex-col gap-2"><Label>Template</Label><Select value={selectedId} onValueChange={setSelectedId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(TEMPLATES || []).map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent></Select></div><div className="flex flex-col gap-2"><Label>Target Language</Label><Select value={language} onValueChange={setLanguage}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(LANGUAGES || []).map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="size-5 text-primary" />Template Variables</CardTitle><CardDescription>{selectedTemplate.description}</CardDescription></CardHeader><CardContent className="flex flex-col gap-4">{(selectedTemplate.variables || []).map((variable) => <div key={variable} className="flex flex-col gap-2"><Label className="capitalize">{variable.replace(/_/g, ' ')}</Label><Input value={variables[variable] || ''} onChange={(event) => setVariables((current) => ({ ...current, [variable]: event.target.value }))} placeholder={`Enter ${variable.replace(/_/g, ' ')}`} /></div>)}<Button onClick={handleGenerate} disabled={generating}>{generating ? 'Preparing...' : 'Prepare template draft'}</Button></CardContent></Card></div><Card className="min-h-[520px]"><CardHeader><CardTitle>Draft Output</CardTitle><CardDescription>{result ? 'Review and export this template-based draft.' : 'Your draft will appear here.'}</CardDescription></CardHeader><CardContent>{result ? <GeneratedView result={result} onExportPdf={exportPdf} onExportWord={exportWord} onExportDeck={exportDeck} onOpenForm={() => setShowFormPreview(true)} /> : <div className="flex min-h-[380px] items-center justify-center rounded-lg border border-dashed text-center text-muted-foreground">{generating ? 'Preparing your draft...' : 'Choose a template and prepare a draft.'}</div>}</CardContent></Card></div>{showFormPreview && result && <FormPreview result={result} onClose={() => setShowFormPreview(false)} />}</main></AppNav>
}

function GeneratedView({ result, onExportPdf, onExportWord, onExportDeck, onOpenForm }: { result: GeneratedContent; onExportPdf: () => void; onExportWord: () => void; onExportDeck: () => void; onOpenForm: () => void }) {
  return <div className="flex flex-col gap-4"><div className="grid gap-4 sm:grid-cols-2"><Card className="border-amber-200 bg-amber-50/70"><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">NEP 2020 Compliance</p><p className="text-lg font-semibold text-amber-900">Requires configured evaluation</p><p className="mt-1 text-xs text-muted-foreground">No compliance score is claimed in this build.</p></CardContent></Card><Card className="border-amber-200 bg-amber-50/70"><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fact-Check Confidence</p><p className="text-lg font-semibold text-amber-900">Requires retrieval and citations</p><p className="mt-1 text-xs text-muted-foreground">No fact-check score is claimed in this build.</p></CardContent></Card></div><div className="flex flex-wrap gap-2"><Button onClick={onExportPdf}><Download className="mr-2 size-4" />Export PDF</Button><Button variant="outline" onClick={onExportWord}><Download className="mr-2 size-4" />Export Word</Button>{result.type === 'slides' && <Button variant="outline" onClick={onExportDeck}><Presentation className="mr-2 size-4" />Export PPTX</Button>}{result.type === 'quiz' && <Button variant="outline" onClick={onOpenForm}><ExternalLink className="mr-2 size-4" />Preview Quiz Form</Button>}<Button variant="outline" onClick={() => toast.info('Sharing is available from the Share Materials page')}>Share with Students</Button></div><Card><CardHeader><CardTitle>{result.title}</CardTitle><CardDescription>Template-based draft — review before classroom use.</CardDescription></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm text-muted-foreground">{result.type === 'slides' ? (result.slides || []).map((slide) => slide.title).join(' · ') : result.type === 'quiz' ? `${(result.questions || []).length} quiz questions ready for export.` : result.body}</p></CardContent></Card></div>
}

/*
function GeneratedView_OLD({ result, onExportPdf, onExportWord, onExportDeck, onOpenForm }: { result: GeneratedContent; onExportPdf: () => void; onExportWord: () => void; onExportDeck: () => void; onOpenForm: () => void }) {
  const nepScore = 94
  const factCheckScore = 92
  return <div className="flex flex-col gap-4"><div className="grid gap-4 sm:grid-cols-2"><Card className="border-accent/40 bg-accent/5"><CardContent className="flex items-center gap-3 p-4"><CheckCircle2 className="size-8 text-accent" /><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">NEP 2020 Compliance</p><p className="text-2xl font-bold text-accent">{nepScore}% Verified NEP Aligned</p></div></CardContent></Card><Card className="border-primary/30 bg-primary/5"><CardContent className="flex items-center gap-3 p-4"><CheckCircle2 className="size-8 text-primary" /><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fact-Check Confidence</p><p className="text-2xl font-bold text-primary">{factCheckScore}% High Confidence</p></div></CardContent></Card></div>{result.type === 'slides' && <div className="flex flex-col gap-4"><div className="flex flex-wrap gap-2"><Button onClick={onExportDeck}><Presentation className="mr-2 size-4" />Export PPTX</Button><Button variant="outline" onClick={() => window.print()}><Download className="mr-2 size-4" />Print slides</Button></div><div className="grid gap-4 xl:grid-cols-2">{(result.slides || []).map((slide, index) => <Card key={slide.title} className="overflow-hidden"><div className="h-2 bg-primary" /><CardHeader><Badge variant="outline" className="w-fit">Slide {index + 1}</Badge><CardTitle className="text-lg">{slide.title}</CardTitle></CardHeader><CardContent className="flex flex-col gap-3"><ul className="flex flex-col gap-2">{(slide.bullets || []).map((bullet) => <li key={bullet} className="text-sm">• {bullet}</li>)}</ul><img src={`https://images.unsplash.com/photo-${['1521737711867-e3b97375f902','1497366811353-6870744d04b2','1454165804606-c3d57bc86b40','1556761175-b413da4baf72'][index % 4]}?auto=format&fit=crop&w=900&q=80`} alt="Academic collaboration" className="h-32 w-full rounded-md object-cover" /><div className="rounded-md bg-muted p-3 text-xs text-muted-foreground"><strong>Professor notes:</strong> {slide.notes}</div></CardContent></Card>)}</div></div></div>}
  if (result.type === 'quiz') return <div className="flex flex-col gap-4"><div className="flex flex-wrap gap-2"><Button onClick={onOpenForm}><ExternalLink className="mr-2 size-4" />Create Google Form</Button><Button variant="outline" onClick={() => downloadFile('quiz-question-bank.txt', (result.questions || []).map((q, i) => `${i + 1}. ${q.question}\n${(q.options || []).join('\n')}\nAnswer: ${q.answer}\nRationale: ${q.rationale}`).join('\n\n'), 'text/plain')}><Download className="mr-2 size-4" />Download question bank</Button></div>{(result.questions || []).map((question, index) => <Card key={question.question}><CardHeader><CardTitle className="text-base">{index + 1}. {question.question}</CardTitle></CardHeader><CardContent className="flex flex-col gap-2">{(question.options || []).map((option) => <div key={option} className="rounded-md border p-2 text-sm">{option}{option === question.answer && <Badge className="ml-2">Correct</Badge>}</div>)}<p className="text-xs text-muted-foreground">Rationale: {question.rationale}</p></CardContent></Card>)}</div>
  return <div className="flex flex-col gap-4"><div className="flex flex-wrap gap-2"><Button onClick={onExportPdf}><Download className="mr-2 size-4" />Export PDF</Button><Button variant="outline" onClick={onExportWord}><Download className="mr-2 size-4" />Export Word</Button></div><article className="max-w-none overflow-x-auto rounded-lg border bg-background p-5 text-sm"><h2 className="mb-5 text-2xl font-bold">{result.title}</h2><MarkdownPreview content={result.body} /></article></div>
}

*/
function MarkdownPreview({ content }: { content: string }) {
  const lines = content.split('\n'); const rows: string[][] = []; const isTableLine = (line: string) => line.trim().startsWith('|')
  return <div className="flex flex-col gap-1">{lines.map((line, index) => { if (isTableLine(line)) { const cells = line.split('|').slice(1, -1); if (cells.every((cell) => /^[- :]+$/.test(cell))) return null; rows.push(cells); return null } if (rows.length) { const tableRows = rows.splice(0, rows.length); return <table key={`table-${index}`} className="my-4 w-full border-collapse overflow-hidden rounded-lg"><thead><tr>{tableRows[0].map((cell) => <th key={cell} className="border border-slate-700 bg-slate-800 p-3 text-left font-semibold text-slate-100">{cell.trim()}</th>)}</tr></thead><tbody>{tableRows.slice(1).map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell) => <td key={cell} className="border border-slate-700 p-3 text-slate-300 odd:bg-slate-900/50 even:bg-slate-900/20">{cell.trim()}</td>)}</tr>)}</tbody></table> } return line.startsWith('## ') ? <h3 key={index} className="mt-6 border-l-4 border-primary pl-3 text-lg font-semibold">{line.slice(3)}</h3> : line.startsWith('- ') ? <p key={index} className="my-1">• {line.slice(2)}</p> : /^\d+\. /.test(line) ? <p key={index} className="my-1">{line}</p> : line ? <p key={index} className="my-2">{line}</p> : <div key={index} className="h-2" /> })}</div>
}

function LiveQuizView({ result, onClose }: { result: GeneratedContent; onClose: () => void }) {
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [score, setScore] = useState<number | null>(null)
  const questions = result.questions || []
  function submitQuiz() { setScore(questions.reduce((total, question, index) => total + (answers[index] === question.answer ? 1 : 0), 0)) }
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"><Card className="max-h-[90vh] w-full max-w-2xl overflow-auto"><CardHeader className="flex-row items-start justify-between"><div><CardTitle>Simulated student quiz</CardTitle><CardDescription>Answer the questions and submit to see your instant grade.</CardDescription></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="Close live quiz"><X className="size-4" /></Button></CardHeader><CardContent className="flex flex-col gap-5">{questions.map((question, index) => <fieldset key={question.question} className="flex flex-col gap-2"><legend className="font-medium">{index + 1}. {question.question}</legend>{(question.options || []).map((option) => <label key={option} className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm hover:bg-muted"><input type="radio" name={`question-${index}`} checked={answers[index] === option} onChange={() => setAnswers((current) => ({ ...current, [index]: option }))} />{option}</label>)}</fieldset>)}<div className="flex items-center justify-between gap-3"><Button onClick={submitQuiz}>Submit quiz</Button>{score !== null && <Badge variant="secondary">Score: {score}/{questions.length} ({questions.length ? Math.round((score / questions.length) * 100) : 0}%)</Badge>}</div></CardContent></Card></div>
}

function FormPreview({ result, onClose }: { result: GeneratedContent; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const [showLiveView, setShowLiveView] = useState(false)
  const formUrl = 'https://forms.new'
  const quizSchema = (result.questions || []).map((question, index) => `${index + 1}. ${question.question}\n${(question.options || []).map((option) => `- ${option}${option === question.answer ? ' [CORRECT]' : ''}`).join('\n')}\nCorrect answer: ${question.answer}\nRationale: ${question.rationale}`).join('\n\n')
  async function copySchema() { await navigator.clipboard.writeText(quizSchema); setCopied(true); toast.success('Quiz schema copied to clipboard!'); setTimeout(() => setCopied(false), 1800) }
  return showLiveView ? <LiveQuizView result={result} onClose={() => setShowLiveView(false)} /> : <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><Card className="max-h-[90vh] w-full max-w-2xl overflow-auto"><CardHeader className="flex-row items-start justify-between"><div><CardTitle>Google Forms Quiz Sync & Preview</CardTitle><CardDescription>Review the generated questions, answer keys, and student experience before opening a fresh Google Form.</CardDescription></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="Close preview"><X className="size-4" /></Button></CardHeader><CardContent className="flex flex-col gap-4"><div className="rounded-lg border bg-muted/40 p-4"><div className="flex items-center justify-between"><div><p className="font-semibold">{result.title}</p><p className="text-sm text-muted-foreground">{(result.questions || []).length} multiple-choice questions</p></div><Badge variant="outline">Manual setup required</Badge></div></div><div className="flex flex-col gap-3">{(result.questions || []).map((question, index) => <div key={question.question} className="rounded-lg border p-4"><p className="font-medium">{index + 1}. {question.question}</p><div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">{(question.options || []).map((option) => <span key={option}>○ {option}</span>)}</div></div>)}</div><div className="rounded-lg border border-primary/20 bg-primary/5 p-4"><Label htmlFor="form-link">Live form draft link</Label><div className="mt-2 flex gap-2"><Input id="form-link" readOnly value={formUrl} /><Button variant="outline" onClick={copySchema}><Copy className="mr-2 size-4" />{copied ? 'Copied' : 'Copy Form Schema (JSON/Text)'}</Button></div><p className="mt-2 text-xs text-muted-foreground">This opens a new Google Form. No form is created, populated, or published automatically; copy the schema manually after signing in.</p></div><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => setShowLiveView(true)}>Simulate Form Live View</Button><Button variant="outline" onClick={onClose}>Done reviewing</Button><Button onClick={() => window.open(formUrl, '_blank', 'noopener,noreferrer')}><ExternalLink className="mr-2 size-4" />Open live form draft</Button></div></CardContent></Card></div>
}
