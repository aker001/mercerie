// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDDsE1HExXgGFTAaZW4rGWlxSq_hy_ogok",
  authDomain: "mercerie-f501e.firebaseapp.com",
  projectId: "mercerie-f501e",
  storageBucket: "mercerie-f501e.appspot.com",
  messagingSenderId: "396755009614",
  appId: "1:396755009614:web:891a177ed950d151c9431f"
};
// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();
// DOM Elements
const ui = {
  addProductBtn: document.getElementById('addProductBtn'),
  exportBtn: document.getElementById('exportBtn'),
  searchInput: document.getElementById('searchInput'),
  productsBody: document.getElementById('productsBody'),
  editModal: document.getElementById('editModal'),
  editForm: document.getElementById('editForm'),
  darkModeToggle: document.getElementById('darkModeToggle'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  logoutBtn: document.getElementById('logoutBtn'),
  loginSection: document.getElementById('loginSection'),
  loginForm: document.getElementById('loginForm'),
  appSection: document.getElementById('appSection'),
  closeBtn: document.querySelector('.close-btn'),
  summarySection: document.getElementById('summarySection') // New summary section
};
let products = [];
let editIndex = null; // Track the product being edited
const DEFAULT_IMAGE = 'placeholder.jpg';
// DOM Elements for Image Modal
const uiImageModal = {
  imageModal: document.getElementById('imageModal'),
  enlargedImage: document.getElementById('enlargedImage'),
  closeBtn: document.querySelector('#imageModal .close-btn')
};
// Show Loading
function showLoading() {
  if (ui.loadingOverlay) {
    ui.loadingOverlay.style.display = 'flex';
  }
}
// Hide Loading
function hideLoading() {
  if (ui.loadingOverlay) {
    ui.loadingOverlay.style.display = 'none';
  }
}
// Initialize App
function init() {
  checkLoginStatus();
}
// Check Login Status
function checkLoginStatus() {
  auth.onAuthStateChanged((user) => {
    if (user) {
      ui.loginSection.style.display = 'none';
      ui.appSection.style.display = 'block';
      loadProducts();
      setupEventListeners();
    } else {
      ui.loginSection.style.display = 'flex';
      ui.appSection.style.display = 'none';
    }
  });
}
// Setup Event Listeners
function setupEventListeners() {
  if (ui.logoutBtn) {
    ui.logoutBtn.addEventListener('click', () => {
      auth.signOut().then(() => checkLoginStatus());
    });
  }
  if (ui.addProductBtn) {
    ui.addProductBtn.addEventListener('click', () => {
      createEditForm();
      editIndex = null;
      ui.editModal.style.display = 'block';
    });
  }
  if (ui.exportBtn) {
    ui.exportBtn.addEventListener('click', exportToCSV);
  }
  if (ui.searchInput) {
    ui.searchInput.addEventListener('input', searchProducts);
  }
  if (ui.closeBtn) {
    ui.closeBtn.addEventListener('click', () => {
      ui.editModal.style.display = 'none';
    });
  }
  if (ui.darkModeToggle) {
    ui.darkModeToggle.addEventListener('click', toggleDarkMode);
  }
  // Add Event Listeners for Image Modal
  if (uiImageModal.closeBtn) {
    uiImageModal.closeBtn.addEventListener('click', hideEnlargedImage);
  }
  if (uiImageModal.imageModal) {
    uiImageModal.imageModal.addEventListener('click', (e) => {
      if (e.target === uiImageModal.imageModal) {
        hideEnlargedImage();
      }
    });
  }
}
// Toggle Dark Mode
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}
// Check for saved dark mode preference
function checkDarkModePreference() {
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
  }
}
// Login Functionality
if (ui.loginForm) {
  ui.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    auth.signInWithEmailAndPassword(email, password)
      .then(() => checkLoginStatus())
      .catch((error) => {
        alert('Invalid email or password');
        console.error(error);
      });
  });
}
// Load Products from Firestore
function loadProducts() {
  showLoading();
  db.collection('products').get()
    .then((querySnapshot) => {
      products = [];
      querySnapshot.forEach((doc) => {
        products.push({ id: doc.id, ...doc.data() });
      });
      renderProducts();
      calculateSummary(); // Calculate totals after rendering products
      hideLoading();
    })
    .catch((error) => {
      console.error('Error loading products: ', error);
      hideLoading();
    });
}
// Render Products
function renderProducts() {
  ui.productsBody.innerHTML = '';
  products.forEach((product, index) => {
    const row = createProductRow(product, index);
    ui.productsBody.appendChild(row);
  });
}
// Create Product Row
function createProductRow(product, index) {
  const row = document.createElement('tr');
  const buyPrice = product.buyPrice ? product.buyPrice.toFixed(2) : "0.00";
  const sellPrice = product.sellPrice ? product.sellPrice.toFixed(2) : "0.00";
  // Calculate profit percentage
  let profitPercentage = "N/A";
  if (product.buyPrice > 0 && product.sellPrice) {
    profitPercentage = (((product.sellPrice - product.buyPrice) / product.buyPrice) * 100).toFixed(2);
  }
  row.innerHTML = `
    <td>${product.name || 'N/A'}</td>
    <td>${product.serial || 'N/A'}</td>
    <td>${product.quantity || 0}</td>
    <td>$${buyPrice}</td>
    <td>$${sellPrice}</td>
    <td class="${parseFloat(profitPercentage) < 0 ? 'negative' : 'positive'}">
      ${profitPercentage}% Profit
    </td>
    <td><img src="${product.imageUrl || DEFAULT_IMAGE}" class="image-preview clickable" alt="Product"></td>
    <td>
      <button class="primary-btn edit-btn" data-index="${index}">Edit</button>
      <button class="danger-btn delete-btn" data-index="${index}">Delete</button>
    </td>
  `;
  // Add event listeners to the buttons
  row.querySelector('.edit-btn').addEventListener('click', () => showEditModal(index));
  row.querySelector('.delete-btn').addEventListener('click', () => deleteProduct(index));
  // Add click event to the image
  const imageElement = row.querySelector('.image-preview');
  if (imageElement) {
    imageElement.addEventListener('click', () => {
      showEnlargedImage(product.imageUrl || DEFAULT_IMAGE);
    });
  }
  return row;
}
// Calculate Summary Totals
function calculateSummary() {
  const totalQuantity = products.reduce((sum, product) => sum + (product.quantity || 0), 0);
  const totalProfitPercentage = products.reduce((sum, product) => {
    if (product.buyPrice > 0 && product.sellPrice) {
      const profitPercentage = ((product.sellPrice - product.buyPrice) / product.buyPrice) * 100;
      return sum + profitPercentage;
    }
    return sum;
  }, 0);

  // Update the summary section in the UI
  if (ui.summarySection) {
    ui.summarySection.innerHTML = `
      <div class="summary-item">
        <strong>Total Quantity:</strong> ${totalQuantity}
      </div>
      <div class="summary-item">
        <strong>Total Profit Percentage:</strong> ${totalProfitPercentage.toFixed(2)}%
      </div>
    `;
  }
}
// Create Edit Form
function createEditForm() {
  ui.editForm.innerHTML = `
    <div class="form-group">
      <label for="productName">Product Name</label>
      <input type="text" id="productName" required>
    </div>
    <div class="form-group">
      <label for="productSerial">Serial Number</label>
      <input type="text" id="productSerial" required>
    </div>
    <div class="form-group">
      <label for="productQuantity">Quantity</label>
      <input type="number" id="productQuantity" min="0" required>
    </div>
    <div class="form-group">
      <label for="productBuyPrice">Buy Price</label>
      <input type="number" id="productBuyPrice" min="0" step="0.01" required>
    </div>
    <div class="form-group">
      <label for="productSellPrice">Sell Price</label>
      <input type="number" id="productSellPrice" min="0" step="0.01" required>
    </div>
    <div class="form-group">
      <label for="productImage">Product Image</label>
      <input type="file" id="productImage" accept="image/*">
      <div class="image-preview-container">
        <img id="imagePreviewElement" src="${DEFAULT_IMAGE}" alt="Preview" style="max-width: 200px; max-height: 200px; margin-top: 10px;">
      </div>
    </div>
    <div class="form-group">
      <button type="submit" class="primary-btn">Save Product</button>
    </div>
  `;
  // Add event listener for image preview
  const imageInput = document.getElementById('productImage');
  const imagePreview = document.getElementById('imagePreviewElement');
  if (imageInput && imagePreview) {
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          imagePreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }
  // Add event listener to the form
  ui.editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveProduct();
  });
}
// Show Edit Modal
function showEditModal(index) {
  editIndex = index;
  const product = products[index];
  // Create the form first
  createEditForm();
  // Now set the values - this prevents the null reference error
  document.getElementById('productName').value = product.name || '';
  document.getElementById('productSerial').value = product.serial || '';
  document.getElementById('productQuantity').value = product.quantity || 0;
  document.getElementById('productBuyPrice').value = product.buyPrice || 0;
  document.getElementById('productSellPrice').value = product.sellPrice || 0;
  // Update image preview if available
  const imagePreview = document.getElementById('imagePreviewElement');
  if (imagePreview && product.imageUrl) {
    imagePreview.src = product.imageUrl;
  }
  ui.editModal.style.display = 'block';
}
// Save Product to Firestore
function saveProduct() {
  const productName = document.getElementById('productName').value.trim();
  const productSerial = document.getElementById('productSerial').value.trim();
  const productQuantity = parseInt(document.getElementById('productQuantity').value.trim()) || 0;
  const productBuyPrice = parseFloat(document.getElementById('productBuyPrice').value.trim()) || 0;
  const productSellPrice = parseFloat(document.getElementById('productSellPrice').value.trim()) || 0;

  // Validate unique serial number
  const existingProduct = products.find((product, idx) => product.serial === productSerial && idx !== editIndex);
  if (existingProduct) {
    alert('A product with this serial number already exists.');
    return;
  }

  const productData = {
    name: productName,
    serial: productSerial,
    quantity: productQuantity,
    buyPrice: productBuyPrice,
    sellPrice: productSellPrice,
  };

  // Handle the image
  const imageInput = document.getElementById('productImage');
  if (imageInput && imageInput.files && imageInput.files[0]) {
    const file = imageInput.files[0];
    // Check file size - limit to 1MB to avoid Firestore document size limits
    if (file.size > 1024 * 1024) {
      compressAndSaveImage(file, productData); // Compress and save the image
      return;
    }
    showLoading();
    const reader = new FileReader();
    reader.onload = (e) => {
      productData.imageUrl = e.target.result;
      saveToFirestore(productData);
    };
    reader.readAsDataURL(file);
  } else {
    // No new image selected
    if (editIndex !== null) {
      // Keep the existing image URL for edits
      productData.imageUrl = products[editIndex].imageUrl || DEFAULT_IMAGE;
    } else {
      // Use placeholder for new products
      productData.imageUrl = DEFAULT_IMAGE;
    }
    showLoading();
    saveToFirestore(productData);
  }
}
// Helper function to save to Firestore
function saveToFirestore(productData) {
  if (editIndex !== null) {
    const productId = products[editIndex].id;
    db.collection('products').doc(productId).update(productData)
      .then(() => {
        loadProducts();
        hideLoading();
        ui.editModal.style.display = 'none';
      })
      .catch((error) => {
        console.error('Error updating product: ', error);
        hideLoading();
        alert('Error updating product: ' + error.message);
      });
  } else {
    db.collection('products').add(productData)
      .then(() => {
        loadProducts();
        hideLoading();
        ui.editModal.style.display = 'none';
      })
      .catch((error) => {
        console.error('Error adding product: ', error);
        hideLoading();
        alert('Error adding product: ' + error.message);
      });
  }
}
// Delete Product
function deleteProduct(index) {
  if (confirm('Are you sure you want to delete this product?')) {
    const productId = products[index].id;
    showLoading();
    db.collection('products').doc(productId).delete()
      .then(() => {
        loadProducts();
        hideLoading();
      })
      .catch((error) => {
        console.error('Error deleting product: ', error);
        hideLoading();
        alert('Error deleting product: ' + error.message);
      });
  }
}
// Search Products
function searchProducts() {
  const searchTerm = ui.searchInput.value.toLowerCase();
  const filteredProducts = products.filter(product =>
    (product.name && product.name.toLowerCase().includes(searchTerm)) ||
    (product.serial && product.serial.toLowerCase().includes(searchTerm))
  );
  ui.productsBody.innerHTML = '';
  filteredProducts.forEach((product, index) => {
    // Use the original index from the products array
    const originalIndex = products.findIndex(p => p.id === product.id);
    const row = createProductRow(product, originalIndex);
    ui.productsBody.appendChild(row);
  });
  calculateSummary(); // Recalculate summary after filtering
}
// Export to CSV
function exportToCSV() {
  let csvContent = "data:text/csv;charset=utf-8,";
  // CSV Header
  csvContent += "Product Name,Serial Number,Quantity,Buy Price,Sell Price,Profit\n";
  // CSV Data
  products.forEach(product => {
    let profitPercentage = "N/A";
    if (product.buyPrice > 0 && product.sellPrice) {
      profitPercentage = (((product.sellPrice - product.buyPrice) / product.buyPrice) * 100).toFixed(2);
    }
    csvContent += `${product.name || 'N/A'},${product.serial || 'N/A'},${product.quantity || 0},${product.buyPrice || 0},${product.sellPrice || 0},${profitPercentage}%\n`;
  });
  // Create download link
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `stock_export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  // Trigger download and cleanup
  link.click();
  document.body.removeChild(link);
}
// Compress image before storing
async function compressAndSaveImage(file, productData) {
  try {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async (e) => {
      const compressedImage = await compressImage(e.target.result, 0.7); // Compress to 70% quality
      productData.imageUrl = compressedImage;
      saveToFirestore(productData);
    };
  } catch (error) {
    console.error('Error compressing image:', error);
    alert('Error compressing image. Please try again.');
  }
}
// Compress image helper function
function compressImage(base64, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      // Maintain aspect ratio but limit max dimensions
      const maxWidth = 800;
      const maxHeight = 800;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
}
// Show Enlarged Image Modal
function showEnlargedImage(imageUrl) {
  if (uiImageModal.imageModal && uiImageModal.enlargedImage) {
    uiImageModal.enlargedImage.src = imageUrl;
    uiImageModal.imageModal.style.display = 'block';
  }
}
// Hide Enlarged Image Modal
function hideEnlargedImage() {
  if (uiImageModal.imageModal) {
    uiImageModal.imageModal.style.display = 'none';
  }
}
// Check dark mode on page load
checkDarkModePreference();
// Initialize the app
init();





// New DOM Elements for Income Section
const uiIncome = {
  incomeForm: document.getElementById('incomeForm'),
  incomeDate: document.getElementById('incomeDate'),
  incomeAmount: document.getElementById('incomeAmount'),
  incomeBody: document.getElementById('incomeBody'),
  incomeSearchInput: document.getElementById('incomeSearchInput')
};

let incomes = []; // Array to store income data

// Load Income Data from Firestore
function loadIncomes() {
  showLoading();
  db.collection('incomes').get()
    .then((querySnapshot) => {
      incomes = [];
      querySnapshot.forEach((doc) => {
        incomes.push({ id: doc.id, ...doc.data() });
      });
      renderIncomes();
      hideLoading();
    })
    .catch((error) => {
      console.error('Error loading incomes: ', error);
      hideLoading();
    });
}

// Render Incomes
function renderIncomes(filteredIncomes = incomes) {
  uiIncome.incomeBody.innerHTML = '';
  filteredIncomes.forEach((income) => {
    const row = createIncomeRow(income);
    uiIncome.incomeBody.appendChild(row);
  });
}

// Create Income Row
function createIncomeRow(income) {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${income.date || 'N/A'}</td>
    <td>$${income.amount.toFixed(2)}</td>
    <td>
      <button class="danger-btn delete-income-btn" data-id="${income.id}">Delete</button>
    </td>
  `;
  // Add event listener to the delete button
  row.querySelector('.delete-income-btn').addEventListener('click', () => deleteIncome(income.id));
  return row;
}

// Save Income to Firestore
function saveIncome() {
  const incomeData = {
    date: uiIncome.incomeDate.value.trim(),
    amount: parseFloat(uiIncome.incomeAmount.value.trim()) || 0,
  };

  if (!incomeData.date || incomeData.amount <= 0) {
    alert('Please enter a valid date and income amount.');
    return;
  }

  showLoading();
  db.collection('incomes').add(incomeData)
    .then(() => {
      loadIncomes();
      uiIncome.incomeForm.reset();
      hideLoading();
    })
    .catch((error) => {
      console.error('Error adding income: ', error);
      hideLoading();
      alert('Error adding income: ' + error.message);
    });
}

// Delete Income
function deleteIncome(id) {
  if (confirm('Are you sure you want to delete this income entry?')) {
    showLoading();
    db.collection('incomes').doc(id).delete()
      .then(() => {
        loadIncomes();
        hideLoading();
      })
      .catch((error) => {
        console.error('Error deleting income: ', error);
        hideLoading();
        alert('Error deleting income: ' + error.message);
      });
  }
}

// Search Incomes by Date
function searchIncomes() {
  const searchTerm = uiIncome.incomeSearchInput.value.trim().toLowerCase();
  const filteredIncomes = incomes.filter(income =>
    income.date.toLowerCase().includes(searchTerm)
  );
  renderIncomes(filteredIncomes);
}

// Setup Event Listeners for Income Section
function setupIncomeEventListeners() {
  if (uiIncome.incomeForm) {
    uiIncome.incomeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveIncome();
    });
  }
  if (uiIncome.incomeSearchInput) {
    uiIncome.incomeSearchInput.addEventListener('input', searchIncomes);
  }
}

// Initialize Income Section
function initIncomeSection() {
  loadIncomes();
  setupIncomeEventListeners();
}

// Initialize Income Section on App Load
initIncomeSection();











