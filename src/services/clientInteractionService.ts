/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { User } from '../types';

export type InteractionType = 'call' | 'email' | 'meeting' | 'followup' | 'note';

export interface ClientInteraction {
  id: string;
  client_id: string;
  type: InteractionType;
  subject: string;
  description: string;
  outcome?: string;
  next_followup?: string;
  created_by: string;
  created_by_name: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export interface InteractionInput {
  clientId: string;
  type: InteractionType;
  subject: string;
  description: string;
  outcome?: string;
  nextFollowup?: string;
  assignedTo?: string;
  user: User;
}

export const createInteraction = async ({
  clientId,
  type,
  subject,
  description,
  outcome,
  nextFollowup,
  assignedTo,
  user,
}: InteractionInput) => {
  const { data, error } = await supabase
    .from('client_interactions')
    .insert([{
      client_id: clientId,
      type,
      subject,
      description,
      outcome,
      next_followup: nextFollowup || null,
      assigned_to: assignedTo || null,
      created_by: user.id,
      created_by_name: user.name,
    }])
    .select('id')
    .single();

  if (error) throw error;
  return data;
};

export const getClientInteractions = async (clientId: string): Promise<ClientInteraction[]> => {
  const { data, error } = await supabase
    .from('client_interactions')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as ClientInteraction[];
};

export const getInteraction = async (interactionId: string) => {
  const { data, error } = await supabase
    .from('client_interactions')
    .select('*')
    .eq('id', interactionId)
    .single();

  if (error) throw error;
  return data as ClientInteraction;
};

export const updateInteraction = async (
  interactionId: string,
  updates: Partial<{
    subject: string;
    description: string;
    outcome: string;
    next_followup: string;
    assigned_to: string;
  }>
) => {
  const { error } = await supabase
    .from('client_interactions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', interactionId);

  if (error) throw error;
};

export const deleteInteraction = async (interactionId: string) => {
  const { error } = await supabase
    .from('client_interactions')
    .delete()
    .eq('id', interactionId);

  if (error) throw error;
};

// Get upcoming follow-ups for a user
export const getUpcomingFollowups = async (userId: string, firmId: string) => {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('client_interactions')
    .select('*, clients(name)')
    .eq('assigned_to', userId)
    .not('next_followup', 'is', null)
    .gte('next_followup', today)
    .order('next_followup', { ascending: true });

  if (error) throw error;
  return (data || []).map(item => ({
    ...item,
    client_name: (item.clients as Record<string, unknown>)?.name,
  }));
};

// Get overdue follow-ups
export const getOverdueFollowups = async (userId: string) => {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('client_interactions')
    .select('*, clients(name)')
    .eq('assigned_to', userId)
    .not('next_followup', 'is', null)
    .lt('next_followup', today)
    .order('next_followup', { ascending: true });

  if (error) throw error;
  return (data || []).map(item => ({
    ...item,
    client_name: (item.clients as Record<string, unknown>)?.name,
  }));
};

// Add client note (type = 'note')
export const addClientNote = async (
  clientId: string,
  user: User,
  subject: string,
  description: string
) => {
  return createInteraction({
    clientId,
    type: 'note',
    subject,
    description,
    user,
  });
};

// Schedule follow-up
export const scheduleFollowup = async (
  clientId: string,
  user: User,
  subject: string,
  description: string,
  followupDate: string,
  assignedTo?: string
) => {
  return createInteraction({
    clientId,
    type: 'followup',
    subject,
    description,
    nextFollowup: followupDate,
    assignedTo,
    user,
  });
};

// Log call
export const logCall = async (
  clientId: string,
  user: User,
  subject: string,
  description: string,
  outcome?: string
) => {
  return createInteraction({
    clientId,
    type: 'call',
    subject,
    description,
    outcome,
    user,
  });
};

// Log meeting
export const logMeeting = async (
  clientId: string,
  user: User,
  subject: string,
  description: string,
  outcome?: string
) => {
  return createInteraction({
    clientId,
    type: 'meeting',
    subject,
    description,
    outcome,
    user,
  });
};

// Log email
export const logEmail = async (
  clientId: string,
  user: User,
  subject: string,
  description: string,
  outcome?: string
) => {
  return createInteraction({
    clientId,
    type: 'email',
    subject,
    description,
    outcome,
    user,
  });
};