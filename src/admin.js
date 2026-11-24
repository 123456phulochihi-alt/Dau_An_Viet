
import '../style.css';
import { supabase, isConfigured } from './supabase.js';
import { applyAppearance } from './appearance.js';

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
const membersPanel = document.querySelector('#membersPanel');
const showMembersButton = document.querySelector('#showMembersButton');
const memberList = document.querySelector('#memberList');
const memberSearch = document.querySelector('#memberSearch');
const memberFilter = document.querySelector('#memberFilter');
const memberMessage = document.querySelector('#memberMessage');
const memberCount = document.querySelector('#memberCount');
const tagsPanel = document.querySelector('#tagsPanel');
const showTagsButton = document.querySelector('#showTagsButton');
const tagForm = document.querySelector('#tagForm');
const tagMessage = document.querySelector('#tagMessage');
const tagsMessage = document.querySelector('#tagsMessage');
const tagsList = document.querySelector('#tagsList');
const tagCount = document.querySelector('#tagCount');
const quizPanel = document.querySelector('#quizPanel');
const showQuizButton = document.querySelector('#showQuizButton');
const quizQuestionForm = document.querySelector('#quizQuestionForm');
const quizMonumentSelect = document.querySelector('#quizMonumentSelect');
const quizGameSelect = document.querySelector('#quizGameSelect');
const quizOptionsContainer = document.querySelector('#quizOptionsContainer');
const quizMessage = document.querySelector('#quizMessage');
const quizListMessage = document.querySelector('#quizListMessage');
const quizQuestionList = document.querySelector('#quizQuestionList');
const cancelQuizButton = document.querySelector('#cancelQuizButton');
const appearancePanel = document.querySelector('#appearancePanel');
const showAppearanceButton = document.querySelector('#showAppearanceButton');
const logoPreview = document.querySelector('#logoPreview');
const logoFile = document.querySelector('#logoFile');
const saveLogoButton = document.querySelector('#saveLogoButton');
const backgroundPage = document.querySelector('#backgroundPage');
const backgroundPreview = document.querySelector('#backgroundPreview');
const backgroundFile = document.querySelector('#backgroundFile');
const saveBackgroundButton = document.querySelector('#saveBackgroundButton');

let monuments = [];
let regions = [];
let members = [];
let tags = [];
let quizGames = [];
let quizQuestions = [];
let currentImageUrl = '';
let isAdmin = false;
function hideAppearance() {
  appearancePanel.classList.add('hidden');
  showAppearanceButton.classList.remove('active');
}
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
hideAppearance();
  listPanel.classList.remove('hidden');
  editorPanel.classList.add('hidden');
  regionsPanel.classList.add('hidden');
  membersPanel.classList.add('hidden');
tagsPanel.classList.add('hidden');
showTagsButton.classList.remove('active');
quizPanel.classList.add('hidden');
showQuizButton.classList.remove('active');

  document.querySelector('#showListButton').classList.add('active');
  document.querySelector('#showEditorButton').classList.remove('active');
  showRegionsButton.classList.remove('active');
  showMembersButton.classList.remove('active');
}

function showEditor() {
hideAppearance();
  listPanel.classList.add('hidden');
  editorPanel.classList.remove('hidden');
quizPanel.classList.add('hidden');
showQuizButton.classList.remove('active');
  regionsPanel.classList.add('hidden');
  membersPanel.classList.add('hidden');
tagsPanel.classList.add('hidden');
showTagsButton.classList.remove('active');

  document.querySelector('#showListButton').classList.remove('active');
  document.querySelector('#showEditorButton').classList.add('active');
  showRegionsButton.classList.remove('active');
  showMembersButton.classList.remove('active');
}

function showRegions() {
hideAppearance();
  listPanel.classList.add('hidden');
  editorPanel.classList.add('hidden');
  regionsPanel.classList.remove('hidden');
quizPanel.classList.add('hidden');
showQuizButton.classList.remove('active');
  membersPanel.classList.add('hidden');
tagsPanel.classList.add('hidden');
showTagsButton.classList.remove('active');

  document.querySelector('#showListButton').classList.remove('active');
  document.querySelector('#showEditorButton').classList.remove('active');
  showRegionsButton.classList.add('active');
  showMembersButton.classList.remove('active');
}

function showMembers() {
hideAppearance();
  listPanel.classList.add('hidden');
  editorPanel.classList.add('hidden');
  regionsPanel.classList.add('hidden');
  membersPanel.classList.remove('hidden');
quizPanel.classList.add('hidden');
showQuizButton.classList.remove('active');
tagsPanel.classList.add('hidden');
showTagsButton.classList.remove('active');

  document.querySelector('#showListButton').classList.remove('active');
  document.querySelector('#showEditorButton').classList.remove('active');
  showRegionsButton.classList.remove('active');
  showMembersButton.classList.add('active');

  loadMembers();
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
async function loadTags() {
  showMessage(tagsMessage, 'Đang tải danh sách Tag...');

  const { data, error } = await supabase
    .from('tags')
    .select('id, name')
    .order('name');

  if (error) {
    showMessage(tagsMessage, `Không tải được danh sách Tag: ${error.message}`, true);
    tagsList.innerHTML = '';
    return;
  }

  tags = data || [];
  tagCount.textContent = String(tags.length);

  showMessage(tagsMessage, '');
  renderTags();
}

function renderTags() {
  if (!tags.length) {
    tagsList.innerHTML = '<p class="muted">Chưa có Tag nào.</p>';
    return;
  }

  tagsList.innerHTML = tags.map(tag => `
    <article class="monument-row">
      <div class="monument-row-info">
        <h3>${escapeHtml(tag.name)}</h3>
      </div>

      <div class="monument-row-actions">
        <button
          class="text-button danger-button"
          type="button"
          data-delete-tag="${escapeHtml(tag.id)}">
          Xóa
        </button>
      </div>
    </article>
  `).join('');
}

async function addTag(event) {
  event.preventDefault();

  if (!isAdmin) {
    showMessage(tagMessage, 'Bạn không có quyền thực hiện thao tác này.', true);
    return;
  }

  const name = String(new FormData(tagForm).get('name') || '').trim();

  if (!name) {
    showMessage(tagMessage, 'Vui lòng nhập tên Tag.', true);
    return;
  }

  const existingTag = tags.find(
    tag => tag.name.toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi')
  );

  if (existingTag) {
    showMessage(tagMessage, 'Tag này đã tồn tại.', true);
    return;
  }

  const submitButton = tagForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  showMessage(tagMessage, 'Đang thêm Tag...');

  const { error } = await supabase
    .from('tags')
    .insert({ name });

  submitButton.disabled = false;

  if (error) {
    showMessage(tagMessage, `Không thêm được Tag: ${error.message}`, true);
    return;
  }

  tagForm.reset();
  showMessage(tagMessage, 'Đã thêm Tag thành công.');
  await loadTags();
}

async function deleteTag(tagId) {
  if (!isAdmin) {
    showMessage(tagsMessage, 'Bạn không có quyền thực hiện thao tác này.', true);
    return;
  }

  const tag = tags.find(item => item.id === tagId);
  if (!tag) return;

  const confirmed = window.confirm(
    `Bạn có chắc muốn xóa Tag "${tag.name}"? Tag này sẽ bị gỡ khỏi tất cả di sản đang sử dụng nó.`
  );

  if (!confirmed) return;

  showMessage(tagsMessage, 'Đang xóa Tag...');

  const { error: unlinkError } = await supabase
    .from('monument_tags')
    .delete()
    .eq('tag_id', tagId);

  if (unlinkError) {
    showMessage(tagsMessage, `Không gỡ được Tag khỏi di sản: ${unlinkError.message}`, true);
    return;
  }

  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', tagId);

  if (error) {
    showMessage(tagsMessage, `Không xóa được Tag: ${error.message}`, true);
    return;
  }

  showMessage(tagsMessage, `Đã xóa Tag "${tag.name}".`);
  await loadTags();
}

function showTags() {
hideAppearance();
  listPanel.classList.add('hidden');
  editorPanel.classList.add('hidden');
  regionsPanel.classList.add('hidden');
  membersPanel.classList.add('hidden');
  tagsPanel.classList.remove('hidden');
quizPanel.classList.add('hidden');
showQuizButton.classList.remove('active');

  document.querySelector('#showListButton').classList.remove('active');
  document.querySelector('#showEditorButton').classList.remove('active');
  showRegionsButton.classList.remove('active');
  showMembersButton.classList.remove('active');
  showTagsButton.classList.add('active');

  loadTags();
}
async function loadQuizData() {
  showMessage(quizListMessage, 'Đang tải dữ liệu Quiz...');

  const { data, error } = await supabase
    .from('quiz_games')
.select('id, code, name, description, created_at')
.order('created_at', { ascending: true });

  if (error) {
    showMessage(quizListMessage, `Không tải được mini game: ${error.message}`, true);
    return;
  }

  quizGames = data || [];

  quizMonumentSelect.innerHTML = '<option value="">Chọn di tích</option>';

  for (const monument of monuments) {
    const option = document.createElement('option');
    option.value = monument.id;
    option.textContent = monument.name;
    quizMonumentSelect.appendChild(option);
  }

  quizGameSelect.innerHTML = '<option value="">Chọn mini game</option>';

  for (const game of quizGames) {
    const option = document.createElement('option');
    option.value = game.id;
    option.textContent = game.name;
    quizGameSelect.appendChild(option);
  }

  quizQuestionList.innerHTML = '<p class="muted">Chọn di tích và mini game để xem câu hỏi.</p>';
  showMessage(quizListMessage, '');
}
function renderQuizOptions() {
  const game = quizGames.find(item => item.id === quizGameSelect.value);

  if (!game) {
    quizOptionsContainer.innerHTML = '<p class="field-hint">Vui lòng chọn mini game trước.</p>';
    return;
  }

  const options = game.code === 'true_false'
    ? ['Đúng', 'Sai']
    : ['', '', '', ''];

  quizOptionsContainer.innerHTML = `
    <p class="field-hint">Các phương án trả lời (chọn một đáp án đúng)</p>

    ${options.map((option, index) => `
      <label class="quiz-option-input">
        <span>Phương án ${index + 1}</span>
        <input
          type="text"
          name="option_text"
          value="${escapeHtml(option)}"
          placeholder="Nhập phương án ${index + 1}"
          ${game.code === 'true_false' ? 'readonly' : ''}
          required
        >
        <input
          type="radio"
          name="correctOption"
          value="${index}"
          ${index === 0 ? 'checked' : ''}
          required
        >
        <span>Đáp án đúng</span>
      </label>
    `).join('')}
  `;
}
async function saveQuizQuestion(event) {
  event.preventDefault();

  if (!isAdmin) {
    showMessage(quizMessage, 'Bạn không có quyền thực hiện thao tác này.', true);
    return;
  }

  const form = new FormData(quizQuestionForm);
  const id = String(form.get('id') || '');
  const monumentId = String(form.get('monument_id') || '');
  const gameId = String(form.get('game_id') || '');
  const question = String(form.get('question') || '').trim();
  const explanation = String(form.get('explanation') || '').trim() || null;
  const isActive = form.get('is_active') !== null;
  const correctOption = form.get('correctOption');

  if (!monumentId || !gameId || !question) {
    showMessage(quizMessage, 'Vui lòng điền đầy đủ thông tin câu hỏi.', true);
    return;
  }

  const selectedGame = quizGames.find(game => game.id === gameId);

  if (!selectedGame) {
    showMessage(quizMessage, 'Mini game không hợp lệ.', true);
    return;
  }

  const optionTexts = form.getAll('option_text').map(text => text.trim());
  const expectedOptions = selectedGame.code === 'true_false' ? 2 : 4;

  if (optionTexts.length !== expectedOptions || optionTexts.some(option => !option)) {
    showMessage(quizMessage, 'Vui lòng nhập đầy đủ các phương án trả lời.', true);
    return;
  }

  if (correctOption === null || !optionTexts[Number(correctOption)]) {
    showMessage(quizMessage, 'Vui lòng chọn đáp án đúng.', true);
    return;
  }

  const submitButton = quizQuestionForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  showMessage(quizMessage, 'Đang lưu câu hỏi...');

  const payload = {
    monument_id: monumentId,
    game_id: gameId,
    question,
    explanation,
    is_active: isActive
  };

  let questionId = id;
  let result;

  if (id) {
    result = await supabase
      .from('quiz_questions')
      .update(payload)
      .eq('id', id);
  } else {
    result = await supabase
      .from('quiz_questions')
      .insert(payload)
      .select('id')
      .single();

    if (!result.error) {
      questionId = result.data.id;
    }
  }

  if (result.error) {
    submitButton.disabled = false;
    showMessage(quizMessage, `Không lưu được câu hỏi: ${result.error.message}`, true);
    return;
  }

let oldOptionIds = [];

if (id) {
  const { data: oldOptions, error } = await supabase
    .from('quiz_options')
    .select('id')
    .eq('question_id', questionId);

  if (error) {
    submitButton.disabled = false;
    showMessage(quizMessage, `Không tải được đáp án cũ: ${error.message}`, true);
    return;
  }

  oldOptionIds = oldOptions.map(option => option.id);
}

const options = optionTexts.map((option, index) => ({
  question_id: questionId,
  option_text: option,
  is_correct: index === Number(correctOption)
}));

const { error: optionError } = await supabase
  .from('quiz_options')
  .insert(options);

if (optionError) {
  submitButton.disabled = false;
  showMessage(quizMessage, `Đã lưu câu hỏi nhưng không lưu được đáp án: ${optionError.message}`, true);
  return;
}

if (oldOptionIds.length) {
  const { error } = await supabase
    .from('quiz_options')
    .delete()
    .in('id', oldOptionIds);

  if (error) {
    submitButton.disabled = false;
    showMessage(quizMessage, `Đã thêm đáp án mới nhưng chưa xóa được đáp án cũ: ${error.message}`, true);
    return;
  }
}

submitButton.disabled = false;

quizQuestionForm.reset();
quizQuestionForm.elements.id.value = '';
quizMonumentSelect.value = monumentId;
quizGameSelect.value = gameId;
renderQuizOptions();

  showMessage(quizMessage, id ? 'Đã cập nhật câu hỏi.' : 'Đã thêm câu hỏi thành công.');
  await loadQuizQuestions();
}
async function loadQuizQuestions() {
  const monumentId = quizMonumentSelect.value;
  const gameId = quizGameSelect.value;

  if (!monumentId || !gameId) {
    quizQuestions = [];
    quizQuestionList.innerHTML = '<p class="muted">Chọn di tích và mini game để xem câu hỏi.</p>';
    return;
  }

  showMessage(quizListMessage, 'Đang tải danh sách câu hỏi...');

  const { data, error } = await supabase
    .from('quiz_questions')
    .select(`
      id,
      monument_id,
      game_id,
      question,
      explanation,
      is_active,
      created_at,
      quiz_options (
        id,
        option_text,
        is_correct
      )
    `)
    .eq('monument_id', monumentId)
    .eq('game_id', gameId)
    .order('created_at', { ascending: true });

  if (error) {
    showMessage(quizListMessage, `Không tải được câu hỏi: ${error.message}`, true);
    return;
  }

  quizQuestions = data || [];
  showMessage(quizListMessage, '');
  renderQuizQuestions();
}
function editQuizQuestion(questionId) {
  const item = quizQuestions.find(question => question.id === questionId);
  if (!item) return;

  quizQuestionForm.reset();

  quizQuestionForm.elements.id.value = item.id;
  quizQuestionForm.elements.monument_id.value = item.monument_id;
  quizQuestionForm.elements.game_id.value = item.game_id;
  quizQuestionForm.elements.question.value = item.question;
  quizQuestionForm.elements.explanation.value = item.explanation || '';
  quizQuestionForm.elements.is_active.checked = item.is_active;

  renderQuizOptions();

  const optionInputs = quizOptionsContainer.querySelectorAll('[name="option_text"]');

  (item.quiz_options || []).forEach((option, index) => {
    if (optionInputs[index]) {
      optionInputs[index].value = option.option_text;
    }

    if (option.is_correct) {
      const correctInput = quizOptionsContainer.querySelector(
        `[name="correctOption"][value="${index}"]`
      );

      if (correctInput) correctInput.checked = true;
    }
  });

  showMessage(quizMessage, 'Đang chỉnh sửa câu hỏi.');
  quizQuestionForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function deleteQuizQuestion(questionId) {
  if (!isAdmin) {
    showMessage(quizListMessage, 'Bạn không có quyền thực hiện thao tác này.', true);
    return;
  }
  const item = quizQuestions.find(question => question.id === questionId);
  if (!item) return;

  const confirmed = window.confirm(
    'Bạn có chắc muốn xóa câu hỏi này? Thao tác này không thể hoàn tác.'
  );

  if (!confirmed) return;

  const { error } = await supabase
    .from('quiz_questions')
    .delete()
    .eq('id', questionId);

  if (error) {
    showMessage(quizListMessage, `Không xóa được câu hỏi: ${error.message}`, true);
    return;
  }

  showMessage(quizListMessage, 'Đã xóa câu hỏi.');
  await loadQuizQuestions();
}

function renderQuizQuestions() {
  if (!quizQuestions.length) {
    quizQuestionList.innerHTML = '<p class="muted">Di tích này chưa có câu hỏi cho mini game đã chọn.</p>';
    return;
  }

  quizQuestionList.innerHTML = quizQuestions.map((item, index) => `
    <article class="monument-row">
      <div class="monument-row-info">
        <h3>Câu ${index + 1}: ${escapeHtml(item.question)}</h3>

        ${(item.quiz_options || []).map(option => `
          <p class="monument-period">
            ${escapeHtml(option.option_text)}
            ${option.is_correct ? ' ✓ Đáp án đúng' : ''}
          </p>
        `).join('')}

        ${item.explanation ? `
          <p class="monument-period">
            Giải thích: ${escapeHtml(item.explanation)}
          </p>
        ` : ''}

        <p class="monument-period">
          Trạng thái: ${item.is_active ? 'Đang hiển thị' : 'Đã ẩn'}
        </p>
      </div>

      <div class="monument-row-actions">
        <button class="text-button" type="button" data-edit-quiz="${escapeHtml(item.id)}">
          Chỉnh sửa
        </button>

        <button class="text-button danger-button" type="button" data-delete-quiz="${escapeHtml(item.id)}">
          Xóa
        </button>
      </div>
    </article>
  `).join('');
}
function showAppearance() {
  if (!isAdmin) return;

  listPanel.classList.add('hidden');
  editorPanel.classList.add('hidden');
  regionsPanel.classList.add('hidden');
  membersPanel.classList.add('hidden');
  tagsPanel.classList.add('hidden');
  quizPanel.classList.add('hidden');
  appearancePanel.classList.remove('hidden');

  document.querySelector('#showListButton').classList.remove('active');
  document.querySelector('#showEditorButton').classList.remove('active');
  showRegionsButton.classList.remove('active');
  showMembersButton.classList.remove('active');
  showTagsButton.classList.remove('active');
  showQuizButton.classList.remove('active');
  showAppearanceButton.classList.add('active');

  loadAppearance();
}
function showQuiz() {
hideAppearance();
  listPanel.classList.add('hidden');
  editorPanel.classList.add('hidden');
  regionsPanel.classList.add('hidden');
  membersPanel.classList.add('hidden');
  tagsPanel.classList.add('hidden');
  quizPanel.classList.remove('hidden');

  document.querySelector('#showListButton').classList.remove('active');
  document.querySelector('#showEditorButton').classList.remove('active');
  showRegionsButton.classList.remove('active');
  showMembersButton.classList.remove('active');
  showTagsButton.classList.remove('active');
  showQuizButton.classList.add('active');

  loadQuizData();
}
async function loadMembers() {
  showMessage(memberMessage, 'Đang tải danh sách thành viên...');

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, role, membership_type, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    showMessage(memberMessage, `Không tải được thành viên: ${error.message}`, true);
    memberList.innerHTML = '';
    return;
  }

  members = data || [];
  memberCount.textContent = String(members.length);

  showMessage(memberMessage, '');
  renderMembers();
}

function renderMembers() {
  const keyword = memberSearch.value.trim().toLocaleLowerCase('vi');
  const selectedType = memberFilter.value;

  const filtered = members.filter(item => {
    const name = String(item.display_name || '').toLocaleLowerCase('vi');
    const username = String(item.username || '').toLocaleLowerCase('vi');
    const type = item.membership_type || 'free';

    const matchesName = !keyword
      || name.includes(keyword)
      || username.includes(keyword);

    const matchesType = !selectedType || type === selectedType;

    return matchesName && matchesType;
  });

  if (!filtered.length) {
    memberList.innerHTML = '<p class="muted">Không tìm thấy tài khoản phù hợp.</p>';
    return;
  }

  memberList.innerHTML = filtered.map(item => {
    const membershipType = item.membership_type || 'free';

    return `
      <article class="monument-row">
        <div class="monument-row-info">
          <h3>${escapeHtml(item.display_name || item.username || 'Chưa có tên')}</h3>
          <p class="monument-location">
            @${escapeHtml(item.username || 'unknown')}
          </p>
          <p class="monument-period">
            Quyền hệ thống: ${escapeHtml(item.role || 'visitor')}
          </p>
          <p class="monument-period">
            Loại thành viên: ${membershipType.toUpperCase()}
          </p>
        </div>

        <div class="monument-row-actions">
          <select data-membership-select="${escapeHtml(item.id)}">
            <option value="free" ${membershipType === 'free' ? 'selected' : ''}>FREE</option>
            <option value="plus" ${membershipType === 'plus' ? 'selected' : ''}>PLUS</option>
            <option value="edu" ${membershipType === 'edu' ? 'selected' : ''}>EDU</option>
          </select>

          <button class="text-button"
            type="button"
            data-save-member="${escapeHtml(item.id)}">
            Lưu
          </button>
        </div>
      </article>
    `;
  }).join('');
}

async function updateMembership(memberId) {
  if (!isAdmin) {
    showMessage(memberMessage, 'Bạn không có quyền thực hiện thao tác này.', true);
    return;
  }

  const select = memberList.querySelector(
    `[data-membership-select="${memberId}"]`
  );

  if (!select) return;

  const membershipType = select.value;

  if (!['free', 'plus', 'edu'].includes(membershipType)) {
    showMessage(memberMessage, 'Loại thành viên không hợp lệ.', true);
    return;
  }

  const { error } = await supabase
    .from('profiles')
    .update({ membership_type: membershipType })
    .eq('id', memberId);

  if (error) {
    showMessage(memberMessage, `Không cập nhật được thành viên: ${error.message}`, true);
    return;
  }

  const member = members.find(item => item.id === memberId);

  if (member) {
    member.membership_type = membershipType;
  }

  showMessage(memberMessage, 'Đã cập nhật loại thành viên thành công.');
  renderMembers();
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
applyAppearance('admin');

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
function renderAppearancePreview(element, url, type) {
  if (!url) {
    element.textContent = type === 'logo'
      ? 'Chưa có logo'
      : 'Chưa có hình nền';
    element.style.backgroundImage = '';
    element.querySelector('img')?.remove();
    return;
  }

  if (type === 'logo') {
    element.innerHTML = `
      <img src="${escapeHtml(url)}" alt="Logo website"
        style="max-width:100%;max-height:150px;object-fit:contain;">
    `;
  } else {
    element.innerHTML = '';
    element.style.backgroundImage = `url("${url}")`;
    element.style.backgroundSize = 'cover';
    element.style.backgroundPosition = 'center';
    element.style.minHeight = '180px';
  }
}

async function loadAppearance() {
  showMessage(
    document.querySelector('#appearanceMessage') || createAppearanceMessage(),
    'Đang tải cấu hình giao diện...'
  );

  const { data, error } = await supabase
    .from('site_appearance')
    .select('key, value');

  if (error) {
    showAppearanceMessage(`Không tải được cấu hình: ${error.message}`, true);
    return;
  }

  const settings = data || [];
  const logo = settings.find(item => item.key === 'logo');

  renderAppearancePreview(logoPreview, logo?.value || '', 'logo');

  await loadBackgroundPreview();
  showAppearanceMessage('Đã tải cấu hình giao diện.');
}

function createAppearanceMessage() {
  const message = document.createElement('p');
  message.id = 'appearanceMessage';
  message.className = 'form-message';
  appearancePanel.appendChild(message);
  return message;
}

function showAppearanceMessage(message, error = false) {
  let element = document.querySelector('#appearanceMessage');

  if (!element) {
    element = createAppearanceMessage();
  }

  showMessage(element, message, error);
}

async function loadBackgroundPreview() {
  const key = `background_${backgroundPage.value}`;

  const { data, error } = await supabase
    .from('site_appearance')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    showAppearanceMessage(`Không tải được hình nền: ${error.message}`, true);
    return;
  }

  renderAppearancePreview(
    backgroundPreview,
    data?.value || '',
    'background'
  );
}

async function saveAppearanceAsset(file, key, type) {
  if (!isAdmin) {
    showAppearanceMessage('Bạn không có quyền thực hiện thao tác này.', true);
    return;
  }

  if (!file) {
    showAppearanceMessage('Vui lòng chọn ảnh trước khi lưu.', true);
    return;
  }

  if (!file.type.startsWith('image/')) {
    showAppearanceMessage('Tệp được chọn không phải hình ảnh.', true);
    return;
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const storagePath = `${key}/${Date.now()}-${safeName}`;

  showAppearanceMessage('Đang tải ảnh lên...');

  const { error: uploadError } = await supabase
    .storage
    .from('site-assets')
    .upload(storagePath, file, { upsert: false });

  if (uploadError) {
    showAppearanceMessage(`Không tải được ảnh: ${uploadError.message}`, true);
    return;
  }

  const { data: urlData } = supabase.storage
    .from('site-assets')
    .getPublicUrl(storagePath);

  const imageUrl = urlData.publicUrl;

  const { error: saveError } = await supabase
    .from('site_appearance')
    .upsert({
      key,
      value: imageUrl
    }, { onConflict: 'key' });

  if (saveError) {
    showAppearanceMessage(`Ảnh đã tải lên nhưng chưa lưu được cấu hình: ${saveError.message}`, true);
    return;
  }

  if (type === 'logo') {
    renderAppearancePreview(logoPreview, imageUrl, 'logo');
    logoFile.value = '';
  } else {
    renderAppearancePreview(backgroundPreview, imageUrl, 'background');
    backgroundFile.value = '';
  }
  await applyAppearance('admin');
  showAppearanceMessage('Đã cập nhật giao diện thành công.');
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
showMembersButton.addEventListener('click', showMembers);
showTagsButton.addEventListener('click', showTags);
showQuizButton.addEventListener('click', showQuiz);
showAppearanceButton.addEventListener('click', showAppearance);

saveLogoButton.addEventListener('click', () => {
  saveAppearanceAsset(logoFile.files?.[0], 'logo', 'logo');
});

saveBackgroundButton.addEventListener('click', () => {
  saveAppearanceAsset(
    backgroundFile.files?.[0],
    `background_${backgroundPage.value}`,
    'background'
  );
});

backgroundPage.addEventListener('change', loadBackgroundPreview);
quizMonumentSelect.addEventListener('change', loadQuizQuestions);

quizGameSelect.addEventListener('change', () => {
  renderQuizOptions();
  loadQuizQuestions();
});

tagForm.addEventListener('submit', addTag);
quizQuestionForm.addEventListener('submit', saveQuizQuestion);
cancelQuizButton.addEventListener('click', () => {
  const monumentId = quizMonumentSelect.value;
  const gameId = quizGameSelect.value;

  quizQuestionForm.reset();
  quizQuestionForm.elements.id.value = '';
  quizMonumentSelect.value = monumentId;
  quizGameSelect.value = gameId;

  renderQuizOptions();
  showMessage(quizMessage, '');
});

tagsList.addEventListener('click', event => {
  const deleteButton = event.target.closest('[data-delete-tag]');

  if (deleteButton) {
    deleteTag(deleteButton.dataset.deleteTag);
  }
});
quizQuestionList.addEventListener('click', event => {
  const editButton = event.target.closest('[data-edit-quiz]');
  const deleteButton = event.target.closest('[data-delete-quiz]');

  if (editButton) {
    editQuizQuestion(editButton.dataset.editQuiz);
  }

  if (deleteButton) {
    deleteQuizQuestion(deleteButton.dataset.deleteQuiz);
  }
});
memberSearch.addEventListener('input', renderMembers);

memberFilter.addEventListener('change', renderMembers);

memberList.addEventListener('click', event => {
  const saveButton = event.target.closest('[data-save-member]');

  if (saveButton) {
    updateMembership(saveButton.dataset.saveMember);
  }
});
checkAdmin();