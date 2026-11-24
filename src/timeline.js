
import { supabase } from './supabase.js';

const timelineList = document.querySelector('#timelineList');
const timelineMessage = document.querySelector('#timelineMessage');
const timelineRoleBadge = document.querySelector('#timelineRoleBadge');
const timelineSearch = document.querySelector('#timelineSearch');
const timelinePeriodFilter = document.querySelector('#timelinePeriodFilter');
const addTimelineEventButton = document.querySelector('#addTimelineEventButton');

const timelineAdminPanel = document.querySelector('#timelineAdminPanel');
const mainEventsAdminList = document.querySelector('#mainEventsAdminList');
const addMainEventButton = document.querySelector('#addMainEventButton');

const eventEditor = document.querySelector('#eventEditor');
const eventEditorForm = document.querySelector('#eventEditorForm');
const eventEditorHeading = document.querySelector('#eventEditorHeading');

const eventId = document.querySelector('#eventId');
const eventType = document.querySelector('#eventType');
const parentEvent = document.querySelector('#parentEvent');
const parentEventGroup = document.querySelector('#parentEventGroup');
const eventTitle = document.querySelector('#eventTitle');
const eventYear = document.querySelector('#eventYear');
const eventDateLabel = document.querySelector('#eventDateLabel');
const eventSummary = document.querySelector('#eventSummary');
const eventContent = document.querySelector('#eventContent');
const eventImageUrl = document.querySelector('#eventImageUrl');
const eventSortOrder = document.querySelector('#eventSortOrder');

const cancelEventEditor = document.querySelector('#cancelEventEditor');
const monumentSearch = document.querySelector('#monumentSearch');
const selectedMonuments = document.querySelector('#selectedMonuments');
const monumentSelectionList = document.querySelector('#monumentSelectionList');
const monumentSelectionMessage = document.querySelector('#monumentSelectionMessage');

let monuments = [];
let selectedMonumentIds = new Set();

let currentUser = null;
let isAdmin = false;
let timelineEvents = [];

function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[character]);
}

function validImageUrl(value) {
    try {
        return new URL(value).protocol === 'https:';
    } catch {
        return false;
    }
}

function showMessage(message) {
    timelineMessage.textContent = message;
}

function formatEventYear(year) {
    if (year < 0) {
        return `${Math.abs(year)} TCN`;
    }

    return `${year} SCN`;
}

async function checkAccess() {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        window.location.href = './auth.html';
        return false;
    }

    currentUser = user;

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, membership_type')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        alert('Không thể xác minh tài khoản.');
        window.location.href = './account.html';
        return false;
    }

    isAdmin = profile.role === 'admin';

    if (!isAdmin && profile.membership_type !== 'edu') {
        alert('Bạn cần có quyền truy cập EDU để sử dụng tính năng này.');
        window.location.href = './account.html';
        return false;
    }

    timelineRoleBadge.textContent = isAdmin ? 'ADMIN' : 'EDU MEMBER';
    addTimelineEventButton.hidden = !isAdmin;
    timelineAdminPanel.hidden = !isAdmin;

    return true;
}

async function loadTimelineEvents() {
    showMessage('Đang tải các sự kiện lịch sử...');

    const { data, error } = await supabase
        .from('edu_timeline_events')
        .select('*')
        .order('event_year', { ascending: true })
        .order('sort_order', { ascending: true });

    if (error) {
        showMessage('Không thể tải dữ liệu: ' + error.message);
        return;
    }

    timelineEvents = data || [];

    renderPeriodFilter();
    renderTimeline();

    if (isAdmin) {
        renderAdminEvents();
    }

    showMessage(
        timelineEvents.length
            ? ''
            : 'Hiện chưa có sự kiện lịch sử nào được đăng tải.'
    );
}
async function loadMonuments() {
    const { data, error } = await supabase
        .from('monuments')
        .select('id, name, address, image_url')
        .order('name', { ascending: true });

    if (error) {
        monumentSelectionList.textContent =
            'Không thể tải danh sách di tích: ' + error.message;
        return;
    }

    monuments = data || [];
    renderMonumentSelection();
}
async function loadEventMonuments(eventId) {
    selectedMonumentIds.clear();

    const { data, error } = await supabase
        .from('edu_timeline_monuments')
        .select('monument_id')
        .eq('event_id', eventId);

    if (error) {
        monumentSelectionMessage.textContent =
            'Không thể tải di tích liên quan: ' + error.message;
        renderSelectedMonuments();
        renderMonumentSelection();
        return;
    }

    data.forEach(item => {
        selectedMonumentIds.add(item.monument_id);
    });

    monumentSelectionMessage.textContent = '';

    renderSelectedMonuments();
    renderMonumentSelection();
}
function renderMonumentSelection() {
    const keyword = monumentSearch.value.trim().toLowerCase();

    const filteredMonuments = monuments.filter(monument => {
        return (
            (monument.name || '').toLowerCase().includes(keyword) ||
            (monument.address || '').toLowerCase().includes(keyword)
        );
    });

    if (!filteredMonuments.length) {
        monumentSelectionList.innerHTML =
            '<p>Không tìm thấy di tích phù hợp.</p>';
        return;
    }

    monumentSelectionList.innerHTML = filteredMonuments.map(monument => `
        <label class="monument-option">
            <input
                type="checkbox"
                value="${escapeHtml(monument.id)}"
                data-monument-id="${escapeHtml(monument.id)}"
                ${selectedMonumentIds.has(monument.id) ? 'checked' : ''}
            >

            ${
                validImageUrl(monument.image_url || '')
                    ? `
                        <img
                            src="${escapeHtml(monument.image_url)}"
                            alt="${escapeHtml(monument.name)}"
                        >
                    `
                    : ''
            }

            <span class="monument-option-info">
                <strong>${escapeHtml(monument.name)}</strong>
                <small>${escapeHtml(monument.address || 'Chưa có địa chỉ')}</small>
            </span>
        </label>
    `).join('');
}
function renderSelectedMonuments() {
    const selectedList = monuments.filter(monument =>
        selectedMonumentIds.has(monument.id)
    );

    if (!selectedList.length) {
        selectedMonuments.innerHTML =
            '<p>Chưa chọn di tích nào.</p>';
        return;
    }

    selectedMonuments.innerHTML = selectedList.map(monument => `
        <div class="selected-monument-item">
            <span>${escapeHtml(monument.name)}</span>

            <button
                type="button"
                data-remove-monument="${escapeHtml(monument.id)}"
                aria-label="Bỏ chọn ${escapeHtml(monument.name)}"
            >
                ×
            </button>
        </div>
    `).join('');
}
monumentSearch.addEventListener('input', () => {
    renderMonumentSelection();
});

monumentSelectionList.addEventListener('change', event => {
    const checkbox = event.target.closest('[data-monument-id]');

    if (!checkbox) return;

    const id = checkbox.dataset.monumentId;

    if (checkbox.checked) {
        selectedMonumentIds.add(id);
    } else {
        selectedMonumentIds.delete(id);
    }

    renderSelectedMonuments();
});

selectedMonuments.addEventListener('click', event => {
    const button = event.target.closest('[data-remove-monument]');

    if (!button) return;

    selectedMonumentIds.delete(button.dataset.removeMonument);

    renderSelectedMonuments();
    renderMonumentSelection();
});
function renderPeriodFilter() {
    const currentValue = timelinePeriodFilter.value;

    const periods = [...new Set(
        timelineEvents
            .map(event => event.period)
            .filter(period => period && period.trim())
    )];

    timelinePeriodFilter.innerHTML = `
        <option value="">Tất cả giai đoạn</option>
        ${periods.map(period => `
            <option value="${escapeHtml(period)}">
                ${escapeHtml(period)}
            </option>
        `).join('')}
    `;

    timelinePeriodFilter.value = periods.includes(currentValue)
        ? currentValue
        : '';
}

function renderTimeline() {
    const keyword = timelineSearch.value.trim().toLowerCase();
    const selectedPeriod = timelinePeriodFilter.value;

    const mainEvents = timelineEvents.filter(event => {
        return !event.parent_event_id;
    });

    const filteredEvents = mainEvents.filter(event => {
        const matchesKeyword = (
            String(event.event_year).includes(keyword) ||
            (event.date_label || '').toLowerCase().includes(keyword) ||
            (event.title || '').toLowerCase().includes(keyword) ||
            (event.summary || '').toLowerCase().includes(keyword) ||
            (event.period || '').toLowerCase().includes(keyword)
        );

        const matchesPeriod = (
            !selectedPeriod || event.period === selectedPeriod
        );

        return matchesKeyword && matchesPeriod;
    });

    if (!filteredEvents.length) {
        timelineList.innerHTML = `
            <div class="timeline-empty">
                ${mainEvents.length
                    ? 'Không tìm thấy sự kiện phù hợp.'
                    : 'Chưa có sự kiện chính nào.'}
            </div>
        `;
        return;
    }

    timelineList.innerHTML = filteredEvents.map(event => {
        const children = timelineEvents.filter(
            child => child.parent_event_id === event.id
        );

        return `
            <article class="timeline-event">
                <div class="timeline-marker"></div>

                <div class="timeline-event-card">
                    ${
                        validImageUrl(event.image_url || '')
                            ? `
                                <img
                                    class="timeline-event-image"
                                    src="${escapeHtml(event.image_url)}"
                                    alt="${escapeHtml(event.title)}"
                                >
                            `
                            : ''
                    }

                    <div class="timeline-event-content">
                        <div class="timeline-event-meta">
                            <span class="timeline-year">
                                ${escapeHtml(
                                    event.date_label ||
                                    formatEventYear(event.event_year)
                                )}
                            </span>
                        </div>

                        <h2>${escapeHtml(event.title)}</h2>

                        <p>${escapeHtml(event.summary || 'Chưa có mô tả.')}</p>

<span class="timeline-child-count">
    ${children.length} sự kiện con
</span>

<a
    class="timeline-detail-link"
    href="./event-detail.html?id=${encodeURIComponent(event.id)}"
>
    Khám phá sự kiện →
</a>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

function renderAdminEvents() {
    if (!isAdmin) return;

    const mainEvents = timelineEvents.filter(
        event => !event.parent_event_id
    );

    if (!mainEvents.length) {
        mainEventsAdminList.innerHTML = `
            <div class="admin-empty-message">
                Chưa có sự kiện chính nào. Hãy tạo sự kiện đầu tiên!
            </div>
        `;
        return;
    }

    mainEventsAdminList.innerHTML = mainEvents.map(main => {
        const children = timelineEvents.filter(
            event => event.parent_event_id === main.id
        );

        return `
            <article class="admin-main-event">
                <div class="admin-main-event-header">
                    <div class="admin-event-information">
                        <span class="admin-event-label">SỰ KIỆN CHÍNH</span>

                        <h3 class="admin-event-title">
                            ${escapeHtml(main.title)}
                        </h3>

                        <p class="admin-event-meta">
                            ${escapeHtml(
                                main.date_label ||
                                formatEventYear(main.event_year)
                            )}
                            · ${children.length} sự kiện con
                        </p>
                    </div>

                    <div class="admin-event-actions">
                        <button
                            type="button"
                            data-add-child="${main.id}"
                            class="add-child-event-button"
                        >
                            + Thêm sự kiện con
                        </button>

                        <button
                            type="button"
                            data-edit-event="${main.id}"
                        >
                            Chỉnh sửa
                        </button>

                        <button
                            type="button"
                            data-delete-event="${main.id}"
                            class="delete-event-button"
                        >
                            Xóa
                        </button>
                    </div>
                </div>

                <div class="admin-child-events">
                    <div class="admin-child-events-heading">
                        <h4>SỰ KIỆN CON</h4>
                    </div>

                    ${
                        children.length
                            ? children.map(child => `
                                <div class="admin-child-event">
                                    <div class="admin-child-event-information">
                                        <h5 class="admin-child-event-title">
                                            ${escapeHtml(child.title)}
                                        </h5>

                                        <p class="admin-child-event-meta">
                                            ${escapeHtml(
                                                child.date_label ||
                                                formatEventYear(child.event_year)
                                            )}
                                        </p>
                                    </div>

                                    <div class="admin-child-event-actions">
                                        <button
                                            type="button"
                                            data-edit-event="${child.id}"
                                        >
                                            Sửa
                                        </button>

                                        <button
                                            type="button"
                                            data-delete-event="${child.id}"
                                            class="delete-event-button"
                                        >
                                            Xóa
                                        </button>
                                    </div>
                                </div>
                            `).join('')
                            : `
                                <div class="admin-empty-message">
                                    Sự kiện này chưa có sự kiện con.
                                </div>
                            `
                    }
                </div>
            </article>
        `;
    }).join('');
}

function renderParentOptions(selectedId = '') {
    const mainEvents = timelineEvents.filter(
        event => !event.parent_event_id
    );

    parentEvent.innerHTML = `
        <option value="">Chọn sự kiện chính</option>

        ${mainEvents.map(event => `
            <option value="${event.id}">
                ${escapeHtml(event.title)}
            </option>
        `).join('')}
    `;

    parentEvent.value = selectedId;
}

function updateEventType() {
    const isChild = eventType.value === 'child';

    parentEventGroup.hidden = !isChild;
    parentEvent.required = isChild;

    if (!isChild) {
        parentEvent.value = '';
    }
}

function openEventEditor(type = 'main', selectedParentId = '') {
eventEditorForm.reset();

selectedMonumentIds.clear();
monumentSearch.value = '';
renderSelectedMonuments();
renderMonumentSelection();

eventId.value = '';
    eventType.value = type;
    eventSortOrder.value = '0';

    renderParentOptions(selectedParentId);
    updateEventType();

    eventEditorHeading.textContent = type === 'main'
        ? 'Thêm sự kiện chính'
        : 'Thêm sự kiện con';

    eventEditor.hidden = false;

    eventEditor.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

function closeEventEditor() {
    eventEditor.hidden = true;
    eventEditorForm.reset();
}

async function editEvent(id) {
    const event = timelineEvents.find(item => item.id === id);

    if (!event) return;

    const type = event.parent_event_id ? 'child' : 'main';

    eventEditorForm.reset();

    eventId.value = event.id;
    eventType.value = type;
    eventTitle.value = event.title || '';
    eventYear.value = event.event_year;
    eventDateLabel.value = event.date_label || '';
    eventSummary.value = event.summary || '';
    eventContent.value = event.content || '';
    eventImageUrl.value = event.image_url || '';
    eventSortOrder.value = event.sort_order ?? 0;
monumentSearch.value = '';
await loadEventMonuments(event.id);

    renderParentOptions(event.parent_event_id || '');
    updateEventType();

    eventEditorHeading.textContent = type === 'main'
        ? 'Chỉnh sửa sự kiện chính'
        : 'Chỉnh sửa sự kiện con';

    eventEditor.hidden = false;

    eventEditor.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}
async function saveEventMonuments(savedEventId) {
    const { error: deleteError } = await supabase
        .from('edu_timeline_monuments')
        .delete()
        .eq('event_id', savedEventId);

    if (deleteError) {
        throw deleteError;
    }

    if (selectedMonumentIds.size === 0) return;

    const monumentData = Array.from(selectedMonumentIds).map(monumentId => ({
        event_id: savedEventId,
        monument_id: monumentId,
        created_by: currentUser.id
    }));

    const { error: insertError } = await supabase
        .from('edu_timeline_monuments')
        .insert(monumentData);

    if (insertError) {
        throw insertError;
    }
}
async function saveEvent(event) {
    event.preventDefault();

    if (!isAdmin) return;

    const title = eventTitle.value.trim();
    const year = Number(eventYear.value);
    const imageUrl = eventImageUrl.value.trim();

    if (!title || !Number.isInteger(year)) {
        alert('Vui lòng nhập tên sự kiện và năm hợp lệ.');
        return;
    }

    if (imageUrl && !validImageUrl(imageUrl)) {
        alert('Đường dẫn hình ảnh phải bắt đầu bằng https://');
        return;
    }

    const isChild = eventType.value === 'child';
    const parentId = isChild ? parentEvent.value : null;

    if (isChild && !parentId) {
        alert('Vui lòng chọn sự kiện chính.');
        return;
    }

    const eventData = {
        title,
        event_year: year,
        date_label: eventDateLabel.value.trim(),
        summary: eventSummary.value.trim(),
        content: eventContent.value.trim(),
        image_url: imageUrl || null,
        sort_order: Number(eventSortOrder.value) || 0,
        parent_event_id: parentId
    };

const id = eventId.value;
let savedEventId = id;

if (id) {
    const existingEvent = timelineEvents.find(
        item => item.id === id
    );

    if (
        existingEvent &&
        !existingEvent.parent_event_id &&
        isChild
    ) {
        alert('Không thể chuyển sự kiện chính thành sự kiện con.');
        return;
    }

    if (
        existingEvent &&
        existingEvent.parent_event_id &&
        !isChild
    ) {
        alert('Không thể chuyển sự kiện con thành sự kiện chính.');
        return;
    }

    const { error } = await supabase
        .from('edu_timeline_events')
        .update(eventData)
        .eq('id', id);

    if (error) {
        alert('Không thể cập nhật sự kiện: ' + error.message);
        return;
    }
} else {
    eventData.created_by = currentUser.id;

    const { data, error } = await supabase
        .from('edu_timeline_events')
        .insert(eventData)
        .select('id')
        .single();

    if (error) {
        alert('Không thể thêm sự kiện: ' + error.message);
        return;
    }

    savedEventId = data.id;
}

try {
    await saveEventMonuments(savedEventId);
} catch (error) {
    alert(
        'Đã lưu sự kiện nhưng không thể lưu di tích liên quan: ' +
        error.message
    );
    return;
}
    await loadTimelineEvents();

    alert(id ? 'Đã cập nhật sự kiện!' : 'Đã thêm sự kiện!');
}

async function deleteEvent(id) {
    if (!isAdmin) return;

    const event = timelineEvents.find(item => item.id === id);

    if (!event) return;

    const isMain = !event.parent_event_id;

    const message = isMain
        ? 'Xóa sự kiện chính này sẽ đồng thời xóa tất cả sự kiện con. Bạn có chắc chắn?'
        : 'Bạn có chắc chắn muốn xóa sự kiện con này?';

    if (!confirm(message)) return;

    const { error } = await supabase
        .from('edu_timeline_events')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Không thể xóa sự kiện: ' + error.message);
        return;
    }

    await loadTimelineEvents();

    alert('Đã xóa sự kiện!');
}

timelineSearch.addEventListener('input', renderTimeline);
timelinePeriodFilter.addEventListener('change', renderTimeline);

eventType.addEventListener('change', updateEventType);

addMainEventButton.addEventListener('click', () => {
    if (!isAdmin) return;

    openEventEditor('main');
});

addTimelineEventButton.addEventListener('click', () => {
    if (!isAdmin) return;

    openEventEditor('main');
});

cancelEventEditor.addEventListener('click', closeEventEditor);

eventEditorForm.addEventListener('submit', saveEvent);

mainEventsAdminList.addEventListener('click', event => {
    const addChildButton = event.target.closest('[data-add-child]');
    const editButton = event.target.closest('[data-edit-event]');
    const deleteButton = event.target.closest('[data-delete-event]');

    if (addChildButton) {
        openEventEditor('child', addChildButton.dataset.addChild);
        return;
    }

    if (editButton) {
        editEvent(editButton.dataset.editEvent);
        return;
    }

    if (deleteButton) {
        deleteEvent(deleteButton.dataset.deleteEvent);
    }
});

async function init() {
    const allowed = await checkAccess();

    if (!allowed) return;

    await loadTimelineEvents();
    await loadMonuments();
    renderSelectedMonuments();
}

init();
