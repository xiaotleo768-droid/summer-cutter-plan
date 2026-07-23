const storageKey = "summer-mission-cutter-plan-v1";
const logic = window.CutterLogic;

let plan = loadPlan();
let activeMode = "edit";
let taskDialogState = null;

const dom = {
  addColumnButton: document.querySelector("#addColumnButton"),
  backToEditButton: document.querySelector("#backToEditButton"),
  board: document.querySelector("#taskBoard"),
  columnColorInput: document.querySelector("#columnColorInput"),
  columnDialog: document.querySelector("#columnDialog"),
  columnForm: document.querySelector("#columnForm"),
  columnShortInput: document.querySelector("#columnShortInput"),
  columnTitleInput: document.querySelector("#columnTitleInput"),
  copyDataButton: document.querySelector("#copyDataButton"),
  editView: document.querySelector("#editView"),
  inkSaverToggle: document.querySelector("#inkSaverToggle"),
  mottoInput: document.querySelector("#mottoInput"),
  overallProgress: document.querySelector("#overallProgress"),
  previewButton: document.querySelector("#previewButton"),
  printButton: document.querySelector("#printButton"),
  printPreviewButton: document.querySelector("#printPreviewButton"),
  printSheet: document.querySelector("#printSheet"),
  printView: document.querySelector("#printView"),
  resetButton: document.querySelector("#resetButton"),
  studentInput: document.querySelector("#studentInput"),
  subtitleInput: document.querySelector("#subtitleInput"),
  tabButtons: [...document.querySelectorAll(".tab-button")],
  taskCountText: document.querySelector("#taskCountText"),
  taskDialog: document.querySelector("#taskDialog"),
  taskDialogTitle: document.querySelector("#taskDialogTitle"),
  taskForm: document.querySelector("#taskForm"),
  taskInput: document.querySelector("#taskInput"),
  taskSubmitButton: document.querySelector("#taskSubmitButton"),
  titleInput: document.querySelector("#titleInput"),
  toast: document.querySelector("#toast"),
};

bindEvents();
render();

function loadPlan() {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? logic.normalizePlan(JSON.parse(saved)) : logic.createDefaultPlan();
  } catch {
    return logic.createDefaultPlan();
  }
}

function savePlan() {
  localStorage.setItem(storageKey, JSON.stringify(plan));
}

function bindEvents() {
  dom.tabButtons.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });

  dom.previewButton.addEventListener("click", () => setMode("print"));
  dom.backToEditButton.addEventListener("click", () => setMode("edit"));
  dom.printButton.addEventListener("click", printPlan);
  dom.printPreviewButton.addEventListener("click", printPlan);
  dom.inkSaverToggle.addEventListener("change", () => renderPrintSheet());

  dom.resetButton.addEventListener("click", () => {
    plan = logic.createDefaultPlan();
    persistAndRender("示例计划回来啦");
  });

  dom.copyDataButton.addEventListener("click", async () => {
    const text = JSON.stringify(plan, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      showToast("计划数据已复制");
    } catch {
      showToast("浏览器不允许复制，可打开控制台查看数据");
      console.info(text);
    }
  });

  dom.addColumnButton.addEventListener("click", () => {
    dom.columnForm.reset();
    dom.columnDialog.showModal();
    dom.columnTitleInput.focus();
  });

  dom.columnForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (event.submitter?.value === "cancel") {
      dom.columnDialog.close();
      return;
    }
    const title = dom.columnTitleInput.value.trim();
    if (!title) {
      dom.columnTitleInput.focus();
      return;
    }
    plan = logic.addColumn(plan, {
      title,
      shortLabel: dom.columnShortInput.value.trim() || title.slice(0, 1),
      color: dom.columnColorInput.value,
    });
    dom.columnDialog.close();
    persistAndRender("新纸条栏目已加入");
  });

  dom.taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (event.submitter?.value === "cancel") {
      dom.taskDialog.close();
      return;
    }
    const title = dom.taskInput.value.trim();
    if (!title || !taskDialogState) {
      dom.taskInput.focus();
      return;
    }
    if (taskDialogState.taskId) {
      plan = logic.updateTask(plan, taskDialogState.columnId, taskDialogState.taskId, title);
      showToast("任务更新好啦");
    } else {
      plan = logic.addTask(plan, taskDialogState.columnId, title);
      showToast("新任务格已加入");
    }
    taskDialogState = null;
    dom.taskDialog.close();
    persistAndRender();
  });

  [dom.titleInput, dom.subtitleInput, dom.studentInput, dom.mottoInput].forEach((input) => {
    input.addEventListener("input", () => {
      plan = logic.updatePlanMeta(plan, {
        title: dom.titleInput.value,
        subtitle: dom.subtitleInput.value,
        student: dom.studentInput.value,
        motto: dom.mottoInput.value,
      });
      savePlan();
      renderPrintSheet();
      renderProgress();
    });
  });

  dom.board.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const { action, columnId, taskId } = actionButton.dataset;

    if (action === "add-task") openTaskDialog(columnId);
    if (action === "edit-task") {
      const task = findTask(columnId, taskId);
      openTaskDialog(columnId, task);
    }
    if (action === "toggle-task") {
      plan = logic.toggleTask(plan, columnId, taskId);
      persistAndRender();
    }
    if (action === "delete-task") {
      plan = logic.deleteTask(plan, columnId, taskId);
      persistAndRender("这个任务格已拿掉");
    }
    if (action === "delete-column") {
      plan = logic.deleteColumn(plan, columnId);
      persistAndRender("栏目已删除");
    }
  });
}

function setMode(mode) {
  activeMode = mode;
  dom.editView.hidden = mode !== "edit";
  dom.printView.hidden = mode !== "print";
  dom.tabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === mode);
  });
  if (mode === "print") renderPrintSheet();
}

function persistAndRender(message) {
  plan = logic.normalizePlan(plan);
  savePlan();
  render();
  if (message) showToast(message);
}

function render() {
  dom.titleInput.value = plan.title;
  dom.subtitleInput.value = plan.subtitle;
  dom.studentInput.value = plan.student;
  dom.mottoInput.value = plan.motto;
  renderProgress();
  renderBoard();
  renderPrintSheet();
}

function renderProgress() {
  const progress = logic.getPlanProgress(plan);
  dom.overallProgress.textContent = `${progress.done}/${progress.total} 格已剪掉`;
  dom.taskCountText.textContent = `${plan.columns.length} 条彩色纸带，${progress.total} 个小任务格`;
}

function renderBoard() {
  dom.board.innerHTML = plan.columns.map(renderColumn).join("");
}

function renderColumn(column) {
  const tasks = column.tasks.map((task, index) => renderTask(column, task, index)).join("");
  const deleteButton = plan.columns.length > 1
    ? `<button class="icon-button subtle" type="button" data-action="delete-column" data-column-id="${column.id}" aria-label="删除${escapeHtml(column.title)}">×</button>`
    : "";
  return `
    <article class="task-column color-${column.color}">
      <header class="column-head">
        <div class="column-label">${escapeHtml(column.shortLabel)}</div>
        <div>
          <h2>${escapeHtml(column.title)}</h2>
          <p>${logic.getColumnProgress(column)}</p>
        </div>
        ${deleteButton}
      </header>
      <div class="task-list">
        ${tasks || `<p class="empty-column">还没有任务格，点下面加一个吧。</p>`}
      </div>
      <button class="add-task-button" type="button" data-action="add-task" data-column-id="${column.id}">+ 添加一格</button>
    </article>
  `;
}

function renderTask(column, task, index) {
  return `
    <div class="task-row ${task.done ? "is-done" : ""}">
      <span class="task-index">${index + 1}</span>
      <span class="task-title">${escapeHtml(task.title)}</span>
      <button class="cut-button" type="button" data-action="toggle-task" data-column-id="${column.id}" data-task-id="${task.id}">${task.done ? "已剪" : "剪掉"}</button>
      <button class="icon-button" type="button" data-action="edit-task" data-column-id="${column.id}" data-task-id="${task.id}" aria-label="编辑${escapeHtml(task.title)}">✎</button>
      <button class="icon-button" type="button" data-action="delete-task" data-column-id="${column.id}" data-task-id="${task.id}" aria-label="删除${escapeHtml(task.title)}">×</button>
    </div>
  `;
}

function renderPrintSheet() {
  dom.printSheet.classList.toggle("ink-saver", dom.inkSaverToggle.checked);
  dom.printSheet.innerHTML = `
    <div class="print-page">
      <header class="sheet-hero">
        <div>
          <h2>${escapeHtml(plan.title)}</h2>
          <p>${escapeHtml(plan.subtitle)}</p>
        </div>
        <div class="name-card">
          <span>姓名：</span>
          <strong>${escapeHtml(plan.student)}</strong>
        </div>
      </header>
      <p class="sheet-motto">${escapeHtml(plan.motto)}</p>
      <section class="strip-grid">
        ${plan.columns.map(renderPrintColumn).join("")}
      </section>
    </div>
  `;
}

function renderPrintColumn(column) {
  const tasks = column.tasks.map((task, index) => `
    <li class="${task.done ? "is-done" : ""}">
      <span>${index + 1}</span>
      <strong>${escapeHtml(task.title)}</strong>
    </li>
  `).join("");
  return `
    <article class="print-strip color-${column.color}">
      <h3>${escapeHtml(column.title)}</h3>
      <ol>${tasks}</ol>
    </article>
  `;
}

function openTaskDialog(columnId, task) {
  taskDialogState = { columnId, taskId: task?.id || null };
  dom.taskDialogTitle.textContent = task ? "编辑任务" : "添加任务";
  dom.taskSubmitButton.textContent = task ? "保存" : "添加";
  dom.taskInput.value = task?.title || "";
  dom.taskDialog.showModal();
  dom.taskInput.focus();
}

function printPlan() {
  renderPrintSheet();
  setMode("print");
  window.print();
}

function findTask(columnId, taskId) {
  const column = plan.columns.find((item) => item.id === columnId);
  return column?.tasks.find((task) => task.id === taskId);
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    dom.toast.classList.remove("is-visible");
  }, 1800);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
