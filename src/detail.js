import '../style.css';
import { supabase, isConfigured } from './supabase.js';
import { fallbackMonument } from './data.js';
import { applyAppearance } from './appearance.js';

const container = document.querySelector('#detailContent');
const params = new URLSearchParams(location.search);
const requestedId = params.get('id') || fallbackMonument.id;

async function saveRecentlyViewed(monumentId) {
  if (!isConfigured) return;

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) return;

    const { error } = await supabase
      .from('recently_viewed')
      .upsert({
        user_id: userData.user.id,
        monument_id: monumentId,
        viewed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,monument_id'
      });

    if (error) {
      console.error('Không lưu được lịch sử xem:', error);
    }
  } catch (error) {
    console.error('Lỗi ghi nhận lượt xem:', error);
  }
}


function esc(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function load() {
  let item = fallbackMonument;
  if (isConfigured) {
    const { data } = await supabase.from('monuments').select('*, monument_tags(tags(name)), monument_images(*)').eq('id', requestedId).maybeSingle();
    if (data) {
  item = {
    ...data,
    tags: (data.monument_tags || []).map(link => link.tags?.name).filter(Boolean)
  };

  await saveRecentlyViewed(item.id);
}
  }
  let isEduMember = false;

  if (isConfigured) {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, membership_type')
        .eq('id', user.id)
        .maybeSingle();

      isEduMember = !error && (
  profile?.role === 'admin' ||
  profile?.membership_type === 'edu'
);
    }
  }
  const quizCard = isEduMember
    ? `
      <a href="./quiz.html?id=${encodeURIComponent(item.id)}" class="detail-quiz-card">
        <span class="eyebrow">KHÁM PHÁ VÀ ÔN TẬP</span>
        <h2>Thử thách kiến thức về di tích</h2>
        <p>Kiểm tra những gì bạn đã biết qua các mini game tương tác.</p>
        <span class="card-link">Tham gia Quiz →</span>
      </a>
    `
    : `
      <div class="detail-quiz-card quiz-locked">
        <span class="eyebrow">NỘI DUNG DÀNH RIÊNG CHO EDU</span>
        <h2>Thử thách kiến thức về di tích</h2>
        <p>Mở khóa các mini game ôn tập với tài khoản thành viên EDU.</p>
        <span class="card-link">🔒 Quiz đang bị khóa</span>
      </div>
    `;
  const level = Number(item.heritage_level);

  const levelContent = [3, 4, 5, 6].includes(level)
    ? `
      <span class="flag-rating" title="${level} cờ Việt Nam">
        ${Array.from({ length: level }, () => '<span class="vietnam-flag"></span>').join('')}
      </span>
      ${level === 6 ? '<span class="unesco-divider"></span><span class="unesco-label">UNESCO</span>' : ''}
    `
    : '<span class="unrated-label">UNRATED</span>';
  document.title = `${item.name} | Dấu Ấn Việt`;
  container.innerHTML = `
    <a class="back-link" href="./">← TRỞ VỀ BẢN ĐỒ</a>
    <div class="detail-kicker">HỒ SƠ DI SẢN <span> / </span> TP. HỒ CHÍ MINH</div>
<div class="detail-heading"><div><p class="eyebrow">ĐỊA DANH SỐ 001</p><h1>${esc(item.name)}</h1></div><span class="detail-seal">DS<br><small>01</small></span></div>

<div class="detail-heritage-level">
  <span class="eyebrow">PHÂN HẠNG DI SẢN</span>
  <span class="level-pill">${levelContent}</span>
</div>

<div class="detail-tags">${(item.tags || []).map(tag => `<span>${esc(tag)}</span>`).join('')}</div>
    <figure class="hero-figure"><img src="${esc(item.image_url || fallbackMonument.image_url)}" alt="${esc(item.name)}"><figcaption>Hình ảnh: ${esc(item.name)} · Ảnh tham khảo từ Wikimedia Commons</figcaption></figure>
    <div class="detail-columns">
      <aside class="fact-card"><p class="eyebrow">THÔNG TIN CƠ BẢN</p>
        <div class="fact-row"><span>ĐỊA CHỈ</span><b>${esc(item.address || 'Chưa cập nhật')}</b></div>
        <div class="fact-row"><span>THỜI GIAN XÂY DỰNG</span><b>${esc(item.construction_period || 'Chưa cập nhật')}</b></div>
        <div class="fact-row"><span>TỌA ĐỘ</span><b>${esc(item.latitude ?? '')}, ${esc(item.longitude ?? '')}</b></div>
        <a class="map-direction" target="_blank" rel="noreferrer" href="https://www.openstreetmap.org/?mlat=${encodeURIComponent(item.latitude)}&mlon=${encodeURIComponent(item.longitude)}#map=17/${encodeURIComponent(item.latitude)}/${encodeURIComponent(item.longitude)}">Xem trên bản đồ ↗</a>
      </aside>
      <article class="story-content"><p class="eyebrow">TỔNG QUAN</p><h2>Một dấu ấn trong<br><em>dòng chảy lịch sử.</em></h2><p>${esc(item.basic_info || 'Thông tin cơ bản đang được cập nhật.')}</p>
        <div class="story-divider"></div><p class="eyebrow">CÂU CHUYỆN DI SẢN</p>
        ${item.introduction ? `<p class="long-copy">${esc(item.introduction).replace(/\n/g, '<br>')}</p>` : '<div class="empty-content"><span>✦</span><b>Nội dung đang được biên soạn</b><p>Phần giới thiệu chuyên sâu sẽ được cập nhật bởi đội ngũ quản trị.</p></div>'}
      </article>
    </div>
    ${quizCard}
    <section class="gallery-section"><div><p class="eyebrow">TƯ LIỆU HÌNH ẢNH</p><h2>Thư viện <em>hình ảnh.</em></h2></div><p class="muted">Hiện tại hồ sơ sử dụng một ảnh đại diện. Bộ sưu tập ảnh sẽ được bổ sung trong quá trình phát triển.</p></section>
  `;
}
load();
applyAppearance('detail');
