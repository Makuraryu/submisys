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
  const currentUser = getCurrentUser();
  const studentId = currentUser?.role === 'student' ? Number(currentUser.id) : null;
  const titleInput = form ? form.querySelector('input[name="title"]') : null;
  const descriptionInput = form ? form.querySelector('textarea[name="description"]') : null;
  const slotInput = form ? form.querySelector('input[name="defenseSlotId"]') : null;

  const loadSlots = async () => {
    if (!slotList) return;
    try {
      const slots = await request('/api/defense/slots');
      slotList.textContent = JSON.stringify(slots, null, 2);
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
    if (!form || !studentId) return;
    try {
      const { project } = await request(`/api/student/project/${studentId}`);
      applyProjectToForm(project);
    } catch (error) {
      console.error('Failed to load student project', error);
    }
  };

  if (form) {
    if (!studentId) {
      if (studentInfo) {
        studentInfo.textContent = '请先登录学生账号后再访问本页面。';
      }
      form.querySelectorAll('input, textarea, button').forEach((el) => {
        el.disabled = true;
      });
    } else if (studentInfo) {
      studentInfo.textContent = `当前学生ID：${studentId}`;
    }
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!studentId) return;
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

  const currentUser = getCurrentUser();
  const teacherId = currentUser?.role === 'teacher' ? currentUser.id : null;

  if (!teacherId) {
    if (teacherInfo) {
      teacherInfo.textContent = '请先使用教师账号登录后再访问本页面。';
    }
    if (refreshSlotsBtn) {
      refreshSlotsBtn.disabled = true;
    }
    if (scoreForm) {
      scoreForm.querySelectorAll('input, textarea, button, select').forEach((el) => {
        el.disabled = true;
      });
    }
    return;
  }

  if (teacherInfo) {
    teacherInfo.textContent = `当前教师ID：${teacherId}`;
  }

  const loadSlots = async () => {
    if (!slotOutput) return;
    try {
      const slots = await request(`/api/teacher/slots/${teacherId}`);
      slotOutput.textContent = JSON.stringify(slots, null, 2);
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

  let refreshSlots = () => {};
  let refreshProjects = () => {};

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
      try {
        const response = await request('/api/admin/slot/new', {
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
        slotList.textContent = JSON.stringify(slots, null, 2);
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
        projectList.textContent = JSON.stringify(projects, null, 2);
      } catch (error) {
        projectList.textContent = error.message;
      }
    };
    projectListBtn.addEventListener('click', loadProjects);
    refreshProjects = loadProjects;
    loadProjects();
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
