export interface Company {
  id: string
  name: string
  tax_number: string | null
  address: string | null
  representative_name?: string | null
  phone?: string | null
  owner_id?: string | null
  share_token?: string | null
  share_token_created_at?: string | null
  country_code: string
  logo_url?: string | null
  filing_prefix?: string | null
  created_at: string
  updated_at: string
}

export interface CompanyMember {
  id: string
  company_id: string
  user_id: string
  role: "owner" | "admin" | "member"
  docs_szerepkor?: string | null
  hr_szerepkor?: string | null
  created_at: string
}

export interface CompanyMemberWithProfile extends CompanyMember {
  user_email?: string
  user_nev?: string
}

export interface UserCompanyAccess {
  company: Company
  role: "owner" | "admin" | "member"
  isOwner: boolean
  isAdmin: boolean
}
