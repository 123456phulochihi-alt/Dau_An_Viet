
import '../style.css';
import { supabase, isConfigured } from './supabase.js';
import { applyAppearance } from './appearance.js';

const chatForm = document.querySelector('#aiChatForm');
const messageInput = document.querySelector('#aiMessageInput');
const messagesContainer = document.querySelector('#aiMessages');
const sendButton = document.querySelector('#aiSendButton');
const newChatButton = document.querySelector('#newChatButton');
const promptButtons = document.querySelectorAll('.ai-prompt-suggestion');

const conversation = [];
let isSending = false;

function createMessageElement(role, content) {
  const message = document.createElement('div');
  message.className = `ai-message ${role}`;
  message.textContent = content;
  return message;
}

function showWelcome() {
  messagesContainer.replaceChildren();

  const welcome = document.createElement('div');
  welcome.className = 'ai-welcome';

  const avatar = document.createElement('span');
  avatar.className = 'ai-avatar';
  avatar.textContent = 'AI';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'XIN CHÀO, NHÀ KHÁM PHÁ!';

  const heading = document.createElement('h2');
  heading.textContent = 'Hôm nay bạn muốn tìm hiểu điều gì?';

  const description = document.createElement('p');
  description.textContent = 'Từ một công trình kiến trúc đến một dấu mốc lịch sử, hãy bắt đầu bằng câu hỏi của bạn.';

  welcome.append(avatar, eyebrow, heading, description);
  messagesContainer.append(welcome);
}

function addMessage(role, content) {
  const message = createMessageElement(role, content);
  messagesContainer.append(message);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  return message;
}

function setSending(sending) {
  isSending = sending;
  sendButton.disabled = sending;
  messageInput.disabled = sending;
  sendButton.textContent = sending ? 'Đang gửi' : 'Gửi';
}

function getErrorMessage(error) {
  console.error('Chi tiết lỗi AI:', error);

  const message = error?.message || '';
  const context = error?.context;

  if (context && typeof context.json === 'function') {
    return context.clone().json().then(data => {
      const serverError = data?.error || data?.message;

      if (serverError) return `AI Heritage Assistant: ${serverError}`;

      return `Lỗi máy chủ: ${message || 'Không nhận được phản hồi hợp lệ.'}`;
    }).catch(() => {
      return `Lỗi kết nối: ${message || 'Không nhận được phản hồi từ máy chủ.'}`;
    });
  }

  if (message.includes('Failed to fetch')) {
    return 'Không thể kết nối đến Supabase. Hãy kiểm tra mạng và cấu hình Supabase.';
  }

  return `AI Heritage Assistant gặp lỗi: ${message || 'Không xác định được nguyên nhân.'}`;
}

async function sendMessage(rawMessage) {
  const message = rawMessage.trim();

  if (!message || isSending) return;

  if (!isConfigured) {
    addMessage('assistant', 'Supabase chưa được cấu hình. Vui lòng kiểm tra thiết lập dự án trước khi sử dụng trợ lý AI.');
    return;
  }

  conversation.push({
    role: 'user',
    content: message
  });

  addMessage('user', message);
  messageInput.value = '';
  setSending(true);

  const loadingMessage = addMessage('assistant', 'Đang suy nghĩ...');

  try {
    const { data, error } = await supabase.functions.invoke(
      'ai-heritage-assistant',
      {
        body: {
          messages: conversation
        }
      }
    );

    if (error) {
      const errorMessage = await getErrorMessage(error);
      throw new Error(errorMessage);
    }

    const answer = data?.answer;

    if (typeof answer !== 'string' || !answer.trim()) {
      throw new Error(data?.error || 'Máy chủ chưa trả về câu trả lời hợp lệ.');
    }

    loadingMessage.textContent = answer;

    conversation.push({
      role: 'assistant',
      content: answer
    });

  } catch (error) {
    console.error('Lỗi AI Heritage Assistant:', error);

    loadingMessage.textContent =
      error.message || 'Đã xảy ra lỗi không xác định.';
  } finally {
    setSending(false);
    messageInput.focus();
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

chatForm.addEventListener('submit', event => {
  event.preventDefault();
  sendMessage(messageInput.value);
});

messageInput.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

newChatButton.addEventListener('click', () => {
  if (isSending) return;

  conversation.length = 0;
  showWelcome();
  messageInput.value = '';
  messageInput.focus();
});

promptButtons.forEach(button => {
  button.addEventListener('click', () => {
    if (isSending) return;

    messageInput.value = button.dataset.prompt || '';
    messageInput.focus();
  });
});

showWelcome();
applyAppearance('ai');
