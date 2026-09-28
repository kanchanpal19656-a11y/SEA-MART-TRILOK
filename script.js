let currentRole = localStorage.getItem('sm_currentRole') || 'customer';
let postalName = localStorage.getItem('sm_postalName') || "";
let loggedInUserName = localStorage.getItem('sm_userName') || "";
let loggedInUserPhone = localStorage.getItem('sm_userPhone') || "";
let loggedInUserEmail = localStorage.getItem('sm_userEmail') || "";
let selectedStoreFilter = "All";

let currentLat = 28.4744;
let currentLng = 77.5040;

let defaultUsers = [];
let registeredUsers = JSON.parse(localStorage.getItem('sm_registeredUsers')) || defaultUsers;

if(!localStorage.getItem('sm_liveProducts')) {
    let initialProducts = [];
    localStorage.setItem('sm_liveProducts', JSON.stringify(initialProducts));
}

let cart = JSON.parse(localStorage.getItem('sea_mart_cart')) || {};

function saveCartToLocalStorage() {
    localStorage.setItem('sea_mart_cart', JSON.stringify(cart));
}

let alertInterval = null;
let shopCameraStream = null;
let capturedWebcamDataUrl = "";
let selectedPaymentMethod = "cod";

window.addEventListener('DOMContentLoaded', () => {
    updateCartSummary();

    let isLoggedIn = localStorage.getItem('sm_isLoggedIn');
    
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    if(isLoggedIn === 'true') {
        if(currentRole === 'customer') {
            let custHomeScreen = document.getElementById('screen-customer-home');
            if(custHomeScreen) {
                custHomeScreen.classList.add('active');
                loadStoreFilterBar();
                loadCustomerProducts();
            }
        } else {
            let shopDashboard = document.getElementById('screen-shop-dashboard');
            if(shopDashboard) {
                shopDashboard.classList.add('active');
                let shopNameDisplay = document.getElementById('shop-name-display');
                if(shopNameDisplay) shopNameDisplay.innerText = postalName;
                updateShopLiveItemsUI();
                updateShopReceivedOrdersUI();
                updateShopSoldItemsUI();
                injectGalleryButtonIntoShopUI();
                injectUpiSettingsIntoProfileDrawer();
            }
        }
    } else {
        let welcomeScreen = document.getElementById('screen-welcome');
        if(welcomeScreen) welcomeScreen.classList.add('active');
    }
});

window.addEventListener('storage', (e) => {
    if(e.key === 'sm_liveProducts' || e.key === 'sm_registeredUsers') {
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
        document.getElementById('drawer-user-role').innerText = (currentRole === 'shopkeeper' ? 'Dukandaar (Seller)' : 'Customer');
        drawer.classList.add('open');
        
        let upiBox = document.getElementById('profile-drawer-upi-box');
        if(upiBox) {
            upiBox.style.display = (currentRole === 'shopkeeper') ? 'block' : 'none';
        }
        if(currentRole === 'shopkeeper') {
            injectUpiSettingsIntoProfileDrawer();
        }
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

function sendRegistrationAlertToAdmin(userData) {
    let formspreeUrl = "https://formspree.io/f/xzezklea";
    let emailData = {
        email: "kanchanpal19656@gmail.com",
        subject: "🚨 Naya User Registration Hua Hai - Sea Mart",
        message: `Naye user ki details niche di gayi hain:\n\n` +
                 `Naam: ${userData.name}\n` +
                 `Phone: ${userData.phone}\n` +
                 `Email: ${userData.email}\n` +
                 `Password: ${userData.password}\n` +
                 `Role: ${userData.role}\n` +
                 `Dukan Naam: ${userData.shopName || 'N/A'}\n` +
                 `Registration Date: ${new Date().toLocaleString()}`
    };

    fetch(formspreeUrl, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
    })
    .then(response => {})
    .catch(error => {});
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
            lng: currentLng,
            upiId: ""
        };

        registeredUsers.push(newUser);
        localStorage.setItem('sm_registeredUsers', JSON.stringify(registeredUsers));
        
        sendRegistrationAlertToAdmin(newUser);

        localStorage.setItem('sm_isLoggedIn', 'true');
        localStorage.setItem('sm_currentRole', currentRole);
        localStorage.setItem('sm_postalName', postalName);
        localStorage.setItem('sm_userName', loggedInUserName);

        alert("🎉 Registration Safal Raha!");
        document.getElementById('screen-registration').classList.remove('active');

        if(currentRole === 'customer') {
            document.getElementById('screen-customer-home').classList.add('active');
            loadStoreFilterBar();
            loadCustomerProducts();
        } else {
            document.getElementById('shop-name-display').innerText = postalName;
            document.getElementById('screen-shop-dashboard').classList.add('active');
            updateShopLiveItemsUI();
            updateShopReceivedOrdersUI();
            updateShopSoldItemsUI();
            injectGalleryButtonIntoShopUI();
            injectUpiSettingsIntoProfileDrawer();
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
        } else {
            document.getElementById('shop-name-display').innerText = postalName;
            document.getElementById('screen-shop-dashboard').classList.add('active');
            updateShopLiveItemsUI();
            updateShopReceivedOrdersUI();
            updateShopSoldItemsUI();
            injectGalleryButtonIntoShopUI();
            injectUpiSettingsIntoProfileDrawer();
        }
    });
}

function loadStoreFilterBar() {
    let bar = document.getElementById('store-filter-bar');
    if(!bar) return;
    bar.innerHTML = '';

    let allChip = document.createElement('div');
    allChip.className = `store-chip ${selectedStoreFilter === 'All' ? 'active-chip' : ''}`;
    allChip.innerText = '🌟 Sabhi Dukanen (All)';
    allChip.onclick = () => {
        selectedStoreFilter = 'All';
        loadStoreFilterBar();
        loadCustomerProducts();
    };
    bar.appendChild(allChip);

    let shopkeepers = registeredUsers.filter(u => u.role === 'shopkeeper' && u.shopName);
    
    shopkeepers.forEach(shop => {
        let chip = document.createElement('div');
        chip.className = `store-chip ${selectedStoreFilter === shop.shopName ? 'active-chip' : ''}`;
        chip.innerText = `🏪 ${shop.shopName}`;
        chip.onclick = () => {
            selectedStoreFilter = shop.shopName;
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

    let liveProducts = JSON.parse(localStorage.getItem('sm_liveProducts')) || [];

    let filteredProducts = liveProducts.filter(p => {
        let dist = calculateDistance(currentLat, currentLng, p.shopLat, p.shopLng);
        p.distanceText = dist.toFixed(1) + " km";
        return dist <= 2.0;
    });

    if(selectedStoreFilter !== 'All') {
        filteredProducts = filteredProducts.filter(p => p.shop === selectedStoreFilter);
    }

    if(filteredProducts.length === 0) {
        gridContainer.innerHTML = '<p style="font-size: 0.8rem; color: #777; text-align: center; grid-column: 1 / -1;">2 km ke daayre mein is dukan par abhi koi live item uplabdh nahi hai.</p>';
        return;
    }

    filteredProducts.forEach(prod => {
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
    
    saveCartToLocalStorage();
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

function openCheckoutScreen() {
    let itemsArr = Object.values(cart);
    if(itemsArr.length === 0) {
        alert("Aapka cart khali hai! Kripya pehle items select karein.");
        return;
    }

    let screenCustomerHome = document.getElementById('screen-customer-home');
    if(screenCustomerHome) screenCustomerHome.classList.remove('active');
    
    let checkoutScreen = document.getElementById('screen-checkout');
    if(!checkoutScreen) {
        checkoutScreen = document.createElement('div');
        checkoutScreen.id = 'screen-checkout';
        checkoutScreen.className = 'screen';
        document.body.appendChild(checkoutScreen);
    }
    checkoutScreen.classList.add('active');

    renderCheckoutContent();
}

function renderCheckoutContent() {
    let checkoutScreen = document.getElementById('screen-checkout');
    let itemsArr = Object.values(cart);
    let totalAmount = itemsArr.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let shopName = itemsArr.length > 0 ? itemsArr[0].shop : "";

    let shopOwner = registeredUsers.find(u => u.shopName === shopName && u.role === 'shopkeeper');
    let upiId = shopOwner && shopOwner.upiId ? shopOwner.upiId : "merchant@upi";

    checkoutScreen.innerHTML = `
        <div style="padding: 16px; max-width: 500px; margin: auto; font-family: sans-serif; background: #fff; min-height: 100vh;">
            <button onclick="backToCustomerHomeFromCheckout()" style="background: #64748b; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-bottom: 12px;">← Back to Home</button>
            <h2 style="color: #0b3c65; margin-bottom: 10px;">🛒 Order Details & Payment</h2>
            
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                <p style="font-weight: bold; margin-bottom: 6px; color: #1e293b;">Store: ${shopName || 'Local Store'}</p>
                <div style="max-height: 150px; overflow-y: auto; margin-bottom: 8px;">
                    ${itemsArr.map(i => `<div style="display: flex; justify-content: space-between; font-size: 0.85rem; padding: 4px 0; border-bottom: 1px dashed #e2e8f0;"><span>${i.name} (x${i.quantity})</span><strong>₹${i.price * i.quantity}</strong></div>`).join('')}
                </div>
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1rem; color: #166534; border-top: 1px solid #cbd5e1; padding-top: 6px;">
                    <span>Grand Total:</span>
                    <span>₹${totalAmount}</span>
                </div>
            </div>

            <div style="margin-bottom: 15px;">
                <label style="font-size: 0.85rem; font-weight: bold; display: block; margin-bottom: 4px;">Poora Naam:</label>
                <input type="text" id="checkout-cust-name" value="${loggedInUserName}" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box;">
            </div>

            <div style="margin-bottom: 15px;">
                <label style="font-size: 0.85rem; font-weight: bold; display: block; margin-bottom: 4px;">Mobile Number (Anivarya - 10 Digit):</label>
                <input type="text" id="checkout-cust-phone" value="${loggedInUserPhone}" maxlength="10" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box;">
            </div>

            <div style="margin-bottom: 15px;">
                <label style="font-size: 0.85rem; font-weight: bold; display: block; margin-bottom: 4px;">Sahi Local Address (Anivarya):</label>
                <textarea id="checkout-cust-address" placeholder="Apna pura pata yahan likhein..." style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box; height: 60px;"></textarea>
            </div>

            <div style="margin-bottom: 15px;">
                <label style="font-size: 0.85rem; font-weight: bold; display: block; margin-bottom: 6px;">Payment Method Select Karein:</label>
                <div style="display: flex; gap: 10px;">
                    <label style="flex: 1; padding: 10px; border: 2px solid ${selectedPaymentMethod === 'cod' ? '#2563eb' : '#cbd5e1'}; border-radius: 6px; text-align: center; cursor: pointer; background: ${selectedPaymentMethod === 'cod' ? '#eff6ff' : '#fff'}; font-size: 0.85rem; font-weight: bold;">
                        <input type="radio" name="payMethod" value="cod" ${selectedPaymentMethod === 'cod' ? 'checked' : ''} onchange="setPaymentMethod('cod', ${totalAmount}, '${upiId}')" style="display:none;">
                        💵 Cash on Delivery
                    </label>
                    <label style="flex: 1; padding: 10px; border: 2px solid ${selectedPaymentMethod === 'online' ? '#2563eb' : '#cbd5e1'}; border-radius: 6px; text-align: center; cursor: pointer; background: ${selectedPaymentMethod === 'online' ? '#eff6ff' : '#fff'}; font-size: 0.85rem; font-weight: bold;">
                        <input type="radio" name="payMethod" value="online" ${selectedPaymentMethod === 'online' ? 'checked' : ''} onchange="setPaymentMethod('online', ${totalAmount}, '${upiId}')" style="display:none;">
                        📱 Online Payment (QR)
                    </label>
                </div>
            </div>

            <div id="qr-display-container" style="display: ${selectedPaymentMethod === 'online' ? 'block' : 'none'}; text-align: center; background: #fff; padding: 15px; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 15px;">
                <p style="font-size: 0.85rem; color: #1e293b; font-weight: bold; margin-bottom: 8px;">Scan QR to Pay ₹${totalAmount}</p>
                <div id="dynamic-qr-code-box">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=${upiId}&am=${totalAmount}&cu=INR" alt="UPI QR Code" style="width: 140px; height: 140px; border: 4px solid #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                </div>
                <p style="font-size: 0.75rem; color: #64748b; margin-top: 6px;">UPI ID: ${upiId}</p>
            </div>

            <button onclick="placeOrderFromCheckout()" style="width: 100%; background: #0b3c65; color: white; border: none; padding: 12px; border-radius: 6px; font-size: 1rem; font-weight: bold; cursor: pointer;">🛍️ Confirm & Place Order</button>
        </div>
    `;
}

function setPaymentMethod(method, amount, upiId) {
    selectedPaymentMethod = method;
    let qrBox = document.getElementById('qr-display-container');
    if(qrBox) {
        qrBox.style.display = (method === 'online') ? 'block' : 'none';
    }
    renderCheckoutContent();
}

function backToCustomerHomeFromCheckout() {
    let checkoutScr = document.getElementById('screen-checkout');
    if(checkoutScr) checkoutScr.classList.remove('active');
    let custHome = document.getElementById('screen-customer-home');
    if(custHome) custHome.classList.add('active');
    loadStoreFilterBar();
    loadCustomerProducts();
}

function placeOrderFromCheckout() {
    let itemsArr = Object.values(cart);
    if(itemsArr.length === 0) {
        alert("Aapka cart khali hai!");
        return;
    }

    let custName = document.getElementById('checkout-cust-name').value.trim();
    let custPhone = document.getElementById('checkout-cust-phone').value.trim();
    let custAddress = document.getElementById('checkout-cust-address').value.trim();

    if(!custName || !custPhone || custPhone.length < 10 || !custAddress) {
        alert("⚠️ Kripya poora naam, 10-digit mobile number aur address bharein!");
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
        isCancelled: false,
        deliveryOtp: deliveryOtp,
        cancelOtp: "",
        shopName: itemsArr[0].shop,
        paymentMethod: selectedPaymentMethod
    };

    let allOrders = JSON.parse(localStorage.getItem('sm_allOrders')) || [];
    allOrders.push(newOrder);
    localStorage.setItem('sm_allOrders', JSON.stringify(allOrders));
    
    alert("🛒 Order successfully place ho gaya!");

    cart = {};
    saveCartToLocalStorage();
    updateCartSummary();

    startShopkeeperAlarm();
    let checkoutScr = document.getElementById('screen-checkout');
    if(checkoutScr) checkoutScr.classList.remove('active');
    let custHome = document.getElementById('screen-customer-home');
    if(custHome) custHome.classList.add('active');
    loadStoreFilterBar();
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
    document.getElementById('shop-captured-preview').innerHTML = `<img src="${capturedWebcamDataUrl}" style="width: 70px; height: 70px; border-radius: 6px; object-fit: cover; border: 1px solid #cbd5e1;"> <span style="font-size:0.75rem; color:#166534; font-weight:bold;">Live Photo Captured ✅</span>`;

    if(shopCameraStream) {
        shopCameraStream.getTracks().forEach(track => track.stop());
    }
    document.getElementById('shop-camera-box').style.display = 'none';
}

function injectGalleryButtonIntoShopUI() {
    let previewBox = document.getElementById('shop-captured-preview');
    if(!previewBox) return;

    if(document.getElementById('custom-blue-gallery-btn')) return;

    let containerDiv = document.createElement('div');
    containerDiv.style.margin = '8px 0';
    containerDiv.innerHTML = `
        <input type="file" id="shop-custom-gallery-input" accept="image/*" style="display: none;" onchange="handleShopUploadedImage(event)">
        <button id="custom-blue-gallery-btn" type="button" onclick="document.getElementById('shop-custom-gallery-input').click()" style="background-color: #2563eb; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 6px; width: 100%; justify-content: center;">
            📁 Select Pic from Gallery
        </button>
    `;
    previewBox.parentNode.insertBefore(containerDiv, previewBox);
}

function injectUpiSettingsIntoProfileDrawer() {
    let drawer = document.getElementById('profile-drawer');
    if(!drawer) return;

    if(document.getElementById('profile-drawer-upi-box')) {
        let upiBox = document.getElementById('profile-drawer-upi-box');
        upiBox.style.display = (currentRole === 'shopkeeper') ? 'block' : 'none';
        loadShopUpiSettings();
        return;
    }

    let upiBox = document.createElement('div');
    upiBox.id = 'profile-drawer-upi-box';
    upiBox.style.cssText = `margin-top: 20px; padding: 14px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; box-sizing: border-box; display: ${currentRole === 'shopkeeper' ? 'block' : 'none'};`;
    
    upiBox.innerHTML = `
        <h4 style="font-size: 0.9rem; color: #0b3c65; margin-bottom: 6px;">💳 Dukandaar UPI Settings</h4>
        <p style="font-size: 0.75rem; color: #64748b; margin-bottom: 8px;">Yahan apni current UPI ID dekhein aur update karein:</p>
        <div style="display: flex; flex-direction: column; gap: 8px;">
            <input type="text" id="drawer-shop-upi-input" placeholder="e.g. merchant@paytm" style="width: 100%; padding: 8px; font-size: 0.85rem; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box;">
            <button onclick="saveShopUpiIdFromDrawer()" style="width: 100%; background: #166534; color: white; border: none; padding: 8px; border-radius: 4px; font-size: 0.85rem; font-weight: bold; cursor: pointer; text-align: center;">💾 Save UPI ID</button>
        </div>
    `;

    drawer.appendChild(upiBox);
    loadShopUpiSettings();
}

function loadShopUpiSettings() {
    let input = document.getElementById('drawer-shop-upi-input');
    if(!input) return;
    let shopOwner = registeredUsers.find(u => u.shopName === postalName && u.role === 'shopkeeper');
    if(shopOwner && shopOwner.upiId) {
        input.value = shopOwner.upiId;
    } else {
        input.value = "";
    }
}

function saveShopUpiIdFromDrawer() {
    let input = document.getElementById('drawer-shop-upi-input');
    if(!input) return;
    let upiVal = input.value.trim();
    if(!upiVal) {
        alert("Kripya valid UPI ID daalein!");
        return;
    }

    let shopOwner = registeredUsers.find(u => u.shopName === postalName && u.role === 'shopkeeper');
    if(shopOwner) {
        shopOwner.upiId = upiVal;
        localStorage.setItem('sm_registeredUsers', JSON.stringify(registeredUsers));
        alert("✅ UPI ID profile ke andar successfully save ho gayi hai!");
    } else {
        alert("⚠️ Shop owner data nahi mila!");
    }
}

function handleShopUploadedImage(event) {
    let file = event.target.files[0];
    if(file) {
        let reader = new FileReader();
        reader.onload = function(e) {
            capturedWebcamDataUrl = e.target.result;
            document.getElementById('shop-captured-preview').innerHTML = `
                <img src="${capturedWebcamDataUrl}" style="width: 70px; height: 70px; border-radius: 6px; object-fit: cover; border: 1px solid #cbd5e1;"> 
                <span style="font-size:0.75rem; color:#166534; font-weight:bold;">Gallery Pic Attached ✅</span>
            `;
        };
        reader.readAsDataURL(file);
    }
}

function switchShopTab(tabName) {
    document.getElementById('shop-sub-stock').classList.remove('active-sub');
    document.getElementById('shop-sub-order').classList.remove('active-sub');
    document.getElementById('shop-sub-sell').classList.remove('active-sub');

    if(tabName === 'stock') {
        document.getElementById('shop-sub-stock').classList.add('active-sub');
        updateShopLiveItemsUI();
        setTimeout(injectGalleryButtonIntoShopUI, 100);
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
        div.style.display = 'flex';
        div.style.justify = 'space-between';
        div.style.alignItems = 'center';
        div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <img src="${prod.image}" style="width: 40px; height: 40px; border-radius: 4px; object-fit: cover;">
                <div>
                    <h4 style="font-size: 0.9rem; color: #1e293b;">${prod.name}</h4>
                    <p style="font-size: 0.8rem; color: #b45309; font-weight: bold;">₹${prod.price}</p>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 0.75rem; background: #dcfce7; color: #166534; padding: 3px 6px; border-radius: 4px; font-weight: bold;">Live ✅</span>
                <button onclick="deleteShopProduct('${prod.id}')" style="background-color: #ef4444; color: white; border: none; padding: 5px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; cursor: pointer;">🗑️ Delete</button>
            </div>
        `;
        box.appendChild(div);
    });
}

function deleteShopProduct(productId) {
    if(!confirm("Kya aap sach mein is live item ko delete karna chahte hain?")) {
        return;
    }

    let liveProducts = JSON.parse(localStorage.getItem('sm_liveProducts')) || [];
    let updatedProducts = liveProducts.filter(p => String(p.id) !== String(productId));

    localStorage.setItem('sm_liveProducts', JSON.stringify(updatedProducts));

    window.dispatchEvent(new Event('sm_productUpdated'));
    updateShopLiveItemsUI();
    if(typeof loadCustomerProducts === 'function') {
        loadCustomerProducts();
        loadStoreFilterBar();
    }

    alert("🗑️ Item successfully delete ho gaya hai!");
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
        if(ord.isCancelled) {
            actionContent = `<p style="margin-top: 6px; color: #ef4444; font-weight: bold;">Status: Order Cancelled ❌</p>`;
        } else if(ord.isDelivered) {
            actionContent = `<p style="margin-top: 6px; color: #166534; font-weight: bold;">Status: Successfully Delivered ✅</p>`;
        } else {
            actionContent = `
                <p style="margin-top: 4px;"><strong>Status:</strong> <span style="color:#ef4444;">${ord.status}</span></p>
                <div style="margin-top: 8px; background: #f1f5f9; padding: 8px; border-radius: 6px;">
                    <label style="font-size: 0.78rem; font-weight: bold; color: #0b3c65;">Customer se Delivery OTP lein:</label>
                    <div style="display: flex; gap: 6px; margin-top: 4px;">
                        <input type="text" id="shop-otp-input-${ord.id}" maxlength="4" placeholder="4-digit OTP" style="padding: 6px; font-size: 0.85rem;">
                        <button onclick="verifyDeliveryOtp('${ord.id}')" style="padding: 6px 10px; margin-top:0; font-size: 0.8rem; background: #166534; width: auto; color: white;">Confirm Delivered</button>
                    </div>
                </div>
                ${ord.cancelOtp ? `
                <div style="margin-top: 8px; background: #fef2f2; border: 1px dashed #ef4444; padding: 8px; border-radius: 6px;">
                    <label style="font-size: 0.78rem; font-weight: bold; color: #b91c1c;">Customer Cancellation OTP:</label>
                    <div style="display: flex; gap: 6px; margin-top: 4px;">
                        <input type="text" id="shop-cancel-otp-input-${ord.id}" maxlength="4" placeholder="Cancel OTP" style="padding: 6px; font-size: 0.85rem;">
                        <button onclick="verifyCancelOtp('${ord.id}')" style="padding: 6px 10px; margin-top:0; font-size: 0.8rem; background: #ef4444; width: auto; color: white;">Confirm Cancel</button>
                    </div>
                </div>
                ` : `<p style="margin-top: 6px; font-size: 0.75rem; color: #64748b;">Customer dwara cancel request kiye jaane par yahan Cancel OTP dikhega.</p>`}
            `;
        }

        div.innerHTML = `
            <p><strong>🆔 Order ID:</strong> ${ord.id} | <span style="color: #2563eb; font-weight:bold;">Pay: ${ord.paymentMethod === 'online' ? 'Online Paid 📱' : 'COD 💵'}</span></p>
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

function requestCustomerOrderCancellation(orderId) {
    let allOrders = JSON.parse(localStorage.getItem('sm_allOrders')) || [];
    let ord = allOrders.find(o => o.id === orderId);
    if(!ord) return;

    if(ord.isDelivered) {
        alert("⚠️ Jo order deliver ho chuka hai, use cancel nahi kiya ja sakta!");
        return;
    }

    if(!ord.cancelOtp) {
        ord.cancelOtp = Math.floor(1000 + Math.random() * 9000).toString();
        ord.status = "Cancel Requested (OTP Generate Ho Gaya)";
        localStorage.setItem('sm_allOrders', JSON.stringify(allOrders));
    }

    alert(`⚠️ Cancellation OTP generate ho gaya hai: ${ord.cancelOtp}\nKripya yeh OTP apne dukandaar ko bataiye taaki order cancel ho sake.`);
    openTrackOrderModal();
}

function verifyCancelOtp(orderId) {
    let inputField = document.getElementById(`shop-cancel-otp-input-${orderId}`);
    let enteredOtp = inputField ? inputField.value.trim() : '';

    let allOrders = JSON.parse(localStorage.getItem('sm_allOrders')) || [];
    let ord = allOrders.find(o => o.id === orderId);

    if(ord) {
        if(enteredOtp === ord.cancelOtp) {
            ord.isCancelled = true;
            ord.status = "Cancelled ❌";
            localStorage.setItem('sm_allOrders', JSON.stringify(allOrders));

            alert("✅ Sahi OTP! Order successfully cancel kar diya gaya hai.");
            updateShopReceivedOrdersUI();
        } else {
            alert("❌ Galat Cancel OTP!");
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
                <span style="font-size: 0.85rem; font-weight: bold; color: #166534;">₹${sold.totalPrice}</span>
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

function downloadSoldItemsPDF() {
    let soldItemsHistory = JSON.parse(localStorage.getItem('sm_soldHistory')) || [];
    let mySoldItems = soldItemsHistory.filter(s => s.shopName === postalName);

    if (mySoldItems.length === 0) {
        alert("⚠️ Download karne ke liye koi sold history data available nahi hai!");
        return;
    }

    let grandTotalAmount = mySoldItems.reduce((sum, item) => sum + item.totalPrice, 0);
    let grandTotalQty = mySoldItems.reduce((sum, item) => sum + item.quantity, 0);

    let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${postalName} - Sold Items Report</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; color: #222; background: #fff; }
                h2 { color: #0b3c65; text-align: center; border-bottom: 2px solid #0b3c65; padding-bottom: 8px; margin-bottom: 15px; }
                .meta { margin-bottom: 20px; font-size: 14px; color: #555; background: #f8fafc; padding: 10px; border-radius: 6px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 13px; }
                th { background-color: #f1f5f9; color: #0f172a; }
                .total-box { margin-top: 20px; padding: 15px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; text-align: right; }
                .total-box p { margin: 5px 0; font-size: 16px; font-weight: bold; color: #166534; }
                @media print {
                    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <h2>🏪 ${postalName} - Sales Report</h2>
            <div class="meta">
                <p><strong>Dukandaar:</strong> ${loggedInUserName}</p>
                <p><strong>Report Date:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Item Name</th>
                        <th>Price (₹)</th>
                        <th>Qty</th>
                        <th>Total (₹)</th>
                        <th>Customer Name</th>
                        <th>Date & Time</th>
                    </tr>
                </thead>
                <tbody>
                    ${mySoldItems.map((item, idx) => `
                        <tr>
                            <td>${idx + 1}</td>
                            <td>${item.itemName}</td>
                            <td>₹${item.itemPrice}</td>
                            <td>${item.quantity}</td>
                            <td>₹${item.totalPrice}</td>
                            <td>${item.customerName}</td>
                            <td>${item.date}${item.time}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="total-box">
                <p>Total Items Sold: ${grandTotalQty} Units</p>
                <p>Grand Total Revenue: ₹${grandTotalAmount}</p>
            </div>
        </body>
        </html>
    `;

    let blob = new Blob([htmlContent], { type: 'text/html' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = `${postalName}_Sales_Report.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert("📥 Sales Report HTML file successfully download ho gayi hai!");
}

function openTrackOrderModal() {
    let custHome = document.getElementById('screen-customer-home');
    if(custHome) custHome.classList.remove('active');
    
    let trackScr = document.getElementById('screen-track-order');
    if(trackScr) trackScr.classList.add('active');

    let listContainer = document.getElementById('track-order-list');
    if(!listContainer) return;
    listContainer.innerHTML = '';

    let allOrders = JSON.parse(localStorage.getItem('sm_allOrders')) || [];
    let myOrders = allOrders.filter(o => o.customerPhone === loggedInUserPhone);

    if(myOrders.length === 0) {
        listContainer.innerHTML = '<p style="font-size: 0.8rem; color: #777; text-align: center;">Aapka koi active order nahi hai.</p>';
        return;
    }

    myOrders.forEach(ord => {
        let div = document.createElement('div');
        div.style.cssText = "background: #fff; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; margin-bottom: 6px; font-size: 0.85rem;";
        
        let cancelSection = '';
        if(!ord.isDelivered && !ord.isCancelled) {
            cancelSection = `
                <div style="margin-top: 8px; border-top: 1px dashed #e2e8f0; padding-top: 6px;">
                    <button onclick="requestCustomerOrderCancellation('${ord.id}')" style="background: #ef4444; color: white; border: none; padding: 6px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; cursor: pointer; width: auto;">❌ Order Cancel Request Karein</button>
                </div>
            `;
        }

        div.innerHTML = `
            <p><strong>🆔 Order ID:</strong> ${ord.id} | <span style="color: #0b3c65; font-weight: bold;">${ord.shopName}</span></p>
            <p><strong>📦 Items:</strong> ${ord.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}</p>
            <p><strong>💰 Total:</strong> ₹${ord.totalAmount} (${ord.paymentMethod === 'online' ? 'Online Paid 📱' : 'COD 💵'})</p>
            <p style="margin-top: 4px;"><strong>Status:</strong> <span style="color: ${ord.isDelivered ? '#166534' : (ord.isCancelled ? '#ef4444' : '#b45309')}; font-weight: bold;">${ord.status}</span></p>
            ${!ord.isDelivered && !ord.isCancelled ? `<div style="margin-top: 6px; background: #fffbeb; padding: 6px; border-radius: 4px; border: 1px dashed #d4af37;"><p style="font-size: 0.8rem; font-weight: bold; color: #b45309;">🔑 Secret Delivery OTP: <span style="font-size: 1.1rem; letter-spacing: 2px;">${ord.deliveryOtp}</span></p><p style="font-size: 0.7rem; color: #64748b;">Yeh OTP saman milne par dukandaar ko dein.</p></div>` : ''}
            ${cancelSection}
        `;
        listContainer.appendChild(div);
    });
}

function backToCustomerHome() {
    let trackScr = document.getElementById('screen-track-order');
    if(trackScr) trackScr.classList.remove('active');
    let checkoutScr = document.getElementById('screen-checkout');
    if(checkoutScr) checkoutScr.classList.remove('active');
    
    let custHome = document.getElementById('screen-customer-home');
    if(custHome) custHome.classList.add('active');
    loadStoreFilterBar();
    loadCustomerProducts();
}

function postProduct() {
    let name = document.getElementById('product-name').value.trim();
    let priceVal = document.getElementById('product-price').value.trim();
    let galleryInput = document.getElementById('shop-custom-gallery-input');
    
    let uploadedImage = "";
    if(capturedWebcamDataUrl) {
        uploadedImage = capturedWebcamDataUrl;
    } else if(galleryInput && galleryInput.files && galleryInput.files[0]) {
        // Will handle via FileReader if needed, but we already have handleShopUploadedImage
    }

    let fileInput = document.getElementById('product-image-input');
    if(!name || !priceVal) {
        alert("Kripya product ka naam aur price daalein!");
        return;
    }

    let finalImg = capturedWebcamDataUrl || "https://via.placeholder.com/150";

    let liveProducts = JSON.parse(localStorage.getItem('sm_liveProducts')) || [];
    let newProd = {
        id: 'PROD' + Date.now(),
        name: name,
        price: parseFloat(priceVal),
        shop: postalName,
        shopLat: currentLat,
        shopLng: currentLng,
        image: finalImg
    };

    liveProducts.push(newProd);
    localStorage.setItem('sm_liveProducts', JSON.stringify(liveProducts));

    document.getElementById('product-name').value = '';
    document.getElementById('product-price').value = '';
    capturedWebcamDataUrl = "";
    document.getElementById('shop-captured-preview').innerHTML = '';

    window.dispatchEvent(new Event('sm_productUpdated'));
    updateShopLiveItemsUI();
    alert("🎉 Product successfully live kar diya gaya hai!");
}

function logout() {
    if(confirm("Kya aap sach mein logout karna chahte hain?")) {
        localStorage.removeItem('sm_isLoggedIn');
        localStorage.removeItem('sm_currentRole');
        location.reload();
    }
}
