import { supabase } from "./supabase.js";
export async function getCurrentUser(){const {data,error}=await supabase.auth.getUser();if(error)throw error;return data.user;}
export async function signOut(){const {error}=await supabase.auth.signOut();if(error)throw error;location.href="/";}
export async function saveSearch(keyword){const user=await getCurrentUser();if(!user||!keyword.trim())return;const {error}=await supabase.from("search_history").insert({user_id:user.id,keyword:keyword.trim()});if(error)console.error("Khong luu duoc lich su tim kiem:",error.message);}
