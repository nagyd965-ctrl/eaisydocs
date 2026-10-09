"use server"

import { createClient } from "@/utils/supabase/server"
import { getActiveCompanyIdServer } from "@/utils/company-server"
import { validateRuleInput, type PromptRuleItem } from "@/utils/prompt-rules-helper"
import { revalidatePath } from "next/cache"

export interface RuleActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Lekéri az aktív vagy megadott céghez tartozó összes AI prompt szabályt.
 */
export async function getCompanyPromptRules(targetCompanyId?: string): Promise<PromptRuleItem[]> {
  try {
    const supabase = await createClient()
    const activeCompanyId = targetCompanyId || (await getActiveCompanyIdServer())

    if (!activeCompanyId) {
      return []
    }

    const { data, error } = await supabase
      .from("company_prompt_rules")
      .select("id, company_id, rule_name, rule_prompt, category, is_active, created_at, updated_at")
      .eq("company_id", activeCompanyId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[getCompanyPromptRules] Hiba a szabályok lekérésekor:", error)
      return []
    }

    return (data as PromptRuleItem[]) || []
  } catch (err: any) {
    console.error("[getCompanyPromptRules] Kivétel:", err)
    return []
  }
}

/**
 * Új egyedi könyvelési/iktatási szabályt hoz létre a megadott vagy aktív céghez.
 */
export async function createCompanyPromptRule(input: {
  companyId?: string
  ruleName: string
  rulePrompt: string
  category?: string
}): Promise<RuleActionResult<PromptRuleItem>> {
  try {
    const validation = validateRuleInput(input.ruleName, input.rulePrompt)
    if (!validation.isValid) {
      return { success: false, error: validation.error }
    }

    const supabase = await createClient()
    const companyId = input.companyId || (await getActiveCompanyIdServer())

    if (!companyId) {
      return { success: false, error: "Nincs kiválasztva aktív cég a szabály rögzítéséhez." }
    }

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id || null

    const { data, error } = await supabase
      .from("company_prompt_rules")
      .insert({
        company_id: companyId,
        rule_name: input.ruleName.trim(),
        rule_prompt: input.rulePrompt.trim(),
        category: input.category || "szamla",
        is_active: true,
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      console.error("[createCompanyPromptRule] Beszúrási hiba:", error)
      return { success: false, error: error.message || "Nem sikerült menteni a szabályt." }
    }

    revalidatePath("/rules")
    revalidatePath("/inbox")
    revalidatePath("/settings")

    return { success: true, data }
  } catch (err: any) {
    console.error("[createCompanyPromptRule] Kivétel:", err)
    return { success: false, error: err.message || "Váratlan hiba történt." }
  }
}

/**
 * Meglévő szabály módosítása.
 */
export async function updateCompanyPromptRule(input: {
  ruleId: string
  ruleName: string
  rulePrompt: string
  category?: string
  isActive?: boolean
}): Promise<RuleActionResult> {
  try {
    const validation = validateRuleInput(input.ruleName, input.rulePrompt)
    if (!validation.isValid) {
      return { success: false, error: validation.error }
    }

    const supabase = await createClient()

    const updatePayload: Record<string, any> = {
      rule_name: input.ruleName.trim(),
      rule_prompt: input.rulePrompt.trim(),
      updated_at: new Date().toISOString(),
    }

    if (input.category) updatePayload.category = input.category
    if (typeof input.isActive === "boolean") updatePayload.is_active = input.isActive

    const { error } = await supabase
      .from("company_prompt_rules")
      .update(updatePayload)
      .eq("id", input.ruleId)

    if (error) {
      console.error("[updateCompanyPromptRule] Hiba:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/rules")
    revalidatePath("/inbox")

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Szabály aktív státuszának ki/bekapcsolása (Switch toggle).
 */
export async function toggleCompanyPromptRuleActive(
  ruleId: string,
  isActive: boolean
): Promise<RuleActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from("company_prompt_rules")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ruleId)

    if (error) {
      console.error("[toggleCompanyPromptRuleActive] Hiba:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/rules")
    revalidatePath("/inbox")

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Szabály végleges törlése.
 */
export async function deleteCompanyPromptRule(ruleId: string): Promise<RuleActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from("company_prompt_rules")
      .delete()
      .eq("id", ruleId)

    if (error) {
      console.error("[deleteCompanyPromptRule] Hiba:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/rules")
    revalidatePath("/inbox")

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
