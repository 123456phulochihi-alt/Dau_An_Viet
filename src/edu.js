
import { supabase } from './supabase.js';
import { applyAppearance } from './appearance.js';

async function checkEduAccess() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    console.error('Lỗi xác thực:', authError);
    location.replace('/auth.html');
    return false;
  }

  if (!user) {
    location.replace('/auth.html');
    return false;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, membership_type')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('Không lấy được thông tin tài khoản:', profileError);
    alert('Không thể xác minh quyền truy cập. Vui lòng thử lại.');
    location.replace('/account.html');
    return false;
  }

  if (profile.role !== 'admin' && profile.membership_type !== 'edu') {
    alert('Trang này chỉ dành cho thành viên EDU.');
    location.replace('/account.html');
    return;
  }
   return true;
}

async function initEdu() {
  const hasAccess = await checkEduAccess();

  if (hasAccess) {
    applyAppearance('edu');
  }
}

initEdu();

initEdu();