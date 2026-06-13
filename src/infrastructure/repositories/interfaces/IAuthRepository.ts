import { Session, User } from '@supabase/supabase-js';

export interface IAuthRepository {
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  getSession(): Promise<Session | null>;
  refreshSession(): Promise<Session | null>;
  getUser(): Promise<User | null>;
  onAuthStateChange(handler: (session: Session | null) => void): () => void;
}
