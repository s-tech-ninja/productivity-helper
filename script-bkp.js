$(document).ready(function () {

    // --- State Management ---
    let tasks = [];
    let currentViewId = null;
    let checklistBuffer = []; // Temporary storage for modal editing
    let activeTimerInterval = null; // Holds the setInterval for the live timer display

    // --- Init ---
    loadTasks();
    renderSidebar();
    startActiveTimer(); // Initialize the global timer watcher

    // --- Helper Functions ---

    // Security: Prevent XSS
    function escapeHtml(text) {
        if (!text) return "";
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // This funcion contains the core logic for making the checklist items sortable
    function initChecklistSortable() {
        $('#modal-checklist-buffer').sortable({
            handle: ".checklist-drag-handle",
            placeholder: "ui-sortable-placeholder",
            axis: "y",
            update: function (event, ui) {
                const newBuffer = [];
                $('#modal-checklist-buffer li').each(function () {
                    const text = $(this).find('.checklist-text').text();
                    const originalItem = checklistBuffer.find(item => item.text === text);
                    newBuffer.push ({
                        text: originalItem.text,
                        done: originalItem?.done ?? false
                    });
                });
                checklistBuffer = newBuffer;
                $("#modal-checklist-buffer .btn-remove-buffer").each(function (index) {
                    $(this).data('index', index);
                });
            }
        });
    }
    // NEW: Format milliseconds into a readable string (e.g., 1h 15m)
    function formatTime(ms) {
        if (!ms || ms < 0) return "0m";
        const totalMinutes = Math.floor(ms / 60000);
        if (totalMinutes < 1) return "< 1m";
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        let str = "";
        if (hours > 0) str += `${hours}h `;
        if (minutes > 0) str += `${minutes}m`;
        return str.trim();
    }


    // Persistence
    function saveToStorage() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function loadTasks(dataToSearch = '') {
        try {
            let data = '[]';
            const data2 = localStorage.getItem('tasks');
            if (data2) {
                data = JSON.stringify((JSON.parse(data2)).filter((item) => item.isArchive == false));
            }
            if (data) {
                let loadedFiltered = JSON.parse(data);

                const columns = ["name", "description", "project", "tags", "priority", "energyLevel"];

                const loaded = loadedFiltered.filter(item =>
                columns.some(col =>
                    String(item[col]).toLowerCase().includes(dataToSearch.toLowerCase())
                )
                );


                // NEW: Data Migration for older tasks
                // Ensure all tasks have the new fields to prevent errors
                tasks = loaded.map(task => ({
                    id: task.id,
                    name: task.name,
                    priority: task.priority,
                    dueDate: task.dueDate,
                    dueTime: task.dueTime,
                    createdAt: task.createdAt,
                    completedAt: task.completedAt,
                    completedTime: task.completedTime,
                    createdAt: task.createdAt,
                    isCompleted: task.isCompleted || false,
                    isArchive: task.isArchive || false,
                    description: unescapeHtml(task.description),
                    checklist: task.checklist || [],
                    focusScore: task.focusScore || 0,
                    // Add new fields with defaults if they don't exist
                    project: task.project || '',
                    timeEstimate: task.timeEstimate || 0,
                    tags: task.tags || '',
                    energyLevel: task.energyLevel || '',
                    timeSpent: task.timeSpent || 0, // Total time in milliseconds
                    isTimerRunning: task.isTimerRunning || false,
                    currentSessionStartTime: task.currentSessionStartTime || null
                }));

                 // NEW: Ensure only one timer is running on page load
                const runningTask = tasks.find(t => t.isTimerRunning);
                if (runningTask) {
                    currentViewId = runningTask.id;
                    renderDetailView(currentViewId);
                }

            }
        } catch (e) {
            console.error("Corrupted data found, resetting.", e);
            tasks = [];
        }
    }


    // --- Render Logic ---

    function renderSidebar() {
        $('#list-super-important, #list-important, #list-not-important').empty();

        tasks.forEach(task => {
            const progress = calculateProgress(task.checklist);
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
                <div class="task-card ${priorityClass} ${currentViewId === task.id ? 'active' : ''}" data-id="${task.id}">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center flex-grow-1 overflow-hidden">
                            <i class="fas fa-grip-vertical drag-handle me-2" title="Drag to reorder"></i>
                            <span class="fw-bold text-truncate">${escapeHtml(task.name)}</span>
                        </div>
                        <div class="task-actions ms-2">
                             <!-- NEW: Timer running indicator -->
                            <i class="fas fa-clock text-success me-2 ${task.isTimerRunning ? '' : 'd-none'} timer-indicator"></i>
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
        initSortable();
    }

    function calculateProgress(checklist) {
        if (!checklist || checklist.length === 0) return 0;
        const doneCount = checklist.filter(item => item.done).length;
        return Math.round((doneCount / checklist.length) * 100);
    }

    function initSortable() {
        $(".task-list").sortable({
            connectWith: ".task-list",
            handle: ".drag-handle",
            placeholder: "ui-state-highlight",
            update: function (event, ui) {
                rebuildStateFromDOM();
            }
        }).disableSelection();
    }

    function rebuildStateFromDOM() {
        const newTasks = [];
        const processList = (listId, priorityName) => {
            $(`${listId} .task-card`).each(function () {
                const id = $(this).data('id');
                const task = tasks.find(t => t.id === id);
                if (task) {
                    task.priority = priorityName;
                    newTasks.push(task);
                }
            });
        };
        processList('#list-super-important', 'Super Important');
        processList('#list-important', 'Important');
        processList('#list-not-important', 'Not Important');
        tasks = newTasks;
        saveToStorage();
        renderSidebar();
    }

    function renderDetailView(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) {
            $('#empty-state').removeClass('d-none');
            $('#task-detail-view').addClass('d-none');
            return;
        }
        currentViewId = id;
        $('#empty-state').addClass('d-none');
        $('#task-detail-view').removeClass('d-none');
        $('#detail-title').text(task.name);
        $('#detail-date').text(task.dueDate || 'No Date');
        $('#detail-completed-date').text(task.completedAt || 'No Date');
        $('#detail-isCompleted').text(task.isCompleted || false);
        $('#detail-isArchive').text(task.isArchive || false);
        

        $('#detail-focusScoreSlider').val(task.focusScore || 0);

        
        $('#detail-time').text(task.dueTime || '--:--');
        $('#detail-completed-time').text(task.completedTime || '--:--');
        
        // NEW: Populate new fields
        $('#detail-project').text(task.project || 'N/A');
        $('#detail-time-estimate').text(task.timeEstimate ? `${task.timeEstimate} minutes` : 'N/A');
        $('#detail-energy-level').text(task.energyLevel || 'N/A');
        $('#detail-tags').text(task.tags || 'No tags');
        $('#detail-total-time-spent').text(formatTime(task.timeSpent));

        // NEW: Timer button visibility
        if (task.isTimerRunning) {
            $('#btn-start-task-timer').addClass('d-none');
            $('#btn-pause-task-timer').removeClass('d-none');
        } else {
            $('#btn-start-task-timer').removeClass('d-none');
            $('#btn-pause-task-timer').addClass('d-none');
        }
        // Hide both if another task timer is running
        if (tasks.some(t => t.isTimerRunning && t.id !== task.id)) {
            $('#btn-start-task-timer, #btn-pause-task-timer').addClass('d-none');
        }


        const badges = {
            'Super Important': 'bg-danger',
            'Important': 'bg-warning text-dark',
            'Not Important': 'bg-info text-dark'
        };
        $('#detail-priority-badge').removeClass().addClass(`badge rounded-pill ${badges[task.priority] || 'bg-secondary'}`).text(task.priority);
        const progress = calculateProgress(task.checklist);
        $('#detail-progress-bar').css('width', `${progress}%`);
        $('#detail-progress-text').text(`${progress}%`);
        $('#detail-description').html((unescapeHtml(task.description)) || 'No description provided.');
        
        const sortedChecklist = [...(task.checklist || [])].sort((a, b) => a.done - b.done);
        const $checklistContainer = $('#detail-checklist').empty();
        sortedChecklist.forEach(item => {
            const realIndex = task.checklist.indexOf(item);
            const itemHtml = `
                <label class="list-group-item d-flex gap-3 align-items-center ${item.done ? 'checklist-item-done' : ''}">
                    <input class="form-check-input flex-shrink-0 checklist-toggle" type="checkbox" data-real-index="${realIndex}" ${item.done ? 'checked' : ''}>
                    <span class="pt-1 form-checked-content">${escapeHtml(item.text)}</span>
                </label>`;
            $checklistContainer.append(itemHtml);
        });
        $('.task-card').removeClass('active');
        $(`.task-card[data-id="${id}"]`).addClass('active');
    }

    // --- Interaction Logic ---

    $(document).on('change', '#taskSearch', function (e) {
        e.stopPropagation();
        const searchTerm = $(this).val();
        loadTasks(searchTerm);
        renderSidebar();
    });

    $('#btn-create-task').click(function () {
        $('#modalTitle').text('Create Task');
        $('#taskForm')[0].reset();
        $('#taskId').val('');
        checklistBuffer = [];
        renderModalChecklist();
        $('#taskModal').modal('show');
    });

    $('#focusScoreSlider').on('input', function() {
        var value = $(this).val();
        $('#focusScoreValue').text(value);
    });


    $(document).on('click', '.btn-edit', function (e) {
        e.stopPropagation();
        const id = $(this).closest('.task-card').data('id');
        const task = tasks.find(t => t.id === id);
        if (task) {
            $('#modalTitle').text('Edit Task');
            $('#taskId').val(task.id);
            $('#taskName').val(task.name);
            $('#taskPriority').val(task.priority);
            $('#taskDate').val(task.dueDate);
            $('#taskTime').val(task.dueTime);
            
            $('#taskCompletedDate').val(task.completedAt);
            $('#taskCompletedTime').val(task.completedTime);
            $('#isCompleted').prop('checked', task.isCompleted || false);
            $('#isArchive').prop('checked', task.isArchive || false);
            
            $('#focusScoreSlider').val(task.focusScore || 0);
            $('#focusScoreValue').text(task.focusScore || 0);

            $('#taskDesc').html(unescapeHtml(task.description));
            // NEW: Populate new fields
            $('#taskProject').val(task.project);
            $('#taskTimeEstimate').val(task.timeEstimate);
            $('#taskTags').val(task.tags);
            $('#taskEnergyLevel').val(task.energyLevel);

            checklistBuffer = JSON.parse(JSON.stringify(task.checklist || []));
            renderModalChecklist();
            $('#taskModal').modal('show');
        }
    });

    $(document).on('click', '.btn-view, .task-card', function (e) {
        e.stopPropagation();
        const id = $(this).closest('.task-card').data('id');
        renderDetailView(id);
    });
    
    $(document).on('click', '#btn-edit-task', function(e) {
        e.stopPropagation();
        const task = tasks.find(t => t.id === currentViewId);
        $('.btn-edit[data-id="' + task.id + '"]').trigger('click');
        const editButton = $(`.task-card[data-id="${task.id}"]`).find('.btn-edit');
        editButton.trigger('click');
    });


    $(document).on('click', '.btn-delete', function (e) {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this task?")) {
            const id = $(this).closest('.task-card').data('id');
            tasks = tasks.filter(t => t.id !== id);
            saveToStorage();
            if (currentViewId === id) {
                currentViewId = null;
                $('#empty-state').removeClass('d-none');
                $('#task-detail-view').addClass('d-none');
            }
            renderSidebar();
        }
    });

    $(document).on('change', '.checklist-toggle', function () {
        if (!currentViewId) return;
        const task = tasks.find(t => t.id === currentViewId);
        const realIndex = $(this).data('real-index');
        task.checklist[realIndex].done = this.checked;
        saveToStorage();
        renderDetailView(currentViewId);
        renderSidebar();
    });

    $('#btnAddChecklist').click(addBufferItem);
    $('#newChecklistItem').keypress(function (e) {
        if (e.which === 13) {
            e.preventDefault();
            addBufferItem();
        }
    });

    function addBufferItem() {
        const text = $('#newChecklistItem').val().trim();
        if (text) {
            checklistBuffer.push({ text: text, done: false });
            $('#newChecklistItem').val('');
            renderModalChecklist();
        }
    }
    
    $(document).on('click', '.btn-remove-buffer', function () {
        const idx = $(this).data('index');
        checklistBuffer.splice(idx, 1);
        renderModalChecklist();
    });

    function renderModalChecklist() {
        const $list = $('#modal-checklist-buffer').empty();
        checklistBuffer.forEach((item, index) => {
            $list.append(`
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <i class="fas fa-grip-vertical checklist-drag-handle me-2" title="Drag to reorder"></i>
                    <span class="flex-grow-1 checklist-text">${escapeHtml(item.text)}</span>
                    <button type="button" class="btn btn-sm btn-outline-danger btn-remove-buffer" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                </li>
            `);
        });
        initChecklistSortable();
    }

    $('#btn-save-task').click(function () {
        const name = $('#taskName').val().trim();
        const priority = $('#taskPriority').val();
        if (!name || !priority) {
            alert('Please fill in required fields (Name & Priority).');
            return;
        }
        const id = $('#taskId').val();
        const existingTask = id ? tasks.find(t => t.id === parseInt(id)) : null;

        const taskData = {
            id: id ? parseInt(id) : Date.now(),
            name: name,
            priority: priority,
            createdAt: existingTask && existingTask?.createdAt? existingTask.createdAt : new Date().toLocaleString('sv-SE').slice(0, 16),
            dueDate: $('#taskDate').val(),
            completedAt: $('#taskCompletedDate').val(),
            completedTime: $('#taskCompletedTime').val(),
            dueTime: $('#taskTime').val(),
            description: escapeHtml($('#taskDesc').html()),
            checklist: checklistBuffer,
            // NEW: Save new fields
            project: $('#taskProject').val(),
            timeEstimate: parseInt($('#taskTimeEstimate').val()) || 0,
            tags: $('#taskTags').val(),
            energyLevel: $('#taskEnergyLevel').val(),
            // NEW: Preserve existing time tracking data on edit
            timeSpent: existingTask && existingTask?.timeSpent ? existingTask.timeSpent : 0,
            isTimerRunning: existingTask && existingTask?.isTimerRunning ? existingTask.isTimerRunning : false,
            currentSessionStartTime: existingTask && existingTask?.currentSessionStartTime ? existingTask.currentSessionStartTime : null,
            isCompleted: $('#isCompleted').prop('checked'),
            isArchive: $('#isArchive').prop('checked'),
            focusScore: $('#focusScoreSlider').val(),

        };

        if (id) {
            const idx = tasks.findIndex(t => t.id === parseInt(id));
            if (idx !== -1) tasks[idx] = taskData;
        } else {
            tasks.push(taskData);
        }
        saveToStorage();
        $('#taskModal').modal('hide');
        renderSidebar();

        if (currentViewId === taskData.id) {
            renderDetailView(taskData.id);
        }
    });

    // --- NEW: Timer Functionality ---

    // START a timer
    $(document).on('click', '#btn-start-task-timer', function () {
        const task = tasks.find(t => t.id === currentViewId);
        if (task && !tasks.some(t=>t.isTimerRunning)) { // Only start if no other timer is running
            task.isTimerRunning = true;
            task.currentSessionStartTime = Date.now();
            saveToStorage();
            renderDetailView(currentViewId); // Update button states
            renderSidebar(); // Show indicator in sidebar
        }
    });
    
    // PAUSE a timer
    $(document).on('click', '#btn-pause-task-timer', function () {
        const task = tasks.find(t => t.id === currentViewId);
        if (task && task.isTimerRunning) {
            const elapsed = Date.now() - task.currentSessionStartTime;
            task.timeSpent += elapsed;
            task.isTimerRunning = false;
            task.currentSessionStartTime = null;
            saveToStorage();
            renderDetailView(currentViewId); // Update buttons and total time
            renderSidebar(); // Hide indicator
        }
    });

    // Global timer to update the display in real-time
    function startActiveTimer() {
        if(activeTimerInterval) clearInterval(activeTimerInterval); // Clear any existing interval
        
        activeTimerInterval = setInterval(() => {
            const runningTask = tasks.find(t => t.isTimerRunning);
            if (runningTask && runningTask.id === currentViewId) {
                const elapsedSinceSessionStart = Date.now() - runningTask.currentSessionStartTime;
                const totalTimeToDisplay = runningTask.timeSpent + elapsedSinceSessionStart;
                $('#detail-total-time-spent').text(formatTime(totalTimeToDisplay));
            }
        }, 1000); // Update every second
    }

    function unescapeHtml(str) {
    var doc = new DOMParser().parseFromString(str, "text/html");
    return doc.documentElement.textContent || doc.body.textContent;
    }


    // // Optional: You can listen for input changes and store the content
    // document.getElementById("taskDesc").addEventListener("input", function() {
    //     var content = document.getElementById("taskDesc").innerHTML;
    //     console.log("Current Content: ", content);
    //     // Optionally store this content to localStorage or update the model, etc.
    // });

});
    // Function to execute a command in the editor
    function execCmd(command) {
        document.execCommand(command, false, null);
    }

    // You can also handle additional commands like adding links, etc.
    function addLink() {
        var url = prompt("Enter the URL:", "http://");
        if (url) {
            document.execCommand("createLink", false, url);
        }
    }

    // Function to reset the content of the editor
    function resetEditor() {
        document.getElementById("taskDesc").innerHTML = "";
    }