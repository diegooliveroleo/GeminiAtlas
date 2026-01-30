document.addEventListener('DOMContentLoaded', function() {
  const projectList = document.getElementById('projectList');
  const addBtn = document.getElementById('addChat');
  const chatNameInput = document.getElementById('customChatName');
  
  // Elementos nuevos de la UI
  const projectSelect = document.getElementById('projectSelect');
  const newFolderBlock = document.getElementById('newFolderBlock');
  const newProjectNameInput = document.getElementById('newProjectName');
  const emojiSelect = document.getElementById('emojiSelect');
  const projectColorInput = document.getElementById('projectColor');

  const NEW_PROJECT_VALUE = "__NEW_PROJECT__";

  // Inicialización
  init();

  function init() {
    // 1. Rellenar nombre del chat con fecha
    const now = new Date();
    chatNameInput.value = `Nota del ${now.toLocaleDateString()} ${now.getHours()}:${now.getMinutes()}`;

    // 2. Cargar proyectos y configurar el desplegable
    refreshUI();
  }

  // Escuchar cambios en el desplegable para mostrar/ocultar el bloque de "Nueva Carpeta"
  projectSelect.addEventListener('change', (e) => {
    if (e.target.value === NEW_PROJECT_VALUE) {
      newFolderBlock.style.display = 'block';
      newProjectNameInput.focus();
    } else {
      newFolderBlock.style.display = 'none';
    }
  });

  // BOTÓN GUARDAR
  addBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes("google.com")) {
      alert("Por favor, úsalo dentro de una pestaña de Google Gemini.");
      return;
    }

    const customChatName = chatNameInput.value.trim() || `Chat sin nombre (${new Date().toLocaleDateString()})`;
    let targetFolderName = "";
    
    // Obtener datos actuales
    const data = await chrome.storage.local.get({ projects: {}, projectMeta: {} });
    const projects = data.projects;
    let projectMeta = data.projectMeta;

    // LÓGICA DE SELECCIÓN VS CREACIÓN
    const selectedValue = projectSelect.value;

    if (selectedValue === NEW_PROJECT_VALUE) {
      // --- MODO: CREAR NUEVA CARPETA ---
      const newName = newProjectNameInput.value.trim();
      
      if (!newName) {
        alert("Por favor, escribe un nombre para la nueva carpeta.");
        return;
      }

      // VERIFICACIÓN DE DUPLICADOS (Lo que pediste)
      // Buscamos si existe (insensible a mayúsculas/minúsculas)
      const existingName = Object.keys(projects).find(k => k.toLowerCase() === newName.toLowerCase());
      if (existingName) {
        alert(`❌ Ya existe una carpeta llamada "${existingName}".\n\nPor favor, selecciónala de la lista en lugar de crear una nueva.`);
        // Opcional: Cambiar el select automáticamente a la existente
        projectSelect.value = existingName;
        newFolderBlock.style.display = 'none';
        return; // Detenemos el guardado
      }

      targetFolderName = newName;
      
      // Guardar metadatos (Icono y Color)
      projectMeta[targetFolderName] = {
        icon: emojiSelect.value,
        color: projectColorInput.value
      };

    } else {
      // --- MODO: USAR EXISTENTE ---
      if (!selectedValue) {
        alert("Selecciona una carpeta o crea una nueva.");
        return;
      }
      targetFolderName = selectedValue;
    }

    // Guardar el chat en la carpeta destino
    if (!projects[targetFolderName]) projects[targetFolderName] = [];
    
    projects[targetFolderName].push({ 
      title: customChatName, 
      url: tab.url,
      date: new Date().toISOString()
    });

    // Guardar en Storage
    chrome.storage.local.set({ 
      projects: projects, 
      projectMeta: projectMeta,
      lastProject: targetFolderName 
    }, () => {
      // Resetear UI
      chatNameInput.value = ""; 
      newProjectNameInput.value = "";
      addBtn.innerText = "¡Guardado!";
      setTimeout(() => addBtn.innerText = "💾 Archivar Chat", 1000);
      
      // Recargar lista y dropdown
      refreshUI(); 
    });
  });

  function refreshUI() {
    chrome.storage.local.get({ projects: {}, projectMeta: {}, lastProject: null }, function(data) {
      const projectNames = Object.keys(data.projects).sort();
      
      // A. Rellenar el Select
      projectSelect.innerHTML = "";
      
      // Opción placeholder
      const defaultOption = document.createElement('option');
      defaultOption.text = "-- Selecciona una carpeta --";
      defaultOption.value = "";
      defaultOption.disabled = true;
      if (!data.lastProject) defaultOption.selected = true;
      projectSelect.appendChild(defaultOption);

      // Opciones existentes
      projectNames.forEach(name => {
        const option = document.createElement('option');
        const icon = (data.projectMeta[name] && data.projectMeta[name].icon) ? data.projectMeta[name].icon : '📁';
        option.value = name;
        option.text = `${icon} ${name}`;
        if (name === data.lastProject) option.selected = true;
        projectSelect.appendChild(option);
      });

      // Opción de crear nueva
      const newOption = document.createElement('option');
      newOption.value = NEW_PROJECT_VALUE;
      newOption.text = "➕ Nueva Carpeta...";
      newOption.style.fontWeight = "bold";
      newOption.style.color = "#1a73e8";
      projectSelect.appendChild(newOption);

      // Asegurar estado correcto del bloque 'nueva carpeta'
      if (projectSelect.value === NEW_PROJECT_VALUE) {
        newFolderBlock.style.display = 'block';
      } else {
        newFolderBlock.style.display = 'none';
      }

      // B. Renderizar la lista inferior (Acordeón)
      renderProjectList(data);
    });
  }

  function renderProjectList(data) {
    projectList.innerHTML = "";
    const meta = data.projectMeta;
    const projectNames = Object.keys(data.projects).sort();

    for (const name of projectNames) {
      const chats = data.projects[name];
      const folderStyle = meta[name] || { icon: '📁', color: '#333333' };
      
      const groupDiv = document.createElement('div');
      groupDiv.className = 'project-group';
      
      const titleDiv = document.createElement('div');
      titleDiv.className = 'project-title';
      titleDiv.style.cursor = 'pointer';
      titleDiv.style.userSelect = 'none';
      titleDiv.style.color = folderStyle.color;
      titleDiv.style.fontWeight = "bold";

      titleDiv.innerHTML = `
          <span style="color: #666; font-size: 10px; margin-right: 4px; display:inline-block; transition: transform 0.2s;">▶</span> 
          <span style="margin-right: 5px;">${folderStyle.icon}</span> 
          ${name} 
          <span style="color: #999; font-size: 0.8em; font-weight: normal; margin-left: 5px;">(${chats.length})</span>
      `;
      groupDiv.appendChild(titleDiv);
      
      const chatsContainer = document.createElement('div');
      chatsContainer.style.display = 'none';
      chatsContainer.style.borderLeft = `2px solid ${folderStyle.color}40`;
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
  }
});