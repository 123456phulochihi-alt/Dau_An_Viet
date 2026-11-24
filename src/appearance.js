
import { supabase, isConfigured } from './supabase.js';

export async function applyAppearance(page) {
  if (!isConfigured || !supabase) return;

  const { data, error } = await supabase
    .from('site_appearance')
    .select('key, value')
    .in('key', ['logo', `background_${page}`]);

  if (error) {
    console.error('Không tải được giao diện website:', error.message);
    return;
  }

  const settings = data || [];
  const logo = settings.find(item => item.key === 'logo')?.value;
  const background = settings.find(
    item => item.key === `background_${page}`
  )?.value;

  document.querySelectorAll('.brand-mark').forEach(element => {
    if (logo) {
      const image = document.createElement('img');
      image.src = logo;
      image.alt = 'Dấu Ấn Việt';
      image.style.width = '100%';
      image.style.height = '100%';
      image.style.objectFit = 'contain';
      element.replaceChildren(image);
    }
  });
document.body.style.setProperty(
  '--site-background',
  background ? `url("${background}")` : 'none'
);
}
