
import { supabase } from './supabase.js';
import { signOut } from './account.js';

const welcomeName = document.querySelector('#welcomeName');
const profileInfo = document.querySelector('#profileInfo');
const searchHistory = document.querySelector('#searchHistory');
const suggestions = document.querySelector('#suggestions');
const recentlyViewed = document.querySelector('#recentlyViewed');
const logoutButton = document.querySelector('#logoutButton');

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function formatDate(value) {
  if (!value) return 'Chưa có thông tin';

  return new Date(value).toLocaleString('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
}

function showMessage(element, message) {
  element.textContent = message;
}

async function loadProfile() {
  if (!supabase) {
    showMessage(profileInfo, 'Supabase chưa được cấu hình.');
    return;
  }

  const { data: userData, error: userError } =
    await supabase.auth.getUser();

  if (userError || !userData.user) {
    location.href = './auth.html';
    return;
  }

  const user = userData.user;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('username, display_name, role, created_at')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Không tải được hồ sơ:', profileError);
    showMessage(profileInfo, 'Không thể tải thông tin tài khoản.');
    return;
  }

  const username = profile.username || profile.display_name || user.email || 'bạn';
  welcomeName.textContent = `Xin chào, ${username}!`;

  profileInfo.innerHTML = `
    <div class="profile-row">
      <span>Tên tài khoản</span>
      <strong>${escapeHtml(profile.username || 'Chưa cập nhật')}</strong>
    </div>
    <div class="profile-row">
      <span>Email</span>
      <strong>${escapeHtml(user.email || 'Không có email')}</strong>
    </div>
    <div class="profile-row">
      <span>Ngày tham gia</span>
      <strong>${escapeHtml(formatDate(profile.created_at || user.created_at))}</strong>
    </div>
  `;

  await loadSearchHistory(user.id);
  await loadRecentlyViewed(user.id);
  await loadSuggestions(user.id);
  renderAccountSettings(user);
}

async function loadSearchHistory(userId) {
  showMessage(searchHistory, 'Đang tải lịch sử tìm kiếm...');

  const { data, error } = await supabase
    .from('search_history')
    .select('id, keyword, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Không tải được lịch sử tìm kiếm:', error);
    showMessage(searchHistory, 'Không thể tải lịch sử tìm kiếm.');
    return;
  }

  if (!data || data.length === 0) {
    showMessage(searchHistory, 'Bạn chưa có lịch sử tìm kiếm.');
    return;
  }

  searchHistory.innerHTML = data.map(item => `
    <div class="history-item">
      <div>
        <strong>${escapeHtml(item.keyword)}</strong>
        <small>${escapeHtml(formatDate(item.created_at))}</small>
      </div>
      <button type="button" class="search-again" data-keyword="${escapeHtml(item.keyword)}">
        Tìm lại
      </button>
    </div>
  `).join('');

  searchHistory.querySelectorAll('.search-again').forEach(button => {
    button.addEventListener('click', () => {
      const keyword = button.dataset.keyword || '';
      location.href = `./?search=${encodeURIComponent(keyword)}`;
    });
  });
}

async function loadRecentlyViewed(userId) {
  showMessage(recentlyViewed, 'Đang tải danh sách di tích...');

  const { data, error } = await supabase
    .from('recently_viewed')
    .select(`
      monument_id,
      viewed_at,
      monuments (
        name,
        address
      )
    `)
    .eq('user_id', userId)
    .order('viewed_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Không tải được lịch sử xem:', error);
    showMessage(recentlyViewed, 'Không thể tải danh sách di tích.');
    return;
  }

  if (!data || data.length === 0) {
    showMessage(recentlyViewed, 'Bạn chưa xem di tích nào.');
    return;
  }

  recentlyViewed.innerHTML = data.map(item => `
    <a class="history-item" href="./detail.html?id=${encodeURIComponent(item.monument_id)}">
      <div>
        <strong>${escapeHtml(item.monuments?.name || 'Di tích không còn tồn tại')}</strong>
        <small>${escapeHtml(item.monuments?.address || 'Chưa cập nhật địa chỉ')}</small>
        <small>Đã xem: ${escapeHtml(formatDate(item.viewed_at))}</small>
      </div>
      <span>↗</span>
    </a>
  `).join('');
}

async function loadSuggestions(userId) {
  showMessage(suggestions, 'Đang tìm những di tích phù hợp...');

  const { data: history, error: historyError } = await supabase
    .from('recently_viewed')
    .select('monument_id')
    .eq('user_id', userId);

  if (historyError) {
    console.error('Không tải được dữ liệu xem:', historyError);
    showMessage(suggestions, 'Không thể tải gợi ý di tích.');
    return;
  }

  if (!history || history.length === 0) {
    showMessage(suggestions, 'Hãy khám phá một vài di tích để nhận gợi ý nhé!');
    return;
  }

  const viewedIds = history.map(item => item.monument_id);

  const { data: viewedMonuments, error: viewedError } = await supabase
    .from('monuments')
    .select('id, monument_tags(tags(name))')
    .in('id', viewedIds);

  if (viewedError) {
    console.error('Không tải được tags của di tích đã xem:', viewedError);
    showMessage(suggestions, 'Không thể phân tích sở thích của bạn.');
    return;
  }

  const tagCounts = {};

  viewedMonuments.forEach(item => {
    (item.monument_tags || []).forEach(link => {
      const tag = link.tags?.name;
      if (tag) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    });
  });

  if (Object.keys(tagCounts).length === 0) {
    showMessage(suggestions, 'Chưa đủ dữ liệu để đưa ra gợi ý. Hãy khám phá thêm di tích nhé!');
    return;
  }

  const { data: monuments, error: monumentsError } = await supabase
    .from('monuments')
    .select('id, name, address, monument_tags(tags(name))')
    .eq('status', 'published');

  if (monumentsError) {
    console.error('Không tải được danh sách di tích:', monumentsError);
    showMessage(suggestions, 'Không thể tải gợi ý di tích.');
    return;
  }

  const recommendations = monuments
    .filter(item => !viewedIds.includes(item.id))
    .map(item => {
      let score = 0;
      const matchedTags = [];

      (item.monument_tags || []).forEach(link => {
        const tag = link.tags?.name;

        if (tag && tagCounts[tag]) {
          score += tagCounts[tag];
          matchedTags.push(tag);
        }
      });

      return { ...item, score, matchedTags };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (recommendations.length === 0) {
    showMessage(suggestions, 'Chưa tìm thấy di tích có chủ đề phù hợp.');
    return;
  }

  suggestions.innerHTML = recommendations.map(item => `
    <a class="history-item" href="./detail.html?id=${encodeURIComponent(item.id)}">
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <small>${escapeHtml(item.address || 'Chưa cập nhật địa chỉ')}</small>
        <small>Chủ đề: ${escapeHtml(item.matchedTags.join(', '))}</small>
      </div>
      <span>↗</span>
    </a>
  `).join('');
}

function renderAccountSettings(user) {
  const accountSettings = document.querySelector('#accountSettings');

  accountSettings.innerHTML = `
    <form id="passwordForm" class="password-form">
      <h3>Đổi mật khẩu</h3>

      <label for="currentPassword">Mật khẩu hiện tại</label>
      <input
        type="password"
        id="currentPassword"
        required
        autocomplete="current-password"
        placeholder="Nhập mật khẩu hiện tại"
      >

      <label for="newPassword">Mật khẩu mới</label>
      <input
        type="password"
        id="newPassword"
        required
        minlength="8"
        autocomplete="new-password"
        placeholder="Ít nhất 8 ký tự"
      >

      <label for="confirmPassword">Xác nhận mật khẩu mới</label>
      <input
        type="password"
        id="confirmPassword"
        required
        minlength="8"
        autocomplete="new-password"
        placeholder="Nhập lại mật khẩu mới"
      >

      <button type="submit" id="changePasswordButton">
        Cập nhật mật khẩu
      </button>

      <p id="passwordMessage"></p>
    </form>
  `;

  const passwordForm = document.querySelector('#passwordForm');
  const passwordMessage = document.querySelector('#passwordMessage');
  const changePasswordButton = document.querySelector('#changePasswordButton');

  passwordForm.addEventListener('submit', async event => {
    event.preventDefault();

    const currentPassword = document.querySelector('#currentPassword').value;
    const newPassword = document.querySelector('#newPassword').value;
    const confirmPassword = document.querySelector('#confirmPassword').value;

    if (newPassword.length < 8) {
      passwordMessage.textContent = 'Mật khẩu mới cần ít nhất 8 ký tự.';
      return;
    }

    if (newPassword !== confirmPassword) {
      passwordMessage.textContent = 'Mật khẩu xác nhận không khớp.';
      return;
    }

    if (newPassword === currentPassword) {
      passwordMessage.textContent = 'Mật khẩu mới phải khác mật khẩu hiện tại.';
      return;
    }

    changePasswordButton.disabled = true;
    passwordMessage.textContent = 'Đang cập nhật mật khẩu...';

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (loginError) throw loginError;

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      passwordForm.reset();
      passwordMessage.textContent = 'Đổi mật khẩu thành công!';
    } catch (error) {
      console.error('Lỗi đổi mật khẩu:', error);
      passwordMessage.textContent = error.message || 'Không thể đổi mật khẩu.';
    } finally {
      changePasswordButton.disabled = false;
    }
  });
}

logoutButton.addEventListener('click', async () => {
  logoutButton.disabled = true;

  try {
    await signOut();
  } catch (error) {
    console.error('Đăng xuất thất bại:', error);
    logoutButton.disabled = false;
    alert('Không thể đăng xuất. Vui lòng thử lại.');
  }
});

loadProfile().catch(error => {
  console.error('Lỗi tải trang tài khoản:', error);
  showMessage(profileInfo, 'Đã xảy ra lỗi khi tải trang tài khoản.');
});
