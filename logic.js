(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CutterLogic = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const fallbackSubtitle = "每天进步一点点，暑假大变样！";
  const fallbackPlan = {
    title: "我的暑假咔嚓计划",
    subtitle: fallbackSubtitle,
    student: "我的暑假口号",
    motto: "完成一项，剪掉一格",
    columns: [
      {
        id: "english",
        title: "英语五上",
        shortLabel: "英",
        color: "yellow",
        tasks: ["U1 单词", "U1 课文", "U2 单词", "U2 课文", "U3 单词", "U3 课文", "U4 单词", "U4 课文"].map(makeTask),
      },
      {
        id: "recite",
        title: "背诵",
        shortLabel: "背",
        color: "green",
        tasks: ["《观潮》", "《走月亮》", "古诗三首"].map(makeTask),
      },
      {
        id: "writing",
        title: "作文",
        shortLabel: "作",
        color: "pink",
        tasks: ["推荐一个好地方", "小小动物园", "写观察日记", "我和____过一天"].map(makeTask),
      },
      {
        id: "reading",
        title: "阅读理解",
        shortLabel: "阅",
        color: "blue",
        tasks: ["练习 01", "练习 02", "练习 03", "练习 04", "练习 05", "练习 06", "练习 07", "练习 08", "练习 09", "练习 10"].map(makeTask),
      },
    ],
  };

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function makeTask(title, index) {
    return {
      id: uid(`task${typeof index === "number" ? index : ""}`),
      title: String(title || "").trim(),
      done: false,
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createDefaultPlan() {
    return normalizePlan(clone(fallbackPlan));
  }

  function normalizePlan(input) {
    const source = input && typeof input === "object" ? input : {};
    const columns = Array.isArray(source.columns) ? source.columns : fallbackPlan.columns;
    return {
      title: textOr(source.title, fallbackPlan.title),
      subtitle: textOr(source.subtitle, fallbackSubtitle),
      student: cleanText(source.student),
      motto: textOr(source.motto, fallbackPlan.motto),
      columns: columns.map(normalizeColumn).filter(Boolean),
    };
  }

  function normalizeColumn(column, index) {
    if (!column || typeof column !== "object") return null;
    const title = textOr(column.title, `栏目 ${index + 1}`);
    const shortLabel = textOr(column.shortLabel, title.slice(0, 1));
    const tasks = Array.isArray(column.tasks) ? column.tasks : [];
    return {
      id: textOr(column.id, uid("col")),
      title,
      shortLabel: shortLabel.slice(0, 2),
      color: textOr(column.color, "green"),
      tasks: tasks.map(normalizeTask).filter(Boolean),
    };
  }

  function normalizeTask(task) {
    if (!task || typeof task !== "object") return null;
    const title = String(task.title || "").trim();
    if (!title) return null;
    return {
      id: textOr(task.id, uid("task")),
      title,
      done: Boolean(task.done),
    };
  }

  function textOr(value, fallback) {
    const text = String(value || "").trim();
    return text || fallback;
  }

  function cleanText(value) {
    return String(value || "").trim();
  }

  function updatePlanMeta(plan, patch) {
    return normalizePlan({ ...plan, ...patch });
  }

  function addTask(plan, columnId, title) {
    return updateColumn(plan, columnId, (column) => ({
      ...column,
      tasks: [...column.tasks, makeTask(title)],
    }));
  }

  function updateTask(plan, columnId, taskId, title) {
    return updateColumn(plan, columnId, (column) => ({
      ...column,
      tasks: column.tasks.map((task) => (task.id === taskId ? { ...task, title: textOr(title, task.title) } : task)),
    }));
  }

  function toggleTask(plan, columnId, taskId) {
    return updateColumn(plan, columnId, (column) => ({
      ...column,
      tasks: column.tasks.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)),
    }));
  }

  function deleteTask(plan, columnId, taskId) {
    return updateColumn(plan, columnId, (column) => ({
      ...column,
      tasks: column.tasks.filter((task) => task.id !== taskId),
    }));
  }

  function addColumn(plan, column) {
    const title = textOr(column && column.title, "新栏目");
    const nextColumn = {
      id: uid("col"),
      title,
      shortLabel: textOr(column && column.shortLabel, title.slice(0, 1)).slice(0, 2),
      color: textOr(column && column.color, "green"),
      tasks: [],
    };
    return normalizePlan({ ...plan, columns: [...plan.columns, nextColumn] });
  }

  function deleteColumn(plan, columnId) {
    return normalizePlan({ ...plan, columns: plan.columns.filter((column) => column.id !== columnId) });
  }

  function updateColumn(plan, columnId, updater) {
    return normalizePlan({
      ...plan,
      columns: plan.columns.map((column) => (column.id === columnId ? updater(column) : column)),
    });
  }

  function getColumnProgress(column) {
    const total = column.tasks.length;
    const done = column.tasks.filter((task) => task.done).length;
    return `${done}/${total} 已完成`;
  }

  function getPlanProgress(plan) {
    const tasks = plan.columns.flatMap((column) => column.tasks);
    const done = tasks.filter((task) => task.done).length;
    return { done, total: tasks.length };
  }

  return {
    addColumn,
    addTask,
    createDefaultPlan,
    deleteColumn,
    deleteTask,
    getColumnProgress,
    getPlanProgress,
    normalizePlan,
    toggleTask,
    updateColumn,
    updatePlanMeta,
    updateTask,
  };
});
