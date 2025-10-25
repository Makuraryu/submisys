const formToJson = (form) => {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
};

const request = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    credentials: 'include',
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

const withTimestamp = (message) => {
  const stamp = new Date().toLocaleString();
  return message ? `${message} (${stamp})` : `(${stamp})`;
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
    empty.className = 'text-sm text-slate-500';
    empty.textContent = emptyMessage;
    container.appendChild(empty);
    return;
  }
  const table = document.createElement('table');
  table.className = 'w-full border border-slate-200 rounded-lg overflow-hidden text-sm';
  const thead = document.createElement('thead');
  thead.className = 'bg-slate-100 text-left text-slate-600';
  const headRow = document.createElement('tr');
  columns.forEach((column) => {
    const th = document.createElement('th');
    th.className = 'px-3 py-2 font-medium';
    th.textContent = column.label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  const tbody = document.createElement('tbody');
  tbody.className = 'divide-y divide-slate-100';
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50';
    columns.forEach((column) => {
      const td = document.createElement('td');
      let rawValue = '';
      if (typeof column.render === 'function') {
        rawValue = column.render(row);
      } else if (typeof column.value === 'function') {
        rawValue = column.value(row);
      } else if (column.key) {
        rawValue = row[column.key];
      }
      td.className = 'px-3 py-2 text-slate-700';
      if (rawValue instanceof HTMLElement) {
        td.appendChild(rawValue);
      } else {
        td.textContent = rawValue === undefined || rawValue === null ? '' : String(rawValue);
      }
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
  const passwordInput = document.querySelector('#login-password');
  const toggleBtn = document.querySelector('#toggle-password');
  if (!form) return;
  const redirectMap = {
    student: '/student.html',
    teacher: '/teacher.html',
    admin: '/admin.html',
  };
  if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener('click', () => {
      const isPassword = passwordInput.getAttribute('type') === 'password';
      passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
      toggleBtn.textContent = isPassword ? '隐藏' : '显示';
    });
  }
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
      result.textContent = withTimestamp(JSON.stringify(response, null, 2));
    } catch (error) {
      result.textContent = withTimestamp(error.message);
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
  const studentName = currentUser.username ?? '';
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
      slotList.textContent = withTimestamp(error.message);
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
      if (studentName) {
        studentInfo.textContent = `当前学生用户：${studentName}`;
      } else {
        studentInfo.textContent = `当前学生ID：${studentId}`;
      }
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
        result.textContent = withTimestamp(response.message);
        await loadSlots();
        await loadProject();
      } catch (error) {
        result.textContent = withTimestamp(error.message);
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

  const teacherName = currentUser.username ?? '';

  if (teacherInfo) {
    teacherInfo.textContent = teacherName ? `当前教师用户：${teacherName}` : `当前教师ID：${teacherId}`;
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
            label: '项目(学生ID)',
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
      slotOutput.textContent = withTimestamp(error.message);
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
      payload.studentId = Number(payload.studentId);
      try {
        const response = await request('/api/teacher/score', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        scoreResult.textContent = withTimestamp(response.message);
        await loadSlots();
      } catch (error) {
        scoreResult.textContent = withTimestamp(error.message);
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
  const slotTeacherSelect = document.querySelector('#slot-teachers');
  const logoutBtn = document.querySelector('#logout-button');
  bindLogout(logoutBtn);

  const currentUser = requireRole('admin');
  if (!currentUser) return;

  const adminName = currentUser.username ?? '';

  if (adminInfo) {
    adminInfo.textContent = adminName ? `当前管理员用户：${adminName}` : `当前管理员ID：${currentUser.id}`;
  }

  let refreshSlots = () => {};
  let refreshProjects = () => {};
  let refreshUsers = () => {};
  let teacherOptions = [];

  const populateTeacherSelect = () => {
    if (!slotTeacherSelect) return;
    slotTeacherSelect.innerHTML = '';
    teacherOptions.forEach((teacher) => {
      const option = document.createElement('option');
      option.value = String(teacher.id);
      option.textContent = `${teacher.username} (#${teacher.id})`;
      slotTeacherSelect.appendChild(option);
    });
  };

  const getSelectedTeacherIds = () => {
    if (!slotTeacherSelect) return [];
    return Array.from(slotTeacherSelect.selectedOptions).map((opt) => Number(opt.value));
  };

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
        approvalResult.textContent = withTimestamp(response.message);
        refreshProjects();
      } catch (error) {
        approvalResult.textContent = withTimestamp(error.message);
      }
    });
  }

  if (slotForm) {
    slotForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = formToJson(slotForm);
      payload.id = payload.id ? Number(payload.id) : undefined;
      payload.teacherIds = getSelectedTeacherIds();
      try {
        const response = await request('/api/admin/slot/save', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        slotResult.textContent = withTimestamp(response.message);
        slotForm.reset();
        refreshSlots();
      } catch (error) {
        slotResult.textContent = withTimestamp(error.message);
      }
    });
  }

  if (slotListBtn && slotList) {
    const handleDeleteSlot = async (slotId) => {
      try {
        const response = await request('/api/admin/slot/delete', {
          method: 'POST',
          body: JSON.stringify({ id: slotId }),
        });
        slotResult.textContent = withTimestamp(response.message);
        refreshSlots();
      } catch (error) {
        slotResult.textContent = withTimestamp(error.message);
      }
    };

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
            {
              label: '教师ID列表',
              value: (row) => (row.teacherIds && row.teacherIds.length ? row.teacherIds.join(', ') : '无'),
            },
            { label: '项目数量', key: 'projectCount' },
            {
              label: '操作',
              render: (row) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = '删除';
                btn.className = 'text-sm text-red-600 hover:text-red-800';
                btn.addEventListener('click', () => handleDeleteSlot(Number(row.id)));
                return btn;
              },
            },
          ],
          slots,
          '暂无答辩时间'
        );
      } catch (error) {
        slotList.textContent = withTimestamp(error.message);
      }
    };
    slotListBtn.addEventListener('click', loadSlots);
    refreshSlots = loadSlots;
    loadSlots();
  }

  if (projectListBtn && projectList) {
    const handleDeleteProject = async (projectId) => {
      try {
        const response = await request('/api/admin/projects/delete', {
          method: 'POST',
          body: JSON.stringify({ projectId }),
        });
        approvalResult.textContent = withTimestamp(response.message);
        refreshProjects();
      } catch (error) {
        approvalResult.textContent = withTimestamp(error.message);
      }
    };

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
            {
              label: '操作',
              render: (row) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = '删除';
                btn.className = 'text-sm text-red-600 hover:text-red-800';
                btn.addEventListener('click', () => handleDeleteProject(Number(row.id)));
                return btn;
              },
            },
          ],
          projects,
          '暂无学生提交'
        );
      } catch (error) {
        projectList.textContent = withTimestamp(error.message);
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
          userFormResult.textContent = withTimestamp(response.message);
        }
        refreshUsers();
      } catch (error) {
        if (userFormResult) {
          userFormResult.textContent = withTimestamp(error.message);
        }
      }
    });
  }

  if (userListBtn && userList) {
    const handleDeleteUser = async (userId) => {
      try {
        const response = await request('/api/admin/users/delete', {
          method: 'POST',
          body: JSON.stringify({ id: userId }),
        });
        if (userFormResult) {
          userFormResult.textContent = withTimestamp(response.message);
        }
        refreshUsers();
      } catch (error) {
        if (userFormResult) {
          userFormResult.textContent = withTimestamp(error.message);
        }
      }
    };

    const loadUsers = async () => {
      try {
        const users = await request('/api/admin/users');
        teacherOptions = users.filter((user) => user.role === 'teacher');
        populateTeacherSelect();
        renderTable(
          userList,
          [
            { label: 'ID', key: 'id' },
            { label: '用户名', key: 'username' },
            { label: '角色', key: 'role' },
            {
              label: '操作',
              render: (row) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = '删除';
                btn.className = 'text-sm text-red-600 hover:text-red-800';
                btn.addEventListener('click', () => handleDeleteUser(Number(row.id)));
                return btn;
              },
            },
          ],
          users,
          '暂无用户'
        );
      } catch (error) {
        userList.textContent = withTimestamp(error.message);
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
