import { Session } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';
import { IAuthRepository } from '../../../infrastructure/repositories/interfaces/IAuthRepository';

export class SupabaseAuthRepository implements IAuthRepository {
  async signIn(email: string, password: string): Promise<void> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.session) {
      console.info('[AUTH] Session created', { userId: data.session.user.id });
    }
  }

  async signOut(): Promise<void> {
    console.warn('[AUTH] Logout requested by src/domains/auth/repositories/SupabaseAuthRepository.ts:12');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getSession(): Promise<Session | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async refreshSession(): Promise<Session | null> {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data.session;
  }

  async sendPasswordReset(email: string, redirectTo: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  }

  async updatePassword(password: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }

  async getUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  }

  onAuthStateChange(handler: (session: Session | null) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        console.info('[AUTH] Session created', { event, userId: session.user.id });
      }
      handler(session);
    });
    return () => data.subscription.unsubscribe();
  }
}
