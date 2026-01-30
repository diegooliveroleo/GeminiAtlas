document.addEventListener('DOMContentLoaded', function() {
  const projectList = document.getElementById('projectList');
  const addBtn = document.getElementById('addChat');
  const chatNameInput = document.getElementById('customChatName');
  const projectNameInput = document.getElementById('projectName');

  // Recuperar la última carpeta usada para no tener que escribirla siempre
  chrome.storage.local.get(['lastProject'], function(result) {
    if (result.lastProject) {
      projectNameInput.value = result.lastProject;
    }
  });

  // Intentar pre-rellenar el nombre con la fecha/hora actual
  const now = new Date();
  chatNameInput.value = `Nota del ${now.toLocaleDateString()} ${now.getHours()}:${now.getMinutes()}`;

  displayProjects();

  addBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Validar que estamos en Gemini
    if (!tab.url.includes("google.com")) { // Filtro laxo para pruebas
      alert("Por favor, úsalo dentro de una pestaña de Google Gemini.");
      return;
    }

    const projectName = projectNameInput.value.trim() || "General";
    // AQUÍ ESTÁ EL CAMBIO: Usamos tu input, no el tab.title
    const customName = chatNameInput.value.trim() || `Chat sin nombre (${new Date().toLocaleDateString()})`;
    
    chrome.storage.local.get({ projects: {} }, function(data) {
      const projects = data.projects;
      if (!projects[projectName]) projects[projectName] = [];
      
      // Guardamos el objeto con TU nombre personalizado
      projects[projectName].push({ 
        title: customName, 
        url: tab.url,
        date: new Date().toISOString() // Guardamos fecha por si acaso
      });
      
      chrome.storage.local.set({ projects: projects, lastProject: projectName }, () => {
        displayProjects();
        // Limpiamos solo el nombre del chat, mantenemos el proyecto
        chatNameInput.value = ""; 
        // Feedback visual rápido
        addBtn.innerText = "¡Guardado!";
        setTimeout(() => addBtn.innerText = "💾 Archivar Chat", 1000);
      });
    });
  });

  function displayProjects() {
    projectList.innerHTML = "";
    chrome.storage.local.get({ projects: {} }, function(data) {
      // Ordenamos para ver lo más nuevo arriba (opcional)
      const projectNames = Object.keys(data.projects).sort();

      for (const name of projectNames) {
        const chats = data.projects[name];
        
        const groupDiv = document.createElement('div');
        groupDiv.className = 'project-group';
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'project-title';
        titleDiv.innerText = `📁 ${name}`;
        groupDiv.appendChild(titleDiv);
        
        chats.forEach(chat => {
          const a = document.createElement('a');
          a.className = 'chat-link';
          a.innerText = chat.title; // Muestra TU nombre
          a.title = chat.url; // Tooltip con la URL
          a.onclick = () => {
            chrome.tabs.create({ url: chat.url }); // Abre en nueva pestaña
          };
          groupDiv.appendChild(a);
        });
        projectList.appendChild(groupDiv);
      }
    });
  }
});