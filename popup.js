document.addEventListener('DOMContentLoaded', function() {
  const projectList = document.getElementById('projectList');
  const addBtn = document.getElementById('addChat');

  // Cargar proyectos guardados
  displayProjects();

  addBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const projectName = document.getElementById('projectName').value || "General";
    
    if (tab.url.includes("gemini.google.com/app")) {
      chrome.storage.local.get({ projects: {} }, function(data) {
        const projects = data.projects;
        if (!projects[projectName]) projects[projectName] = [];
        
        // Guardar el título y la URL del chat
        projects[projectName].push({ title: tab.title.replace(" - Gemini", ""), url: tab.url });
        
        chrome.storage.local.set({ projects: projects }, () => {
          displayProjects();
          document.getElementById('projectName').value = "";
        });
      });
    } else {
      alert("Abre un chat de Gemini primero.");
    }
  });

  function displayProjects() {
    projectList.innerHTML = "";
    chrome.storage.local.get({ projects: {} }, function(data) {
      for (const [name, chats] of Object.entries(data.projects)) {
        const div = document.createElement('div');
        div.className = 'project-group';
        div.innerHTML = `<strong>📁 ${name}</strong>`;
        
        chats.forEach(chat => {
          const a = document.createElement('a');
          a.className = 'chat-link';
          a.innerText = `📄 ${chat.title}`;
          a.onclick = () => chrome.tabs.update({ url: chat.url });
          div.appendChild(a);
        });
        projectList.appendChild(div);
      }
    });
  }
});