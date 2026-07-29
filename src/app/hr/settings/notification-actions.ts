"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function getNotificationRules() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('ertesitesi_szabaly')
    .select('*')
    .order('esemeny_tipus')
    
  if (error) {
    console.error("Error fetching notification rules:", error)
    return []
  }
  
  return data
}

export async function updateNotificationRule(id: string, aktiv: boolean, csatorna: string[]) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('ertesitesi_szabaly')
    .update({ aktiv, csatorna })
    .eq('id', id)
    
  if (error) {
    console.error("Error updating notification rule:", error)
    return { error: error.message }
  }
  
  revalidatePath('/hr/settings')
  revalidatePath('/settings')
  return { success: true }
}
