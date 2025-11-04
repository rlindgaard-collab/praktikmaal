import { supabase } from './supabase.js';

export async function loadGoals() {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading goals:', error);
    return [];
  }

  return data.map(goal => ({
    id: goal.id,
    title: goal.title,
    description: goal.description,
    status: goal.status,
    reflection: goal.reflection,
    pdf: goal.pdf_data ? {
      name: goal.pdf_name,
      size: goal.pdf_size,
      type: goal.pdf_type,
      dataUrl: goal.pdf_data
    } : null,
    color: goal.color,
    createdAt: goal.created_at,
    updatedAt: goal.updated_at
  }));
}

export async function createGoal(goalData) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const dbGoal = {
    user_id: user.id,
    title: goalData.title,
    description: goalData.description || '',
    status: 'red',
    reflection: '',
    pdf_name: goalData.pdf?.name || null,
    pdf_data: goalData.pdf?.dataUrl || null,
    pdf_size: goalData.pdf?.size || null,
    pdf_type: goalData.pdf?.type || null,
    color: goalData.color || '#66BB6A'
  };

  const { data, error } = await supabase
    .from('goals')
    .insert(dbGoal)
    .select()
    .single();

  if (error) {
    console.error('Error creating goal:', error);
    throw error;
  }

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    status: data.status,
    reflection: data.reflection,
    pdf: data.pdf_data ? {
      name: data.pdf_name,
      size: data.pdf_size,
      type: data.pdf_type,
      dataUrl: data.pdf_data
    } : null,
    color: data.color,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

export async function updateGoal(id, updates) {
  const dbUpdates = {};

  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.reflection !== undefined) dbUpdates.reflection = updates.reflection;
  if (updates.color !== undefined) dbUpdates.color = updates.color;

  if (updates.pdf !== undefined) {
    if (updates.pdf === null) {
      dbUpdates.pdf_name = null;
      dbUpdates.pdf_data = null;
      dbUpdates.pdf_size = null;
      dbUpdates.pdf_type = null;
    } else {
      dbUpdates.pdf_name = updates.pdf.name;
      dbUpdates.pdf_data = updates.pdf.dataUrl;
      dbUpdates.pdf_size = updates.pdf.size;
      dbUpdates.pdf_type = updates.pdf.type;
    }
  }

  dbUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('goals')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating goal:', error);
    throw error;
  }

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    status: data.status,
    reflection: data.reflection,
    pdf: data.pdf_data ? {
      name: data.pdf_name,
      size: data.pdf_size,
      type: data.pdf_type,
      dataUrl: data.pdf_data
    } : null,
    color: data.color,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

export async function deleteGoal(id) {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting goal:', error);
    throw error;
  }
}
