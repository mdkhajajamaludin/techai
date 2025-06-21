import { supabase } from './supabase'
import { Session } from '@supabase/supabase-js'
import { usePostHog } from 'posthog-js/react'
import { useState, useEffect } from 'react'

export type AuthViewType =
  | 'sign_in'
  | 'sign_up'
  | 'magic_link'
  | 'forgotten_password'
  | 'update_password'
  | 'verify_otp'

interface UserTeam {
  id: string
  name: string
  is_default: boolean
  tier: string
  email: string
  team_api_keys: { api_key: string }[]
}

export async function getUserAPIKey(session: Session) {
  return process.env.E2B_API_KEY
}

export function useAuth(
  setAuthDialog: (value: boolean) => void,
  setAuthView: (value: AuthViewType) => void,
) {
  const [session, setSession] = useState<Session | null>(null)
  const [apiKey, setApiKey] = useState<string | undefined>(process.env.E2B_API_KEY)
  const posthog = usePostHog()

  useEffect(() => {
    // Create a mock session
    setSession({ user: { email: 'demo@e2b.dev', id: 'demo-user' } } as Session)
    setApiKey(process.env.E2B_API_KEY)
  }, [])

  return {
    session,
    apiKey,
  }
}
