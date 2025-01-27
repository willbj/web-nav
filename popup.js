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

    const cardName = prompt('请输入网站名称：');
    if (!cardName || !cardName.trim()) return;

    const cardUrl = prompt('请输入网站地址：');
    if (!cardUrl || !cardUrl.trim()) return;

    // 确保URL格式正确
    let url = cardUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    cards[currentCategory].push({
      name: cardName.trim(),
      url: url
    });
    saveData();
    renderCards(currentCategory);
  });

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
      if (category === currentCategory) {
        div.classList.add('active');
      }
      div.textContent = category;
      
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
    cardList.innerHTML = '';
    
    if (!categoryName || !cards[categoryName]) return;
    
    cards[categoryName].forEach((card, index) => {
      const div = document.createElement('div');
      div.className = 'card-item';
      div.innerHTML = `
        <h3>${card.name}</h3>
        <a href="${card.url}" target="_blank">${card.url}</a>
      `;
      
      // 添加右键菜单
      div.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        if (confirm(`是否删除网站"${card.name}"？`)) {
          deleteCard(categoryName, index);
        }
      });
      
      cardList.appendChild(div);
    });
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
}); 