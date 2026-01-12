const Utils = {
    // NEW: Sanitizes HTML to allow safe formatting tags
    sanitizeHtml(html) {
        if (!html) return "";
        
        // Create a temporary element to hold the HTML
        const div = document.createElement('div');
        div.innerHTML = html;

        // 1. Remove all <script> tags
        const scripts = div.getElementsByTagName('script');
        for (let i = scripts.length - 1; i >= 0; i--) {
            scripts[i].parentNode.removeChild(scripts[i]);
        }

        // 2. Remove "on..." event handlers (XSS vectors)
        const allElements = div.getElementsByTagName('*');
        for (let el of allElements) {
            const attrs = el.attributes;
            for (let i = attrs.length - 1; i >= 0; i--) {
                if (attrs[i].name.startsWith('on')) {
                    el.removeAttribute(attrs[i].name);
                }
            }
            // Prevent javascript: pseudo-protocol in links
            if (el.tagName === 'A' && el.getAttribute('href')?.startsWith('javascript:')) {
                el.removeAttribute('href');
            }
        }

        return div.innerHTML;
    },

    // You no longer need a complex unescapeHtml because 
    // we are saving clean HTML directly.
    renderSafe(html) {
        return this.sanitizeHtml(html);
    },

    // Format milliseconds into 1h 15m
    formatTime(ms) {
        if (!ms || ms < 0) return "0m";
        const totalMinutes = Math.floor(ms / 60000);
        if (totalMinutes < 1) return "< 1m";
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        let str = "";
        if (hours > 0) str += `${hours}h `;
        if (minutes > 0) str += `${minutes}m`;
        return str.trim();
    },

    // Get current time in 'sv-SE' format (YYYY-MM-DD HH:mm)
    getTimestamp() {
        return new Date().toLocaleString('sv-SE').slice(0, 16);
    }
};

const TaskStore = {
    DB_KEY: 'tasks',

    load() {
        try {
            const rawData = localStorage.getItem(this.DB_KEY);
            const parsed = rawData ? JSON.parse(rawData) : [];
            // Do NOT filter here. Load everything so we don't lose data on save.
            return parsed.map(task => this.migrate(task));
        } catch (e) {
            console.error("Data Load Error:", e);
            return [];
        }
    },

    migrate(task) {
        return {
            id: task.id || Date.now(),
            name: task.name || "Untitled Task",
            priority: task.priority || "Not Important",
            dueDate: task.dueDate || "",
            dueTime: task.dueTime || "",
            createdAt: task.createdAt || Utils.getTimestamp(),
            isCompleted: !!task.isCompleted,
            completedTaskTime: task.completedTaskTime || null,
            isArchive: !!task.isArchive, // This defaults to false if missing
            description: task.description || "",
            checklist: Array.isArray(task.checklist) ? task.checklist : [],
            focusScore: parseInt(task.focusScore) || 0,
            project: task.project || '',
            tags: task.tags || '',
            energyLevel: task.energyLevel || '',
            timeEstimate: task.timeEstimate || 0,
            timeSpent: parseInt(task.timeSpent) || 0,
            isTimerRunning: !!task.isTimerRunning,
            currentSessionStartTime: task.currentSessionStartTime || null
        };
    },

    save(tasks) {
        localStorage.setItem(this.DB_KEY, JSON.stringify(tasks));
    }
};

const TaskManager = {
    // Search logic covering all specified columns
    filterTasks(tasks, searchTerm) {
        if (!searchTerm) return tasks;
        const query = searchTerm.toLowerCase();
        const columns = ["name", "description", "project", "tags", "priority", "energyLevel"];
        
        return tasks.filter(task =>
            columns.some(col => String(task[col]).toLowerCase().includes(query))
        );
    },

    // Calculate progress percentage
    calculateProgress(checklist) {
        if (!checklist || checklist.length === 0) return 0;
        const doneCount = checklist.filter(item => item.done).length;
        return Math.round((doneCount / checklist.length) * 100);
    },

    // Logic for toggling a sub-task (used in the detail view)
    toggleSubTask(task, subTaskIndex) {
        if (task.checklist[subTaskIndex]) {
            task.checklist[subTaskIndex].done = !task.checklist[subTaskIndex].done;
        }
        return task;
    },

    // Sort checklist: Undone items first
    getSortedChecklist(checklist) {
        return [...checklist].sort((a, b) => a.done - b.done);
    }
};

const TimerEngine = {
    activeInterval: null,

    // START a timer for a specific task
    start(task, allTasks) {
        // Validation: Ensure no other task is running
        const runningTask = allTasks.find(t => t.isTimerRunning);
        if (runningTask && runningTask.id !== task.id) {
            alert(`Timer is already running for: ${runningTask.name}`);
            return false;
        }

        task.isTimerRunning = true;
        task.currentSessionStartTime = Date.now();
        return true;
    },

    // PAUSE a timer and commit the time to the permanent record
    pause(task) {
        if (task && task.isTimerRunning) {
            const elapsed = Date.now() - task.currentSessionStartTime;
            task.timeSpent += elapsed;
            task.isTimerRunning = false;
            task.currentSessionStartTime = null;
            
            return true;
        }
        return false;
    },

    // LIVE UI REFRESH: Updates the text on screen every second
    // This function DOES NOT save to storage, making it very performant.
    initLiveUpdate(tasks, currentViewId, displaySelector) {
        if (this.activeInterval) clearInterval(this.activeInterval);

        this.activeInterval = setInterval(() => {
            const runningTask = tasks.find(t => t.isTimerRunning);
            
            // Only update the UI if the running task is the one being viewed
            if (runningTask && runningTask.id === currentViewId) {
                const sessionElapsed = Date.now() - runningTask.currentSessionStartTime;
                const totalDisplayTime = runningTask.timeSpent + sessionElapsed;
                
                $(displaySelector).text(Utils.formatTime(totalDisplayTime));
            }
        }, 1000);
    }
};

const State = {
    tasks: [],
    currentViewId: null,
    checklistBuffer: [], // Used for modal editing

    // Initialize the app state
    init() {
        this.tasks = TaskStore.load();
        
        // Auto-resume: If a task has a running timer, set it as the current view
        const runningTask = this.tasks.find(t => t.isTimerRunning);
        if (runningTask) {
            this.currentViewId = runningTask.id;
        }
    },

    // Update the task list and save
    sync() {
        TaskStore.save(this.tasks);
    },

    // Find a task by ID safely
    getTask(id) {
        return this.tasks.find(t => t.id === parseInt(id)) || null;
    },

    // Get the task currently being viewed
    getCurrentTask() {
        return this.getTask(this.currentViewId);
    },

    // Logic for deleting
    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== parseInt(id));
        if (this.currentViewId === parseInt(id)) {
            this.currentViewId = null;
        }
        this.sync();
    }
};

const UIRenderer = {
    // 1. Render the Sidebar Lists
    renderSidebar(tasks, currentViewId) {
        // Clear existing items in the three priority buckets
        $('#list-super-important, #list-important, #list-not-important').empty();

        // FILTER HERE: Only show tasks that are NOT archived
        const activeTasks = tasks.filter(t => t.isArchive === false);

        activeTasks.forEach(task => {
            const progress = TaskManager.calculateProgress(task.checklist);
            const isActive = currentViewId === task.id ? 'active' : '';
            const timerVisible = task.isTimerRunning ? '' : 'd-none';
            
            // Determine container and color class based on priority
            let containerId = '#list-not-important';
            let priorityClass = 'priority-not-important';

            if (task.priority === 'Super Important') {
                containerId = '#list-super-important';
                priorityClass = 'priority-super-important';
            } else if (task.priority === 'Important') {
                containerId = '#list-important';
                priorityClass = 'priority-important';
            }

            const cardHtml = `
                <div class="task-card ${priorityClass} ${isActive}" data-id="${task.id}">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center flex-grow-1 overflow-hidden">
                            <i class="fas fa-grip-vertical drag-handle me-2" title="Drag to reorder"></i>
                            <span class="fw-bold text-truncate">${task.name}</span>
                        </div>
                        <div class="task-actions ms-2">
                            <i class="fas fa-clock text-success me-2 ${timerVisible} timer-indicator"></i>
                            <button class="btn btn-sm btn-link text-primary p-0 me-1 btn-view" title="View"><i class="fas fa-eye"></i></button>
                            <button class="btn btn-sm btn-link text-secondary p-0 me-1 btn-edit" title="Edit"><i class="fas fa-pencil-alt"></i></button>
                            <button class="btn btn-sm btn-link text-danger p-0 btn-delete" title="Delete"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                    <div class="mini-progress">
                        <div class="mini-progress-bar" style="width: ${progress}%"></div>
                    </div>
                </div>`;
            
            $(containerId).append(cardHtml);
        });
    },

    // 2. Render the Detailed View (Right Pane)
    renderDetailView(task, allTasks) {
        if (!task) {
            $('#empty-state').removeClass('d-none');
            $('#task-detail-view').addClass('d-none');
            return;
        }
        console.log(task);
        $('#empty-state').addClass('d-none');
        $('#task-detail-view').removeClass('d-none');

        $('.btn-edit').attr('data-id', task.id);

        // Static Content
        $('#detail-title').text(task.name);
        $('#detail-date').text(task.dueDate || 'No Date');
        $('#detail-time').text(task.dueTime || '--:--');
        $('#detail-project').text(task.project || 'N/A');

        $('#detail-time-estimate').text(task.timeEstimate ? `${task.timeEstimate} minutes` : 'N/A');

        $('#detail-energy-level').text(task.energyLevel || 'N/A');
        $('#detail-tags').text(task.tags || 'No tags');
        $('#detail-total-time-spent').text(Utils.formatTime(task.timeSpent));
        
        // Priority Badge
        const badges = {
            'Super Important': 'bg-danger',
            'Important': 'bg-warning text-dark',
            'Not Important': 'bg-info text-dark'
        };
        $('#detail-priority-badge')
            .removeClass()
            .addClass(`badge rounded-pill ${badges[task.priority] || 'bg-secondary'}`)
            .text(task.priority);

        // Progress
        const progress = TaskManager.calculateProgress(task.checklist);
        $('#detail-progress-bar').css('width', `${progress}%`);
        $('#detail-progress-text').text(`${progress}%`);

        // Description (Rich Text unescaped)
        $('#detail-description').html(task.description || 'No description.');

        // Timer Buttons logic: Prevent starting if another task is running
        const anyOtherTimerRunning = allTasks.some(t => t.isTimerRunning && t.id !== task.id);
        
        if (task.isTimerRunning) {
            $('#btn-start-task-timer').addClass('d-none');
            $('#btn-pause-task-timer').removeClass('d-none');
        } else {
            $('#btn-start-task-timer').toggleClass('d-none', anyOtherTimerRunning);
            $('#btn-pause-task-timer').addClass('d-none');
        }

        // Checklist Rendering (Sorted: Done items at bottom)
        const $checklistContainer = $('#detail-checklist').empty();
        const sortedList = TaskManager.getSortedChecklist(task.checklist);
        
        sortedList.forEach(item => {
            // We need the original index to update the correct item in State
            const originalIndex = task.checklist.indexOf(item);
            const itemHtml = `
                <label class="list-group-item d-flex gap-3 align-items-center ${item.done ? 'checklist-item-done' : ''}">
                    <input class="form-check-input flex-shrink-0 checklist-toggle" 
                           type="checkbox" 
                           data-original-index="${originalIndex}" 
                           ${item.done ? 'checked' : ''}>
                    <span class="pt-1 form-checked-content">${item.text}</span>
                </label>`;
            $checklistContainer.append(itemHtml);
        });
    },

    // 3. Render Checklist in the Modal (Editor)

    renderModalChecklist(buffer) {
        const $list = $('#modal-checklist-buffer').empty();
        buffer.forEach((item, index) => {
            $list.append(`
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <i class="fas fa-grip-vertical checklist-drag-handle me-2" style="cursor:grab" title="Drag to reorder"></i>
                    <span class="flex-grow-1 checklist-text">${item.text}</span>
                    <input type="hidden" class="checklist-done-state" value="${item.done}">
                    <button type="button" class="btn btn-sm btn-outline-danger btn-remove-buffer" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                </li>
            `);
        });

        // CRITICAL: Re-initialize sortable every time the list is rendered
        App.initModalSortable(); 
}
};

const App = {
    // 1. INITIALIZE APP
    init() {
        State.init(); // Load data and set initial state
        this.bindGlobalEvents();
        this.bindTaskActions();
        this.bindModalActions();
        this.bindTimerActions();
        this.bindSorting();
        
        // Initial Render
        UIRenderer.renderSidebar(State.tasks, State.currentViewId);
        if (State.currentViewId) {
            const task = State.getTask(State.currentViewId);
            UIRenderer.renderDetailView(task, State.tasks);
        }

        // Start the 1-second live clock update
        TimerEngine.initLiveUpdate(State.tasks, State.currentViewId, '#detail-total-time-spent');
    },

    // 2. GLOBAL ACTIONS (Search, Create)
    bindGlobalEvents() {
        // Search Logic
        $(document).on('input', '#taskSearch', (e) => {
            const filtered = TaskManager.filterTasks(State.tasks, $(e.target).val());
            UIRenderer.renderSidebar(filtered, State.currentViewId);
        });

        // Open Create Modal
        $('#btn-create-task').click(() => {
            $('#modalTitle').text('Create Task');
            $('#taskForm')[0].reset();
            $('#taskId').val('');
            $('#taskDesc').empty();
            State.checklistBuffer = [];
            UIRenderer.renderModalChecklist(State.checklistBuffer);
            $('#taskModal').modal('show');
        });
    },

    // 3. TASK CARD ACTIONS (View, Edit, Delete)
    bindTaskActions() {
        // View Task (Clicking card or eye icon)
        $(document).on('click', '.task-card, .btn-view', (e) => {
            e.stopPropagation();
            const id = $(e.currentTarget).closest('.task-card').data('id');
            State.currentViewId = id;
            const task = State.getTask(id);
            UIRenderer.renderDetailView(task, State.tasks);
            UIRenderer.renderSidebar(State.tasks, id);
        });

        // Delete Task
        $(document).on('click', '.btn-delete', (e) => {
            e.stopPropagation();
            const id = $(e.currentTarget).closest('.task-card').data('id');
            if (confirm("Delete this task?")) {
                State.deleteTask(id);
                UIRenderer.renderSidebar(State.tasks, State.currentViewId);
                UIRenderer.renderDetailView(State.getCurrentTask(), State.tasks);
            }
        });

        // Edit Task (Populate Modal)
        $(document).on('click', '.btn-edit', (e) => {
            e.stopPropagation();;
            // Inside App.bindTaskActions -> $(document).on('click','.btn-edit', ...
            const id = $(e.currentTarget).attr('data-id') || $(e.currentTarget).closest('.task-card').data('id');
            const task = State.getTask(id);

            if (!task) return;

            $('#modalTitle').text('Edit Task');
            $('#taskId').val(task.id);

            $('#taskName').val(task.name);
            $('#taskPriority').val(task.priority);
            $('#taskProject').val(task.project);
            $('#taskTimeEstimate').val(task.timeEstimate);

            // Rich Text Editor Content
            $('#taskDesc').html(task.description || '');

            $('#taskDate').val(task.dueDate);
            $('#taskTime').val(task.dueTime);

            $('#isCompleted').prop('checked', task.isCompleted);
            $('#isArchive').prop('checked', task.isArchive);
            
            $('#focusScoreSlider').val(task.focusScore);
            $('#focusScoreValue').text(task.focusScore);
            
            $('#taskTags').val(task.tags);
            $('#taskEnergyLevel').val(task.energyLevel);            

            // Copy checklist to buffer for safe editing
            State.checklistBuffer = JSON.parse(JSON.stringify(task.checklist));
            UIRenderer.renderModalChecklist(State.checklistBuffer);
            $('#taskModal').modal('show');
        });
    },

    // 4. MODAL & CHECKLIST BUFFER ACTIONS
    bindModalActions() {
        // Add item to checklist buffer
        $('#btnAddChecklist').click(() => this.addChecklistItem());
        $('#newChecklistItem').keypress((e) => { if (e.which === 13) this.addChecklistItem(); });

        // Remove item from buffer
        $(document).on('click', '.btn-remove-buffer', (e) => {
            const idx = $(e.currentTarget).data('index');
            State.checklistBuffer.splice(idx, 1);
            UIRenderer.renderModalChecklist(State.checklistBuffer);
        });

        $(document).on('change', '#focusScoreSlider', (e) => {
            $('#focusScoreValue').text($(e.currentTarget).val());
        });

        // Inside App.bindModalActions
        $('.editor-toolbar button').click(function() {
            const command = $(this).data('command');
            
            if (command === 'createLink') {
                const url = prompt("Enter URL:", "http://");
                if (url) document.execCommand("createLink", false, url);
            } else {
                document.execCommand(command, false, null);
            }
            
            // Keep focus on the editor after clicking a button
            $('#taskDesc').focus();
        });

        // Save Task
        $('#btn-save-task').click(() => {
            const id = $('#taskId').val();
            const isNew = !id;
            const existingTask = isNew ? null : State.getTask(id);

            // Inside App.bindModalActions -> $('#btn-save-task').click
            const taskData = {
                id: isNew ? Date.now() : parseInt(id),
                name: $('#taskName').val().trim(),
                priority: $('#taskPriority').val(),
                description: Utils.sanitizeHtml($('#taskDesc').html()),
                checklist: State.checklistBuffer,
                project: $('#taskProject').val(),
                tags: $('#taskTags').val(),
                energyLevel: $('#taskEnergyLevel').val(),
                timeEstimate: parseInt($('#taskTimeEstimate').val()) || 0,
                focusScore: $('#focusScoreSlider').val(),
                isArchive: $('#isArchive').prop('checked'),
                isCompleted: $('#isCompleted').prop('checked'),

                completedTaskTime: $('#isCompleted').prop('checked') && !existingTask?.completedTaskTime ? Date.now() : null,

                // PRESERVE THESE FIELDS
                createdAt: existingTask?.createdAt ? existingTask.createdAt : Utils.getTimestamp(),
                timeSpent: existingTask?.timeSpent ? existingTask.timeSpent : 0,
                isTimerRunning: existingTask?.isTimerRunning ? existingTask.isTimerRunning : false,
                currentSessionStartTime: existingTask?.currentSessionStartTime ? existingTask.currentSessionStartTime : null,
                
                dueDate: $('#taskDate').val(),
                dueTime: $('#taskTime').val()
            };


            if (isNew) State.tasks.push(taskData);
            else {
                const idx = State.tasks.findIndex(t => t.id === taskData.id);
                State.tasks[idx] = taskData;
            }

            State.sync();
            $('#taskModal').modal('hide');
            UIRenderer.renderSidebar(State.tasks, State.currentViewId);
            UIRenderer.renderDetailView(State.getCurrentTask(), State.tasks);
        });
    },

    // 5. TIMER & INTERACTION
    bindTimerActions() {
        $(document).on('click', '#btn-start-task-timer', () => {
            const task = State.getCurrentTask();
            if (TimerEngine.start(task, State.tasks)) {
                State.sync();
                UIRenderer.renderDetailView(task, State.tasks);
                UIRenderer.renderSidebar(State.tasks, State.currentViewId);
            }
        });

        $(document).on('click', '#btn-pause-task-timer', () => {
            const task = State.getCurrentTask();
            if (TimerEngine.pause(task)) {
                State.sync();
                UIRenderer.renderDetailView(task, State.tasks);
                UIRenderer.renderSidebar(State.tasks, State.currentViewId);
            }
        });

        // Sub-task Toggle in Detail View
        $(document).on('change', '.checklist-toggle', (e) => {
            const task = State.getCurrentTask();
            const idx = $(e.target).data('original-index');
            task.checklist[idx].done = e.target.checked;
            State.sync();
            UIRenderer.renderDetailView(task, State.tasks);
            UIRenderer.renderSidebar(State.tasks, State.currentViewId);
        });
    },
    initModalSortable() {
        $("#modal-checklist-buffer").sortable({
            handle: ".checklist-drag-handle",
            placeholder: "ui-sortable-placeholder",
            axis: "y",
            update: (event, ui) => {
                const newBuffer = [];
                
                // Loop through the DOM elements in their new order
                $('#modal-checklist-buffer li').each(function() {
                    const text = $(this).find('.checklist-text').text();
                    const isDone = $(this).find('.checklist-done-state').val() === 'true';
                    
                    newBuffer.push({
                        text: text,
                        done: isDone
                    });
                });

                // Update the state with the new order
                State.checklistBuffer = newBuffer;

                // Re-index the delete buttons so they match the new array positions
                $("#modal-checklist-buffer .btn-remove-buffer").each(function(index) {
                    $(this).data('index', index);
                });
            }
        }).disableSelection();
    },
    // 6. SORTABLE (JQUERY UI)
    bindSorting() {
        $(".task-list").sortable({
            connectWith: ".task-list",
            handle: ".drag-handle",
            update: () => {
                // Rebuild tasks array based on new DOM order
                const newTasks = [];
                const priorities = {
                    '#list-super-important': 'Super Important',
                    '#list-important': 'Important',
                    '#list-not-important': 'Not Important'
                };

                Object.keys(priorities).forEach(listId => {
                    $(`${listId} .task-card`).each(function() {
                        const task = State.getTask($(this).data('id'));
                        if (task) {
                            task.priority = priorities[listId];
                            newTasks.push(task);
                        }
                    });
                });
                State.tasks = newTasks;
                State.sync();
            }
        });
    },

    addChecklistItem() {
        const text = $('#newChecklistItem').val().trim();
        if (text) {
            State.checklistBuffer.push({ text: text, done: false });
            $('#newChecklistItem').val('');
            UIRenderer.renderModalChecklist(State.checklistBuffer);
        }
    }
};

// INITIALIZE ON LOAD
$(document).ready(() => App.init());

function resetEditor() {
    $('#taskDesc').empty();
}