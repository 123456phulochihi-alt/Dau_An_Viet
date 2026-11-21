import { getCurrentUser } from './account.js';
import 'leaflet/dist/leaflet.css';
import '../style.css';
import L from 'leaflet';
import { supabase, isConfigured } from './supabase.js';
import { fallbackMonument } from './data.js';
import { saveSearch } from './account.js';

const vietnamBounds = L.latLngBounds(
  L.latLng(7.5, 102.0),
  L.latLng(23.5, 110.5)
);

const map = L.map('map', {
  scrollWheelZoom: true,
  zoomControl: false,
  minZoom: 5,
  maxBounds: vietnamBounds,
  maxBoundsViscosity: 1
}).fitBounds(vietnamBounds);

L.control.zoom({ position: 'bottomright' }).addTo(map);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const markerIcon = L.divIcon({
  className: 'heritage-marker-wrap',
  html: '<span class="heritage-marker"><i></i></span>',
  iconSize: [30, 38],
  iconAnchor: [15, 34]
});

let monuments = [fallbackMonument];
let activeTags = new Set();

function renderTags() {
  const allTags = [...new Set(monuments.flatMap(item => item.tags || []))];
  document.querySelector('#tagFilters').innerHTML = allTags.map(tag =>
    `<button class="tag-chip ${activeTags.has(tag) ? 'selected' : ''}" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`
  ).join('');
  document.querySelectorAll('[data-tag]').forEach(button => button.addEventListener('click', () => {
    const tag = button.dataset.tag;
    activeTags.has(tag) ? activeTags.delete(tag) : activeTags.add(tag);
    renderTags();
    renderPlaces();
  }));
}

function renderPlaces() {
  const query = document.querySelector('#searchInput').value.trim().toLocaleLowerCase('vi');
  const selectedLevel = document.querySelector('#heritageFilter').value;

  const filtered = monuments.filter(item => {
    const matchesText = item.name.toLocaleLowerCase('vi').includes(query);
const matchesTags = activeTags.size === 0 || [...activeTags].every(tag => (item.tags || []).includes(tag));

const matchesLevel = !selectedLevel
  || (selectedLevel === 'unrated'
    ? ![3, 4, 5, 6].includes(Number(item.heritage_level))
    : Number(item.heritage_level) === Number(selectedLevel));

return matchesText && matchesTags && matchesLevel;
  });

  document.querySelector('#placeCount').textContent = `${String(filtered.length).padStart(2, '0')} ĐỊA DANH`;

  document.querySelector('#placeList').innerHTML = filtered.map(item => {
    const level = Number(item.heritage_level);

    const levelContent = [3, 4, 5, 6].includes(level)
      ? `
        <span class="flag-rating" title="${level} cờ Việt Nam">
          ${Array.from({ length: level }, () => '<span class="vietnam-flag"></span>').join('')}
        </span>
        ${level === 6 ? '<span class="unesco-divider"></span><span class="unesco-label">UNESCO</span>' : ''}
      `
      : '<span class="unrated-label">UNRATED</span>';

    return `
      <a class="place-card" href="./detail.html?id=${encodeURIComponent(item.id)}">
        <div class="place-index">01 <span>·</span> DI TÍCH</div>
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.address || '')}</p>
        <div class="place-rating">${levelContent}</div>
        <div class="place-tags">${(item.tags || []).slice(0, 3).map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
        <div class="place-open">MỞ HỒ SƠ <b>↗</b></div>
      </a>`;
  }).join('') || '<p class="empty-state">Không tìm thấy địa danh phù hợp.</p>';

  window.dispatchEvent(new CustomEvent('heritage:filtered', { detail: filtered }));
}

function addMarkers() {
  monuments.forEach(item => {
    if (Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude))) {
      const level = Number(item.heritage_level);

      const levelContent = [3, 4, 5, 6].includes(level)
        ? `
          <span class="flag-rating" title="${level} cờ Việt Nam">
            ${Array.from({ length: level }, () => '<span class="vietnam-flag"></span>').join('')}
          </span>
          ${level === 6 ? '<span class="unesco-divider"></span><span class="unesco-label">UNESCO</span>' : ''}
        `
        : '<span class="unrated-label">UNRATED</span>';

      L.marker([Number(item.latitude), Number(item.longitude)], { icon: markerIcon })
        .addTo(map)
        .bindPopup(`
          <div class="map-popup">
            <small>HỒ SƠ DI SẢN</small>
            <b>${escapeHtml(item.name)}</b>
            <div class="map-popup-rating">${levelContent}</div>
            <a href="./detail.html?id=${encodeURIComponent(item.id)}">Xem thông tin →</a>
          </div>
        `);
    }
  });
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}


async function loadMonuments() {
  if (isConfigured) {
    console.log('Supabase URL và KEY đã được đọc.');

    const { data: regions, error: regionsError } = await supabase
      .from('regions')
      .select('id, name')
      .limit(5);

    if (regionsError) {
      console.error('Lỗi kết nối Supabase:', regionsError);
    } else {
      console.log('Kết nối Supabase thành công!');
      console.log('Regions:', regions);
    }

    const { data, error } = await supabase
      .from('monuments')
      .select('*, monument_tags(tags(name))')
      .eq('status', 'published');

    if (error) {
      console.error('Lỗi tải dữ liệu di tích:', error);
    } else if (data?.length) {
      monuments = data.map(row => ({
        ...row,
        tags: (row.monument_tags || []).map(link => link.tags?.name).filter(Boolean)
      }));
      console.log('Đã tải dữ liệu di tích:', monuments);
    }
  } else {
    console.warn('Supabase chưa được cấu hình. Đang sử dụng dữ liệu dự phòng.');
  }

  addMarkers();
  renderTags();
  renderPlaces();

    addMarkers();
  renderTags();
  renderPlaces();

  map.fitBounds(vietnamBounds, {
    padding: [10, 10]
  });
}
const searchInput = document.querySelector('#searchInput');

searchInput.addEventListener('input', renderPlaces);

searchInput.addEventListener('keydown', async e => {
  if (e.key === 'Enter') {
    await saveSearch(searchInput.value);
  }
});
async function updateAccountLink()
{
  const accountLink = document.querySelector('#accountLink');
  if (!accountLink) return;

  try
  {
    const user = await getCurrentUser();

    if (user)
    {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', user.id)
        .single();

      const name = profile?.username || profile?.display_name || user.email;

      accountLink.textContent = `Xin chào, ${name}!`;
      accountLink.href = './account.html';
    }
  }
  catch (error)
  {
    console.error('Không thể tải thông tin tài khoản:', error);
  }
}
document.querySelector('#searchInput').addEventListener('input', renderPlaces);
document.querySelector('#heritageFilter').addEventListener('change', renderPlaces);

loadMonuments();
updateAccountLink();