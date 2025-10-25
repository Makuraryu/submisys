const formToJson = (form) => {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
};

const request = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || '请求失败');
  }
  return payload;
};

const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem('currentUser');
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Failed to parse currentUser', error);
    return null;
  }
};

const redirectToLogin = () => {
  window.location.href = '/index.html';
};

const requireRole = (role) => {
  const user = getCurrentUser();
  if (!user || user.role !== role) {
    redirectToLogin();
    return null;
  }
  return user;
};

const bindLogout = (button) => {
  if (!button) return;
  button.addEventListener('click', async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (error) {
      console.warn('logout failed', error);
    } finally {
      localStorage.removeItem('currentUser');
      redirectToLogin();
    }
  });
};

const renderTable = (container, columns, rows, emptyMessage = '暂无数据') => {
  if (!container) return;
  container.innerHTML = '';
  if (!rows || rows.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = emptyMessage;
    container.appendChild(empty);
    return;
  }
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  columns.forEach((column) => {
    const th = document.createElement('th');
    th.textContent = column.label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  const tbody = document.createElement('tbody');
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    columns.forEach((column) => {
      const td = document.createElement('td');
      const rawValue =
        typeof column.value === 'function'
          ? column.value(row)
          : column.key
            ? row[column.key]
            : '';
      td.textContent = rawValue === undefined || rawValue === null ? '' : String(rawValue);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(thead);
  table.appendChild(tbody);
  container.appendChild(table);
};

const initLogin = () => {
  const form = document.querySelector('#login-form');
  const result = document.querySelector('#login-result');
  if (!form) return;
  const redirectMap = {
    student: '/student.html',
    teacher: '/teacher.html',
    admin: '/admin.html',
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const payload = formToJson(form);
      const response = await request('/api/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      localStorage.setItem('currentUser', JSON.stringify(response));
      const target = redirectMap[response.role];
      if (target) {
        window.location.href = target;
        return;
      }
      result.textContent = JSON.stringify(response, null, 2);
    } catch (error) {
      result.textContent = error.message;
    }
  });
};

const initStudent = () => {
  const form = document.querySelector('#project-form');
  const result = document.querySelector('#project-result');
  const slotList = document.querySelector('#slot-list');
  const studentInfo = document.querySelector('#student-info');
  const logoutBtn = document.querySelector('#logout-button');
  bindLogout(logoutBtn);
  const currentUser = requireRole('student');
  if (!currentUser) return;
  const studentId = Number(currentUser.id);
  const titleInput = form ? form.querySelector('input[name="title"]') : null;
  const descriptionInput = form ? form.querySelector('textarea[name="description"]') : null;
  const slotInput = form ? form.querySelector('input[name="defenseSlotId"]') : null;

  const loadSlots = async () => {
    if (!slotList) return;
    try {
      const slots = await request('/api/defense/slots');
      renderTable(
        slotList,
        [
          { label: 'ID', key: 'id' },
          { label: '时间', value: (row) => row.slotTime },
          { label: '地点', key: 'location' },
          { label: '状态', key: 'status' },
        ],
        slots,
        '暂无答辩时间'
      );
    } catch (error) {
      slotList.textContent = error.message;
    }
  };

  const applyProjectToForm = (project) => {
    if (!form) return;
    if (titleInput) {
      titleInput.value = project?.title ?? '';
    }
    if (descriptionInput) {
      descriptionInput.value = project?.description ?? '';
    }
    if (slotInput) {
      slotInput.value = project?.defenseSlotId ? String(project.defenseSlotId) : '';
    }
  };

  const loadProject = async () => {
    if (!form) return;
    try {
      const { project } = await request(`/api/student/project/${studentId}`);
      applyProjectToForm(project);
    } catch (error) {
      console.error('Failed to load student project', error);
    }
  };

  if (form) {
    if (studentInfo) {
      studentInfo.textContent = `当前学生ID：${studentId}`;
    }
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = formToJson(form);
      payload.studentId = studentId;
      payload.defenseSlotId = payload.defenseSlotId ? Number(payload.defenseSlotId) : undefined;
      try {
        const response = await request('/api/student/submit', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        result.textContent = response.message;
        await loadSlots();
        await loadProject();
      } catch (error) {
        result.textContent = error.message;
      }
    });
  }

  loadSlots();
  loadProject();
};

const initTeacher = () => {
  const slotOutput = document.querySelector('#teacher-slots');
  const refreshSlotsBtn = document.querySelector('#refresh-teacher-slots');
  const scoreForm = document.querySelector('#score-form');
  const scoreResult = document.querySelector('#score-result');
  const teacherInfo = document.querySelector('#teacher-info');
  const logoutBtn = document.querySelector('#logout-button');
  bindLogout(logoutBtn);

  const currentUser = requireRole('teacher');
  if (!currentUser) return;
  const teacherId = Number(currentUser.id);

  if (teacherInfo) {
    teacherInfo.textContent = `当前教师ID：${teacherId}`;
  }

  const loadSlots = async () => {
    if (!slotOutput) return;
    try {
      const slots = await request(`/api/teacher/slots/${teacherId}`);
      renderTable(
        slotOutput,
        [
          { label: '答辩ID', key: 'slotId' },
          { label: '时间', value: (row) => row.slotTime },
          { label: '地点', key: 'location' },
          { label: '状态', key: 'status' },
          {
            label: '项目',
            value: (row) => {
              if (!row.projects || row.projects.length === 0) return '暂无项目';
              const titles = row.projects
                .filter((project) => project.projectId)
                .map((project) => `${project.projectTitle || '未命名'}(#${project.studentId})`);
              return titles.length > 0 ? titles.join('、') : '暂无项目';
            },
          },
        ],
        slots,
        '暂无答辩安排'
      );
    } catch (error) {
      slotOutput.textContent = error.message;
    }
  };

  if (refreshSlotsBtn) {
    refreshSlotsBtn.addEventListener('click', loadSlots);
    loadSlots();
  }

  if (scoreForm) {
    scoreForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = formToJson(scoreForm);
      payload.teacherId = teacherId;
      payload.projectId = Number(payload.projectId);
      try {
        const response = await request('/api/teacher/score', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        scoreResult.textContent = response.message;
        await loadSlots();
      } catch (error) {
        scoreResult.textContent = error.message;
      }
    });
  }
};

const initAdmin = () => {
  const approvalForm = document.querySelector('#approval-form');
  const approvalResult = document.querySelector('#approval-result');
  const slotForm = document.querySelector('#slot-form');
  const slotResult = document.querySelector('#slot-result');
  const slotListBtn = document.querySelector('#load-admin-slots');
  const slotList = document.querySelector('#admin-slots');
  const projectListBtn = document.querySelector('#load-projects');
  const projectList = document.querySelector('#project-list');
  const adminInfo = document.querySelector('#admin-info');
  const userForm = document.querySelector('#user-form');
  const userFormResult = document.querySelector('#user-form-result');
  const userList = document.querySelector('#user-list');
  const userListBtn = document.querySelector('#load-users');
  const logoutBtn = document.querySelector('#logout-button');
  bindLogout(logoutBtn);

  const currentUser = requireRole('admin');
  if (!currentUser) return;

  if (adminInfo) {
    adminInfo.textContent = `当前管理员ID：${currentUser.id}`;
  }

  let refreshSlots = () => {};
  let refreshProjects = () => {};
  let refreshUsers = () => {};

  if (approvalForm) {
    approvalForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = formToJson(approvalForm);
      payload.projectId = Number(payload.projectId);
      try {
        const response = await request('/api/admin/approve', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        approvalResult.textContent = response.message;
        refreshProjects();
      } catch (error) {
        approvalResult.textContent = error.message;
      }
    });
  }

  if (slotForm) {
    slotForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = formToJson(slotForm);
      payload.id = payload.id ? Number(payload.id) : undefined;
      try {
        const response = await request('/api/admin/slot/save', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        slotResult.textContent = response.message;
        slotForm.reset();
        refreshSlots();
      } catch (error) {
        slotResult.textContent = error.message;
      }
    });
  }

  if (slotListBtn && slotList) {
    const loadSlots = async () => {
      try {
        const slots = await request('/api/admin/slots');
        renderTable(
          slotList,
          [
            { label: 'ID', key: 'id' },
            { label: '时间', value: (row) => row.slotTime },
            { label: '地点', key: 'location' },
            { label: '状态', key: 'status' },
            { label: '教师数量', key: 'teacherCount' },
            { label: '项目数量', key: 'projectCount' },
          ],
          slots,
          '暂无答辩时间'
        );
      } catch (error) {
        slotList.textContent = error.message;
      }
    };
    slotListBtn.addEventListener('click', loadSlots);
    refreshSlots = loadSlots;
    loadSlots();
  }

  if (projectListBtn && projectList) {
    const loadProjects = async () => {
      try {
        const projects = await request('/api/admin/projects');
        renderTable(
          projectList,
          [
            { label: '项目ID', key: 'id' },
            {
              label: '学生',
              value: (row) => `${row.studentName ?? ''} (#${row.studentId})`,
            },
            { label: '标题', key: 'title' },
            {
              label: '答辩时间ID',
              value: (row) => (row.defenseSlotId ? row.defenseSlotId : '未选择'),
            },
            { label: '状态', key: 'status' },
          ],
          projects,
          '暂无学生提交'
        );
      } catch (error) {
        projectList.textContent = error.message;
      }
    };
    projectListBtn.addEventListener('click', loadProjects);
    refreshProjects = loadProjects;
    loadProjects();
  }

  if (userForm) {
    userForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = formToJson(userForm);
      payload.id = Number(payload.id);
      try {
        const response = await request('/api/admin/users/save', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (userFormResult) {
          userFormResult.textContent = response.message;
        }
        refreshUsers();
      } catch (error) {
        if (userFormResult) {
          userFormResult.textContent = error.message;
        }
      }
    });
  }

  if (userListBtn && userList) {
    const loadUsers = async () => {
      try {
        const users = await request('/api/admin/users');
        renderTable(
          userList,
          [
            { label: 'ID', key: 'id' },
            { label: '用户名', key: 'username' },
            { label: '角色', key: 'role' },
          ],
          users,
          '暂无用户'
        );
      } catch (error) {
        userList.textContent = error.message;
      }
    };
    userListBtn.addEventListener('click', loadUsers);
    refreshUsers = loadUsers;
    loadUsers();
  }
};

const role = document.body.dataset.role;
if (role === 'login') {
  initLogin();
} else if (role === 'student') {
  initStudent();
} else if (role === 'teacher') {
  initTeacher();
} else if (role === 'admin') {
  initAdmin();
}
