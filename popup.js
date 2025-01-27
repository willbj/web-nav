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
    const categoryName = prompt('请输入分类名称：');
    if (categoryName && categoryName.trim()) {
      if (categories.includes(categoryName.trim())) {
        alert('该分类已存在！');
        return;
      }
      categories.push(categoryName.trim());
      cards[categoryName.trim()] = [];
      saveData();
      renderCategories();
      selectCategory(categoryName.trim());
    }
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
        if (confirm(`是否删除分类"${category}"？\n注意：删除分类会同时删除该分类下的所有网站！`)) {
          deleteCategory(category);
        }
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
          if (confirm(`是否删除网站"${card.name}"？`)) {
            deleteCard(categoryName, index);
          }
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
}); 