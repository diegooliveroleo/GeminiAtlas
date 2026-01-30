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
      const projectNames = Object.keys(data.projects).sort();

      for (const name of projectNames) {
        const chats = data.projects[name];
        
        const groupDiv = document.createElement('div');
        groupDiv.className = 'project-group';
        
        // 1. Crear el título con flecha e indicador de cantidad
        const titleDiv = document.createElement('div');
        titleDiv.className = 'project-title';
        // Añadimos cursor pointer aquí o en CSS para indicar que es clicable
        titleDiv.style.cursor = 'pointer'; 
        titleDiv.style.userSelect = 'none'; // Evita que se seleccione el texto al hacer doble clic
        
        // Usamos una flecha (▶) para colapsado por defecto
        titleDiv.innerHTML = `
            <span style="width: 12px; display:inline-block; transition: transform 0.2s;">▶</span> 
            📁 ${name} 
            <span style="color: #999; font-size: 0.8em; margin-left: 5px;">(${chats.length})</span>
        `;
        groupDiv.appendChild(titleDiv);
        
        // 2. Crear contenedor para los chats (Oculto por defecto)
        const chatsContainer = document.createElement('div');
        chatsContainer.className = 'chats-container';
        chatsContainer.style.display = 'none'; // <--- AQUÍ ESTÁ EL TRUCO (Colapsado al inicio)
        chatsContainer.style.paddingLeft = '15px'; // Sangría para jerarquía visual
        
        chats.forEach(chat => {
          const a = document.createElement('a');
          a.className = 'chat-link';
          a.innerText = chat.title;
          a.title = chat.url;
          a.onclick = () => {
            chrome.tabs.create({ url: chat.url });
          };
          chatsContainer.appendChild(a);
        });
        
        groupDiv.appendChild(chatsContainer);
        projectList.appendChild(groupDiv);

        // 3. Lógica del Click para Abrir/Cerrar
        titleDiv.addEventListener('click', () => {
            const isHidden = chatsContainer.style.display === 'none';
            const arrow = titleDiv.querySelector('span'); // Seleccionamos la flecha
            
            if (isHidden) {
                chatsContainer.style.display = 'block'; // Mostrar
                arrow.innerText = '▼'; // Flecha abajo
            } else {
                chatsContainer.style.display = 'none'; // Ocultar
                arrow.innerText = '▶'; // Flecha derecha
            }
        });
      }
    });
  }
});