let currentRole = localStorage.getItem('sm_currentRole') || 'customer';
let postalName = localStorage.getItem('sm_postalName') || "Gupta Kirana Store";
let loggedInUserName = localStorage.getItem('sm_userName') || "Rajan Pal";
let loggedInUserPhone = localStorage.getItem('sm_userPhone') || "9876543210";
let loggedInUserEmail = localStorage.getItem('sm_userEmail') || "rajan@example.com";
let selectedStoreFilter = "All";

let currentLat = 28.4744;
let currentLng = 77.5040;

let defaultUsers = [
    { phone: "9876543210", email: "rajan@example.com", password: "123", name: "Rajan Pal", role: "customer", lat: 28.4744, lng: 77.5040 },
    { phone: "9123456789", email: "gupta@example.com", password: "123", name: "Ramesh Gupta", role: "shopkeeper", shopName: "Gupta Kirana Store", lat: 28.4750, lng: 77.5050 }
];
let registeredUsers = JSON.parse(localStorage.getItem('sm_registeredUsers')) || defaultUsers;

// Default live products initialization in localStorage
if(!localStorage.getItem('sm_liveProducts')) {
    let initialProducts = [
        { id: 1, name: "Aashirvaad Atta (5kg)", price: 240, shop: "Gupta Kirana Store", shopLat: 28.4750, shopLng: 77.5050, image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=200&q=80" },
        { id: 2, name: "Fortune Sunflower Oil (1L)", price: 130, shop: "Sharma General Store", shopLat: 28.4800, shopLng: 77.5100, image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=200&q=80" }
    ];
    localStorage.setItem('sm_liveProducts', JSON.stringify(initialProducts));
}

let cart = {};
let alertInterval = null;
let shopCameraStream = null;
let capturedWebcamDataUrl = "";

// Page load hone par check karein
window.addEventListener('DOMContentLoaded', () => {
    let isLoggedIn = localStorage.getItem('sm_isLoggedIn');
    if(isLoggedIn === 'true') {
        document.getElementById('screen-welcome').classList.remove('active');
        if(currentRole === 'customer') {
            document.getElementById('screen-customer-home').classList.add('active');
            loadStoreFilterBar();
            loadCustomerProducts();
            document.getElementById('order-customer-name').value = loggedInUserName;
            document.getElementById('order-customer-phone').value = loggedInUserPhone;
        } else {
            document.getElementById('shop-name-display').innerText = postalName;
            document.getElementById('screen-shop-dashboard').classList.add('active');
            updateShopLiveItemsUI();
            updateShopReceivedOrdersUI();
            updateShopSoldItemsUI();
        }
    }
});

// Real-time sync listener across tabs & custom events
window.addEventListener('storage', (e) => {
    if(e.key === 'sm_liveProducts') {
        if(currentRole === 'customer' && document.getElementById('screen-customer-home').classList.contains('active')) {
            loadStoreFilterBar();
            loadCustomerProducts();
        } else if(currentRole === 'shopkeeper' && document.getElementById('screen-shop-dashboard').classList.contains('active')) {
            updateShopLiveItemsUI();
        }
    }
    if(e.key === 'sm_allOrders' && currentRole === 'shopkeeper' && document.getElementById('screen-shop-dashboard').classList.contains('active')) {
        updateShopReceivedOrdersUI();
    }
});

window.addEventListener('sm_productUpdated', () => {
    if(currentRole === 'customer' && document.getElementById('screen-customer-home').classList.contains('active')) {
        loadStoreFilterBar();
        loadCustomerProducts();
    } else if(currentRole === 'shopkeeper' && document.getElementById('screen-shop-dashboard').classList.contains('active')) {
        updateShopLiveItemsUI();
    }
});

function calculateDistance(lat1, lon1, lat2, lon2) {
    let R = 6371;
    let dLat = (lat2 - lat1) * Math.PI / 180;
    let dLon = (lon2 - lon1) * Math.PI / 180;
    let a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function fetchUserLiveLocation(callback) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            currentLat = position.coords.latitude;
            currentLng = position.coords.longitude;
            if(callback) callback();
        }, function(error) {
            if(callback) callback();
        });
    } else {
        if(callback) callback();
    }
}

function toggleProfileDrawer(open, role = 'customer') {
    let drawer = document.getElementById('profile-drawer');
    if(open) {
        document.getElementById('drawer-user-name').innerText = loggedInUserName;
        document.getElementById('drawer-user-role').innerText = (role === 'shopkeeper' ? 'Dukandaar (Seller)' : 'Customer');
        drawer.classList.add('open');
    } else {
        drawer.classList.remove('open');
    }
}

function updateCustomAvatar(event) {
    let file = event.target.files[0];
    if(file) {
        let reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('drawer-user-avatar').src = e.target.result;
            alert("✨ Profile photo update ho gayi!");
        }
        reader.readAsDataURL(file);
    }
}

function goToRoleSelection() {
    document.getElementById('screen-welcome').classList.remove('active');
    document.getElementById('screen-role-selection').classList.add('active');
}

function backToWelcome() {
    document.getElementById('screen-role-selection').classList.remove('active');
    document.getElementById('screen-welcome').classList.add('active');
}

function openModeSelection(role) {
    currentRole = role;
    localStorage.setItem('sm_currentRole', role);
    document.getElementById('screen-role-selection').classList.remove('active');
    document.getElementById('screen-mode-choice').classList.add('active');
    document.getElementById('mode-title').innerText = (role === 'customer') ? "Customer Options" : "Dukandaar Options";
}

function backToRoleSelection() {
    document.getElementById('screen-mode-choice').classList.remove('active');
    document.getElementById('screen-role-selection').classList.add('active');
}

function backToModeChoice() {
    document.getElementById('screen-login').classList.remove('active');
    document.getElementById('screen-registration').classList.remove('active');
    document.getElementById('screen-mode-choice').classList.add('active');
}

function showLoginScreen() {
    document.getElementById('screen-mode-choice').classList.remove('active');
    document.getElementById('screen-registration').classList.remove('active');
    document.getElementById('screen-login').classList.add('active');
    document.getElementById('login-heading').innerText = (currentRole === 'customer') ? "Customer Login" : "Dukandaar Login";
}

function showRegistrationScreen() {
    document.getElementById('screen-mode-choice').classList.remove('active');
    document.getElementById('screen-login').classList.remove('active');
    document.getElementById('screen-registration').classList.add('active');
    document.getElementById('reg-heading').innerText = (currentRole === 'customer') ? "Customer Registration" : "Dukandaar Registration";

    if(currentRole === 'shopkeeper') {
        document.getElementById('shopkeeper-reg-fields').style.display = 'block';
    } else {
        document.getElementById('shopkeeper-reg-fields').style.display = 'none';
    }
}

function verifyAadhaar() {
    const val = document.getElementById('aadhaarInput').value;
    if(val.length >= 6) {
        alert("ID verification successful.");
    } else {
        alert("Kripya valid ID number enter karein.");
    }
}

function generateAndShowOTP() {
    let name = document.getElementById('reg-name').value.trim();
    let phone = document.getElementById('reg-phone').value.trim();
    let email = document.getElementById('reg-email').value.trim();

    if(!name || !phone || phone.length < 10 || !email) {
        alert("Kripya Sahi Naam, 10-digit Phone aur Email ID bharein!");
        return;
    }

    if(currentRole === 'shopkeeper') {
        let sName = document.getElementById('reg-shop-name').value.trim();
        if(!sName) {
            alert("Dukan ka naam likhna anivarya hai!");
            return;
        }
        postalName = sName;
        localStorage.setItem('sm_postalName', postalName);
    }

    loggedInUserName = name;
    loggedInUserPhone = phone;
    loggedInUserEmail = email;

    localStorage.setItem('sm_userName', name);
    localStorage.setItem('sm_userPhone', phone);
    localStorage.setItem('sm_userEmail', email);

    let serverOTP = Math.floor(100000 + Math.random() * 900000).toString();
    document.getElementById('generated-otp-text').innerText = serverOTP;
    document.getElementById('otp-container-box').style.display = 'block';
    alert("📲 Live OTP generate ho gaya hai!");
}

function verifyAndCompleteRegistration() {
    let pass = document.getElementById('new-password').value.trim();
    if(!pass) {
        alert("Password dalna anivarya hai!");
        return;
    }

    fetchUserLiveLocation(() => {
        let newUser = {
            phone: loggedInUserPhone,
            email: loggedInUserEmail,
            password: pass,
            name: loggedInUserName,
            role: currentRole,
            shopName: postalName,
            lat: currentLat,
            lng: currentLng
        };

        registeredUsers.push(newUser);
        localStorage.setItem('sm_registeredUsers', JSON.stringify(registeredUsers));
        localStorage.setItem('sm_isLoggedIn', 'true');

        alert("🎉 Registration Safal Raha!");
        document.getElementById('screen-registration').classList.remove('active');

        if(currentRole === 'customer') {
            document.getElementById('screen-customer-home').classList.add('active');
            loadStoreFilterBar();
            loadCustomerProducts();
            document.getElementById('order-customer-name').value = loggedInUserName;
            document.getElementById('order-customer-phone').value = loggedInUserPhone;
        } else {
            document.getElementById('shop-name-display').innerText = postalName;
            document.getElementById('screen-shop-dashboard').classList.add('active');
            updateShopLiveItemsUI();
            updateShopReceivedOrdersUI();
            updateShopSoldItemsUI();
        }
    });
}

function executeLogin() {
    let loginId = document.getElementById('login-id').value.trim();
    let loginPass = document.getElementById('login-password').value.trim();

    let foundUser = registeredUsers.find(u => (u.phone === loginId || u.email === loginId) && u.password === loginPass && u.role === currentRole);
    if(!foundUser) {
        alert("❌ Invalid ID ya Password!");
        return;
    }

    loggedInUserName = foundUser.name;
    loggedInUserPhone = foundUser.phone;
    loggedInUserEmail = foundUser.email;
    if(foundUser.shopName) {
        postalName = foundUser.shopName;
        localStorage.setItem('sm_postalName', postalName);
    }
    if(foundUser.lat) currentLat = foundUser.lat;
    if(foundUser.lng) currentLng = foundUser.lng;

    localStorage.setItem('sm_userName', loggedInUserName);
    localStorage.setItem('sm_userPhone', loggedInUserPhone);
    localStorage.setItem('sm_userEmail', loggedInUserEmail);
    localStorage.setItem('sm_currentRole', currentRole);
    localStorage.setItem('sm_isLoggedIn', 'true');

    fetchUserLiveLocation(() => {
        alert("🎉 Login Safal Raha!");
        document.getElementById('screen-login').classList.remove('active');

        if(currentRole === 'customer') {
            document.getElementById('screen-customer-home').classList.add('active');
            loadStoreFilterBar();
            loadCustomerProducts();
            document.getElementById('order-customer-name').value = loggedInUserName;
            document.getElementById('order-customer-phone').value = loggedInUserPhone;
        } else {
            document.getElementById('shop-name-display').innerText = postalName;
            document.getElementById('screen-shop-dashboard').classList.add('active');
            updateShopLiveItemsUI();
            updateShopReceivedOrdersUI();
            updateShopSoldItemsUI();
        }
    });
}

function loadStoreFilterBar() {
    let bar = document.getElementById('store-filter-bar');
    if(!bar) return;
    bar.innerHTML = '';

    let liveProducts = JSON.parse(localStorage.getItem('sm_liveProducts')) || [];

    let nearbyProducts = liveProducts.filter(p => {
        let dist = calculateDistance(currentLat, currentLng, p.shopLat, p.shopLng);
        p.calculatedDistanceNum = dist;
        p.distanceText = dist.toFixed(1) + " km";
        return dist <= 50.0;
    });

    let stores = ["All", ...new Set(nearbyProducts.map(p => p.shop))];

    stores.forEach(store => {
        let chip = document.createElement('div');
        chip.className = `store-chip ${selectedStoreFilter === store ? 'active-chip' : ''}`;
        chip.innerText = store === 'All' ? '🏪 Sabhi Dukanen (All)' : `🏪 ${store}`;
        chip.onclick = () => {
            selectedStoreFilter = store;
            loadStoreFilterBar();
            loadCustomerProducts();
        };
        bar.appendChild(chip);
    });
}

function loadCustomerProducts() {
    let gridContainer = document.getElementById('customer-product-grid');
    if(!gridContainer) return;
    gridContainer.innerHTML = '';

    let searchInput = document.getElementById('customer-search-input');
    let searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : "";

    let liveProducts = JSON.parse(localStorage.getItem('sm_liveProducts')) || [];

    let nearbyProducts = liveProducts.filter(p => {
        let dist = calculateDistance(currentLat, currentLng, p.shopLat, p.shopLng);
        p.calculatedDistanceNum = dist;
        p.distanceText = dist.toFixed(1) + " km";
        return dist <= 50.0;
    });

    if(selectedStoreFilter !== "All") {
        nearbyProducts = nearbyProducts.filter(p => p.shop === selectedStoreFilter);
    }

    if(searchQuery !== "") {
        nearbyProducts = nearbyProducts.filter(p => 
            p.name.toLowerCase().includes(searchQuery) || 
            p.shop.toLowerCase().includes(searchQuery)
        );
    }

    if(nearbyProducts.length === 0) {
        gridContainer.innerHTML = '<p style="font-size: 0.8rem; color: #777; text-align: center; grid-column: 1 / -1;">Aapke search ya daayre se milta-julta koi item nahi mila.</p>';
        return;
    }

    nearbyProducts.forEach(prod => {
        let qty = cart[prod.id] ? cart[prod.id].quantity : (cart[String(prod.id)] ? cart[String(prod.id)].quantity : 0);
        let card = document.createElement('div');
        card.className = 'customer-product-card';
        card.innerHTML = `
            <img src="${prod.image}" class="customer-prod-img" alt="Product">
            <div class="customer-prod-info">
                <h4>${prod.name}</h4>
                <p style="color: #b45309; font-weight: bold;">₹${prod.price}</p>
                <p style="font-size: 0.75rem;">🏪 ${prod.shop} • 📍 ${prod.distanceText}</p>
            </div>
            <div class="qty-controls">
                ${qty > 0 ? `<button class="qty-btn minus" onclick="updateCartQty('${prod.id}', -1)">-</button><span style="font-size: 0.9rem; font-weight: bold; min-width: 16px; text-align: center;">${qty}</span>` : ''}
                <button class="qty-btn" onclick="updateCartQty('${prod.id}', 1)">+</button>
            </div>
        `;
        gridContainer.appendChild(card);
    });
}

function updateCartQty(productId, change) {
    let liveProducts = JSON.parse(localStorage.getItem('sm_liveProducts')) || [];
    let prod = liveProducts.find(p => String(p.id) === String(productId));
    if(!prod) return;

    if(!cart[productId]) {
        if(change > 0) {
            cart[productId] = { ...prod, quantity: 1 };
        }
    } else {
        cart[productId].quantity += change;
        if(cart[productId].quantity <= 0) {
            delete cart[productId];
        }
    }
    updateCartSummary();
    loadCustomerProducts();
}

function updateCartSummary() {
    let itemsArr = Object.values(cart);
    let totalCount = itemsArr.reduce((sum, item) => sum + item.quantity, 0);
    let totalAmount = itemsArr.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    let countEl = document.getElementById('cart-count');
    let totalEl = document.getElementById('cart-total');
    if(countEl) countEl.innerText = totalCount;
    if(totalEl) totalEl.innerText = totalAmount;
}

function placeOrder() {
    let itemsArr = Object.values(cart);
    if(itemsArr.length === 0) {
        alert("Aapka cart khali hai!");
        return;
    }

    let custName = document.getElementById('order-customer-name').value.trim();
    let custPhone = document.getElementById('order-customer-phone').value.trim();
    let custAddress = document.getElementById('order-customer-address').value.trim();

    if(!custName || !custPhone || custPhone.length < 10 || !custAddress) {
        alert("⚠️ Kripya apna poora naam, sahi 10-digit mobile number aur local address bharna anivarya hai!");
        return;
    }

    let deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
    let totalAmt = itemsArr.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    let newOrder = {
        id: 'ORD' + Math.floor(1000 + Math.random() * 9000),
        customerName: custName,
        customerPhone: custPhone,
        customerAddress: custAddress,
        items: itemsArr,
        totalAmount: totalAmt,
        status: "Pending (Pack ho raha hai)",
        isDelivered: false,
        deliveryOtp: deliveryOtp,
        shopName: itemsArr[0].shop
    };

    let allOrders = JSON.parse(localStorage.getItem('sm_allOrders')) || [];
    allOrders.push(newOrder);
    localStorage.setItem('sm_allOrders', JSON.stringify(allOrders));
    alert("🛒 Order successfully place ho gaya!");

    cart = {};
    updateCartSummary();
    document.getElementById('order-customer-address').value = '';

    startShopkeeperAlarm();
    updateShopReceivedOrdersUI();
    loadCustomerProducts();
}

function startShopkeeperAlarm() {
    if(alertInterval) return;
    playSingleBeep();
    alertInterval = setInterval(() => {
        playSingleBeep();
    }, 2500);
}

function playSingleBeep() {
    try {
        let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        let oscillator = audioCtx.createOscillator();
        let gainNode = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(950, audioCtx.currentTime);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
    } catch(e) {}
}

function stopAlertBeep() {
    if(alertInterval) {
        clearInterval(alertInterval);
        alertInterval = null;
        alert("🔇 Dukandaar alarm band kar diya gaya hai.");
    }
}

function openShopLiveCamera() {
    let box = document.getElementById('shop-camera-box');
    box.style.display = 'block';
    let video = document.getElementById('shop-webcam-video');

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        .then(stream => {
            shopCameraStream = stream;
            video.srcObject = stream;
        })
        .catch(err => {
            alert("Camera access nahi mil paaya: " + err);
        });
}

function captureShopWebcamPhoto() {
    let video = document.getElementById('shop-webcam-video');
    let canvas = document.getElementById('shop-webcam-canvas');
    canvas.width = video.videoWidth || 300;
    canvas.height = video.videoHeight || 200;
    let ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    capturedWebcamDataUrl = canvas.toDataURL('image/png');
    document.getElementById('shop-captured-preview').innerHTML = `<img src="${capturedWebcamDataUrl}" style="width: 70px; height: 70px; border-radius: 6px; object-fit: cover; border: 1px solid #cbd5e1;"> <span style="font-size:0.75rem; color:var(--success); font-weight:bold;">Live Photo Captured ✅</span>`;

    if(shopCameraStream) {
        shopCameraStream.getTracks().forEach(track => track.stop());
    }
    document.getElementById('shop-camera-box').style.display = 'none';
}

function switchShopTab(tabName) {
    document.getElementById('shop-sub-stock').classList.remove('active-sub');
    document.getElementById('shop-sub-order').classList.remove('active-sub');
    document.getElementById('shop-sub-sell').classList.remove('active-sub');

    if(tabName === 'stock') {
        document.getElementById('shop-sub-stock').classList.add('active-sub');
        updateShopLiveItemsUI();
    } else if(tabName === 'order') {
        document.getElementById('shop-sub-order').classList.add('active-sub');
        stopAlertBeep();
        updateShopReceivedOrdersUI();
    } else if(tabName === 'sell') {
        document.getElementById('shop-sub-sell').classList.add('active-sub');
        updateShopSoldItemsUI();
    }
}

function updateShopLiveItemsUI() {
    let box = document.getElementById('shop-live-items-list-box');
    if(!box) return;
    box.innerHTML = '';

    let liveProducts = JSON.parse(localStorage.getItem('sm_liveProducts')) || [];
    let myLiveProducts = liveProducts.filter(p => p.shop === postalName);
    
    if(myLiveProducts.length === 0) {
        box.innerHTML = '<p style="font-size: 0.78rem; color: #777; text-align: center;">Abhi aapka koi item live nahi hai.</p>';
        return;
    }

    myLiveProducts.forEach(prod => {
        let div = document.createElement('div');
        div.className = 'live-stock-item-card';
        div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <img src="${prod.image}" style="width: 40px; height: 40px; border-radius: 4px; object-fit: cover;">
                <div>
                    <h4 style="font-size: 0.9rem; color: #1e293b;">${prod.name}</h4>
                    <p style="font-size: 0.8rem; color: #b45309; font-weight: bold;">₹${prod.price}</p>
                </div>
            </div>
            <span style="font-size: 0.75rem; background: #dcfce7; color: #166534; padding: 3px 6px; border-radius: 4px; font-weight: bold;">Live ✅</span>
        `;
        box.appendChild(div);
    });
}

function updateShopReceivedOrdersUI() {
    let box = document.getElementById('shop-received-orders-box');
    if(!box) return;
    box.innerHTML = '';

    let allOrders = JSON.parse(localStorage.getItem('sm_allOrders')) || [];
    let myShopOrders = allOrders.filter(o => o.shopName === postalName);

    if(myShopOrders.length === 0) {
        box.innerHTML = '<p style="font-size: 0.78rem; color: #777; text-align: center;">Abhi koi naya order nahi aaya hai.</p>';
        return;
    }

    myShopOrders.forEach(ord => {
        let div = document.createElement('div');
        div.className = 'order-card-item';
        
        let actionContent = '';
        if(ord.isDelivered) {
            actionContent = `<p style="margin-top: 6px; color: var(--success); font-weight: bold;">Status: Successfully Delivered ✅</p>`;
        } else {
            actionContent = `
                <p style="margin-top: 4px;"><strong>Status:</strong> <span style="color:var(--error);">${ord.status}</span></p>
                <div style="margin-top: 8px; background: #f1f5f9; padding: 8px; border-radius: 6px;">
                    <label style="font-size: 0.78rem; font-weight: bold; color: #0b3c65;">Customer se Delivery OTP lein:</label>
                    <div style="display: flex; gap: 6px; margin-top: 4px;">
                        <input type="text" id="shop-otp-input-${ord.id}" maxlength="4" placeholder="4-digit OTP" style="padding: 6px; font-size: 0.85rem;">
                        <button onclick="verifyDeliveryOtp('${ord.id}')" style="padding: 6px 10px; margin-top:0; font-size: 0.8rem; background: var(--success); width: auto;">Confirm Delivered</button>
                    </div>
                </div>
            `;
        }

        div.innerHTML = `
            <p><strong>🆔 Order ID:</strong> ${ord.id}</p>
            <p><strong>👤 Name:</strong> ${ord.customerName} | <strong>📱 Mobile:</strong> ${ord.customerPhone}</p>
            <p><strong>📍 Address:</strong> ${ord.customerAddress}</p>
            <p><strong>📦 Items:</strong> ${ord.items.map(i => `${i.name} (x${i.quantity})`).join(', ')} (₹${ord.totalAmount})</p>
            ${actionContent}
        `;
        box.appendChild(div);
    });
}

function verifyDeliveryOtp(orderId) {
    let inputField = document.getElementById(`shop-otp-input-${orderId}`);
    let enteredOtp = inputField ? inputField.value.trim() : '';

    let allOrders = JSON.parse(localStorage.getItem('sm_allOrders')) || [];
    let soldItemsHistory = JSON.parse(localStorage.getItem('sm_soldHistory')) || [];

    let ord = allOrders.find(o => o.id === orderId);
    if(ord) {
        if(enteredOtp === ord.deliveryOtp) {
            ord.isDelivered = true;
            ord.status = "Successfully Delivered ✅";

            let now = new Date();
            let dateStr = now.toLocaleDateString('hi-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            let timeStr = now.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' });

            ord.items.forEach(soldObj => {
                soldItemsHistory.push({
                    shopName: postalName,
                    itemName: soldObj.name,
                    itemPrice: soldObj.price,
                    quantity: soldObj.quantity,
                    totalPrice: soldObj.price * soldObj.quantity,
                    date: dateStr,
                    time: timeStr,
                    customerName: ord.customerName,
                    customerAddress: ord.customerAddress
                });
            });

            localStorage.setItem('sm_allOrders', JSON.stringify(allOrders));
            localStorage.setItem('sm_soldHistory', JSON.stringify(soldItemsHistory));

            alert("🎉 Sahi OTP! Order delivered ho gaya.");
            updateShopReceivedOrdersUI();
            updateShopSoldItemsUI();
        } else {
            alert("❌ Galat OTP!");
        }
    }
}

function updateShopSoldItemsUI() {
    let box = document.getElementById('shop-sold-items-box');
    if(!box) return;
    box.innerHTML = '';

    let soldItemsHistory = JSON.parse(localStorage.getItem('sm_soldHistory')) || [];
    let mySoldItems = soldItemsHistory.filter(s => s.shopName === postalName);

    if(mySoldItems.length === 0) {
        box.innerHTML = '<p style="font-size: 0.78rem; color: #777; text-align: center;">Abhi tak koi item nahi becha gaya hai.</p>';
        return;
    }

    mySoldItems.forEach((sold, index) => {
        let card = document.createElement('div');
        card.className = 'sold-item-card';
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                <strong style="font-size: 0.9rem; color: #0b3c65;">#${index + 1} - ${sold.itemName}</strong>
                <span style="font-size: 0.85rem; font-weight: bold; color: var(--success);">₹${sold.totalPrice}</span>
            </div>
            <div style="font-size: 0.78rem; color: #555; display: flex; flex-direction: column; gap: 2px;">
                <p><strong>Quantity:</strong> ${sold.quantity} Unit</p>
                <p><strong>Per Unit MRP:</strong> ₹${sold.itemPrice}</p>
                <p><strong>Customer:</strong> ${sold.customerName} (${sold.customerAddress})</p>
                <p style="color: #64748b; margin-top: 2px;">📅 <strong>Date:</strong> ${sold.date} | ⏰ <strong>Time:</strong> ${sold.time}</p>
            </div>
        `;
        box.appendChild(card);
    });
}

function openTrackOrderModal() {
    document.getElementById('screen-customer-home').classList.remove('active');
    document.getElementById('screen-track-order').classList.add('active');

    let listContainer = document.getElementById('track-order-list');
    listContainer.innerHTML = '';

    let allOrders = JSON.parse(localStorage.getItem('sm_allOrders')) || [];
    if(allOrders.length === 0) {
        listContainer.innerHTML = '<p style="font-size: 0.8rem; color: #777; text-align: center;">Aapne abhi tak koi order nahi diya hai.</p>';
        return;
    }

    allOrders.forEach(ord => {
        let statusColor = ord.isDelivered ? 'var(--success)' : 'var(--error)';
        let itemDiv = document.createElement('div');
        itemDiv.style.background = '#fff';
        itemDiv.style.padding = '10px';
        itemDiv.style.borderRadius = '6px';
        itemDiv.style.border = '1px solid #cbd5e1';
        itemDiv.innerHTML = `
            <p style="font-size: 0.85rem; font-weight: bold;">Order ID: ${ord.id}</p>
            <p style="font-size: 0.8rem; color: #555;">Dukan: ${ord.shopName}</p>
            <p style="font-size: 0.8rem; color: #555;">Items: ${ord.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}</p>
            <div style="background: #fffbeb; border: 1px dashed var(--accent); padding: 6px; border-radius: 4px; margin-top: 6px; text-align: center;">
                <span style="font-size: 0.75rem; color: #b45309; font-weight: bold;">🔑 Secret Delivery OTP:</span><br>
                <span style="font-size: 1.2rem; font-weight: bold; color: #b45309; letter-spacing: 2px;">${ord.deliveryOtp}</span>
            </div>
            <p style="font-size: 0.8rem; color: ${statusColor}; font-weight: bold; margin-top: 6px;">Status: ${ord.status}</p>
        `;
        listContainer.appendChild(itemDiv);
    });
}

function backToCustomerHome() {
    document.getElementById('screen-track-order').classList.remove('active');
    document.getElementById('screen-customer-home').classList.add('active');
    loadStoreFilterBar();
    loadCustomerProducts();
}

function postProduct() {
    let name = document.getElementById('product-name').value.trim();
    let price = document.getElementById('product-price').value.trim();
    let imageInput = document.getElementById('product-image-input');

    if(!name || !price) {
        alert("Kripya product ka naam aur price daalein!");
        return;
    }

    let defaultImg = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80";

    if(capturedWebcamDataUrl) {
        saveNewProduct(name, price, capturedWebcamDataUrl);
        capturedWebcamDataUrl = "";
        document.getElementById('shop-captured-preview').innerHTML = '';
    } else if(imageInput.files && imageInput.files[0]) {
        let reader = new FileReader();
        reader.onload = function(e) {
            saveNewProduct(name, price, e.target.result);
        }
        reader.readAsDataURL(imageInput.files[0]);
    } else {
        saveNewProduct(name, price, defaultImg);
    }
}

function saveNewProduct(name, price, imageUrl) {
    let newProd = {
        id: Date.now(),
        name: name,
        price: parseInt(price),
        shop: postalName,
        shopLat: currentLat,
        shopLng: currentLng,
        image: imageUrl
    };

    let liveProducts = JSON.parse(localStorage.getItem('sm_liveProducts')) || [];
    liveProducts.push(newProd);
    localStorage.setItem('sm_liveProducts', JSON.stringify(liveProducts));

    // ⚡ Real-time trigger for instant customer UI refresh
    window.dispatchEvent(new Event('sm_productUpdated'));
    if(typeof loadCustomerProducts === 'function') {
        loadCustomerProducts();
        loadStoreFilterBar();
    }

    alert("✨ Product turant live stock mein jud gaya hai!");

    document.getElementById('product-name').value = '';
    document.getElementById('product-price').value = '';
    document.getElementById('product-image-input').value = '';

    updateShopLiveItemsUI();
}

function logout() {
    stopAlertBeep();
    toggleProfileDrawer(false);
    localStorage.removeItem('sm_isLoggedIn');
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-welcome').classList.add('active');
    cart = {};
    updateCartSummary();
}
