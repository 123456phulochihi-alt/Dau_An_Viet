
import '../style.css';
import { supabase, isConfigured } from './supabase.js';

const loginPanel = document.querySelector('#loginPanel');
const dashboard = document.querySelector('#dashboard');
const loginMessage = document.querySelector('#loginMessage');
const saveMessage = document.querySelector('#saveMessage');
const listMessage = document.querySelector('#listMessage');

const loginForm = document.querySelector('#loginForm');
const monumentForm = document.querySelector('#monumentForm');
const monumentList = document.querySelector('#monumentList');
const monumentCount = document.querySelector('#monumentCount');
const listPanel = document.querySelector('#listPanel');
const editorPanel = document.querySelector('#editorPanel');
const regionSelect = document.querySelector('#regionSelect');
const regionFilter = document.querySelector('#regionFilter');
const currentImage = document.querySelector('#currentImage');
const imageUpload = document.querySelector('#imageUpload');
const slugPreview = document.querySelector('#slugPreview');
const regionsPanel = document.querySelector('#regionsPanel');
const regionForm = document.querySelector('#regionForm');
const regionsList = document.querySelector('#regionsList');
const regionMessage = document.querySelector('#regionMessage');
const regionsMessage = document.querySelector('#regionsMessage');
const showRegionsButton = document.querySelector('#showRegionsButton');

let monuments = [];
let regions = [];
let currentImageUrl = '';
let isAdmin = false;

function showMessage(element, text, error = false) {
  element.textContent = text;
  element.classList.toggle('error', error);
}

function showLogin() {
  loginPanel.classList.remove('hidden');
  dashboard.classList.add('hidden');
}

function showDashboard() {
  loginPanel.classList.add('hidden');
  dashboard.classList.remove('hidden');
}

function showList() {
  listPanel.classList.remove('hidden');
  editorPanel.classList.add('hidden');
  regionsPanel.classList.add('hidden');
  document.querySelector('#showListButton').classList.add('active');
  document.querySelector('#showEditorButton').classList.remove('active');
  showRegionsButton.classList.remove('active');
}

function showEditor() {
  listPanel.classList.add('hidden');
  editorPanel.classList.remove('hidden');
  document.querySelector('#showListButton').classList.remove('active');
  document.querySelector('#showEditorButton').classList.add('active');
}
function showRegions() {
  listPanel.classList.add('hidden');
  editorPanel.classList.add('hidden');
  regionsPanel.classList.remove('hidden');
  document.querySelector('#showListButton').classList.remove('active');
  document.querySelector('#showEditorButton').classList.remove('active');
  showRegionsButton.classList.add('active');
}

function makeSlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[character]);
}

function fillRegionOptions() {
  regionSelect.innerHTML = '<option value="">Chọn khu vực</option>';
  regionFilter.innerHTML = '<option value="">Tất cả khu vực</option>';

  for (const region of regions) {
    const editorOption = document.createElement('option');
    editorOption.value = region.id;
    editorOption.textContent = region.name;
    regionSelect.appendChild(editorOption);

    const filterOption = document.createElement('option');
    filterOption.value = region.id;
    filterOption.textContent = region.name;
    regionFilter.appendChild(filterOption);
  }
}

async function loadRegions() {
  const { data, error } = await supabase
    .from('regions')
    .select('id, name, code, description')
    .order('name');

  if (error) {
    showMessage(listMessage, `Không tải được danh sách khu vực: ${error.message}`, true);
    return false;
  }

  regions = data || [];
  fillRegionOptions();
  renderRegions();
  return true;
}

function getRegionName(regionId) {
  const region = regions.find(item => item.id === regionId);
  return region?.name || 'Chưa xác định khu vực';
}
function renderRegions() {
  if (!regions.length) {
    regionsList.innerHTML = '<p class="muted">Chưa có khu vực nào.</p>';
    return;
  }

  regionsList.innerHTML = regions.map(region => `
    <article class="monument-row">
      <div class="monument-row-info">
        <h3>${escapeHtml(region.name)}</h3>
        <p class="monument-location">Mã khu vực: ${escapeHtml(region.code)}</p>
        <p class="monument-period">
          ${escapeHtml(region.description || 'Chưa có mô tả')}
        </p>
      </div>

      <div class="monument-row-actions">
        <button class="text-button" type="button" data-edit-region="${escapeHtml(region.id)}">Chỉnh sửa</button>
        <button class="text-button danger-button" type="button" data-delete-region="${escapeHtml(region.id)}">Xóa</button>
      </div>
    </article>
  `).join('');
}
function resetRegionForm() {
  regionForm.reset();
  regionForm.elements.id.value = '';
  showMessage(regionMessage, '');
}
async function saveRegion(event) {
  event.preventDefault();

  if (!isAdmin) {
    showMessage(regionMessage, 'Bạn không có quyền thực hiện thao tác này.', true);
    return;
  }

  const form = new FormData(regionForm);
  const id = String(form.get('id') || '');
  const name = String(form.get('name') || '').trim();
  const code = String(form.get('code') || '').trim().toUpperCase();
  const description = String(form.get('description') || '').trim() || null;

  if (!name || !code) {
    showMessage(regionMessage, 'Vui lòng nhập tên và mã khu vực.', true);
    return;
  }

  const payload = { name, code, description };
  const submitButton = regionForm.querySelector('button[type="submit"]');

  submitButton.disabled = true;
  showMessage(regionMessage, 'Đang lưu khu vực...');

  let result;

  if (id) {
    result = await supabase
      .from('regions')
      .update(payload)
      .eq('id', id);
  } else {
    result = await supabase
      .from('regions')
      .insert(payload);
  }

  submitButton.disabled = false;

  if (result.error) {
    showMessage(regionMessage, `Không lưu được khu vực: ${result.error.message}`, true);
    return;
  }

  resetRegionForm();
  showMessage(regionsMessage, id ? 'Đã cập nhật khu vực.' : 'Đã thêm khu vực.');
  await loadRegions();
  await loadMonuments();
}
function editRegion(regionId) {
  const region = regions.find(item => item.id === regionId);
  if (!region) return;

  regionForm.elements.id.value = region.id;
  regionForm.elements.name.value = region.name;
  regionForm.elements.code.value = region.code;
  regionForm.elements.description.value = region.description || '';

  showMessage(regionMessage, 'Đang chỉnh sửa khu vực: ' + region.name);
  regionForm.elements.name.focus();
}
async function deleteRegion(regionId) {
  const region = regions.find(item => item.id === regionId);
  if (!region) return;

  const { count, error: countError } = await supabase
    .from('monuments')
    .select('id', { count: 'exact', head: true })
    .eq('region_id', regionId);

  if (countError) {
    showMessage(regionsMessage, `Không kiểm tra được di sản liên quan: ${countError.message}`, true);
    return;
  }

  if (count > 0) {
    showMessage(
      regionsMessage,
      `Không thể xóa "${region.name}" vì đang có ${count} di sản liên kết.`,
      true
    );
    return;
  }

  const confirmed = window.confirm(
    `Bạn có chắc muốn xóa khu vực "${region.name}" (${region.code})? Thao tác này không thể hoàn tác.`
  );

  if (!confirmed) return;

  const { error } = await supabase
    .from('regions')
    .delete()
    .eq('id', regionId);

  if (error) {
    showMessage(regionsMessage, `Không xóa được khu vực: ${error.message}`, true);
    return;
  }

  if (regionForm.elements.id.value === regionId) {
    resetRegionForm();
  }

  showMessage(regionsMessage, `Đã xóa khu vực "${region.name}".`);
  await loadRegions();
  await loadMonuments();
}
function renderMonuments() {
  const keyword = document.querySelector('#monumentSearch').value.trim().toLocaleLowerCase('vi');
  const selectedRegion = regionFilter.value;
  const selectedStatus = document.querySelector('#statusFilter').value;

  const filtered = monuments.filter(item => {
    const matchesName = !keyword || String(item.name || '').toLocaleLowerCase('vi').includes(keyword);
    const matchesRegion = !selectedRegion || item.region_id === selectedRegion;
    const matchesStatus = !selectedStatus || item.status === selectedStatus;
    return matchesName && matchesRegion && matchesStatus;
  });

  monumentCount.textContent = String(monuments.length);

  if (!filtered.length) {
    monumentList.innerHTML = '<p class="muted">Không tìm thấy di sản phù hợp.</p>';
    return;
  }

  monumentList.innerHTML = filtered.map(item => {
    const statusText = item.status === 'published' ? 'Đã xuất bản' : 'Bản nháp';
    const statusClass = item.status === 'published' ? 'published' : 'draft';
    const level = Number(item.heritage_level);

const levelContent = [3, 4, 5, 6].includes(level)
  ? `
    <span class="flag-rating" title="${level} cờ Việt Nam">
      ${Array.from({ length: level }, () => '<span class="vietnam-flag"></span>').join('')}
    </span>
    ${level === 6 ? '<span class="unesco-divider"></span><span class="unesco-label">UNESCO</span>' : ''}
  `
  : '<span class="unrated-label">UNRATED</span>';

    const imageContent = item.image_url
      ? `<img class="monument-thumbnail" src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}">`
      : '<div class="monument-thumbnail monument-no-image">Chưa có ảnh</div>';

    return `
      <article class="monument-row">
        <div class="monument-row-image">
          ${imageContent}
        </div>

        <div class="monument-row-info">
          <h3>${escapeHtml(item.name)}</h3>

          <p class="monument-location">
            ${escapeHtml(getRegionName(item.region_id))}
            ${item.address ? ` · ${escapeHtml(item.address)}` : ''}
          </p>

          <p class="monument-period">
            ${item.construction_period
              ? `Thời gian xây dựng: ${escapeHtml(item.construction_period)}`
              : 'Chưa cập nhật thời gian xây dựng'}
          </p>

		<div class="monument-row-meta">
  		<span class="status-pill ${statusClass}">${statusText}</span>
  		<span class="level-pill">${levelContent}</span>
		</div>
        </div>

        <div class="monument-row-actions">
          <button class="text-button" type="button" data-edit="${escapeHtml(item.id)}">Chỉnh sửa</button>
          <button class="text-button danger-button" type="button" data-delete="${escapeHtml(item.id)}">Xóa</button>
        </div>
      </article>
    `;
  }).join('');
}


async function loadMonuments() {
  showMessage(listMessage, 'Đang tải danh sách di sản...');

  const { data, error } = await supabase
    .from('monuments')
    .select('id, name, slug, address, region_id, status, heritage_level, construction_period, image_url, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    showMessage(listMessage, `Không tải được danh sách di sản: ${error.message}`, true);
    monumentList.innerHTML = '';
    return;
  }

  monuments = data || [];
  showMessage(listMessage, '');
  renderMonuments();
}

async function checkAdmin() {
  if (!isConfigured || !supabase) {
    showMessage(loginMessage, 'Chưa kết nối Supabase. Hãy kiểm tra file .env.', true);
    showLogin();
    return;
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    showLogin();
    return;
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error || profile?.role !== 'admin') {
    await supabase.auth.signOut();
    showMessage(loginMessage, 'Tài khoản này chưa được cấp quyền quản trị viên.', true);
    showLogin();
    return;
  }

  isAdmin = true;
  showDashboard();

  const regionsLoaded = await loadRegions();
  await loadMonuments();

  if (regionsLoaded && !regions.length) {
    showMessage(listMessage, 'Bảng regions chưa có khu vực nào. Hãy thêm khu vực trước khi tạo hồ sơ di sản.', true);
  }
}

function resetEditor() {
  monumentForm.reset();
  monumentForm.elements.id.value = '';
  currentImageUrl = '';
  currentImage.removeAttribute('src');
  currentImage.hidden = true;
  imageUpload.value = '';
  document.querySelector('#editorTitle').textContent = 'Thêm di sản mới';
  slugPreview.textContent = 'Sẽ được tạo tự động từ tên di sản';
  showMessage(saveMessage, '');
}

async function openEditor(monumentId = null) {
  resetEditor();

  if (!monumentId) {
    showEditor();
    return;
  }

  showMessage(saveMessage, 'Đang tải hồ sơ di sản...');

  const { data, error } = await supabase
    .from('monuments')
    .select('*, monument_tags(tag_id, tags(name))')
    .eq('id', monumentId)
    .single();

  if (error) {
    showMessage(listMessage, `Không tải được hồ sơ: ${error.message}`, true);
    showList();
    return;
  }

  for (const field of [
    'name',
    'region_id',
    'address',
    'construction_period',
    'latitude',
    'longitude',
    'basic_info',
    'introduction',
    'status'
  ]) {
    monumentForm.elements[field].value = data[field] ?? '';
  }

  monumentForm.elements.id.value = data.id;
  monumentForm.elements.heritage_level.value = data.heritage_level ?? '';
  monumentForm.elements.tags.value = (data.monument_tags || [])
    .map(link => link.tags?.name)
    .filter(Boolean)
    .join(', ');

  currentImageUrl = data.image_url || '';

  if (currentImageUrl) {
    currentImage.src = currentImageUrl;
    currentImage.hidden = false;
  }

  document.querySelector('#editorTitle').textContent = 'Chỉnh sửa di sản';
  updateSlugPreview();
  showMessage(saveMessage, '');
  showEditor();
}

function updateSlugPreview() {
  const slug = makeSlug(monumentForm.elements.name.value);
  slugPreview.textContent = slug || 'Sẽ được tạo tự động từ tên di sản';
}

async function uploadImage(file) {
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showMessage(saveMessage, 'Vui lòng chọn tệp hình ảnh hợp lệ.', true);
    imageUpload.value = '';
    return;
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const storagePath = `${Date.now()}-${safeName}`;

  showMessage(saveMessage, 'Đang tải ảnh lên...');

  const { error } = await supabase
    .storage
    .from('monument-images')
    .upload(storagePath, file, { upsert: false });

  if (error) {
    showMessage(saveMessage, `Không tải được ảnh: ${error.message}`, true);
    return;
  }

  const { data } = supabase.storage
    .from('monument-images')
    .getPublicUrl(storagePath);

  currentImageUrl = data.publicUrl;
  currentImage.src = currentImageUrl;
  currentImage.hidden = false;

  showMessage(saveMessage, 'Ảnh đã tải lên. Hãy lưu hồ sơ để cập nhật ảnh đại diện.');
}

async function saveTags(monumentId, tagInput) {
  const { error: deleteError } = await supabase
    .from('monument_tags')
    .delete()
    .eq('monument_id', monumentId);

  if (deleteError) return deleteError;

  const tagNames = [...new Set(
    String(tagInput || '')
      .split(',')
      .map(name => name.trim())
      .filter(Boolean)
  )];

  for (const tagName of tagNames) {
    let { data: tag, error: selectError } = await supabase
      .from('tags')
      .select('id')
      .eq('name', tagName)
      .maybeSingle();

    if (selectError) return selectError;

    if (!tag) {
      const inserted = await supabase
        .from('tags')
        .insert({ name: tagName })
        .select('id')
        .single();

      if (inserted.error) return inserted.error;
      tag = inserted.data;
    }

    const linked = await supabase
      .from('monument_tags')
      .insert({ monument_id: monumentId, tag_id: tag.id });

    if (linked.error) return linked.error;
  }

  return null;
}

async function saveMonument(event) {
  event.preventDefault();

  if (!isAdmin) {
    showMessage(saveMessage, 'Bạn không có quyền thực hiện thao tác này.', true);
    return;
  }

  const form = new FormData(monumentForm);
  const name = String(form.get('name') || '').trim();
  const slug = makeSlug(name);
  const regionId = String(form.get('region_id') || '');

  if (!name || !slug) {
    showMessage(saveMessage, 'Vui lòng nhập tên di sản hợp lệ.', true);
    return;
  }

  if (!regionId) {
    showMessage(saveMessage, 'Vui lòng chọn khu vực của di sản.', true);
    return;
  }

  const latitudeValue = String(form.get('latitude') || '').trim();
  const longitudeValue = String(form.get('longitude') || '').trim();

  const payload = {
    name,
    slug,
    region_id: regionId,
    address: String(form.get('address') || '').trim() || null,
    construction_period: String(form.get('construction_period') || '').trim() || null,
    latitude: latitudeValue === '' ? null : Number(latitudeValue),
    longitude: longitudeValue === '' ? null : Number(longitudeValue),
    basic_info: String(form.get('basic_info') || '').trim() || null,
    introduction: String(form.get('introduction') || '').trim() || null,
    heritage_level: form.get('heritage_level') === '' ? null : Number(form.get('heritage_level')),
    image_url: currentImageUrl || null,
    status: String(form.get('status') || 'draft')
  };

  if (
    (payload.latitude !== null && !Number.isFinite(payload.latitude)) ||
    (payload.longitude !== null && !Number.isFinite(payload.longitude))
  ) {
    showMessage(saveMessage, 'Vĩ độ và kinh độ phải là số hợp lệ.', true);
    return;
  }

  const submitButton = monumentForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  showMessage(saveMessage, 'Đang lưu hồ sơ di sản...');

  const existingId = String(form.get('id') || '');
  let monumentId = existingId;

  if (existingId) {
    const { error } = await supabase
      .from('monuments')
      .update(payload)
      .eq('id', existingId);

    if (error) {
      submitButton.disabled = false;
      showMessage(saveMessage, `Không cập nhật được di sản: ${error.message}`, true);
      return;
    }
  } else {
    const { data, error } = await supabase
      .from('monuments')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      submitButton.disabled = false;
      showMessage(saveMessage, `Không thêm được di sản: ${error.message}`, true);
      return;
    }

    monumentId = data.id;
    monumentForm.elements.id.value = monumentId;
  }

  const tagError = await saveTags(monumentId, form.get('tags'));
  submitButton.disabled = false;

  if (tagError) {
    showMessage(saveMessage, `Đã lưu thông tin di sản nhưng chưa cập nhật được tag: ${tagError.message}`, true);
    return;
  }

  showMessage(saveMessage, 'Đã lưu hồ sơ di sản thành công.');
  await loadMonuments();
  window.setTimeout(() => showList(), 700);
}

async function deleteMonument(monumentId) {
  const item = monuments.find(monument => monument.id === monumentId);
  if (!item) return;

  const confirmed = window.confirm(
    `Bạn có chắc muốn xóa di sản "${item.name}"? Thao tác này không thể hoàn tác.`
  );

  if (!confirmed) return;

  const { error } = await supabase
    .from('monuments')
    .delete()
    .eq('id', monumentId);

  if (error) {
    showMessage(listMessage, `Không xóa được di sản: ${error.message}`, true);
    return;
  }

  showMessage(listMessage, 'Đã xóa di sản.');
  await loadMonuments();
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();

  if (!isConfigured || !supabase) {
    showMessage(loginMessage, 'Chưa cấu hình kết nối Supabase.', true);
    return;
  }

  const form = new FormData(loginForm);

  const { error } = await supabase.auth.signInWithPassword({
    email: form.get('email'),
    password: form.get('password')
  });

  if (error) {
    showMessage(loginMessage, error.message, true);
    return;
  }

  await checkAdmin();
});

document.querySelector('#logoutButton').addEventListener('click', async () => {
  await supabase.auth.signOut();
  isAdmin = false;
  showLogin();
});

document.querySelector('#showListButton').addEventListener('click', showList);
document.querySelector('#showEditorButton').addEventListener('click', () => openEditor());
showRegionsButton.addEventListener('click', () => {
  resetRegionForm();
  showRegions();
});
document.querySelector('#cancelEditorButton').addEventListener('click', showList);
document.querySelector('#cancelFormButton').addEventListener('click', showList);

monumentForm.addEventListener('submit', saveMonument);
monumentForm.elements.name.addEventListener('input', updateSlugPreview);
regionForm.addEventListener('submit', saveRegion);
document.querySelector('#cancelRegionButton').addEventListener('click', resetRegionForm);

imageUpload.addEventListener('change', event => {
  uploadImage(event.target.files?.[0]);
});

document.querySelector('#monumentSearch').addEventListener('input', renderMonuments);
regionFilter.addEventListener('change', renderMonuments);
document.querySelector('#statusFilter').addEventListener('change', renderMonuments);

monumentList.addEventListener('click', event => {
  const editButton = event.target.closest('[data-edit]');
  const deleteButton = event.target.closest('[data-delete]');

  if (editButton) openEditor(editButton.dataset.edit);
  if (deleteButton) deleteMonument(deleteButton.dataset.delete);
});
regionsList.addEventListener('click', event => {
  const editButton = event.target.closest('[data-edit-region]');
  const deleteButton = event.target.closest('[data-delete-region]');

  if (editButton) editRegion(editButton.dataset.editRegion);
  if (deleteButton) deleteRegion(deleteButton.dataset.deleteRegion);
});
checkAdmin();
