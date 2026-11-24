
import { supabase } from './supabase.js';

const topicList = document.querySelector('#topicList');
const lessonList = document.querySelector('#lessonList');
const lessonSection = document.querySelector('#lessonSection');
const lessonDetail = document.querySelector('#lessonDetail');
const libraryMessage = document.querySelector('#libraryMessage');
const libraryRoleBadge = document.querySelector('#libraryRoleBadge');
const librarySearch = document.querySelector('#librarySearch');
let searchKeyword = '';

const addTopicButton = document.querySelector('#addTopicButton');
const addLessonButton = document.querySelector('#addLessonButton');
const backToLessons = document.querySelector('#backToLessons');

const selectedTopicTitle = document.querySelector('#selectedTopicTitle');
const selectedTopicDescription = document.querySelector('#selectedTopicDescription');

const detailLessonTitle = document.querySelector('#detailLessonTitle');
const detailTopicTitle = document.querySelector('#detailTopicTitle');
const detailLessonSummary = document.querySelector('#detailLessonSummary');
const detailLessonContent = document.querySelector('#detailLessonContent');
const detailResourceLink = document.querySelector('#detailResourceLink');
const completeLessonButton = document.querySelector('#completeLessonButton');
const lessonProgressMessage = document.querySelector('#lessonProgressMessage');

let completedLessons = new Set();
let currentLesson = null;

const topicEditor = document.querySelector('#topicEditor');
const topicEditorTitle = document.querySelector('#topicEditorTitle');
const topicForm = document.querySelector('#topicForm');
const topicTitleInput = document.querySelector('#topicTitleInput');
const topicDescriptionInput = document.querySelector('#topicDescriptionInput');
const topicCoverInput = document.querySelector('#topicCoverInput');
const topicCoverPreview = document.querySelector('#topicCoverPreview');

const lessonEditor = document.querySelector('#lessonEditor');
const lessonEditorTitle = document.querySelector('#lessonEditorTitle');
const lessonForm = document.querySelector('#lessonForm');
const lessonTopicInput = document.querySelector('#lessonTopicInput');
const lessonTitleInput = document.querySelector('#lessonTitleInput');
const lessonSummaryInput = document.querySelector('#lessonSummaryInput');
const lessonContentEditor = document.querySelector('#lessonContentEditor');
const lessonImageInput = document.querySelector('#lessonImageInput');
const lessonResourceInput = document.querySelector('#lessonResourceInput');
const insertLessonImage = document.querySelector('#insertLessonImage');

let currentUser = null;
let isAdmin = false;
let selectedTopic = null;
let topics = [];
let lessons = [];
let allTopicLessons = [];

let editingTopicId = null;
let editingLessonId = null;
let existingCoverUrl = null;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[character]);
}

function showMessage(message) {
  libraryMessage.textContent = message;
}

function showEmpty(container, message) {
  container.innerHTML = `
    <div class="empty-message">${escapeHtml(message)}</div>
  `;
}

function validImageUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function validResourceUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(value);

    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }

    return url.href;
  } catch {
    return false;
  }
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

libraryRoleBadge.textContent = isAdmin ? 'ADMIN' : 'EDU MEMBER';

document.body.classList.toggle('admin-mode', isAdmin);
document.body.classList.toggle('student-mode', !isAdmin);

if (!isAdmin && profile.membership_type !== 'edu') {
    alert('Bạn cần có quyền truy cập EDU để sử dụng thư viện.');
    window.location.href = './account.html';
    return false;
  }

  addTopicButton.hidden = !isAdmin;
  addLessonButton.hidden = !isAdmin;

  return true;
}

async function uploadImage(file, folder) {
  if (!file) return null;

  if (!file.type.startsWith('image/')) {
    alert('Vui lòng chọn một tệp hình ảnh.');
    return null;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert('Ảnh không được vượt quá 5 MB.');
    return null;
  }

  const extension = file.name.split('.').pop().replace(/[^a-zA-Z0-9]/g, '');
  const filePath = `${folder}/${crypto.randomUUID()}.${extension || 'jpg'}`;

  const { error } = await supabase.storage
    .from('edu-covers')
    .upload(filePath, file);

  if (error) {
    alert('Không thể tải ảnh lên: ' + error.message);
    return null;
  }

  const { data } = supabase.storage
    .from('edu-covers')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

async function loadTopics() {
  showMessage('Đang tải các chuyên đề...');

  const { data, error } = await supabase
    .from('edu_topics')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    showMessage('Không thể tải chuyên đề: ' + error.message);
    return;
  }

  topics = data || [];
const { data: allLessons, error: lessonError } = await supabase
  .from('edu_lessons')
  .select('id, topic_id');

if (lessonError) {
  showMessage('Không thể tải dữ liệu bài học: ' + lessonError.message);
  return;
}

allTopicLessons = allLessons || [];
  renderTopics();

  showMessage(topics.length ? '' : 'Hiện chưa có chuyên đề nào.');
}
function getTopicProgress(topicId) {
  const topicLessons = allTopicLessons.filter(
    lesson => lesson.topic_id === topicId
  );

  const total = topicLessons.length;

  const completed = topicLessons.filter(
    lesson => completedLessons.has(lesson.id)
  ).length;

  return {
    total,
    completed,
    percentage: total ? Math.round(completed / total * 100) : 0
  };
}
function renderTopics() {
  const filteredTopics = topics.filter(topic => {
    const keyword = searchKeyword.toLowerCase();

    return (
      topic.title.toLowerCase().includes(keyword) ||
      (topic.description || '').toLowerCase().includes(keyword)
    );
  });

  if (!filteredTopics.length) {
    showEmpty(
      topicList,
      searchKeyword
        ? 'Không tìm thấy chuyên đề phù hợp.'
        : 'Chưa có chuyên đề nào được đăng tải.'
    );
    return;
  }

  topicList.innerHTML = filteredTopics.map(topic => `
    <div class="topic-card">
      ${
        validImageUrl(topic.cover_url || '')
          ? `<img class="topic-cover" src="${escapeHtml(topic.cover_url)}" alt="${escapeHtml(topic.title)}">`
          : `<div class="topic-cover-placeholder">Chưa có ảnh bìa</div>`
      }

      <div class="topic-info">
        <h3>${escapeHtml(topic.title)}</h3>
        <p>${escapeHtml(topic.description || 'Chưa có mô tả.')}</p>

        ${
          (() => {
            const progress = getTopicProgress(topic.id);

            return `
              <div class="topic-progress">
                <div class="topic-progress-info">
                  <span>Tiến độ học tập</span>
                  <span>${progress.completed}/${progress.total} bài học</span>
                </div>

                <div class="topic-progress-bar">
                  <div
                    class="topic-progress-fill"
                    style="width: ${progress.percentage}%"
                  ></div>
                </div>

                <small>Hoàn thành ${progress.percentage}%</small>
              </div>
            `;
          })()
        }

        <div class="topic-actions">
          <button data-action="open-topic" data-id="${escapeHtml(topic.id)}">
            Xem bài học
          </button>

          ${
            isAdmin
              ? `
                <button data-action="edit-topic" data-id="${escapeHtml(topic.id)}">Sửa</button>
                <button data-action="delete-topic" data-id="${escapeHtml(topic.id)}">Xóa</button>
              `
              : ''
          }
        </div>
      </div>
    </div>
  `).join('');
}

async function loadLessons(topicId) {
  const { data, error } = await supabase
    .from('edu_lessons')
    .select('*')
    .eq('topic_id', topicId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    showMessage('Không thể tải bài học: ' + error.message);
    return;
  }

  lessons = data || [];

  renderLessons();
  renderTopics();
}


function renderLessons() {
  const filteredLessons = lessons.filter(lesson => {
    const keyword = searchKeyword.toLowerCase();

    return (
      lesson.title.toLowerCase().includes(keyword) ||
      (lesson.summary || '').toLowerCase().includes(keyword)
    );
  });

  if (!filteredLessons.length) {
    showEmpty(
      lessonList,
      searchKeyword
        ? 'Không tìm thấy bài học phù hợp.'
        : 'Chuyên đề này chưa có bài học.'
    );
    return;
  }

  lessonList.innerHTML = filteredLessons.map((lesson, index) => `
    <div class="lesson-card">
      <div>
        <h3>
  ${index + 1}. ${escapeHtml(lesson.title)}
  ${
    completedLessons.has(lesson.id)
      ? '<span class="lesson-completed-badge">Đã hoàn thành</span>'
      : ''
  }
</h3>
        <p>${escapeHtml(lesson.summary || 'Chưa có tóm tắt.')}</p>
      </div>

      <div class="lesson-actions">
        <button data-action="open-lesson" data-id="${escapeHtml(lesson.id)}">
          Đọc bài
        </button>

        ${
          isAdmin
            ? `
              <button data-action="edit-lesson" data-id="${escapeHtml(lesson.id)}">Sửa</button>
              <button data-action="delete-lesson" data-id="${escapeHtml(lesson.id)}">Xóa</button>
            `
            : ''
        }
      </div>
    </div>
  `).join('');
}

async function openTopic(topicId) {
  selectedTopic = topics.find(topic => topic.id === topicId);

  if (!selectedTopic) return;

  selectedTopicTitle.textContent = selectedTopic.title;
  selectedTopicDescription.textContent = selectedTopic.description || '';

  lessonDetail.hidden = true;
  lessonSection.hidden = false;
  addLessonButton.hidden = !isAdmin;

  await loadLessons(topicId);

  lessonSection.scrollIntoView({ behavior: 'smooth' });
}

function sanitizeContent(content = '') {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(String(content), 'text/html');

  const allowedTags = [
    'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U',
    'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE',
    'A', 'IMG'
  ];

  function cleanNode(node) {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) return;

      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.remove();
        return;
      }

      if (!allowedTags.includes(child.tagName)) {
        cleanNode(child);
        child.replaceWith(...child.childNodes);
        return;
      }

      [...child.attributes].forEach(attribute => {
        child.removeAttribute(attribute.name);
      });

      if (child.tagName === 'A') {
        const originalUrl = nodeUrl(child);

        if (originalUrl) {
          child.setAttribute('href', originalUrl);
          child.setAttribute('target', '_blank');
          child.setAttribute('rel', 'noopener noreferrer');
        } else {
          child.replaceWith(...child.childNodes);
          return;
        }
      }

      if (child.tagName === 'IMG') {
        const originalUrl = nodeUrl(child);

        if (!originalUrl || !validImageUrl(originalUrl)) {
          child.remove();
          return;
        }

        child.setAttribute('src', originalUrl);
        child.setAttribute('alt', 'Hình ảnh bài học');
      }

      cleanNode(child);
    });
  }

  function nodeUrl(element) {
    return element.getAttribute('href') || element.getAttribute('src') || '';
  }

  cleanNode(parsed.body);

  return parsed.body.innerHTML;
}

function formatContent(content = '') {
  const value = String(content);

  if (/<[a-z][\s\S]*>/i.test(value)) {
    return sanitizeContent(value);
  }

  return value
    .split(/\n+/)
    .filter(line => line.trim())
    .map(line => `<p>${escapeHtml(line)}</p>`)
    .join('');
}

async function loadLessonProgress() {
  const { data, error } = await supabase
    .from('lesson_progress')
    .select('lesson_id')
    .eq('user_id', currentUser.id);

  if (error) {
    console.error('Không thể tải tiến độ:', error.message);
    return;
  }

  completedLessons = new Set(
    (data || []).map(item => item.lesson_id)
  );
}
async function toggleLessonProgress() {
  if (!currentLesson) return;

  completeLessonButton.disabled = true;

  const completed = completedLessons.has(currentLesson.id);
  let result;

  if (completed) {
    result = await supabase
      .from('lesson_progress')
      .delete()
      .eq('user_id', currentUser.id)
      .eq('lesson_id', currentLesson.id);
  } else {
    result = await supabase
      .from('lesson_progress')
      .insert({
        user_id: currentUser.id,
        lesson_id: currentLesson.id
      });
  }

  if (result.error) {
    alert('Không thể cập nhật tiến độ: ' + result.error.message);
  } else {
    if (completed) {
      completedLessons.delete(currentLesson.id);
    } else {
      completedLessons.add(currentLesson.id);
    }

    renderLessonProgress();
    renderLessons();
    renderTopics();
  }

  completeLessonButton.disabled = false;
}
function renderLessonProgress() {
  if (!currentLesson) return;

  const completed = completedLessons.has(currentLesson.id);

  completeLessonButton.textContent = completed
    ? '✓ Đã hoàn thành bài học'
    : '✓ Đánh dấu đã hoàn thành';

  completeLessonButton.classList.toggle('completed', completed);

  lessonProgressMessage.textContent = completed
    ? 'Bạn đã hoàn thành bài học này.'
    : 'Hãy đánh dấu sau khi bạn hoàn thành bài học.';
}
function openLesson(lessonId) {
  const lesson = lessons.find(item => item.id === lessonId);

  if (!lesson) return;
currentLesson = lesson;
renderLessonProgress();
detailTopicTitle.textContent = selectedTopic?.title || 'Chuyên đề';

  detailLessonTitle.textContent = lesson.title;
  detailLessonSummary.textContent = lesson.summary || '';
  detailLessonContent.innerHTML = formatContent(
    lesson.content || 'Bài học chưa có nội dung.'
  );

  const resourceUrl = validResourceUrl(lesson.resource_url || '');

  if (resourceUrl) {
    detailResourceLink.href = resourceUrl;
    detailResourceLink.hidden = false;
  } else {
    detailResourceLink.hidden = true;
    detailResourceLink.removeAttribute('href');
  }

  lessonDetail.hidden = false;
  lessonDetail.scrollIntoView({ behavior: 'smooth' });
}

/* TOPIC EDITOR */

function openTopicEditor(topic = null) {
  if (!isAdmin) return;

  editingTopicId = topic?.id || null;
  existingCoverUrl = topic?.cover_url || null;

  topicEditorTitle.textContent = topic ? 'Chỉnh sửa chuyên đề' : 'Thêm chuyên đề';

  topicTitleInput.value = topic?.title || '';
  topicDescriptionInput.value = topic?.description || '';
  topicCoverInput.value = '';

  topicCoverPreview.innerHTML = validImageUrl(existingCoverUrl || '')
    ? `<img src="${escapeHtml(existingCoverUrl)}" alt="Ảnh bìa hiện tại">`
    : '';

  topicEditor.hidden = false;
}

function closeTopicEditor() {
  topicEditor.hidden = true;
  topicForm.reset();
  topicCoverPreview.innerHTML = '';
  editingTopicId = null;
  existingCoverUrl = null;
}

topicCoverInput.addEventListener('change', () => {
  const file = topicCoverInput.files[0];

  if (!file) return;

  if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
    alert('Vui lòng chọn ảnh hợp lệ, dung lượng không quá 5 MB.');
    topicCoverInput.value = '';
    return;
  }

  const previewUrl = URL.createObjectURL(file);

  topicCoverPreview.innerHTML = `
    <img src="${previewUrl}" alt="Ảnh bìa xem trước">
  `;
});

topicForm.addEventListener('submit', async event => {
  event.preventDefault();

  if (!isAdmin) return;

  const title = topicTitleInput.value.trim();
  const description = topicDescriptionInput.value.trim();
  const file = topicCoverInput.files[0];

  if (!title) {
    alert('Vui lòng nhập tên chuyên đề.');
    return;
  }

  let coverUrl = existingCoverUrl;

  if (file) {
    coverUrl = await uploadImage(file, 'topics');

    if (!coverUrl) return;
  }

  const values = {
    title,
    description,
    cover_url: coverUrl
  };

  let result;

  if (editingTopicId) {
    result = await supabase
      .from('edu_topics')
      .update(values)
      .eq('id', editingTopicId);
  } else {
    result = await supabase
      .from('edu_topics')
      .insert({
        ...values,
        created_by: currentUser.id
      });
  }

  if (result.error) {
    alert('Không thể lưu chuyên đề: ' + result.error.message);
    return;
  }

  closeTopicEditor();
  await loadTopics();

  if (selectedTopic && editingTopicId) {
    const updatedTopic = topics.find(item => item.id === selectedTopic.id);

    if (updatedTopic) {
      selectedTopic = updatedTopic;
      selectedTopicTitle.textContent = updatedTopic.title;
      selectedTopicDescription.textContent = updatedTopic.description || '';
    }
  }

  alert('Đã lưu chuyên đề!');
});

async function deleteTopic(topicId) {
  const topic = topics.find(item => item.id === topicId);

  if (!topic || !isAdmin) return;

  if (!confirm(
    `Bạn có chắc muốn xóa chuyên đề "${topic.title}" không?\nCác bài học thuộc chuyên đề này cũng sẽ bị xóa.`
  )) return;

  const { error } = await supabase
    .from('edu_topics')
    .delete()
    .eq('id', topicId);

  if (error) {
    alert('Không thể xóa chuyên đề: ' + error.message);
    return;
  }

  if (selectedTopic?.id === topicId) {
    selectedTopic = null;
    lessons = [];
    lessonSection.hidden = true;
    lessonDetail.hidden = true;
  }

  await loadTopics();
  alert('Đã xóa chuyên đề!');
}

/* LESSON EDITOR */

function fillTopicOptions(topicId = '') {
  lessonTopicInput.innerHTML = topics.map(topic => `
    <option value="${escapeHtml(topic.id)}">
      ${escapeHtml(topic.title)}
    </option>
  `).join('');

  if (topicId) {
    lessonTopicInput.value = topicId;
  }
}

function openLessonEditor(lesson = null) {
  if (!isAdmin) return;

  editingLessonId = lesson?.id || null;

  lessonEditorTitle.textContent = lesson ? 'Chỉnh sửa bài học' : 'Thêm bài học';

  fillTopicOptions(lesson?.topic_id || selectedTopic?.id || topics[0]?.id || '');

  lessonTitleInput.value = lesson?.title || '';
  lessonSummaryInput.value = lesson?.summary || '';
  lessonContentEditor.innerHTML = formatContent(lesson?.content || '');
  lessonResourceInput.value = lesson?.resource_url || '';
  lessonImageInput.value = '';

  lessonEditor.hidden = false;
}

function closeLessonEditor() {
  lessonEditor.hidden = true;
  lessonForm.reset();
  lessonContentEditor.innerHTML = '';
  editingLessonId = null;
}

lessonForm.addEventListener('submit', async event => {
  event.preventDefault();

  if (!isAdmin) return;

  const topicId = lessonTopicInput.value;
  const title = lessonTitleInput.value.trim();
  const summary = lessonSummaryInput.value.trim();
  const content = sanitizeContent(lessonContentEditor.innerHTML);
  const resourceUrl = validResourceUrl(lessonResourceInput.value.trim());

  if (!topicId || !title) {
    alert('Vui lòng chọn chuyên đề và nhập tên bài học.');
    return;
  }

  if (lessonResourceInput.value.trim() && !resourceUrl) {
    alert('Đường dẫn tài liệu không hợp lệ. Hãy sử dụng đường dẫn HTTP hoặc HTTPS.');
    return;
  }

  if (!content.trim()) {
    alert('Vui lòng nhập nội dung bài học.');
    return;
  }

  const values = {
    topic_id: topicId,
    title,
    summary,
    content,
    resource_url: resourceUrl
  };

  let result;

  if (editingLessonId) {
    result = await supabase
      .from('edu_lessons')
      .update(values)
      .eq('id', editingLessonId);
  } else {
    result = await supabase
      .from('edu_lessons')
      .insert({
        ...values,
        created_by: currentUser.id
      });
  }

  if (result.error) {
    alert('Không thể lưu bài học: ' + result.error.message);
    return;
  }

  closeLessonEditor();

  if (selectedTopic?.id === topicId) {
    await loadLessons(topicId);
  } else if (selectedTopic) {
    await openTopic(selectedTopic.id);
  }

  lessonDetail.hidden = true;
  alert('Đã lưu bài học!');
});

insertLessonImage.addEventListener('click', () => {
  if (isAdmin) lessonImageInput.click();
});

lessonImageInput.addEventListener('change', async () => {
  const file = lessonImageInput.files[0];

  if (!file) return;

  const imageUrl = await uploadImage(file, 'lessons');

  if (!imageUrl) {
    lessonImageInput.value = '';
    return;
  }

  lessonContentEditor.focus();

  document.execCommand(
    'insertHTML',
    false,
    `<p><img src="${escapeHtml(imageUrl)}" alt="Hình ảnh bài học"></p>`
  );

  lessonImageInput.value = '';
});

document.querySelectorAll('.editor-toolbar button[data-command]').forEach(button => {
  button.addEventListener('mousedown', event => {
    event.preventDefault();
  });

  button.addEventListener('click', () => {
    const command = button.dataset.command;
    const value = button.dataset.value || null;

    lessonContentEditor.focus();
    document.execCommand(command, false, value);
  });
});

async function deleteLesson(lessonId) {
  const lesson = lessons.find(item => item.id === lessonId);

  if (!lesson || !isAdmin) return;

  if (!confirm(`Bạn có chắc muốn xóa bài học "${lesson.title}" không?`)) {
    return;
  }

  const { error } = await supabase
    .from('edu_lessons')
    .delete()
    .eq('id', lessonId);

  if (error) {
    alert('Không thể xóa bài học: ' + error.message);
    return;
  }

  lessonDetail.hidden = true;
  await loadLessons(selectedTopic.id);

  alert('Đã xóa bài học!');
}

/* EVENTS */
completeLessonButton.addEventListener('click', toggleLessonProgress);
librarySearch.addEventListener('input', () => {
  searchKeyword = librarySearch.value.trim();

  renderTopics();

  if (selectedTopic) {
    renderLessons();
  }
});
topicList.addEventListener('click', async event => {
  const button = event.target.closest('button[data-action]');

  if (!button) return;

  const topicId = button.dataset.id;
  const action = button.dataset.action;

  if (action === 'open-topic') {
    await openTopic(topicId);
  }

  if (action === 'edit-topic' && isAdmin) {
    const topic = topics.find(item => item.id === topicId);
    if (topic) openTopicEditor(topic);
  }

  if (action === 'delete-topic' && isAdmin) {
    await deleteTopic(topicId);
  }
});

lessonList.addEventListener('click', async event => {
  const button = event.target.closest('button[data-action]');

  if (!button) return;

  const lessonId = button.dataset.id;
  const action = button.dataset.action;

  if (action === 'open-lesson') {
    openLesson(lessonId);
  }

  if (action === 'edit-lesson' && isAdmin) {
    const lesson = lessons.find(item => item.id === lessonId);
    if (lesson) openLessonEditor(lesson);
  }

  if (action === 'delete-lesson' && isAdmin) {
    await deleteLesson(lessonId);
  }
});

addTopicButton.addEventListener('click', () => {
  openTopicEditor();
});

addLessonButton.addEventListener('click', () => {
  openLessonEditor();
});

document.querySelectorAll('[data-close]').forEach(button => {
  button.addEventListener('click', () => {
    const editorId = button.dataset.close;

    if (editorId === 'topicEditor') closeTopicEditor();
    if (editorId === 'lessonEditor') closeLessonEditor();
  });
});

topicEditor.addEventListener('click', event => {
  if (event.target === topicEditor) closeTopicEditor();
});

lessonEditor.addEventListener('click', event => {
  if (event.target === lessonEditor) closeLessonEditor();
});

backToLessons.addEventListener('click', () => {
  lessonDetail.hidden = true;
  lessonSection.scrollIntoView({ behavior: 'smooth' });
});

async function init() {
  const allowed = await checkAccess();

  if (!allowed) return;

  await loadLessonProgress();
  await loadTopics();
}

init();
