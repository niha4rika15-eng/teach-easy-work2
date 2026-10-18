'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { GraduationCap, Mail, Lock, User, Building2, ArrowRight, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

const ROLES = [
  { value: 'professor', label: 'Request Professor Access', icon: Briefcase, desc: 'Requires administrator approval' },
  { value: 'student', label: 'Student', icon: GraduationCap, desc: 'Access shared materials' },
] as const;

export default function SignupPage() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [institution, setInstitution] = useState('');
  const [role, setRole] = useState<string>('professor');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signUp(email, password, fullName, role, institution);
      if (error) {
        toast.error(error);
      } else {
        toast.success(role === 'professor'
          ? 'Account created as a student. Professor access requires administrator approval.'
          : 'Account created! Please sign in.');
        window.location.href = '/';
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-card px-4 py-8">
      <div className="w-full max-w-md animate-scale-in">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold">EduAI</span>
          </Link>
        </div>
        <Card className="border-border/60 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Create account</CardTitle>
            <CardDescription>New accounts start with student access. Professor privileges require administrator approval.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Choose your role</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(ROLES || []).map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all ${role === r.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                    >
                      <r.icon className={`h-5 w-5 ${role === r.value ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-xs font-medium">{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input id="fullName" placeholder="John Doe" className="pl-10" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="you@example.com" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="••••••••" className="pl-10" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="institution">Institution (optional)</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input id="institution" placeholder="University name" className="pl-10" value={institution} onChange={(e) => setInstitution(e.target.value)} />
                </div>
              </div>
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? 'Creating account...' : <>Create Account <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
