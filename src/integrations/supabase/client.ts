// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://nidkhwfnpovowosxwwpk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGtod2ZucG92b3dvc3h3d3BrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwNjAxMDcsImV4cCI6MjA1MDYzNjEwN30.s6TBY_PlGbZ6QgflaVP83IY35GNOVb8knOGkksTKQz8";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);