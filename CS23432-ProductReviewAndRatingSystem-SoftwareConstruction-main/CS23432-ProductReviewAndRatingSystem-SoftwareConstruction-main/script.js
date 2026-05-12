const API_URL = 'http://127.0.0.1:5000';

// Helper to render 5 stars
function renderStars(rating) {
    let html = '';
    const rounded = Math.round(rating);
    for(let i = 1; i <= 5; i++) {
        if(i <= rounded) {
            html += '<span class="star-icon" style="color: #fbbf24;">&#9733;</span>';
        } else {
            html += '<span class="star-icon" style="color: #475569;">&#9733;</span>';
        }
    }
    return html;
}

// ==========================================
// Authentication & Global State
// ==========================================
function checkAuth() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const username = localStorage.getItem('username');
    
    if (!token && !window.location.href.includes('index.html')) {
        window.location.href = 'index.html';
        return;
    }

    if (token) {
        const greeting = document.getElementById('user-greeting');
        if (greeting) greeting.textContent = `Hello, ${username}`;
        
        const adminLink = document.getElementById('admin-link');
        if (adminLink && role === 'admin') {
            adminLink.style.display = 'inline-block';
        }

        const addProductBtn = document.getElementById('add-product-btn');
        if (addProductBtn) {
            addProductBtn.style.display = role === 'admin' ? 'inline-block' : 'none';
        }

        const addReviewBtn = document.getElementById('add-review-btn');
        if (addReviewBtn) {
            addReviewBtn.style.display = role === 'user' ? 'inline-block' : 'none';
        }
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    window.location.href = 'index.html';
}

async function handleAuth(event, type) {
    event.preventDefault();
    const username = document.getElementById(`${type}-username`).value;
    const password = document.getElementById(`${type}-password`).value;
    const msgDiv = document.getElementById('auth-message');
    
    let bodyData = { username, password };
    if (type === 'register') {
        const roleEl = document.getElementById('register-role');
        if (roleEl) bodyData.role = roleEl.value;
    }
    
    try {
        const response = await fetch(`${API_URL}/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role || 'user');
            localStorage.setItem('username', data.username || username);
            window.location.href = 'products.html';
        } else {
            msgDiv.textContent = data.error || 'Authentication failed';
        }
    } catch (error) {
        msgDiv.textContent = 'Network error. Is the backend running?';
        console.error('Error:', error);
    }
}

// ==========================================
// Modals
// ==========================================
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
    }
}

function openAddProductModal() {
    document.getElementById('product-modal-title').innerText = 'Add New Product';
    document.getElementById('prod-id').value = '';
    document.getElementById('prod-name').value = '';
    document.getElementById('prod-desc').value = '';
    document.getElementById('prod-cat').value = 'electronics';
    document.getElementById('prod-price').value = '';
    document.getElementById('prod-image').value = '';
    openModal('add-product-modal');
}

function openEditProductModal(id, name, desc, cat, price, image) {
    document.getElementById('product-modal-title').innerText = 'Edit Product';
    document.getElementById('prod-id').value = id;
    document.getElementById('prod-name').value = name;
    document.getElementById('prod-desc').value = desc;
    document.getElementById('prod-cat').value = cat;
    document.getElementById('prod-price').value = price;
    document.getElementById('prod-image').value = image || '';
    openModal('add-product-modal');
}

// ==========================================
// Products API
// ==========================================
async function fetchProducts() {
    const search = document.getElementById('search-input')?.value || '';
    const category = document.getElementById('category-filter')?.value || '';
    const sort = document.getElementById('sort-filter')?.value || '';
    
    const queryParams = new URLSearchParams();
    if (search) queryParams.append('search', search);
    if (category) queryParams.append('category', category);
    if (sort) queryParams.append('sort', sort);
    
    const container = document.getElementById('products-container');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Loading products...</div>';
    
    try {
        const response = await fetch(`${API_URL}/products?${queryParams}`);
        const products = await response.json();
        
        if (products.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">No products found.</p>';
            return;
        }
        
        container.innerHTML = '';
        products.forEach(p => {
            const card = createProductCard(p);
            container.appendChild(card);
        });
    } catch (error) {
        container.innerHTML = '<p class="error">Failed to load products.</p>';
        console.error(error);
    }
}

function createProductCard(p) {
    const card = document.createElement('div');
    card.className = 'product-card glass-card';
    
    const starsHtml = renderStars(p.average_rating || 0);
    const role = localStorage.getItem('role');
    const canDelete = role === 'admin';
    
    // Escaping strings for onclick arguments using encodeURIComponent to handle newlines and quotes
    const safeName = encodeURIComponent(p.name || '');
    const safeDesc = encodeURIComponent(p.description || '');
    
    let actionsHtml = `<a href="product-details.html?id=${p.id}" class="btn btn-secondary w-100">View Details</a>`;
    
    if(canDelete) {
        actionsHtml = `
            <a href="product-details.html?id=${p.id}" class="btn btn-secondary w-100 mb-20" style="margin-bottom: 10px;">View Details</a>
            <div style="display:flex; gap:10px;">
                <button onclick="openEditProductModal('${p.id}', decodeURIComponent('${safeName}'), decodeURIComponent('${safeDesc}'), '${p.category}', '${p.price}', '${p.image_url || ''}')" class="btn btn-primary" style="flex:1">Edit</button>
                <button onclick="deleteProduct('${p.id}')" class="btn btn-danger" style="flex:1">Delete</button>
            </div>
        `;
    }
    
    card.innerHTML = `
        <div class="product-image-container">
            <img src="${p.image_url || 'https://via.placeholder.com/500x300?text=No+Image'}" alt="${p.name}" class="product-image">
        </div>
        <div class="product-cat">${p.category}</div>
        <h3 class="product-title">${p.name}</h3>
        <p class="product-desc">${p.description}</p>
        <div class="product-meta">
            <span class="product-price">₹${parseFloat(p.price).toFixed(2)}</span>
            <span class="product-rating">
                ${starsHtml} <small style="color:var(--text-muted)">(${p.review_count || 0})</small>
            </span>
        </div>
        <div class="product-actions" style="margin-top:15px; border-top:1px solid var(--border-color); padding-top:15px;">
            ${actionsHtml}
        </div>
    `;
    return card;
}

async function handleAddProduct(event) {
    event.preventDefault();
    
    const id = document.getElementById('prod-id').value;
    const name = document.getElementById('prod-name').value;
    const description = document.getElementById('prod-desc').value;
    const category = document.getElementById('prod-cat').value;
    const price = document.getElementById('prod-price').value;
    const image_url = document.getElementById('prod-image').value;
    
    const isEdit = id !== '';
    const url = isEdit ? `${API_URL}/products/${id}` : `${API_URL}/products`;
    const method = isEdit ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('token')
            },
            body: JSON.stringify({ name, description, category, price: parseFloat(price), image_url })
        });
        
        if (response.ok) {
            closeModal('add-product-modal');
            if (window.location.href.includes('profile.html')) {
                fetchProfile();
            } else {
                fetchProducts();
            }
        } else if (response.status === 401) {
            alert("Your session has expired. Please log in again.");
            logout();
        } else {
            alert('Failed to save product');
        }
    } catch (error) {
        console.error(error);
        alert('Error saving product');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        const response = await fetch(`${API_URL}/products/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': localStorage.getItem('token') }
        });
        
        if (response.ok) {
            if (window.location.href.includes('profile.html')) {
                fetchProfile();
            } else {
                fetchProducts();
            }
        } else if (response.status === 401) {
            logout();
        } else {
            alert('Failed to delete product');
        }
    } catch (error) {
        console.error(error);
    }
}

// ==========================================
// Product Details & Reviews API
// ==========================================
async function fetchProductDetails(productId) {
    const container = document.getElementById('product-info-container');
    if (!container) return;
    
    try {
        const response = await fetch(`${API_URL}/products/${productId}`);
        if (!response.ok) throw new Error('Product not found');
        
        const p = await response.json();
        const starsHtml = renderStars(p.average_rating || 0);
                         
        container.innerHTML = `
            <img src="${p.image_url || 'https://via.placeholder.com/1200x400?text=No+Image'}" alt="${p.name}" class="product-details-img">
            <div class="product-details-content">
                <div class="product-cat">${p.category}</div>
                <h1 class="product-title">${p.name}</h1>
                <div style="font-size:1.5rem; color:var(--primary); font-weight:700; margin-bottom:20px;">
                    ₹${parseFloat(p.price).toFixed(2)}
                </div>
                <p style="font-size:1.1rem; line-height:1.8; color:var(--text-muted); margin-bottom:20px;">
                    ${p.description}
                </p>
                <div class="product-meta" style="border-top:none; padding-top:0;">
                    <span class="product-rating" style="font-size:1.2rem;">
                        <strong>Rating:</strong> ${(p.average_rating || 0).toFixed(1)} ${starsHtml}
                    </span>
                </div>
            </div>
        `;
    } catch (error) {
        container.innerHTML = '<p class="error" style="color:var(--danger)">Failed to load product details.</p>';
        console.error(error);
    }
}

async function fetchProductReviews(productId) {
    const container = document.getElementById('reviews-container');
    if (!container) return;
    
    try {
        const response = await fetch(`${API_URL}/products/${productId}/reviews`);
        const reviews = await response.json();
        
        if (reviews.length === 0) {
            container.innerHTML = '<p>No reviews yet. Be the first to review!</p>';
            return;
        }
        
        container.innerHTML = '';
        reviews.forEach(r => {
            const div = createReviewElement(r, productId);
            container.appendChild(div);
        });
    } catch (error) {
        container.innerHTML = '<p class="error">Failed to load reviews.</p>';
        console.error(error);
    }
}

function createReviewElement(r, productId) {
    const div = document.createElement('div');
    div.className = 'review-item glass-card';
    
    const starsHtml = renderStars(r.rating);
    
    const role = localStorage.getItem('role');
    const userId = localStorage.getItem('token');
    const canDelete = role === 'admin' || r.user_id === userId;
    const canEdit = r.user_id === userId;
    
    const safeComment = encodeURIComponent(r.comment || '');
    const safeImage = encodeURIComponent(r.image_url || '');
    const prodIdArg = productId ? `'${productId}'` : `null`;
    
    div.innerHTML = `
        <div class="review-meta">
            <div>
                <span class="reviewer-name">${r.username}</span>
                ${r.product_name ? `<div style="font-size:0.8rem; color:var(--primary);">${r.product_name}</div>` : ''}
                <div class="product-rating">${starsHtml}</div>
            </div>
            <div style="display:flex; gap:5px; align-items:flex-start;">
                ${canEdit ? `<button onclick="openEditReviewModal('${r.id}', ${r.rating}, decodeURIComponent('${safeComment}'), ${prodIdArg}, decodeURIComponent('${safeImage}'))" class="btn btn-primary btn-sm">Edit</button>` : ''}
                ${canDelete ? `<button onclick="deleteReview('${r.id}', ${prodIdArg})" class="btn btn-danger btn-sm">Delete</button>` : ''}
            </div>
        </div>
        <p class="review-comment" style="white-space: pre-wrap;">${r.comment || '<em>No comment provided.</em>'}</p>
        ${r.image_url ? `<img src="${r.image_url}" style="max-width: 100%; max-height: 200px; margin-top: 10px; border-radius: 8px;">` : ''}
    `;
    return div;
}

function openReviewModal() {
    document.getElementById('review-modal-title').innerText = 'Write a Review';
    document.getElementById('edit-review-id').value = '';
    document.getElementById('edit-review-prod-id').value = '';
    document.querySelectorAll('#star-rating-input .star').forEach(s => s.classList.remove('selected'));
    document.getElementById('review-rating').value = '';
    document.getElementById('review-comment').value = '';
    const imgInput = document.getElementById('review-image');
    if (imgInput) imgInput.value = '';
    openModal('add-review-modal');
}

function openEditReviewModal(id, rating, comment, productId, imageUrl) {
    document.getElementById('review-modal-title').innerText = 'Edit Review';
    document.getElementById('edit-review-id').value = id;
    document.getElementById('edit-review-prod-id').value = productId || '';
    
    // Set stars
    document.getElementById('review-rating').value = rating;
    document.querySelectorAll('#star-rating-input .star').forEach(s => {
        if (s.getAttribute('data-value') <= rating) s.classList.add('selected');
        else s.classList.remove('selected');
    });
    
    document.getElementById('review-comment').value = comment;
    const imgInput = document.getElementById('review-image');
    if (imgInput) imgInput.value = imageUrl || '';
    openModal('add-review-modal');
}

async function submitReview(event) {
    event.preventDefault();
    
    // Try to get productId from modal hidden field, or from URL
    let productId = document.getElementById('edit-review-prod-id')?.value;
    if (!productId) {
        const urlParams = new URLSearchParams(window.location.search);
        productId = urlParams.get('id');
    }
    
    const reviewId = document.getElementById('edit-review-id').value;
    const rating = document.getElementById('review-rating').value;
    const comment = document.getElementById('review-comment').value;
    const imgInput = document.getElementById('review-image');
    const image_url = imgInput ? imgInput.value : '';
    
    if (!rating) {
        alert('Please select a star rating.');
        return;
    }
    
    const isEdit = reviewId !== '';
    const url = isEdit ? `${API_URL}/reviews/${reviewId}` : `${API_URL}/products/${productId}/reviews`;
    const method = isEdit ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('token')
            },
            body: JSON.stringify({ rating: parseInt(rating), comment, image_url })
        });
        
        if (response.ok) {
            closeModal('add-review-modal');
            if (window.location.href.includes('profile.html')) {
                fetchProfile();
            } else if (productId) {
                fetchProductDetails(productId);
                fetchProductReviews(productId);
            }
        } else if (response.status === 401) {
            alert("Your session has expired or the server restarted. Please log in again.");
            logout();
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to save review');
        }
    } catch (error) {
        console.error(error);
        alert('Error saving review');
    }
}

async function deleteReview(reviewId, productId) {
    if (!confirm('Are you sure you want to delete this review?')) return;
    
    // If productId is not passed directly, try to get it from URL
    if (!productId) {
        const urlParams = new URLSearchParams(window.location.search);
        productId = urlParams.get('id');
    }
    
    try {
        const response = await fetch(`${API_URL}/reviews/${reviewId}`, {
            method: 'DELETE',
            headers: { 'Authorization': localStorage.getItem('token') }
        });
        
        if (response.ok) {
            if (window.location.href.includes('profile.html')) {
                fetchProfile();
            } else if (productId) {
                fetchProductDetails(productId);
                fetchProductReviews(productId);
            }
        } else if (response.status === 401) {
            logout();
        } else {
            alert('Failed to delete review');
        }
    } catch (error) {
        console.error(error);
    }
}

// ==========================================
// Profile API
// ==========================================
async function fetchProfile() {
    const productsContainer = document.getElementById('my-products-container');
    const reviewsContainer = document.getElementById('my-reviews-container');
    
    if (!productsContainer || !reviewsContainer) return;
    
    try {
        const response = await fetch(`${API_URL}/profile`, {
            headers: { 'Authorization': localStorage.getItem('token') }
        });
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        const data = await response.json();
        
        // Render My Products
        if (data.products.length === 0) {
            productsContainer.innerHTML = '<p style="text-align:center;">You haven\'t added any products yet.</p>';
            productsContainer.style.display = 'block';
        } else {
            productsContainer.innerHTML = '';
            productsContainer.style.display = 'grid';
            data.products.forEach(p => {
                productsContainer.appendChild(createProductCard(p));
            });
        }
        
        // Render My Reviews
        if (data.reviews.length === 0) {
            reviewsContainer.innerHTML = '<p>You haven\'t written any reviews yet.</p>';
        } else {
            reviewsContainer.innerHTML = '';
            data.reviews.forEach(r => {
                // pass null for productId so it stays generic
                reviewsContainer.appendChild(createReviewElement(r, null));
            });
        }
        
    } catch(err) {
        console.error(err);
        productsContainer.innerHTML = '<p class="error">Failed to load profile.</p>';
        reviewsContainer.innerHTML = '';
    }
}

// ==========================================
// Admin API
// ==========================================
async function fetchUsers() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    
    try {
        const response = await fetch(`${API_URL}/users`, {
            headers: { 'Authorization': localStorage.getItem('token') }
        });
        
        if (!response.ok) throw new Error('Failed to fetch users');
        
        const users = await response.json();
        tbody.innerHTML = '';
        
        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><small style="color:var(--text-muted)">${u.id.substring(0,8)}...</small></td>
                <td><strong>${u.username}</strong></td>
                <td>
                    <span style="padding:4px 8px; border-radius:4px; font-size:0.8rem; background:${u.role==='admin'?'var(--primary)':'var(--secondary)'}">
                        ${u.role.toUpperCase()}
                    </span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="3" style="color:var(--danger)">Error loading users.</td></tr>`;
        console.error(error);
    }
}
