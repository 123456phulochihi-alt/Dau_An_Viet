
import { getCurrentUser, saveSearch } from './account.js';
import { supabase, isConfigured } from './supabase.js';
import { fallbackMonument } from './data.js';
import '../style.css';

let monuments = [fallbackMonument];
let tags = [];
let activeTags = new Set();

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function renderTags() {
  const container = document.querySelector('#tagFilters');

  container.innerHTML = tags.map(tag => `
    <button class="search-tag-chip ${activeTags.has(tag.name) ? 'selected' : ''}"
      data-tag="${escapeHtml(tag.name)}">
      ${escapeHtml(tag.name)}
    </button>
  `).join('');

const tagCount = document.querySelector('#tagCount');
if (tagCount) {
  tagCount.textContent = `${tags.length} CHỦ ĐỀ`;
}

  container.querySelectorAll('[data-tag]').forEach(button => {
    button.addEventListener('click', () => {
      const tag = button.dataset.tag;

      if (activeTags.has(tag)) {
        activeTags.delete(tag);
      } else {
        activeTags.add(tag);
      }

      renderTags();
      renderPlaces();
    });
  });
}
const toggleTags = document.querySelector('#toggleTags');

toggleTags.addEventListener('click', () => {
  const expanded = toggleTags.getAttribute('aria-expanded') === 'true';

  toggleTags.setAttribute('aria-expanded', String(!expanded));

  document.querySelector('#tagFilters')
    .classList.toggle('collapsed', expanded);

  toggleTags.innerHTML = expanded
    ? 'Xem tất cả chủ đề <span>⌄</span>'
    : 'Thu gọn <span>⌃</span>';
});
function renderPlaces() {
  const query = document.querySelector('#searchInput')
    .value.trim().toLocaleLowerCase('vi');

  const selectedLevel = document.querySelector('#heritageFilter').value;

  const filtered = monuments.filter(item => {
    const searchableText = [
      item.name,
      item.address,
      ...(item.tags || [])
    ].join(' ').toLocaleLowerCase('vi');

    const matchesText = searchableText.includes(query);

    const matchesTags = activeTags.size === 0
      || [...activeTags].every(tag => (item.tags || []).includes(tag));

    const level = Number(item.heritage_level);

    const matchesLevel = !selectedLevel
      || (selectedLevel === 'unrated'
        ? ![3, 4, 5, 6].includes(level)
        : level === Number(selectedLevel));

    return matchesText && matchesTags && matchesLevel;
  });

  document.querySelector('#placeCount').textContent =
    `${filtered.length} ĐỊA DANH`;

  document.querySelector('#placeList').innerHTML = filtered.map((item, index) => {
    const level = Number(item.heritage_level);

    const levelContent = [3, 4, 5, 6].includes(level)
      ? `
        <span class="flag-rating">
          ${Array.from({ length: level }, () =>
            '<span class="vietnam-flag"></span>'
          ).join('')}
        </span>
        ${level === 6
          ? '<span class="unesco-divider"></span><span class="unesco-label">UNESCO</span>'
          : ''}
      `
      : '<span class="unrated-label">UNRATED</span>';

    return `
      <a class="search-result-card"
        href="./detail.html?id=${encodeURIComponent(item.id)}">

        <div class="search-result-index">
          ${String(index + 1).padStart(2, '0')} · DI TÍCH
        </div>

        <div class="search-result-content">
          <h3>${escapeHtml(item.name)}</h3>
          <p>${escapeHtml(item.address || 'Chưa cập nhật địa chỉ')}</p>

          <div class="place-rating">${levelContent}</div>

          <div class="place-tags">
            ${(item.tags || []).map(tag =>
              `<span>${escapeHtml(tag)}</span>`
            ).join('')}
          </div>
        </div>

        <span class="search-result-link">XEM HỒ SƠ ↗</span>
      </a>
    `;
  }).join('') || `
    <div class="empty-state">
      Không tìm thấy địa danh phù hợp.
      <br>Hãy thử thay đổi từ khóa hoặc bộ lọc.
    </div>
  `;
}

async function loadMonuments() {
  if (isConfigured) {
    const { data: tagData, error: tagError } = await supabase
      .from('tags')
      .select('id, name')
      .order('name');

    if (tagError) {
      console.error('Lỗi tải danh sách tag:', tagError);
    } else {
      tags = tagData || [];
    }

    const { data, error } = await supabase
      .from('monuments')
      .select('*, monument_tags(tags(name))')
      .eq('status', 'published');

    if (error) {
      console.error('Lỗi tải dữ liệu di tích:', error);
    } else if (data) {
      monuments = data.map(row => ({
        ...row,
        tags: (row.monument_tags || [])
          .map(link => link.tags?.name)
          .filter(Boolean)
      }));
    }
  } else {
    console.warn('Supabase chưa được cấu hình.');
    tags = [...new Set(fallbackMonument.tags || [])]
      .map(name => ({ name }));
  }

  renderTags();
  renderPlaces();
}

async function updateAccountLink() {
  const accountLink = document.querySelector('#accountLink');
  const eduLink = document.querySelector('#eduLink');

  if (!accountLink || !eduLink) return;

  eduLink.hidden = true;

  try {
    const user = await getCurrentUser();

    if (user) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username, display_name, role, membership_type')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const name = profile.username || profile.display_name || user.email;

      accountLink.textContent = `Xin chào, ${name}!`;
      accountLink.href = './account.html';

      if (profile.role === 'admin' || profile.membership_type === 'edu') {
        eduLink.hidden = false;
      }
    }
  } catch (error) {
    console.error('Không thể tải thông tin tài khoản:', error);
  }
}

const searchInput = document.querySelector('#searchInput');

searchInput.addEventListener('input', renderPlaces);

searchInput.addEventListener('keydown', async event => {
  if (event.key === 'Enter' && searchInput.value.trim()) {
    await saveSearch(searchInput.value.trim());
  }
});

document.querySelector('#heritageFilter')
  .addEventListener('change', renderPlaces);

document.querySelector('#clearFilters')?.addEventListener('click', () => {
  searchInput.value = '';
  document.querySelector('#heritageFilter').value = '';
  activeTags.clear();

  renderTags();
  renderPlaces();
});

loadMonuments();
updateAccountLink();
