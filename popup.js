document.addEventListener('DOMContentLoaded', function() {
  let categories = [];
  let cards = {};
  let currentCategory = null;

  // 从存储中加载数据
  chrome.storage.sync.get(['categories', 'cards'], function(result) {
    categories = result.categories || [];
    cards = result.cards || {};
    renderCategories();
    if (categories.length > 0) {
      selectCategory(categories[0]);
    }
  });

  // 添加分类
  document.getElementById('addCategory').addEventListener('click', function() {
    showAddCategoryModal();
  });

  // 添加卡片
  document.getElementById('addCard').addEventListener('click', function() {
    if (!currentCategory) {
      alert('请先选择一个分类！');
      return;
    }
    showAddCardModal();
  });

  function showAddCardModal() {
    const modal = document.getElementById('addCardModal');
    const nameInput = document.getElementById('siteName');
    const urlInput = document.getElementById('siteUrl');

    modal.classList.add('show');
    nameInput.value = '';
    urlInput.value = '';
    nameInput.focus();

    document.getElementById('cancelAdd').onclick = function() {
      modal.classList.remove('show');
    };

    document.getElementById('confirmAdd').onclick = function() {
      const name = nameInput.value.trim();
      let url = urlInput.value.trim();

      if (!name || !url) {
        alert('请填写完整信息！');
        return;
      }

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      cards[currentCategory].push({
        name: name,
        url: url
      });

      saveData();
      renderCards(currentCategory);
      modal.classList.remove('show');
    };
  }

  function selectCategory(categoryName) {
    currentCategory = categoryName;
    document.querySelectorAll('.category-item').forEach(item => {
      item.classList.remove('active');
      if (item.textContent === categoryName) {
        item.classList.add('active');
      }
    });
    renderCards(categoryName);
  }

  function renderCategories() {
    const categoryList = document.getElementById('categoryList');
    categoryList.innerHTML = '';
    
    categories.forEach(category => {
      const div = document.createElement('div');
      div.className = 'category-item';
      div.draggable = true;
      div.dataset.category = category;
      if (category === currentCategory) {
        div.classList.add('active');
      }
      div.textContent = category;
      
      // 允许接收卡片拖拽
      div.addEventListener('dragover', function(e) {
        e.preventDefault();
        if (draggedItem && draggedItem.classList.contains('card-item')) {
          this.classList.add('category-drag-over');
        }
      });
      
      div.addEventListener('dragleave', function(e) {
        this.classList.remove('category-drag-over');
      });
      
      div.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('category-drag-over');
        
        // 如果是卡片被拖拽到分类上
        if (draggedItem && draggedItem.classList.contains('card-item')) {
          const targetCategory = this.dataset.category;
          const sourceCategory = draggedItem.dataset.sourceCategory;
          const cardIndex = parseInt(draggedItem.dataset.index);
          
          // 如果目标分类不同，则移动卡片
          if (targetCategory !== sourceCategory) {
            const card = cards[sourceCategory][cardIndex];
            cards[sourceCategory].splice(cardIndex, 1);
            cards[targetCategory].push(card);
            saveData();
            
            // 重新渲染两个分类的卡片
            if (currentCategory === sourceCategory || currentCategory === targetCategory) {
              renderCards(currentCategory);
            }
          }
        }
      });
      
      // 添加拖拽事件
      div.addEventListener('dragstart', handleCategoryDragStart);
      div.addEventListener('dragover', handleCategoryDragOver);
      div.addEventListener('drop', handleCategoryDrop);
      div.addEventListener('dragenter', handleCategoryDragEnter);
      div.addEventListener('dragleave', handleCategoryDragLeave);
      div.addEventListener('dragend', handleCategoryDragEnd);
      
      // 添加右键菜单
      div.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showCategoryContextMenu(e, category);
      });
      
      div.addEventListener('click', () => selectCategory(category));
      categoryList.appendChild(div);
    });
  }

  function renderCards(categoryName) {
    const cardList = document.getElementById('cardList');
    cardList.classList.add('fade-out');
    
    setTimeout(() => {
      cardList.innerHTML = '';
      
      if (!categoryName || !cards[categoryName]) return;
      
      cards[categoryName].forEach((card, index) => {
        const div = document.createElement('div');
        div.className = 'card-item';
        div.draggable = true;
        div.dataset.index = index;
        div.addEventListener('click', function(e) {
          if (!this.classList.contains('dragging')) {
            window.open(card.url, '_blank');
          }
        });
        // 获取网站域名
        const domain = new URL(card.url).hostname;
        div.innerHTML = `
          <img class="site-icon" src="${new URL(card.url).origin}/favicon.ico" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2220%22 fill=%22%234285f4%22/><text x=%2250%22 y=%2250%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2250%22 fill=%22white%22>${card.name[0].toUpperCase()}</text></svg>'">
          <div class="card-name">${card.name}</div>
        `;
        
        // 添加拖拽事件
        div.addEventListener('dragstart', handleDragStart);
        div.addEventListener('dragover', handleDragOver);
        div.addEventListener('drop', handleDrop);
        div.addEventListener('dragenter', handleDragEnter);
        div.addEventListener('dragleave', handleDragLeave);
        
        // 添加右键菜单
        div.addEventListener('contextmenu', function(e) {
          e.preventDefault();
          showContextMenu(e, {
            name: card.name,
            url: card.url,
            categoryName: categoryName,
            index: index
          });
        });
        
        cardList.appendChild(div);
      });
      
      cardList.classList.remove('fade-out');
      cardList.classList.add('fade-in');
    }, 300);
  }

  // 拖拽相关函数
  let draggedItem = null;
  
  function handleDragStart(e) {
    draggedItem = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    // 存储源分类信息
    draggedItem.dataset.sourceCategory = currentCategory;
  }
  
  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }
  
  function handleDrop(e) {
    e.preventDefault();
    if (this === draggedItem) return;

    const fromIndex = parseInt(draggedItem.dataset.index);
    const toIndex = parseInt(this.dataset.index);

    // 更新数组顺序
    const items = cards[currentCategory];
    const [movedItem] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, movedItem);

    // 保存并重新渲染
    saveData();
    renderCards(currentCategory);
  }
  
  function handleDragEnter(e) {
    e.preventDefault();
    if (this !== draggedItem) {
      this.classList.add('drag-over');
    }
  }
  
  function handleDragLeave(e) {
    this.classList.remove('drag-over');
  }

  function deleteCategory(categoryName) {
    const index = categories.indexOf(categoryName);
    if (index > -1) {
      categories.splice(index, 1);
      delete cards[categoryName];
      if (currentCategory === categoryName) {
        currentCategory = categories[0] || null;
      }
      saveData();
      renderCategories();
      renderCards(currentCategory);
    }
  }

  function deleteCard(categoryName, cardIndex) {
    cards[categoryName].splice(cardIndex, 1);
    saveData();
    renderCards(categoryName);
  }

  function saveData() {
    chrome.storage.sync.set({
      categories: categories,
      cards: cards
    });
  }

  // 分类拖拽相关函数
  let draggedCategory = null;
  
  function handleCategoryDragStart(e) {
    draggedCategory = this;
    this.classList.add('category-dragging');
    e.dataTransfer.effectAllowed = 'move';
  }
  
  function handleCategoryDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }
  
  function handleCategoryDrop(e) {
    e.preventDefault();
    if (this === draggedCategory) return;

    const fromCategory = draggedCategory.dataset.category;
    const toCategory = this.dataset.category;

    // 获取索引
    const fromIndex = categories.indexOf(fromCategory);
    const toIndex = categories.indexOf(toCategory);

    // 更新分类顺序
    categories.splice(fromIndex, 1);
    categories.splice(toIndex, 0, fromCategory);

    // 保存并重新渲染
    saveData();
    renderCategories();

    // 保持当前选中的分类
    if (currentCategory === fromCategory) {
      selectCategory(fromCategory);
    }
  }
  
  function handleCategoryDragEnter(e) {
    e.preventDefault();
    if (this !== draggedCategory) {
      this.classList.add('category-drag-over');
    }
  }
  
  function handleCategoryDragLeave(e) {
    this.classList.remove('category-drag-over');
  }
  
  function handleCategoryDragEnd(e) {
    this.classList.remove('category-dragging');
    document.querySelectorAll('.category-item').forEach(item => {
      item.classList.remove('category-drag-over');
    });
  }

  // 显示右键菜单
  function showContextMenu(e, cardInfo) {
    // 移除已有的右键菜单
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }
    
    // 创建右键菜单
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${e.pageX}px`;
    menu.style.top = `${e.pageY}px`;
    
    menu.innerHTML = `
      <div class="menu-item edit">编辑</div>
      <div class="menu-item delete">删除</div>
    `;
    
    // 编辑功能
    menu.querySelector('.edit').addEventListener('click', () => {
      showEditCardModal(cardInfo);
      menu.remove();
    });
    
    // 删除功能
    menu.querySelector('.delete').addEventListener('click', () => {
      if (confirm(`是否删除网站"${cardInfo.name}"？`)) {
        deleteCard(cardInfo.categoryName, cardInfo.index);
      }
      menu.remove();
    });
    
    // 点击其他地方关闭菜单
    document.addEventListener('click', function closeMenu() {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    });
    
    document.body.appendChild(menu);
  }

  // 显示编辑卡片弹窗
  function showEditCardModal(cardInfo) {
    const modal = document.getElementById('addCardModal');
    const nameInput = document.getElementById('siteName');
    const urlInput = document.getElementById('siteUrl');
    
    modal.classList.add('show');
    nameInput.value = cardInfo.name;
    urlInput.value = cardInfo.url;
    nameInput.focus();
    
    document.getElementById('cancelAdd').onclick = function() {
      modal.classList.remove('show');
    };
    
    document.getElementById('confirmAdd').onclick = function() {
      const name = nameInput.value.trim();
      let url = urlInput.value.trim();
      
      if (!name || !url) {
        alert('请填写完整信息！');
        return;
      }
      
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      // 更新卡片信息
      cards[cardInfo.categoryName][cardInfo.index] = {
        name: name,
        url: url
      };
      
      saveData();
      renderCards(currentCategory);
      modal.classList.remove('show');
    };
  }

  // 显示分类右键菜单
  function showCategoryContextMenu(e, category) {
    // 移除已有的右键菜单
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }
    
    // 创建右键菜单
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${e.pageX}px`;
    menu.style.top = `${e.pageY}px`;
    
    menu.innerHTML = `
      <div class="menu-item edit">编辑</div>
      <div class="menu-item delete">删除</div>
    `;
    
    // 编辑功能
    menu.querySelector('.edit').addEventListener('click', () => {
      showEditCategoryModal(category);
      menu.remove();
    });
    
    // 删除功能
    menu.querySelector('.delete').addEventListener('click', () => {
      // 检查分类下是否有卡片
      if (cards[category] && cards[category].length > 0) {
        alert('该分类下还有网站卡片，不能删除！');
      } else {
        showDeleteConfirm(
          `确定要删除分类"${category}"吗？\n删除后无法恢复。`,
          () => deleteCategory(category)
        );
      }
      menu.remove();
    });
    
    // 点击其他地方关闭菜单
    document.addEventListener('click', function closeMenu() {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    });
    
    document.body.appendChild(menu);
  }

  // 显示编辑分类弹窗
  function showEditCategoryModal(category) {
    const modal = document.getElementById('editCategoryModal');
    const nameInput = document.getElementById('categoryName');
    
    modal.classList.add('show');
    nameInput.value = category;
    nameInput.focus();
    
    document.getElementById('cancelEditCategory').onclick = function() {
      modal.classList.remove('show');
    };
    
    document.getElementById('confirmEditCategory').onclick = function() {
      const newName = nameInput.value.trim();
      
      if (!newName) {
        alert('请输入分类名称！');
        return;
      }
      
      if (newName === category) {
        modal.classList.remove('show');
        return;
      }
      
      if (categories.includes(newName)) {
        alert('该分类名称已存在！');
        return;
      }
      
      // 更新分类名称
      const index = categories.indexOf(category);
      categories[index] = newName;
      
      // 更新卡片数据
      cards[newName] = cards[category];
      delete cards[category];
      
      // 更新当前选中的分类
      if (currentCategory === category) {
        currentCategory = newName;
      }
      
      saveData();
      renderCategories();
      renderCards(currentCategory);
      modal.classList.remove('show');
    };
    
    // 添加回车键支持
    nameInput.addEventListener('keyup', function(e) {
      if (e.key === 'Enter') {
        document.getElementById('confirmEditCategory').click();
      } else if (e.key === 'Escape') {
        document.getElementById('cancelEditCategory').click();
      }
    });
  }

  // 导出数据
  document.getElementById('exportData').addEventListener('click', function() {
    const data = {
      categories: categories,
      cards: cards
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'website-nav-backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // 导入数据
  document.getElementById('importData').addEventListener('click', function() {
    document.getElementById('importFile').click();
  });

  document.getElementById('importFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = JSON.parse(e.target.result);
          if (data.categories && data.cards) {
            if (confirm('导入数据将覆盖现有数据，是否继续？')) {
              categories = data.categories;
              cards = data.cards;
              saveData();
              renderCategories();
              if (categories.length > 0) {
                selectCategory(categories[0]);
              }
              alert('数据导入成功！');
            }
          } else {
            alert('无效的数据格式！');
          }
        } catch (error) {
          alert('导入失败：' + error.message);
        }
      };
      reader.readAsText(file);
    }
  });

  // 显示添加分类弹窗
  function showAddCategoryModal() {
    const modal = document.getElementById('addCategoryModal');
    const nameInput = document.getElementById('newCategoryName');
    
    modal.classList.add('show');
    nameInput.value = '';
    nameInput.focus();
    
    document.getElementById('cancelAddCategory').onclick = function() {
      modal.classList.remove('show');
    };
    
    document.getElementById('confirmAddCategory').onclick = function() {
      const name = nameInput.value.trim();
      
      if (!name) {
        alert('请输入分类名称！');
        return;
      }
      
      if (categories.includes(name)) {
        alert('该分类已存在！');
        return;
      }
      
      categories.push(name);
      cards[name] = [];
      saveData();
      renderCategories();
      selectCategory(name);
      modal.classList.remove('show');
    };
    
    // 添加回车键支持
    nameInput.addEventListener('keyup', function(e) {
      if (e.key === 'Enter') {
        document.getElementById('confirmAddCategory').click();
      } else if (e.key === 'Escape') {
        document.getElementById('cancelAddCategory').click();
      }
    });
  }

  // 显示删除确认弹窗
  function showDeleteConfirm(message, onConfirm) {
    const modal = document.getElementById('confirmDeleteModal');
    const messageEl = modal.querySelector('.confirm-message');
    
    modal.classList.add('show');
    messageEl.textContent = message;
    
    document.getElementById('cancelDelete').onclick = function() {
      modal.classList.remove('show');
    };
    
    document.getElementById('confirmDelete').onclick = function() {
      onConfirm();
      modal.classList.remove('show');
    };
  }
}); 