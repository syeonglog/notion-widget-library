"use strict";

window.LittleThings = (() => {

    const STORAGE_KEY = "littleThingsTasks_v1";
    const UPDATE_EVENT = "little-things-updated";

    const CATEGORIES = [
        "Personal",
        "Study",
        "Career",
        "Money",
        "Life"
    ];

    const PRIORITIES = {
        high: 0,
        medium: 1,
        low: 2
    };

    /* ======================================
       Date Utilities
    ====================================== */

    function today() {
        return formatLocalDate(new Date());
    }

    function formatLocalDate(value) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, "0");
        const day = String(value.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function addDays(dateString, amount) {
        const [y, m, d] = dateString.split("-").map(Number);
        const result = new Date(y, m - 1, d + amount, 12);

        return formatLocalDate(result);
    }

    function weekday(dateString) {
        const [y, m, d] = dateString.split("-").map(Number);

        return new Date(y, m - 1, d, 12).getDay();
    }

    function formatDate(dateString) {
        if (!dateString) return "Someday";

        const [y, m, d] = dateString.split("-").map(Number);

        return new Date(y, m - 1, d).toLocaleDateString(
            "ko-KR",
            {
                month: "short",
                day: "numeric"
            }
        );
    }

    /* ======================================
       Storage
    ====================================== */

    function createId() {
        if (crypto?.randomUUID) {
            return crypto.randomUUID();
        }

        return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    function normalizeTask(task) {
        return {
            id: String(task.id || createId()),
            title: task.title || "",
            category: task.category || "Personal",
            priority: task.priority || "medium",
            dueDate: task.dueDate ?? null,

            repeat: task.repeat || "none",

            completed: Boolean(task.completed),
            completedAt: task.completedAt || null,

            occurrences: task.occurrences || {},
            exceptions: task.exceptions || [],

            createdAt: task.createdAt || new Date().toISOString()
        };
    }

    function loadTasks() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);

            if (!saved) return [];

            const parsed = JSON.parse(saved);

            if (!Array.isArray(parsed)) return [];

            return parsed
                .filter(task => task && typeof task.title === "string")
                .map(normalizeTask);

        } catch (error) {
            console.error("Failed to load tasks:", error);
            return [];
        }
    }

    function saveTasks(tasks) {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(tasks)
            );

            window.dispatchEvent(new Event(UPDATE_EVENT));

            return true;

        } catch (error) {
            console.error("Failed to save tasks:", error);
            return false;
        }
    }

    /* ======================================
       Recurring Tasks
    ====================================== */

    function occursOn(task, dateString) {

        if (!task.dueDate) return false;

        if (dateString < task.dueDate) return false;

        if (task.exceptions.includes(dateString)) {
            return false;
        }

        const day = weekday(dateString);

        switch (task.repeat) {

            case "daily":
                return true;

            case "weekdays":
                return day >= 1 && day <= 5;

            case "weekends":
                return day === 0 || day === 6;

            case "weekly":
                return day === weekday(task.dueDate);

            default:
                return dateString === task.dueDate;
        }
    }

    function isCompleted(task, dateString) {

        if (task.repeat === "none") {
            return task.completed;
        }

        return Boolean(task.occurrences[dateString]);
    }

    function toggleTask(tasks, id, dateString) {

        const task = tasks.find(item => item.id === id);

        if (!task) return;

        if (task.repeat === "none") {

            task.completed = !task.completed;

            task.completedAt = task.completed
                ? new Date().toISOString()
                : null;

        } else {

            if (task.occurrences[dateString]) {
                delete task.occurrences[dateString];
            } else {
                task.occurrences[dateString] =
                    new Date().toISOString();
            }
        }

        saveTasks(tasks);
    }

    /* ======================================
       View Calculation
    ====================================== */

    function getEntries(tasks, view) {

        const current = today();
        const tomorrow = addDays(current, 1);

        const entries = [];

        tasks.forEach(task => {

            if (task.repeat === "none") {

                const date = task.dueDate;

                let matches = false;

                switch (view) {

                    case "today":
                        matches = date === current;
                        break;

                    case "tomorrow":
                        matches = date === tomorrow && !task.completed;
                        break;

                    case "someday":
                        matches = date === null && !task.completed;
                        break;

                    case "overdue":
                        matches =
                            date !== null &&
                            date < current &&
                            !task.completed;
                        break;

                    case "history":
                        matches = task.completed;
                        break;
                }

                if (matches) {
                    entries.push({
                        task,
                        date,
                        completed: task.completed
                    });
                }

                return;
            }

            // Repeating tasks

            if (view === "today" || view === "tomorrow") {

                const target = view === "today"
                    ? current
                    : tomorrow;

                if (occursOn(task, target)) {
                    entries.push({
                        task,
                        date: target,
                        completed: isCompleted(task, target)
                    });
                }
            }

            if (view === "history") {

                Object.entries(task.occurrences).forEach(
                    ([date, completedAt]) => {

                        if (completedAt) {
                            entries.push({
                                task,
                                date,
                                completed: true
                            });
                        }
                    }
                );
            }

            if (view === "overdue") {

                // 최근 30일간 미완료된 반복 일정
                for (let i = 1; i <= 30; i++) {

                    const date = addDays(current, -i);

                    if (
                        occursOn(task, date) &&
                        !isCompleted(task, date)
                    ) {
                        entries.push({
                            task,
                            date,
                            completed: false
                        });
                    }
                }
            }
        });

        return entries.sort((a, b) => {

            if (view === "history") {
                return (b.date || "").localeCompare(a.date || "");
            }

            if (a.completed !== b.completed) {
                return Number(a.completed) - Number(b.completed);
            }

            const pa = PRIORITIES[a.task.priority] ?? 2;
            const pb = PRIORITIES[b.task.priority] ?? 2;

            return pa - pb;
        });
    }

    function getTodayProgress(tasks) {

        const current = today();

        const active = tasks.filter(task =>
            occursOn(task, current)
        );

        const completed = active.filter(task =>
            isCompleted(task, current)
        );

        return {
            total: active.length,
            completed: completed.length,
            percent: active.length
                ? Math.round(completed.length / active.length * 100)
                : 0
        };
    }

    function getSummary(tasks) {

        const todayEntries = getEntries(tasks, "today");
        const tomorrowEntries = getEntries(tasks, "tomorrow");
        const somedayEntries = getEntries(tasks, "someday");

        return {
            today: todayEntries.filter(e => !e.completed).length,
            tomorrow: tomorrowEntries.filter(e => !e.completed).length,
            someday: somedayEntries.length
        };
    }

    function deleteTask(tasks, id, dateString, scope = "all") {

        const index = tasks.findIndex(task => task.id === id);

        if (index < 0) return;

        const task = tasks[index];

        if (scope === "one" && task.repeat !== "none") {

            if (!task.exceptions.includes(dateString)) {
                task.exceptions.push(dateString);
            }

            delete task.occurrences[dateString];

        } else {
            tasks.splice(index, 1);
        }

        saveTasks(tasks);
    }

    return {
        STORAGE_KEY,
        UPDATE_EVENT,
        CATEGORIES,

        today,
        addDays,
        formatDate,
        createId,

        loadTasks,
        saveTasks,

        occursOn,
        isCompleted,
        toggleTask,
        deleteTask,

        getEntries,
        getTodayProgress,
        getSummary
    };

})();