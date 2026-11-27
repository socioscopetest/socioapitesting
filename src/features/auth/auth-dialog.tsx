import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, Loader2, LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { LovableMark } from '@lovable.dev/cloud-auth-js/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type AuthMode = 'signin' | 'signup' | 'reset' | 'update';

type AuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: string | null;
  onLovableSignIn: () => Promise<void>;
};

export function AuthDialog({ open, onOpenChange, user, onLovableSignIn }: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('update');
        onOpenChange(true);
      }
    });
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      setMode('update');
      onOpenChange(true);
    }
    return () => subscription.unsubscribe();
  }, [onOpenChange]);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      if (!open || !user) return;
      setProfileLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      const id = authData.user?.id;
      if (!id) {
        if (active) setProfileLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', id)
        .maybeSingle();
      if (active) {
        if (error) toast.error('Profil belum dapat dimuat.');
        setProfileName(data?.full_name ?? authData.user.user_metadata?.full_name ?? '');
        setAvatarUrl(data?.avatar_url ?? '');
        setProfileLoading(false);
      }
    }
    void loadProfile();
    return () => { active = false; };
  }, [open, user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === 'update') {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success('Password berhasil diperbarui. Silakan masuk kembali.');
        setPassword('');
        setMode('signin');
        onOpenChange(false);
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success('Akun berhasil dibuat dan Anda sudah masuk.');
          onOpenChange(false);
        } else {
          toast.success('Pendaftaran berhasil. Periksa email untuk konfirmasi akun sebelum masuk.');
          setMode('signin');
        }
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        toast.success('Jika email terdaftar, tautan pemulihan password akan dikirim.');
        setMode('signin');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast.success('Berhasil masuk ke SocioScope.');
        onOpenChange(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Autentikasi gagal. Silakan coba lagi.';
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw authError ?? new Error('Sesi login tidak ditemukan.');
      const { error } = await supabase.from('profiles').update({
        full_name: profileName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      }).eq('id', authData.user.id);
      if (error) throw error;
      toast.success('Profil berhasil diperbarui.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Profil gagal disimpan.');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    setBusy(false);
    if (error) toast.error('Tidak dapat keluar. Silakan coba lagi.');
    else {
      toast.success('Anda sudah keluar.');
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div className="mb-1 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck size={20} /></div>
          <div>
            <DialogTitle>{user ? 'Akun SocioScope' : mode === 'signup' ? 'Buat akun SocioScope' : mode === 'reset' ? 'Reset password' : 'Masuk ke SocioScope'}</DialogTitle>
            <DialogDescription>{user ? 'Kelola profil dan sesi akun Anda.' : 'Satu akun untuk dashboard monitoring dan riwayat pencarian Anda.'}</DialogDescription>
          </div>
        </div>

        {user ? (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-secondary text-muted-foreground">
                {avatarUrl ? <img src={avatarUrl} alt="Foto profil" className="h-full w-full object-cover" /> : <UserRound size={18} />}
              </div>
              <div className="min-w-0"><p className="truncate text-sm font-semibold">{profileName || 'Pengguna SocioScope'}</p><p className="truncate text-xs text-muted-foreground">{user}</p></div>
            </div>
            <form onSubmit={saveProfile} className="space-y-3">
              <label className="block space-y-1.5 text-xs font-medium">Nama lengkap<Input value={profileName} onChange={e => setProfileName(e.target.value)} maxLength={100} placeholder="Nama Anda" /></label>
              <label className="block space-y-1.5 text-xs font-medium">URL foto profil<Input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} maxLength={500} type="url" placeholder="https://..." /></label>
              <Button className="w-full" type="submit" disabled={busy || profileLoading}>{busy ? <Loader2 className="animate-spin" /> : null}Simpan profil</Button>
            </form>
            <div className="border-t border-border pt-3"><Button variant="outline" className="w-full" onClick={() => void signOut()} disabled={busy}><LogOut size={16} />Keluar</Button></div>
            {profileLoading && <p className="text-center text-xs text-muted-foreground">Memuat profil…</p>}
          </div>
        ) : (
          <>
            {mode !== 'reset' && <div className="grid grid-cols-2 rounded-lg bg-secondary p-1">
              <Button type="button" variant={mode === 'signin' ? 'default' : 'ghost'} size="sm" onClick={() => setMode('signin')}>Masuk</Button>
              <Button type="button" variant={mode === 'signup' ? 'default' : 'ghost'} size="sm" onClick={() => setMode('signup')}>Daftar</Button>
            </div>}
            <form onSubmit={submit} className="space-y-3 pt-1">
              {mode === 'signup' && <label className="block space-y-1.5 text-xs font-medium">Nama lengkap<Input value={fullName} onChange={e => setFullName(e.target.value)} required minLength={2} maxLength={100} autoComplete="name" placeholder="Nama Anda" /></label>}
              {mode !== 'update' && <label className="block space-y-1.5 text-xs font-medium">Email<Input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="nama@email.com" /></label>}
              {mode !== 'reset' && <label className="block space-y-1.5 text-xs font-medium">Password
                <span className="relative block"><Input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder="Minimal 8 karakter" className="pr-11" /><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span>
              </label>}
              <Button type="submit" className="w-full" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : mode === 'reset' ? <Mail size={16} /> : null}{mode === 'signup' ? 'Buat akun' : mode === 'reset' ? 'Kirim tautan reset' : mode === 'update' ? 'Simpan password baru' : 'Masuk'}</Button>
            </form>
            {mode === 'signin' && <button type="button" className="w-full text-center text-xs text-primary hover:underline" onClick={() => setMode('reset')}>Lupa password?</button>}
            {(mode === 'reset' || mode === 'update') && <button type="button" className="w-full text-center text-xs text-primary hover:underline" onClick={() => setMode('signin')}>Kembali ke halaman masuk</button>}
            {mode === 'signin' && <>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground"><span className="h-px flex-1 bg-border" />ATAU<span className="h-px flex-1 bg-border" /></div>
              <Button type="button" variant="outline" className="w-full" onClick={() => void onLovableSignIn()} disabled={busy}><LovableMark />Lanjutkan dengan Lovable</Button>
            </>}
            <p className="text-center text-[10px] leading-relaxed text-muted-foreground">Dengan melanjutkan, akun Anda dikelola oleh Supabase Auth. Data pencarian disimpan terpisah untuk setiap pengguna.</p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
