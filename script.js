// ===== Avatar Upload =====
const avatarUpload = document.getElementById('avatarUpload');
const avatarImg = document.getElementById('avatarImg');
const avatarPlaceholder = document.getElementById('avatarPlaceholder');

avatarUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    avatarImg.src = ev.target.result;
    avatarImg.style.display = 'block';
    avatarPlaceholder.style.display = 'none';
    saveData();
  };
  reader.readAsDataURL(file);
});

// ===== LinkedIn URL =====
const linkedinBtn = document.getElementById('linkedinBtn');
const editLinkedinBtn = document.getElementById('editLinkedinBtn');

editLinkedinBtn.addEventListener('click', () => {
  const currentUrl = linkedinBtn.getAttribute('href');
  const url = prompt('Enter your LinkedIn profile URL:', currentUrl === '#' ? 'https://linkedin.com/in/' : currentUrl);
  if (url !== null && url.trim()) {
    linkedinBtn.setAttribute('href', url.trim());
    saveData();
  }
});

// ===== Add About Point =====
document.getElementById('addAboutItem').addEventListener('click', () => {
  const li = document.createElement('li');
  li.setAttribute('contenteditable', 'true');
  li.textContent = 'New point about yourself.';
  document.getElementById('aboutList').appendChild(li);
  li.focus();
  selectAll(li);
});

// ===== Add Experience =====
document.getElementById('addExperience').addEventListener('click', () => {
  const entry = createEntry('Job Title', 'Company Name', 'Describe your role and achievements.', 'Start — End');
  document.getElementById('experienceList').appendChild(entry);
  entry.querySelector('.entry-title').focus();
});

// ===== Add Education =====
document.getElementById('addEducation').addEventListener('click', () => {
  const entry = createEntry('Degree / Program', 'University Name', 'Relevant coursework, honors, or details.', 'Start — End');
  document.getElementById('educationList').appendChild(entry);
  entry.querySelector('.entry-title').focus();
});

function createEntry(title, org, desc, date) {
  const div = document.createElement('div');
  div.className = 'entry';
  div.innerHTML = `
    <div class="entry-left">
      <span class="entry-date" contenteditable="true">${date}</span>
    </div>
    <div class="entry-right">
      <h3 class="entry-title" contenteditable="true">${title}</h3>
      <p class="entry-org" contenteditable="true">${org}</p>
      <p class="entry-desc" contenteditable="true">${desc}</p>
    </div>
  `;
  return div;
}

// ===== Resume Upload =====
document.getElementById('resumeUploadExp').addEventListener('change', handleResumeUpload);
document.getElementById('resumeUploadEdu').addEventListener('change', handleResumeUpload);

function handleResumeUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.name.endsWith('.txt')) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      alert('Resume loaded! You can now paste relevant details into the editable fields.\n\nPreview:\n' + ev.target.result.substring(0, 500));
    };
    reader.readAsText(file);
  } else {
    alert('Resume uploaded: ' + file.name + '\n\nFor automatic text extraction, upload a .txt file. For .pdf or .docx, please enter details into the editable fields manually.');
  }
}

// ===== Contact Form (placeholder — no backend) =====
document.getElementById('contactForm').addEventListener('submit', (e) => {
  e.preventDefault();
  document.getElementById('contactForm').style.display = 'none';
  document.getElementById('formSuccess').style.display = 'block';

  setTimeout(() => {
    document.getElementById('contactForm').style.display = 'block';
    document.getElementById('formSuccess').style.display = 'none';
    document.getElementById('contactForm').reset();
  }, 4000);
});

// ===== Footer Year =====
document.getElementById('currentYear').textContent = new Date().getFullYear();

// ===== Scroll Fade-In Animations =====
function initScrollAnimations() {
  const targets = document.querySelectorAll('.entry, .about-list li, .contact-form-wrapper');
  targets.forEach(el => el.classList.add('fade-in'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  targets.forEach(el => observer.observe(el));
}

initScrollAnimations();

// ===== LocalStorage Persistence =====
function saveData() {
  const data = {
    name: document.getElementById('heroName').textContent,
    bio: document.getElementById('heroBio').textContent,
    avatar: avatarImg.src,
    avatarVisible: avatarImg.style.display !== 'none',
    linkedin: linkedinBtn.getAttribute('href'),
    aboutList: document.getElementById('aboutList').innerHTML,
    experience: document.getElementById('experienceList').innerHTML,
    education: document.getElementById('educationList').innerHTML,
  };
  localStorage.setItem('portfolioData', JSON.stringify(data));
}

function loadData() {
  const raw = localStorage.getItem('portfolioData');
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    if (data.name) document.getElementById('heroName').textContent = data.name;
    if (data.bio) document.getElementById('heroBio').textContent = data.bio;
    if (data.avatarVisible && data.avatar) {
      avatarImg.src = data.avatar;
      avatarImg.style.display = 'block';
      avatarPlaceholder.style.display = 'none';
    }
    if (data.linkedin) linkedinBtn.setAttribute('href', data.linkedin);
    if (data.aboutList) document.getElementById('aboutList').innerHTML = data.aboutList;
    if (data.experience) document.getElementById('experienceList').innerHTML = data.experience;
    if (data.education) document.getElementById('educationList').innerHTML = data.education;
  } catch (e) {
    console.error('Failed to load saved data:', e);
  }
}

// Auto-save on edits
document.addEventListener('input', (e) => {
  if (e.target.hasAttribute('contenteditable') || e.target.closest('[contenteditable]')) {
    saveData();
  }
});

// Helper: select all text in element
function selectAll(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

loadData();
