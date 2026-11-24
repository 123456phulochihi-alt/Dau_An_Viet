import '../style.css';
import { supabase, isConfigured } from './supabase.js';
import { applyAppearance } from './appearance.js';

const quizContent = document.querySelector('#quizContent');
const params = new URLSearchParams(location.search);
const requestedMonumentId = params.get('id');

let currentUser = null;
let currentProfile = null;
let quizGames = [];
let monuments = [];

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));
}

async function checkQuizAccess() {
  if (!isConfigured) {
    quizContent.innerHTML = '<p class="empty-state">Hệ thống Quiz chưa được cấu hình.</p>';
    return false;
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    location.replace('/auth.html');
    return false;
  }

  currentUser = user;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, membership_type')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    alert('Không thể xác minh quyền truy cập.');
    location.replace('/account.html');
    return false;
  }

  currentProfile = profile;

  if (profile.role !== 'admin' && profile.membership_type !== 'edu') {
    quizContent.innerHTML = `
      <section class="quiz-access-denied">
        <p class="eyebrow">QUYỀN TRUY CẬP BỊ GIỚI HẠN</p>
        <h1>Nội dung dành riêng cho EDU.</h1>
        <p>Vui lòng sử dụng tài khoản thành viên EDU để tham gia các mini game kiến thức về di tích.</p>
        <a href="./account.html" class="primary-button">Xem tài khoản</a>
      </section>
    `;
    return false;
  }

  return true;
}

async function loadQuizGames() {
  const { data, error } = await supabase
    .from('quiz_games')
    .select('id, code, name, description')
    .order('name');

  if (error) {
    console.error('Lỗi tải mini game:', error);
    quizContent.innerHTML = '<p class="empty-state">Không thể tải danh sách mini game.</p>';
    return false;
  }

  quizGames = data || [];
  return true;
}

async function loadQuizMonuments() {
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('monument_id, game_id')
    .eq('is_active', true);

  if (error) {
    console.error('Lỗi tải danh sách di tích:', error);
    quizContent.innerHTML = '<p class="empty-state">Không thể tải danh sách di tích có Quiz.</p>';
    return false;
  }

  const monumentIds = [...new Set((data || []).map(item => item.monument_id))];

  if (!monumentIds.length) {
    monuments = [];
    return true;
  }

  const { data: monumentData, error: monumentError } = await supabase
    .from('monuments')
    .select('id, name, image_url, address')
    .in('id', monumentIds)
    .order('name');

  if (monumentError) {
    console.error('Lỗi tải thông tin di tích:', monumentError);
    quizContent.innerHTML = '<p class="empty-state">Không thể tải thông tin di tích.</p>';
    return false;
  }

  monuments = (monumentData || []).map(monument => {
    const games = [...new Set(
      (data || [])
        .filter(item => item.monument_id === monument.id)
        .map(item => item.game_id)
    )];

    return {
      ...monument,
      games,
      gameCount: games.length
    };
  });

  return true;
}

function renderMonumentList() {
  document.title = 'Quiz di sản | Dấu Ấn Việt';

  quizContent.innerHTML = `
    <section class="quiz-heading">
      <p class="eyebrow">EDU / KHO KIẾN THỨC</p>
      <h1>Quiz <em>di sản.</em></h1>
      <p>Khám phá kiến thức lịch sử và văn hóa thông qua những thử thách nhỏ về từng di tích.</p>
    </section>

    <section class="quiz-toolbar">
      <label for="quizSearch">Tìm kiếm di tích</label>
      <input id="quizSearch" type="search" placeholder="Nhập tên di tích...">
    </section>

    <section id="quizMonumentList" class="quiz-monument-list"></section>
  `;

  renderMonumentCards();

  document.querySelector('#quizSearch').addEventListener('input', renderMonumentCards);
}

function renderMonumentCards() {
  const list = document.querySelector('#quizMonumentList');
  const searchInput = document.querySelector('#quizSearch');
  const keyword = searchInput.value.trim().toLowerCase();

  const filteredMonuments = monuments.filter(item =>
    item.name.toLowerCase().includes(keyword)
  );

  if (!filteredMonuments.length) {
    list.innerHTML = '<p class="empty-state">Không tìm thấy di tích có Quiz phù hợp.</p>';
    return;
  }

  list.innerHTML = filteredMonuments.map(item => `
    <a class="quiz-monument-card" href="./quiz.html?id=${encodeURIComponent(item.id)}">
      <img src="${esc(item.image_url || '')}" alt="${esc(item.name)}">
      <div class="quiz-monument-info">
        <p class="eyebrow">DI TÍCH</p>
        <h2>${esc(item.name)}</h2>
        <p>${esc(item.address || 'Chưa cập nhật địa chỉ')}</p>
        <span>${item.gameCount} mini game khả dụng →</span>
      </div>
    </a>
  `).join('');
}


async function loadQuizPage() {
  const hasAccess = await checkQuizAccess();

  if (!hasAccess) return;

  const gamesLoaded = await loadQuizGames();

  if (!gamesLoaded) return;

  const monumentsLoaded = await loadQuizMonuments();

  if (!monumentsLoaded) return;

  if (requestedMonumentId) {
    const { data: monument, error } = await supabase
      .from('monuments')
      .select('id, name, image_url, address')
      .eq('id', requestedMonumentId)
      .maybeSingle();

    if (error || !monument) {
      quizContent.innerHTML = `
        <p class="empty-state">Không tìm thấy thông tin di tích.</p>
        <a href="./quiz.html">← Trở về danh sách Quiz</a>
      `;
      return;
    }

    const { data: questionGames, error: questionError } = await supabase
      .from('quiz_questions')
      .select('game_id')
      .eq('monument_id', monument.id)
      .eq('is_active', true);

    if (questionError) {
      console.error('Lỗi tải mini game:', questionError);
      quizContent.innerHTML = '<p class="empty-state">Không thể tải danh sách mini game.</p>';
      return;
    }

    monument.games = [...new Set(
      (questionGames || []).map(item => item.game_id)
    )];

    quizContent.innerHTML = `
      <a class="back-link" href="./quiz.html">← DANH SÁCH QUIZ</a>
      <section class="quiz-heading">
        <p class="eyebrow">THỬ THÁCH KIẾN THỨC</p>
        <h1>${esc(monument.name)}</h1>
        <p>Chọn một mini game để bắt đầu khám phá kiến thức về di tích.</p>
      </section>
      <section id="quizGameList" class="quiz-game-list"></section>
    `;

    renderGameList(monument);
    return;
  }

  renderMonumentList();
}


function renderGameList(monument) {
  const gameList = document.querySelector('#quizGameList');

  const availableGames = quizGames.filter(game =>
    monument.games.includes(game.id)
  );

if (!availableGames.length) {
  gameList.innerHTML = '<p class="empty-state">Các mini game của di tích này đang được cập nhật. Vui lòng quay lại sau nhé!</p>';
  return;
	}

  gameList.innerHTML = availableGames.map(game => `
    <button
      class="quiz-game-card"
      type="button"
      data-game-id="${esc(game.id)}"
    >
      <span class="eyebrow">MINI GAME</span>
      <h2>${esc(game.name)}</h2>
      <p>${esc(game.description || '')}</p>
      <span>Bắt đầu thử thách →</span>
    </button>
  `).join('');

  gameList.querySelectorAll('[data-game-id]').forEach(button => {
    button.addEventListener('click', () => {
      const game = quizGames.find(item => item.id === button.dataset.gameId);
      startQuiz(monument, game);
    });
  });
}

async function startQuiz(monument, game) {
  quizContent.innerHTML = '<p class="loading">Đang chuẩn bị câu hỏi...</p>';

  const { data, error } = await supabase
    .from('quiz_questions')
    .select(`
      id,
      question,
      explanation,
      quiz_options (
        id,
        option_text,
        is_correct
      )
    `)
    .eq('monument_id', monument.id)
    .eq('game_id', game.id)
    .eq('is_active', true);

  if (error) {
    console.error('Lỗi tải câu hỏi:', error);
    quizContent.innerHTML = '<p class="empty-state">Không thể tải câu hỏi.</p>';
    return;
  }

  const questions = data || [];

  if (!questions.length) {
    quizContent.innerHTML = '<p class="empty-state">Mini game chưa có câu hỏi.</p>';
    return;
  }

  questions.sort(() => Math.random() - 0.5);

  renderQuestion(monument, game, questions);
}

function renderQuestion(monument, game, questions) {
  let currentIndex = 0;
  let correctAnswers = 0;
  let answered = false;

  function showQuestion() {
    const question = questions[currentIndex];
    const options = [...(question.quiz_options || [])]
      .sort(() => Math.random() - 0.5);

    answered = false;

    quizContent.innerHTML = `
      <a class="back-link" href="./quiz.html?id=${encodeURIComponent(monument.id)}">← TRỞ VỀ MINI GAME</a>
      <section class="quiz-play-heading">
        <p class="eyebrow">${esc(game.name)}</p>
        <h1>${esc(monument.name)}</h1>
        <p>Câu ${currentIndex + 1} / ${questions.length}</p>
      </section>

      <section class="quiz-question-card">
        <h2>${esc(question.question)}</h2>
        <div class="quiz-answer-list">
          ${options.map(option => `
            <button
              class="quiz-answer-button"
              type="button"
              data-option-id="${esc(option.id)}"
            >
              ${esc(option.option_text)}
            </button>
          `).join('')}
        </div>
        <div id="quizFeedback" class="quiz-feedback"></div>
        <button id="nextQuestionButton" class="primary-button hidden" type="button">
          ${currentIndex === questions.length - 1 ? 'Xem kết quả' : 'Câu tiếp theo'}
        </button>
      </section>
    `;

    quizContent.querySelectorAll('[data-option-id]').forEach(button => {
      button.addEventListener('click', () => {
        if (answered) return;

        answered = true;

        const selectedOption = options.find(item => item.id === button.dataset.optionId);
        const isCorrect = Boolean(selectedOption?.is_correct);

        if (isCorrect) correctAnswers++;

        quizContent.querySelectorAll('[data-option-id]').forEach(optionButton => {
          const option = options.find(item => item.id === optionButton.dataset.optionId);

          optionButton.disabled = true;

          if (option?.is_correct) {
            optionButton.classList.add('correct');
          } else if (optionButton === button) {
            optionButton.classList.add('incorrect');
          }
        });

        const feedback = document.querySelector('#quizFeedback');

        feedback.innerHTML = `
          <p>${isCorrect ? 'Chính xác!' : 'Chưa chính xác!'}</p>
          ${question.explanation ? `<span>${esc(question.explanation)}</span>` : ''}
        `;

        document.querySelector('#nextQuestionButton').classList.remove('hidden');
      });
    });

    document.querySelector('#nextQuestionButton').addEventListener('click', async () => {
      if (currentIndex < questions.length - 1) {
        currentIndex++;
        showQuestion();
      } else {
        await finishQuiz(monument, game, questions.length, correctAnswers);
      }
    });
  }

  showQuestion();
}

async function finishQuiz(monument, game, totalQuestions, correctAnswers) {
  const { error } = await supabase
    .from('quiz_attempts')
    .insert({
      user_id: currentUser.id,
      monument_id: monument.id,
      game_id: game.id,
      total_questions: totalQuestions,
      correct_answers: correctAnswers
    });

  if (error) {
    console.error('Không lưu được kết quả:', error);
  }

  quizContent.innerHTML = `
    <section class="quiz-result-card">
      <p class="eyebrow">HOÀN THÀNH THỬ THÁCH</p>
      <h1>Kết quả <em>của bạn.</em></h1>
      <p class="quiz-score">${correctAnswers} / ${totalQuestions}</p>
      <p>Bạn đã trả lời đúng ${correctAnswers} trên tổng số ${totalQuestions} câu hỏi.</p>
      <a class="primary-button" href="./quiz.html?id=${encodeURIComponent(monument.id)}">Chơi lại hoặc chọn mini game khác</a>
      <a class="back-link" href="./quiz.html">← Danh sách di tích</a>
    </section>
  `;
}

loadQuizPage();
applyAppearance('quiz');
