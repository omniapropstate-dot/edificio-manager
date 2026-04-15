import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kqvhuzwepewqjlffmqvo.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtxdmh1endlcGV3cWpsZmZtcXZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Nzg5NjUsImV4cCI6MjA5MTI1NDk2NX0.DPlSSi4seRnPm43G_b4IhVn2Has1m3AiprR1bLFLnHw'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
