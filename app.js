// Remove Google Drive related configuration since it's no longer needed
let currentTheme = localStorage.getItem('theme') || 'light';
let timerInterval = null;
let timeLeft = 25 * 60; // 25 minutes in seconds
let timerEndTime = null; // Store the end time for background running
let notes = JSON.parse(localStorage.getItem('notes')) || [];
let totalStudyTime = parseInt(localStorage.getItem('studyTime')) || 0;
let todos = JSON.parse(localStorage.getItem('todos')) || [];
const TASK_COLORS = ['#FF453A', '#FF9F0A', '#32D74B', '#64D2FF', '#0A84FF', '#BF5AF2'];

// Settings management
const settings = {
  theme: localStorage.getItem('theme') || 'system',
  fontSize: localStorage.getItem('fontSize') || 'medium',
  defaultTimerDuration: parseInt(localStorage.getItem('defaultTimerDuration')) || 25,
  timerSound: localStorage.getItem('timerSound') || 'bell',
  soundVolume: parseInt(localStorage.getItem('soundVolume')) || 50,
  desktopNotifications: localStorage.getItem('desktopNotifications') !== 'false',
  soundNotifications: localStorage.getItem('soundNotifications') !== 'false'
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  setupEventListeners();
  initializeApp();
  displayTodos();
  updateTimerDisplay();
  
  // Set initial theme
  document.documentElement.setAttribute('data-theme', currentTheme);
  
  // Initialize color select with default colors
  const colorSelect = document.getElementById('todoColor');
  if (colorSelect && colorSelect.options.length === 0) {
    TASK_COLORS.forEach((color, index) => {
      const option = document.createElement('option');
      option.value = color;
      option.textContent = `Color ${index + 1}`;
      option.style.backgroundColor = color;
      colorSelect.appendChild(option);
    });
  }
  
  const endTime = parseInt(localStorage.getItem('timerEndTime')) || 0;
  if (endTime > Date.now()) {
    timeLeft = Math.ceil((endTime - Date.now()) / 1000);
    startTimer();
  }
  
  // Request necessary permissions
  if ('Notification' in window) {
    Notification.requestPermission();
  }
  
  // Initialize statistics
  updateStatistics();
  
  // Add timer progress bar
  const timerContainer = document.querySelector('.timer-container');
  if (timerContainer) {
    const progressBar = document.createElement('div');
    progressBar.className = 'timer-progress';
    progressBar.innerHTML = '<div class="timer-progress-bar"></div>';
    timerContainer.insertBefore(progressBar, timerContainer.querySelector('.timer-controls'));
  }
  
  // Initialize settings
  initializeSettings();
});

function initializeApp() {
  // Check if it's the first visit
  if (!localStorage.getItem('appInitialized')) {
    // Show welcome screen
    document.getElementById('welcomeScreen').classList.remove('hidden');
  } else {
    // Skip welcome screen for returning users
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
    loadDashboard();
  }
}

function startApp() {
  document.getElementById('welcomeScreen').classList.add('hidden');
  if (!localStorage.getItem('guideSeen')) {
    document.getElementById('userGuide').classList.remove('hidden');
    localStorage.setItem('guideSeen', 'true');
  } else {
    document.getElementById('appContainer').classList.remove('hidden');
    loadDashboard();
  }
  localStorage.setItem('appInitialized', 'true');
}

function loadDashboard() {
  updateStudyStats();
  displayRecentNotes();
  updateTaskStats();
  
  // Add animations to stat cards with slight delay between each
  document.querySelectorAll('.stat-card').forEach((card, index) => {
    setTimeout(() => {
      card.style.opacity = '0';
      card.style.animation = 'fadeInUp 0.5s ease-out forwards';
    }, index * 100);
  });
}

function startTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  if (timeLeft <= 0) {
    const durationSelect = document.getElementById('timerDuration');
    timeLeft = parseInt(durationSelect.value) * 60;
  }
  
  timerEndTime = Date.now() + (timeLeft * 1000);
  localStorage.setItem('timerEndTime', timerEndTime);
  
  const timerContainer = document.querySelector('.timer-container');
  timerContainer.classList.add('timer-active');
  
  updateTimerProgress();
  timerInterval = setInterval(() => {
    const now = Date.now();
    if (now >= timerEndTime) {
      timerComplete();
    } else {
      timeLeft = Math.ceil((timerEndTime - now) / 1000);
      updateTimerDisplay();
      updateTimerProgress();
    }
  }, 1000);
}

function updateTimerProgress() {
  const totalTime = parseInt(document.getElementById('timerDuration').value) * 60;
  const progressBar = document.querySelector('.timer-progress-bar');
  if (progressBar) {
    const progress = (timeLeft / totalTime) * 100;
    progressBar.style.width = `${progress}%`;
    progressBar.style.background = `linear-gradient(90deg, 
      var(--gradient-start) ${progress}%, 
      var(--gradient-end) ${progress + 100}%
    )`;
  }
}

function updateTimer() {
  const now = Date.now();
  const endTime = parseInt(localStorage.getItem('timerEndTime')) || 0;
  
  if (now >= endTime) {
    clearInterval(timerInterval);
    timerInterval = null;
    timeLeft = 0;
    updateTimerDisplay();
    timerComplete();
  } else {
    timeLeft = Math.ceil((endTime - now) / 1000);
    updateTimerDisplay();
  }
}

function pauseTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  localStorage.removeItem('timerEndTime');
  const timerDisplay = document.querySelector('.timer-display');
  timerDisplay.style.animation = '';
}

function resetTimer() {
  const durationSelect = document.getElementById('timerDuration');
  timeLeft = parseInt(durationSelect.value) * 60;
  updateTimerDisplay();
  clearInterval(timerInterval);
  timerInterval = null;
  localStorage.removeItem('timerEndTime');
  const timerDisplay = document.querySelector('.timer-display');
  timerDisplay.style.animation = '';
}

function timerComplete() {
  const timerDisplay = document.querySelector('.timer-display');
  timerDisplay.style.animation = '';
  
  // Update total study time
  const duration = parseInt(document.getElementById('timerDuration').value);
  totalStudyTime += duration;
  localStorage.setItem('studyTime', totalStudyTime);
  updateStudyStats();
  
  // Play notification sound
  playTimerCompleteSound();
  
  // Show notification
  if (Notification.permission === 'granted') {
    const notification = new Notification('Study Timer Complete!', {
      body: 'Great job! Take a break.',
      icon: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="#007AFF"/>
          <path d="M30 50 L45 65 L70 35" stroke="white" stroke-width="8" fill="none"/>
        </svg>
      `),
      silent: true
    });
  } else {
    alert('Time is up! Great study session!');
  }
}

function playTimerCompleteSound() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // Create oscillators for a pleasant bell sound
  const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
  const oscillators = frequencies.map(freq => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = freq;
    
    gain.gain.value = 0;
    gain.gain.setValueAtTime(0, audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 2);
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    return osc;
  });
  
  oscillators.forEach(osc => {
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 2);
  });
}

function updateTimerDisplay() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  document.querySelector('.timer-display').textContent = 
    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function createNewNote() {
  document.getElementById('noteModal').classList.remove('hidden');
  document.getElementById('noteTitle').value = '';
  document.getElementById('noteContent').value = '';
}

function closeNoteModal() {
  document.getElementById('noteModal').classList.add('hidden');
}

function saveNote() {
  const titleInput = document.getElementById('noteTitle');
  const contentInput = document.getElementById('noteContent');
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  
  if (!title || !content) {
    showNotification('Please fill in both title and content', 'error');
    return;
  }

  const note = {
    id: Date.now(),
    title,
    content,
    created: new Date().toISOString(),
    lastModified: new Date().toISOString()
  };

  notes.unshift(note);
  saveNotes();
  closeNoteModal();
  
  // Clear inputs
  titleInput.value = '';
  contentInput.value = '';
  
  // Update all relevant views
  if (document.querySelector('#notes.view.active')) {
    displayNotes();
  } else if (document.querySelector('#dashboard.view.active')) {
    loadDashboard();
  }
  
  showNotification('Note saved successfully!', 'success');
}

function showNotification(message, type = 'success', duration = 3000) {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
    <span>${message}</span>
    <button onclick="this.parentElement.remove()" class="notification-close">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  // Remove existing notifications
  document.querySelectorAll('.notification').forEach(n => n.remove());
  
  document.body.appendChild(notification);
  requestAnimationFrame(() => {
    notification.classList.add('show');
    notification.style.animation = 'slideInFromBottom 0.3s ease-out';
  });
  
  if (duration) {
    setTimeout(() => {
      notification.style.animation = 'slideOutToBottom 0.3s ease-in';
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }
}

function createNoteElement(note) {
  const div = document.createElement('div');
  div.className = 'note-card';
  div.innerHTML = `
    <h3>${escapeHtml(note.title)}</h3>
    <div class="note-content">${formatNoteContent(note.content)}</div>
    <div class="note-footer">
      <span>
        <i class="far fa-clock"></i>
        ${formatDate(note.created)}
      </span>
      <div class="note-actions">
        <button onclick="editNote(${note.id})" class="btn-edit" title="Edit">
          <i class="fas fa-edit"></i>
        </button>
        <button onclick="deleteNote(${note.id})" class="btn-danger" title="Delete">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `;
  
  return div;
}

function editNote(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  
  document.getElementById('noteTitle').value = note.title;
  document.getElementById('noteContent').value = note.content;
  document.getElementById('noteModal').classList.remove('hidden');
  
  // Remove old note when editing
  notes = notes.filter(n => n.id !== id);
  saveNotes();
}

function deleteNote(id) {
  if (confirm('Are you sure you want to delete this note?')) {
    notes = notes.filter(note => note.id !== id);
    saveNotes();
    loadDashboard();
    if (document.querySelector('#notes.view.active')) {
      displayNotes();
    }
  }
}

function displayNotes() {
  const notesGrid = document.getElementById('notesGrid');
  notesGrid.innerHTML = '';
  
  if (notes.length === 0) {
    notesGrid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-sticky-note"></i>
        <p>No notes yet. Create your first note!</p>
      </div>
    `;
    return;
  }
  
  notes.forEach((note, index) => {
    const noteElement = createNoteElement(note);
    noteElement.style.animation = `noteCardAppear 0.3s ease-out ${index * 0.05}s forwards`;
    notesGrid.appendChild(noteElement);
  });
}

function displayRecentNotes() {
  const recentNotes = notes.slice(0, 3);
  const recentNotesContainer = document.getElementById('recentNotes');
  recentNotesContainer.innerHTML = '';
  
  recentNotes.forEach(note => {
    const noteElement = createNoteElement(note);
    recentNotesContainer.appendChild(noteElement);
  });
}

function displayTodos() {
  const todoList = document.getElementById('todoList');
  const filterStatus = document.getElementById('filterStatus').value;
  const filterPriority = document.getElementById('filterPriority').value;
  const filterCategory = document.getElementById('filterCategory').value;
  const sortBy = document.getElementById('sortTodos').value;
  
  let filteredTodos = [...todos];
  
  // Apply filters
  if (filterStatus !== 'all') {
    filteredTodos = filteredTodos.filter(todo => 
      filterStatus === 'completed' ? todo.completed : !todo.completed
    );
  }
  
  if (filterPriority !== 'all') {
    filteredTodos = filteredTodos.filter(todo => todo.priority === filterPriority);
  }
  
  if (filterCategory !== 'all') {
    filteredTodos = filteredTodos.filter(todo => todo.category === filterCategory);
  }
  
  // Apply sorting
  filteredTodos.sort((a, b) => {
    switch(sortBy) {
      case 'priority':
        return getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
      case 'dueDate':
        return new Date(a.dueDate) - new Date(b.dueDate);
      case 'created':
        return new Date(b.created) - new Date(a.created);
      default:
        return 0;
    }
  });
  
  todoList.innerHTML = '';
  
  if (filteredTodos.length === 0) {
    todoList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-tasks"></i>
        <p>No tasks found. Add some tasks to get started!</p>
      </div>
    `;
    return;
  }
  
  filteredTodos.forEach(todo => {
    const todoElement = createTodoElement(todo);
    todoList.appendChild(todoElement);
  });
  
  updateTaskStats();
}

function createTodoElement(todo) {
  const div = document.createElement('div');
  div.className = 'todo-item';
  div.style.borderLeft = `4px solid ${todo.color}`;
  
  const dueDate = todo.dueDate ? new Date(todo.dueDate) : null;
  const isOverdue = dueDate && dueDate < new Date() && !todo.completed;
  
  div.innerHTML = `
    <div class="todo-content">
      <input type="checkbox" ${todo.completed ? 'checked' : ''} 
        onchange="toggleTodoStatus(${todo.id})">
      <div class="todo-info">
        <span class="todo-text ${todo.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}">
          ${escapeHtml(todo.text)}
        </span>
        <div class="todo-details">
          ${todo.dueDate ? `
            <span class="todo-due-date ${isOverdue ? 'overdue' : ''}">
              <i class="far fa-calendar"></i> ${formatDate(todo.dueDate)}
            </span>
          ` : ''}
          <span class="todo-priority priority-${todo.priority.toLowerCase()}">
            ${todo.priority}
          </span>
          <span class="todo-category">
            <i class="fas fa-tag"></i> ${todo.category}
          </span>
        </div>
      </div>
    </div>
    <div class="todo-actions">
      <button onclick="editTodo(${todo.id})" class="btn-edit" title="Edit">
        <i class="fas fa-edit"></i>
      </button>
      <button onclick="deleteTodo(${todo.id})" class="btn-danger" title="Delete">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `;
  
  return div;
}

function addTodo() {
  const input = document.getElementById('todoInput');
  const text = input.value.trim();
  
  if (!text) {
    showNotification('Please enter a task description', 'error');
    input.focus();
    return;
  }
  
  const todo = {
    id: Date.now(),
    text: text,
    completed: false,
    color: document.getElementById('todoColor').value,
    priority: document.getElementById('todoPriority').value,
    category: document.getElementById('todoCategory').value,
    dueDate: document.getElementById('todoDueDate').value,
    created: new Date().toISOString()
  };
  
  todos.unshift(todo);
  saveTodos();
  
  const todoList = document.getElementById('todoList');
  const todoElement = createTodoElement(todo);
  todoElement.style.opacity = '0';
  todoElement.style.transform = 'translateY(-20px)';
  
  if (todoList.firstChild) {
    todoList.insertBefore(todoElement, todoList.firstChild);
  } else {
    todoList.appendChild(todoElement);
  }
  
  // Trigger reflow
  todoElement.offsetHeight;
  
  // Add animation
  todoElement.style.transition = 'all 0.3s ease-out';
  todoElement.style.opacity = '1';
  todoElement.style.transform = 'translateY(0)';
  
  input.value = '';
  document.getElementById('todoDueDate').value = '';
  
  showNotification('Task added successfully!');
  updateTaskStats();
}

function editTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;
  
  document.getElementById('todoInput').value = todo.text;
  document.getElementById('todoColor').value = todo.color;
  document.getElementById('todoPriority').value = todo.priority;
  document.getElementById('todoDueDate').value = todo.dueDate;
  document.getElementById('todoCategory').value = todo.category;
  
  // Remove old todo and save when editing
  todos = todos.filter(t => t.id !== id);
  saveTodos();
  displayTodos();
}

function toggleTodoStatus(id) {
  todos = todos.map(todo => {
    if (todo.id === id) {
      return { ...todo, completed: !todo.completed };
    }
    return todo;
  });
  
  saveTodos();
  displayTodos();
}

function deleteTodo(id) {
  if (confirm('Are you sure you want to delete this task?')) {
    todos = todos.filter(todo => todo.id !== id);
    saveTodos();
    displayTodos();
  }
}

function getPriorityWeight(priority) {
  const weights = { 'High': 3, 'Medium': 2, 'Low': 1 };
  return weights[priority] || 0;
}

function formatDate(dateString) {
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

function updateTaskStats() {
  const totalTasks = todos.length;
  const completedTasks = todos.filter(todo => todo.completed).length;
  const overdueTasks = todos.filter(todo => {
    if (!todo.dueDate || todo.completed) return false;
    return new Date(todo.dueDate) < new Date();
  }).length;
  
  const taskCount = document.getElementById('taskCount');
  if (taskCount) {
    taskCount.innerHTML = `
      <span>${completedTasks}/${totalTasks}</span>
      ${overdueTasks > 0 ? `<span class="overdue-count">(${overdueTasks} overdue)</span>` : ''}
    `;
  }
}

function updateStudyStats() {
  document.getElementById('studyTimeToday').textContent = `${Math.floor(totalStudyTime / 60)}hr ${totalStudyTime % 60}min`;
  document.getElementById('notesCount').textContent = notes.length;
}

function setupEventListeners() {
  // Navigation event listeners
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      const view = item.getAttribute('href').substring(1);
      loadView(view);
    });
  });

  // Todo input event listeners
  const todoInput = document.getElementById('todoInput');
  if (todoInput) {
    todoInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        addTodo();
      }
    });
  }

  // Filter change event listeners
  ['filterStatus', 'filterPriority', 'filterCategory', 'sortTodos'].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', displayTodos);
    }
  });

  // Add keyboard shortcut for saving notes
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && !document.getElementById('noteModal').classList.contains('hidden')) {
      e.preventDefault();
      saveNote();
    }
  });
  
  document.querySelector('.search-bar').addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    const activeView = document.querySelector('.view.active').id;
    
    if (searchTerm === '') {
      if (activeView === 'notes') {
        displayNotes();
      } else if (activeView === 'todos') {
        displayTodos();
      }
      return;
    }

    if (activeView === 'notes') {
      const filteredNotes = notes.filter(note => 
        note.title.toLowerCase().includes(searchTerm) || 
        note.content.toLowerCase().includes(searchTerm)
      );
      displayFilteredNotes(filteredNotes);
    } else if (activeView === 'todos') {
      const filteredTodos = todos.filter(todo =>
        todo.text.toLowerCase().includes(searchTerm) ||
        todo.category.toLowerCase().includes(searchTerm) ||
        todo.priority.toLowerCase().includes(searchTerm)
      );
      displayFilteredTodos(filteredTodos);
    }
  });

  // Update placeholder based on active view
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.getAttribute('href').substring(1);
      const searchBar = document.querySelector('.search-bar');
      searchBar.value = ''; // Clear search when switching views
      searchBar.placeholder = view === 'notes' ? 'Search notes...' : 'Search tasks...';
    });
  });
  
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      document.querySelector('.search-bar').focus();
    }
    
    if (e.key === 'Escape') {
      if (!document.getElementById('noteModal').classList.contains('hidden')) {
        closeNoteModal();
      }
    }
  });
}

function loadView(view) {
  document.querySelectorAll('.view').forEach(v => {
    v.classList.add('hidden');
    v.classList.remove('active');
  });
  
  const viewElement = document.getElementById(view);
  if (viewElement) {
    viewElement.classList.remove('hidden');
    viewElement.classList.add('active');
    
    // Initialize view-specific content
    switch(view) {
      case 'notes':
        displayNotes();
        break;
      case 'dashboard':
        loadDashboard();
        break;
      case 'todos':
        displayTodos();
        break;
      case 'timer':
        updateTimerDisplay();
        break;
    }
  }
}

function animateElement(element, animation) {
  element.style.animation = animation;
  element.addEventListener('animationend', () => {
    element.style.animation = '';
  }, {once: true});
}

function closeGuide() {
  document.getElementById('userGuide').classList.add('hidden');
  document.getElementById('appContainer').classList.remove('hidden');
  loadDashboard();
}

// Helper function to escape HTML and prevent XSS
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Request notification permission on app start
function requestNotificationPermission() {
  if ('Notification' in window) {
    Notification.requestPermission();
  }
}

// Add error handling for localStorage operations
function safelySetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error('Error saving to localStorage:', e);
  }
}

function safelyGetItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? item : defaultValue;
  } catch (e) {
    console.error('Error reading from localStorage:', e);
    return defaultValue;
  }
}

// Update localStorage wrapper functions
function saveNotes() {
  safelySetItem('notes', JSON.stringify(notes));
}

function saveTodos() {
  try {
    localStorage.setItem('todos', JSON.stringify(todos));
  } catch (error) {
    console.error('Error saving todos:', error);
    alert('There was an error saving your tasks. Please try again.');
  }
}

function displayFilteredNotes(filteredNotes) {
  const notesGrid = document.getElementById('notesGrid');
  notesGrid.innerHTML = '';
  
  if (filteredNotes.length === 0) {
    notesGrid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-search"></i>
        <p>No notes found matching your search</p>
      </div>
    `;
    return;
  }
  
  filteredNotes.forEach(note => {
    const noteElement = createNoteElement(note);
    noteElement.style.animation = 'fadeInUp 0.3s ease-out forwards';
    notesGrid.appendChild(noteElement);
  });
}

function displayFilteredTodos(filteredTodos) {
  const todoList = document.getElementById('todoList');
  todoList.innerHTML = '';
  
  if (filteredTodos.length === 0) {
    todoList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-search"></i>
        <p>No tasks found matching your search</p>
      </div>
    `;
    return;
  }
  
  filteredTodos.forEach((todo, index) => {
    const todoElement = createTodoElement(todo);
    todoElement.style.animation = `fadeInUp 0.3s ease-out ${index * 0.05}s forwards`;
    todoList.appendChild(todoElement);
  });
}

function updateStatistics() {
  const completedTasks = todos.filter(todo => todo.completed).length;
  const totalStudyMinutes = totalStudyTime;
  const notesCreatedToday = notes.filter(note => 
    new Date(note.created).toDateString() === new Date().toDateString()
  ).length;
  
  localStorage.setItem('statistics', JSON.stringify({
    completedTasks,
    totalStudyMinutes,
    notesCreatedToday,
    lastUpdated: new Date().toISOString()
  }));
  
  updateDashboardCharts();
}

function updateDashboardCharts() {
  const stats = JSON.parse(localStorage.getItem('statistics')) || {};
  const chartContainer = document.querySelector('.stats-chart');
  
  if (chartContainer) {
    // Implementation of visual charts here
    // You can use simple CSS-based charts or integrate with a charting library
  }
}

document.addEventListener('visibilitychange', function() {
  if (!document.hidden && timerInterval) {
    // Resync timer when page becomes visible
    updateTimer();
  }
});

function formatNoteContent(content) {
  // Convert URLs to clickable links
  content = content.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  
  // Convert markdown-style bold text
  content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Convert markdown-style italic text
  content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  return content;
}

function enhancedSearch(searchTerm) {
  const activeView = document.querySelector('.view.active').id;
  searchTerm = searchTerm.toLowerCase().trim();

  if (activeView === 'notes') {
    const results = notes.filter(note => {
      const titleMatch = note.title.toLowerCase().includes(searchTerm);
      const contentMatch = note.content.toLowerCase().includes(searchTerm);
      return titleMatch || contentMatch;
    });
    
    displayFilteredNotes(results);
  } else if (activeView === 'todos') {
    const results = todos.filter(todo => {
      return ['text', 'category', 'priority'].some(field => 
        todo[field].toLowerCase().includes(searchTerm)
      );
    });
    
    displayFilteredTodos(results);
  }
}

// Initialize settings
function initializeSettings() {
  // Set initial values for settings controls
  document.querySelectorAll('.theme-option').forEach(option => {
    if (option.dataset.theme === settings.theme) {
      option.classList.add('active');
    }
    option.addEventListener('click', () => updateThemeSetting(option.dataset.theme));
  });

  document.getElementById('fontSizeSelect').value = settings.fontSize;
  document.getElementById('defaultTimerDuration').value = settings.defaultTimerDuration;
  document.getElementById('timerSound').value = settings.timerSound;
  document.getElementById('soundVolume').value = settings.soundVolume;
  document.getElementById('desktopNotifications').checked = settings.desktopNotifications;
  document.getElementById('soundNotifications').checked = settings.soundNotifications;

  // Add event listeners for settings changes
  document.getElementById('fontSizeSelect').addEventListener('change', updateFontSize);
  document.getElementById('defaultTimerDuration').addEventListener('change', updateDefaultTimer);
  document.getElementById('timerSound').addEventListener('change', updateTimerSound);
  document.getElementById('soundVolume').addEventListener('change', updateSoundVolume);
  document.getElementById('desktopNotifications').addEventListener('change', updateNotificationSettings);
  document.getElementById('soundNotifications').addEventListener('change', updateNotificationSettings);
  
  // Data management buttons
  document.getElementById('exportData').addEventListener('click', exportUserData);
  document.getElementById('importData').addEventListener('click', importUserData);
  document.getElementById('clearData').addEventListener('click', clearAllData);

  applySettings();
}

function updateThemeSetting(theme) {
  settings.theme = theme;
  localStorage.setItem('theme', theme);
  
  document.querySelectorAll('.theme-option').forEach(option => {
    option.classList.toggle('active', option.dataset.theme === theme);
  });

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

function updateFontSize(e) {
  settings.fontSize = e.target.value;
  localStorage.setItem('fontSize', settings.fontSize);
  document.documentElement.style.fontSize = getFontSizeValue(settings.fontSize);
}

function getFontSizeValue(size) {
  const sizes = {
    small: '14px',
    medium: '16px',
    large: '18px'
  };
  return sizes[size] || sizes.medium;
}

function updateDefaultTimer(e) {
  settings.defaultTimerDuration = parseInt(e.target.value);
  localStorage.setItem('defaultTimerDuration', settings.defaultTimerDuration);
  resetTimer();
}

function updateTimerSound(e) {
  settings.timerSound = e.target.value;
  localStorage.setItem('timerSound', settings.timerSound);
}

function updateSoundVolume(e) {
  settings.soundVolume = parseInt(e.target.value);
  localStorage.setItem('soundVolume', settings.soundVolume);
}

function updateNotificationSettings(e) {
  const setting = e.target.id;
  settings[setting] = e.target.checked;
  localStorage.setItem(setting, e.target.checked);
  
  if (setting === 'desktopNotifications' && e.target.checked) {
    requestNotificationPermission();
  }
}

function exportUserData() {
  const data = {
    notes,
    todos,
    totalStudyTime,
    settings
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'studyspace-backup.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showNotification('Data exported successfully!');
}

function importUserData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = event => {
      try {
        const data = JSON.parse(event.target.result);
        
        // Validate and import data
        if (data.notes) notes = data.notes;
        if (data.todos) todos = data.todos;
        if (data.totalStudyTime) totalStudyTime = data.totalStudyTime;
        if (data.settings) Object.assign(settings, data.settings);
        
        // Save imported data
        localStorage.setItem('notes', JSON.stringify(notes));
        localStorage.setItem('todos', JSON.stringify(todos));
        localStorage.setItem('studyTime', totalStudyTime);
        
        // Apply imported settings
        applySettings();
        
        // Refresh views
        displayNotes();
        displayTodos();
        updateStudyStats();
        
        showNotification('Data imported successfully!');
      } catch (error) {
        showNotification('Error importing data. Please check the file format.', 'error');
      }
    };
    
    reader.readAsText(file);
  };
  
  input.click();
}

function clearAllData() {
  if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
    localStorage.clear();
    notes = [];
    todos = [];
    totalStudyTime = 0;
    
    // Reset to default settings
    Object.assign(settings, {
      theme: 'system',
      fontSize: 'medium',
      defaultTimerDuration: 25,
      timerSound: 'bell',
      soundVolume: 50,
      desktopNotifications: true,
      soundNotifications: true
    });
    
    // Apply default settings
    applySettings();
    
    // Refresh views
    displayNotes();
    displayTodos();
    updateStudyStats();
    
    showNotification('All data has been cleared.');
  }
}

function applySettings() {
  // Apply theme
  updateThemeSetting(settings.theme);
  
  // Apply font size
  document.documentElement.style.fontSize = getFontSizeValue(settings.fontSize);
  
  // Update timer duration select
  const timerDurationSelect = document.getElementById('timerDuration');
  if (timerDurationSelect) {
    timerDurationSelect.value = settings.defaultTimerDuration;
  }
}
