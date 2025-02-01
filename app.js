// Remove Google Drive related configuration since it's no longer needed
let currentTheme = localStorage.getItem('theme') || 'light';
let timerInterval = null;
let timeLeft = 25 * 60; // 25 minutes in seconds
let notes = JSON.parse(localStorage.getItem('notes')) || [];
let totalStudyTime = parseInt(localStorage.getItem('studyTime')) || 0;
let todos = JSON.parse(localStorage.getItem('todos')) || [];
const TASK_COLORS = ['#FF453A', '#FF9F0A', '#32D74B', '#64D2FF', '#0A84FF', '#BF5AF2'];

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

function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);
  safelySetItem('theme', currentTheme);
  
  // Force re-render of components that might need theme update
  if (document.querySelector('#notes.view:not(.hidden)')) {
    displayNotes();
  }
  if (document.querySelector('#todos.view:not(.hidden)')) {
    displayTodos();
  }
  loadDashboard();
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
  
  document.querySelector('.timer-display').style.animation = 'pulseGlow 2s infinite';
  
  timerInterval = setInterval(() => {
    if (timeLeft > 0) {
      timeLeft--;
      updateTimerDisplay();
      
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        document.querySelector('.timer-display').style.animation = '';
        
        // Update total study time
        const duration = parseInt(document.getElementById('timerDuration').value);
        totalStudyTime += duration;
        safelySetItem('studyTime', totalStudyTime);
        updateStudyStats();
        
        // Show notification
        if (Notification.permission === 'granted') {
          new Notification('Study Timer Complete!', {
            body: 'Great job! Take a break.',
            icon: '/favicon.ico'
          });
        }
        
        alert('Time is up! Great study session!');
      }
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function resetTimer() {
  const durationSelect = document.getElementById('timerDuration');
  timeLeft = parseInt(durationSelect.value) * 60; // Convert minutes to seconds
  updateTimerDisplay();
  clearInterval(timerInterval);
  timerInterval = null;
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
  const title = document.getElementById('noteTitle').value.trim();
  const content = document.getElementById('noteContent').value.trim();
  
  if (!title || !content) {
    showNotification('Please fill in both title and content', 'error');
    return;
  }

  try {
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
    loadDashboard();
    displayNotes();
    showNotification('Note saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving note:', error);
    showNotification('Error saving note. Please try again.', 'error');
  }
}

function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => notification.classList.add('show'), 100);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function createNoteElement(note) {
  const div = document.createElement('div');
  div.className = 'note-card';
  div.innerHTML = `
    <h3>${escapeHtml(note.title)}</h3>
    <p>${escapeHtml(note.content.substring(0, 100))}${note.content.length > 100 ? '...' : ''}</p>
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
  notes.forEach(note => {
    const noteElement = createNoteElement(note);
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
  const colorSelect = document.getElementById('todoColor');
  const prioritySelect = document.getElementById('todoPriority');
  const categorySelect = document.getElementById('todoCategory');
  const dueDateInput = document.getElementById('todoDueDate');
  
  if (!text) return;
  
  const todo = {
    id: Date.now(),
    text: text,
    completed: false,
    color: colorSelect.value,
    priority: prioritySelect.value,
    category: categorySelect.value,
    dueDate: dueDateInput.value,
    created: new Date().toISOString()
  };
  
  todos.unshift(todo);
  saveTodos();
  
  // Clear inputs
  input.value = '';
  dueDateInput.value = '';
  
  // Reset selects to default values
  colorSelect.selectedIndex = 0;
  prioritySelect.selectedIndex = 0;
  categorySelect.selectedIndex = 0;
  
  displayTodos();
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

// Call this when the app starts
requestNotificationPermission();

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