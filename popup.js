document.addEventListener('DOMContentLoaded', function() {
  const projectList = document.getElementById('projectList');
  const addBtn = document.getElementById('addChat');
  const chatNameInput = document.getElementById('customChatName');
  const projectNameInput = document.getElementById('projectName');
  
  // Nuevos inputs
  const projectIconInput = document.getElementById('projectIcon');
  const projectColorInput = document.getElementById('projectColor');

  // Recuperar la última carpeta usada y sus estilos
  chrome.storage.local.get(['lastProject', 'projectMeta'], function(result) {
    if (result.lastProject) {
      projectNameInput.value = result.lastProject;
      // Si esa carpeta tenía estilos guardados, los recuperamos para pre-rellenar
      if (result.projectMeta && result.projectMeta[result.lastProject]) {
        projectIconInput.value = result.projectMeta[result.lastProject].icon || '';
        projectColorInput.value = result.projectMeta[result.lastProject].color || '#333333';
      }
    }
  });

  // Pre-rellenar nombre del chat
  const now = new Date();
  chatNameInput.value = `Nota del ${now.toLocaleDateString()} ${now.getHours()}:${now.getMinutes()}`;

  displayProjects();

  addBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes("google.com")) {
      alert("Por favor, úsalo dentro de una pestaña de Google Gemini.");
      return;
    }

    const projectName = projectNameInput.value.trim() || "General";
    const customName = chatNameInput.value.trim() || `Chat sin nombre (${new Date().toLocaleDateString()})`;
    
    // Obtenemos los nuevos valores de estilo
    const icon = projectIconInput.value.trim() || "📁";
    const color = projectColorInput.value;

    // Recuperamos 'projects' (chats) y 'projectMeta' (estilos)
    chrome.storage.local.get({ projects: {}, projectMeta: {} }, function(data) {
      const projects = data.projects;
      const projectMeta = data.projectMeta;

      // 1. Guardar el Chat
      if (!projects[projectName]) projects[projectName] = [];
      projects[projectName].push({ 
        title: customName, 
        url: tab.url,
        date: new Date().toISOString()
      });

      // 2. Guardar el Estilo (Color e Icono) de la carpeta
      projectMeta[projectName] = { icon: icon, color: color };
      
      chrome.storage.local.set({ 
        projects: projects, 
        projectMeta: projectMeta, // Guardamos los metadatos
        lastProject: projectName 
      }, () => {
        displayProjects();
        chatNameInput.value = ""; 
        addBtn.innerText = "¡Guardado!";
        setTimeout(() => addBtn.innerText = "💾 Archivar Chat", 1000);
      });
    });
  });

  function displayProjects() {
    projectList.innerHTML = "";
    // Ahora pedimos también 'projectMeta'
    chrome.storage.local.get({ projects: {}, projectMeta: {} }, function(data) {
      const projectNames = Object.keys(data.projects).sort();
      const meta = data.projectMeta; // Acceso rápido a los estilos

      for (const name of projectNames) {
        const chats = data.projects[name];
        // Recuperamos estilo guardado o usamos valores por defecto
        const folderStyle = meta[name] || { icon: '📁', color: '#333333' };
        
        const groupDiv = document.createElement('div');
        groupDiv.className = 'project-group';
        
        // --- TÍTULO DE LA CARPETA ---
        const titleDiv = document.createElement('div');
        titleDiv.className = 'project-title';
        titleDiv.style.cursor = 'pointer';
        titleDiv.style.userSelect = 'none';
        
        // Aplicamos el color elegido al texto del título
        titleDiv.style.color = folderStyle.color; 
        titleDiv.style.fontWeight = "bold";

        // HTML del título con el ICONO personalizado
        titleDiv.innerHTML = `
            <span style="color: #666; font-size: 10px; margin-right: 4px; display:inline-block; transition: transform 0.2s;">▶</span> 
            <span style="margin-right: 5px;">${folderStyle.icon}</span> 
            ${name} 
            <span style="color: #999; font-size: 0.8em; font-weight: normal; margin-left: 5px;">(${chats.length})</span>
        `;
        groupDiv.appendChild(titleDiv);
        
        // --- CONTENEDOR DE CHATS (Acordeón) ---
        const chatsContainer = document.createElement('div');
        chatsContainer.className = 'chats-container';
        chatsContainer.style.display = 'none'; // Oculto por defecto
        
        // Borde izquierdo del color de la carpeta para dar identidad visual
        chatsContainer.style.borderLeft = `2px solid ${folderStyle.color}40`; // Agregamos transparencia (40) al hex
        chatsContainer.style.marginLeft = '7px';
        chatsContainer.style.paddingLeft = '10px';
        
        chats.forEach(chat => {
          const a = document.createElement('a');
          a.className = 'chat-link';
          a.innerText = chat.title;
          a.title = chat.url;
          a.onclick = () => chrome.tabs.create({ url: chat.url });
          chatsContainer.appendChild(a);
        });
        
        groupDiv.appendChild(chatsContainer);
        projectList.appendChild(groupDiv);

        // Lógica del click (Acordeón)
        titleDiv.addEventListener('click', () => {
            const isHidden = chatsContainer.style.display === 'none';
            const arrow = titleDiv.querySelector('span'); 
            
            if (isHidden) {
                chatsContainer.style.display = 'block';
                arrow.innerText = '▼';
            } else {
                chatsContainer.style.display = 'none';
                arrow.innerText = '▶';
            }
        });
      }
    });
  }
});