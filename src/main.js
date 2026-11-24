import { getCurrentUser } from './account.js';
import 'leaflet/dist/leaflet.css';
import '../style.css';
import L from 'leaflet';
import { supabase, isConfigured } from './supabase.js';
import { fallbackMonument } from './data.js';
import { applyAppearance } from './appearance.js';

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
let tags = [];
let activeTags = new Set();


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


function calculateDistance(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371;
  const toRadians = value => value * Math.PI / 180;

  const latitudeDifference = toRadians(lat2 - lat1);
  const longitudeDifference = toRadians(lon2 - lon1);

  const a = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(toRadians(lat1))
    * Math.cos(toRadians(lat2))
    * Math.sin(longitudeDifference / 2) ** 2;

  return earthRadius * 2 * Math.atan2(
    Math.sqrt(a),
    Math.sqrt(1 - a)
  );
}

function formatDistance(distance) {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }

  return `${distance.toFixed(1)} km`;
}

function findNearbyMonuments(latitude, longitude) {
  return monuments
    .filter(item => {
      const lat = Number(item.latitude);
      const lon = Number(item.longitude);

      return item.latitude !== null
        && item.latitude !== undefined
        && item.longitude !== null
        && item.longitude !== undefined
        && Number.isFinite(lat)
        && Number.isFinite(lon)
        && lat >= -90 && lat <= 90
        && lon >= -180 && lon <= 180;
    })
    .map(item => ({
      ...item,
      distance: calculateDistance(
        latitude,
        longitude,
        Number(item.latitude),
        Number(item.longitude)
      )
    }))
    .sort((a, b) => a.distance - b.distance);
}

function renderNearbyMonuments(latitude, longitude) {
  const nearbyList = document.querySelector('#nearbyList');
  const nearbyStatus = document.querySelector('#nearbyStatus');

  const sortedMonuments = findNearbyMonuments(latitude, longitude);

  if (!sortedMonuments.length) {
    nearbyStatus.textContent = 'Chưa có di tích nào được cập nhật tọa độ.';
    nearbyList.innerHTML = '';
    return;
  }

  const nearby = sortedMonuments.filter(item => item.distance <= 10);
  const results = (nearby.length ? nearby : sortedMonuments).slice(0, 3);

  if (nearby.length) {
    nearbyStatus.textContent = `Tìm thấy ${nearby.length} di tích trong bán kính 10 km.`;
  } else {
    nearbyStatus.textContent = 'Không có di tích trong bán kính 10 km. Đây là 3 di tích gần bạn nhất.';
  }

  nearbyList.innerHTML = results.map((item, index) => {
    const distance = formatDistance(item.distance);

    const directionUrl = `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${item.latitude},${item.longitude}&travelmode=driving`;

    return `
      <div class="nearby-card">
        <div class="nearby-distance">
          ${index === 0 ? 'GẦN BẠN NHẤT' : `VỊ TRÍ THỨ ${index + 1}`}
          · CÁCH ${distance}
        </div>
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.address || '')}</p>
        <div class="nearby-actions">
          <a href="./detail.html?id=${encodeURIComponent(item.id)}">XEM HỒ SƠ ↗</a>
          <a href="${directionUrl}" target="_blank" rel="noopener noreferrer">DẪN ĐƯỜNG ↗</a>
        </div>
      </div>
    `;
  }).join('');
}

function locateNearbyMonuments() {
  const nearbyButton = document.querySelector('#nearbyButton');
  const nearbyStatus = document.querySelector('#nearbyStatus');
  const nearbyList = document.querySelector('#nearbyList');

  if (!navigator.geolocation) {
    nearbyStatus.textContent = 'Trình duyệt không hỗ trợ định vị.';
    return;
  }

  nearbyButton.disabled = true;
  nearbyButton.textContent = 'ĐANG XÁC ĐỊNH VỊ TRÍ...';
  nearbyStatus.textContent = 'Vui lòng cho phép trình duyệt truy cập vị trí của bạn.';

  navigator.geolocation.getCurrentPosition(
    position => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      renderNearbyMonuments(latitude, longitude);

      nearbyButton.disabled = false;
      nearbyButton.innerHTML = '<span>⌖</span> Tìm lại di tích gần tôi';
    },
    error => {
      if (error.code === 1) {
        nearbyStatus.textContent = 'Bạn chưa cấp quyền định vị. Hãy cho phép truy cập vị trí trong trình duyệt.';
      } else if (error.code === 2) {
        nearbyStatus.textContent = 'Không xác định được vị trí. Hãy kiểm tra GPS hoặc kết nối mạng.';
      } else {
        nearbyStatus.textContent = 'Định vị mất quá nhiều thời gian. Vui lòng thử lại.';
      }

      nearbyList.innerHTML = '';
      nearbyButton.disabled = false;
      nearbyButton.innerHTML = '<span>⌖</span> Thử định vị lại';
    },
    {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 60000
    }
  );
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


  map.fitBounds(vietnamBounds, {
    padding: [10, 10]
  });
}
async function updateAccountLink()
{
  const accountLink = document.querySelector('#accountLink');
  const eduLink = document.querySelector('#eduLink');

  if (!accountLink || !eduLink) return;

  eduLink.hidden = true;

  try
  {
    const user = await getCurrentUser();

    if (user)
    {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username, display_name, role, membership_type')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const name = profile.username || profile.display_name || user.email;

      accountLink.textContent = `Xin chào, ${name}!`;
      accountLink.href = './account.html';

      if (profile.role === 'admin' || profile.membership_type === 'edu')
      {
        eduLink.hidden = false;
      }
    }
  }
  catch (error)
  {
    console.error('Không thể tải thông tin tài khoản:', error);
  }
}


document.querySelector('#nearbyButton')
  .addEventListener('click', locateNearbyMonuments);

loadMonuments();
updateAccountLink();
applyAppearance('home').then(() => {
  requestAnimationFrame(() => {
    map.invalidateSize(true);
  });
});