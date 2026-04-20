export interface Project {
  id: string
  name: string
  archived: boolean
  created_at: string
  updated_at: string
  last_opened_at: string | null
  draft_updated_at: string | null
}
