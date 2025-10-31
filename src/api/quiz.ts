import { supabase } from '../lib/supabase';

export type ManualQuestion = {
    id: string;
    manual_id: string;
    idx: number;
    question: string;
    option_a: string;
    option_b: string;
};

export async function getManualQuestions(manualId: string): Promise<ManualQuestion[]> {
    const { data, error } = await supabase
      .from('manual_questions')
      .select('id,manual_id,idx,question,option_a,option_b')
      .eq('manual_id', manualId)
      .order('idx', { ascending: true });
    
      if (error) throw error;
    
      return (data ?? []) as ManualQuestion[];
}
  
export async function submitManualAnswer(questionId: string, choice: 'A' | 'B'): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Unauthorized user');

    const { error } = await supabase
        .from('manual_answers')
        .upsert(
            {
                user_id: userId,
                question_id: questionId,
                choice: choice,
            },
            { onConflict: 'user_id,question_id' }
        );
    
    if (error) throw error;
}
  
export async function rpcAckManual(manualId: string): Promise<void> {
    const { error } = await supabase.rpc('acknowledge_manual', { p_manual_id: manualId });
    
    if (error) throw error;
}