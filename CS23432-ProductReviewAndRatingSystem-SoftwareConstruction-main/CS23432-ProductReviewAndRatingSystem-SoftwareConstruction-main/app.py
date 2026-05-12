from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid

app = Flask(__name__, static_folder='../frontend', static_url_path='/')
# Enable CORS so the frontend can communicate with the backend
CORS(app)

@app.route('/')
def index():
    return app.send_static_file('index.html')

# --- In-Memory Database ---
# In a real app, you would use a database like MongoDB, PostgreSQL, or SQLite.
users = {}      # user_id -> { id, username, password, role }
products = {}   # product_id -> { id, name, description, category, price, user_id, image_url }
reviews = {}    # review_id -> { id, product_id, user_id, rating, comment }

# Create a default admin user
admin_id = str(uuid.uuid4())
users[admin_id] = {
    'id': admin_id,
    'username': 'admin',
    'password': 'password', # In production, NEVER store plain text passwords! Hash them.
    'role': 'admin'
}

# Create a default regular user
default_user_id = str(uuid.uuid4())
users[default_user_id] = {
    'id': default_user_id,
    'username': 'user',
    'password': 'password',
    'role': 'user'
}

# Pre-populate products
default_products = [
    # Electronics
    {'name': 'Smartphone X', 'description': 'The latest smartphone with amazing features.', 'category': 'electronics', 'price': 999.99, 'image_url': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&q=80'},
    {'name': 'Wireless Headphones', 'description': 'Noise-cancelling over-ear headphones.', 'category': 'electronics', 'price': 199.99, 'image_url': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80'},
    {'name': 'Laptop Pro', 'description': 'High-performance laptop for professionals.', 'category': 'electronics', 'price': 1499.99, 'image_url': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&q=80'},
    # Clothing
    {'name': 'Classic T-Shirt', 'description': 'Comfortable cotton t-shirt.', 'category': 'clothing', 'price': 19.99, 'image_url': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80'},
    {'name': 'Denim Jacket', 'description': 'Stylish and durable denim jacket.', 'category': 'clothing', 'price': 59.99, 'image_url': 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=500&q=80'},
    # Books
    {'name': 'The Great Novel', 'description': 'A bestselling fiction novel.', 'category': 'books', 'price': 14.99, 'image_url': 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&q=80'},
    {'name': 'Sci-Fi Adventure', 'description': 'Explore the universe in this exciting book.', 'category': 'books', 'price': 12.99, 'image_url': 'https://images.unsplash.com/photo-1614113489855-66422ad300a4?w=500&q=80'},
    # Home
    {'name': 'Ceramic Coffee Mug', 'description': 'Handcrafted ceramic mug.', 'category': 'home', 'price': 9.99, 'image_url': 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=500&q=80'},
    {'name': 'Minimalist Lamp', 'description': 'Modern desk lamp with adjustable brightness.', 'category': 'home', 'price': 34.99, 'image_url': 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500&q=80'},
    # Other
    {'name': 'Premium Yoga Mat', 'description': 'Non-slip exercise and yoga mat.', 'category': 'other', 'price': 24.99, 'image_url': 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500&q=80'},
    {'name': 'Insulated Water Bottle', 'description': 'Keeps drinks cold for 24 hours.', 'category': 'other', 'price': 18.99, 'image_url': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&q=80'}
]

for dp in default_products:
    p_id = str(uuid.uuid4())
    products[p_id] = {
        'id': p_id,
        'name': dp['name'],
        'description': dp['description'],
        'category': dp['category'],
        'price': dp['price'],
        'image_url': dp['image_url'],
        'user_id': admin_id
    }

# --- Helper Functions ---
def get_user_from_token(token):
    # In this simple version, the token IS the user_id
    return users.get(token)

# --- Routes ---

# 1. Authentication
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'user')
    
    if role not in ['admin', 'user']:
        role = 'user'
    
    # Check if username exists
    if any(u['username'] == username for u in users.values()):
        return jsonify({'error': 'Username already exists'}), 400
        
    user_id = str(uuid.uuid4())
    users[user_id] = {
        'id': user_id,
        'username': username,
        'password': password,
        'role': role
    }
    return jsonify({
        'message': 'User registered successfully', 
        'token': user_id,
        'role': role,
        'username': username
    }), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    for user_id, user in users.items():
        if user['username'] == username and user['password'] == password:
            # We return the user_id as a simple "token"
            return jsonify({
                'message': 'Login successful', 
                'token': user_id,
                'role': user['role'],
                'username': user['username']
            }), 200
            
    return jsonify({'error': 'Invalid username or password'}), 401

# 2. Products
@app.route('/products', methods=['GET'])
def get_products():
    # Support search, filter, and sort
    search_query = request.args.get('search', '').lower()
    category_filter = request.args.get('category', '').lower()
    sort_by = request.args.get('sort', '') # e.g., 'rating_desc'
    
    result = []
    for p in products.values():
        # Apply search
        if search_query and search_query not in p['name'].lower() and search_query not in p['description'].lower():
            continue
        # Apply category filter
        if category_filter and category_filter != p['category'].lower():
            continue
            
        # Calculate average rating
        product_reviews = [r for r in reviews.values() if r['product_id'] == p['id']]
        avg_rating = sum(r['rating'] for r in product_reviews) / len(product_reviews) if product_reviews else 0
        
        product_data = p.copy()
        product_data['average_rating'] = avg_rating
        product_data['review_count'] = len(product_reviews)
        result.append(product_data)
        
    # Apply sort
    if sort_by == 'rating_desc':
        result.sort(key=lambda x: x['average_rating'], reverse=True)
    elif sort_by == 'rating_asc':
        result.sort(key=lambda x: x['average_rating'])
        
    return jsonify(result), 200

@app.route('/products/<product_id>', methods=['GET'])
def get_product(product_id):
    product = products.get(product_id)
    if not product:
        return jsonify({'error': 'Product not found'}), 404
        
    # Calculate average rating
    product_reviews = [r for r in reviews.values() if r['product_id'] == product_id]
    avg_rating = sum(r['rating'] for r in product_reviews) / len(product_reviews) if product_reviews else 0
    
    product_data = product.copy()
    product_data['average_rating'] = avg_rating
    return jsonify(product_data), 200

@app.route('/products', methods=['POST'])
def add_product():
    token = request.headers.get('Authorization')
    user = get_user_from_token(token)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
        
    if user['role'] != 'admin':
        return jsonify({'error': 'Forbidden: Only admins can add products'}), 403
        
    data = request.json
    product_id = str(uuid.uuid4())
    products[product_id] = {
        'id': product_id,
        'name': data.get('name'),
        'description': data.get('description'),
        'category': data.get('category'),
        'price': data.get('price'),
        'image_url': data.get('image_url', 'https://via.placeholder.com/500x300?text=No+Image'),
        'user_id': user['id'] # The user who added it
    }
    return jsonify({'message': 'Product added successfully', 'id': product_id}), 201

@app.route('/products/<product_id>', methods=['PUT', 'DELETE'])
def manage_product(product_id):
    token = request.headers.get('Authorization')
    user = get_user_from_token(token)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
        
    if product_id not in products:
        return jsonify({'error': 'Product not found'}), 404
        
    # Only admin can edit/delete products
    if user['role'] != 'admin':
        return jsonify({'error': 'Forbidden: Only admins can manage products'}), 403
        
    if request.method == 'DELETE':
        del products[product_id]
        # Also delete associated reviews
        reviews_to_delete = [r_id for r_id, r in reviews.items() if r['product_id'] == product_id]
        for r_id in reviews_to_delete:
            del reviews[r_id]
        return jsonify({'message': 'Product deleted successfully'}), 200
        
    elif request.method == 'PUT':
        data = request.json
        products[product_id].update({
            'name': data.get('name', products[product_id]['name']),
            'description': data.get('description', products[product_id]['description']),
            'category': data.get('category', products[product_id]['category']),
            'price': data.get('price', products[product_id]['price']),
            'image_url': data.get('image_url', products[product_id].get('image_url'))
        })
        return jsonify({'message': 'Product updated successfully'}), 200

# 3. Reviews
@app.route('/products/<product_id>/reviews', methods=['GET'])
def get_product_reviews(product_id):
    product_reviews = []
    for r in reviews.values():
        if r['product_id'] == product_id:
            review_data = r.copy()
            # Attach username
            reviewer = users.get(r['user_id'])
            review_data['username'] = reviewer['username'] if reviewer else 'Unknown User'
            product_reviews.append(review_data)
    return jsonify(product_reviews), 200

@app.route('/products/<product_id>/reviews', methods=['POST'])
def add_review(product_id):
    token = request.headers.get('Authorization')
    user = get_user_from_token(token)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
        
    if user['role'] != 'user':
        return jsonify({'error': 'Forbidden: Only users can write reviews'}), 403
        
    if product_id not in products:
        return jsonify({'error': 'Product not found'}), 404
        
    data = request.json
    rating = data.get('rating')
    
    if not rating or not isinstance(rating, int) or rating < 1 or rating > 5:
        return jsonify({'error': 'Rating must be an integer between 1 and 5'}), 400
        
    review_id = str(uuid.uuid4())
    reviews[review_id] = {
        'id': review_id,
        'product_id': product_id,
        'user_id': user['id'],
        'rating': rating,
        'comment': data.get('comment', ''),
        'image_url': data.get('image_url', '')
    }
    return jsonify({'message': 'Review added successfully'}), 201

@app.route('/reviews/<review_id>', methods=['PUT', 'DELETE'])
def manage_review(review_id):
    token = request.headers.get('Authorization')
    user = get_user_from_token(token)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
        
    if review_id not in reviews:
        return jsonify({'error': 'Review not found'}), 404
        
    # Only admin or the author can edit/delete
    if user['role'] != 'admin' and reviews[review_id]['user_id'] != user['id']:
        return jsonify({'error': 'Forbidden'}), 403
        
    if request.method == 'DELETE':
        del reviews[review_id]
        return jsonify({'message': 'Review deleted successfully'}), 200
        
    elif request.method == 'PUT':
        data = request.json
        rating = data.get('rating')
        if rating is not None and (not isinstance(rating, int) or rating < 1 or rating > 5):
            return jsonify({'error': 'Rating must be an integer between 1 and 5'}), 400
            
        reviews[review_id].update({
            'rating': rating if rating else reviews[review_id]['rating'],
            'comment': data.get('comment', reviews[review_id]['comment']),
            'image_url': data.get('image_url', reviews[review_id].get('image_url', ''))
        })
        return jsonify({'message': 'Review updated successfully'}), 200

# 4. Admin
@app.route('/users', methods=['GET'])
def get_users():
    token = request.headers.get('Authorization')
    user = get_user_from_token(token)
    if not user or user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized. Admin access required.'}), 403
        
    user_list = [{'id': u['id'], 'username': u['username'], 'role': u['role']} for u in users.values()]
    return jsonify(user_list), 200

# 5. Profile
@app.route('/profile', methods=['GET'])
def get_profile():
    token = request.headers.get('Authorization')
    user = get_user_from_token(token)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
        
    user_products = [p for p in products.values() if p['user_id'] == user['id']]
    
    user_reviews = []
    for r in reviews.values():
        if r['user_id'] == user['id']:
            review_data = r.copy()
            # Attach product name for display
            product = products.get(r['product_id'])
            review_data['product_name'] = product['name'] if product else 'Unknown Product'
            user_reviews.append(review_data)
            
    return jsonify({
        'user': {'id': user['id'], 'username': user['username'], 'role': user['role']},
        'products': user_products,
        'reviews': user_reviews
    }), 200

if __name__ == '__main__':
    print("Starting Flask application on port 5000...")
    print("Admin user created automatically: username=admin, password=password")
    app.run(debug=True, port=5000)
