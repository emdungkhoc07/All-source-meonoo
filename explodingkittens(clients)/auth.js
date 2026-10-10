import { app, auth, googleProvider, db } from './config/firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signInWithPopup,
    onAuthStateChanged,
    sendEmailVerification,
    signOut,
    deleteUser
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// DOM Elements - Modal Đăng Nhập
const loginIdentifier = document.getElementById('loginIdentifier');
const loginPassword = document.getElementById('loginPassword');
const btnSubmitLogin = document.getElementById('btnSubmitLogin');
const btnGoogleLogin = document.getElementById('btnGoogleLogin');

// DOM Elements - Modal Đăng Kí
const registerUsername = document.getElementById('registerUsername');
const registerIdentifier = document.getElementById('registerIdentifier');
const registerPassword = document.getElementById('registerPassword');
const registerConfirmPassword = document.getElementById('registerConfirmPassword');
const btnSubmitRegister = document.getElementById('btnSubmitRegister');
const btnGoogleRegister = document.getElementById('btnGoogleRegister');

// DOM Elements - Alert Modal
const alertModal = document.getElementById('alertModal');
const alertTitle = document.getElementById('alertTitle');
const alertMessage = document.getElementById('alertMessage');
const alertButtons = document.getElementById('alertButtons');

// Validation Regex
const usernameRegex = /^[a-zA-Z0-9A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỮỰỲỴÝỶỸửữựỳỵỷỹ\s]+$/;
const passwordRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{6,}$/;

// Helper: Hiển thị Pop-up Thông báo (Alert Modal)
function showAlert(title, message, buttons) {
    alertTitle.textContent = title;
    alertMessage.innerHTML = message;
    alertButtons.innerHTML = '';

    buttons.forEach(btnInfo => {
        const btn = document.createElement('button');
        btn.textContent = btnInfo.text;
        let typeClass = 'btn-alert-confirm';
        if (btnInfo.type === 'cancel') typeClass = 'btn-alert-cancel';
        if (btnInfo.type === 'neutral' || btnInfo.text === 'ĐÓNG') typeClass = 'btn-alert-neutral';
        btn.className = 'btn-alert ' + typeClass;
        
        btn.addEventListener('click', () => {
            alertModal.classList.add('hidden');
            if (btnInfo.onClick) btnInfo.onClick();
        });
        
        alertButtons.appendChild(btn);
    });

    alertModal.classList.remove('hidden');

    // Tự động focus vào nút chính (để hỗ trợ phím Enter)
    const primaryBtn = alertButtons.querySelector('.btn-alert-neutral') || alertButtons.querySelector('.btn-alert-confirm') || alertButtons.lastElementChild;
    if (primaryBtn) primaryBtn.focus();
}

// Hàm lưu/cập nhật thông tin và thời gian online của user trong Firestore
async function saveUserToDB(user, username, isGoogle = false) {
    try {
        const userRef = doc(db, 'users', user.uid);
        const snapshot = await getDoc(userRef);
        if (!snapshot.exists()) {
            await setDoc(userRef, {
                username: username || 'Người chơi mới',
                email: user.email || '',
                createdAt: new Date().toISOString(),
                lastOnline: new Date().toISOString()
            });
        } else {
            await setDoc(userRef, {
                lastOnline: new Date().toISOString(),
                email: user.email || snapshot.data().email || ''
            }, { merge: true });
        }
    } catch (error) {
        console.error("Lỗi khi lưu DB:", error);
    }
}

// ================= XỬ LÝ ĐĂNG KÍ =================
// Hỗ trợ phím Enter cho form Đăng kí
[registerUsername, registerIdentifier, registerPassword, registerConfirmPassword].forEach(input => {
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') btnSubmitRegister.click();
    });
});

btnSubmitRegister.addEventListener('click', async () => {
    const username = registerUsername.value.trim();
    const identifier = registerIdentifier.value.trim();
    const password = registerPassword.value;
    const confirmPassword = registerConfirmPassword.value;

    if (!username || !identifier || !password) {
        return showAlert("LỖI ĐĂNG KÍ TÀI KHOẢN", "Vui lòng nhập đầy đủ thông tin!", [{text: "ĐÓNG"}]);
    }
    if (!usernameRegex.test(username)) {
        return showAlert("LỖI ĐĂNG KÍ TÀI KHOẢN", "Tên người dùng không được chứa kí tự đặc biệt!", [{text: "ĐÓNG"}]);
    }
    if (password !== confirmPassword) {
        return showAlert("LỖI ĐĂNG KÍ TÀI KHOẢN", "Mật khẩu xác nhận không khớp!", [{text: "ĐÓNG"}]);
    }
    if (!passwordRegex.test(password)) {
        return showAlert("LỖI ĐĂNG KÍ TÀI KHOẢN", "Mật khẩu tối thiểu 6 kí tự", [{text: "ĐÓNG"}]);
    }

    try {
        const emailToRegister = identifier;
        
        const userCredential = await createUserWithEmailAndPassword(auth, emailToRegister, password);
        const user = userCredential.user;
        
        // Hiện popup xác thực email
        showAlert(
            "THÔNG BÁO", 
            "Chúng tôi sẽ gửi URL xác thực tài khoản tới email của bạn", 
                [
                    {
                        text: "HỦY",
                        type: "cancel",
                        onClick: async () => {
                            try {
                                await deleteUser(user); // Xóa tận gốc nếu hủy
                            } catch(e) { console.error(e); }
                        }
                    },
                    {
                        text: "GỬI",
                        type: "neutral",
                        onClick: async () => {
                            try {
                                await sendEmailVerification(user);
                                await saveUserToDB(user, username, false);
                                await signOut(auth);
                                showAlert("THÀNH CÔNG", "Email xác thực đã được gửi! Vui lòng kiểm tra hộp thư của bạn.", [
                                    {
                                        text: "ĐÓNG",
                                        onClick: () => {
                                            document.getElementById('registerModal').classList.add('hidden');
                                            document.getElementById('loginModal').classList.remove('hidden');
                                        }
                                    }
                                ]);
                            } catch(e) {
                                console.error(e);
                                showAlert("LỖI", "Lỗi gửi email xác thực.", [{text: "ĐÓNG"}]);
                            }
                        }
                    }
                ]
            );
        
    } catch (error) {
        console.error(error);
        if (error.code === 'auth/email-already-in-use') {
            showAlert("LỖI ĐĂNG KÍ TÀI KHOẢN", "Tài khoản Email này đã tồn tại!", [{text: "ĐÓNG"}]);
        } else if (error.code === 'auth/invalid-email') {
            showAlert("LỖI ĐĂNG KÍ TÀI KHOẢN", "Định dạng Email không hợp lệ!", [{text: "ĐÓNG"}]);
        } else {
            showAlert("LỖI ĐĂNG KÍ TÀI KHOẢN", "Lỗi: " + error.message, [{text: "ĐÓNG"}]);
        }
    }
});

// ================= XỬ LÝ ĐĂNG NHẬP =================
// Hỗ trợ phím Enter cho form Đăng nhập
[loginIdentifier, loginPassword].forEach(input => {
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') btnSubmitLogin.click();
    });
});

btnSubmitLogin.addEventListener('click', async () => {
    const identifier = loginIdentifier.value.trim();
    const password = loginPassword.value;

    if (!identifier || !password) {
        return showAlert("LỖI ĐĂNG NHẬP", "Vui lòng nhập đầy đủ thông tin!", [{text: "ĐÓNG"}]);
    }

    try {
        const emailToLogin = identifier;
        
        const userCredential = await signInWithEmailAndPassword(auth, emailToLogin, password);
        const user = userCredential.user;

        // Chặn nếu chưa xác thực Email
        if (!user.emailVerified) {
            await signOut(auth);
            return showAlert("LỖI ĐĂNG NHẬP", "Tài khoản chưa được xác thực. Vui lòng kiểm tra hộp thư và click vào link xác thực!", [{text: "ĐÓNG"}]);
        }
        
        await saveUserToDB(user, user.displayName || '');
        window.location.href = "home.html";
        
    } catch (error) {
        console.error(error);
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            showAlert("LỖI ĐĂNG NHẬP", "Tài khoản không tồn tại hoặc sai mật khẩu", [{text: "ĐÓNG"}]);
        } else {
            showAlert("LỖI ĐĂNG NHẬP", "Lỗi: " + error.message, [{text: "ĐÓNG"}]);
        }
    }
});

// ================= ĐĂNG NHẬP BẰNG GOOGLE =================
async function handleGoogleLogin() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        await saveUserToDB(user, user.displayName, true);
        window.location.href = "home.html";
    } catch (error) {
        console.error(error);
        showAlert("LỖI ĐĂNG NHẬP", "Đăng nhập Google thất bại!", [{text: "ĐÓNG"}]);
    }
}

btnGoogleLogin.addEventListener('click', handleGoogleLogin);
btnGoogleRegister.addEventListener('click', handleGoogleLogin);

// ================= KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP & TỰ ĐỘNG CHUYỂN TỚI SẢNH (HOME) =================
let currentUser = null;
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        const isGoogle = user.providerData && user.providerData.some(p => p.providerId === 'google.com');
        // Nếu đã đăng nhập trước đó và hợp lệ (Google hoặc Email đã xác thực) -> Tự động chuyển thẳng vào Sảnh
        if (isGoogle || user.emailVerified) {
            console.log('[Auth] Phát hiện phiên đăng nhập hợp lệ từ trước, tự động chuyển vào Sảnh:', user.displayName || user.email || user.uid);
            window.location.replace("home.html");
        }
    }
});

const btnHeroQuatLuon = document.getElementById('btnHeroQuatLuon');
if (btnHeroQuatLuon) {
    btnHeroQuatLuon.addEventListener('click', () => {
        if (currentUser && (currentUser.emailVerified || (currentUser.providerData && currentUser.providerData.some(p => p.providerId === 'google.com')))) {
            window.location.href = "home.html";
        } else {
            document.getElementById('loginModal').classList.remove('hidden');
        }
    });
}

