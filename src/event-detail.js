
import { supabase } from './supabase.js';

const mainEventDate = document.querySelector('#mainEventDate');
const mainEventTitle = document.querySelector('#mainEventTitle');
const mainEventSummary = document.querySelector('#mainEventSummary');
const mainEventImage = document.querySelector('#mainEventImage');
const mainEventContent = document.querySelector('#mainEventContent');
const mainRelatedMonuments = document.querySelector('#mainRelatedMonuments');

const childEventsTimeline = document.querySelector('#childEventsTimeline');
const childEventDetailSection = document.querySelector('#childEventDetailSection');
const childEventDetailList = document.querySelector('#childEventDetailList');
const eventDetailMessage = document.querySelector('#eventDetailMessage');

let mainEvent = null;
let childEvents = [];
let eventMonuments = new Map();

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

function formatEventYear(year) {
    if (year < 0) {
        return `${Math.abs(year)} TCN`;
    }

    return `${year} SCN`;
}

function showMessage(message) {
    eventDetailMessage.textContent = message;
}

function getEventId() {
    const parameters = new URLSearchParams(window.location.search);
    return parameters.get('id');
}

async function loadMainEvent() {
    const id = getEventId();

    if (!id) {
        showMessage('Không tìm thấy thông tin sự kiện.');
        return false;
    }

    const { data, error } = await supabase
        .from('edu_timeline_events')
        .select('*')
        .eq('id', id)
        .is('parent_event_id', null)
        .single();

    if (error || !data) {
        showMessage('Không thể tải sự kiện: ' + (error?.message || 'Không tìm thấy dữ liệu.'));
        return false;
    }

    mainEvent = data;

    renderMainEvent();

    return true;
}

function renderMainEvent() {
    mainEventDate.textContent = (
        mainEvent.date_label ||
        formatEventYear(mainEvent.event_year)
    );

    mainEventTitle.textContent = mainEvent.title;
    mainEventSummary.textContent = mainEvent.summary || '';

    mainEventContent.textContent = mainEvent.content || 'Nội dung đang được cập nhật.';

    if (validImageUrl(mainEvent.image_url || '')) {
        mainEventImage.src = mainEvent.image_url;
        mainEventImage.alt = mainEvent.title;
        mainEventImage.hidden = false;
    } else {
        mainEventImage.hidden = true;
    }

    document.title = `${mainEvent.title} | Dấu Ấn Việt`;
    const relatedSection = createRelatedMonumentsSection(mainEvent.id);

    mainRelatedMonuments.replaceChildren();

    if (relatedSection) {
        mainRelatedMonuments.appendChild(relatedSection);
    }
}



async function loadRelatedMonuments(eventIds) {
    eventMonuments.clear();

    if (!eventIds.length) return;

    const { data, error } = await supabase
        .from('edu_timeline_monuments')
        .select(`
            event_id,
            monuments (
                id,
                name,
                address,
                image_url
            )
        `)
        .in('event_id', eventIds);

    if (error) throw error;

    (data || []).forEach(item => {
        const monument = item.monuments;

        if (!monument) return;

        if (!eventMonuments.has(item.event_id)) {
            eventMonuments.set(item.event_id, []);
        }

        eventMonuments.get(item.event_id).push(monument);
    });
}


function createRelatedMonumentsSection(eventId) {
    const relatedMonuments = eventMonuments.get(eventId) || [];

    if (!relatedMonuments.length) return null;

    const section = document.createElement('section');
    section.className = 'related-monuments-section';

    const heading = document.createElement('h3');
    heading.textContent = 'Di tích liên quan';

    const list = document.createElement('div');
    list.className = 'related-monuments-list';

    relatedMonuments.forEach(monument => {
        const card = document.createElement('article');
        card.className = 'related-monument-card';

        if (validImageUrl(monument.image_url || '')) {
            const image = document.createElement('img');
            image.src = monument.image_url;
            image.alt = monument.name || 'Di tích';
            image.loading = 'lazy';
            card.appendChild(image);
        }

        const info = document.createElement('div');
        info.className = 'related-monument-info';

        const title = document.createElement('h4');
        title.textContent = monument.name || 'Chưa có tên';

        const address = document.createElement('p');
        address.textContent = monument.address || 'Chưa có địa chỉ';

        const link = document.createElement('a');
        link.href = `./detail.html?id=${encodeURIComponent(monument.id)}`;
        link.textContent = 'Khám phá di tích →';

        info.append(title, address, link);
        card.appendChild(info);
        list.appendChild(card);
    });

    section.append(heading, list);

    return section;
}

async function loadChildEvents() {
    const { data, error } = await supabase
        .from('edu_timeline_events')
        .select(`
            id,
            event_year,
            date_label,
            title,
            summary,
            content,
            image_url,
            sort_order
        `)
        .eq('parent_event_id', mainEvent.id)
        .order('event_year', { ascending: true })
        .order('sort_order', { ascending: true });

    if (error) {
        childEventsTimeline.innerHTML = `
            <p>Không thể tải các sự kiện con: ${escapeHtml(error.message)}</p>
        `;
        return;
    }

    childEvents = data || [];
    renderChildEvents();
}

function renderChildEvents() {
    if (!childEvents.length) {
        childEventsTimeline.innerHTML = `
            <div class="event-detail-message">
                Sự kiện này hiện chưa có các dấu mốc chi tiết.
            </div>
        `;
        return;
    }

    childEventsTimeline.innerHTML = childEvents.map(event => `
        <article class="child-timeline-item">
            <div class="child-timeline-marker"></div>

            <div class="child-timeline-card">
                <span class="child-timeline-year">
                    ${escapeHtml(
                        event.date_label ||
                        formatEventYear(event.event_year)
                    )}
                </span>

                <h3>${escapeHtml(event.title)}</h3>

                <p>${escapeHtml(event.summary || 'Chưa có mô tả.')}</p>

                <button
                    type="button"
                    data-child-event="${event.id}"
                >
                    Khám phá sự kiện →
                </button>
            </div>
        </article>
    `).join('');
}

function renderChildEventDetails() {
    if (!childEvents.length) return;

    childEventDetailList.innerHTML = childEvents.map(event => `
        <article
            class="child-event-detail-card"
            id="child-detail-${event.id}"
        >
            <span class="child-timeline-year">
                ${escapeHtml(event.date_label || formatEventYear(event.event_year))}
            </span>
            <h3>${escapeHtml(event.title)}</h3>
            ${
                validImageUrl(event.image_url || '')
                    ? `
                        <img
                            src="${escapeHtml(event.image_url)}"
                            alt="${escapeHtml(event.title)}"
                            loading="lazy"
                        >
                    `
                    : ''
            }
            <p>${escapeHtml(event.content || event.summary || 'Nội dung đang được cập nhật.')}</p>
        </article>
    `).join('');

    childEvents.forEach(event => {
        const target = document.querySelector(
            `#child-detail-${CSS.escape(event.id)}`
        );

        const relatedSection = createRelatedMonumentsSection(event.id);

        if (target && relatedSection) {
            target.appendChild(relatedSection);
        }
    });
}

childEventsTimeline.addEventListener('click', event => {
    const button = event.target.closest('[data-child-event]');

    if (!button) return;

    const id = button.dataset.childEvent;

    const target = document.querySelector(`#child-detail-${CSS.escape(id)}`);

    if (!target) return;

    childEventDetailSection.hidden = false;

    target.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });
});


async function init() {
    showMessage('Đang tải dữ liệu sự kiện...');

    const loaded = await loadMainEvent();
    if (!loaded) return;

    await loadChildEvents();

    // Hiển thị sự kiện con ngay khi tải xong
    renderChildEventDetails();

    // Tải di tích liên quan ở bước sau
    try {
        await loadRelatedMonuments([
            mainEvent.id,
            ...childEvents.map(event => event.id)
        ]);

        renderMainEvent();

        childEvents.forEach(event => {
            const target = document.querySelector(
                `#child-detail-${CSS.escape(event.id)}`
            );

            if (!target || target.querySelector('.related-monuments-section')) {
                return;
            }

            const relatedSection = createRelatedMonumentsSection(event.id);

            if (relatedSection) {
                target.appendChild(relatedSection);
            }
        });
    } catch (error) {
        console.error('Không thể tải di tích liên quan:', error);
    }

    showMessage('');
}

init();

